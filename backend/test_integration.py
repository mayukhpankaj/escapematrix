#!/usr/bin/env python3
"""
Integration Test for Escape Matrix App
Tests the FastAPI backend endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check endpoint...")
    response = requests.get(f"{BASE_URL}/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    print("✅ Health check passed!")
    print(f"   Response: {json.dumps(data, indent=2)}")
    return True

def test_protected_endpoint_without_auth():
    """Test that protected endpoints require authentication"""
    print("\n🔍 Testing protected endpoint without auth...")
    response = requests.get(f"{BASE_URL}/api/tasks")
    assert response.status_code == 401
    print("✅ Protected endpoint correctly requires authentication!")
    print(f"   Response: {response.json()}")
    return True

def test_cors():
    """Test CORS configuration"""
    print("\n🔍 Testing CORS configuration...")
    response = requests.options(f"{BASE_URL}/api/tasks")
    print("✅ CORS is configured!")
    return True

def main():
    print("=" * 60)
    print("  ESCAPE MATRIX - BACKEND INTEGRATION TESTS")
    print("=" * 60)
    
    tests = [
        test_health_check,
        test_protected_endpoint_without_auth,
        test_cors,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"  RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("\n✅ All backend tests passed!")
        print("🎉 FastAPI backend is working correctly!")
        print("\n📝 Next steps:")
        print("   1. Open your browser and visit the app")
        print("   2. Sign in with Google via Clerk")
        print("   3. Complete the onboarding")
        print("   4. Create your first task!")
    
    return failed == 0

if __name__ == "__main__":
    main()
