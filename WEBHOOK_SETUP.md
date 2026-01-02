# DodoPayments Webhook Setup

## 1. Local Development Setup

### Install ngrok for local testing:
```bash
npm install -g ngrok
# or
brew install ngrok
```

### Start your backend:
```bash
cd backend
python main.py
```

### Start ngrok (in new terminal):
```bash
ngrok http 8000
```

### Copy the ngrok URL and configure in DodoPayments dashboard:
- Go to DodoPayments Dashboard → Webhooks
- Add webhook URL: `https://your-ngrok-url.ngrok.io/webhooks/dodo`
- Select events: `payment.completed`, `payment.failed`
- Use webhook secret: `whsec_MGvIckoTy49do+Dts48apq40ouE4oAjl`

## 2. Production Setup

### Update backend/main.py:
```python
WEBHOOK_URL = "https://yourdomain.com/webhooks/dodo"  # Replace with your actual domain
```

### Configure in DodoPayments Dashboard:
- Webhook URL: `https://yourdomain.com/webhooks/dodo`
- Events: `payment.completed`, `payment.failed`
- Secret: `whsec_MGvIckoTy49do+Dts48apq40ouE4oAjl`

## 3. Test the Flow

1. Start frontend: `npm run dev`
2. Start backend: `python main.py`
3. Start ngrok: `ngrok http 8000`
4. Visit `/pro` and test payment
5. Check webhook logs in backend console

## 4. Environment Variables

### Frontend (.env.local):
```
DODO_API_KEY=pb-WxcfkgArjmCfA.lDXDOgy4ln-i8orr75cF0DYIw1MBwf2KESa8UprcZSaQjg67
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend (.env):
```
DODO_WEBHOOK_SECRET=whsec_MGvIckoTy49do+Dts48apq40ouE4oAjl
```

## 5. Webhook Events Handled

- `payment.completed`: Grants lifetime access to user
- `payment.failed`: Logs failure (can add notifications here)
