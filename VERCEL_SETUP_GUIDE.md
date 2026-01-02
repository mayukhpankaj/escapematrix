# Vercel Setup Guide - Escape Matrix Frontend

## Backend URL
✅ **Backend deployed successfully**: `https://escapematrixapp-476326688061.asia-south1.run.app`

## 1. Vercel Environment Variables

Go to your Vercel dashboard → Project → Settings → Environment Variables and add:

```
NEXT_PUBLIC_BACKEND_URL=https://escapematrixapp-476326688061.asia-south1.run.app
NEXT_PUBLIC_SUPABASE_URL=https://bqwkekylncfqzyiltqgj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxd2tla3lsbmNmcXp5aWx0cWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MjU5NTksImV4cCI6MjA4MjQwMTk1OX0.TFq8zDMZ-OOyLt_Uvcj2ZG2bgvYjuojrEPz5hqTpBIs
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_KEY_HERE
```

## 2. Webhook URLs Configuration

### For Payment Providers (DodoPayments)

**Webhook URL**: `https://escapematrixapp-476326688061.asia-south1.run.app/webhooks/dodo`

### For Clerk Authentication

**Allowed Origins** in Clerk dashboard:
- `https://your-vercel-app.vercel.app` (your frontend URL)
- `http://localhost:3000` (for development)

## 3. Vercel Deployment Steps

### Option 1: Connect to GitHub (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. Add environment variables above
6. Click "Deploy"

### Option 2: Manual Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel --prod
```

## 4. Post-Deployment Configuration

### Update Backend CORS
Your backend needs to know the frontend URL:

```bash
# Update Cloud Run service with frontend URL
gcloud run services update escapematrixapp \
    --region asia-south1 \
    --set-env-vars "FRONTEND_URL=https://your-vercel-app.vercel.app"
```

### Test Integration
```bash
# Test frontend → backend connection
curl https://your-vercel-app.vercel.app/api/health

# Test webhook endpoint
curl https://escapematrixapp-476326688061.asia-south1.run.app/webhooks/dodo
```

## 5. Required Environment Variables for Backend

Update your Cloud Run service with these environment variables:

```bash
gcloud run services update escapematrixapp \
    --region asia-south1 \
    --set-env-vars "FRONTEND_URL=https://your-vercel-app.vercel.app" \
    --set-env-vars "SUPABASE_URL=https://bqwkekylncfqzyiltqgj.supabase.co" \
    --set-env-vars "SUPABASE_ANON_KEY=your_anon_key" \
    --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=your_service_key" \
    --set-env-vars "CLERK_PEM_PUBLIC_KEY=your_clerk_public_key" \
    --set-env-vars "CLERK_SECRET_KEY=sk_test_your_clerk_secret_key" \
    --set-env-vars "DODO_WEBHOOK_SECRET=whsec_your_webhook_secret" \
    --set-env-vars "DODO_PRODUCT_ID=pdt_your_product_id" \
    --set-env-vars "DODO_WEBHOOK_URL=https://escapematrixapp-476326688061.asia-south1.run.app" \
    --set-env-vars "GEMINI_API_KEY=your_gemini_api_key"
```

## 6. Webhook Setup Details

### DodoPayments Webhook
1. Go to DodoPayments dashboard
2. Find your product
3. Set webhook URL: `https://escapematrixapp-476326688061.asia-south1.run.app/webhooks/dodo`
4. Set webhook secret: Use the same value as `DODO_WEBHOOK_SECRET`

### Clerk Webhooks (if needed)
1. Go to Clerk dashboard
2. Add endpoint: `https://escapematrixapp-476326688061.asia-south1.run.app/webhooks/clerk`

## 7. Testing Checklist

- [ ] Frontend deployed on Vercel
- [ ] Backend accessible at GCP URL
- [ ] API endpoints working from frontend
- [ ] Webhook endpoints accessible
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Payment webhooks configured

## 8. URLs Summary

**Frontend**: `https://your-app-name.vercel.app`
**Backend**: `https://escapematrixapp-476326688061.asia-south1.run.app`
**Webhook**: `https://escapematrixapp-476326688061.asia-south1.run.app/webhooks/dodo`

## 9. Troubleshooting

### CORS Issues
If you get CORS errors, update the backend:
```bash
gcloud run services update escapematrixapp \
    --region asia-south1 \
    --set-env-vars "FRONTEND_URL=https://your-actual-vercel-url.vercel.app"
```

### API Connection Issues
Check that `NEXT_PUBLIC_BACKEND_URL` is set correctly in Vercel.

### Webhook Issues
Verify webhook URL is accessible and secret matches.
