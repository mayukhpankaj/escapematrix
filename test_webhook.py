#!/usr/bin/env python3

import hmac
import hashlib
import json
import requests
import os

# Webhook test script
def test_webhook():
    # Load environment variables
    webhook_secret = "whsec_UeKs06s18O2+yIGN6ojpaWC9xdIlCZjt"
    webhook_url = "http://localhost:8000/webhooks/dodo"
    
    # Test webhook payload (similar to DodoPayments format)
    test_payload = {
        "business_id": "bus_0NVJ7QUCf6dedcUjZbipS",
        "data": {
            "billing": {
                "city": None,
                "country": "IN",
                "state": None,
                "street": None,
                "zipcode": "560066"
            },
            "brand_id": "bus_0NVJ7QUCf6dedcUjZbipS",
            "business_id": "bus_0NVJ7QUCf6dedcUjZbipS",
            "card_issuing_country": None,
            "card_last_four": None,
            "card_network": None,
            "card_type": None,
            "checkout_session_id": "cks_0NVKZg4Op6bVO2UMS00GW",
            "created_at": "2026-01-01T08:09:09.169565Z",
            "currency": "INR",
            "customer": {
                "customer_id": "cus_0NVKU0dTVZkSLY8M3ClwW",
                "email": "founder@deeptrue.ai",
                "metadata": {},
                "name": "Mayukh",
                "phone_number": "+919024175580"
            },
            "digital_products_delivered": False,
            "discount_id": None,
            "disputes": [],
            "error_code": None,
            "error_message": None,
            "invoice_id": "INV/SAR/00026904",
            "metadata": {
                "email": "founder@deeptrue.ai",
                "firstName": "deeptrue",
                "fullName": "deeptrue AI",
                "lastName": "AI",
                "plan": "1year",
                "userId": "user_37QNJqnLEWP6VFcwXaJxyYJwpIN"
            },
            "payload_type": "Payment",
            "payment_id": "pay_test_payment_123",
            "payment_link": "https://test.checkout.dodopayments.com/M0ETW6ua",
            "payment_method": "upi",
            "payment_method_type": "upi_intent",
            "product_cart": [
                {
                    "product_id": "pdt_0NVKFpzt1jbHkCXW0gbfK",
                    "quantity": 1
                }
            ],
            "refunds": [],
            "settlement_amount": 27609,
            "settlement_currency": "INR",
            "settlement_tax": 4212,
            "status": "succeeded",
            "subscription_id": None,
            "tax": 4212,
            "total_amount": 27609,
            "updated_at": None
        },
        "timestamp": "2026-01-01T08:09:49.727282Z",
        "type": "payment.succeeded"
    }
    
    # Test failed payment payload
    failed_payload = {
        "business_id": "bus_0NVJ7QUCf6dedcUjZbipS",
        "data": {
            "billing": {
                "city": None,
                "country": "IN",
                "state": None,
                "street": None,
                "zipcode": "560066"
            },
            "brand_id": "bus_0NVJ7QUCf6dedcUjZbipS",
            "business_id": "bus_0NVJ7QUCf6dedcUjZbipS",
            "card_issuing_country": None,
            "card_last_four": "1450",
            "card_network": "visa",
            "card_type": "credit",
            "checkout_session_id": "cks_0NVKdE2ukHPZtTTuDXuln",
            "created_at": "2026-01-01T08:27:50.293479Z",
            "currency": "INR",
            "customer": {
                "customer_id": "cus_0NVKU0dTVZkSLY8M3ClwW",
                "email": "founder@deeptrue.ai",
                "metadata": {},
                "name": "Mayukh",
                "phone_number": "+919024175580"
            },
            "digital_products_delivered": False,
            "discount_id": None,
            "disputes": [],
            "error_code": "NETWORK_ERROR",
            "error_message": " There is some temporary issue from the bank side and hence they have denied for this transaction",
            "invoice_id": "inv_0NVKdFeZi4cwO0jwYQkCx",
            "metadata": {
                "email": "founder@deeptrue.ai",
                "firstName": "deeptrue",
                "fullName": "deeptrue AI",
                "lastName": "AI",
                "plan": "1year",
                "userId": "user_37QNJqnLEWP6VFcwXaJxyYJwpIN"
            },
            "payload_type": "Payment",
            "payment_id": "pay_test_payment_456",
            "payment_link": "https://test.checkout.dodopayments.com/BklqaTUE",
            "payment_method": "card",
            "payment_method_type": "credit",
            "product_cart": [
                {
                    "product_id": "pdt_0NVKFpzt1jbHkCXW0gbfK",
                    "quantity": 1
                }
            ],
            "refunds": [],
            "settlement_amount": 27603,
            "settlement_currency": "INR",
            "settlement_tax": 4211,
            "status": "failed",
            "subscription_id": None,
            "tax": 4211,
            "total_amount": 27603,
            "updated_at": None
        },
        "timestamp": "2026-01-01T08:28:56.464838Z",
        "type": "payment.failed"
    }
    
    def send_webhook(payload, webhook_type):
        """Send webhook with proper signature"""
        payload_str = json.dumps(payload, separators=(',', ':'))
        signature = hmac.new(
            webhook_secret.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            'Content-Type': 'application/json',
            'webhook-signature': f'v1,{signature}'
        }
        
        print(f"\n=== Testing {webhook_type} webhook ===")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"Signature: {signature}")
        
        try:
            response = requests.post(webhook_url, json=payload, headers=headers)
            print(f"Response Status: {response.status_code}")
            print(f"Response Body: {response.text}")
            return response.status_code == 200
        except Exception as e:
            print(f"Error sending webhook: {e}")
            return False
    
    # Test both successful and failed webhooks
    success_result = send_webhook(test_payload, "successful payment")
    failed_result = send_webhook(failed_payload, "failed payment")
    
    print(f"\n=== Results ===")
    print(f"Successful webhook test: {'✅ PASSED' if success_result else '❌ FAILED'}")
    print(f"Failed webhook test: {'✅ PASSED' if failed_result else '❌ FAILED'}")

if __name__ == "__main__":
    test_webhook()
