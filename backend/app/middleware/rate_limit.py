import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException

from .auth import get_current_user

# In-memory sliding-window store: user_id -> deque[timestamps]
# NOTE: per-process only. Fine for a single-instance beta; move to Redis if you
# scale to multiple backend instances.
_calls: dict[str, deque] = defaultdict(deque)


def rate_limit(max_calls: int, window_seconds: int):
    """
    Dependency factory: allow at most `max_calls` per `window_seconds` per user.
    Applied to expensive LLM endpoints to prevent abuse of the shared free key.
    """
    async def _dependency(user_id: str = Depends(get_current_user)) -> str:
        now = time.monotonic()
        window_start = now - window_seconds
        bucket = _calls[user_id]

        # Drop timestamps outside the window.
        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= max_calls:
            retry_in = int(bucket[0] + window_seconds - now) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Please wait {retry_in}s and try again.",
                headers={"Retry-After": str(retry_in)},
            )

        bucket.append(now)
        return user_id

    return _dependency
