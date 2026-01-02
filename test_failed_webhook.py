#!/usr/bin/env python3

import json
import requests

def test_failed_webhook():
    """Test failed payment webhook"""
    webhook_url = "http://localhost:8000/webhooks/dodo"
    
    # Test failed payment payload
    failed_payload = {
        "business_id": "bus_0NVJ7QUCf6dedcUjZbipS",
        "data": {
            "metadata": {
                "userId": "user_test_456",
                "email": "failed@example.com",
                "fullName": "Failed User"
            },
            "customer": {
                "email": "failed@example.com",
                "name": "Failed User",
                "phone_number": "+1234567890"
            },
            "payment_id": "pay_test_456",
            "payment_method": "card",
            "total_amount": 100,
            "currency": "INR",
            "status": "failed",
            "error_code": "NETWORK_ERROR",
            "error_message": "Test error message",
            "product_cart": [
                {
                    "product_id": "pdt_0NVKFpzt1jbHkCXW0gbfK",
                    "quantity": 1
                }
            ]
        },
        "type": "payment.failed"
    }
    
    print("=== Testing failed payment webhook ===")
    print(f"Payload: {json.dumps(failed_payload, indent=2)}")
    
    try:
        response = requests.post(webhook_url, json=failed_payload)
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error sending webhook: {e}")
        return False

if __name__ == "__main__":
    test_failed_webhook()
