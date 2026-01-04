# MCPserver.py
import os
import logging
from mcp.server.fastmcp import FastMCP

logger = logging.getLogger(__name__)

MCP_AUTH_TOKEN = os.getenv(
    "MCP_AUTH_TOKEN",
    "escm_mcp_token_2026_secure"
)


def create_mcp_server(
    get_user_tasks_logic,
    mark_task_complete_logic,
    update_task_status_logic,
):
    """
    MCP adapter layer for Retell AI
    """
    mcp = FastMCP(
        name="task-manager-mcp",
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
            text = await get_user_tasks_logic(user_id)
            return text
        except Exception as e:
            logger.error(str(e))
            return f"Error: {str(e)}"

    # --------------------------------------------------
    # Tool: Mark Task Complete
    # --------------------------------------------------
    @mcp.tool(
        name="mark_task_complete",
        description="Mark a task as COMPLETED. Task name can be partial match."
    )
    async def mark_task_complete(user_id: str, task_name: str):
        try:
            text = await mark_task_complete_logic(user_id, task_name)
            return text
        except Exception as e:
            logger.error(str(e))
            return f"Error: {str(e)}"

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
        new_status: str,
    ):
        try:
            text = await update_task_status_logic(
                user_id, task_name, new_status
            )
            return text
        except Exception as e:
            logger.error(str(e))
            return f"Error: {str(e)}"

    return mcp