FROM python:3.12-slim

# Install system dependencies required for OpenCV and Nginx
RUN apt-get update && apt-get install -y \
    nginx \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces run as user 1000
RUN useradd -m -u 1000 user

# Set up working directory
WORKDIR /app

# Ensure permissions for Nginx to run as non-root user
RUN mkdir -p /var/lib/nginx /var/log/nginx && \
    chown -R user:user /var/lib/nginx /var/log/nginx /etc/nginx && \
    touch /run/nginx.pid && \
    chown -R user:user /run/nginx.pid

# Switch to the non-root user
USER user

# Install Python requirements
COPY --chown=user:user requirements.txt requirements-vision.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-vision.txt

# Copy application files
COPY --chown=user:user . .

# Expose Hugging Face spaces default port
EXPOSE 7860

# Ensure the start script is executable
RUN chmod +x start.sh

# Run the unified start script
CMD ["./start.sh"]
