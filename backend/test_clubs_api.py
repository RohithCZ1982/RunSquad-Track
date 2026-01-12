import requests
import json

# First, let's login to get a token
login_url = "http://localhost:5000/api/auth/login"
login_data = {
    "email": "abcd@gmail.com",
    "password": "password123"  # Change if needed
}

print("Testing login...")
login_response = requests.post(login_url, json=login_data)
print(f"Login Status: {login_response.status_code}")
print(f"Login Response: {login_response.text}")

if login_response.status_code == 200:
    token = login_response.json().get('access_token')
    print(f"\nToken received: {token[:50]}...")
    
    # Now test the clubs endpoint
    clubs_url = "http://localhost:5000/api/clubs"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("\nTesting GET /api/clubs...")
    clubs_response = requests.get(clubs_url, headers=headers)
    print(f"Clubs Status: {clubs_response.status_code}")
    print(f"Clubs Response: {json.dumps(clubs_response.json(), indent=2)}")
else:
    print("Login failed, cannot test clubs endpoint")
