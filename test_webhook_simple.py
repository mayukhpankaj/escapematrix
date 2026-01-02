#!/usr/bin/env python3

import json
import requests

def test_webhook_no_signature():
    """Test webhook without signature verification"""
    webhook_url = "http://localhost:8000/webhooks/dodo"
    
    # Test webhook payload
    test_payload = {
        "business_id": "bus_0NVJ7QUCf6dedcUjZbipS",
        "data": {
            "metadata": {
                "userId": "user_test_123",
                "email": "test@example.com",
                "fullName": "Test User"
            },
            "customer": {
                "email": "test@example.com",
                "name": "Test User",
                "phone_number": "+1234567890"
            },
            "payment_id": "pay_test_123",
            "payment_method": "test",
            "total_amount": 100,
            "currency": "INR",
            "status": "succeeded",
            "product_cart": [
                {
                    "product_id": "pdt_0NVKFpzt1jbHkCXW0gbfK",
                    "quantity": 1
                }
            ]
        },
        "type": "payment.succeeded"
    }
    
    print("=== Testing webhook without signature ===")
    print(f"Payload: {json.dumps(test_payload, indent=2)}")
    
    try:
        response = requests.post(webhook_url, json=test_payload)
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error sending webhook: {e}")
        return False

if __name__ == "__main__":
    test_webhook_no_signature()
