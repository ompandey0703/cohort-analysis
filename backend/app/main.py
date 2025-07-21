from fastapi import APIRouter, UploadFile, File, HTTPException, Query, FastAPI # type: ignore
import pandas as pd
import sqlalchemy # type: ignore
from app.utils.file_handler import file_handler
from app.utils.supabase_handler import save_tables_to_csvs, create_zip_with_csvs_and_heatmap
from app.supabase_client import upload_zip_and_get_url, save_job, update_job, get_job
import os
from app.models.upload import UploadResponse
import uuid
from fastapi.staticfiles import StaticFiles # type: ignore # type: ignore
# from app.routers import uploadRouter
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from pathlib import Path
from app.utils.logger import get_logger
from app.utils.safe_iso import safe_iso
from app.models.analyze import AnalysisRequest
from app.analysis import cohort_service
from app.llm_summary import get_llm_insights
from fastapi import BackgroundTasks

from typing import Optional
app = FastAPI()


# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity, adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger = get_logger(__name__)
# Create static directory if it doesn't exist
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
logger.info(f"Static directory ensured at: {static_dir.resolve()}")

# Mount static files for serving charts
app.mount("/static", StaticFiles(directory="static"), name="static")
logger.info("Static files mounted at /static")



@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    # Generate a random filename to avoid overwriting existing files
    ext = os.path.splitext(file.filename)[1]
    random_filename = f"{uuid.uuid4().hex}{ext}"
    file.filename = random_filename  # Set the new filename before saving

    logger.info(f"Uploading file: {file.filename}")
    filename = await file_handler.save_file(file)
    logger.info(f"File uploaded successfully: {filename}")
    
    return UploadResponse(
        filename=filename,
        message="File uploaded successfully"
    )
    

@app.get("/api/schema")
def get_schema(
    filename: Optional[str] = Query(None, description="CSV or SQL filename"),
    db_url: Optional[str] = Query(None, description="Database URL"),
    table: Optional[str] = Query(None, description="Table name (for DB/SQL)")
):
    tables = []
    columns = []

    # DB URL: fetch tables and columns
    if db_url:
        try:
            logger.info(f"Fetching schema from DB URL: {db_url}")
            engine = sqlalchemy.create_engine(db_url)
            with engine.connect() as conn:
                result = conn.execute(sqlalchemy.text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
                tables = [row[0] for row in result]
                if table:
                    df = pd.read_sql_query(f"SELECT * FROM {table} LIMIT 1", conn)
                    columns = list(df.columns)
        except Exception as e:
            logger.error(f"Error connecting to database: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to database: {str(e)}")
        return {"tables": tables, "columns": columns}

    # File: fetch tables and columns
    if filename:
        if not file_handler.file_exists(filename):
            logger.error(f"File not found: {filename}")
            raise HTTPException(status_code=404, detail="File not found")
        file_path = file_handler.upload_dir / filename
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".csv":
            try:
                logger.info(f"Reading CSV file for columns: {filename}")
                encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1', 'utf-8-sig']
                for encoding in encodings:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise HTTPException(status_code=400, detail="Unable to read CSV file. Please check the file encoding.")
                columns = list(df.columns)
            except Exception as e:
                logger.error(f"Error reading CSV: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error reading CSV: {str(e)}")
            return {"tables": [], "columns": columns}
        else:
            logger.error("Unsupported file type for schema extraction")
            raise HTTPException(status_code=400, detail="Unsupported file type")

    logger.error("Must provide either filename or db_url")
    raise HTTPException(status_code=400, detail="Must provide either filename or db_url")

def zip_and_upload_task(job_id, tables, chart_data, output_dir, zip_name, supabase_zip_path):
    csv_paths = save_tables_to_csvs(tables, output_dir)
    heatmap_file_path = None
    for v in chart_data.values():
        heatmap_file_path = v
    zip_path = create_zip_with_csvs_and_heatmap(csv_paths, heatmap_file_path)
    download_url = upload_zip_and_get_url(zip_path, supabase_zip_path)
    update_job(job_id, "ready", download_url)

@app.post("/api/analysis")
def analyze_data(payload: AnalysisRequest, background_tasks: BackgroundTasks):
    try:
        job_id = uuid.uuid4().hex
        save_job(job_id, "processing")
        logger.info("____________PROCESS STARTED____________")
        logger.info(f"Running analysis")
        logger.info(f"Payload: {payload}")
        df = None
        logger.info(f"Selected table for analysis: {payload.selectedTable}")

        # --- Handle DB URL case ---
        if payload.dbUrl:
            try:
                engine = sqlalchemy.create_engine(payload.dbUrl)
                with engine.connect() as conn:
                    if payload.sqlQuery:
                        df = pd.read_sql_query(payload.sqlQuery, conn)
                    elif getattr(payload, "selectedTable", None):
                        df = pd.read_sql_table(payload.selectedTable, conn)
                    else:
                        logger.error("No SQL query or table specified for DB URL")
                        raise HTTPException(status_code=400, detail="No SQL query or table specified for DB URL")
            except Exception as e:
                logger.error(f"Error loading data from database: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Error loading data from database: {str(e)}")
        else:
            # --- Handle file upload case ---
            file_path = f"uploads/{payload.filename}"
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                raise HTTPException(status_code=404, detail="File not found")

            ext = os.path.splitext(payload.filename)[1].lower()

            if ext == ".csv":
                # --- Handle CSV file upload case ---
                encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1', 'utf-8-sig']
                for encoding in encodings:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue

                if df is None:
                    logger.error("Unable to read CSV file. Please check the file encoding.")
                    raise HTTPException(status_code=400, detail="Unable to read CSV file. Please check the file encoding.")

            else:
                logger.error("Unsupported file type for analysis")
                raise HTTPException(status_code=400, detail="Unsupported file type for analysis")

        # --- Preprocessing, filtering, cohort analysis, summary, etc. ---

        # Data cleaning: capping or removing outliers
        preprocessing = payload.preprocessing or {}
        data_cleaning = preprocessing.dataCleaning if preprocessing else {}

        if getattr(data_cleaning, "capping", False):
            # Cap outliers at 99th percentile for all numerical columns
            for col in df.select_dtypes(include="number").columns:
                cap = df[col].quantile(0.99)
                df[col] = df[col].clip(upper=cap)
        elif getattr(data_cleaning, "remove", False):
            # Remove rows where any numerical column is above the 99th percentile
            num_cols = df.select_dtypes(include="number").columns
            mask = pd.Series([True] * len(df))
            for col in num_cols:
                cap = df[col].quantile(0.99)
                mask &= df[col] <= cap
            df = df[mask]

        for col in [payload.cohortGrouping, payload.eventColumn]:
            if col in df.columns:
                try:
                    df[col] = pd.to_datetime(df[col])
                except Exception as e:
                    logger.error(f"Error parsing dates in {col}: {str(e)}")
                    raise HTTPException(status_code=400, detail=f"Error parsing dates in {col}: {str(e)}")

        if payload.startDate:
            start_date = pd.to_datetime(payload.startDate)
            df = df[df[payload.eventColumn] >= start_date]
        if payload.endDate:
            end_date = pd.to_datetime(payload.endDate)
            df = df[df[payload.eventColumn] <= end_date]

        if payload.columns:
            required_cols = [payload.userId, payload.cohortGrouping, payload.eventColumn]
            if payload.revenueColumn:
                required_cols.append(payload.revenueColumn)
            all_cols = list(set(payload.columns + required_cols))
            available_cols = [col for col in all_cols if col in df.columns]
            df = df[available_cols]

        try:
            cohort_results = cohort_service.perform_cohort_analysis(
                df=df,
                user_id_col=payload.userId,
                cohort_grouping_col=payload.cohortGrouping,
                event_col=payload.eventColumn,
                interval=payload.cohortInterval,
                revenue_col=payload.revenueColumn if payload.analysisMetric == "revenue" else None,
                preprocessing=payload.preprocessing
            )
        except Exception as e:
            logger.error(f"Cohort analysis failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Cohort analysis failed: {str(e)}")

        # Always re-parse datetime columns after type conversion/preprocessing
        for col in [payload.cohortGrouping, payload.eventColumn]:
            if col in df.columns and not pd.api.types.is_datetime64_any_dtype(df[col]):
                try:
                    df[col] = pd.to_datetime(df[col])
                except Exception as e:
                    logger.error(f"Error parsing dates in {col} after type conversion: {str(e)}")
                    raise HTTPException(status_code=400, detail=f"Error parsing dates in {col} after type conversion: {str(e)}")

        # Prepare the response in the required format
        

        data = {
            "total_rows":  cohort_results.get('totalRows'),
            "columns": list(df.columns),
            "date_range": {
                "start": safe_iso(df[payload.eventColumn].min()) if len(df) > 0 else None,
                "end": safe_iso(df[payload.eventColumn].max()) if len(df) > 0 else None
            },
            "unique_users": df[payload.userId].nunique() if payload.userId in df.columns else 0,
            "cohort_interval": payload.cohortInterval,
            "analysis_metric": payload.analysisMetric,
            "cohort_analysis": cohort_results,
            "analysis_type": None,
            "note": None,
            "total_revenue": None
        }

        if payload.analysisMetric == "retention":
            data["analysis_type"] = "retention"
            data["note"] = f"Retention analysis completed with {payload.cohortInterval} cohorts"
        elif payload.analysisMetric == "revenue":
            if payload.revenueColumn and payload.revenueColumn in df.columns:
                total_revenue = df[payload.revenueColumn].sum() if pd.api.types.is_numeric_dtype(df[payload.revenueColumn]) else 0
                data["total_revenue"] = float(total_revenue)
                data["analysis_type"] = "revenue"
                data["note"] = f"Revenue analysis completed with {payload.cohortInterval} cohorts"
            else:
                data["note"] = "Revenue column not found or not specified"
        elif payload.analysisMetric == "engagement":
            data["analysis_type"] = "engagement"
            data["note"] = f"Engagement analysis completed with {payload.cohortInterval} cohorts"
        else:
            data["note"] = "Unsupported analysis metric"

        chart_data = cohort_results.get("charts", {})

        llm_observations = None
        if payload.llm_insights:
            try:
                llm_observations = get_llm_insights(data)
            except Exception as e:
                logger.warning(f"LLM summary failed: {str(e)}")
                llm_observations = {}
        logger.info("Analysis completed successfully.")
        
        # Get the download url
        # Prepare tables to save (main df and cohort results as CSVs)
        tables = {"analysis_data": df}
        # If cohort_results has DataFrames or dicts, add them as well (convert dicts to DataFrames)
        keys = ['retention_table', 'revenue_table', 'arpu_table', 'ltv_table']
        for key in keys:
            value = cohort_results.get(key)
            if isinstance(value, pd.DataFrame):
                tables[key] = value
            elif isinstance(value, dict):
                # Convert dict to DataFrame (handle nested dicts as well)
                try:
                    tables[key] = pd.DataFrame(value)
                except Exception:
                    # If value is a dict of dicts, try orient='index'
                    tables[key] = pd.DataFrame.from_dict(value, orient='index')
        output_dir = "output_csvs"
        zip_name = f"results_{job_id}.zip"
        supabase_zip_path = f"user_results/{zip_name}"

        background_tasks.add_task(
            zip_and_upload_task,
            job_id, tables, chart_data, output_dir, zip_name, supabase_zip_path
        )

        return {
            "job_id": job_id,
            "data": data,
            "chart_data": chart_data,
            "llm_observations": llm_observations,
            "download_url": None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/analysis-status")
def analysis_status(job_id: str):
    job = get_job(job_id)
    logger.info(f"Analysis status for job_id={job_id}: {job}")
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "status": job.status,
        "download_url": job.download_url
    }