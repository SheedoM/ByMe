from fastapi import APIRouter, UploadFile, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
from ..config import get_supabase
from ..middleware.auth import get_current_user
from ..services.csv_parser import parse_linkedin_posts_file, validate_posts_file
from ..services.style_extractor import extract_and_store_style

router = APIRouter()


class SelectPostsRequest(BaseModel):
    count: int | None = None        # top-N by date; None means "all"
    ids: list[str] | None = None    # explicit post IDs to mark in_style; overrides count


@router.post("/upload")
async def upload_posts(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    content = await file.read()

    # Validate and import the user-provided LinkedIn export.
    is_valid, error_msg = validate_posts_file(content, file.filename or "")
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    parsed = parse_linkedin_posts_file(content, file.filename or "")
    posts = parsed["posts"]
    db = get_supabase()

    # Clear old raw posts and insert new ones
    db.table("raw_posts").delete().eq("user_id", user_id).execute()
    db.table("raw_posts").insert([
        {
            "user_id":    user_id,
            "content":    p["content"],
            "post_date":  str(p["post_date"]) if p["post_date"] else None,
            "share_link": p.get("share_link"),
        }
        for p in posts
    ]).execute()

    # Mark profile as pending. Analysis starts only after the user chooses a provider.
    db.table("style_profiles").upsert({
        "user_id": user_id,
        "status":  "pending",
        "posts_analyzed": len(posts),
    }, on_conflict="user_id").execute()

    return {
        "status": "imported",
        "posts_found": len(posts),
        "usable_posts_found": parsed.get("usable_posts_found", len(posts)),
        "posts_used": parsed.get("posts_used", len(posts)),
        "import_source": parsed["import_source"],
    }


@router.post("/select")
async def select_posts(
    body: SelectPostsRequest,
    user_id: str = Depends(get_current_user),
):
    """Mark the N most recent posts as in_style=True; mark the rest False."""
    db = get_supabase()
    result = db.table("raw_posts") \
               .select("id, post_date") \
               .eq("user_id", user_id) \
               .order("post_date", desc=True, nullsfirst=False) \
               .execute()
    posts = result.data or []

    if not posts:
        raise HTTPException(status_code=400, detail="No posts found. Upload your LinkedIn archive first.")

    all_ids = [p["id"] for p in posts]

    if body.ids is not None:
        # Explicit selection — user picked specific posts
        allowed = set(all_ids)  # security: only permit the user's own post IDs
        chosen      = [id for id in body.ids if id in allowed]
        not_chosen  = [id for id in all_ids if id not in set(body.ids)]
        if len(chosen) < 5:
            raise HTTPException(
                status_code=400,
                detail="Please select at least 5 posts for a meaningful style analysis."
            )
        if chosen:
            db.table("raw_posts").update({"in_style": True}).in_("id", chosen).execute()
        if not_chosen:
            db.table("raw_posts").update({"in_style": False}).in_("id", not_chosen).execute()
        return {"status": "ok", "selected": len(chosen)}

    count = body.count
    if count is None or count >= len(posts):
        db.table("raw_posts").update({"in_style": True}).eq("user_id", user_id).execute()
        selected = len(posts)
    else:
        selected_ids     = [p["id"] for p in posts[:count]]
        not_selected_ids = [p["id"] for p in posts[count:]]
        db.table("raw_posts").update({"in_style": True}).in_("id", selected_ids).execute()
        db.table("raw_posts").update({"in_style": False}).in_("id", not_selected_ids).execute()
        selected = count

    return {"status": "ok", "selected": selected}


@router.post("/analyze")
async def analyze_posts(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    db = get_supabase()
    result = db.table("raw_posts") \
               .select("content, post_date") \
               .eq("user_id", user_id) \
               .eq("in_style", True) \
               .order("post_date", desc=True, nullsfirst=False) \
               .execute()

    posts = getattr(result, "data", None) or []
    if len(posts) < 5:
        raise HTTPException(
            status_code=400,
            detail="Upload at least 5 usable LinkedIn posts before analysis."
        )

    db.table("style_profiles").upsert({
        "user_id": user_id,
        "status":  "processing",
    }, on_conflict="user_id").execute()

    background_tasks.add_task(extract_and_store_style, user_id, posts)
    return {"status": "processing", "posts_found": len(posts)}


@router.get("/status")
async def get_status(user_id: str = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("style_profiles") \
               .select("status") \
               .eq("user_id", user_id) \
               .maybe_single() \
               .execute()
    if not result.data:
        return {"status": "none"}
    return {"status": result.data["status"]}


@router.get("/profile")
async def get_profile(user_id: str = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("style_profiles") \
               .select("*") \
               .eq("user_id", user_id) \
               .maybe_single() \
               .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No style profile found")
    return result.data


@router.get("/posts")
async def get_raw_posts(user_id: str = Depends(get_current_user)):
    """Return all raw posts for the user (id, preview, share_link, date, in_style)."""
    db = get_supabase()
    result = db.table("raw_posts") \
               .select("id, content, share_link, post_date, in_style") \
               .eq("user_id", user_id) \
               .order("post_date", desc=True, nullsfirst=False) \
               .execute()
    posts = result.data or []
    # Return a preview (first 200 chars) rather than full content
    return [
        {
            "id":         p["id"],
            "preview":    (p["content"] or "")[:200],
            "share_link": p.get("share_link"),
            "post_date":  p.get("post_date"),
            "in_style":   p.get("in_style", True),
        }
        for p in posts
    ]


@router.get("/export")
async def export_style(user_id: str = Depends(get_current_user)):
    """Build and return a ready-to-use prompt package from the user's style profile."""
    db = get_supabase()

    profile_result = db.table("style_profiles") \
                       .select("*") \
                       .eq("user_id", user_id) \
                       .maybe_single() \
                       .execute()
    if not profile_result.data:
        raise HTTPException(status_code=404, detail="No style profile found")
    profile = profile_result.data

    posts_result = db.table("raw_posts") \
                     .select("content") \
                     .eq("user_id", user_id) \
                     .eq("in_style", True) \
                     .order("post_date", desc=True, nullsfirst=False) \
                     .limit(5) \
                     .execute()
    examples = posts_result.data or []

    opening_patterns = profile.get("opening_patterns") or []
    closing_patterns  = profile.get("closing_patterns")  or []
    opening_str = "\n".join(f'  • "{p}"' for p in opening_patterns) or "  Not specified"
    closing_str  = "\n".join(f'  • "{p}"' for p in closing_patterns)  or "  Not specified"

    examples_block = ""
    for i, post in enumerate(examples, 1):
        examples_block += f"\n--- Example {i} ---\n{post['content']}\n"

    system_prompt = f"""You are a LinkedIn ghostwriter. Write posts that sound exactly like this person.

THEIR VOICE:
- Tone: {profile.get('tone', 'not specified')}
- Language & register: {profile.get('language_style_notes', 'not specified')}
- Formality: {profile.get('formality_level', 5)}/10
- Structure: {profile.get('structure_preference', 'not specified')}, {profile.get('paragraph_length', 'not specified')} paragraphs
- Emoji usage: {profile.get('emoji_usage', 'none')}
- How they open posts:
{opening_str}
- How they close posts:
{closing_str}
- Vocabulary & phrasing: {profile.get('vocabulary_notes', 'not specified')}
- Overall voice: {profile.get('raw_summary', 'not specified')}

REAL EXAMPLES FROM THEIR POSTS:{examples_block}
Write only the post. No explanation, no preamble, no title."""

    post_template = """Write a LinkedIn post about:

Topic: [YOUR TOPIC HERE]
Key points:
- [KEY POINT 1]
- [KEY POINT 2]
- [KEY POINT 3]
Post type: [story / lesson / hot take / observation / update]"""

    instructions = """HOW TO USE THIS PROMPT PACKAGE
═══════════════════════════════

CHATGPT:
1. Go to chatgpt.com and open a new chat
2. Click Settings → Personalization → Custom Instructions
   Paste the SYSTEM PROMPT into the first box
   OR simply paste the system prompt at the start of any conversation
3. Then send the POST TEMPLATE filled in with your topic

CLAUDE (claude.ai):
1. Go to claude.ai → create a new Project
2. In the Project instructions, paste the SYSTEM PROMPT
3. Use the POST TEMPLATE in your messages inside that project

GEMINI:
1. Go to gemini.google.com
2. Paste the SYSTEM PROMPT first, then immediately follow with the POST TEMPLATE

TIP: The system prompt is reusable — just send a new POST TEMPLATE each time you want a new post."""

    full_package = f"""╔══════════════════════════════════════╗
║       YOUR BYME STYLE PROFILE        ║
╚══════════════════════════════════════╝

{'═' * 42}
SECTION 1 — SYSTEM PROMPT
(Paste this as your System Prompt or Custom Instruction)
{'═' * 42}

{system_prompt}


{'═' * 42}
SECTION 2 — POST TEMPLATE
(Use this each time you want a new post)
{'═' * 42}

{post_template}


{'═' * 42}
SECTION 3 — HOW TO USE
{'═' * 42}

{instructions}
"""

    return {
        "system_prompt":  system_prompt,
        "post_template":  post_template,
        "instructions":   instructions,
        "full_package":   full_package,
    }


@router.put("/profile")
async def update_profile(
    updates: dict,
    user_id: str = Depends(get_current_user)
):
    """Allow users to manually edit their style profile fields."""
    allowed_fields = {
        "tone", "formality_level", "avg_post_length",
        "opening_patterns", "closing_patterns", "emoji_usage",
        "structure_preference", "paragraph_length",
        "storytelling_style", "vocabulary_notes", "raw_summary",
        "language_style_notes"
    }
    safe_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    if not safe_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    db = get_supabase()
    db.table("style_profiles") \
      .update(safe_updates) \
      .eq("user_id", user_id) \
      .execute()
    return {"status": "updated"}
