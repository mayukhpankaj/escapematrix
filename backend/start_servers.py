#!/usr/bin/env python3
"""
Startup script to run both FastAPI and MCP servers
"""
import os
import asyncio
import logging
import uvicorn
from main import app
from mcp_server import main as mcp_main

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_servers():
    """Run both FastAPI and MCP servers"""
    # Get ports from environment
    fastapi_port = int(os.getenv("PORT", "8080"))
    mcp_port = int(os.getenv("MCP_PORT", "8081"))
    
    logger.info(f"Starting FastAPI server on port {fastapi_port}")
    logger.info(f"Starting MCP server on port {mcp_port}")
    
    # Create server configs
    fastapi_config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=fastapi_port,
        log_level="info"
    )
    
    # Start both servers
    fastapi_server = uvicorn.Server(fastapi_config)
    
    # Run FastAPI server and MCP server concurrently
    tasks = [
        fastapi_server.serve(),
        mcp_main()
    ]
    
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(run_servers())
