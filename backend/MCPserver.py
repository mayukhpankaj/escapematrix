# MCPserver.py
import os
import logging
from mcp import FastAPIMCP
from mcp.server.context import get_request_context
from mcp.types import TextContent

logger = logging.getLogger(__name__)

MCP_AUTH_TOKEN = os.getenv(
    "MCP_AUTH_TOKEN",
    "escm_mcp_token_2026_secure"
)


def verify_mcp_auth():
    """
    MCP-native authentication.
    Reads headers from MCP request context.
    """
    ctx = get_request_context()

    if not ctx or not ctx.request:
        raise Exception("Missing MCP request context")

    auth_header = ctx.request.headers.get("authorization")
    if not auth_header:
        raise Exception("Authorization header missing")

    token = auth_header.replace("Bearer ", "")
    if token != MCP_AUTH_TOKEN:
        raise Exception("Invalid MCP token")


def create_mcp_server(
    get_user_tasks_logic,
    mark_task_complete_logic,
    update_task_status_logic,
):
    """
    MCP adapter layer for Retell AI
    """
    mcp = FastAPIMCP(
        name="task-manager-mcp",
        version="1.0.0",
    )

    # --------------------------------------------------
    # Tool: Get User Tasks
    # --------------------------------------------------
    @mcp.tool(
        name="get_user_tasks",
        description="Get all pending tasks (TO-DO and IN-PROGRESS) for the user"
    )
    async def get_user_tasks(user_id: str):
        try:
            verify_mcp_auth()
            text = await get_user_tasks_logic(user_id)
            return [TextContent(text=text)]
        except Exception as e:
            logger.error(str(e))
            return [TextContent(text=f"Error: {str(e)}")]

    # --------------------------------------------------
    # Tool: Mark Task Complete
    # --------------------------------------------------
    @mcp.tool(
        name="mark_task_complete",
        description="Mark a task as COMPLETED. Task name can be partial match."
    )
    async def mark_task_complete(user_id: str, task_name: str):
        try:
            verify_mcp_auth()
            text = await mark_task_complete_logic(user_id, task_name)
            return [TextContent(text=text)]
        except Exception as e:
            logger.error(str(e))
            return [TextContent(text=f"Error: {str(e)}")]

    # --------------------------------------------------
    # Tool: Update Task Status
    # --------------------------------------------------
    @mcp.tool(
        name="update_task_status",
        description="Update a task's status to TO-DO, IN-PROGRESS, or COMPLETED"
    )
    async def update_task_status(
        user_id: str,
        task_name: str,
        new_status: str
    ):
        try:
            verify_mcp_auth()
            text = await update_task_status_logic(
                user_id, task_name, new_status
            )
            return [TextContent(text=text)]
        except Exception as e:
            logger.error(str(e))
            return [TextContent(text=f"Error: {str(e)}")]

    return mcp