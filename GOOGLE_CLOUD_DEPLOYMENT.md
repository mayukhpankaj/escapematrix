# Google Cloud Deployment Guide - Escape Matrix Backend

This guide covers deploying the Escape Matrix backend on Google Cloud Platform using Cloud Run.

## Prerequisites

- Google Cloud Platform account with Pro tier
- gcloud CLI installed and configured
- Project created in Google Cloud Console
- Billing enabled for the project

## Setup

### 1. Install and Configure gcloud CLI

```bash
# Install gcloud CLI (if not already installed)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize gcloud
gcloud init

# Login to your Google account
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Deployment Options

### Option 1: Cloud Run (Recommended)

Cloud Run is serverless and scales automatically.

#### Quick Deployment

```bash
cd backend

# Make the deployment script executable
chmod +x deploy-gcp.sh

# Update the PROJECT_ID in deploy-gcp.sh
nano deploy-gcp.sh

# Run the deployment
./deploy-gcp.sh
```

#### Manual Deployment

```bash
# Build and push Docker image
gcloud builds submit --tag gcr.io/PROJECT_ID/escapematrix-backend:latest .

# Deploy to Cloud Run
gcloud run deploy escapematrix-backend \
    --image gcr.io/PROJECT_ID/escapematrix-backend:latest \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300
```

### Option 2: App Engine

Alternative deployment using App Engine.

```bash
cd backend

# Deploy to App Engine
gcloud app deploy

# Or use flexible environment
gcloud app deploy --flexible
```

## Configuration Files

### Dockerfile.gcp
- Optimized for Cloud Run
- Uses Python 3.11 slim base
- Port 8080 (Cloud Run standard)
- Health checks included

### cloudbuild.yaml
- Automated build and deployment pipeline
- Triggers on git push
- Builds Docker image and deploys to Cloud Run

### deploy-gcp.sh
- Automated deployment script
- Enables required APIs
- Builds and deploys in one command
- Tests deployment health

### app.yaml
- App Engine configuration
- Automatic scaling settings
- Resource limits

## Environment Variables

Set these in Cloud Run console or during deployment:

```bash
# Required environment variables
gcloud run services update escapematrix-backend \
    --region us-central1 \
    --set-env-vars "DODO_WEBHOOK_SECRET=your_secret"
    --set-env-vars "DODO_PRODUCT_ID=your_product_id"
    --set-env-vars "DODO_WEBHOOK_URL=https://your-service-url.run.app"
    --set-env-vars "SUPABASE_URL=https://your-project.supabase.co"
    --set-env-vars "SUPABASE_ANON_KEY=your_anon_key"
    --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=your_service_key"
    --set-env-vars "CLERK_PEM_PUBLIC_KEY=your_clerk_public_key"
    --set-env-vars "CLERK_SECRET_KEY=your_clerk_secret_key"
    --set-env-vars "GEMINI_API_KEY=your_gemini_key"
    --set-env-vars "FRONTEND_URL=https://your-vercel-app.vercel.app"
```

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

## CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy-gcp.yml`:

```yaml
name: Deploy to Google Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Google Auth
      id: 'auth'
      uses: 'google-github-actions/auth@v1'
      with:
        credentials_json: '${{ secrets.GCP_CREDENTIALS }}'

    - name: Deploy to Cloud Run
      uses: 'google-github-actions/deploy-cloudrun@v1'
      with:
        service: 'escapematrix-backend'
        region: 'us-central1'
        image: 'gcr.io/${{ secrets.GCP_PROJECT_ID }}/escapematrix-backend:${{ github.sha }}'
```

### Cloud Build Triggers

1. Go to Google Cloud Console → Cloud Build → Triggers
2. Connect your GitHub repository
3. Create trigger for the main branch
4. Use the provided `cloudbuild.yaml`

## Monitoring

### Cloud Logging

```bash
# View logs
gcloud logs read "resource.type=cloud_run_revision" \
    --limit 50 \
    --format "table(timestamp,textPayload)"

# Stream logs
gcloud logs tail "resource.type=cloud_run_revision"
```

### Cloud Monitoring

- Set up alerts in Cloud Monitoring
- Monitor response times and error rates
- Track resource usage

## Cost Optimization

### Cloud Run Pricing

- Pay per request (minimum 100ms)
- $0.40 per million requests
- $0.000024 per GB-second
- Free tier: 2 million requests/month

### Optimization Tips

1. **Set minimum instances to 0** for cost savings
2. **Use appropriate memory limits** (512Mi is usually sufficient)
3. **Enable request logging** only when needed
4. **Set appropriate timeout values** (300s max)

## Security

### IAM Roles

Required roles for deployment:
- Cloud Run Admin
- Cloud Build Editor
- Container Registry Writer

### Security Best Practices

1. **Use least privilege IAM roles**
2. **Enable IAM authentication** if needed
3. **Use secrets manager** for sensitive data
4. **Enable VPC-Connector** for private resources

## Troubleshooting

### Common Issues

1. **Port Issues**
   - Cloud Run expects port 8080
   - Ensure app listens on 0.0.0.0:8080

2. **Environment Variables**
   - Check Cloud Run console for correct values
   - Use `gcloud run services describe` to verify

3. **Build Failures**
   - Check Cloud Build logs
   - Verify Dockerfile syntax

4. **Deployment Failures**
   - Check IAM permissions
   - Verify region and project settings

### Debug Commands

```bash
# Check service status
gcloud run services describe escapematrix-backend --region us-central1

# View recent logs
gcloud logs read "resource.type=cloud_run_revision" --limit 20

# Test locally with Docker
docker build -f Dockerfile.gcp -t test-app .
docker run -p 8080:8080 test-app
```

## Scaling Configuration

### Automatic Scaling

```bash
# Update scaling settings
gcloud run services update escapematrix-backend \
    --region us-central1 \
    --min-instances 0 \
    --max-instances 100 \
    --concurrency 1000
```

### Performance Tuning

- **CPU**: 1 vCPU (default)
- **Memory**: 512Mi - 2Gi based on needs
- **Concurrency**: 1000 requests per instance
- **Timeout**: 300s maximum

## Migration from Railway

To migrate from Railway to Cloud Run:

1. **Export environment variables** from Railway
2. **Update webhook URLs** in payment providers
3. **Update CORS settings** in backend
4. **Deploy to Cloud Run** using this guide
5. **Update frontend** with new backend URL
6. **Test all integrations**

## Support

- Google Cloud Documentation: https://cloud.google.com/run/docs
- Cloud Run Pricing: https://cloud.google.com/run/pricing
- gcloud CLI Reference: https://cloud.google.com/sdk/gcloud
