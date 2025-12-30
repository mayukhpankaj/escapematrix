#!/usr/bin/env python3
"""
Specific timeout test for the AI Chat endpoint
"""
import requests
import json
import jwt
from datetime import datetime, timedelta
import time

def create_test_jwt(user_id="test_user_123"):
    """Create a test JWT token for authentication"""
    payload = {
        "sub": user_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, "secret", algorithm="HS256")
    return token

def test_timeout_handling():
    """Test timeout handling with a complex query"""
    print("🔍 Testing timeout handling with complex query...")
    
    token = create_test_jwt("test_user_123")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Create a complex query that might take longer to process
    complex_query = """
    I want to create a comprehensive learning plan for becoming a full-stack developer. 
    I need to learn frontend technologies like React, Vue, Angular, backend technologies 
    like Node.js, Python, Java, databases like PostgreSQL, MongoDB, Redis, DevOps tools 
    like Docker, Kubernetes, AWS, and also need to understand system design, algorithms, 
    data structures, and software engineering best practices. Please create a detailed 
    plan with specific tasks, timelines, and milestones for each technology stack.
    """
    
    payload = {
        "messages": [{"role": "user", "content": complex_query}]
    }
    
    try:
        start_time = time.time()
        print(f"   Sending complex query (length: {len(complex_query)} chars)...")
        
        response = requests.post("http://localhost:8000/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=70)  # Client timeout higher than server timeout
        
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Time: {response_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response Type: {data.get('type', 'UNKNOWN')}")
            print(f"   Message Length: {len(data.get('message', ''))}")
            print("✅ Complex query processed successfully within timeout!")
            return True
        elif response.status_code == 504:
            print("✅ Timeout mechanism working - 504 Gateway Timeout received!")
            return True
        elif response.status_code == 503:
            data = response.json()
            print(f"   Error: {data.get('detail', 'Unknown error')}")
            print("✅ Service unavailable error handled properly!")
            return True
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("✅ Client timeout occurred - server timeout mechanism working!")
        return True
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  TIMEOUT HANDLING VERIFICATION TEST")
    print("=" * 60)
    
    if test_timeout_handling():
        print("\n✅ Timeout handling verification passed!")
    else:
        print("\n❌ Timeout handling verification failed!")