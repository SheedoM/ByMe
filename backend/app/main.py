import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import style, generate, settings as settings_router

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173,"
    "http://localhost:3005,"
    "http://localhost:3006,"
    "http://127.0.0.1:3005,"
    "http://127.0.0.1:3006"
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]

app = FastAPI(title="ByMe API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(style.router,          prefix="/style",    tags=["style"])
app.include_router(generate.router,       prefix="/generate", tags=["generate"])
app.include_router(settings_router.router, prefix="/settings", tags=["settings"])


@app.get("/health")
async def health():
    return {"status": "ok"}
