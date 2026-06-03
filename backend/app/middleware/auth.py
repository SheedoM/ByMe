import logging

import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..config import SUPABASE_JWT_SECRET, get_supabase

logger = logging.getLogger("byme.auth")
security = HTTPBearer()


def _extract_supabase_user_id(response) -> str | None:
    user = response.get("user") if isinstance(response, dict) else getattr(response, "user", None)
    if isinstance(user, dict):
        return user.get("id")
    return getattr(user, "id", None)


def _get_user_id_from_supabase(token: str) -> str | None:
    response = get_supabase().auth.get_user(token)
    return _extract_supabase_user_id(response)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Verify the Supabase JWT locally using the project's JWT secret.

    Local verification is fast for legacy HS256 Supabase projects. If that
    fails, fall back to Supabase Auth so production keeps working when the
    copied JWT secret is wrong or the project uses managed signing keys.
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
    except jwt.InvalidTokenError as exc:
        logger.warning(
            "Local JWT validation failed (%s); trying Supabase Auth",
            exc.__class__.__name__,
        )
        try:
            user_id = _get_user_id_from_supabase(token)
        except Exception as supabase_exc:
            logger.warning(
                "Supabase Auth rejected JWT (%s)",
                supabase_exc.__class__.__name__,
            )
            raise HTTPException(status_code=401, detail="Invalid session") from supabase_exc

        if user_id:
            return str(user_id)

        logger.warning("Supabase Auth returned no user for JWT")
        raise HTTPException(status_code=401, detail="Invalid session")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    return str(user_id)
