# Embedded Crisis Grid

Software-first emergency coordination for hospitality emergencies.

This repo contains a backend incident engine plus a detachable test frontend for demoing and validating the system without coupling the UI into the API.

## Repo Contents

- `app/`: Flask backend and incident intelligence engine
- `frontend/`: detachable browser-based test console
- `vision/`: optional YOLO-based detector microservice
- `tools/`: local developer utilities, including a same-origin test gateway
- `docs/`: overview and API reference

## What The System Does

The platform turns disconnected safety signals into one coordinated response layer.

Inputs:

- CCTV detections such as `fire`, `smoke`, `abnormal_motion`, `crowd_panic`
- sensor events such as temperature, gas, and sound anomalies
- manual staff triggers

Outputs:

- active incidents
- severity classification
- recommended action
- event timeline for dashboarding and alerting

## Quick Start

1. Install Python dependencies.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Install optional vision dependencies.

```bash
pip install -r requirements-vision.txt
```

3. Start the full local stack with one command.

```bash
python run_local.py
```

4. Open the frontend at:

- `http://127.0.0.1:8080`

The local launcher starts the backend, optional vision service, and gateway together so the application is ready on localhost with one command.

## Optional Vision Service

To add video-driven detections, install the extra dependencies:

```bash
pip install -r requirements-vision.txt
```

Then run the detector microservice in a third terminal:

```bash
python -m vision.service
```

The gateway proxies this service under `/visionapi`, and the frontend includes a `Vision Bridge` section for configuring and starting the detector.

Recommended sources:

- `0` for webcam
- local `.mp4` file path
- RTSP stream URL
- direct video stream URL

Default model path:

- `vision/models/best.pt`

Plain YouTube page URLs are not reliable OpenCV sources. For a YouTube demo, download the video to a local file first or extract a direct stream URL with separate tooling.

## Main API Endpoints

- `GET /health`
- `POST /ingest/detection`
- `POST /ingest/sensor`
- `POST /ingest/manual`
- `GET /incidents/active`
- `GET /events`

## Python 3.14 Note

The backend was intentionally rewritten to avoid `pydantic-core` and other native-extension-heavy dependencies so it is easier to install on Python 3.14 without a local C/C++ or Rust toolchain.

## Demo Flow

1. Open the test console.
2. Switch to `Backend Mode`.
3. Select a zone.
4. Run the fire scenario.
5. Watch incidents escalate from warning to confirmed emergency.
6. Trigger a manual event to prove fail-safe override.

## More Detail

- Overview: [docs/PROJECT_OVERVIEW.md](C:/Users/jlaak/Documents/Codex/2026-04-20-pitch-embedded-crisis-grid-software-first/docs/PROJECT_OVERVIEW.md)
- API: [docs/API_REFERENCE.md](C:/Users/jlaak/Documents/Codex/2026-04-20-pitch-embedded-crisis-grid-software-first/docs/API_REFERENCE.md)
- Frontend notes: [frontend/README.md](C:/Users/jlaak/Documents/Codex/2026-04-20-pitch-embedded-crisis-grid-software-first/frontend/README.md)
