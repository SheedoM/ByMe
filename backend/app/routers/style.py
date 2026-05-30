from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends
from ..config import get_supabase
from ..middleware.auth import get_current_user
from ..services.csv_parser import parse_linkedin_export, validate_csv
from ..services.style_extractor import extract_and_store_style

router = APIRouter()


@router.post("/upload")
async def upload_posts(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    content = await file.read()

    # Validate the CSV
    is_valid, error_msg = validate_csv(content)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    posts = parse_linkedin_export(content)
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

    # Mark profile as processing
    db.table("style_profiles").upsert({
        "user_id": user_id,
        "status":  "processing"
    }, on_conflict="user_id").execute()

    # Run style extraction in background (always with platform Gemini Flash)
    background_tasks.add_task(extract_and_store_style, db, user_id, posts)

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
        "storytelling_style", "vocabulary_notes", "raw_summary"
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
