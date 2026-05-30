from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from .routers import style, generate, settings as settings_router

load_dotenv()

app = FastAPI(title="ByMe API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    # Allow Vite default (5173) and the project's dev server (3005) by default
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3005").split(","),
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
