import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

ENVIRONMENT          = os.getenv("ENVIRONMENT", "development").lower()
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_JWT_SECRET  = os.getenv("SUPABASE_JWT_SECRET")
ENCRYPTION_KEY       = os.getenv("ENCRYPTION_KEY")
OPENROUTER_API_KEY   = os.getenv("OPENROUTER_API_KEY")

# Free tier LLM model (served via OpenRouter). Must be a real free model id.
FREE_TIER_MODEL         = os.getenv("FREE_TIER_MODEL", "google/gemini-2.0-flash-exp:free")
FREE_TIER_MONTHLY_LIMIT = int(os.getenv("FREE_TIER_MONTHLY_LIMIT", "10"))

# Max upload size for LinkedIn archives / analytics files (bytes).
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))  # 15 MB

# LLM call guards.
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
LLM_MAX_TOKENS      = int(os.getenv("LLM_MAX_TOKENS", "2048"))

IS_PRODUCTION = ENVIRONMENT == "production"


def validate_config() -> None:
    """
    Fail fast on boot if required configuration is missing.
    Called from main.py at startup so misconfiguration surfaces immediately
    instead of as cryptic runtime 500s.
    """
    required = {
        "SUPABASE_URL":         SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": SUPABASE_SERVICE_KEY,
        "SUPABASE_JWT_SECRET":  SUPABASE_JWT_SECRET,
        "ENCRYPTION_KEY":       ENCRYPTION_KEY,
        "OPENROUTER_API_KEY":   OPENROUTER_API_KEY,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError(
            "Missing required environment variables: "
            + ", ".join(missing)
            + ". Set them in your environment / .env before starting the server."
        )

    # Encryption key must be a valid Fernet key.
    try:
        from cryptography.fernet import Fernet
        Fernet(ENCRYPTION_KEY.encode())
    except Exception as exc:
        raise RuntimeError(
            "ENCRYPTION_KEY is not a valid Fernet key. Generate one with: "
            'python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
        ) from exc


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
