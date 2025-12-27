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
import httpx
import json

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

# Gemini configuration via Emergent Universal Key
EMERGENT_API_KEY = os.getenv("GEMINI_API_KEY")
if not EMERGENT_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in environment variables")

# Emergent API uses OpenAI-compatible endpoint format
EMERGENT_API_URL = "https://llmapi.emergent.sh/v1/chat/completions"
GEMINI_MODEL = "gemini-2.0-flash-exp"


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
    repetition_days: Optional[List[str]] = None  # ['MONDAY', 'WEDNESDAY', 'FRIDAY']
    repetition_time: Optional[str] = None  # '09:00 AM'


class TaskUpdate(BaseModel):
    """Model for updating a task"""
    task_name: Optional[str] = None
    task_description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    repetition_days: Optional[List[str]] = None
    repetition_time: Optional[str] = None


class TaskResponse(BaseModel):
    """Model for task response"""
    id: str
    user_id: str
    task_name: str
    task_description: Optional[str]
    task_type: str
    status: str
    priority: str
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
        # Prepare task data
        task_data = {
            "user_id": user_id,
            "task_name": task.task_name,
            "task_description": task.task_description,
            "task_type": task.task_type,
            "status": task.status,
            "priority": task.priority,
            "repetition_days": task.repetition_days,
            "repetition_time": task.repetition_time,
        }
        
        # Insert into Supabase
        response = supabase.table("tasks").insert(task_data).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create task")
    
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
        # Fetch all tasks for the user
        response = supabase.table("tasks").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
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
    Get all long-term tasks for the authenticated user
    
    Args:
        user_id: Authenticated user ID from Clerk
    
    Returns:
        List of long-term tasks
    """
    try:
        response = supabase.table("tasks").select("*").eq("user_id", user_id).eq("task_type", "LONG_TERM").order("created_at", desc=True).execute()
        
        return response.data if response.data else []
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching long-term tasks: {str(e)}")


@app.put("/api/tasks/{task_id}")
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Update a task
    
    Args:
        task_id: Task UUID
        task_update: Fields to update
        user_id: Authenticated user ID
    
    Returns:
        Updated task data
    """
    try:
        # Verify task belongs to user
        existing_task = supabase.table("tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if not existing_task.data:
            raise HTTPException(status_code=404, detail="Task not found or unauthorized")
        
        # Prepare update data (only include non-None fields)
        update_data = {k: v for k, v in task_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update task
        response = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
        
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
    Delete a task
    
    Args:
        task_id: Task UUID
        user_id: Authenticated user ID
    
    Returns:
        Success message
    """
    try:
        # Verify task belongs to user
        existing_task = supabase.table("tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if not existing_task.data:
            raise HTTPException(status_code=404, detail="Task not found or unauthorized")
        
        # Delete task
        supabase.table("tasks").delete().eq("id", task_id).execute()
        
        return {"message": "Task deleted successfully", "task_id": task_id}
    
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
    Process AI query from user using Gemini API via Emergent Universal Key
    
    Args:
        query_data: Dictionary containing 'query' field
        user_id: Authenticated user ID
    
    Returns:
        AI response with type, message, and optional tasks
    """
    try:
        query = query_data.get("query", "")
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
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
        
        # Call Emergent API
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {EMERGENT_API_KEY}"
        }
        
        payload = {
            "model": GEMINI_MODEL,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": query}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                EMERGENT_API_URL,
                headers=headers,
                json=payload,
                timeout=60.0
            )
            
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    if "error" in error_json:
                        error_detail = str(error_json["error"])
                except:
                    pass
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Gemini API Error: {error_detail}"
                )
            
            result = response.json()
            
            # Extract the content from the response
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                ai_response = json.loads(content)
                
                # Return the structured response
                return {
                    "type": ai_response.get("type", "MESSAGE"),
                    "message": ai_response.get("message", ""),
                    "tasks": ai_response.get("tasks", [])
                }
            else:
                raise HTTPException(status_code=500, detail="Invalid response from Gemini API")
    
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
