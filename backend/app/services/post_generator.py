import os
from datetime import date
from supabase import Client
from fastapi import HTTPException
from ..llm.factory import get_free_tier_provider, create_provider
from ..prompts.post_generation import GENERATION_SYSTEM, GENERATION_USER, POST_TYPE_CONSTRAINTS
from ..services.encryption import decrypt_key
from ..config import FREE_TIER_MONTHLY_LIMIT, ENCRYPTION_KEY


def _format_list(items: list) -> str:
    if not items:
        return "not specified"
    return " | ".join(f'"{item}"' for item in items)


def _format_style_examples(posts: list[dict]) -> str:
    if not posts:
        return "not available"
    return "\n\n---\n\n".join((post.get("content") or "")[:1200] for post in posts)


def _select_style_examples(
    raw_posts: list[dict],
    final_posts: list[dict],
    limit: int = 5,
) -> list[dict]:
    final_examples = [
        {"content": post.get("final_output") or ""}
        for post in final_posts[:3]
        if (post.get("final_output") or "").strip()
    ]
    remaining = max(0, limit - len(final_examples))
    raw_examples = [
        {"content": post.get("content") or ""}
        for post in raw_posts[:remaining]
        if (post.get("content") or "").strip()
    ]
    return final_examples + raw_examples


async def generate_post(
    db: Client,
    user_id: str,
    topic: str,
    key_points: list[str],
    post_type: str = "story",
    selected_hook: str | None = None,
) -> dict:
    """
    Generates a LinkedIn post for the user.

    Flow:
    1. Fetch style profile (must be ready)
    2. Fetch user settings (plan_type + BYOK config)
    3. Enforce monthly limit for free tier
    4. Select the correct LLM provider
    5. Build + send prompts
    6. Store result in history
    7. Return generated post
    """

    # 1. Fetch style profile
    result = db.table("style_profiles") \
               .select("*") \
               .eq("user_id", user_id) \
               .single() \
               .execute()
    

    if not result.data:
        raise HTTPException(status_code=400, detail="No style profile found. Complete onboarding first.")

    profile = result.data
    if profile.get("status") != "ready":
        raise HTTPException(status_code=400, detail="Style profile is not ready yet.")

    examples_result = db.table("raw_posts") \
                        .select("content, post_date") \
                        .eq("user_id", user_id) \
                        .eq("in_style", True) \
                        .order("post_date", desc=True, nullsfirst=False) \
                        .limit(5) \
                        .execute()
    examples_pool = getattr(examples_result, "data", None) or []

    finals_result = db.table("generated_posts") \
                      .select("final_output, final_saved_at") \
                      .eq("user_id", user_id) \
                      .eq("final_in_style", True) \
                      .order("final_saved_at", desc=True, nullsfirst=False) \
                      .limit(3) \
                      .execute()
    final_examples = getattr(finals_result, "data", None) or []
    style_examples = _select_style_examples(examples_pool, final_examples)

    # 2. Fetch user settings
    settings_result = db.table("user_settings") \
                        .select("*") \
                        .eq("user_id", user_id) \
                        .maybe_single() \
                        .execute()
    

    settings = getattr(settings_result, 'data', None) or {}
    plan_type = settings.get("plan_type", "free")

    # 3. Rate limit enforcement for free tier
    if plan_type == "free":
        month_start = date.today().replace(day=1)
        count_result = db.table("generated_posts") \
                         .select("id", count="exact") \
                         .eq("user_id", user_id) \
                         .gte("created_at", f"{month_start}T00:00:00Z") \
                         .execute()

        if (getattr(count_result, 'count', 0) or 0) >= FREE_TIER_MONTHLY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"You've reached the free tier limit of {FREE_TIER_MONTHLY_LIMIT} posts/month. "
                    "Add your own API key in Settings to generate unlimited posts."
                )
            )

    # 4. Select provider
    if plan_type == "free":
        provider = get_free_tier_provider()
    else:
        encrypted_key = settings.get("byok_api_key_encrypted")
        if not encrypted_key or not ENCRYPTION_KEY:
            raise HTTPException(status_code=400, detail="BYOK API key not configured. Go to Settings.")
        api_key      = decrypt_key(encrypted_key, ENCRYPTION_KEY)
        byok_provider = settings.get("byok_provider", "gemini")
        byok_model    = settings.get("byok_model")
        provider      = create_provider(byok_provider, api_key, byok_model)

    # 5. Build prompts
    # Build post type and hook constraints
    post_type_constraint = POST_TYPE_CONSTRAINTS.get(
        post_type,
        POST_TYPE_CONSTRAINTS["story"]
    )

    hook_constraint = ""
    if selected_hook:
        hook_constraint = (
            f"HOOK CONSTRAINT: You MUST begin this post with the following opening line exactly as written:\n"
            f'"{selected_hook}"\n'
            f"Do not alter it. Continue the post naturally from there."
        )

    system = GENERATION_SYSTEM.format(
        tone=                profile.get("tone", "not specified"),
        formality_level=     profile.get("formality_level", 5),
        avg_post_length=     profile.get("avg_post_length", 150),
        opening_patterns=    _format_list(profile.get("opening_patterns", [])),
        closing_patterns=    _format_list(profile.get("closing_patterns", [])),
        emoji_usage=         profile.get("emoji_usage", "none"),
        structure_preference=profile.get("structure_preference", "prose"),
        paragraph_length=    profile.get("paragraph_length", "short"),
        storytelling_style=  profile.get("storytelling_style", "not specified"),
        vocabulary_notes=    profile.get("vocabulary_notes", "not specified"),
        language_style_notes=profile.get("language_style_notes", "not specified"),
        raw_summary=         profile.get("raw_summary", "not specified"),
        style_examples=      _format_style_examples(style_examples),
        post_type_constraint=post_type_constraint,
        hook_constraint=hook_constraint,
    )

    # Combine topic/idea and optional key points into a single idea block
    if key_points and any(p.strip() for p in key_points):
        idea = topic + "\n\nKey points to cover:\n" + "\n".join(
            f"- {p}" for p in key_points if p.strip()
        )
    else:
        idea = topic
    user_prompt = GENERATION_USER.format(idea=idea)

    # 6. Call LLM
    try:
        response = await provider.generate(
            system_prompt=system,
            user_prompt=user_prompt,
            temperature=0.8
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail="The AI provider returned an error. Please check your API key in Settings."
        )

    # 7. Store in history and return the generated id
    insert_result = db.table("generated_posts").insert({
        "user_id":       user_id,
        "topic":         topic,
        "key_points":    "\n".join(key_points),
        "provider_used": response.provider,
        "model_used":    response.model,
        "plan_type":     plan_type,
        "output":        response.content,
        "tokens_used":   response.tokens_used,
        "post_type":     post_type,
        "selected_hook": selected_hook,
    }).execute()

    generated_id = None
    try:
        generated_id = insert_result.data[0]["id"] if insert_result.data else None
    except Exception:
        generated_id = None

    return {
        "id":        generated_id,
        "output":    response.content,
        "provider":  response.provider,
        "model":     response.model,
        "plan_type": plan_type,
    }
