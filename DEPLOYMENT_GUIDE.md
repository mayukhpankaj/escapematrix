# Deployment Guide - Escape Matrix

This guide covers deploying the Escape Matrix application with separate frontend and backend deployments.

## Architecture

- **Frontend**: Next.js application deployed on Vercel
- **Backend**: FastAPI application deployed on Railway.app
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Payment**: Dodo Payments

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository with the frontend code

### Steps

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the root directory (contains `package.json`)

2. **Configure Environment Variables**
   In Vercel dashboard → Settings → Environment Variables, add:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-railway-app-url.up.railway.app
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Deploy**
   - Vercel will automatically build and deploy
   - Your app will be available at `https://your-app-name.vercel.app`

### Vercel Configuration
The `vercel.json` file handles:
- Build command: `npm run build`
- Framework detection: Next.js
- Environment variable mapping

## Backend Deployment (Railway.app)

### Prerequisites
- Railway.app account
- GitHub repository with the backend code

### Steps

1. **Connect Repository to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `/backend` directory as the root

2. **Configure Environment Variables**
   In Railway dashboard → Settings → Variables, add:
   ```
   DODO_WEBHOOK_SECRET=whsec_your_webhook_secret
   DODO_PRODUCT_ID=pdt_your_product_id
   DODO_WEBHOOK_URL=https://your-railway-app-url.up.railway.app
   
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   CLERK_PEM_PUBLIC_KEY=your_clerk_public_key
   CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
   
   GEMINI_API_KEY=your_gemini_api_key
   
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

3. **Deploy**
   - Railway will automatically build and deploy
   - Your API will be available at `https://your-app-name.up.railway.app`

### Railway Configuration
The backend is now Dockerized for Railway.app deployment:

**Files:**
- `Dockerfile`: Multi-stage build with Python 3.11 slim base
- `railway.json`: Configures Railway to use Dockerfile builder
- `.dockerignore`: Optimizes build context by excluding unnecessary files

**Docker Features:**
- Non-root user for security
- Health check endpoint (`/health`)
- Optimized layer caching
- Production-ready configuration

**Deployment Process:**
- Railway automatically builds the Docker image
- Runs the container with exposed port 8000
- Health checks ensure service availability

## Post-Deployment Configuration

### 1. Update CORS Settings
After deploying both frontend and backend:

1. Get your Railway URL (e.g., `https://your-app.up.railway.app`)
2. Get your Vercel URL (e.g., `https://your-app.vercel.app`)
3. Update environment variables:

   **In Railway:**
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```

   **In Vercel:**
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-app.up.railway.app
   ```

### 2. Update Webhook URLs
Update payment provider webhooks to point to your Railway URL:
```
https://your-app.up.railway.app/webhooks/payment
```

### 3. Update Clerk Configuration
In Clerk dashboard:
- Add your Vercel URL to "Allowed origins"
- Add your Railway URL to "Allowed origins" for backend API calls

## Local Development

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Files Reference

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # Development
NEXT_PUBLIC_BACKEND_URL=https://your-railway-app-url.up.railway.app  # Production
```

### Backend (.env)
```env
# Development
FRONTEND_URL=http://localhost:3000

# Production
FRONTEND_URL=https://your-vercel-app.vercel.app
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` in Railway matches your Vercel URL exactly
   - Check that the URL includes `https://` and no trailing slash

2. **API Connection Issues**
   - Verify `NEXT_PUBLIC_BACKEND_URL` in Vercel matches your Railway URL
   - Check that Railway deployment is healthy (green status)

3. **Environment Variables Not Loading**
   - Ensure variable names match exactly (case-sensitive)
   - Restart deployments after adding variables

4. **Build Failures**
   - Check Railway logs for Docker build issues
   - Verify Dockerfile syntax and dependencies
   - Ensure all required environment variables are set

5. **Docker-Specific Issues**
   - Container fails to start: Check health check endpoint `/health`
   - Port conflicts: Railway automatically assigns ports, ensure app uses `$PORT`
   - Permission errors: Docker runs as non-root user, check file permissions

### Health Checks

- Frontend: Visit your Vercel URL
- Backend: Visit `https://your-railway-url.up.railway.app/health`
- API Docs: Visit `https://your-railway-url.up.railway.app/docs`

## Monitoring

### Vercel
- View build logs in Vercel dashboard
- Monitor function execution and performance

### Railway
- View deployment logs in Railway dashboard
- Monitor resource usage and response times
- Set up alerts for downtime

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files to Git
   - Use Railway's encrypted variable storage
   - Rotate API keys regularly

2. **CORS Configuration**
   - Only allow your specific frontend domain
   - Avoid wildcard origins in production

3. **API Security**
   - Ensure Clerk authentication is properly configured
   - Validate webhook signatures
   - Use HTTPS for all API calls

## Deployment Commands

### Redeploy Frontend
```bash
git push origin main  # Triggers Vercel auto-deploy
```

### Redeploy Backend
```bash
git push origin main  # Triggers Railway auto-deploy
```

### Manual Triggers
- Vercel: Dashboard → Deployments → Redeploy
- Railway: Dashboard → Settings → Restart Service
