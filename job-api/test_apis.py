#!/usr/bin/env python3
import asyncio
import httpx
from job_service import remoteok, arbeitnow, adzuna

async def test_apis():
    """Test each job API and report on the number of jobs returned"""
    print("🧪 Testing individual job APIs...")
    
    async with httpx.AsyncClient() as client:
        print("\n📊 RemoteOK API Test:")
        remoteok_jobs = await remoteok(client)
        print(f"   Jobs found: {len(remoteok_jobs)}")
        if remoteok_jobs:
            print(f"   Sample job: {remoteok_jobs[0].get('title')} at {remoteok_jobs[0].get('company')}")
        
        print("\n📊 Arbeitnow API Test:")
        arbeitnow_jobs = await arbeitnow(client)
        print(f"   Jobs found: {len(arbeitnow_jobs)}")
        if arbeitnow_jobs:
            print(f"   Sample job: {arbeitnow_jobs[0].get('title')} at {arbeitnow_jobs[0].get('company_name')}")
        
        print("\n📊 Adzuna API Test:")
        adzuna_jobs = await adzuna(client)
        print(f"   Jobs found: {len(adzuna_jobs)}")
        if adzuna_jobs:
            print(f"   Sample job: {adzuna_jobs[0].get('title')} at {adzuna_jobs[0].get('company_display_name')}")
        
        # Get the combined total
        total_jobs = len(remoteok_jobs) + len(arbeitnow_jobs) + len(adzuna_jobs)
        print(f"\n✅ Total jobs from all sources: {total_jobs}")
        
        # Check if any APIs returned zero jobs
        failed_apis = []
        if len(remoteok_jobs) == 0:
            failed_apis.append("RemoteOK")
        if len(arbeitnow_jobs) == 0:
            failed_apis.append("Arbeitnow")
        if len(adzuna_jobs) == 0:
            failed_apis.append("Adzuna")
            
        if failed_apis:
            print(f"⚠️ Warning: The following APIs returned zero jobs: {', '.join(failed_apis)}")
        else:
            print("✅ All APIs are returning jobs successfully!")

if __name__ == "__main__":
    asyncio.run(test_apis())
