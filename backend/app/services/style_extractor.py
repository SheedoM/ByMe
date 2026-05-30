import json
from typing import List
from supabase import Client
from ..llm.factory import get_free_tier_provider
from ..prompts.style_extraction import STYLE_EXTRACTION_SYSTEM, STYLE_EXTRACTION_USER


async def extract_style(posts: List[dict]) -> dict:
    """
    Sends posts to the LLM and returns the parsed style profile dict.
    Always uses the platform's free-tier Gemini Flash for style extraction —
    this keeps extraction consistent for all users and avoids storing BYOK keys
    before the user has made their provider choice.
    """
    provider = get_free_tier_provider()

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


async def extract_and_store_style(
    db: Client,
    user_id: str,
    posts: List[dict]
) -> None:
    """
    Background task: extract style and write to style_profiles table.
    Called by the upload endpoint as a BackgroundTask.
    """
    try:
        profile_data = await extract_style(posts)
        profile_data["user_id"]        = user_id
        profile_data["status"]         = "ready"
        profile_data["posts_analyzed"] = len(posts)

        db.table("style_profiles").upsert(profile_data, on_conflict="user_id").execute()

    except Exception as e:
        # Mark the profile as failed so the frontend can show an error
        db.table("style_profiles").upsert({
            "user_id": user_id,
            "status": "failed",
        }, on_conflict="user_id").execute()
        raise e
