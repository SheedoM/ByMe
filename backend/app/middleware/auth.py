from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
import os

security = HTTPBearer()


def _get_admin_client():
    """Returns a Supabase client with the service role key (admin privileges)."""
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Verifies the Supabase JWT by calling Supabase's own get_user() endpoint.
    Returns the user_id (sub claim) if valid.

    This approach is more reliable than local PyJWT decoding because it uses
    Supabase's own verification logic — no secret mismatch possible.
    """
    token = credentials.credentials
    try:
        db = _get_admin_client()
        response = db.auth.get_user(token)
        user = response.user
        if not user or not user.id:
            raise HTTPException(status_code=401, detail="Invalid session")
        return str(user.id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
