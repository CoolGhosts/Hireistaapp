import requests
import sys
import json

# Use your network IP instead of localhost
API_BASE_URL = 'http://10.0.0.181:5000'

def test_health_endpoint():
    """Test the health endpoint of the API."""
    try:
        response = requests.get(f'{API_BASE_URL}/health', timeout=5)
        print(f"Status code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("Connection error: Could not connect to the API server")
        return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_analyze_resume():
    """Test the analyze-resume endpoint with a simple resume."""
    simple_resume = """
    John Doe
    Software Engineer
    
    SKILLS
    Python, JavaScript, React
    
    EXPERIENCE
    Software Engineer, ABC Corp, 2020-Present
    """
    
    try:
        response = requests.post(
            f'{API_BASE_URL}/analyze-resume',
            json={'resume_text': simple_resume},
            timeout=30
        )
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Analysis successful!")
            # Print just the first part of the response to avoid too much output
            result = response.json().get('result', {})
            print(f"Overall score: {result.get('overallScore')}")
            print(f"Strengths: {result.get('strengths')}")
        else:
            print(f"Error response: {response.text}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("Connection error: Could not connect to the API server")
        return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing API connectivity...")
    health_ok = test_health_endpoint()
    
    if health_ok:
        print("\nTesting resume analysis...")
        test_analyze_resume()
    else:
        print("\nSkipping resume analysis test because health check failed")
        sys.exit(1) 