# ByMe — Full Audit & Implementation Plan

> This document covers: what was built, what's wrong with it (with exact file references),
> and a step-by-step plan to fix bugs and add the three new features.
> Follow Part 3 top to bottom without skipping.

---

## Part 1: Audit — What Was Built

### What You Did Well

Before the bugs — and there are real bugs — this is genuinely solid work.

**The BYOK architecture is production-quality.** Fernet encryption for stored API keys, a clean free/byok toggle baked into onboarding, the OpenRouter free tier approach — these are real product decisions, not just code. Most people building an MVP wouldn't think this through.

**The LLM factory is correctly implemented.** The `create_provider()` function accepting `api_key` as a parameter, and the OpenAI provider supporting `base_url` for OpenRouter compatibility — clean, future-proof, exactly right.

**The 4-step onboarding** (upload → processing → provider → review) is better than the original plan. Adding the ProviderStep in between processing and review gives it a natural "setup" feel. The `StepIndicator` with checkmarks for completed steps is a nice UX detail.

**Authentication approach is correct.** Using `db.auth.get_user(token)` instead of local PyJWT decoding is more reliable — no JWT secret mismatch possible. The comment in `api.js` explaining why you removed the auto-signout on 401 ("causes redirect loops") shows good judgment.

**The design tokens match the mockup.** `ink`, `paper`, `surface`, `amber`, `emerald` — all correctly defined. The Fraunces + DM Sans combination is in place.

**RLS policies are in place for all four tables.** This is often skipped in MVPs. Don't skip it.

---

### Critical Bugs

These will break the app in production.

---

**Bug 1 — `GeminiProvider` requires `api_key` with no default**

File: `backend/app/llm/gemini.py`

```python
# Current — api_key is required, no default
def __init__(self, api_key: str, model: str | None = None):
```

Every other provider can fall back to an environment variable:
```python
# ClaudeProvider
key = api_key or os.getenv("ANTHROPIC_API_KEY")
```

Gemini cannot. If `create_provider("gemini", api_key, model)` is called but the user's key fails to decrypt, the whole call fails with a confusing Python error instead of your 502. Also means you can never have a default Gemini instance.

**Fix:**
```python
def __init__(self, api_key: str | None = None, model: str | None = None):
    key = api_key or os.getenv("GOOGLE_API_KEY")
    if not key:
        raise ValueError("Gemini requires an API key. Set GOOGLE_API_KEY or pass api_key.")
    self._client = genai.Client(api_key=key)
    self._model_name = model or "gemini-1.5-flash"
```

---

**Bug 2 — Background task receives a request-scoped Supabase client**

File: `backend/app/routers/style.py`

```python
# Current — db is created in the request and passed to background task
db = get_supabase()
background_tasks.add_task(extract_and_store_style, db, user_id, posts)
```

The Supabase client is instantiated per-request. Passing it to a background task that outlives the request is technically valid in FastAPI but Supabase's HTTP client has connection state that may not survive cleanly. The background task should create its own client.

**Fix in `style_extractor.py`:**
```python
async def extract_and_store_style(user_id: str, posts: List[dict]) -> None:
    """Background task — creates its own DB client, never uses the request's."""
    from ..config import get_supabase  # import here to avoid circular imports
    db = get_supabase()
    try:
        profile_data = await extract_style(posts)
        profile_data["user_id"] = user_id
        profile_data["status"] = "ready"
        profile_data["posts_analyzed"] = len(posts)
        db.table("style_profiles").upsert(profile_data, on_conflict="user_id").execute()
    except Exception as e:
        db.table("style_profiles").upsert(
            {"user_id": user_id, "status": "failed"}, on_conflict="user_id"
        ).execute()
        raise e
```

**Fix in `style.py` router:**
```python
# Remove db from the background task call
background_tasks.add_task(extract_and_store_style, user_id, posts)
```

---

**Bug 3 — `OPENROUTER_API_KEY` read directly in factory, bypassing `config.py`**

File: `backend/app/llm/factory.py`

```python
# Current — reads env var directly
api_key = os.getenv("OPENROUTER_API_KEY")
```

But `config.py` is where all env vars are centralized. This one slipped through. When someone adds logging or validation to config, this one gets missed.

**Fix in `config.py`:**
```python
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
```

**Fix in `factory.py`:**
```python
from ..config import OPENROUTER_API_KEY

def get_free_tier_provider() -> BaseLLMProvider:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set.")
    return OpenAIProvider(
        api_key=OPENROUTER_API_KEY,
        model="google/gemini-2.0-flash-lite-preview-02-05:free",
        base_url="https://openrouter.ai/api/v1"
    )
```

---

**Bug 4 — `generate` endpoint does not return the post `id`**

File: `backend/app/services/post_generator.py`

The generate endpoint returns `{output, provider, model, plan_type}` — no `id`. This means the frontend has no way to reference the post for feedback submission (which we're about to build). The insert is already happening, but the `id` is never surfaced.

**Fix — capture and return the id:**
```python
# After the insert:
insert_result = db.table("generated_posts").insert({...}).execute()
generated_id = insert_result.data[0]["id"] if insert_result.data else None

return {
    "id":       generated_id,
    "output":   response.content,
    "provider": response.provider,
    "model":    response.model,
    "plan_type": plan_type,
}
```

---

**Bug 5 — `debug_extract.py` committed to the repo**

File: `backend/debug_extract.py`

This is a debugging script. It should not be in the repo. Delete it or add it to `.gitignore`.

---

### Medium Issues

These don't break the app today but will cause problems as it grows.

---

**Issue 1 — Double API call for provider settings on Generator page**

`Generator.jsx` calls `getProviderSettings()` in its own `useEffect`. `ModelSelector.jsx` also calls `getProviderSettings()` in its own `useEffect`. That's two identical network calls on every page load.

**Fix:** Lift the provider state up. `Generator.jsx` already fetches it — pass it down as a prop to `ModelSelector` instead of having `ModelSelector` fetch it again.

---

**Issue 2 — `useStyleProfile` makes an API call on every protected page navigation**

`OnboardingGuard` uses `useStyleProfile()` which calls `getStyleProfile()` every time. That's one API call for every page the user visits.

**Fix:** Cache the profile in `AuthContext` or a lightweight `StyleProfileContext`. Once loaded and `status === 'ready'`, skip the fetch on subsequent navigations.

---

**Issue 3 — Free tier is described as "Gemini Flash" but actually uses OpenRouter**

In the UI: `ByMe Free · Gemini Flash`. In the backend: OpenRouter proxy to Gemini. If OpenRouter has an outage or changes the model name, the UI promise breaks silently.

**Fix (short-term):** Change UI copy to `ByMe Free · Powered by Gemini` — same message, removes the specific "Flash" claim.

**Fix (long-term):** Add a direct Gemini API key (`BYME_GEMINI_API_KEY` is already in `config.py` but unused) and use `GeminiProvider` directly for the free tier. This eliminates the OpenRouter dependency.

---

**Issue 4 — `OnboardingGuard` doesn't check for `user_settings`**

A user can technically have a `ready` style profile but no `user_settings` row (e.g., created through an API call or if the ProviderStep failed silently). `OnboardingGuard` would let them into the app, and generation would silently fall back to free tier even if they intended BYOK.

**Fix:** The guard is acceptable as-is for MVP. For V2, add a `hasSettings` check.

---

**Issue 5 — No error boundary in the React app**

If any component throws an unhandled exception, the whole page goes blank. There is no fallback UI.

**Fix:** Add a simple `ErrorBoundary` class component at the root of `App.jsx`.

---

### Design Observations (not bugs, but worth knowing)

**The `BYME_GEMINI_API_KEY` env var in `config.py` is defined but never used.** It was probably intended for direct Gemini access but then OpenRouter was used instead. Either use it or remove it to avoid confusion.

**Model versions in `factory.py` are the 2024 generation.** `claude-3-5-sonnet-20241022` is functional but there are newer models available. This is a config update, not a code fix.

**The `provider` parameter in `generatePost` service was correctly removed.** The design decision to make provider selection a setting (not per-generation) is the right call for the BYOK model. It simplifies the UI significantly.

---

## Part 2: New Feature Design

### Feature 1 — Explicit Feedback System

**Why not silent tracking:** The user is right. Copying a post immediately is the most common behavior regardless of quality. Someone copies, pastes into their notes, edits it there — the "immediate copy = positive" assumption would poison the style profile.

**The design:** After a post is generated, show a lightweight feedback row beneath the copy button. Three choices. One click. No mandatory interaction — users who skip it are fine.

```
Was this in your voice?
[ ✓ Nailed it ]  [ ~ Almost ]  [ ✗ Not quite ]
```

The feedback disappears after it's submitted — one-time per generation.

**V1 behavior:** Store the rating in the DB. Style profile doesn't change yet.
**V2 behavior:** Run a background job that re-weights the style profile based on accumulated ratings — treating "nailed it" generations as examples of what to learn from.

**DB change needed:** Add `feedback` column to `generated_posts`.

---

### Feature 2 — Hook Variants

**The problem:** The hardest part of a LinkedIn post is the opening line. The rest usually flows. One generation gives you one opening — you either like it or regenerate the whole post hoping for a better hook.

**The design:** Add a "Try different hooks" button in the InputPanel. When clicked, the backend generates 3 opening lines for the given topic — all in the user's voice. The user clicks one they like, which is then locked in and the full post is generated using that specific hook as the opening.

```
[ Write my post ]  [ Try different hooks ]

 Hook options:
 1. "I used to think shipping fast was the mark of a good engineer."   → Use this
 2. "Three years ago I made every mistake in the book."                → Use this
 3. "Nobody teaches you this in a CS degree."                         → Use this
```

**Implementation:** New `POST /generate/hooks` endpoint. Takes topic + key_points. Returns an array of 3 strings. New prompt in `prompts/hooks.py`. Frontend shows hook options inline, user clicks one, then the normal generate call adds the selected hook as a constraint.

---

### Feature 3 — Post Type Selector

**The problem:** "Topic + key points → post" is too open-ended. The same topic can be written as a personal story, a hot take, a lesson, an observation, or an update — and they feel completely different even if the words overlap.

**The design:** A horizontal pill selector above the input. Five types. Each one modifies the generation prompt with a structural constraint.

```
[ Story ]  [ Hot take ]  [ Lesson ]  [ Observation ]  [ Update ]
```

| Type | What it does to the prompt |
|---|---|
| Story | "Open with a specific moment or scene. Use the story to make the point." |
| Hot take | "Open with a bold or contrarian statement. Defend it with the key points." |
| Lesson | "Open with the insight, then unpack how you learned it." |
| Observation | "Open with something you've been noticing. Connect it to a broader idea." |
| Update | "Share a personal or professional development. Keep it grounded and human." |

**Default:** Story — as it's the most versatile and performs best on LinkedIn generally.

---

## Part 3: Implementation Plan

Execute in this order. Do not jump ahead.

---

### Step 1 — Database Migration

**File to create:** `supabase/migrations/003_feedback_and_post_type.sql`

```sql
-- ========================================
-- FEEDBACK
-- Stores the user's 1-click rating on each
-- generated post. Used for future style
-- profile improvement (V2 feature).
-- ========================================
ALTER TABLE generated_posts
  ADD COLUMN feedback     VARCHAR(20),  -- 'nailed_it' | 'almost' | 'not_quite' | NULL
  ADD COLUMN post_type    VARCHAR(20),  -- 'story' | 'hot_take' | 'lesson' | 'observation' | 'update'
  ADD COLUMN selected_hook TEXT;         -- the hook the user selected, if hook variants were used

-- Run this in Supabase SQL Editor.
```

---

### Step 2 — Fix Critical Bugs (Backend)

**2a. Fix `gemini.py`**

```python
# backend/app/llm/gemini.py — change __init__ signature
def __init__(self, api_key: str | None = None, model: str | None = None):
    key = api_key or os.getenv("GOOGLE_API_KEY")
    if not key:
        raise ValueError("Gemini requires an API key. Set GOOGLE_API_KEY or pass api_key.")
    self._client = genai.Client(api_key=key)
    self._model_name = model or "gemini-1.5-flash"
```

**2b. Fix `config.py`**

```python
# Add this line
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
```

**2c. Fix `factory.py`**

```python
# Replace os.getenv call with config import
from ..config import OPENROUTER_API_KEY

def get_free_tier_provider() -> BaseLLMProvider:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set. Cannot serve free tier users.")
    return OpenAIProvider(
        api_key=OPENROUTER_API_KEY,
        model="google/gemini-2.0-flash-lite-preview-02-05:free",
        base_url="https://openrouter.ai/api/v1"
    )
```

**2d. Fix `style_extractor.py` — background task creates its own DB client**

```python
# Remove db parameter from extract_and_store_style
async def extract_and_store_style(user_id: str, posts: List[dict]) -> None:
    from ..config import get_supabase
    db = get_supabase()
    try:
        profile_data = await extract_style(posts)
        profile_data["user_id"] = user_id
        profile_data["status"] = "ready"
        profile_data["posts_analyzed"] = len(posts)
        db.table("style_profiles").upsert(profile_data, on_conflict="user_id").execute()
    except Exception as e:
        db.table("style_profiles").upsert(
            {"user_id": user_id, "status": "failed"}, on_conflict="user_id"
        ).execute()
        raise e
```

**2e. Fix `style.py` router — remove `db` from background task call**

```python
# Change this line
background_tasks.add_task(extract_and_store_style, user_id, posts)
# (db is no longer passed — the function creates its own)
```

**2f. Fix `post_generator.py` — return the generated post `id`**

```python
# Capture the id from the insert result
insert_result = db.table("generated_posts").insert({
    "user_id":       user_id,
    "topic":         topic,
    "key_points":    "\n".join(key_points),
    "provider_used": response.provider,
    "model_used":    response.model,
    "plan_type":     plan_type,
    "output":        response.content,
    "tokens_used":   response.tokens_used,
    "post_type":     post_type,       # new field — add this parameter to the function signature
    "selected_hook": selected_hook,   # new field — add this parameter too
}).execute()

generated_id = insert_result.data[0]["id"] if insert_result.data else None

return {
    "id":        generated_id,    # ← NEW
    "output":    response.content,
    "provider":  response.provider,
    "model":     response.model,
    "plan_type": plan_type,
}
```

**2g. Delete `backend/debug_extract.py`**

---

### Step 3 — New Backend: Prompt Updates

**3a. Update `prompts/post_generation.py` — add post type and hook constraints**

```python
# Add this to the bottom of the file

POST_TYPE_CONSTRAINTS = {
    "story": (
        "STRUCTURE: Open with a specific moment, scene, or personal experience. "
        "Use the story to earn the right to make the key points. "
        "The insight comes from the lived experience — not as an abstract lesson."
    ),
    "hot_take": (
        "STRUCTURE: Open with a bold, contrarian, or provocative statement. "
        "This post takes a clear position that not everyone will agree with. "
        "Use the key points to defend the take, not soften it."
    ),
    "lesson": (
        "STRUCTURE: Lead with the insight or takeaway. "
        "Then explain how you arrived at it — the experience, the mistake, or the realization. "
        "This post teaches first, then shows why you know it."
    ),
    "observation": (
        "STRUCTURE: Open with something you have been noticing, seeing, or thinking about lately. "
        "Connect the observation to a broader idea or question. "
        "This post invites the reader to see something differently."
    ),
    "update": (
        "STRUCTURE: Share a personal or professional development — a milestone, a new direction, "
        "or a reflection on something that just happened. "
        "Keep it grounded and human. Do not oversell the achievement."
    ),
}


# Update GENERATION_SYSTEM to accept post_type_constraint:
GENERATION_SYSTEM = """
You are a LinkedIn ghostwriter. You write posts that sound exactly like the person described below.

Not like an AI. Not like a template. Not like a generic LinkedIn post.
Like this specific human, on their best writing day.

THEIR WRITING STYLE PROFILE:

Tone: {tone}
Formality (1=very casual, 10=very formal): {formality_level}
Typical post length: ~{avg_post_length} words
How they typically open posts: {opening_patterns}
How they typically close posts: {closing_patterns}
Emoji usage: {emoji_usage}
Structure preference: {structure_preference}
Paragraph length: {paragraph_length}
Storytelling style: {storytelling_style}
Vocabulary notes: {vocabulary_notes}
Overall voice: {raw_summary}

POST TYPE INSTRUCTION:
{post_type_constraint}

{hook_constraint}

CRITICAL RULES:
1. Match the formality level exactly. Do not write more formally or casually.
2. Match their structure — if they write prose, write prose. If bullets, use bullets.
3. Follow the POST TYPE INSTRUCTION above. This overrides the opening pattern guidance.
4. Close the post the way they typically close.
5. Stay within ~20 words of their typical post length. Do not over-write.
6. Use their vocabulary. Avoid words or phrases they would never use.
7. If emoji_usage is "none", use zero emojis. If "minimal", use 1 to 2 maximum.
8. The goal: if someone who knows this person read this post, they would say "yes, that's them."

Write only the post. No explanation, no preamble, no title.
"""
```

**3b. Create `prompts/hooks.py`**

```python
# backend/app/prompts/hooks.py

HOOKS_SYSTEM = """
You are a LinkedIn copywriter specializing in opening lines.
Your job is to write opening lines (hooks) for LinkedIn posts that match
a specific person's writing voice exactly.

You will be given:
- A topic and key points for a post
- The person's writing style profile

Return ONLY a valid JSON array of exactly 3 strings.
Each string is a single opening line (hook) — the first 1-2 sentences of a LinkedIn post.
No preamble, no explanation, no markdown.

Example output:
["Hook one here.", "Hook two here.", "Hook three here."]

Rules:
- Each hook must sound like a natural opening for this specific person — their vocabulary, their rhythm.
- Each hook must take a different angle or framing of the topic.
- Hooks should create curiosity or a strong feeling. They should make someone want to read the next line.
- Do NOT use generic LinkedIn openers like "I'm excited to share" or "Today I want to talk about".
- Keep each hook under 30 words.

THEIR WRITING STYLE PROFILE:
Tone: {tone}
Formality: {formality_level}/10
Opening patterns: {opening_patterns}
Vocabulary notes: {vocabulary_notes}
Overall voice: {raw_summary}
"""

HOOKS_USER = """
Topic: {topic}

Key points:
{key_points}
"""
```

---

### Step 4 — New Backend: Services

**4a. Create `services/hook_generator.py`**

```python
# backend/app/services/hook_generator.py
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
               .select("tone, formality_level, opening_patterns, vocabulary_notes, raw_summary") \
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

    settings = settings_result.data or {}
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
        raw_summary=      profile.get("raw_summary", "not specified"),
    )

    key_points_str = "\n".join(f"- {point}" for point in key_points)
    user_prompt = HOOKS_USER.format(topic=topic, key_points=key_points_str)

    response = await provider.generate(
        system_prompt=system,
        user_prompt=user_prompt,
        temperature=0.9   # higher temp for variety between hooks
    )

    # Parse the JSON array
    clean = response.content.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]

    hooks = json.loads(clean)

    if not isinstance(hooks, list) or len(hooks) < 1:
        raise ValueError("LLM returned invalid hooks format.")

    return hooks[:3]  # always cap at 3
```

---

### Step 5 — New Backend: Updated `post_generator.py` Signature

Add `post_type` and `selected_hook` parameters to `generate_post`:

```python
async def generate_post(
    db: Client,
    user_id: str,
    topic: str,
    key_points: list[str],
    post_type: str = "story",          # ← new
    selected_hook: str | None = None,  # ← new
) -> dict:
```

In the prompt building section:

```python
from ..prompts.post_generation import GENERATION_SYSTEM, GENERATION_USER, POST_TYPE_CONSTRAINTS

# Get the post type constraint
post_type_constraint = POST_TYPE_CONSTRAINTS.get(
    post_type,
    POST_TYPE_CONSTRAINTS["story"]
)

# Build hook constraint if a hook was selected
hook_constraint = ""
if selected_hook:
    hook_constraint = (
        f"HOOK CONSTRAINT: You MUST begin this post with the following opening line exactly as written:\n"
        f'"{selected_hook}"\n'
        f"Do not alter it. Continue the post naturally from there."
    )

system = GENERATION_SYSTEM.format(
    # ... existing fields ...
    post_type_constraint=post_type_constraint,
    hook_constraint=hook_constraint,
)
```

---

### Step 6 — New Backend: Updated Routes

**6a. Update `generate.py` router**

```python
from pydantic import BaseModel
from ..services.hook_generator import generate_hooks

class GenerateRequest(BaseModel):
    topic: str
    key_points: list[str]
    post_type: str = "story"           # ← new
    selected_hook: str | None = None   # ← new


class HooksRequest(BaseModel):
    topic: str
    key_points: list[str]


class FeedbackRequest(BaseModel):
    rating: str   # 'nailed_it' | 'almost' | 'not_quite'


@router.post("/")
async def generate(request: GenerateRequest, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    points = [p for p in request.key_points if p.strip()]
    if not points:
        raise HTTPException(status_code=400, detail="At least one key point is required")
    valid_types = {"story", "hot_take", "lesson", "observation", "update"}
    if request.post_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"post_type must be one of: {valid_types}")

    result = await generate_post(
        db=db,
        user_id=user_id,
        topic=request.topic,
        key_points=points,
        post_type=request.post_type,
        selected_hook=request.selected_hook,
    )
    return result


@router.post("/hooks")
async def generate_hook_variants(
    request: HooksRequest,
    user_id: str = Depends(get_current_user)
):
    """Generate 3 opening hook options. Does not count against generation quota."""
    db = get_supabase()
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    points = [p for p in request.key_points if p.strip()]
    if not points:
        raise HTTPException(status_code=400, detail="At least one key point is required")
    try:
        hooks = await generate_hooks(db=db, user_id=user_id, topic=request.topic, key_points=points)
        return {"hooks": hooks}
    except Exception as e:
        raise HTTPException(status_code=502, detail="Could not generate hooks. Please try again.")


@router.post("/{post_id}/feedback")
async def submit_feedback(
    post_id: str,
    request: FeedbackRequest,
    user_id: str = Depends(get_current_user)
):
    """Store the user's 1-click rating on a generated post."""
    valid_ratings = {"nailed_it", "almost", "not_quite"}
    if request.rating not in valid_ratings:
        raise HTTPException(status_code=400, detail=f"rating must be one of: {valid_ratings}")

    db = get_supabase()
    # Verify this post belongs to this user before updating
    result = db.table("generated_posts") \
               .update({"feedback": request.rating}) \
               .eq("id", post_id) \
               .eq("user_id", user_id) \
               .execute()

    return {"status": "saved"}
```

---

### Step 7 — New Frontend: Services

**7a. Update `frontend/src/services/generate.js`**

```javascript
import api from './api'

export const generatePost = ({ topic, key_points, post_type = 'story', selected_hook = null }) =>
  api.post('/generate/', { topic, key_points, post_type, selected_hook })

export const generateHooks = ({ topic, key_points }) =>
  api.post('/generate/hooks', { topic, key_points })

export const submitFeedback = (postId, rating) =>
  api.post(`/generate/${postId}/feedback`, { rating })

export const getHistory = (limit = 20) =>
  api.get(`/generate/history?limit=${limit}`)

export const getUsage = () =>
  api.get('/generate/usage')
```

---

### Step 8 — New Frontend: Components

**8a. Create `components/generator/PostTypeSelector.jsx`**

```jsx
const POST_TYPES = [
  { id: 'story',       label: 'Story',       desc: 'Open with a moment'         },
  { id: 'hot_take',    label: 'Hot take',    desc: 'Lead with a bold claim'     },
  { id: 'lesson',      label: 'Lesson',      desc: 'Insight first, then why'    },
  { id: 'observation', label: 'Observation', desc: 'Something you noticed'      },
  { id: 'update',      label: 'Update',      desc: 'Share what just happened'   },
]

export default function PostTypeSelector({ value, onChange }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
        Post type
      </p>
      <div className="flex flex-wrap gap-2">
        {POST_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => onChange(type.id)}
            title={type.desc}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              value === type.id
                ? 'bg-ink text-paper border-ink'
                : 'bg-transparent text-muted border-border hover:border-muted hover:text-ink'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**8b. Create `components/generator/HookVariants.jsx`**

```jsx
import { useState } from 'react'
import { generateHooks } from '../../services/generate'
import Spinner from '../ui/Spinner'

export default function HookVariants({ topic, keyPoints, onSelect }) {
  const [hooks,   setHooks]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [chosen,  setChosen]  = useState(null)

  const handleGenerate = async () => {
    const points = keyPoints.filter(p => p.trim())
    if (!topic.trim() || !points.length) return
    setLoading(true)
    setError(null)
    setHooks([])
    setChosen(null)
    try {
      const { data } = await generateHooks({ topic, key_points: points })
      setHooks(data.hooks || [])
    } catch {
      setError('Could not generate hooks. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (hook) => {
    setChosen(hook)
    onSelect(hook)
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className="text-xs text-muted underline underline-offset-2 hover:text-ink
                   transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating hooks…' : hooks.length ? 'Regenerate hooks' : 'Try different hooks ↗'}
      </button>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Spinner size="sm" /> Crafting 3 opening lines…
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {hooks.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted uppercase tracking-wide">Pick a hook to build from:</p>
          {hooks.map((hook, i) => (
            <button
              key={i}
              onClick={() => handleSelect(hook)}
              className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                chosen === hook
                  ? 'border-amber bg-amber-light/30 text-ink'
                  : 'border-border bg-paper text-ink hover:border-muted'
              }`}
            >
              <span className="text-xs text-muted mr-2">{i + 1}.</span>
              {hook}
              {chosen === hook && (
                <span className="ml-2 text-xs text-amber font-medium">selected</span>
              )}
            </button>
          ))}
          {chosen && (
            <p className="text-xs text-muted pt-1">
              Hook locked in. Hit "Write my post" to generate with this opening.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

**8c. Update `components/generator/OutputPanel.jsx` — add feedback UI**

Add this below the copy button:

```jsx
import { useState } from 'react'
import { submitFeedback } from '../../services/generate'
import { copyToClipboard } from '../../utils/format'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

export default function OutputPanel({ output, loading, providerInfo, postId }) {
  const [copied,    setCopied]    = useState(false)
  const [feedback,  setFeedback]  = useState(null)  // null | 'nailed_it' | 'almost' | 'not_quite'
  const [fbSaving,  setFbSaving]  = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(output)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFeedback = async (rating) => {
    if (!postId || feedback) return  // only once per generation
    setFbSaving(true)
    try {
      await submitFeedback(postId, rating)
      setFeedback(rating)
    } catch {
      // fail silently — feedback is non-critical
    } finally {
      setFbSaving(false)
    }
  }

  // ... (keep existing loading and empty states)

  return (
    <div className="flex flex-col h-full">
      {/* Post output */}
      <div className="flex-1 bg-paper border border-border rounded-2xl p-6 text-ink
                      leading-relaxed min-h-[300px] overflow-y-auto whitespace-pre-wrap">
        {output}
      </div>

      {/* Footer row — copy + provider label */}
      <div className="flex items-center justify-between mt-4">
        {providerInfo && (
          <span className="text-xs text-muted">
            {providerInfo.plan_type === 'free'
              ? '⚡ ByMe Free · Gemini'
              : `🔑 ${providerInfo.provider} · ${providerInfo.model}`}
          </span>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="ml-auto"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </Button>
      </div>

      {/* Feedback row — only shown after generation, disappears after rating */}
      {output && postId && !feedback && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted mb-2">Was this in your voice?</p>
          <div className="flex gap-2">
            {[
              { id: 'nailed_it', label: '✓ Nailed it' },
              { id: 'almost',    label: '~ Almost'    },
              { id: 'not_quite', label: '✗ Not quite' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleFeedback(id)}
                disabled={fbSaving}
                className="text-xs px-3 py-1.5 rounded-full border border-border
                           text-muted hover:border-muted hover:text-ink
                           transition-all disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thank-you state after feedback submitted */}
      {feedback && (
        <p className="mt-4 pt-4 border-t border-border text-xs text-muted">
          Thanks — your feedback helps ByMe learn your voice.
        </p>
      )}
    </div>
  )
}
```

---

### Step 9 — Update `useGenerator.js`

```javascript
import { useState } from 'react'
import { generatePost } from '../services/generate'

export function useGenerator() {
  const [topic,        setTopic]        = useState('')
  const [keyPoints,    setKeyPoints]    = useState([''])
  const [postType,     setPostType]     = useState('story')       // ← new
  const [selectedHook, setSelectedHook] = useState(null)         // ← new
  const [output,       setOutput]       = useState('')
  const [postId,       setPostId]       = useState(null)         // ← new — for feedback
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  const generate = async () => {
    if (!topic.trim()) return
    const points = keyPoints.filter((p) => p.trim())
    if (!points.length) return

    setLoading(true)
    setError(null)
    setPostId(null)    // reset id for fresh feedback state
    try {
      const { data } = await generatePost({
        topic,
        key_points:    points,
        post_type:     postType,
        selected_hook: selectedHook,
      })
      setOutput(data.output)
      setPostId(data.id)    // ← store the id
      return data
    } catch (e) {
      const msg = e.response?.data?.detail || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // When user picks a hook variant — clear it when they change topic
  const handleTopicChange = (val) => {
    setTopic(val)
    setSelectedHook(null)
  }

  return {
    topic, setTopic: handleTopicChange,
    keyPoints, setKeyPoints,
    postType, setPostType,
    selectedHook, setSelectedHook,
    output, setOutput,
    postId,
    loading, error,
    generate,
  }
}
```

---

### Step 10 — Update `InputPanel.jsx`

```jsx
import Textarea        from '../ui/Textarea'
import KeyPointsList   from './KeyPointsList'
import PostTypeSelector from './PostTypeSelector'   // ← new
import HookVariants    from './HookVariants'         // ← new
import Button          from '../ui/Button'

export default function InputPanel({
  topic, setTopic,
  keyPoints, setKeyPoints,
  postType, setPostType,         // ← new
  selectedHook, setSelectedHook, // ← new
  onGenerate,
  loading,
  error,
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Post type */}
      <PostTypeSelector value={postType} onChange={setPostType} />

      {/* Topic */}
      <Textarea
        id="topic"
        label="Topic"
        placeholder="What do you want to write about today?"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={3}
        hint="Be specific — 'Lessons from my first product launch' beats 'my startup'."
      />

      {/* Key points */}
      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
          Key points to include
        </p>
        <KeyPointsList points={keyPoints} onChange={setKeyPoints} />
      </div>

      {/* Hook variants */}
      <HookVariants
        topic={topic}
        keyPoints={keyPoints}
        onSelect={setSelectedHook}
      />

      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <Button
        id="btn-generate"
        onClick={onGenerate}
        loading={loading}
        disabled={!topic.trim() || keyPoints.every((p) => !p.trim())}
        fullWidth
        size="lg"
      >
        {loading ? 'Generating…' : selectedHook ? 'Write from this hook →' : 'Write my post'}
      </Button>
    </div>
  )
}
```

---

### Step 11 — Update `Generator.jsx`

Pass the new state down:

```jsx
<InputPanel
  topic={topic}
  setTopic={setTopic}
  keyPoints={keyPoints}
  setKeyPoints={setKeyPoints}
  postType={postType}             {/* ← new */}
  setPostType={setPostType}       {/* ← new */}
  selectedHook={selectedHook}     {/* ← new */}
  setSelectedHook={setSelectedHook} {/* ← new */}
  onGenerate={handleGenerate}
  loading={loading}
  error={error}
/>

<OutputPanel
  output={output}
  loading={loading}
  providerInfo={providerInfo}
  postId={postId}   {/* ← new */}
/>
```

---

### Step 12 — Fix Double API Call

In `Generator.jsx`, remove the `useEffect` that calls `getProviderSettings()` separately.
Pass the already-fetched `providerInfo` down to `ModelSelector` as a prop.
`ModelSelector` should accept `settings` as a prop, not fetch it itself.

```jsx
// ModelSelector.jsx — accept settings as prop instead of fetching
export default function ModelSelector({ settings }) {
  if (!settings) return null
  // ... rest of the component
}

// Generator.jsx
<ModelSelector settings={providerInfo} />
```

---

### Step 13 — Minor UI Copy Fix

In `OutputPanel.jsx`, change:
```
⚡ ByMe Free · Gemini Flash
```
to:
```
⚡ ByMe Free · Powered by Gemini
```

Removes the "Flash" claim that depends on OpenRouter's model naming.

---

## Testing Checklist

Before shipping, manually verify:

- [ ] Upload a LinkedIn CSV → style extraction completes and shows profile
- [ ] Generate a post with each of the 5 post types — output structure should feel different
- [ ] Generate hook variants → 3 hooks appear → select one → generate → post opens with that hook
- [ ] Submit feedback for each of the 3 ratings → "thanks" message appears, no second submission possible
- [ ] Free tier hits the monthly limit → gets the 429 error with correct message
- [ ] BYOK user can generate without limit
- [ ] Switching provider in Settings takes effect immediately on next generation
- [ ] Re-uploading a new CSV clears old posts and regenerates the style profile
- [ ] User with no style profile is redirected to /onboarding from /app

---

## Summary of All Changes

| Category | File | Change |
|---|---|---|
| Bug fix | `llm/gemini.py` | api_key default + env var fallback |
| Bug fix | `config.py` | Add OPENROUTER_API_KEY |
| Bug fix | `llm/factory.py` | Use config.OPENROUTER_API_KEY |
| Bug fix | `services/style_extractor.py` | Background task creates own DB client |
| Bug fix | `routers/style.py` | Remove db from background task call |
| Bug fix | `services/post_generator.py` | Return generated post id |
| Delete | `backend/debug_extract.py` | Remove debug file |
| Migration | `003_feedback_and_post_type.sql` | feedback + post_type + selected_hook columns |
| New prompt | `prompts/post_generation.py` | POST_TYPE_CONSTRAINTS + updated GENERATION_SYSTEM |
| New file | `prompts/hooks.py` | Hook variant prompts |
| New file | `services/hook_generator.py` | Hook generation service |
| Update | `services/post_generator.py` | Accept post_type + selected_hook params |
| Update | `routers/generate.py` | New /hooks and /{id}/feedback endpoints |
| Update | `services/generate.js` | Add generateHooks + submitFeedback |
| New component | `generator/PostTypeSelector.jsx` | 5-type pill selector |
| New component | `generator/HookVariants.jsx` | Hook generation + selection UI |
| Update | `generator/OutputPanel.jsx` | Feedback row + postId prop |
| Update | `hooks/useGenerator.js` | postType, selectedHook, postId state |
| Update | `generator/InputPanel.jsx` | Wire in new components |
| Update | `pages/Generator.jsx` | Pass new state + postId to children |
| Update | `components/generator/ModelSelector.jsx` | Accept settings as prop, stop self-fetching |
| Copy fix | `OutputPanel.jsx` | "Gemini Flash" → "Powered by Gemini" |
