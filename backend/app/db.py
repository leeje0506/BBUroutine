from __future__ import annotations

import os
import sqlite3
from hashlib import sha256
from datetime import datetime
from pathlib import Path
from uuid import uuid4

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - production installs this, tests can run without it
    load_dotenv = None

try:
    import psycopg
    from psycopg_pool import ConnectionPool
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover - optional in local SQLite-only setup
    psycopg = None
    ConnectionPool = None
    dict_row = None

if load_dotenv is not None and os.environ.get("PPUROUTINE_SKIP_DOTENV") != "1":
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DB_PATH = Path(os.environ.get("PPUROUTINE_DB_PATH", Path(__file__).resolve().parents[2] / "data" / "ppuroutine.db"))
DATABASE_URL = os.environ.get("DATABASE_URL")
DEV_USER_ID = "00000000-0000-4000-8000-000000000001"
BBUNU_USER_ID = "00000000-0000-4000-8000-000000000002"
_postgres_pool = None


def hash_password(password: str) -> str:
    return sha256(password.encode("utf-8")).hexdigest()


class PostgresConnection:
    def __init__(self, connection_context):
        self.connection_context = connection_context
        self.connection = None

    def __enter__(self):
        self.connection = self.connection_context.__enter__()
        return self

    def __exit__(self, exc_type, exc, traceback):
        return self.connection_context.__exit__(exc_type, exc, traceback)

    def execute(self, query: str, params=()):
        if self.connection is None:
            raise RuntimeError("Database connection is not open")
        return self.connection.execute(query.replace("?", "%s"), params)


def is_postgres() -> bool:
    return bool(DATABASE_URL)


def _get_postgres_pool():
    global _postgres_pool
    if psycopg is None or ConnectionPool is None or dict_row is None:
        raise RuntimeError("psycopg with pool support is required when DATABASE_URL is set")
    if _postgres_pool is None:
        _postgres_pool = ConnectionPool(
            conninfo=DATABASE_URL,
            min_size=1,
            max_size=5,
            kwargs={"row_factory": dict_row},
        )
    return _postgres_pool


def get_connection():
    if DATABASE_URL:
        return PostgresConnection(_get_postgres_pool().connection())

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _ensure_sqlite_column(connection: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = connection.execute(f"PRAGMA table_info({table})").fetchall()
    if any(row["name"] == column for row in columns):
        return
    connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _ensure_postgres_column(connection: PostgresConnection, table: str, column: str, definition: str) -> None:
    connection.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}")


def _repair_hospital_visit_dates(connection) -> None:
    rows = connection.execute("SELECT id, visited_at FROM hospital_visits").fetchall()
    for row in rows:
        try:
            datetime.fromisoformat(row["visited_at"])
        except (TypeError, ValueError):
            connection.execute(
                "UPDATE hospital_visits SET visited_at = ? WHERE id = ?",
                (datetime.now().isoformat(timespec="seconds"), row["id"]),
            )


def _init_sqlite() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS pets (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT NOT NULL,
                species TEXT NOT NULL,
                birth_date TEXT,
                weight_kg REAL,
                conditions TEXT NOT NULL DEFAULT '',
                caution_notes TEXT
            );

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                display_name TEXT NOT NULL
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

            CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
            CREATE INDEX IF NOT EXISTS idx_breathing_pet_measured ON breathing_records(pet_id, measured_at DESC);
            CREATE INDEX IF NOT EXISTS idx_medication_pet_logged ON medication_logs(pet_id, logged_at DESC);
            CREATE INDEX IF NOT EXISTS idx_meal_pet_logged ON meal_records(pet_id, logged_at DESC);
            CREATE INDEX IF NOT EXISTS idx_hospital_pet_visited ON hospital_visits(pet_id, visited_at DESC);
            CREATE INDEX IF NOT EXISTS idx_hospital_pet_next_visit ON hospital_visits(pet_id, next_visit_at);
            """
        )
        _ensure_sqlite_column(connection, "pets", "user_id", "TEXT")
        _ensure_sqlite_column(connection, "breathing_records", "cough_observed", "INTEGER NOT NULL DEFAULT 0")
        _ensure_sqlite_column(connection, "medication_logs", "dosage", "TEXT")
        _ensure_sqlite_column(connection, "meal_records", "food_name", "TEXT")
        _ensure_sqlite_column(connection, "meal_records", "food_grams", "REAL")
        _ensure_sqlite_column(connection, "meal_records", "water_ml", "REAL")
        _ensure_sqlite_column(connection, "hospital_visits", "medication_items", "TEXT NOT NULL DEFAULT '[]'")
        _ensure_sqlite_column(connection, "hospital_visits", "attachments", "TEXT NOT NULL DEFAULT '[]'")
        _ensure_sqlite_column(connection, "hospital_visits", "next_visit_interval_weeks", "INTEGER")
        _repair_hospital_visit_dates(connection)
        _seed_default_users(connection)
        _assign_existing_pets(connection)
        _seed_default_pet(connection)


def _init_postgres() -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS pets (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            birth_date TEXT,
            weight_kg REAL,
            conditions TEXT NOT NULL DEFAULT '',
            caution_notes TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS breathing_records (
            id TEXT PRIMARY KEY,
            pet_id TEXT NOT NULL REFERENCES pets(id),
            measured_at TEXT NOT NULL,
            duration_seconds INTEGER NOT NULL,
            breath_count INTEGER NOT NULL,
            breaths_per_minute INTEGER NOT NULL,
            cough_observed INTEGER NOT NULL DEFAULT 0,
            memo TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS medication_logs (
            id TEXT PRIMARY KEY,
            pet_id TEXT NOT NULL REFERENCES pets(id),
            logged_at TEXT NOT NULL,
            medication_name TEXT NOT NULL,
            dosage TEXT,
            status TEXT NOT NULL,
            memo TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS meal_records (
            id TEXT PRIMARY KEY,
            pet_id TEXT NOT NULL REFERENCES pets(id),
            logged_at TEXT NOT NULL,
            meal_type TEXT NOT NULL,
            food_name TEXT,
            food_grams REAL,
            water_ml REAL,
            amount_status TEXT NOT NULL,
            memo TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS hospital_visits (
            id TEXT PRIMARY KEY,
            pet_id TEXT NOT NULL REFERENCES pets(id),
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
            memo TEXT
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_breathing_pet_measured ON breathing_records(pet_id, measured_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_medication_pet_logged ON medication_logs(pet_id, logged_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_meal_pet_logged ON meal_records(pet_id, logged_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_hospital_pet_visited ON hospital_visits(pet_id, visited_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_hospital_pet_next_visit ON hospital_visits(pet_id, next_visit_at)",
    ]

    with get_connection() as connection:
        for statement in statements:
            connection.execute(statement)
        _ensure_postgres_column(connection, "pets", "user_id", "TEXT")
        _ensure_postgres_column(connection, "breathing_records", "cough_observed", "INTEGER NOT NULL DEFAULT 0")
        _ensure_postgres_column(connection, "medication_logs", "dosage", "TEXT")
        _ensure_postgres_column(connection, "meal_records", "food_name", "TEXT")
        _ensure_postgres_column(connection, "meal_records", "food_grams", "REAL")
        _ensure_postgres_column(connection, "meal_records", "water_ml", "REAL")
        _ensure_postgres_column(connection, "hospital_visits", "medication_items", "TEXT NOT NULL DEFAULT '[]'")
        _ensure_postgres_column(connection, "hospital_visits", "attachments", "TEXT NOT NULL DEFAULT '[]'")
        _ensure_postgres_column(connection, "hospital_visits", "next_visit_interval_weeks", "INTEGER")
        _repair_hospital_visit_dates(connection)
        _seed_default_users(connection)
        _assign_existing_pets(connection)
        _seed_default_pet(connection)


def _seed_default_users(connection) -> None:
    users = [
        (DEV_USER_ID, "dev1", hash_password("dev1"), "개발자"),
        (BBUNU_USER_ID, "bbunu", hash_password("bbunu"), "뿌나누나"),
    ]
    for user in users:
        existing = connection.execute("SELECT id FROM users WHERE username = ?", (user[1],)).fetchone()
        if existing is None:
            connection.execute(
                "INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)",
                user,
            )


def _assign_existing_pets(connection) -> None:
    connection.execute("UPDATE pets SET user_id = ? WHERE user_id IS NULL OR user_id = ''", (DEV_USER_ID,))


def _seed_default_pet(connection) -> None:
    row = connection.execute("SELECT COUNT(*) AS count FROM pets WHERE user_id = ?", (DEV_USER_ID,)).fetchone()
    if row["count"] == 0:
        connection.execute(
            """
            INSERT INTO pets (
                id, user_id, name, species, birth_date, weight_kg, conditions, caution_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                DEV_USER_ID,
                "뿌나",
                "dog",
                "2012-03-14",
                5.2,
                "심장 관리,신장 관리",
                "밤에 안정 시 호흡 수를 확인하고 복약 시간을 지켜요.",
            ),
        )


def init_db() -> None:
    if is_postgres():
        _init_postgres()
    else:
        _init_sqlite()
