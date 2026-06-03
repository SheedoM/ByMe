from fastapi import APIRouter, UploadFile, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
from ..config import get_supabase, MAX_UPLOAD_BYTES
from ..middleware.auth import get_current_user
from ..services.csv_parser import (
    parse_linkedin_posts_file,
    validate_posts_file,
    get_picker_candidates,
    parse_linkedin_analytics_excel,
)
from ..services.style_extractor import extract_and_store_style

router = APIRouter()


async def _read_capped(file: UploadFile) -> bytes:
    """
    Read an uploaded file into memory, but refuse anything over MAX_UPLOAD_BYTES.
    Reads in chunks so a huge file can't OOM the server before we reject it.
    """
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)  # 1 MB at a time
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


class SelectPostsRequest(BaseModel):
    count: int | None = None        # top-N by date; None means "all"
    ids: list[str] | None = None    # explicit post IDs to mark in_style; overrides count


class StarterProfileRequest(BaseModel):
    language_style_notes: str
    tone: str
    formality_level: int
    avg_post_length: int
    structure_preference: str
    paragraph_length: str
    emoji_usage: str
    storytelling_style: str | None = None
    vocabulary_notes: str | None = None


@router.post("/upload")
async def upload_posts(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    content = await _read_capped(file)

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
    """
    Return a curated subset of raw posts for the picker UI.
    If engagement scores exist, sorted by score desc.
    Otherwise a smart pre-filter: original, substantial, spread across time.
    """
    db = get_supabase()
    result = db.table("raw_posts") \
               .select("id, content, share_link, post_date, in_style, engagement_score") \
               .eq("user_id", user_id) \
               .order("post_date", desc=True, nullsfirst=False) \
               .execute()
    all_posts = result.data or []

    candidates = get_picker_candidates(all_posts)

    return [
        {
            "id":               p["id"],
            "preview":          (p.get("content") or "")[:200],
            "share_link":       p.get("share_link"),
            "post_date":        p.get("post_date"),
            "in_style":         p.get("in_style", True),
            "engagement_score": p.get("engagement_score"),
        }
        for p in candidates
    ]


@router.post("/analytics-upload")
async def upload_analytics(
    file: UploadFile,
    user_id: str = Depends(get_current_user),
):
    """
    Parse a LinkedIn Creator Analytics Excel export and update
    engagement_score on matching raw_posts rows.
    Matching: first by share_link URL, then by post_date as fallback.
    """
    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=400,
            detail="Please upload the LinkedIn Analytics Excel file (.xlsx)."
        )
    content = await _read_capped(file)

    try:
        analytics_rows = parse_linkedin_analytics_excel(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db = get_supabase()
    posts_result = db.table("raw_posts") \
                     .select("id, share_link, post_date") \
                     .eq("user_id", user_id) \
                     .execute()
    db_posts = posts_result.data or []

    # Clear previous scores so duplicate-date rows become NULL instead of
    # retaining a stale score from an earlier analytics upload.
    db.table("raw_posts") \
      .update({"engagement_score": None}) \
      .eq("user_id", user_id) \
      .execute()

    url_index, date_index = _build_analytics_indexes(db_posts)

    matched = 0
    for row in analytics_rows:
        post_id = _match_analytics_post_id(row, url_index, date_index)

        if post_id:
            db.table("raw_posts") \
              .update({"engagement_score": _analytics_score(row)}) \
              .eq("id", post_id) \
              .execute()
            matched += 1

    return {
        "status":  "ok",
        "matched": matched,
        "total":   len(analytics_rows),
    }


def _normalise_url(url: str) -> str:
    """Strip trailing slashes and URL-decode for consistent comparison."""
    from urllib.parse import unquote
    return unquote(url.rstrip("/").strip().lower())


def _build_analytics_indexes(db_posts: list[dict]) -> tuple[dict[str, str], dict[str, list[str]]]:
    """Build URL and date indexes for analytics matching."""
    url_index: dict[str, str] = {}
    date_index: dict[str, list[str]] = {}
    for post in db_posts:
        if post.get("share_link"):
            url_index[_normalise_url(post["share_link"])] = post["id"]
        if post.get("post_date"):
            date_key = str(post["post_date"])[:10]
            date_index.setdefault(date_key, []).append(post["id"])
    return url_index, date_index


def _match_analytics_post_id(
    row: dict,
    url_index: dict[str, str],
    date_index: dict[str, list[str]],
) -> str | None:
    """
    Match analytics to a raw post.

    Date matching is accepted only when the date points to exactly one post.
    URL matching is a fallback because LinkedIn export URL formats may differ.
    """
    if row.get("post_date"):
        candidates = date_index.get(str(row["post_date"])[:10], [])
        if len(candidates) == 1:
            return candidates[0]

    if row.get("post_url"):
        return url_index.get(_normalise_url(row["post_url"]))

    return None


def _analytics_score(row: dict):
    """Use raw engagements directly, falling back only when the field is absent."""
    if "engagements" in row and row.get("engagements") is not None:
        return row.get("engagements")
    return row.get("impressions") or 0


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

    post_template = """Describe your post idea here — what you want to say, key points, examples, anything that matters.
Post type: [story / lesson / hot take / observation / update]"""

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
"""

    return {
        "system_prompt":  system_prompt,
        "post_template":  post_template,
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


@router.post("/starter-profile")
async def create_starter_profile(
    request: StarterProfileRequest,
    user_id: str = Depends(get_current_user),
):
    db = get_supabase()
    db.table("style_profiles").upsert(
        _build_starter_profile(user_id, request),
        on_conflict="user_id",
    ).execute()
    return {"status": "ready"}


def _build_starter_profile(user_id: str, request: StarterProfileRequest) -> dict:
    tone = request.tone.strip() or "conversational"
    language = request.language_style_notes.strip() or "Natural LinkedIn writing"
    storytelling = (request.storytelling_style or "").strip() or "Explains ideas through practical context."
    vocabulary = (request.vocabulary_notes or "").strip() or "Uses clear, direct wording."

    return {
        "user_id": user_id,
        "status": "ready",
        "tone": tone,
        "formality_level": max(1, min(10, request.formality_level)),
        "avg_post_length": max(40, request.avg_post_length),
        "opening_patterns": [
            "Open with the main idea in the user's natural voice.",
            "Open with a practical moment or observation.",
            "Open with a direct question or tension when it fits the topic.",
        ],
        "closing_patterns": [
            "Close with a concise takeaway.",
            "Close with a grounded reflection.",
            "Close with a simple question when conversation is natural.",
        ],
        "emoji_usage": request.emoji_usage,
        "structure_preference": request.structure_preference,
        "paragraph_length": request.paragraph_length,
        "storytelling_style": storytelling,
        "vocabulary_notes": vocabulary,
        "language_style_notes": language,
        "raw_summary": (
            "Manual starter profile. "
            f"Write in a {tone} tone with {language}. "
            f"Storytelling style: {storytelling} "
            f"Vocabulary guidance: {vocabulary}"
        ),
        "posts_analyzed": 0,
    }
