#!/usr/bin/env python3

import os
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "ok", "port": int(os.getenv("PORT", 8080))}

@app.get("/health")
async def health():
    return {"status": "healthy", "port": int(os.getenv("PORT", 8080))}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    print(f"Starting health check on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
