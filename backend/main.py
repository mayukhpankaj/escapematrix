"""
Escape Matrix - FastAPI Backend
Handles all API endpoints for task management with Clerk authentication
"""
import os
from typing import List, Optional, Literal
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
import jwt
from dotenv import load_dotenv
import google.generativeai as genai
import json
import httpx

load_dotenv()

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
        
        # Send the last message
        last_message = gemini_messages[-1]["parts"][0]["text"]
        response = chat.send_message(last_message)
        
        # Parse the JSON response
        ai_response = json.loads(response.text)
        
        response_type = ai_response.get("type", "MESSAGE")
        
        # If type is CREATETASKS, automatically create tasks in database
        created_tasks = []
        if response_type == "CREATETASKS":
            tasks = ai_response.get("tasks", [])
            
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
                
                except Exception as task_error:
                    # Log error but continue with other tasks
                    print(f"Error creating task: {str(task_error)}")
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
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
