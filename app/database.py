import sqlite3
import json
import os
from datetime import datetime, UTC
from typing import Any
from uuid import uuid4

# Use /tmp as it is guaranteed writable in most container environments including Hugging Face
DB_PATH = os.environ.get("DB_PATH", "/tmp/krisis.sqlite")

def get_db() -> sqlite3.Connection:
    print(f"[db] Connecting to database at: {os.path.abspath(DB_PATH)}")
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    with get_db() as conn:
        # We use a schemaless JSON approach for speed and flexibility, 
        # while using SQLite for persistence and transactional integrity.
        conn.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                key TEXT PRIMARY KEY,
                incident_id TEXT,
                data TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                notification_id TEXT PRIMARY KEY,
                incident_id TEXT,
                data TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                location TEXT,
                received_at TEXT,
                data TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS staff (
                contact_id TEXT PRIMARY KEY,
                data TEXT
            )
        ''')
        # We'll create indexes for performance
        conn.execute('CREATE INDEX IF NOT EXISTS idx_events_location ON events(location)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_events_time ON events(received_at)')

def load_incidents() -> dict[str, dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT key, data FROM incidents").fetchall()
        return {row["key"]: json.loads(row["data"]) for row in rows}

def save_incident(key: str, incident_dict: dict[str, Any]) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO incidents (key, incident_id, data) VALUES (?, ?, ?)",
            (key, incident_dict.get("incident_id"), json.dumps(incident_dict))
        )

def delete_incident(key: str) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM incidents WHERE key = ?", (key,))

def delete_incident_by_id(incident_id: str) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM incidents WHERE incident_id = ?", (incident_id,))

def load_notifications() -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT data FROM notifications").fetchall()
        return [json.loads(row["data"]) for row in rows]

def save_notification(notification_dict: dict[str, Any]) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO notifications (notification_id, incident_id, data) VALUES (?, ?, ?)",
            (notification_dict.get("notification_id"), notification_dict.get("incident_id"), json.dumps(notification_dict))
        )

def save_event(location: str, envelope_dict: dict[str, Any]) -> None:
    with get_db() as conn:
        event_id = str(uuid4())
        received_at = envelope_dict.get("received_at", datetime.now(UTC).isoformat())
        conn.execute(
            "INSERT INTO events (id, location, received_at, data) VALUES (?, ?, ?, ?)",
            (event_id, location, received_at, json.dumps(envelope_dict))
        )

def load_staff() -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT data FROM staff").fetchall()
        return [json.loads(row["data"]) for row in rows]

def save_staff(staff_list: list[dict[str, Any]]) -> None:
    with get_db() as conn:
        for staff in staff_list:
            conn.execute(
                "INSERT OR REPLACE INTO staff (contact_id, data) VALUES (?, ?)",
                (staff.get("contact_id"), json.dumps(staff))
            )
