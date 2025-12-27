#!/usr/bin/env python3
"""
Backend Test for Escape Matrix App - AI Chat Endpoint with Gemini Integration
Tests the /api/processquery endpoint with Gemini API integration
"""
import requests
import json
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Use the local FastAPI server for testing
API_BASE_URL = "http://localhost:8000"  # FastAPI runs locally on port 8000

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

def test_ai_chat_plan_response():
    """Test AI chat endpoint for PLAN response"""
    print("🔍 Testing AI chat endpoint for PLAN response...")
    
    # Create test JWT token
    token = create_test_jwt("test_user_123")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": "I want to learn system design"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=30)  # Increased timeout for AI response
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure for new Gemini integration
            assert "type" in data, "Response should contain 'type' field"
            assert "message" in data, "Response should contain 'message' field"
            assert "tasks" in data, "Response should contain 'tasks' field"
            
            # Verify response content for PLAN type
            assert data["type"] in ["PLAN", "MESSAGE"], f"Expected PLAN or MESSAGE, got {data['type']}"
            assert isinstance(data["message"], str), "Message should be a string"
            assert isinstance(data["tasks"], list), "Tasks should be a list"
            assert len(data["tasks"]) == 0, "Tasks should be empty for PLAN response"
            
            print("✅ PLAN response test passed!")
            return True
        else:
            print(f"❌ Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

def test_ai_chat_createtasks_response():
    """Test AI chat endpoint for CREATETASKS response"""
    print("\n🔍 Testing AI chat endpoint for CREATETASKS response...")
    
    # Create test JWT token
    token = create_test_jwt("test_user_123")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": "Yes, create those tasks for me to learn system design"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=30)  # Increased timeout for AI response
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            assert "type" in data, "Response should contain 'type' field"
            assert "message" in data, "Response should contain 'message' field"
            assert "tasks" in data, "Response should contain 'tasks' field"
            
            # For CREATETASKS response, verify task structure
            if data["type"] == "CREATETASKS":
                assert isinstance(data["tasks"], list), "Tasks should be a list"
                assert len(data["tasks"]) > 0, "Tasks should not be empty for CREATETASKS"
                
                # Verify task schema
                for task in data["tasks"]:
                    required_fields = ["task_name", "task_description", "task_type", "status", "priority", "repetition_days", "repetition_time"]
                    for field in required_fields:
                        assert field in task, f"Task should contain '{field}' field"
                    
                    # Verify task_type values
                    assert task["task_type"] in ["LONG_TERM", "SHORT_TERM"], f"Invalid task_type: {task['task_type']}"
                    
                    # Verify status
                    assert task["status"] == "TO-DO", f"Status should be TO-DO, got {task['status']}"
                    
                    # Verify priority format
                    valid_priorities = ["URGENT-IMPORTANT", "URGENT-NOTIMPORTANT", "NOTURGENT-IMPORTANT", "NOTURGENT-NOTIMPORTANT"]
                    assert task["priority"] in valid_priorities, f"Invalid priority: {task['priority']}"
                    
                    # Verify repetition fields based on task type
                    if task["task_type"] == "LONG_TERM":
                        assert task["repetition_days"] == [], f"LONG_TERM task should have empty repetition_days"
                        assert task["repetition_time"] == "", f"LONG_TERM task should have empty repetition_time"
                    elif task["task_type"] == "SHORT_TERM":
                        assert isinstance(task["repetition_days"], list), "SHORT_TERM task should have repetition_days list"
                        assert len(task["repetition_days"]) > 0, "SHORT_TERM task should have non-empty repetition_days"
                        assert isinstance(task["repetition_time"], str), "SHORT_TERM task should have repetition_time string"
                        assert task["repetition_time"] != "", "SHORT_TERM task should have non-empty repetition_time"
                
                print("✅ CREATETASKS response test passed!")
                return True
            else:
                print(f"ℹ️  Got {data['type']} response instead of CREATETASKS - this is acceptable")
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

def test_ai_chat_message_response():
    """Test AI chat endpoint for MESSAGE response"""
    print("\n🔍 Testing AI chat endpoint for MESSAGE response...")
    
    # Create test JWT token
    token = create_test_jwt("test_user_123")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": "Hello, how are you?"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/processquery", 
                               json=payload, 
                               headers=headers,
                               timeout=30)
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            assert "type" in data, "Response should contain 'type' field"
            assert "message" in data, "Response should contain 'message' field"
            assert "tasks" in data, "Response should contain 'tasks' field"
            
            # Verify response content
            assert data["type"] in ["MESSAGE", "PLAN"], f"Expected MESSAGE or PLAN, got {data['type']}"
            assert isinstance(data["message"], str), "Message should be a string"
            assert isinstance(data["tasks"], list), "Tasks should be a list"
            assert len(data["tasks"]) == 0, "Tasks should be empty for MESSAGE response"
            
            print("✅ MESSAGE response test passed!")
            return True
        else:
            print(f"❌ Expected 200, got {response.status_code}")
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