#!/bin/bash

# Webhook Setup Script for DodoPayments

echo "=== DodoPayments Webhook Setup ==="
echo ""

# Check if backend is running
if ! curl -s http://localhost:8000/ > /dev/null; then
    echo "❌ Backend is not running on localhost:8000"
    echo "Please start the backend first:"
    echo "  cd backend && python main.py"
    exit 1
fi

echo "✅ Backend is running on localhost:8000"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo "Please install ngrok first:"
    echo "  npm install -g ngrok"
    echo "  # or"
    echo "  brew install ngrok"
    exit 1
fi

echo "✅ ngrok is installed"

# Start ngrok if not already running
if ! pgrep -f "ngrok http 8000" > /dev/null; then
    echo "🚀 Starting ngrok tunnel..."
    ngrok http 8000 > /tmp/ngrok.log 2>&1 &
    NGROK_PID=$!
    echo "Ngrok started with PID: $NGROK_PID"
    
    # Wait for ngrok to start
    sleep 3
    
    # Get the ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data['tunnels'][0]['public_url'])
except:
    print('Could not get ngrok URL')
")
    
    if [ "$NGROK_URL" != "Could not get ngrok URL" ]; then
        echo "✅ Ngrok tunnel created: $NGROK_URL"
        echo ""
        echo "📋 Webhook Configuration:"
        echo "  Webhook URL: $NGROK_URL/webhooks/dodo"
        echo "  Events: payment.succeeded, payment.failed"
        echo "  Secret: whsec_rzPxA8q2BiQ+/caR6O+nAT0zt1eMYueB"
        echo ""
        echo "🔧 Next Steps:"
        echo "  1. Go to DodoPayments Dashboard → Webhooks"
        echo "  2. Add webhook URL: $NGROK_URL/webhooks/dodo"
        echo "  3. Select events: payment.succeeded, payment.failed"
        echo "  4. Use webhook secret: whsec_rzPxA8q2BiQ+/caR6O+nAT0zt1eMYueB"
        echo ""
        echo "🧪 Test webhook:"
        echo "  python test_webhook_simple.py"
        echo ""
        echo "📝 Ngrok logs: tail -f /tmp/ngrok.log"
    else
        echo "❌ Could not start ngrok tunnel"
        echo "Please check ngrok logs: tail -f /tmp/ngrok.log"
        exit 1
    fi
else
    echo "✅ ngrok is already running"
    
    # Get existing ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data['tunnels'][0]['public_url'])
except:
    print('Could not get ngrok URL')
")
    
    if [ "$NGROK_URL" != "Could not get ngrok URL" ]; then
        echo "🌐 Current ngrok URL: $NGROK_URL"
        echo "📋 Webhook URL: $NGROK_URL/webhooks/dodo"
    else
        echo "❌ Could not get ngrok URL"
    fi
fi

echo ""
echo "✅ Setup complete!"
