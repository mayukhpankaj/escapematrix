#!/bin/bash

# Webhook Setup Script for Render Deployment
# Run this after your backend is deployed to get the actual webhook URL

echo "🔧 Setting up webhook configuration..."

# Get the deployed service URL (you'll need to replace this with your actual URL)
DEPLOYED_URL="https://your-app-name.onrender.com"

# Check if service is running
echo "📡 Checking if service is accessible..."
if curl -f -s "$DEPLOYED_URL/health" > /dev/null; then
    echo "✅ Service is running at $DEPLOYED_URL"
else
    echo "❌ Service is not accessible at $DEPLOYED_URL"
    echo "Please update the DEPLOYED_URL variable with your actual Render URL"
    exit 1
fi

# Webhook endpoint
WEBHOOK_URL="$DEPLOYED_URL/webhooks/dodo"

echo "🪝 Your webhook URL is: $WEBHOOK_URL"
echo ""
echo "📝 Next steps:"
echo "1. Copy this webhook URL"
echo "2. Go to your DodoPayments dashboard"
echo "3. Update your webhook configuration to use: $WEBHOOK_URL"
echo "4. Test the webhook endpoint: curl -X POST $WEBHOOK_URL"
echo ""
echo "🔐 Don't forget to set the WEBHOOK_SECRET in your Render environment variables!"
echo "You can find it in your Render dashboard → Service → Environment"
