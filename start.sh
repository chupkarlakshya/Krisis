#!/bin/bash
echo "Starting Nginx Gateway on port 7860..."
nginx -c /app/nginx.docker.conf &

echo "Starting Krisis Backend on port 8000..."
python -m app.main &

echo "Starting YOLO Vision Bridge on port 8010..."
python -m vision.service &

echo "Starting Webhook Server on port 8090..."
python tools/webhook_server.py &

echo "All services started! The space is up and running."
# wait -n waits for any of the background processes to exit
wait -n

echo "One of the services crashed or exited. Shutting down."
exit $?
