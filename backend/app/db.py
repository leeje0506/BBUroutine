from __future__ import annotations

import sqlite3
from datetime import datetime
import os
from pathlib import Path
from uuid import uuid4

DB_PATH = Path(os.environ.get("PPUROUTINE_DB_PATH", Path(__file__).resolve().parents[2] / "data" / "ppuroutine.db"))


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _ensure_column(connection: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = connection.execute(f"PRAGMA table_info({table})").fetchall()
    if any(row["name"] == column for row in columns):
        return
    connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _repair_hospital_visit_dates(connection: sqlite3.Connection) -> None:
    rows = connection.execute("SELECT id, visited_at FROM hospital_visits").fetchall()
    for row in rows:
        try:
            datetime.fromisoformat(row["visited_at"])
        except ValueError:
            connection.execute(
                "UPDATE hospital_visits SET visited_at = ? WHERE id = ?",
                (datetime.now().isoformat(timespec="seconds"), row["id"]),
            )


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS pets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                species TEXT NOT NULL,
                birth_date TEXT,
                weight_kg REAL,
                conditions TEXT NOT NULL DEFAULT '',
                caution_notes TEXT
            );

            CREATE TABLE IF NOT EXISTS breathing_records (
                id TEXT PRIMARY KEY,
                pet_id TEXT NOT NULL,
                measured_at TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                breath_count INTEGER NOT NULL,
                breaths_per_minute INTEGER NOT NULL,
                cough_observed INTEGER NOT NULL DEFAULT 0,
                memo TEXT,
                FOREIGN KEY (pet_id) REFERENCES pets(id)
            );

            CREATE TABLE IF NOT EXISTS medication_logs (
                id TEXT PRIMARY KEY,
                pet_id TEXT NOT NULL,
                logged_at TEXT NOT NULL,
                medication_name TEXT NOT NULL,
                dosage TEXT,
                status TEXT NOT NULL,
                memo TEXT,
                FOREIGN KEY (pet_id) REFERENCES pets(id)
            );

            CREATE TABLE IF NOT EXISTS meal_records (
                id TEXT PRIMARY KEY,
                pet_id TEXT NOT NULL,
                logged_at TEXT NOT NULL,
                meal_type TEXT NOT NULL,
                food_name TEXT,
                food_grams REAL,
                water_ml REAL,
                amount_status TEXT NOT NULL,
                memo TEXT,
                FOREIGN KEY (pet_id) REFERENCES pets(id)
            );

            CREATE TABLE IF NOT EXISTS hospital_visits (
                id TEXT PRIMARY KEY,
                pet_id TEXT NOT NULL,
                hospital_name TEXT NOT NULL,
                visited_at TEXT NOT NULL,
                reason TEXT NOT NULL,
                diagnosis TEXT,
                prescription_note TEXT,
                medication_items TEXT NOT NULL DEFAULT '[]',
                attachments TEXT NOT NULL DEFAULT '[]',
                next_visit_at TEXT,
                next_visit_interval_weeks INTEGER,
                total_cost INTEGER NOT NULL DEFAULT 0,
                memo TEXT,
                FOREIGN KEY (pet_id) REFERENCES pets(id)
            );
            """
        )
        _ensure_column(connection, "breathing_records", "cough_observed", "INTEGER NOT NULL DEFAULT 0")
        _ensure_column(connection, "medication_logs", "dosage", "TEXT")
        _ensure_column(connection, "meal_records", "food_name", "TEXT")
        _ensure_column(connection, "meal_records", "food_grams", "REAL")
        _ensure_column(connection, "meal_records", "water_ml", "REAL")
        _ensure_column(connection, "hospital_visits", "medication_items", "TEXT NOT NULL DEFAULT '[]'")
        _ensure_column(connection, "hospital_visits", "attachments", "TEXT NOT NULL DEFAULT '[]'")
        _ensure_column(connection, "hospital_visits", "next_visit_interval_weeks", "INTEGER")
        _repair_hospital_visit_dates(connection)

        row = connection.execute("SELECT COUNT(*) AS count FROM pets").fetchone()
        if row["count"] == 0:
            connection.execute(
                """
                INSERT INTO pets (
                    id, name, species, birth_date, weight_kg, conditions, caution_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid4()),
                    "뿌나",
                    "dog",
                    "2012-03-14",
                    5.2,
                    "심장 관리,신장 관리",
                    "밤에 안정 시 호흡 수를 확인하고 복약 시간을 지켜요.",
                ),
            )
