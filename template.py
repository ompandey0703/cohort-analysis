import os

# Define the folder structure
folders = [
    "backend",
    "backend/app",
    "backend/app/routers",
    "backend/app/services",
    "backend/app/models",
    "backend/app/utils",
    "backend/app/config",
    "backend/static/charts"
]

# Define placeholder files with basic content
files = {
    "backend/main.py": "# Entry point for FastAPI app\n",
    "backend/requirements.txt": "fastapi\nuvicorn\npandas\nmatplotlib\nseaborn\npython-multipart\npython-dotenv\nopenai\n",
    "backend/.env": "# Environment variables\n",
    "backend/README.md": "# Cohort Analysis Backend\n",
    
    "backend/app/routers/upload.py": "# Upload CSV and handle configs\n",
    "backend/app/routers/analyze.py": "# Trigger cohort analysis\n",
    "backend/app/routers/summarize.py": "# Generate summary using LLM\n",
    
    "backend/app/services/cohort.py": "# Logic for cohort calculation\n",
    "backend/app/services/chart.py": "# Logic for chart generation\n",
    "backend/app/services/summarizer.py": "# Logic for LLM summary\n",
    
    "backend/app/models/request_models.py": "# Pydantic models for requests\n",
    "backend/app/models/response_models.py": "# Pydantic models for responses\n",
    
    "backend/app/utils/file_handler.py": "# File upload and validation\n",
    "backend/app/utils/preprocessing.py": "# Preprocessing logic\n",
    "backend/app/utils/enums.py": "# Define enums like interval types\n",
    
    "backend/app/config/settings.py": "# Load env variables\n"
}

# Create folders
for folder in folders:
    os.makedirs(folder, exist_ok=True)

# Create files with initial content
for filepath, content in files.items():
    with open(filepath, "w") as f:
        f.write(content)

"Folder structure and placeholder files created successfully."
