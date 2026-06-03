from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from ..config import get_supabase
from ..middleware.auth import get_current_user
from ..services.post_generator import generate_post
from ..services.hook_generator import generate_hooks

router = APIRouter()


class GenerateRequest(BaseModel):
    topic: str
    key_points: list[str]
    post_type: str = "story"
    selected_hook: str | None = None


class HooksRequest(BaseModel):
    topic: str
    key_points: list[str]


class FeedbackRequest(BaseModel):
    rating: str  # 'nailed_it' | 'almost' | 'not_quite'


class FinalPostRequest(BaseModel):
    final_output: str


@router.post("/")
async def generate(
    request: GenerateRequest,
    user_id: str = Depends(get_current_user)
):
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
    except Exception:
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


@router.put("/{post_id}/final")
async def save_final_post(
    post_id: str,
    request: FinalPostRequest,
    user_id: str = Depends(get_current_user),
):
    final_output = request.final_output.strip()
    if not final_output:
        raise HTTPException(status_code=400, detail="Final post cannot be empty")

    db = get_supabase()
    db.table("generated_posts") \
      .update({
          "final_output": final_output,
          "final_saved_at": datetime.now(timezone.utc).isoformat(),
          "final_in_style": True,
      }) \
      .eq("id", post_id) \
      .eq("user_id", user_id) \
      .execute()

    return {"status": "saved"}


@router.get("/history")
async def get_history(
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    db = get_supabase()
    result = db.table("generated_posts") \
               .select(_history_select_fields()) \
               .eq("user_id", user_id) \
               .order("created_at", desc=True) \
               .limit(limit) \
               .execute()
    return result.data


def _history_select_fields() -> str:
    return (
        "id, topic, output, final_output, final_saved_at, final_in_style, "
        "provider_used, model_used, plan_type, created_at, feedback, post_type, selected_hook"
    )


@router.get("/usage")
async def get_usage(user_id: str = Depends(get_current_user)):
    """Returns current month usage count (for free tier display)."""
    from datetime import date
    from ..config import FREE_TIER_MONTHLY_LIMIT
    db = get_supabase()

    month_start = date.today().replace(day=1)
    count_result = db.table("generated_posts") \
                     .select("id", count="exact") \
                     .eq("user_id", user_id) \
                     .gte("created_at", f"{month_start}T00:00:00Z") \
                     .execute()

    return {
        "used":  count_result.count or 0,
        "limit": FREE_TIER_MONTHLY_LIMIT,
    }
