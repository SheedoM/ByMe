# ByMe — LinkedIn Post Generator

> Generate LinkedIn posts that sound exactly like you.

ByMe learns your writing style from your past LinkedIn posts, then generates new ones in your voice.

---

## Quick Start

### 1. Clone & configure

```bash
git clone <your-repo>
cd byme
```

**Backend env** — copy and fill in:
```bash
cp backend/.env.example backend/.env
```

Required values in `backend/.env`:
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (never expose) |
| `SUPABASE_JWT_SECRET` | From Supabase project settings |
| `BYME_GEMINI_API_KEY` | **Your** Gemini API key powering the free tier |
| `ENCRYPTION_KEY` | Fernet key for encrypting user API keys |

Generate the `ENCRYPTION_KEY`:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Frontend env** — copy and fill in:
```bash
cp frontend/.env.example frontend/.env.local
```

### 2. Database

In Supabase SQL Editor, run the migrations in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_user_settings.sql`
3. `supabase/migrations/003_feedback_and_post_type.sql`
4. `supabase/migrations/004_style_language_notes.sql`

### 3. Backend

> **Python version**: Use **Python 3.12** (not 3.13/3.14). Several indirect dependencies
> (`pydantic-core`, `pyiceberg`) don't have pre-built wheels for Python 3.14 yet and
> require MSVC to compile. Download Python 3.12 from [python.org](https://www.python.org/downloads/).

```bash
cd backend
py -3.12 -m venv .venv   # Windows: use py launcher to select 3.12
# python3.12 -m venv .venv   # macOS/Linux
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Onboarding Flow

```
Sign up → Upload LinkedIn archive ZIP or Shares CSV → Choose analysis method → AI analyses style → Review profile → Generate posts
```

### Plans

| | ByMe Free | Own API Key (BYOK) |
|---|---|---|
| Powered by | Platform Gemini Flash | Your key (Claude / OpenAI / Gemini) |
| Monthly limit | 10 posts | Unlimited |
| API key needed | No | Yes |
| Setup | Instant | ~30 seconds |

Change plan anytime in **Settings**.

---

## Architecture

```
frontend/  — React 18 + Vite + Tailwind CSS
backend/   — FastAPI (Python 3.11+)
supabase/  — Postgres + Auth + RLS
```

### Key principles (from the implementation plan)

1. **Never call LLM directly** — all AI calls go through `app/llm/factory.py`
2. **Prompts in one place** — `app/prompts/`
3. **Style profile is the source of truth** — generation always reads from DB
4. **API keys encrypted at rest** — Fernet symmetric encryption
5. **Frontend never sees which LLM ran** — provider info returned after generation only

---

## Environment Variables Reference

### Backend (`backend/.env`)

```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=
BYME_GEMINI_API_KEY=      # Platform key for free tier
ENCRYPTION_KEY=            # Fernet key for BYOK key storage
ALLOWED_ORIGINS=http://localhost:5173
ENVIRONMENT=development
FREE_TIER_MONTHLY_LIMIT=10
```

### Frontend (`frontend/.env.local`)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:8000
```

---

## Deployment

- **Frontend** → Vercel (connect GitHub repo, set env vars in dashboard)
- **Backend** → Railway (set root directory to `/backend`, add env vars)
- **Database** → Supabase (already hosted)

Set `ENVIRONMENT=production` and update `ALLOWED_ORIGINS` to your Vercel URL before deploying.
