import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import validate_config, IS_PRODUCTION
from .routers import style, generate, settings as settings_router

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("byme")

# Fail fast if the environment is misconfigured.
validate_config()

DEFAULT_ALLOWED_ORIGINS = "http://localhost:5175,http://127.0.0.1:5175"

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]

cors_kwargs = dict(
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Only allow the permissive localhost regex outside production.
if not IS_PRODUCTION:
    cors_kwargs["allow_origin_regex"] = r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"

app = FastAPI(title="ByMe API", version="1.0.0")

app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log the real error server-side; return a generic message to the client."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(style.router,           prefix="/style",    tags=["style"])
app.include_router(generate.router,        prefix="/generate", tags=["generate"])
app.include_router(settings_router.router, prefix="/settings", tags=["settings"])


@app.get("/health")
async def health():
    return {"status": "ok"}
