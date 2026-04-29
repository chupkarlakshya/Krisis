# Project Overview

## What We Are Building

Embedded Crisis Grid is a software-first emergency coordination platform for hospitality spaces such as hotels, resorts, and event venues.

The system does not depend on new hardware. Instead, it connects existing operational signals into one response layer:

- CCTV detections from a vision model
- sensor alerts such as temperature, gas, or sound spikes
- manual triggers from staff

## Core Product Idea

Most safety systems are passive and disconnected. A camera may detect something. A sensor may alarm. A staff member may notice a problem. But there is no shared operational brain that fuses those signals and coordinates the response in real time.

This project is that operational brain.

## MVP Architecture

1. Detection Layer

- a YOLO/OpenCV vision module watches video or a simulated CCTV feed
- it emits labels such as `fire`, `smoke`, `abnormal_motion`, or `crowd_panic`

2. Incident Intelligence Layer

- the Flask backend receives raw events
- it applies persistence and rule-based fusion
- it converts raw signals into incidents with severity and recommended action

3. Test Dashboard

- the detached frontend simulates events and displays active incidents
- it is only for testing and demo flow, so it can be removed later

Optional vision bridge:

- a separate YOLO microservice can watch a video source
- it emits the same detection events already accepted by the backend
- this keeps the backend contract stable while making the demo feel live

4. Alerting Layer

- in the MVP this is visual inside the UI
- later it can fan out to SMS, email, internal staff systems, or local siren triggers

## Why This Is Different

The differentiator is not only "detecting fire."

The differentiator is:

- combining multiple inputs
- confirming incidents over time
- assigning operational severity
- presenting one live source of truth to responders

## Demo Story

1. Smoke appears on a camera feed.
2. The system holds an early warning as evidence accumulates.
3. Heat sensor data increases.
4. The system escalates to a confirmed fire incident.
5. The dashboard highlights the location and response guidance.
6. A manual trigger proves fail-safe override capability.

## Current Repo Layout

- `app/`: backend API and incident engine
- `frontend/`: detachable browser-based test console
- `tools/test_gateway.py`: optional same-origin gateway for complete browser testing
- `docs/`: supporting documentation
