import asyncio
import logging

from openai import (
    AsyncOpenAI,
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)

from .base import BaseLLMProvider, LLMResponse
from ..config import (
    OPENROUTER_API_KEY,
    FREE_TIER_MODEL,
    FREE_TIER_FALLBACK_MODELS,
    FREE_TIER_MAX_ROUNDS,
    FREE_TIER_RETRY_CAP_SECONDS,
    LLM_TIMEOUT_SECONDS,
    LLM_MAX_TOKENS,
)

logger = logging.getLogger("byme.llm")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def _build_model_list() -> list[str]:
    """FREE_TIER_MODEL first, then fallbacks, de-duplicated, order preserved."""
    ordered: list[str] = []
    for model in [FREE_TIER_MODEL, *FREE_TIER_FALLBACK_MODELS]:
        if model and model not in ordered:
            ordered.append(model)
    return ordered


def _retry_after_seconds(err: RateLimitError) -> float | None:
    """Read the Retry-After header from a 429, if present."""
    response = getattr(err, "response", None)
    if response is not None:
        raw = response.headers.get("retry-after")
        if raw:
            try:
                return float(raw)
            except (TypeError, ValueError):
                pass
    return None


class FreeTierProvider(BaseLLMProvider):
    """
    OpenRouter free-tier provider with cross-model fallback and bounded retry.

    Free models share low upstream rate limits and return 429s frequently. On a
    429 (or transient error) we immediately try the next free model — a different
    model is usually not throttled at the same moment. Only if every model fails
    in a round do we back off (honoring Retry-After, capped) and cycle the list
    again, up to FREE_TIER_MAX_ROUNDS. Non-retryable errors (e.g. bad key) raise
    immediately, since trying other models with the same key won't help.
    """

    def __init__(self):
        if not OPENROUTER_API_KEY:
            raise RuntimeError("OPENROUTER_API_KEY is not set. Cannot serve free tier users.")
        # We own retry/fallback, so disable the SDK's built-in retries.
        self.client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=LLM_TIMEOUT_SECONDS,
            max_retries=0,
        )
        self._models = _build_model_list()
        self._last_model = self._models[0] if self._models else FREE_TIER_MODEL

    async def _call(self, model: str, system_prompt: str, user_prompt: str, temperature: float) -> LLMResponse:
        response = await self.client.chat.completions.create(
            model=model,
            temperature=temperature,
            max_tokens=LLM_MAX_TOKENS,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        usage = response.usage
        return LLMResponse(
            content=response.choices[0].message.content,
            provider="openrouter",
            model=model,
            tokens_used=(usage.prompt_tokens + usage.completion_tokens) if usage else 0,
        )

    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> LLMResponse:
        last_error: Exception | None = None

        for round_idx in range(FREE_TIER_MAX_ROUNDS):
            pending_retry_after: float | None = None

            for model in self._models:
                try:
                    result = await self._call(model, system_prompt, user_prompt, temperature)
                    if round_idx > 0 or model != self._models[0]:
                        logger.info("Free-tier generation succeeded on %s (round %d)", model, round_idx + 1)
                    self._last_model = model
                    return result
                except AuthenticationError:
                    raise  # bad/disabled key — fallback can't help
                except RateLimitError as e:
                    last_error = e
                    retry_after = _retry_after_seconds(e)
                    if retry_after is not None:
                        pending_retry_after = (
                            retry_after if pending_retry_after is None else min(pending_retry_after, retry_after)
                        )
                    logger.warning("Free model %s rate-limited (429); trying next model", model)
                    continue
                except (APITimeoutError, APIConnectionError) as e:
                    last_error = e
                    logger.warning("Free model %s unavailable (%s); trying next model", model, e.__class__.__name__)
                    continue
                except APIStatusError as e:
                    last_error = e
                    if 500 <= e.status_code < 600:
                        logger.warning("Free model %s server error %d; trying next model", model, e.status_code)
                        continue
                    raise  # other 4xx (e.g. bad request) — not retryable

            # Every model failed this round; back off before cycling again.
            if round_idx < FREE_TIER_MAX_ROUNDS - 1:
                delay = min(pending_retry_after if pending_retry_after is not None else 2.0, FREE_TIER_RETRY_CAP_SECONDS)
                logger.warning(
                    "All free models unavailable; backing off %.1fs before round %d", delay, round_idx + 2
                )
                await asyncio.sleep(delay)

        raise last_error or RuntimeError("Free-tier generation failed: no models available.")

    def get_name(self) -> str:
        return "openrouter"

    def get_model(self) -> str:
        return self._last_model
