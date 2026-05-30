import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..config import get_supabase, ENCRYPTION_KEY
from ..middleware.auth import get_current_user
from ..services.encryption import encrypt_key
from ..llm.factory import VALID_PROVIDERS, VALID_MODELS

router = APIRouter()


class SaveProviderRequest(BaseModel):
    plan_type: str                   # 'free' | 'byok'
    byok_provider: str | None = None # 'claude' | 'openai' | 'gemini'
    byok_model: str | None    = None
    byok_api_key: str | None  = None # raw key; encrypted server-side


@router.get("/provider")
async def get_provider_settings(user_id: str = Depends(get_current_user)):
    """
    Returns user's provider configuration.
    The API key is never returned — only a boolean flag indicating
    whether one has been set.
    """
    db = get_supabase()
    result = db.table("user_settings") \
               .select("plan_type, byok_provider, byok_model, byok_api_key_encrypted") \
               .eq("user_id", user_id) \
               .maybe_single() \
               .execute()

    if not result.data:
        return {"plan_type": "free", "byok_provider": None, "byok_model": None, "has_api_key": False}

    data = dict(result.data)
    has_key = bool(data.pop("byok_api_key_encrypted", None))
    data["has_api_key"] = has_key
    return data


@router.post("/provider")
async def save_provider_settings(
    request: SaveProviderRequest,
    user_id: str = Depends(get_current_user)
):
    """Save or update the user's provider/plan settings."""
    if request.plan_type not in ("free", "byok"):
        raise HTTPException(status_code=400, detail="plan_type must be 'free' or 'byok'")

    db = get_supabase()
    data: dict = {
        "user_id":   user_id,
        "plan_type": request.plan_type,
    }

    if request.plan_type == "byok":
        if not request.byok_provider:
            raise HTTPException(status_code=400, detail="byok_provider is required for BYOK plan")
        if request.byok_provider not in VALID_PROVIDERS:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown provider '{request.byok_provider}'. Available: {list(VALID_PROVIDERS)}"
            )
        if request.byok_model:
            valid = VALID_MODELS.get(request.byok_provider, [])
            if request.byok_model not in valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown model '{request.byok_model}' for provider '{request.byok_provider}'"
                )
        data["byok_provider"] = request.byok_provider
        data["byok_model"]    = request.byok_model or VALID_MODELS[request.byok_provider][0]

        # Only update the key if a new one was provided
        if request.byok_api_key:
            if not ENCRYPTION_KEY:
                raise HTTPException(status_code=500, detail="Encryption not configured on server")
            data["byok_api_key_encrypted"] = encrypt_key(request.byok_api_key, ENCRYPTION_KEY)

    db.table("user_settings").upsert(data).execute()
    return {"status": "saved", "plan_type": request.plan_type}


@router.get("/providers-catalog")
async def get_providers_catalog():
    """Public endpoint: returns the list of supported BYOK providers and their models."""
    return {
        "providers": [
            {
                "id": "claude",
                "label": "Claude (Anthropic)",
                "key_placeholder": "sk-ant-...",
                "models": [
                    {"id": "claude-3-5-sonnet-20241022", "label": "Claude 3.5 Sonnet (Recommended)"},
                    {"id": "claude-3-5-haiku-20241022",  "label": "Claude 3.5 Haiku (Fast)"},
                    {"id": "claude-3-opus-20240229",     "label": "Claude 3 Opus (Most capable)"},
                ],
            },
            {
                "id": "openai",
                "label": "OpenAI",
                "key_placeholder": "sk-...",
                "models": [
                    {"id": "gpt-4o",       "label": "GPT-4o (Recommended)"},
                    {"id": "gpt-4o-mini",  "label": "GPT-4o Mini (Fast)"},
                    {"id": "gpt-4-turbo",  "label": "GPT-4 Turbo"},
                ],
            },
            {
                "id": "gemini",
                "label": "Google Gemini",
                "key_placeholder": "AIza...",
                "models": [
                    {"id": "gemini-2.0-flash",   "label": "Gemini 2.0 Flash (Recommended)"},
                    {"id": "gemini-2.5-flash",   "label": "Gemini 2.5 Flash (Latest)"},
                    {"id": "gemini-2.0-flash-lite", "label": "Gemini 2.0 Flash Lite (Fast)"},
                ],
            },
        ]
    }
