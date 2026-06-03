import logging

import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..config import SUPABASE_JWT_SECRET

logger = logging.getLogger("byme.auth")
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Verify the Supabase JWT locally using the project's JWT secret.

    This avoids a network round-trip to Supabase on every request (the old
    db.auth.get_user(token) approach) — faster, and removes a per-request
    dependency on Supabase Auth availability.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        # Don't leak the underlying reason to the client.
        logger.warning("Rejected invalid JWT")
        raise HTTPException(status_code=401, detail="Invalid session")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    return str(user_id)
