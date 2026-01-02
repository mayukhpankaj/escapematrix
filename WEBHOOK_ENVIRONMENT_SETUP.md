# Environment-based Webhook Configuration

## Development vs Production Setup

### Development Mode (Default)
- Uses ngrok tunnel for local testing
- Webhook URL: `https://[ngrok-id].ngrok-free.app/webhooks/dodo`
- Automatically starts ngrok if not running
- Ideal for local development and testing

### Production Mode
- Uses hosted backend webhook URL
- Webhook URL: `https://yourdomain.com/webhooks/dodo`
- No ngrok required
- For deployed production environments

## Environment Variables

### Development (.env)
```bash
ENVIRONMENT=development
DODO_WEBHOOK_URL=http://localhost:8000/webhooks/dodo  # Optional, will be overridden by ngrok
DODO_WEBHOOK_SECRET=whsec_rzPxA8q2BiQ+/caR6O+nAT0zt1eMYueB
```

### Production (.env)
```bash
ENVIRONMENT=production
DODO_WEBHOOK_URL=https://yourdomain.com/webhooks/dodo
DODO_WEBHOOK_SECRET=whsec_rzPxA8q2BiQ+/caR6O+nAT0zt1eMYueB
```

## Setup Commands

### Development Setup
```bash
# Auto-detects development mode and sets up ngrok
./setup_webhook_env.sh

# Or explicitly set environment
ENVIRONMENT=development ./setup_webhook_env.sh
```

### Production Setup
```bash
# Set production environment
ENVIRONMENT=production ./setup_webhook_env.sh
```

## Code Implementation

### Backend Configuration (main.py)
```python
# Environment-based webhook configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"

if IS_PRODUCTION:
    # Production webhook URL - hosted backend
    WEBHOOK_URL = os.getenv("DODO_WEBHOOK_URL", "https://yourdomain.com/webhooks/dodo")
    logger.info(f"🚀 Production mode - Webhook URL: {WEBHOOK_URL}")
else:
    # Development mode - will use ngrok
    WEBHOOK_URL = os.getenv("DODO_WEBHOOK_URL", "http://localhost:8000/webhooks/dodo")
    logger.info(f"🧪 Development mode - Webhook URL: {WEBHOOK_URL}")
```

### Frontend Configuration (route.ts)
```typescript
// Environment-based configuration
const ENVIRONMENT = process.env.NODE_ENV || "development";
const IS_PRODUCTION = ENVIRONMENT === "production";

const getWebhookUrl = () => {
  if (IS_PRODUCTION) {
    return process.env.DODO_WEBHOOK_URL || "https://yourdomain.com/webhooks/dodo";
  } else {
    return process.env.DODO_WEBHOOK_URL || "http://localhost:8000/webhooks/dodo";
  }
};
```

## How It Works

1. **Development Mode**:
   - Script automatically detects development environment
   - Starts ngrok tunnel if not running
   - Provides ngrok URL for DodoPayments webhook configuration
   - Uses local backend (localhost:8000) for webhook processing

2. **Production Mode**:
   - Script detects production environment
   - Uses configured production webhook URL
   - No ngrok required
   - Uses hosted backend for webhook processing

## Testing

### Development Testing
```bash
# Test webhook locally
python test_webhook_simple.py

# Monitor ngrok logs
tail -f /tmp/ngrok.log
```

### Production Testing
```bash
# Test webhook against production URL
python test_webhook_simple.py

# Check backend logs for webhook processing
```

## Switching Environments

### To switch to production:
1. Set `ENVIRONMENT=production` in your backend `.env` file
2. Update `DODO_WEBHOOK_URL` to your production backend URL
3. Run `ENVIRONMENT=production ./setup_webhook_env.sh`
4. Update DodoPayments dashboard with production webhook URL

### To switch to development:
1. Set `ENVIRONMENT=development` in your backend `.env` file
2. Run `./setup_webhook_env.sh` (or `ENVIRONMENT=development ./setup_webhook_env.sh`)
3. Update DodoPayments dashboard with ngrok webhook URL

## Security Notes

- **Development**: ngrok provides HTTPS but tunnel is public
- **Production**: Use your domain's SSL certificate
- **Webhook Secret**: Same secret works in both environments
- **Firewall**: Ensure production backend allows webhook requests from DodoPayments
