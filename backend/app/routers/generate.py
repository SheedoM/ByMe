from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..config import get_supabase
from ..middleware.auth import get_current_user
from ..services.post_generator import generate_post

router = APIRouter()


class GenerateRequest(BaseModel):
    topic: str
    key_points: list[str]


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

    result = await generate_post(
        db=db,
        user_id=user_id,
        topic=request.topic,
        key_points=points,
    )
    return result


@router.get("/history")
async def get_history(
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    db = get_supabase()
    result = db.table("generated_posts") \
               .select("id, topic, output, provider_used, model_used, plan_type, created_at") \
               .eq("user_id", user_id) \
               .order("created_at", desc=True) \
               .limit(limit) \
               .execute()
    return result.data


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
