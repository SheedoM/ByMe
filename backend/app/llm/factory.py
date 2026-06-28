from ..config import (
    FREE_TIER_PROVIDER,
    FREE_TIER_MODEL,
    GOOGLE_API_KEY,
    GROQ_API_KEY,
    GROQ_BASE_URL,
)
from .base import BaseLLMProvider
from .claude import ClaudeProvider
from .openai_provider import OpenAIProvider
from .gemini import GeminiProvider
from .free_tier import FreeTierProvider


# Valid provider names for BYOK
VALID_PROVIDERS = {"claude", "openai", "gemini", "openrouter"}

# Valid models per provider
VALID_MODELS: dict[str, list[str]] = {
    "claude": [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
    ],
    "openai": [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
    ],
    "gemini": [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite",
    ],
    "openrouter": [
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "mistralai/mistral-7b-instruct:free",
    ],
}


def get_free_tier_provider() -> BaseLLMProvider:
    """
    Returns the provider that powers the free tier, selected by FREE_TIER_PROVIDER:

    - "gemini": Google AI Studio free tier (much higher limits than OpenRouter's
      shared :free pool). Uses GOOGLE_API_KEY and FREE_TIER_MODEL (a gemini-* id).
    - "openrouter" (default): free :free models with cross-model fallback and
      bounded retry to ride out the shared-capacity 429s.
    """
    if FREE_TIER_PROVIDER == "gemini":
        if not GOOGLE_API_KEY:
            raise RuntimeError("GOOGLE_API_KEY is not set for the Gemini free tier.")
        # Guard against an OpenRouter slug being left in FREE_TIER_MODEL.
        model = FREE_TIER_MODEL if "/" not in FREE_TIER_MODEL else "gemini-2.0-flash"
        return GeminiProvider(api_key=GOOGLE_API_KEY, model=model)

    if FREE_TIER_PROVIDER == "groq":
        if not GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set for the Groq free tier.")
        # Groq is OpenAI-compatible. Guard against a non-Groq slug being left
        # in FREE_TIER_MODEL (OpenRouter/Gemini ids contain "/" or "gemini").
        model = FREE_TIER_MODEL
        if "/" in model or model.startswith("gemini"):
            model = "llama-3.3-70b-versatile"
        return OpenAIProvider(api_key=GROQ_API_KEY, model=model, base_url=GROQ_BASE_URL)

    return FreeTierProvider()


def create_provider(
    provider_name: str,
    api_key: str,
    model: str | None = None
) -> BaseLLMProvider:
    """
    Creates a one-off provider instance with the user's own API key.
    Used for BYOK users.
    """
    if provider_name not in VALID_PROVIDERS:
        raise ValueError(
            f"Unknown provider '{provider_name}'. "
            f"Available: {list(VALID_PROVIDERS)}"
        )

    if provider_name == "claude":
        return ClaudeProvider(api_key=api_key, model=model)
    elif provider_name == "openai":
        return OpenAIProvider(api_key=api_key, model=model)
    elif provider_name == "gemini":
        return GeminiProvider(api_key=api_key, model=model)
    elif provider_name == "openrouter":
        default_model = model or VALID_MODELS["openrouter"][0]
        return OpenAIProvider(
            api_key=api_key,
            model=default_model,
            base_url="https://openrouter.ai/api/v1"
        )
