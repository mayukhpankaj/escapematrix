# FastAPI Backend Dockerfile for Google Cloud Run
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Expose ports
EXPOSE 8080
EXPOSE 8081

# Run the FastAPI server
CMD ["python", "main.py"]
