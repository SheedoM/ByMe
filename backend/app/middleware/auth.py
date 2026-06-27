import logging

import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..config import SUPABASE_JWT_SECRET, SUPABASE_URL, get_supabase

logger = logging.getLogger("byme.auth")
security = HTTPBearer()

# Supabase publishes its asymmetric (ES256/RS256) public keys here. PyJWKClient
# fetches and caches them, so we verify tokens locally without a network call
# per request after the first fetch.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client is None and SUPABASE_URL:
        _jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")
    return _jwks_client


def _verify_locally(token: str) -> str | None:
    """
    Verify a Supabase JWT locally and return the user id (sub).

    Supports both signing schemes a Supabase project may use:
      - ES256/RS256 (asymmetric "JWT signing keys") — verified via the project's
        published JWKS public key.
      - HS256 (legacy shared JWT secret) — verified with SUPABASE_JWT_SECRET.

    Returns None if the token can't be verified locally (caller may fall back).
    """
    alg = jwt.get_unverified_header(token).get("alg", "")

    if alg.startswith("HS"):
        if not SUPABASE_JWT_SECRET:
            return None
        key = SUPABASE_JWT_SECRET
    else:
        client = _get_jwks_client()
        if client is None:
            return None
        key = client.get_signing_key_from_jwt(token).key

    payload = jwt.decode(token, key, algorithms=[alg], audience="authenticated")
    return payload.get("sub")


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
    Verify the Supabase JWT locally (ES256 via JWKS, or legacy HS256). If local
    verification fails for any reason, fall back to Supabase Auth so production
    keeps working even if the signing scheme changes again.
    """
    token = credentials.credentials
    try:
        user_id = _verify_locally(token)
        if user_id:
            return str(user_id)
        logger.warning("Local JWT verification returned no subject; trying Supabase Auth")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except Exception as exc:
        logger.warning(
            "Local JWT validation failed (%s); trying Supabase Auth",
            exc.__class__.__name__,
        )

    try:
        user_id = _get_user_id_from_supabase(token)
    except Exception as supabase_exc:
        logger.warning("Supabase Auth rejected JWT (%s)", supabase_exc.__class__.__name__)
        raise HTTPException(status_code=401, detail="Invalid session") from supabase_exc

    if user_id:
        return str(user_id)

    logger.warning("Supabase Auth returned no user for JWT")
    raise HTTPException(status_code=401, detail="Invalid session")
