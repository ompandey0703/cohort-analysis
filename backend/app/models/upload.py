# backend/app/models/upload.py
from pydantic import BaseModel

class UploadResponse(BaseModel):
    filename: str
    message: str
