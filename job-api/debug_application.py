#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000"

def test_application_endpoint():
    """Test the application endpoint"""
    
    # First get a real job ID
    print("Getting jobs...")
    jobs_response = requests.get(f"{BASE_URL}/jobs/?limit=1")
    if jobs_response.status_code != 200:
        print(f"Failed to get jobs: {jobs_response.status_code}")
        return
    
    jobs = jobs_response.json()
    if not jobs:
        print("No jobs available")
        return
    
    job_id = jobs[0]['id']
    print(f"Using job ID: {job_id}")
    
    # Test the application endpoint
    data = {
        "profile_id": "test-user-123",
        "job_id": job_id,
        "cover_letter": "Test application"
    }
    
    print(f"Posting to {BASE_URL}/applications")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    response = requests.post(f"{BASE_URL}/applications", json=data)
    print(f"Response status: {response.status_code}")
    print(f"Response text: {response.text}")
    
    if response.status_code == 201:
        print("✅ Application successful!")
    else:
        print("❌ Application failed!")

if __name__ == "__main__":
    test_application_endpoint()
