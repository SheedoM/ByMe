import json
from typing import List
from supabase import Client
from ..config import ENCRYPTION_KEY
from ..llm.factory import get_free_tier_provider, create_provider
from ..prompts.style_extraction import STYLE_EXTRACTION_SYSTEM, STYLE_EXTRACTION_USER
from ..services.encryption import decrypt_key


def _select_analysis_provider(db: Client, user_id: str):
    settings_result = db.table("user_settings") \
                        .select("plan_type, byok_provider, byok_model, byok_api_key_encrypted") \
                        .eq("user_id", user_id) \
                        .maybe_single() \
                        .execute()

    settings = getattr(settings_result, "data", None) or {}
    if settings.get("plan_type", "free") != "byok":
        return get_free_tier_provider()

    encrypted_key = settings.get("byok_api_key_encrypted")
    if not encrypted_key or not ENCRYPTION_KEY:
        raise ValueError("BYOK API key is not configured for analysis.")

    api_key = decrypt_key(encrypted_key, ENCRYPTION_KEY)
    return create_provider(
        settings.get("byok_provider", "gemini"),
        api_key,
        settings.get("byok_model"),
    )


async def extract_style(posts: List[dict], provider=None) -> dict:
    """
    Sends posts to the LLM and returns the parsed style profile dict.
    """
    provider = provider or get_free_tier_provider()

    posts_text = "\n\n---\n\n".join([p['content'] for p in posts])
    user_prompt = STYLE_EXTRACTION_USER.format(posts=posts_text)

    response = await provider.generate(
        system_prompt=STYLE_EXTRACTION_SYSTEM,
        user_prompt=user_prompt,
        temperature=0.3  # low temp for consistent structured output
    )

    # Strip any accidental markdown fences
    clean = response.content.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]

    try:
        return json.loads(clean)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"LLM returned invalid JSON: {str(e)}\n"
            f"Raw: {response.content[:500]}"
        )


def _upsert_style_profile(db: Client, profile_data: dict) -> None:
    try:
        db.table("style_profiles").upsert(profile_data, on_conflict="user_id").execute()
    except Exception as e:
        if "language_style_notes" not in str(e):
            raise

        # Older databases may not have migration 004 yet. Keep onboarding
        # working, and store this field automatically once the migration exists.
        compatible_profile = dict(profile_data)
        compatible_profile.pop("language_style_notes", None)
        db.table("style_profiles").upsert(compatible_profile, on_conflict="user_id").execute()


async def extract_and_store_style(
    user_id: str,
    posts: List[dict]
) -> None:
    """
    Background task — creates its own DB client and writes the style profile.
    This avoids passing a request-scoped client into a long-running background task.
    """
    from ..config import get_supabase

    db = get_supabase()
    try:
        provider = _select_analysis_provider(db, user_id)
        profile_data = await extract_style(posts, provider)
        profile_data["user_id"] = user_id
        profile_data["status"] = "ready"
        profile_data["posts_analyzed"] = len(posts)

        _upsert_style_profile(db, profile_data)

    except Exception as e:
        # Mark the profile as failed so the frontend can show an error
        db.table("style_profiles").upsert({
            "user_id": user_id,
            "status": "failed",
        }, on_conflict="user_id").execute()
        raise e
