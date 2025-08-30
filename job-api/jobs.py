# jobs.py
from fastapi import APIRouter, HTTPException, Body
from job_service import fetch_and_store_jobs, supabase, TEST_JOBS
from fastapi.responses import JSONResponse
from typing import Dict, Any
import uuid
from datetime import datetime

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/refresh")
def refresh_jobs():
    """Pull latest listings from RemoteOK and store them."""
    try:
        total = fetch_and_store_jobs()
        return {"message": f"{total} jobs upserted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def list_jobs():
    """Get all jobs from the database with quality enhancement."""
    try:
        # Get page parameter for pagination, default to 1
        page_size = 250  # We want to send a large batch of jobs
        
        print("Querying Supabase for jobs...")
        # Query with high limit to ensure enough jobs
        response = supabase.table("jobs").select("*").limit(page_size).execute()
        
        if hasattr(response, 'error') and response.error is not None:
            print(f"Error fetching jobs from Supabase: {response.error}")
            # Return test data if Supabase has an error
            return JSONResponse(content=filter_quality_jobs(TEST_JOBS))
        
        if not response.data or len(response.data) == 0:
            print("No jobs found in Supabase, fetching fresh data from APIs...")
            # Try to fetch new jobs from APIs right now
            from job_service import fetch_and_store_jobs
            jobs_inserted = fetch_and_store_jobs()
            print(f"Fetched and inserted {jobs_inserted} new jobs")
            
            # Try to get the jobs again
            response = supabase.table("jobs").select("*").limit(250).execute()
            
            # If still empty, use test data
            if not response.data or len(response.data) == 0:
                print("Still no jobs found, returning test data")
                return JSONResponse(content=filter_quality_jobs(TEST_JOBS))
        
        # Enhance jobs to ensure all have location, logo and description
        enhanced_jobs = filter_quality_jobs(response.data)
        
        print(f"Retrieved {len(response.data)} jobs from Supabase, enhanced to {len(enhanced_jobs)} quality listings")
        return JSONResponse(content=enhanced_jobs)
    except Exception as e:
        print(f"Exception in list_jobs: {str(e)}")
        # Fall back to test data if there's an exception
        return JSONResponse(content=filter_quality_jobs(TEST_JOBS))


def filter_quality_jobs(jobs_list):
    """Filter jobs to enhance quality, but ensure users always have jobs to view.
    Apply basic improvements to job listings when fields are missing.
    
    Args:
        jobs_list: List of job dictionaries
        
    Returns:
        List of enhanced jobs with reasonable quality
    """
    enhanced_jobs = []
    total_improved = 0
    
    for job in jobs_list:
        # Check and fix fields when possible
        needs_enhancement = False
        
        # Handle location
        if not job.get('location') or len(str(job.get('location', '')).strip()) == 0:
            job['location'] = job.get('job_location') or 'Remote/Flexible'
            needs_enhancement = True
        
        # Handle logo/image - copy from image to logo and vice versa if one is missing
        if not job.get('logo') or len(str(job.get('logo', '')).strip()) == 0:
            if job.get('image') and len(str(job.get('image', '')).strip()) > 0:
                job['logo'] = job['image']
                needs_enhancement = True
            else:
                # Use a nice default company logo as placeholder
                job['logo'] = f"https://ui-avatars.com/api/?name={job.get('company', 'Company')}&background=random&size=150"
                needs_enhancement = True
        
        # Handle description
        if not job.get('description') or len(str(job.get('description', '')).strip()) < 10:
            # Generate a basic description from available info
            company = job.get('company', 'A company')
            title = job.get('title', 'position')
            job['description'] = f"Join {company} as a {title}. This role offers an opportunity to work with a great team on exciting projects."
            needs_enhancement = True
            
        if needs_enhancement:
            total_improved += 1
            
        enhanced_jobs.append(job)
    
    print(f"Enhanced {total_improved} out of {len(jobs_list)} job listings to improve quality")
    return enhanced_jobs

@router.post("/applications")
def save_application(application_data: Dict[str, Any] = Body(...)):
    """Save a job application with 'applying' status"""
    try:
        # Generate a unique ID for the application
        application_id = str(uuid.uuid4())
        
        # Create application record with applying status
        application = {
            "id": application_id,
            "job_id": application_data.get("job_id"),
            "user_id": application_data.get("user_id"),
            "status": "applying",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "job_data": application_data.get("job_data", {})
        }
        
        # Store in database (mock - would use supabase in production)
        print(f"Saving application: {application}")
        
        # Return successful response with the application ID
        return {"id": application_id, "status": "applying"}
    except Exception as e:
        print(f"Error saving application: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/applications/{application_id}")
def update_application_status(
    application_id: str, 
    update_data: Dict[str, Any] = Body(...)
):
    """Update a job application status"""
    try:
        # Get the new status from request body
        new_status = update_data.get("status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Status field is required")
            
        # In a real implementation, validate the application exists
        # and belongs to the requesting user
        
        # Update the application status
        updated_application = {
            "id": application_id,
            "status": new_status,
            "updated_at": datetime.now().isoformat()
        }
        
        print(f"Updating application {application_id} to status: {new_status}")
        
        # Return the updated application
        return updated_application
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error updating application: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/applications")
def list_applications(profile_id: str = None):
    """List applications for a specific user"""
    if not profile_id:
        raise HTTPException(status_code=400, detail="profile_id parameter is required")

    try:
        # Query the database for applications by this specific user
        resp = supabase.table("matches").select("""
            *,
            jobs:job_id (*)
        """).eq("profile_id", profile_id).order("created_at", desc=True).execute()

        if not resp.data:
            # Return empty list if no applications found for this user
            return []

        # Transform the data to match the expected format
        applications = []
        for match in resp.data:
            job_data = match.get("jobs") or {}
            application = {
                "id": match.get("id"),
                "job_id": match.get("job_id"),
                "profile_id": match.get("profile_id"),
                "status": match.get("status", "applying"),
                "created_at": match.get("created_at"),
                "updated_at": match.get("updated_at"),
                "job_data": {
                    "id": job_data.get("id"),
                    "title": job_data.get("title", "Unknown Job"),
                    "company": job_data.get("company", "Unknown Company"),
                    "location": job_data.get("location", "Unknown Location"),
                    "pay": job_data.get("salary"),
                    "description": job_data.get("description"),
                    "url": job_data.get("url")
                }
            }
            applications.append(application)

        return applications

    except Exception as e:
        print(f"Error fetching applications for user {profile_id}: {str(e)}")
        # Return empty list on error instead of failing
        return []
