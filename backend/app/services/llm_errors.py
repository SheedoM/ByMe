"""Shared classification of LLM provider errors.

Lets callers tell a transient capacity/rate-limit/size problem (worth a
"the AI is busy, try again" message and a retry) apart from a real failure.
Works across providers: OpenAI/OpenRouter/Groq (openai SDK exceptions) and
Gemini (google-genai raises its own errors with 429/RESOURCE_EXHAUSTED text).
"""

from openai import APIStatusError, RateLimitError

_CAPACITY_HINTS = (
    "429",
    "rate limit",
    "rate-limit",
    "rate_limit",
    "resource_exhausted",
    "tokens per minute",
    "tpm",
    "too large",
    "quota",
    "overloaded",
    "temporarily",
    "503",
)


def is_capacity_error(exc: Exception) -> bool:
    """True if exc looks like a transient capacity/rate-limit/size error."""
    if isinstance(exc, RateLimitError):
        return True
    if isinstance(exc, APIStatusError) and exc.status_code in (413, 429, 503):
        return True
    text = str(exc).lower()
    return any(hint in text for hint in _CAPACITY_HINTS)
