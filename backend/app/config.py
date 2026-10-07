"""Runtime configuration, read once from the environment (or backend/.env)."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    app_name: str = "CoinQuest API"
    # Leave MONGO_URL empty to run against an in-memory database (great for demos/tests).
    mongo_url: str = os.environ.get("MONGO_URL", "")
    db_name: str = os.environ.get("DB_NAME", "coinquest")
    # AI is optional: without a key, insights fall back to the rule engine.
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    openai_base_url: str = os.environ.get("OPENAI_BASE_URL", "")
    openai_model: str = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    # Demo mode echoes the OTP back to the client instead of sending an SMS.
    demo_mode: bool = _bool("DEMO_MODE", True)
    cors_origins: list[str] = [
        o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()
    ]


settings = Settings()
