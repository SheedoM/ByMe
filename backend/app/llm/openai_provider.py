import os
from openai import AsyncOpenAI
from .base import BaseLLMProvider, LLMResponse


class OpenAIProvider(BaseLLMProvider):

    def __init__(self, api_key: str | None = None, model: str | None = None, base_url: str | None = None):
        key = api_key or os.getenv("OPENAI_API_KEY")
        kwargs = {"api_key": key}
        if base_url:
            kwargs["base_url"] = base_url
        self.client = AsyncOpenAI(**kwargs)
        self._model = model or "gpt-4o"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7
    ) -> LLMResponse:
        response = await self.client.chat.completions.create(
            model=self._model,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ]
        )
        usage = response.usage
        return LLMResponse(
            content=response.choices[0].message.content,
            provider="openai",
            model=self._model,
            tokens_used=(usage.prompt_tokens + usage.completion_tokens) if usage else 0
        )

    def get_name(self) -> str:
        return "openai"

    def get_model(self) -> str:
        return self._model
