# main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from jobs import router as jobs_router        # ← imports jobs router
from schema import router as schema_router    # ← imports schema router
from pydantic import BaseModel, validator
from supabase_client import supabase
from typing import Optional, List, Dict, Any
import traceback

app = FastAPI(title="Jobbify API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ────────────────────────────────────────────────────────────

class SwipeIn(BaseModel):
    job_id: str
    direction: str  # 'left' or 'right'
    profile_id: str  # Adding profile_id to support current app structure
    
    # Validate that direction is either 'left' or 'right'
    @validator('direction')
    def validate_direction(cls, v):
        if v not in ['left', 'right']:
            raise ValueError('direction must be either "left" or "right"')
        return v

class BookmarkIn(BaseModel):
    job_id: str
    profile_id: str  # Adding profile_id to support current app structure

class ApplicationIn(BaseModel):
    job_id: str
    profile_id: str  # Adding profile_id to support current app structure
    cover_letter: Optional[str] = None

# ─── Dependency to get current user ID ───────────────────────────────────
# For now, we'll use a simpler approach without auth verification
def get_user_id(profile_id: str = None) -> str:
    if not profile_id:
        raise HTTPException(status_code=401, detail="Missing profile_id")
    return profile_id

# ─── Endpoints ────────────────────────────────────────────────────────

@app.get("/jobs/")
def fetch_jobs(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch available jobs."""
    try:
        resp = supabase.table("jobs").select("*").limit(limit).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/jobs/unseen")
def fetch_unseen_jobs(limit: int = 20, profile_id: str = None) -> List[Dict[str, Any]]:
    """Call the RPC unseen_jobs to return jobs obeying your rules."""
    user_id = get_user_id(profile_id)
    try:
        resp = supabase.rpc("unseen_jobs", {"_limit": limit, "user_id": user_id}).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/swipe", status_code=status.HTTP_201_CREATED)
def swipe(sw: SwipeIn) -> Dict[str, Any]:
    """Insert a swipe record."""
    try:
        user_id = get_user_id(sw.profile_id)
        payload = {
            "user_id": user_id,
            "job_id": sw.job_id,
            "direction": sw.direction,
        }
        
        # Check if there's an existing swipe first
        print(f"Checking if swipe already exists: user_id={user_id}, job_id={sw.job_id}")
        try:
            existing = supabase.table("swipes").select("id").eq("user_id", user_id).eq("job_id", sw.job_id).execute()
            
            if existing.data and len(existing.data) > 0:
                # Swipe already exists, update it
                swipe_id = existing.data[0]["id"]
                print(f"Swipe exists with ID {swipe_id}, updating direction to {sw.direction}")
                
                try:
                    resp = supabase.table("swipes").update({"direction": sw.direction}).eq("id", swipe_id).execute()
                    print(f"Update response: {resp.data}")
                    return resp.data[0] if resp.data and len(resp.data) > 0 else {"id": swipe_id, "direction": sw.direction}
                except Exception as update_error:
                    print(f"Error updating swipe: {str(update_error)}")
                    print(traceback.format_exc())
                    # Return existing data as success instead of failing
                    return {"id": swipe_id, "message": "Record exists but could not be updated"}
            else:
                # No existing swipe, insert new one
                print(f"No existing swipe found, inserting new record with payload: {payload}")
                try:
                    resp = supabase.table("swipes").insert(payload).execute()
                    print(f"Insert response: {resp.data}")
                    return resp.data[0] if resp.data and len(resp.data) > 0 else {"message": "Inserted but no data returned"}
                except Exception as insert_error:
                    print(f"Error inserting swipe: {str(insert_error)}")
                    print(traceback.format_exc())
                    raise HTTPException(status_code=400, detail=f"Failed to insert swipe: {str(insert_error)}")
        except Exception as query_error:
            print(f"Error querying existing swipes: {str(query_error)}")
            print(traceback.format_exc())
            # Try direct insert as fallback
            try:
                resp = supabase.table("swipes").insert(payload).execute()
                return resp.data[0] if resp.data and len(resp.data) > 0 else {"message": "Inserted but no data returned"}
            except Exception as fallback_error:
                print(f"Fallback insert failed: {str(fallback_error)}")
                print(traceback.format_exc())
                raise HTTPException(status_code=400, detail=f"Failed to insert swipe: {str(fallback_error)}")
    except Exception as e:
        print(f"Unhandled error in swipe endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/bookmarks", status_code=status.HTTP_201_CREATED)
def bookmark(bm: BookmarkIn) -> Dict[str, Any]:
    """Insert a bookmark."""
    try:
        user_id = get_user_id(bm.profile_id)
        
        # Check if bookmark already exists
        print(f"Checking if bookmark already exists: profile_id={user_id}, job_id={bm.job_id}")
        try:
            existing = supabase.table("bookmarks").select("id").eq("profile_id", user_id).eq("job_id", bm.job_id).execute()
            
            if existing.data and len(existing.data) > 0:
                # Bookmark already exists, return success
                bookmark_id = existing.data[0]["id"]
                print(f"Bookmark already exists with ID {bookmark_id}")
                return existing.data[0]
            
            # No existing bookmark, insert new one
            print(f"No existing bookmark found, inserting new record")
            try:
                resp = supabase.table("bookmarks").insert({
                    "profile_id": user_id,
                    "job_id": bm.job_id
                }).execute()
                
                print(f"Insert response: {resp.data}")
                return resp.data[0] if resp.data and len(resp.data) > 0 else {"message": "Inserted but no data returned"}
            except Exception as insert_error:
                print(f"Error inserting bookmark: {str(insert_error)}")
                print(traceback.format_exc())
                raise HTTPException(status_code=400, detail=f"Failed to insert bookmark: {str(insert_error)}")
        except Exception as query_error:
            print(f"Error querying existing bookmarks: {str(query_error)}")
            print(traceback.format_exc())
            # Try direct insert as fallback
            try:
                resp = supabase.table("bookmarks").insert({
                    "profile_id": user_id,
                    "job_id": bm.job_id
                }).execute()
                return resp.data[0] if resp.data and len(resp.data) > 0 else {"message": "Inserted but no data returned"}
            except Exception as fallback_error:
                print(f"Fallback insert failed: {str(fallback_error)}")
                print(traceback.format_exc())
                raise HTTPException(status_code=400, detail=f"Failed to insert bookmark: {str(fallback_error)}")
    except Exception as e:
        print(f"Unhandled error in bookmark endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/applications", status_code=status.HTTP_201_CREATED)
def apply(apply_in: ApplicationIn) -> Dict[str, Any]:
    """Insert an application record."""
    try:
        user_id = get_user_id(apply_in.profile_id)
        payload = {
            "profile_id": user_id,
            "job_id": apply_in.job_id,
            "cover_letter": apply_in.cover_letter,
            "status": "applying"
        }
        
        # Check if application already exists
        print(f"Checking if application already exists: profile_id={user_id}, job_id={apply_in.job_id}")
        try:
            existing = supabase.table("applications").select("id").eq("profile_id", user_id).eq("job_id", apply_in.job_id).execute()
            
            if existing.data and len(existing.data) > 0:
                # Application already exists, return success
                app_id = existing.data[0]["id"]
                print(f"Application already exists with ID {app_id}")
                return existing.data[0]
            
            # No existing application, insert new one
            print(f"No existing application found, inserting new record")
            try:
                resp = supabase.table("applications").insert(payload).execute()
                
                print(f"Insert response: {resp.data}")
                return resp.data[0] if resp.data and len(resp.data) > 0 else {"message": "Inserted but no data returned"}
            except Exception as insert_error:
                print(f"Error inserting application: {str(insert_error)}")
                print(traceback.format_exc())
                raise HTTPException(status_code=400, detail=f"Failed to insert application: {str(insert_error)}")
        except Exception as query_error:
            print(f"Error querying existing applications: {str(query_error)}")
            print(traceback.format_exc())
            # Try direct insert as fallback
            try:
                resp = supabase.table("applications").insert(payload).execute()
                return resp.data[0] if resp.data and len(resp.data) > 0 else {"message": "Inserted but no data returned"}
            except Exception as fallback_error:
                print(f"Fallback insert failed: {str(fallback_error)}")
                print(traceback.format_exc())
                raise HTTPException(status_code=400, detail=f"Failed to insert application: {str(fallback_error)}")
    except Exception as e:
        print(f"Unhandled error in apply endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/matches", status_code=status.HTTP_201_CREATED)
def save_match(apply_in: ApplicationIn) -> Dict[str, Any]:
    """Insert a match record for backwards compatibility."""
    try:
        user_id = get_user_id(apply_in.profile_id)
        payload = {
            "profile_id": user_id,
            "job_id": apply_in.job_id,
            "status": "applying",
            "created_at": "now()"
        }
        
        # Check if a match already exists
        print(f"Checking if match already exists: profile_id={user_id}, job_id={apply_in.job_id}")
        try:
            existing = supabase.table("matches").select("id").eq("profile_id", user_id).eq("job_id", apply_in.job_id).execute()
            
            if existing.data and len(existing.data) > 0:
                # Match already exists, return success
                match_id = existing.data[0]["id"]
                print(f"Match already exists with ID {match_id}")
                return existing.data[0]
            
            # No existing match, insert new one
            print(f"No existing match found, inserting new record")
            try:
                resp = supabase.table("matches").insert(payload).execute()
                
                print(f"Insert response: {resp.data}")
                return resp.data[0] if resp.data and len(resp.data) > 0 else {"message": "Inserted but no data returned"}
            except Exception as insert_error:
                print(f"Error inserting match: {str(insert_error)}")
                print(traceback.format_exc())
                raise HTTPException(status_code=400, detail=f"Failed to insert match: {str(insert_error)}")
        except Exception as query_error:
            print(f"Error querying existing matches: {str(query_error)}")
            print(traceback.format_exc())
            # Try direct insert as fallback
            try:
                resp = supabase.table("matches").insert(payload).execute()
                return resp.data[0] if resp.data and len(resp.data) > 0 else {"message": "Inserted but no data returned"}
            except Exception as fallback_error:
                print(f"Fallback insert failed: {str(fallback_error)}")
                print(traceback.format_exc())
                raise HTTPException(status_code=400, detail=f"Failed to insert match: {str(fallback_error)}")
    except Exception as e:
        print(f"Unhandled error in save_match endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))

# Add a health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(jobs_router)
app.include_router(schema_router)

# Add this at the end of file to bind to all interfaces when run directly
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
