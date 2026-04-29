# API Reference

The API surface is framework-agnostic from the frontend's perspective. The current implementation uses Flask and returns JSON over the same paths described below.

## Health

`GET /health`

Returns:

```json
{ "status": "ok" }
```

## Ingest Detection

`POST /ingest/detection`

Example:

```json
{
  "camera_id": "cam-03",
  "location": "Corridor A",
  "label": "smoke",
  "confidence": 0.72
}
```

## Ingest Sensor

`POST /ingest/sensor`

Example:

```json
{
  "sensor_id": "temp-08",
  "location": "Corridor A",
  "sensor_type": "temperature",
  "value": 62
}
```

## Ingest Manual Trigger

`POST /ingest/manual`

Example:

```json
{
  "trigger_id": "desk-panic-1",
  "location": "Reception",
  "trigger_type": "panic_button",
  "notes": "Manual emergency raised by staff"
}
```

## Active Incidents

`GET /incidents/active`

Returns an array of active incidents with:

- incident id
- type
- severity
- summary
- recommended action
- evidence

## Recent Events

`GET /events`

Returns the most recent ingested events in reverse chronological order.
