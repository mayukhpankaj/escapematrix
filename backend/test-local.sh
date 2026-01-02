#!/bin/bash

# Test the Docker container locally to debug issues
echo "🐳 Building test container..."
docker build -t test-backend .

echo "🚀 Running test container..."
docker run -p 8080:8080 -e PORT=8080 --name test-container test-backend &

# Wait for container to start
sleep 5

echo "🧪 Testing health endpoint..."
curl -f http://localhost:8080/health

echo "📋 Container logs:"
docker logs test-container

echo "🧹 Cleaning up..."
docker stop test-container
docker rm test-container
docker rmi test-backend
