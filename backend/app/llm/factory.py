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
    Returns the OpenRouter free-tier provider. It uses genuinely free (:free)
    models — FREE_TIER_MODEL first, then FREE_TIER_FALLBACK_MODELS — and handles
    the shared-capacity 429s these models throw with cross-model fallback and
    bounded retry, so a transient rate-limit doesn't fail the whole job.
    """
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
