from fastapi import APIRouter, HTTPException
from job_service import supabase

router = APIRouter(prefix="/schema", tags=["schema"])

@router.post("/update")
def update_schema():
    """Update the database schema to support multi-source job APIs"""
    try:
        # Add the source column
        supabase.table("jobs").update({"source": "unknown"}).eq("id", 0).execute()
        
        # Add the external_id column
        supabase.table("jobs").update({"external_id": "unknown"}).eq("id", 0).execute()
        
        # Note: We can't add constraints directly through this API
        # In a production environment, you would run ALTER TABLE commands
        # through Supabase's SQL editor or CLI
        
        return {"message": "Schema updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
