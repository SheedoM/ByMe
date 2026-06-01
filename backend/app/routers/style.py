from fastapi import APIRouter, UploadFile, BackgroundTasks, HTTPException, Depends
from ..config import get_supabase
from ..middleware.auth import get_current_user
from ..services.csv_parser import parse_linkedin_posts_file, validate_posts_file
from ..services.style_extractor import extract_and_store_style

router = APIRouter()


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
            "user_id":   user_id,
            "content":   p["content"],
            "post_date": str(p["post_date"]) if p["post_date"] else None
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


@router.post("/analyze")
async def analyze_posts(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    db = get_supabase()
    result = db.table("raw_posts") \
               .select("content, post_date") \
               .eq("user_id", user_id) \
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
