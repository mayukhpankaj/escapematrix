#!/usr/bin/env python3
"""
Backend Test for Escape Matrix App - AI Chat Endpoint
Tests the /api/processquery endpoint with various scenarios
"""
import requests
import json
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Use the production URL from environment
BASE_URL = os.getenv("NEXT_PUBLIC_BASE_URL", "https://escapematrix.preview.emergentagent.com")
API_BASE_URL = f"{BASE_URL}:8000"  # FastAPI runs on port 8000

def create_test_jwt(user_id="test_user_123"):
    """Create a test JWT token for authentication"""
    payload = {
        "sub": user_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    # Create unsigned JWT for development testing
    token = jwt.encode(payload, "secret", algorithm="HS256")
    return token

def test_ai_chat_valid_request():
    """Test AI chat endpoint with valid request"""
    print("🔍 Testing AI chat endpoint with valid request...")
    
    # Create test JWT token
    token = create_test_jwt("test_user_123")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": "How can I improve my productivity?"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=10)
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            assert "response" in data, "Response should contain 'response' field"
            assert "query" in data, "Response should contain 'query' field"
            assert "user_id" in data, "Response should contain 'user_id' field"
            
            # Verify response content
            assert data["query"] == payload["query"], "Query should match input"
            assert data["user_id"] == "test_user_123", "User ID should match token"
            assert "placeholder response" in data["response"].lower(), "Should contain placeholder text"
            
            print("✅ Valid request test passed!")
            return True
        else:
            print(f"❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

def test_ai_chat_no_auth_header():
    """Test AI chat endpoint without Authorization header"""
    print("\n🔍 Testing AI chat endpoint without Authorization header...")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": "Test query"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=10)
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 401:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            assert "Authorization header missing" in data.get("detail", ""), "Should indicate missing auth header"
            print("✅ No auth header test passed!")
            return True
        else:
            print(f"❌ Expected 401, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

def test_ai_chat_invalid_jwt():
    """Test AI chat endpoint with invalid JWT token"""
    print("\n🔍 Testing AI chat endpoint with invalid JWT token...")
    
    headers = {
        "Authorization": "Bearer invalid_token_here",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": "Test query"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=10)
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 401:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            print("✅ Invalid JWT test passed!")
            return True
        else:
            print(f"❌ Expected 401, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

def test_ai_chat_missing_query():
    """Test AI chat endpoint without query field"""
    print("\n🔍 Testing AI chat endpoint without query field...")
    
    token = create_test_jwt("test_user_123")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {}  # Missing query field
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=10)
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            assert "Query is required" in data.get("detail", ""), "Should indicate missing query"
            print("✅ Missing query test passed!")
            return True
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

def test_ai_chat_empty_query():
    """Test AI chat endpoint with empty query string"""
    print("\n🔍 Testing AI chat endpoint with empty query string...")
    
    token = create_test_jwt("test_user_123")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": ""  # Empty query
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=10)
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            assert "Query is required" in data.get("detail", ""), "Should indicate empty query"
            print("✅ Empty query test passed!")
            return True
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

def test_health_check():
    """Test the health check endpoint to ensure server is running"""
    print("\n🔍 Testing health check endpoint...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            print("✅ Health check passed!")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Health check failed with exception: {e}")
        return False

def main():
    print("=" * 70)
    print("  ESCAPE MATRIX - AI CHAT ENDPOINT TESTS")
    print("=" * 70)
    print(f"Testing API at: {API_BASE_URL}")
    
    tests = [
        test_health_check,
        test_ai_chat_valid_request,
        test_ai_chat_no_auth_header,
        test_ai_chat_invalid_jwt,
        test_ai_chat_missing_query,
        test_ai_chat_empty_query,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            failed += 1
    
    print("\n" + "=" * 70)
    print(f"  RESULTS: {passed} passed, {failed} failed")
    print("=" * 70)
    
    if failed == 0:
        print("\n✅ All AI Chat endpoint tests passed!")
        print("🎉 The /api/processquery endpoint is working correctly!")
        print("\n📝 Test Summary:")
        print("   ✅ Valid requests return placeholder response")
        print("   ✅ Authentication is properly enforced")
        print("   ✅ Input validation works correctly")
        print("   ✅ Error handling is appropriate")
    else:
        print(f"\n❌ {failed} test(s) failed!")
        print("🔧 Please check the endpoint implementation")
    
    return failed == 0

if __name__ == "__main__":
    main()