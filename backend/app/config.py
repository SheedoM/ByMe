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
GOOGLE_API_KEY       = os.getenv("GOOGLE_API_KEY")
GROQ_API_KEY         = os.getenv("GROQ_API_KEY")

# Which provider powers the free tier: "openrouter" (default), "gemini", or "groq".
# Groq's free tier is generous and broadly available by region; Gemini's free
# tier is region-restricted; OpenRouter's shared :free pool is often saturated.
FREE_TIER_PROVIDER   = os.getenv("FREE_TIER_PROVIDER", "openrouter").strip().lower()
GROQ_BASE_URL        = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

# Free tier LLM model (served via OpenRouter). Must be a real free model id.
FREE_TIER_MODEL         = os.getenv("FREE_TIER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
FREE_TIER_MONTHLY_LIMIT = int(os.getenv("FREE_TIER_MONTHLY_LIMIT", "10"))

# Free OpenRouter models share low upstream rate limits and 429 often. The
# free-tier provider tries FREE_TIER_MODEL first, then these fallbacks, before
# giving up. Override via env (comma-separated) as live free models change.
FREE_TIER_FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv(
        "FREE_TIER_FALLBACK_MODELS",
        "qwen/qwen3-next-80b-a3b-instruct:free,meta-llama/llama-3.3-70b-instruct:free",
    ).split(",")
    if m.strip()
]
# How many times to cycle the whole model list, and the cap (seconds) on any
# single Retry-After backoff between rounds.
FREE_TIER_MAX_ROUNDS        = int(os.getenv("FREE_TIER_MAX_ROUNDS", "3"))
FREE_TIER_RETRY_CAP_SECONDS = float(os.getenv("FREE_TIER_RETRY_CAP_SECONDS", "8"))

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
    }
    # Only the selected free-tier provider's key is required.
    if FREE_TIER_PROVIDER == "gemini":
        required["GOOGLE_API_KEY"] = GOOGLE_API_KEY
    elif FREE_TIER_PROVIDER == "groq":
        required["GROQ_API_KEY"] = GROQ_API_KEY
    else:
        required["OPENROUTER_API_KEY"] = OPENROUTER_API_KEY
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
