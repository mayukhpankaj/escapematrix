#!/bin/bash

# Google Cloud Run deployment script for Escape Matrix Backend

set -e

# Configuration
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"
SERVICE_NAME="escapematrix-backend"
IMAGE_NAME="escapematrix-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Google Cloud Run deployment...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install it first.${NC}"
    exit 1
fi

# Set the project
echo -e "${YELLOW}📋 Setting project to: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the image using local source
echo -e "${YELLOW}🏗️  Building Docker image from local source...${NC}"
gcloud builds submit --tag gcr.io/$PROJECT_ID/$IMAGE_NAME:latest --timeout=600 ./backend

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --concurrency 1000 \
    --max-instances 100 \
    --set-env-vars "PORT=8080"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format 'value(status.url)')

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
echo -e "${YELLOW}⚠️  Don't forget to update your frontend environment variables:${NC}"
echo -e "${YELLOW}   NEXT_PUBLIC_BACKEND_URL=$SERVICE_URL${NC}"

# Test the deployment
echo -e "${YELLOW}🧪 Testing health endpoint...${NC}"
if curl -f $SERVICE_URL/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed. Please check logs.${NC}"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
