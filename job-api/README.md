# Jobbify API

This API fetches job listings from RemoteOK and stores them in a Supabase database.

## Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file based on `.env-example` and add your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_KEY=your_supabase_key_here
   ```

## Running the API

Start the FastAPI server:
```
uvicorn main:app --reload
```

## Endpoints

- `GET /health` - Check if the API is running
- `GET /jobs` - Get list of jobs
- `POST /jobs/refresh` - Refresh jobs from RemoteOK

## Supabase Structure

The API expects a `jobs` table in Supabase with the following structure:

- `id` (primary key)
- `title` (text)
- `company` (text)
- `location` (text)
- `salary` (text)
- `logo` (text)
- `apply_url` (text)
- `external_id` (text) 