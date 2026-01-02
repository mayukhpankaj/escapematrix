# Multi-stage build for monolithic deployment
FROM node:18-alpine AS frontend

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY package*.json ./
COPY app/ ./app/
COPY components/ ./components/
COPY hooks/ ./hooks/
COPY lib/ ./lib/
COPY store/ ./store/
COPY utils/ ./utils/
COPY tsconfig.json ./
COPY next.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY components.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Build frontend
RUN npm run build

# Python backend stage
FROM python:3.11-slim AS backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend from previous stage
COPY --from=frontend /app/frontend/.next ./.next
COPY --from=frontend /app/frontend/public ./public
COPY --from=frontend /app/frontend/package*.json ./
COPY --from=frontend /app/frontend/next.config.js ./
COPY --from=frontend /app/frontend/tsconfig.json ./

# Create startup script
RUN echo '#!/bin/bash\n\
# Start FastAPI backend in background\n\
uvicorn main:app --host 0.0.0.0 --port 8000 &\n\
\n\
# Wait for backend to start\n\
sleep 5\n\
\n\
# Start Next.js frontend\n\
npm start' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 3000 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start both services
CMD ["/app/start.sh"]
