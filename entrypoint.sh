#!/bin/bash

# Start the Backend (Flask)
python3 -m app.main &

# Start the Vision Service
python3 -m vision.service &

# Start Nginx in the foreground
nginx -c /app/nginx.docker.conf
