import os
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException
from app.utils.logger import get_logger

# File upload and validation

logger = get_logger(__name__)

class FileHandler:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)
        logger.info(f"FileHandler initialized with upload directory: {self.upload_dir}")
    
    def validate_csv(self, file: UploadFile) -> None:
        """Validate that the file is a CSV"""
        if not file.filename or not file.filename.endswith(".csv"):
            logger.error("File validation failed: Only CSV files are allowed")
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    async def save_file(self, file: UploadFile) -> str:
        """Save uploaded file and return filename"""
        try:
            self.validate_csv(file)
        except HTTPException as e:
            logger.error(f"File validation failed: {e.detail}")
            raise

        file_path = self.upload_dir / file.filename
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"File saved successfully: {file.filename}")
            return file.filename
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {e}")
    
    def file_exists(self, filename: str) -> bool:
        """Check if file exists"""
        exists = (self.upload_dir / filename).exists()
        logger.info(f"Checked existence for file '{filename}': {exists}")
        return exists

# Global instance
file_handler = FileHandler()
