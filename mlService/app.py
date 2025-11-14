# mlService/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils.scoring import score_event, compute_ocean
import uvicorn

app = FastAPI(title="UEBA ML Service")

class EventModel(BaseModel):
    ts: Optional[str]
    user: str
    type: Optional[str]
    action: Optional[str]
    device: Optional[str] = None
    recent_sequence: Optional[str] = None
    # allow extra fields
    class Config:
        extra = "allow"

@app.get("/health")
def health():
    return {"status":"ok"}

@app.post("/analyze")
def analyze(event: EventModel):
    evt = event.dict()
    try:
        result = score_event(evt)
        return result
    except Exception as e:
        # capture full traceback for easier debugging in development
        import traceback
        tb = traceback.format_exc()
        # log to console
        print("Exception in /analyze:\n", tb)
        # return stack trace in response detail (developer aid)
        raise HTTPException(status_code=500, detail=tb)

@app.get("/user_ocean/{user_id}")
def user_ocean(user_id: str):
    ocean = compute_ocean(user_id)
    if ocean is None:
        raise HTTPException(status_code=404, detail="user not found")
    return {"user_id": user_id, "ocean_vector": ocean}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
