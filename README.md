

# Cohort Analysis App

## Backend Setup

### 1. Change to Backend Directory

```sh
cd backend
```

### 2. Create and Activate Virtual Environment

#### For Windows:

```sh
python -m venv venv
venv\Scripts\activate
```

#### For macOS/Linux:

```sh
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies

```sh
pip install -r requirements.txt
```

### 4. Supabase Setup (Optional if you already have credentials)

1. Go to [Supabase](https://supabase.com) and create an account.
2. Create a new project.
3. Create a new bucket named `results` in the storage section.
4. In your project:
   - Under **Settings > Configuration > Data API**, find your `SUPABASE_URL`.
   - Under **Project Settings > API keys**, find your `SUPABASE_KEY` (use the `service_role`).
5. Copy these values and create a `.env` file in the `backend` directory with the following content:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_DB_URL=your_supabase_db_url
GROQ_API_KEY=your_groq_api_key  # Copy your Groq API key here
```

### 5. Run the Backend Server

```sh
uvicorn app.main:app --reload
```

---

## Frontend Setup

### 1. Change to Frontend Directory

```sh
cd frontend
```

### 2. Install Node.js Dependencies

```sh
npm install
```

### 3. Start the Frontend Development Server

```sh
npm run dev
```

---

## Usage

Go to [http://localhost:8080](http://localhost:8080) to see the app running.
