#!/usr/bin/env python3
"""
Standalone MCP Server for Retell AI
Runs independently on a separate port
"""
import os
import asyncio
import logging
from MCPserver import create_mcp_server
from main import get_user_tasks_logic, mark_task_complete_logic, update_task_status_logic

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    """Run MCP server independently"""
    # Create MCP server
    mcp_server = create_mcp_server(
        get_user_tasks_logic=get_user_tasks_logic,
        mark_task_complete_logic=mark_task_complete_logic,
        update_task_status_logic=update_task_status_logic,
    )
    
    # Get port from environment or default to 8081
    port = int(os.getenv("MCP_PORT", "8081"))
    
    logger.info(f"Starting MCP server on port {port}")
    
    # Run MCP server using streamable HTTP transport
    await mcp_server.run_streamable_http_async()

if __name__ == "__main__":
    asyncio.run(main())
