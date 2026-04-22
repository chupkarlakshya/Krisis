FROM python:3.11-slim

# Install system dependencies for OpenCV and Nginx
RUN apt-get update && apt-get install -y \
    nginx \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir ultralytics opencv-python numpy

# Copy the rest of the application
COPY . .

# Set up permissions for Hugging Face (non-root)
RUN chmod +x /app/entrypoint.sh && \
    mkdir -p /var/cache/nginx /var/log/nginx /var/lib/nginx && \
    chmod -R 777 /var/cache/nginx /var/log/nginx /var/lib/nginx /run

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Expose the Hugging Face port
EXPOSE 7860

# Launch all services
CMD ["/app/entrypoint.sh"]
