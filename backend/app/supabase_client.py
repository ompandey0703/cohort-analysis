from dotenv import load_dotenv
load_dotenv()
import zipfile
import os
from supabase import create_client, Client
import datetime
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Supabase Storage
SUPABASE_URL = os.getenv("SUPABASE_URL")
BUCKET_NAME = "results"
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_zip_with_csvs_and_heatmap(csv_file_paths, heatmap_file_path, zip_output_path):
    logger.info(f"Creating zip file at {zip_output_path} with CSVs: {csv_file_paths} and heatmap: {heatmap_file_path}")
    with zipfile.ZipFile(zip_output_path, 'w') as zipf:
        for csv_path in csv_file_paths:
            arcname = os.path.basename(csv_path)
            zipf.write(csv_path, arcname)
            logger.debug(f"Added {csv_path} as {arcname} to zip.")
        if heatmap_file_path:
            arcname = os.path.basename(heatmap_file_path)
            zipf.write(heatmap_file_path, arcname)
            logger.debug(f"Added heatmap {heatmap_file_path} as {arcname} to zip.")
    logger.info("Zip file created successfully.")

def upload_zip_and_get_url(local_zip_path: str, supabase_path: str) -> str:
    logger.info(f"Uploading zip file {local_zip_path} to Supabase at {supabase_path}")
    with open(local_zip_path, "rb") as f:
        supabase.storage.from_(BUCKET_NAME).upload(supabase_path, f, {"content-type": "application/zip"})
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(supabase_path)
    logger.info(f"Zip file uploaded. Public URL: {public_url}")
    return public_url

def zip_and_upload_to_supabase(csv_file_paths, heatmap_file_path, zip_output_path, supabase_path):
    logger.info("Starting zip and upload process to Supabase.")
    create_zip_with_csvs_and_heatmap(csv_file_paths, heatmap_file_path, zip_output_path)
    url = upload_zip_and_get_url(zip_output_path, supabase_path)
    logger.info(f"Zip and upload process completed. URL: {url}")
    return url

# --- Supabase Postgres job status logic ---

# Use your Supabase database URL here (replace with your actual credentials)
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL", "postgresql://postgres:1234@localhost:5432/cohort_analysis")

Base = declarative_base()

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    job_id = Column(String, primary_key=True)
    status = Column(String)
    download_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

engine = create_engine(SUPABASE_DB_URL, pool_size=1, max_overflow=0)
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

def save_job(job_id, status, download_url=None):
    logger.info(f"Saving job {job_id} with status '{status}' and download_url '{download_url}'")
    db = SessionLocal()
    job = AnalysisJob(job_id=job_id, status=status, download_url=download_url)
    db.merge(job)
    db.commit()
    db.close()
    logger.debug(f"Job {job_id} saved/updated in database.")

def update_job(job_id, status, download_url=None):
    logger.info(f"Updating job {job_id} to status '{status}' and download_url '{download_url}'")
    db = SessionLocal()
    job = db.query(AnalysisJob).filter_by(job_id=job_id).first()
    if job:
        job.status = status
        job.download_url = download_url
        db.commit()
        logger.debug(f"Job {job_id} updated in database.")
    else:
        logger.warning(f"Job {job_id} not found for update.")
    db.close()

def get_job(job_id):
    logger.info(f"Fetching job {job_id} from database.")
    db = SessionLocal()
    job = db.query(AnalysisJob).filter_by(job_id=job_id).first()
    db.close()
    if job:
        logger.debug(f"Job {job_id} found: status={job.status}, download_url={job.download_url}")
    else:
        logger.warning(f"Job {job_id} not found in database.")
    return job