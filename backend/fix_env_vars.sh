#!/bin/bash

# Script to manually set environment variables for Google Cloud Run
# This will fix the webhook secret issue

echo "🔧 Setting environment variables for Escape Matrix Backend..."

# Replace with your actual project ID and region
PROJECT_ID="your-project-id"  # Update this with your actual GCP project ID
REGION="asia-south1"  # Update if different
SERVICE_NAME="escapematrix-backend"

echo "📝 Setting environment variables..."

gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --set-env-vars "PORT=8080" \
  --set-env-vars "FRONTEND_URL=https://escapematrix-app.vercel.app" \
  --set-env-vars "SUPABASE_URL=https://bqwkekylncfqzyiltqgj.supabase.co" \
  --set-env-vars "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxd2tla3lsbmNmcXp5aWx0cWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MjU5NTksImV4cCI6MjA4MjQwMTk1OX0.TFq8zDMZ-OOyLt_Uvcj2ZG2bgvYjuojrEPz5hqTpBIs" \
  --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxd2tla3lsbmNmcXp5aWx0cWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyNTk1OSwiZXhwIjoyMDgyNDAxOTU5fQ.vQuIfROhA3IVRai5r60dlyIolvolhnvAYPjNuxNzzzs" \
  --set-env-vars "CLERK_PEM_PUBLIC_KEY=" \
  --set-env-vars "CLERK_SECRET_KEY=sk_test_dfRQtImnhItpqZ0nGHq4WgIgI4tHd4jamgvfrBLf5o" \
  --set-env-vars "DODO_WEBHOOK_SECRET=whsec_MGvIckoTy49do+Dts48apq40ouE4oAjl" \
  --set-env-vars "DODO_PRODUCT_ID=pdt_0NVJ8D4w4vPUkPNW1m392" \
  --set-env-vars "DODO_WEBHOOK_URL=https://escapematrixapp-476326688061.asia-south1.run.app/webhooks/dodo" \
  --set-env-vars "GEMINI_API_KEY=AIzaSyCvKXoV7QdTbGP94V3BjlqfYYG-u_fPT38" \
  --set-env-vars "ENVIRONMENT=production"

echo "✅ Environment variables updated successfully!"
echo "🔄 The backend service will restart with the new environment variables."
echo ""
echo "⚠️  Make sure to update PROJECT_ID and REGION in this script if needed."
