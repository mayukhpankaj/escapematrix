"""
Escape Matrix - FastAPI Backend
Handles all API endpoints for task management with Clerk authentication
"""
import os
from typing import List, Optional, Literal
from datetime import datetime, date
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
import jwt
from dotenv import load_dotenv
import google.generativeai as genai
import json
import httpx
import asyncio
import logging
import hmac
import hashlib
import base64

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Escape Matrix API",
    description="Habit tracking app backend with Clerk authentication",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Clerk configuration
CLERK_PEM_PUBLIC_KEY = os.getenv("CLERK_PEM_PUBLIC_KEY", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

# DodoPayments configuration
WEBHOOK_SECRET = os.getenv("DODO_WEBHOOK_SECRET")
PRODUCT_ID = os.getenv("DODO_PRODUCT_ID", "pdt_0NVKFpzt1jbHkCXW0gbfKs")

# Environment-based webhook configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"

def get_webhook_url(request: Request = None) -> str:
    """Dynamically generate webhook URL based on deployment"""
    if IS_PRODUCTION and request:
        # Use the request host to construct webhook URL
        scheme = "https" if request.url.scheme == "https" else "http"
        host = request.headers.get("host", "localhost:8000")
        return f"{scheme}://{host}/webhooks/dodo"
    elif IS_PRODUCTION:
        # Fallback to environment variable or default
        return os.getenv("DODO_WEBHOOK_URL", "https://yourdomain.com/webhooks/dodo")
    else:
        # Development mode
        return os.getenv("DODO_WEBHOOK_URL", "http://localhost:8000/webhooks/dodo")

if IS_PRODUCTION:
    WEBHOOK_URL = os.getenv("DODO_WEBHOOK_URL", "https://yourdomain.com/webhooks/dodo")
    logger.info(f"🚀 Production mode - Webhook URL: {WEBHOOK_URL}")
else:
    WEBHOOK_URL = os.getenv("DODO_WEBHOOK_URL", "http://localhost:8000/webhooks/dodo")
    logger.info(f"🧪 Development mode - Webhook URL: {WEBHOOK_URL}")

# Gemini configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in environment variables")

# Configure Google Generative AI
genai.configure(api_key=GEMINI_API_KEY)


# Pydantic Models
class TaskCreate(BaseModel):
    """Model for creating a new task"""
    task_name: str = Field(..., min_length=1, max_length=200)
    task_description: Optional[str] = None
    task_type: str = Field(..., pattern="^(LONG_TERM|SHORT_TERM)$")
    priority: str = Field(
        default="NOTURGENT-NOTIMPORTANT",
        pattern="^(URGENT-IMPORTANT|URGENT-NOTIMPORTANT|NOTURGENT-IMPORTANT|NOTURGENT-NOTIMPORTANT)$"
    )
    status: str = Field(
        default="TO-DO",
        pattern="^(TO-DO|IN-PROGRESS|COMPLETED)$"
    )
    repetition_days: Optional[List[str]] = None
    repetition_time: Optional[str] = None
    parent_task_id: Optional[str] = None  # For linking short-term to long-term
    markdown_content: Optional[str] = None


class TaskUpdate(BaseModel):
    """Model for updating a task"""
    task_name: Optional[str] = None
    task_description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    repetition_days: Optional[List[str]] = None
    repetition_time: Optional[str] = None
    markdown_content: Optional[str] = None


class TaskResponse(BaseModel):
    """Model for task response"""
    id: str
    user_id: str
    task_name: str
    task_description: Optional[str]
    task_type: str
    status: str
    priority: str
    repetition_days: Optional[List[str]] = None
    repetition_time: Optional[str] = None
    parent_task_id: Optional[str] = None
    progress: Optional[int] = None  # For long-term tasks
    markdown_content: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    repetition_days: Optional[List[str]]
    repetition_time: Optional[str]
    created_at: str
    updated_at: str


# Authentication Middleware
async def verify_clerk_token(authorization: str = Header(None)) -> str:
    """
    Verify Clerk JWT token and extract user_id
    
    Args:
        authorization: Bearer token from request header
    
    Returns:
        user_id: Clerk user ID
    
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "")
        
        # For development, we'll decode without verification
        # In production, you should verify with Clerk's public key
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user_id")
        
        return user_id
    
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token format")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")


def verify_signature(payload: bytes, msg_id: str, timestamp: str, signature_header: str) -> bool:
    """Verify DodoPayments webhook signature"""
    if not WEBHOOK_SECRET:
        logger.error("WEBHOOK_SECRET is not set")
        return False

    secret = WEBHOOK_SECRET
    if secret.startswith("whsec_"):
        secret = secret[len("whsec_"):]

    try:
        signing_key = base64.b64decode(secret)
    except Exception:
        signing_key = WEBHOOK_SECRET.encode()

    signed_payload = f"{msg_id}.{timestamp}.".encode() + payload
    expected_b64 = base64.b64encode(
        hmac.new(signing_key, signed_payload, hashlib.sha256).digest()
    ).decode()

    candidates: list[str] = []
    for part in (signature_header or "").split():
        if part.startswith("v1,"):
            candidates.append(part[3:])
        elif part.startswith("sha256="):
            candidates.append(part[7:])
        else:
            candidates.append(part)

    logger.info("Webhook signature verification:")
    logger.info(f"  Received: {signature_header}")
    logger.info(f"  Expected: {expected_b64}")
    logger.info(f"  Match: {any(hmac.compare_digest(expected_b64, c) for c in candidates)}")

    return any(hmac.compare_digest(expected_b64, c) for c in candidates)


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Escape Matrix API is running",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Create a new task for the authenticated user
    
    Args:
        task: Task data
        user_id: Authenticated user ID from Clerk
    
    Returns:
        Created task data
    """
    try:
        # Determine which table to insert into based on task_type
        if task.task_type == "LONG_TERM":
            # Prepare long-term task data
            task_data = {
                "user_id": user_id,
                "task_name": task.task_name,
                "task_description": task.task_description,
                "status": task.status,
                "priority": task.priority,
                "markdown_content": task.markdown_content,
                "progress": 0
            }
            
            # Insert into long_term_tasks table
            response = supabase.table("long_term_tasks").insert(task_data).execute()
            
            if response.data:
                result = response.data[0]
                result["task_type"] = "LONG_TERM"
                return result
            else:
                raise HTTPException(status_code=500, detail="Failed to create long-term task")
        
        else:  # SHORT_TERM
            # Prepare short-term task data
            task_data = {
                "user_id": user_id,
                "task_name": task.task_name,
                "task_description": task.task_description,
                "status": task.status,
                "priority": task.priority,
                "repetition_days": task.repetition_days,
                "repetition_time": task.repetition_time,
                "parent_task_id": task.parent_task_id,
                "markdown_content": task.markdown_content,
            }
            
            # Insert into short_term_tasks table
            response = supabase.table("short_term_tasks").insert(task_data).execute()
            
            if response.data:
                result = response.data[0]
                result["task_type"] = "SHORT_TERM"
                return result
            else:
                raise HTTPException(status_code=500, detail="Failed to create short-term task")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")


@app.get("/api/tasks")
async def get_tasks(
    user_id: str = Depends(verify_clerk_token)
):
    """
    Get all tasks for the authenticated user, grouped by status
    
    Args:
        user_id: Authenticated user ID from Clerk
    
    Returns:
        Tasks grouped by status: {'TO-DO': [], 'IN-PROGRESS': [], 'COMPLETED': []}
    """
    try:
        # Fetch short-term tasks (for dashboard - these are the daily tasks)
        # Order by display_order for proper positioning
        short_term_response = supabase.table("short_term_tasks").select("*").eq("user_id", user_id).order("display_order").order("created_at", desc=True).execute()
        
        short_term_tasks = short_term_response.data if short_term_response.data else []
        
        # Add task_type field to each task
        for task in short_term_tasks:
            task["task_type"] = "SHORT_TERM"
        
        # Group by status
        grouped_tasks = {
            'TO-DO': [],
            'IN-PROGRESS': [],
            'COMPLETED': []
        }
        
        for task in short_term_tasks:
            status = task.get('status', 'TO-DO')
            if status in grouped_tasks:
                grouped_tasks[status].append(task)
        
        return grouped_tasks
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tasks: {str(e)}")
        
        tasks = response.data if response.data else []
        
        # Group tasks by status
        grouped_tasks = {
            "TO-DO": [],
            "IN-PROGRESS": [],
            "COMPLETED": []
        }
        
        for task in tasks:
            status = task.get("status", "TO-DO")
            if status in grouped_tasks:
                grouped_tasks[status].append(task)
        
        return grouped_tasks
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tasks: {str(e)}")


@app.get("/api/tasks/long-term")
async def get_long_term_tasks(
    user_id: str = Depends(verify_clerk_token)
):
    """
    Get all long-term tasks for the authenticated user with their children
    
    Args:
        user_id: Authenticated user ID from Clerk
    
    Returns:
        List of long-term tasks with progress and children count
    """
    try:
        # Fetch long-term tasks
        response = supabase.table("long_term_tasks").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
        long_term_tasks = response.data if response.data else []
        
        # Add task_type and fetch children count for each task
        for task in long_term_tasks:
            task["task_type"] = "LONG_TERM"
            
            # Get children count
            children_response = supabase.table("short_term_tasks").select("id", count="exact").eq("parent_task_id", task["id"]).execute()
            task["children_count"] = children_response.count if children_response.count else 0
        
        return long_term_tasks
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching long-term tasks: {str(e)}")


@app.put("/api/tasks/{task_id}")
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Update a task (works for both long-term and short-term tasks)
    
    Args:
        task_id: Task UUID
        task_update: Fields to update
        user_id: Authenticated user ID
    
    Returns:
        Updated task data
    """
    try:
        # Try to find task in short_term_tasks first
        existing_task = supabase.table("short_term_tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if existing_task.data:
            # It's a short-term task
            update_data = {k: v for k, v in task_update.dict().items() if v is not None}
            
            if not update_data:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            response = supabase.table("short_term_tasks").update(update_data).eq("id", task_id).execute()
            
            if response.data:
                result = response.data[0]
                result["task_type"] = "SHORT_TERM"
                return result
            else:
                raise HTTPException(status_code=500, detail="Failed to update task")
        
        # Try long_term_tasks
        existing_task = supabase.table("long_term_tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if existing_task.data:
            # It's a long-term task
            update_data = {k: v for k, v in task_update.dict().items() if v is not None}
            
            if not update_data:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            response = supabase.table("long_term_tasks").update(update_data).eq("id", task_id).execute()
            
            if response.data:
                result = response.data[0]
                result["task_type"] = "LONG_TERM"
                return result
            else:
                raise HTTPException(status_code=500, detail="Failed to update task")
        
        # Task not found in either table
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")


@app.patch("/api/tasks/{task_id}")
async def patch_task_status(
    task_id: str,
    status_update: dict,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Patch task status (for drag and drop - works for both task types)
    
    Args:
        task_id: Task UUID
        status_update: Dictionary with 'status' field
        user_id: Authenticated user ID
    
    Returns:
        Updated task data
    """
    try:
        new_status = status_update.get("status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Status field is required")
        
        # Try to find task in short_term_tasks first
        existing_task = supabase.table("short_term_tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if existing_task.data:
            # It's a short-term task
            response = supabase.table("short_term_tasks").update({"status": new_status}).eq("id", task_id).execute()
            
            if response.data:
                result = response.data[0]
                result["task_type"] = "SHORT_TERM"
                return result
            else:
                raise HTTPException(status_code=500, detail="Failed to update task")
        
        # Try long_term_tasks
        existing_task = supabase.table("long_term_tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if existing_task.data:
            # It's a long-term task
            response = supabase.table("long_term_tasks").update({"status": new_status}).eq("id", task_id).execute()
            
            if response.data:
                result = response.data[0]
                result["task_type"] = "LONG_TERM"
                return result
            else:
                raise HTTPException(status_code=500, detail="Failed to update task")
        
        # Task not found in either table
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")


@app.post("/api/tasks/reorder")
async def reorder_tasks(
    reorder_data: dict,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Reorder tasks within a column
    
    Args:
        reorder_data: {
            "task_id": "uuid",
            "new_status": "TO-DO",
            "new_order": 2,
            "task_type": "SHORT_TERM"
        }
        user_id: Authenticated user ID
    
    Returns:
        Success message
    """
    try:
        task_id = reorder_data.get("task_id")
        new_status = reorder_data.get("new_status")
        new_order = reorder_data.get("new_order")
        task_type = reorder_data.get("task_type", "SHORT_TERM")
        
        if not task_id or not new_status or new_order is None:
            raise HTTPException(status_code=400, detail="task_id, new_status, and new_order are required")
        
        table_name = "short_term_tasks" if task_type == "SHORT_TERM" else "long_term_tasks"
        
        # Get all tasks in the target column
        tasks_response = supabase.table(table_name).select("id, display_order, status").eq("user_id", user_id).eq("status", new_status).order("display_order").execute()
        
        tasks = tasks_response.data if tasks_response.data else []
        
        # Find the dragged task
        dragged_task = next((t for t in tasks if t["id"] == task_id), None)
        old_order = dragged_task["display_order"] if dragged_task else None
        
        # Remove dragged task from list
        tasks = [t for t in tasks if t["id"] != task_id]
        
        # Insert at new position
        tasks.insert(new_order, {"id": task_id, "display_order": new_order, "status": new_status})
        
        # Update display_order for all affected tasks
        for idx, task in enumerate(tasks):
            supabase.table(table_name).update({"display_order": idx, "status": new_status}).eq("id", task["id"]).execute()
        
        return {"message": "Tasks reordered successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reordering tasks: {str(e)}")
        
        if not existing_task.data:
            raise HTTPException(status_code=404, detail="Task not found or unauthorized")
        
        # Get new status
        new_status = status_update.get("status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Status field is required")
        
        # Update task status
        response = supabase.table("tasks").update({"status": new_status}).eq("id", task_id).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to update task")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")

@app.delete("/api/tasks/{task_id}")
async def delete_task(
    task_id: str,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Delete a task (works for both long-term and short-term tasks)
    
    Args:
        task_id: Task UUID
        user_id: Authenticated user ID
    
    Returns:
        Success message
    """
    try:
        # Try to find and delete from short_term_tasks first
        existing_task = supabase.table("short_term_tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if existing_task.data:
            supabase.table("short_term_tasks").delete().eq("id", task_id).execute()
            return {"message": "Short-term task deleted successfully", "task_id": task_id}
        
        # Try long_term_tasks (this will also delete all children due to CASCADE)
        existing_task = supabase.table("long_term_tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if existing_task.data:
            supabase.table("long_term_tasks").delete().eq("id", task_id).execute()
            return {"message": "Long-term task deleted successfully (including all children)", "task_id": task_id}
        
        # Task not found in either table
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")


@app.post("/api/processquery")
async def process_query(
    query_data: dict,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Process AI query from user using Gemini API with conversation history
    Includes timeout handling and robust error management
    
    Args:
        query_data: Dictionary containing 'messages' array
        user_id: Authenticated user ID
    
    Returns:
        AI response with type, message, and optional tasks
    """
    try:
        # Accept either 'query' (old format) or 'messages' (new format)
        messages = query_data.get("messages", [])
        query = query_data.get("query", "")
        
        # Convert old format to new format for backward compatibility
        if query and not messages:
            messages = [{"role": "user", "content": query}]
        
        if not messages:
            raise HTTPException(status_code=400, detail="Messages array is required")
        
        logger.info(f"Processing query for user {user_id} with {len(messages)} messages")
        
        # Define the system instruction for the AI agent
        system_instruction = """YOU ARE A TASK MANAGER AGENT FOR A TODO APP.

RESPOND ONLY IN VALID JSON.
DO NOT OUTPUT MARKDOWN OR TEXT.

Your job:
1. Help the user plan ONE long-term goal
2. Help the user plan 2–3 short-term sub-goals
3. When the user confirms they are ready, create tasks

Message types:
- MESSAGE: normal conversation
- PLAN: planning suggestions and clarification
- CREATETASKS: return finalized task objects

Rules:
- LONG_TERM task: empty repetition_days array [], empty repetition_time ""
- SHORT_TERM tasks: must have repetition_days array (e.g., ["Monday", "Wednesday"]) and repetition_time (e.g., "06:00")
- Always return an array of tasks only when type=CREATETASKS
- Always include exactly 1 LONG_TERM and 2–3 SHORT_TERM tasks
- Status always starts as TO-DO
- Think carefully before creating tasks

Required JSON format:
{
  "type": "MESSAGE" or "PLAN" or "CREATETASKS",
  "message": "your message here",
  "tasks": [array of task objects when type is CREATETASKS, empty array otherwise]
}

Each task object must have:
{
  "task_name": "string",
  "task_description": "string",
  "task_type": "LONG_TERM" or "SHORT_TERM",
  "status": "TO-DO",
  "priority": one of "URGENT-IMPORTANT", "URGENT-NOTIMPORTANT", "NOTURGENT-IMPORTANT", "NOTURGENT-NOTIMPORTANT",
  "repetition_days": [] for LONG_TERM, ["Monday", "Wednesday"] for SHORT_TERM,
  "repetition_time": "" for LONG_TERM, "06:00" for SHORT_TERM
}
"""
        
        # Create the model with JSON mode
        model = genai.GenerativeModel(
            model_name='gemini-2.0-flash-exp',
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.3,
                "max_output_tokens": 2048,
            },
            system_instruction=system_instruction
        )
        
        # Convert messages to Gemini format
        # Frontend sends: [{"role": "user", "content": "..."}, {"role": "ai", "content": "..."}]
        # Gemini expects: [{"role": "user", "parts": [{"text": "..."}]}, {"role": "model", "parts": [{"text": "..."}]}]
        gemini_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            # Map 'ai' role to 'model' for Gemini
            if role == "ai":
                role = "model"
            
            gemini_messages.append({
                "role": role,
                "parts": [{"text": content}]
            })
        
        # Start a chat session with history
        chat = model.start_chat(history=gemini_messages[:-1])  # All messages except the last one
        
        # Send the last message with timeout wrapper
        last_message = gemini_messages[-1]["parts"][0]["text"]
        
        # Wrap the synchronous Gemini call in an async timeout
        try:
            logger.info(f"Sending message to Gemini API (length: {len(last_message)} chars)")
            
            # Use asyncio to run the synchronous call with timeout (60 seconds)
            response = await asyncio.wait_for(
                asyncio.to_thread(chat.send_message, last_message),
                timeout=60.0
            )
            
            logger.info("Gemini API response received successfully")
            
        except asyncio.TimeoutError:
            logger.error(f"Gemini API timeout after 60 seconds for user {user_id}")
            raise HTTPException(
                status_code=504,
                detail="AI response took too long. Please try again with a shorter message or simpler request."
            )
        except Exception as gemini_error:
            logger.error(f"Gemini API error for user {user_id}: {str(gemini_error)}")
            raise HTTPException(
                status_code=503,
                detail=f"AI service temporarily unavailable: {str(gemini_error)}"
            )
        
        # Parse the JSON response
        try:
            ai_response = json.loads(response.text)
            logger.info(f"Successfully parsed AI response, type: {ai_response.get('type', 'UNKNOWN')}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {response.text[:200]}")
            raise HTTPException(
                status_code=500,
                detail=f"AI returned invalid response format. Please try again."
            )
        
        response_type = ai_response.get("type", "MESSAGE")
        
        # If type is CREATETASKS, automatically create tasks in database
        created_tasks = []
        if response_type == "CREATETASKS":
            tasks = ai_response.get("tasks", [])
            logger.info(f"Creating {len(tasks)} tasks for user {user_id}")
            
            for task in tasks:
                try:
                    # Prepare task data with user_id
                    task_data = {
                        "user_id": user_id,
                        "task_name": task.get("task_name", ""),
                        "task_description": task.get("task_description", ""),
                        "task_type": task.get("task_type", "SHORT_TERM"),
                        "status": task.get("status", "TO-DO"),
                        "priority": task.get("priority", "NOTURGENT-NOTIMPORTANT"),
                        "repetition_days": task.get("repetition_days", []),
                        "repetition_time": task.get("repetition_time", ""),
                    }
                    
                    # Insert into Supabase
                    task_response = supabase.table("tasks").insert(task_data).execute()
                    
                    if task_response.data:
                        created_tasks.append(task_response.data[0])
                        logger.info(f"Successfully created task: {task.get('task_name')}")
                
                except Exception as task_error:
                    # Log error but continue with other tasks
                    logger.error(f"Error creating task '{task.get('task_name')}': {str(task_error)}")
                    continue
        
        # Return the structured response
        return {
            "type": response_type,
            "message": ai_response.get("message", ""),
            "tasks": created_tasks if response_type == "CREATETASKS" else ai_response.get("tasks", []),
            "tasks_created": len(created_tasks) if response_type == "CREATETASKS" else 0
        }
    
    except HTTPException:
        raise
    except asyncio.TimeoutError:
        logger.error(f"Overall request timeout for user {user_id}")
        raise HTTPException(
            status_code=504,
            detail="Request timeout. Please try again."
        )
    except Exception as e:
        logger.error(f"Unexpected error processing query for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred. Please try again later."
        )


@app.post("/api/make-call")
async def make_call(
    request_data: dict,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Initiate a phone call via Retell AI with pending and in-progress tasks
    
    Args:
        request_data: Dictionary containing optional 'user_name' field
        user_id: Authenticated user ID
    
    Returns:
        Call initiation response
    """
    try:
        # Get user name from request body, fallback to user_id if not provided
        user_name = request_data.get("user_name", user_id)
        user_name = str(user_name)
        
        # Get all short-term tasks for the user (only these have daily repetition)
        tasks_response = supabase.table("short_term_tasks").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
        all_tasks = tasks_response.data if tasks_response.data else []
        
        # Filter for TO-DO and IN-PROGRESS tasks
        pending_tasks = [
            task for task in all_tasks 
            if task.get("status") in ["TO-DO", "IN-PROGRESS"]
        ]
        
        if not pending_tasks:
            raise HTTPException(status_code=400, detail="No pending or in-progress tasks found")
        
        # Format tasks into LLM-friendly text
        task_lines = []
        for task in pending_tasks:
            task_lines.append(
                f"- {task.get('task_name')} ({task.get('status')}): {task.get('task_description')}"
            )
        
        task_text = "\n".join(task_lines)
        task_text = str(task_text)
        
        # Retell AI configuration
        retell_api_key = "key_18067d4c14f5953706d59c185f90"
        retell_url = "https://api.retellai.com/v2/create-phone-call"
        
        # Prepare Retell AI request
        retell_payload = {
            "from_number": "+918071387392",
            "to_number": "+919024175580",
            "agent_id": "agent_7643fe36677ac912003811b209",
            "dynamic_variables": {
                "user_name": user_name,
                "task_list": task_text
            }
        }
        
        # Log the payload being sent to Retell AI
        print("=" * 80)
        print("RETELL AI CALL PAYLOAD:")
        print(json.dumps(retell_payload, indent=2))
        print("=" * 80)
        
        # Make the call to Retell AI
        async with httpx.AsyncClient() as client:
            retell_response = await client.post(
                retell_url,
                headers={
                    "Authorization": f"Bearer {retell_api_key}",
                    "Content-Type": "application/json"
                },
                json=retell_payload,
                timeout=30.0
            )
            
            if retell_response.status_code != 200 and retell_response.status_code != 201:
                error_detail = retell_response.text
                try:
                    error_json = retell_response.json()
                    if "error" in error_json:
                        error_detail = str(error_json["error"])
                except:
                    pass
                raise HTTPException(
                    status_code=retell_response.status_code,
                    detail=f"Retell AI Error: {error_detail}"
                )
            
            result = retell_response.json()
            
            return {
                "success": True,
                "message": "Call initiated successfully",
                "call_id": result.get("call_id"),
                "tasks_count": len(pending_tasks),
                "retell_response": result
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initiating call: {str(e)}")


# ============= DAILY HABITS ENDPOINTS =============

class HabitCreate(BaseModel):
    """Model for creating a new habit"""
    habit_name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = "#8b5cf6"


@app.get("/api/habits")
async def get_habits(user_id: str = Depends(verify_clerk_token)):
    """
    Get all habits for the authenticated user
    
    Args:
        user_id: Authenticated user ID
    
    Returns:
        List of habits with their completion status for current month
    """
    try:
        # Get all habits for the user
        habits_response = supabase.table("daily_habits").select("*").eq("user_id", user_id).order("display_order", desc=False).execute()
        
        habits = habits_response.data if habits_response.data else []
        
        return habits
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching habits: {str(e)}")


@app.post("/api/habits")
async def create_habit(
    habit_data: HabitCreate,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Create a new habit
    
    Args:
        habit_data: Habit information
        user_id: Authenticated user ID
    
    Returns:
        Created habit data
    """
    try:
        # Prepare habit data
        new_habit = {
            "user_id": user_id,
            "habit_name": habit_data.habit_name,
            "color": habit_data.color or "#8b5cf6"
        }
        
        # Insert into Supabase
        response = supabase.table("daily_habits").insert(new_habit).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create habit")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating habit: {str(e)}")


@app.delete("/api/habits/{habit_id}")
async def delete_habit(
    habit_id: str,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Delete a habit
    
    Args:
        habit_id: Habit UUID
        user_id: Authenticated user ID
    
    Returns:
        Success message
    """
    try:
        # Verify ownership and delete
        response = supabase.table("daily_habits").delete().eq("id", habit_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Habit not found or unauthorized")
        
        return {"success": True, "message": "Habit deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting habit: {str(e)}")


@app.get("/api/habits/completions/{year}/{month}")
async def get_habit_completions(
    year: int,
    month: int,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Get all habit completions for a specific month
    
    Args:
        year: Year (e.g., 2025)
        month: Month (1-12)
        user_id: Authenticated user ID
    
    Returns:
        List of habit completions with habit details
    """
    try:
        from datetime import date
        
        # Calculate first and last day of the month
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1)
        else:
            last_day = date(year, month + 1, 1)
        
        # Get all completions for the month
        completions_response = supabase.table("habit_completions").select("*").eq("user_id", user_id).gte("completion_date", first_day.isoformat()).lt("completion_date", last_day.isoformat()).execute()
        
        completions = completions_response.data if completions_response.data else []
        
        return completions
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching completions: {str(e)}")


@app.post("/api/habits/completions")
async def toggle_habit_completion(
    completion_data: dict,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Toggle a habit completion for a specific date
    
    Args:
        completion_data: {habit_id: str, date: str (YYYY-MM-DD)}
        user_id: Authenticated user ID
    
    Returns:
        Updated completion status
    """
    try:
        habit_id = completion_data.get("habit_id")
        completion_date = completion_data.get("date")
        
        if not habit_id or not completion_date:
            raise HTTPException(status_code=400, detail="habit_id and date are required")
        
        # Check if completion already exists
        existing = supabase.table("habit_completions").select("*").eq("habit_id", habit_id).eq("completion_date", completion_date).execute()
        
        if existing.data:
            # Delete the completion (toggle off)
            supabase.table("habit_completions").delete().eq("habit_id", habit_id).eq("completion_date", completion_date).execute()
            return {"completed": False, "habit_id": habit_id, "date": completion_date}
        else:
            # Create the completion (toggle on)
            new_completion = {
                "habit_id": habit_id,
                "user_id": user_id,
                "completion_date": completion_date
            }
            supabase.table("habit_completions").insert(new_completion).execute()
            return {"completed": True, "habit_id": habit_id, "date": completion_date}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error toggling completion: {str(e)}")


# ============= MONTHLY PROGRESS ENDPOINTS =============

class MonthlyProgressCreate(BaseModel):
    """Model for creating/updating monthly progress"""
    year: int
    month: int  # 1-12
    completed_tasks: int = 0
    max_streak_days: int = 0
    streak_score: float = 0.0
    raw_score: float = 0.0
    normalized_score: float = 0.0


class MonthlyProgressResponse(BaseModel):
    """Model for monthly progress response"""
    id: str
    user_id: str
    year: int
    month: int
    completed_tasks: int
    max_streak_days: int
    streak_score: float
    raw_score: float
    normalized_score: float
    updated_at: str


@app.get("/api/monthly-progress/{year}")
async def get_monthly_progress(
    year: int,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Get all monthly progress for a given year
    
    Args:
        year: Year (e.g., 2025)
        user_id: Authenticated user ID
    
    Returns:
        List of monthly progress for all 12 months
    """
    try:
        response = supabase.table("monthly_progress").select("*").eq("user_id", user_id).eq("year", year).order("month").execute()
        
        # If no data exists, return empty array for all months
        if not response.data:
            return []
        
        return response.data
    
    except Exception as e:
        logger.error(f"Error fetching monthly progress for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching monthly progress: {str(e)}")


@app.post("/api/monthly-progress")
async def upsert_monthly_progress(
    progress: MonthlyProgressCreate,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Create or update monthly progress for a specific month
    
    Args:
        progress: Monthly progress data
        user_id: Authenticated user ID
    
    Returns:
        Updated monthly progress record
    """
    try:
        # Check if record exists
        existing = supabase.table("monthly_progress").select("*").eq("user_id", user_id).eq("year", progress.year).eq("month", progress.month).execute()
        
        progress_data = {
            "user_id": user_id,
            "year": progress.year,
            "month": progress.month,
            "completed_tasks": progress.completed_tasks,
            "max_streak_days": progress.max_streak_days,
            "streak_score": progress.streak_score,
            "raw_score": progress.raw_score,
            "normalized_score": progress.normalized_score,
            "updated_at": datetime.now().isoformat()
        }
        
        if existing.data:
            # Update existing record
            response = supabase.table("monthly_progress").update(progress_data).eq("user_id", user_id).eq("year", progress.year).eq("month", progress.month).execute()
        else:
            # Create new record
            response = supabase.table("monthly_progress").insert(progress_data).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to save monthly progress")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving monthly progress for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving monthly progress: {str(e)}")


@app.post("/api/monthly-progress/recalculate/{year}")
async def recalculate_monthly_progress(
    year: int,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Recalculate and store monthly progress for an entire year
    This endpoint does all the heavy lifting to compute metrics
    
    Args:
        year: Year to recalculate (e.g., 2025)
        user_id: Authenticated user ID
    
    Returns:
        List of calculated monthly progress for all 12 months
    """
    try:
        from datetime import date as dt_date
        
        # Get all tasks for the year
        tasks_response = supabase.table("short_term_tasks").select("*").eq("user_id", user_id).execute()
        all_tasks = tasks_response.data if tasks_response.data else []
        
        # Get all habit completions for the year
        first_day = dt_date(year, 1, 1)
        last_day = dt_date(year + 1, 1, 1)
        completions_response = supabase.table("habit_completions").select("*").eq("user_id", user_id).gte("completion_date", first_day.isoformat()).lt("completion_date", last_day.isoformat()).execute()
        year_completions = completions_response.data if completions_response.data else []
        
        # Pre-process data by month
        completed_tasks_by_month = {}
        completions_by_month = {}
        
        for month in range(1, 13):
            completed_tasks_by_month[month] = 0
            completions_by_month[month] = []
        
        # Process tasks
        for task in all_tasks:
            if task.get('status') == 'COMPLETED':
                created_at = task.get('created_at')
                if created_at:
                    task_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    if task_date.year == year:
                        month = task_date.month
                        completed_tasks_by_month[month] += 1
        
        # Process habit completions
        for completion in year_completions:
            completion_date = completion.get('completion_date')
            if completion_date:
                comp_date = datetime.fromisoformat(completion_date).date()
                if comp_date.year == year:
                    month = comp_date.month
                    completions_by_month[month].append(completion)
        
        # Calculate metrics for each month
        alpha = 0.75
        max_expected = 200
        results = []
        
        for month in range(1, 13):
            completed_tasks = completed_tasks_by_month[month]
            month_completions = completions_by_month[month]
            
            # Calculate max streak for this month
            day_counts = {}
            for completion in month_completions:
                comp_date = completion.get('completion_date')
                if comp_date:
                    day_counts[comp_date] = day_counts.get(comp_date, 0) + 1
            
            max_streak = 0
            current_streak = 0
            days_in_month = (dt_date(year, month + 1, 1) - dt_date(year, month, 1)).days if month < 12 else 31
            
            for day in range(1, days_in_month + 1):
                date_str = f"{year}-{month:02d}-{day:02d}"
                if day_counts.get(date_str, 0) > 0:
                    current_streak += 1
                    max_streak = max(max_streak, current_streak)
                else:
                    current_streak = 0
            
            streak_score = alpha * max_streak
            raw_score = completed_tasks + streak_score
            normalized_score = min((raw_score / max_expected) * 100, 100)
            
            # Check if future month
            now = datetime.now()
            is_future = (year > now.year) or (year == now.year and month > now.month)
            
            if is_future:
                completed_tasks = 0
                max_streak = 0
                streak_score = 0.0
                raw_score = 0.0
                normalized_score = 0.0
            
            # Upsert to database
            progress_data = {
                "year": year,
                "month": month,
                "completed_tasks": completed_tasks,
                "max_streak_days": max_streak,
                "streak_score": streak_score,
                "raw_score": raw_score,
                "normalized_score": normalized_score
            }
            
            response = await upsert_monthly_progress(MonthlyProgressCreate(**progress_data), user_id)
            results.append(response)
        
        return results
    
    except Exception as e:
        logger.error(f"Error recalculating monthly progress for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error recalculating monthly progress: {str(e)}")


# ============= DEADLINES ENDPOINTS =============

class DeadlineCreate(BaseModel):
    """Model for creating a new deadline"""
    task_name: str = Field(..., min_length=1, max_length=200)
    task_description: Optional[str] = None
    deadline_time: str = Field(..., description="ISO format datetime string")
    priority: Optional[str] = "MEDIUM"
    markdown_content: Optional[str] = None


class DeadlineUpdate(BaseModel):
    """Model for updating a deadline"""
    task_name: Optional[str] = None
    task_description: Optional[str] = None
    deadline_time: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    markdown_content: Optional[str] = None


@app.get("/api/deadlines")
async def get_deadlines(user_id: str = Depends(verify_clerk_token)):
    """
    Get all deadlines for the authenticated user
    
    Args:
        user_id: Authenticated user ID
    
    Returns:
        List of deadlines sorted by deadline_time
    """
    try:
        # Get all deadlines for the user
        response = supabase.table("deadlines").select("*").eq("user_id", user_id).order("deadline_time", desc=False).execute()
        
        deadlines = response.data if response.data else []
        
        # Update overdue status
        from datetime import datetime, timezone
        current_time = datetime.now(timezone.utc)
        
        for deadline in deadlines:
            if deadline['status'] not in ['COMPLETED', 'OVERDUE']:
                deadline_time = datetime.fromisoformat(deadline['deadline_time'].replace('Z', '+00:00'))
                if deadline_time < current_time:
                    # Update status to OVERDUE
                    supabase.table("deadlines").update({"status": "OVERDUE"}).eq("id", deadline['id']).execute()
                    deadline['status'] = 'OVERDUE'
        
        return deadlines
    
    except Exception as e:
        logger.error(f"Error fetching deadlines for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching deadlines: {str(e)}")


@app.post("/api/deadlines")
async def create_deadline(
    deadline_data: DeadlineCreate,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Create a new deadline
    
    Args:
        deadline_data: Deadline information
        user_id: Authenticated user ID
    
    Returns:
        Created deadline data
    """
    try:
        from datetime import datetime, timezone
        
        # Prepare deadline data
        new_deadline = {
            "user_id": user_id,
            "task_name": deadline_data.task_name,
            "task_description": deadline_data.task_description,
            "start_time": datetime.now(timezone.utc).isoformat(),
            "deadline_time": deadline_data.deadline_time,
            "status": "PENDING",
            "priority": deadline_data.priority or "MEDIUM",
            "markdown_content": deadline_data.markdown_content
        }
        
        # Insert into Supabase
        response = supabase.table("deadlines").insert(new_deadline).execute()
        
        if response.data:
            logger.info(f"Created deadline for user {user_id}: {deadline_data.task_name}")
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create deadline")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating deadline for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating deadline: {str(e)}")


@app.patch("/api/deadlines/{deadline_id}")
async def update_deadline(
    deadline_id: str,
    deadline_data: DeadlineUpdate,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Update a deadline
    
    Args:
        deadline_id: Deadline UUID
        deadline_data: Updated deadline information
        user_id: Authenticated user ID
    
    Returns:
        Updated deadline data
    """
    try:
        from datetime import datetime, timezone
        
        # Prepare update data
        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if deadline_data.task_name:
            update_data["task_name"] = deadline_data.task_name
        if deadline_data.task_description is not None:
            update_data["task_description"] = deadline_data.task_description
        if deadline_data.deadline_time:
            update_data["deadline_time"] = deadline_data.deadline_time
        if deadline_data.status:
            update_data["status"] = deadline_data.status
        if deadline_data.priority:
            update_data["priority"] = deadline_data.priority
        if deadline_data.markdown_content is not None:
            update_data["markdown_content"] = deadline_data.markdown_content
        
        # Update in Supabase
        response = supabase.table("deadlines").update(update_data).eq("id", deadline_id).eq("user_id", user_id).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=404, detail="Deadline not found or unauthorized")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating deadline {deadline_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating deadline: {str(e)}")


@app.delete("/api/deadlines/{deadline_id}")
async def delete_deadline(
    deadline_id: str,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Delete a deadline
    
    Args:
        deadline_id: Deadline UUID
        user_id: Authenticated user ID
    
    Returns:
        Success message
    """
    try:
        # Verify ownership and delete
        response = supabase.table("deadlines").delete().eq("id", deadline_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Deadline not found or unauthorized")
        
        logger.info(f"Deleted deadline {deadline_id} for user {user_id}")
        return {"success": True, "message": "Deadline deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting deadline {deadline_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting deadline: {str(e)}")


# Store successful payment IDs (in production, use a database)
successful_payments = set()

@app.post("/webhooks/dodo")
async def dodo_webhook(request: Request):
    """Handle DodoPayments webhooks"""
    try:
        payload = await request.body()
        signature = request.headers.get("webhook-signature")
        webhook_id = request.headers.get("webhook-id")
        webhook_ts = request.headers.get("webhook-timestamp")
        
        logger.info(f"Webhook received:")
        logger.info(f"  Headers: {dict(request.headers)}")
        logger.info(f"  Signature header: {signature}")
        logger.info(f"  Payload length: {len(payload)}")

        # Re-enable signature verification
        if not signature or not webhook_id or not webhook_ts or not verify_signature(payload, webhook_id, webhook_ts, signature):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=400, detail="Invalid signature")

        event = json.loads(payload)
        logger.info(f"Received DodoPayments webhook: {event['type']}")

        if event["type"] == "payment.succeeded":
            payment = event["data"]
            
            # Extract user details from payment data
            user_id = payment["metadata"].get("userId")
            customer_email = payment["customer"].get("email")
            customer_name = payment["customer"].get("name")
            customer_phone = payment["customer"].get("phone_number")
            payment_id = payment.get("payment_id")
            payment_method = payment.get("payment_method")
            total_amount = payment.get("total_amount")
            currency = payment.get("currency")
            
            # Extract product details
            product_cart = payment.get("product_cart", [])
            product_id = product_cart[0].get("product_id") if product_cart else None

            # Store successful payment ID
            successful_payments.add(payment_id)
            logger.info(f"✅ Stored successful payment ID: {payment_id}")

            # Log all user and payment details
            logger.info(f"✅ Payment succeeded - User details:")
            logger.info(f"   User ID: {user_id}")
            logger.info(f"   Email: {customer_email}")
            logger.info(f"   Name: {customer_name}")
            logger.info(f"   Phone: {customer_phone}")
            logger.info(f"   Payment ID: {payment_id}")
            logger.info(f"   Payment Method: {payment_method}")
            logger.info(f"   Amount: {total_amount} {currency}")
            logger.info(f"   Product ID: {product_id}")

            if product_id == PRODUCT_ID:
                # 🔥 YOUR BUSINESS LOGIC HERE
                logger.info(f"✅ Grant 1-year access to user {user_id}")

                # Update user's pro status in database
                try:
                    logger.info(f"🔍 Attempting to update database for user_id: {user_id}")
                    logger.info(f"🔍 Supabase URL: {SUPABASE_URL}")
                    
                    # Check if user already exists in user_pro_status table
                    logger.info(f"🔍 Checking if user {user_id} exists in database...")
                    existing_user = supabase.table("user_pro_status").select("id").eq("user_id", user_id).execute()
                    logger.info(f"🔍 Existing user query result: {existing_user.data}")
                    
                    if existing_user.data:
                        # Update existing user
                        logger.info(f"🔍 Updating existing user {user_id}...")
                        update_result = supabase.table("user_pro_status").update({
                            "is_pro": True,
                            "payment_id": payment_id,
                            "user_name": customer_name,
                            "user_email": customer_email,
                            "updated_at": datetime.now().isoformat()
                        }).eq("user_id", user_id).execute()
                        logger.info(f"✅ Update result: {update_result.data}")
                        logger.info(f"✅ Updated existing user {user_id} to pro status")
                    else:
                        # Insert new user
                        logger.info(f"🔍 Inserting new user {user_id}...")
                        insert_data = {
                            "user_id": user_id,
                            "is_pro": True,
                            "payment_id": payment_id,
                            "user_name": customer_name,
                            "user_email": customer_email,
                            "created_at": datetime.now().isoformat(),
                            "updated_at": datetime.now().isoformat()
                        }
                        logger.info(f"🔍 Insert data: {insert_data}")
                        insert_result = supabase.table("user_pro_status").insert(insert_data).execute()
                        logger.info(f"✅ Insert result: {insert_result.data}")
                        logger.info(f"✅ Inserted new user {user_id} with pro status")
                    
                    logger.info(f"✅ User {user_id} upgraded to 1-year pro plan successfully")
                    
                except Exception as e:
                    logger.error(f"❌ Error updating user {user_id} pro status: {str(e)}")
                    logger.error(f"❌ Exception type: {type(e)}")
                    import traceback
                    logger.error(f"❌ Full traceback: {traceback.format_exc()}")
                    # Continue processing even if database update fails

        elif event["type"] == "payment.failed":
            payment = event["data"]
            
            # Extract user details from failed payment
            user_id = payment["metadata"].get("userId")
            customer_email = payment["customer"].get("email")
            customer_name = payment["customer"].get("name")
            payment_id = payment.get("payment_id")
            error_code = payment.get("error_code")
            error_message = payment.get("error_message")
            payment_method = payment.get("payment_method")
            total_amount = payment.get("total_amount")
            
            # Log failed payment details
            logger.warning(f"❌ Payment failed - User details:")
            logger.warning(f"   User ID: {user_id}")
            logger.warning(f"   Email: {customer_email}")
            logger.warning(f"   Name: {customer_name}")
            logger.warning(f"   Payment ID: {payment_id}")
            logger.warning(f"   Error Code: {error_code}")
            logger.warning(f"   Error Message: {error_message}")
            logger.warning(f"   Payment Method: {payment_method}")
            logger.warning(f"   Amount: {total_amount}")
            
            # Optionally handle failed payments (notify user, etc.)

        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing DodoPayments webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring"""
    return {"status": "healthy", "service": "Escape Matrix API"}


@app.get("/webhook-info")
async def get_webhook_info(request: Request):
    """Get current webhook URL for setup purposes"""
    webhook_url = get_webhook_url(request)
    return {
        "webhook_url": webhook_url,
        "environment": ENVIRONMENT,
        "is_production": IS_PRODUCTION,
        "instructions": "Use this URL in your DodoPayments webhook configuration"
    }


@app.get("/api/payment-status/{payment_id}")
async def check_payment_status(payment_id: str):
    """Check if payment was successful via webhook confirmation"""
    if payment_id in successful_payments:
        return {"status": "succeeded", "confirmed_by": "webhook"}
    else:
        return {"status": "failed", "reason": "no_webhook_confirmation"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
