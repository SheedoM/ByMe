import json
from supabase import Client
from ..llm.factory import get_free_tier_provider, create_provider
from ..prompts.hooks import HOOKS_SYSTEM, HOOKS_USER
from ..services.encryption import decrypt_key
from ..config import ENCRYPTION_KEY


def _format_list(items: list) -> str:
    if not items:
        return "not specified"
    return " | ".join(f'"{item}"' for item in items)


def _loads_json_fragment(text: str):
    decoder = json.JSONDecoder()
    stripped = text.strip()

    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    for index, char in enumerate(stripped):
        if char not in "[{":
            continue
        try:
            value, _ = decoder.raw_decode(stripped[index:])
            return value
        except json.JSONDecodeError:
            continue

    raise ValueError("LLM did not return parseable hook JSON.")


def _parse_hooks_response(content: str) -> list[str]:
    clean = (content or "").strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else clean
        if clean.lstrip().startswith("json"):
            clean = clean.lstrip()[4:]

    data = _loads_json_fragment(clean)
    hooks = data.get("hooks") if isinstance(data, dict) else data

    if not isinstance(hooks, list) or len(hooks) < 1:
        raise ValueError("LLM returned invalid hooks format.")

    parsed_hooks = [hook.strip() for hook in hooks if isinstance(hook, str) and hook.strip()]
    if len(parsed_hooks) != len(hooks):
        raise ValueError("LLM returned non-string hooks.")

    return parsed_hooks[:3]


async def generate_hooks(
    db: Client,
    user_id: str,
    topic: str,
    key_points: list[str],
) -> list[str]:
    """
    Generates 3 opening hook options for a post.
    Uses the same provider selection logic as post generation.
    Returns a list of 3 hook strings.
    """
    # Fetch style profile
    result = db.table("style_profiles") \
               .select("tone, formality_level, opening_patterns, vocabulary_notes, language_style_notes, raw_summary") \
               .eq("user_id", user_id) \
               .single() \
               .execute()

    if not result.data:
        raise ValueError("No style profile found.")

    profile = result.data

    # Fetch user settings for provider
    settings_result = db.table("user_settings") \
                        .select("plan_type, byok_provider, byok_model, byok_api_key_encrypted") \
                        .eq("user_id", user_id) \
                        .maybe_single() \
                        .execute()

    settings = getattr(settings_result, 'data', None) or {}
    plan_type = settings.get("plan_type", "free")

    if plan_type == "free":
        provider = get_free_tier_provider()
    else:
        encrypted_key = settings.get("byok_api_key_encrypted")
        if not encrypted_key or not ENCRYPTION_KEY:
            provider = get_free_tier_provider()
        else:
            api_key = decrypt_key(encrypted_key, ENCRYPTION_KEY)
            provider = create_provider(
                settings.get("byok_provider", "gemini"),
                api_key,
                settings.get("byok_model")
            )

    system = HOOKS_SYSTEM.format(
        tone=             profile.get("tone", "not specified"),
        formality_level=  profile.get("formality_level", 5),
        opening_patterns= _format_list(profile.get("opening_patterns", [])),
        vocabulary_notes= profile.get("vocabulary_notes", "not specified"),
        language_style_notes=profile.get("language_style_notes", "not specified"),
        raw_summary=      profile.get("raw_summary", "not specified"),
    )

    key_points_str = "\n".join(f"- {point}" for point in key_points)
    user_prompt = HOOKS_USER.format(topic=topic, key_points=key_points_str)

    response = await provider.generate(
        system_prompt=system,
        user_prompt=user_prompt,
        temperature=0.9   # higher temp for variety between hooks
    )

    return _parse_hooks_response(response.content)
