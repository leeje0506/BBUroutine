import os

os.environ["PPUROUTINE_SKIP_DOTENV"] = "1"
os.environ.pop("DATABASE_URL", None)

from app.db import init_db

init_db()
