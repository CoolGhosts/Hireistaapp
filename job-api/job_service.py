# job_service.py
import os
import asyncio
import httpx
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client

# Import test jobs using absolute import
try:
    from test_jobs import TEST_JOBS
except ImportError:
    # Fallback for when the module is imported as a package
    try:
        from .test_jobs import TEST_JOBS
    except ImportError:
        # Default empty test jobs if all imports fail
        TEST_JOBS = []

# ── Env & Supabase ────────────────────────────────────────────
load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY"),
)

# ── Public API headers ────────────────────────────────────────
HEADERS = {"User-Agent": "JobbifyBot/1.0 (+https://jobbify.app)"}

# ── API credentials ───────────────────────────────────────────
ADZ_ID = os.getenv("ADZUNA_APP_ID", "4fcc5736")
ADZ_KEY = os.getenv("ADZUNA_APP_KEY", "12053bfdc8c197aa8192c0aabac56450")

# ── Async fetchers ────────────────────────────────────────────
async def remoteok(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """Fetch jobs from RemoteOK API"""
    try:
        print("🔄 Fetching from RemoteOK...")
        r = await client.get("https://remoteok.com/api", headers=HEADERS, timeout=20)
        r.raise_for_status()
        data = r.json()[1:]  # first element is metadata
        for job in data:
            job["source"] = "remoteok"
            job["external_id"] = str(job["id"])
        print(f"✅ RemoteOK: Found {len(data)} jobs")
        return data
    except Exception as e:
        print(f"❌ RemoteOK error: {e}")
        return []

async def arbeitnow(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """Fetch jobs from Arbeitnow API"""
    try:
        print("🔄 Fetching from Arbeitnow...")
        r = await client.get("https://www.arbeitnow.com/api/job-board-api",
                           headers=HEADERS, timeout=20)
        r.raise_for_status()
        data = r.json().get("data", [])
        for job in data:
            job["source"] = "arbeitnow"
            job["external_id"] = str(job["slug"])
        print(f"✅ Arbeitnow: Found {len(data)} jobs")
        return data
    except Exception as e:
        print(f"❌ Arbeitnow error: {e}")
        return []

async def adzuna(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """Fetch jobs from Adzuna API"""
    if not (ADZ_ID and ADZ_KEY):
        print("Adzuna API credentials not found, skipping")
        return []
    try:
        print("🔄 Fetching from Adzuna...")
        url = (f"https://api.adzuna.com/v1/api/jobs/us/search/1"
               f"?app_id={ADZ_ID}&app_key={ADZ_KEY}"
               "&results_per_page=50&content-type=application/json")
        r = await client.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        data = r.json().get("results", [])
        for job in data:
            job["source"] = "adzuna"
            job["external_id"] = str(job["id"])
        print(f"✅ Adzuna: Found {len(data)} jobs")
        return data
    except Exception as e:
        print(f"❌ Adzuna error: {e}")
        return []

# ── Field mapping ─────────────────────────────────────────────
def map_job(j: Dict[str, Any]) -> Dict[str, Any]:
    """Map job data from various sources to a standardized format"""
    src = j.get("source", "unknown")
    
    # Extract description in a safe way, handling different API formats
    description = ""
    if "description" in j:
        description = j["description"]
    elif "body" in j:
        description = j["body"]
    elif "description_html" in j:
        description = j["description_html"]
    
    # Extract tags/skills
    tags = []
    if "tags" in j and isinstance(j["tags"], list):
        tags = j["tags"]
    elif "keywords" in j and isinstance(j["keywords"], list):
        tags = j["keywords"]
    elif "category" in j and isinstance(j["category"], dict) and "tag" in j["category"]:
        tags = [j["category"]["tag"]]
    
    # Build a standard job object that works with our Supabase schema
    # First, get an ID that combines source and job identifier to prevent duplicates across sources
    source_id = j.get("id") or j.get("external_id") or "unknown"
    composite_id = f"{src}_{source_id}"
    
    # For backward compatibility: if we're using the legacy schema that doesn't have source columns yet,
    # just use the standard fields and omit source/external_id to avoid errors
    try:
        # Basic job fields that should work with existing schema
        payload = {
            "title": j.get("position") or j.get("title") or j.get("name") or "",
            "company": j.get("company") or j.get("company_name") or j.get("company_display_name") or "",
            "location": j.get("location") or j.get("location_display") or "Remote",
            "salary": j.get("salary") or j.get("salary_min") or "Competitive",
            "logo": j.get("logo") or j.get("company_logo") or "",
            "apply_url": j.get("url") or j.get("apply_url") or j.get("redirect_url") or "",
            "description": description[:1000] if description else "", # Trim long descriptions
        }
        
        # We'll store the composite ID in the description as a workaround if we can't create external_id
        payload["description"] = f"SOURCE: {src} | ID: {source_id} | " + payload["description"]
        
        return payload
    except Exception as e:
        print(f"Error creating job payload: {e}")
        # Return a minimal payload if something went wrong
        return {
            "title": j.get("position") or j.get("title") or "Unknown Job",
            "company": j.get("company") or "Unknown Company",
            "description": "Job data could not be properly parsed."
        }

# ── Master importer ───────────────────────────────────────────
async def _fetch_all() -> List[Dict[str, Any]]:
    """Fetch jobs from all sources concurrently"""
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            remoteok(client),
            arbeitnow(client),
            adzuna(client),
            return_exceptions=True  # Don't let one API failure stop the others
        )
    
    all_jobs = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            source = ["RemoteOK", "Arbeitnow", "Adzuna"][i]
            print(f"❌ Error fetching from {source}: {result}")
        elif isinstance(result, list):
            all_jobs.extend(result)
    
    print(f"✅ Combined total: {len(all_jobs)} jobs from all sources")
    return all_jobs

def fetch_and_store_jobs() -> int:
    """Fetch jobs from multiple sources and store them in the database"""
    try:
        # Run the async function to fetch from all sources concurrently
        jobs = asyncio.run(_fetch_all())
        if not jobs:
            print("No jobs returned from APIs, using fallback test jobs")
            jobs = TEST_JOBS
    except Exception as e:
        print(f"❌ Fetch failed ({e}) – using fallback test jobs")
        jobs = TEST_JOBS
    
    total = 0
    duplicate_check = set()  # To avoid inserting duplicates
    
    for job in jobs:
        try:
            # Map the job data to our standard format
            payload = map_job(job)
            
            # Add source and external_id for proper identification
            # These fields should exist in our enhanced schema
            if 'source' in job and 'external_id' in job:
                payload['source'] = job['source']
                payload['external_id'] = job['external_id']
            elif 'source' not in job and 'external_id' not in job:
                # For test jobs that might not have source/external_id
                payload['source'] = 'test'
                payload['external_id'] = f"test_{total}"
            
            # Unique identifier for duplicate checking within this batch
            unique_id = f"{payload.get('source', 'unknown')}_{payload.get('external_id', '')}"
            
            # Skip if we've already processed this job in this batch
            if unique_id in duplicate_check:
                continue
                
            duplicate_check.add(unique_id)
            
            # Use upsert with source+external_id as unique identifier
            # This ensures we don't insert the same job twice, but do update existing jobs
            response = supabase.table("jobs").upsert(
                payload,
                # Use source+external_id as the unique key
                on_conflict="source,external_id"
            ).execute()
            
            total += 1
        except Exception as e:
            job_title = job.get('title', '') or job.get('position', '') or 'Unknown job'
            print(f"❌ Insert error for {job_title}: {e}")
    
    print(f"✅ Total jobs inserted to database: {total}")
    return total

# ── Fallback data for when APIs fail ──────────────────
TEST_JOBS = [
    {
        "external_id": "test_1",
        "source": "test_data",
        "title": "Frontend Developer",
        "company": "TechCorp",
        "location": "Remote",
        "salary": "$80K - $100K",
        "logo": "https://picsum.photos/200",
        "apply_url": "https://example.com/apply/1",
        "description": "We are looking for a Frontend Developer with experience in React and TypeScript to join our growing team."
    },
    {
        "external_id": "test_2",
        "source": "test_data",
        "title": "Backend Engineer",
        "company": "DataSystems",
        "location": "San Francisco, CA",
        "salary": "$100K - $120K",
        "logo": "https://picsum.photos/200?random=2",
        "apply_url": "https://example.com/apply/2",
        "description": "Looking for an experienced backend engineer to help us scale our services."
    },
    {
        "external_id": "test_3",
        "source": "test_data",
        "title": "Full Stack Developer",
        "company": "WebSolutions",
        "location": "New York, NY",
        "salary": "$90K - $110K",
        "logo": "https://picsum.photos/200?random=3",
        "apply_url": "https://example.com/apply/3",
        "description": "Join our team as a full stack developer. Experience with React and Node.js required."
    },
    {
        "external_id": "test_4",
        "source": "test_data",
        "title": "UX Designer",
        "company": "DesignMakers",
        "location": "Remote",
        "salary": "$75K - $95K",
        "logo": "https://picsum.photos/200?random=4",
        "apply_url": "https://example.com/apply/4",
        "description": "Help us create beautiful and intuitive user experiences for our products."
    },
    {
        "external_id": "test_5",
        "source": "test_data",
        "title": "DevOps Engineer",
        "company": "CloudTech",
        "location": "Austin, TX",
        "salary": "$110K - $130K",
        "logo": "https://picsum.photos/200?random=5",
        "apply_url": "https://example.com/apply/5",
        "description": "Looking for a DevOps engineer to help us implement CI/CD pipelines and manage our cloud infrastructure."
    }
]

