# Google Cloud Deployment Setup - Backend Only

This setup deploys only the FastAPI backend to Google Cloud Run using GitHub repository integration.

## Files Created

### 1. `backend/Dockerfile`
- Simple, clean Dockerfile for FastAPI backend only
- Uses Python 3.11 slim base
- Port 8080 for Cloud Run compatibility
- Health check endpoint included

### 2. `.github/workflows/deploy-gcp.yml`
- GitHub Actions workflow for automatic deployment
- Triggers on pushes to main branch (backend changes only)
- Builds Docker image and deploys to Cloud Run
- Handles all environment variables securely

### 3. `backend/cloudbuild.yaml`
- Cloud Build configuration for manual triggers
- Alternative deployment method
- Builds and deploys backend-only container

## Setup Instructions

### Method 1: GitHub Actions (Recommended)

#### 1. Set up Google Cloud Service Account
```bash
# Create service account
gcloud iam service-accounts create escapematrix-deployer \
    --display-name="Escape Matrix Deployer" \
    --project=YOUR_PROJECT_ID

# Grant required roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:escapematrix-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:escapematrix-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:escapematrix-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Create and download service account key
gcloud iam service-accounts keys create ~/escapematrix-key.json \
    --iam-account=escapematrix-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### 2. Configure GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
```
GCP_CREDENTIALS: [Paste the entire contents of escapematrix-key.json]
GCP_PROJECT_ID: your-gcp-project-id
GCP_REGION: us-central1 (or your preferred region)
FRONTEND_URL: https://your-vercel-app.vercel.app
SUPABASE_URL: https://your-project.supabase.co
SUPABASE_ANON_KEY: your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY: your_supabase_service_role_key
CLERK_PEM_PUBLIC_KEY: your_clerk_public_key
CLERK_SECRET_KEY: sk_test_your_clerk_secret_key
DODO_WEBHOOK_SECRET: whsec_your_webhook_secret
DODO_PRODUCT_ID: pdt_your_product_id
DODO_WEBHOOK_URL: https://your-service-url.run.app
GEMINI_API_KEY: your_gemini_api_key
```

#### 3. Enable Required APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### 4. Deploy
Push your code to GitHub:
```bash
git add .
git commit -m "Setup GCP deployment"
git push origin main
```

The GitHub Action will automatically deploy your backend!

### Method 2: Cloud Build Triggers

#### 1. Create Cloud Build Trigger
1. Go to Google Cloud Console → Cloud Build → Triggers
2. Click "Create Trigger"
3. Connect your GitHub repository
4. Select the main branch
5. Set trigger configuration:
   - Name: `deploy-backend`
   - Event: Push to branch
   - Branch: `main`
   - Build configuration: `Cloud Build configuration file (yaml or json)`
   - Cloud Build configuration file location: `backend/cloudbuild.yaml`
   - Substitution: No substitutions needed
6. Click "Create Trigger"

#### 2. Set Environment Variables
In Cloud Run service after first deployment:
```bash
gcloud run services update escapematrix-backend \
    --region us-central1 \
    --set-env-vars "FRONTEND_URL=https://your-vercel-app.vercel.app"
    --set-env-vars "SUPABASE_URL=https://your-project.supabase.co"
    --set-env-vars "SUPABASE_ANON_KEY=your_anon_key"
    --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=your_service_key"
    --set-env-vars "CLERK_PEM_PUBLIC_KEY=your_clerk_public_key"
    --set-env-vars "CLERK_SECRET_KEY=sk_test_your_clerk_secret_key"
    --set-env-vars "DODO_WEBHOOK_SECRET=whsec_your_webhook_secret"
    --set-env-vars "DODO_PRODUCT_ID=pdt_your_product_id"
    --set-env-vars "DODO_WEBHOOK_URL=https://your-service-url.run.app"
    --set-env-vars "GEMINI_API_KEY=your_gemini_api_key"
```

## What Gets Deployed

✅ **FastAPI Backend Only**:
- Python 3.11 with FastAPI
- All API endpoints from `main.py`
- Health check at `/health`
- API docs at `/docs`
- Port 8080 (Cloud Run standard)

❌ **No Frontend**:
- No Next.js build
- No npm dependencies
- Frontend stays on Vercel

## Post-Deployment

### 1. Get Service URL
```bash
gcloud run services describe escapematrix-backend \
    --region us-central1 \
    --format 'value(status.url)'
```

### 2. Update Frontend
Update your Vercel environment variables:
```
NEXT_PUBLIC_BACKEND_URL=https://your-service-url.run.app
```

### 3. Test Deployment
```bash
# Test health endpoint
curl https://your-service-url.run.app/health

# Test API docs
curl https://your-service-url.run.app/docs
```

## Monitoring

### GitHub Actions
- Go to your repository → Actions tab
- View deployment logs and status
- Automatic notifications on success/failure

### Google Cloud Console
- Cloud Run → Services → `escapematrix-backend`
- Cloud Build → History → View build logs
- Logging → Log Explorer → Filter by Cloud Run

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check service account roles
   - Verify GitHub secrets are correct

2. **Build Failures**
   - Check GitHub Actions logs
   - Verify Dockerfile syntax
   - Ensure requirements.txt is valid

3. **Deployment Failures**
   - Check Cloud Build logs
   - Verify region settings
   - Check environment variables

### Debug Commands

```bash
# Check service status
gcloud run services describe escapematrix-backend --region us-central1

# View recent logs
gcloud logs read "resource.type=cloud_run_revision" --limit 20

# Test locally
cd backend
docker build -t test-app .
docker run -p 8080:8080 test-app
```

## Cost Optimization

- **Free Tier**: 2 million requests/month
- **Scaling**: 0 to 100 instances
- **Memory**: 512Mi (adjust as needed)
- **CPU**: 1 vCPU
- **Timeout**: 300s

## Security

- Service account with minimal required permissions
- Environment variables stored in GitHub secrets
- Non-root Docker user
- HTTPS-only Cloud Run endpoints

## Benefits

✅ **Automatic Deployment**: Push to deploy
✅ **Backend Only**: No frontend build issues
✅ **Secure**: Proper IAM and secrets management
✅ **Scalable**: Auto-scaling Cloud Run
✅ **Cost Effective**: Free tier available
✅ **Monitoring**: Built-in logging and metrics
