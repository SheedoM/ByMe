import os
import anthropic
from .base import BaseLLMProvider, LLMResponse
from ..config import LLM_TIMEOUT_SECONDS, LLM_MAX_TOKENS


class ClaudeProvider(BaseLLMProvider):

    def __init__(self, api_key: str | None = None, model: str | None = None):
        key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = anthropic.AsyncAnthropic(
            api_key=key,
            timeout=LLM_TIMEOUT_SECONDS,
            max_retries=1,
        )
        self._model = model or "claude-3-5-sonnet-20241022"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7
    ) -> LLMResponse:
        message = await self.client.messages.create(
            model=self._model,
            max_tokens=LLM_MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=temperature
        )
        return LLMResponse(
            content=message.content[0].text,
            provider="claude",
            model=self._model,
            tokens_used=message.usage.input_tokens + message.usage.output_tokens
        )

    def get_name(self) -> str:
        return "claude"

    def get_model(self) -> str:
        return self._model
