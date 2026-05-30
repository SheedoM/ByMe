from ..config import OPENROUTER_API_KEY
from .base import BaseLLMProvider
from .claude import ClaudeProvider
from .openai_provider import OpenAIProvider
from .gemini import GeminiProvider


# Valid provider names for BYOK
VALID_PROVIDERS = {"claude", "openai", "gemini"}

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
}


def get_free_tier_provider() -> BaseLLMProvider:
    """
    Returns an OpenRouter provider using completely free models.
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set. Cannot serve free tier users.")

    # Using a 100% free model from OpenRouter
    return OpenAIProvider(
        api_key=OPENROUTER_API_KEY,
        model="google/gemini-2.0-flash-lite-preview-02-05:free",
        base_url="https://openrouter.ai/api/v1"
    )


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
