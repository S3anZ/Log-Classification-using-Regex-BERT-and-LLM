import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Union, Dict, Any
from fastapi.staticfiles import StaticFiles

from processer_classifier import LogClassifierOrchestrator

app = FastAPI(
    title="Enterprise Log Diagnostics API",
    version="1.0.0",
    description="Hybrid Log Classification & Root Cause Diagnostics Engine API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = None

@app.on_event("startup")
async def startup_event():
    global orchestrator
    print("[API Startup] Initializing Log Classifier Orchestrator...")
    orchestrator = LogClassifierOrchestrator()
    print("[API Startup] Initialization Complete. Ready to accept requests.")

class SingleLogRequest(BaseModel):
    log_message: str = Field(..., description="The raw log message to classify")

class BatchLogRequest(BaseModel):
    log_messages: List[str] = Field(..., description="List of raw log messages to classify")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Log Intelligence Engine API is running"}

@app.post("/api/v1/classify")
def classify_single_log(request: SingleLogRequest):
    try:
        if not orchestrator:
            raise HTTPException(status_code=503, detail="Service is still initializing.")
        result = orchestrator.classify(request.log_message)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/classify/batch")
def classify_batch_logs(request: BatchLogRequest):
    try:
        if not orchestrator:
            raise HTTPException(status_code=503, detail="Service is still initializing.")
        results = orchestrator.classify(request.log_messages)
        return {"status": "success", "count": len(results), "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

frontend_dist = os.path.join(os.path.dirname(__file__), "dashboard", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    print(f"Warning: Frontend build directory not found at {frontend_dist}.")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting API Server on port {port}...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True, access_log=False)

