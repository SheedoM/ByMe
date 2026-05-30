from google import genai
from .base import BaseLLMProvider, LLMResponse
import os


class GeminiProvider(BaseLLMProvider):
    """
    Uses the new google-genai SDK (v1+) which is pure-HTTP
    and compatible with Python 3.14+ (no protobuf C extensions).
    """

    def __init__(self, api_key: str | None = None, model: str | None = None):
        # Allow falling back to environment variable when api_key is not provided
        key = api_key or os.getenv("GOOGLE_API_KEY")
        if not key:
            raise ValueError("Gemini requires an API key. Set GOOGLE_API_KEY or pass api_key.")
        self._client = genai.Client(api_key=key)
        self._model_name = model or "gemini-1.5-flash"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
    ) -> LLMResponse:
        # google-genai combines system + user into a single contents list
        contents = f"{system_prompt}\n\n---\n\n{user_prompt}"

        response = await self._client.aio.models.generate_content(
            model=self._model_name,
            contents=contents,
            config=genai.types.GenerateContentConfig(
                temperature=temperature,
            ),
        )

        return LLMResponse(
            content=response.text,
            provider="gemini",
            model=self._model_name,
            tokens_used=getattr(response.usage_metadata, "total_token_count", 0) or 0,
        )

    def get_name(self) -> str:
        return "gemini"

    def get_model(self) -> str:
        return self._model_name
