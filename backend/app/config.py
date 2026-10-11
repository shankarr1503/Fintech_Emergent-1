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
    # Signs session tokens. Set a long random value in production.
    secret_key: str = os.environ.get("SECRET_KEY", "")
    # Enables /api/admin endpoints (audit verification, AML review). Leave empty to disable.
    admin_api_key: str = os.environ.get("ADMIN_API_KEY", "")
    # Abuse limit for OTP requests from one IP address per hour.
    otp_sends_per_ip_hour: int = int(os.environ.get("OTP_SENDS_PER_IP_HOUR", "20"))
    otp_verifies_per_ip_10min: int = int(os.environ.get("OTP_VERIFIES_PER_IP_10MIN", "30"))
    # AES-256 key (base64, 32 bytes) for encrypting identity fields. Required when DEMO_MODE is off.
    field_encryption_key: str = os.environ.get("FIELD_ENCRYPTION_KEY", "")
    # Shared secret the payment provider uses to sign webhooks.
    webhook_secret: str = os.environ.get("WEBHOOK_SECRET", "")
    # Reject plain-HTTP API calls (TLS terminates at the proxy, which sets X-Forwarded-Proto).
    require_https: bool = _bool("REQUIRE_HTTPS", not _bool("DEMO_MODE", True))
    # Sign out after this many minutes without any API activity.
    idle_timeout_minutes: int = int(os.environ.get("IDLE_TIMEOUT_MINUTES", "15"))
    # Send push notifications through Expo (needs outbound internet).
    push_enabled: bool = _bool("PUSH_ENABLED", False)
    # Public base URL of this API, used to build links in emails (e.g. unsubscribe).
    public_api_url: str = os.environ.get("PUBLIC_API_URL", "http://localhost:8001").rstrip("/")
    # Demo mode echoes the OTP back to the client instead of sending an SMS.
    demo_mode: bool = _bool("DEMO_MODE", True)
    cors_origins: list[str] = [
        o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()
    ]


settings = Settings()
