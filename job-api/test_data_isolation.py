#!/usr/bin/env python3
"""
Test script to verify data isolation in the job application API
"""

import requests
import json
import uuid

# API base URL
BASE_URL = "http://localhost:8000"

def test_user_isolation():
    """Test that users only see their own applications"""
    
    print("🧪 Testing Data Isolation...")
    
    # Create two test user IDs
    user1_id = str(uuid.uuid4())
    user2_id = str(uuid.uuid4())
    
    print(f"👤 User 1 ID: {user1_id}")
    print(f"👤 User 2 ID: {user2_id}")
    
    # Test 1: Both users should start with 0 applications
    print("\n📋 Test 1: Initial state (should be empty)")
    
    user1_apps = get_applications(user1_id)
    user2_apps = get_applications(user2_id)
    
    print(f"User 1 applications: {len(user1_apps)}")
    print(f"User 2 applications: {len(user2_apps)}")
    
    assert len(user1_apps) == 0, f"User 1 should have 0 applications, got {len(user1_apps)}"
    assert len(user2_apps) == 0, f"User 2 should have 0 applications, got {len(user2_apps)}"
    print("✅ Both users start with empty applications")
    
    # Test 2: Get some jobs to apply to
    print("\n📋 Test 2: Getting available jobs")
    jobs = get_jobs()
    
    if not jobs:
        print("❌ No jobs available for testing")
        return False
    
    print(f"✅ Found {len(jobs)} jobs available")
    
    # Test 3: User 1 applies to first job
    print("\n📋 Test 3: User 1 applies to a job")
    job1 = jobs[0]
    
    success = apply_to_job(user1_id, job1['id'])
    if success:
        print("✅ User 1 successfully applied to job")
    else:
        print("❌ User 1 failed to apply to job")
        return False
    
    # Test 4: Check that only User 1 sees the application
    print("\n📋 Test 4: Verify data isolation")
    
    user1_apps = get_applications(user1_id)
    user2_apps = get_applications(user2_id)
    
    print(f"User 1 applications: {len(user1_apps)}")
    print(f"User 2 applications: {len(user2_apps)}")
    
    assert len(user1_apps) == 1, f"User 1 should have 1 application, got {len(user1_apps)}"
    assert len(user2_apps) == 0, f"User 2 should have 0 applications, got {len(user2_apps)}"
    print("✅ Data isolation working - User 2 cannot see User 1's applications")
    
    # Test 5: User 2 applies to a different job
    if len(jobs) > 1:
        print("\n📋 Test 5: User 2 applies to different job")
        job2 = jobs[1]
        
        success = apply_to_job(user2_id, job2['id'])
        if success:
            print("✅ User 2 successfully applied to job")
            
            # Verify both users still only see their own data
            user1_apps = get_applications(user1_id)
            user2_apps = get_applications(user2_id)
            
            print(f"User 1 applications: {len(user1_apps)}")
            print(f"User 2 applications: {len(user2_apps)}")
            
            assert len(user1_apps) == 1, f"User 1 should still have 1 application"
            assert len(user2_apps) == 1, f"User 2 should now have 1 application"
            print("✅ Both users see only their own applications")
        else:
            print("❌ User 2 failed to apply to job")
    
    print("\n🎉 All data isolation tests passed!")
    return True

def get_applications(user_id):
    """Get applications for a specific user"""
    try:
        response = requests.get(f"{BASE_URL}/jobs/applications", params={"profile_id": user_id})
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to get applications: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error getting applications: {e}")
        return []

def get_jobs():
    """Get available jobs"""
    try:
        response = requests.get(f"{BASE_URL}/jobs/", params={"limit": 10})
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to get jobs: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error getting jobs: {e}")
        return []

def apply_to_job(user_id, job_id):
    """Apply to a job as a specific user"""
    try:
        data = {
            "profile_id": user_id,
            "job_id": job_id,
            "cover_letter": "Test application"
        }
        response = requests.post(f"{BASE_URL}/applications", json=data)
        return response.status_code == 201
    except Exception as e:
        print(f"❌ Error applying to job: {e}")
        return False

def test_api_health():
    """Test if the API is running"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ API is healthy")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Data Isolation Tests")
    print(f"🌐 API URL: {BASE_URL}")
    
    # First check if API is running
    if not test_api_health():
        print("❌ API is not running. Please start the backend server first.")
        exit(1)
    
    # Run the isolation tests
    success = test_user_isolation()
    
    if success:
        print("\n✅ All tests passed! Data isolation is working correctly.")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        exit(1)
