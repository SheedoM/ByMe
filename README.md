# ByMe

ByMe learns a user's LinkedIn writing style from their exported LinkedIn posts, then generates new LinkedIn posts in that voice.

## Stack

- Frontend: React 18, Vite, Tailwind CSS, deployed on Vercel
- Backend: FastAPI, deployed on Render
- Database/Auth: Supabase Postgres and Supabase Auth
- LLM routing: OpenRouter for the platform free tier, optional BYOK providers for users

## Current Production URLs

- Frontend: `https://byme.faragallah.tech`
- Backend: `https://byme-2y5y.onrender.com`
- API health check: `https://byme-2y5y.onrender.com/health`

The root backend URL may return `404`; that is expected because the API exposes `/health` and API routes, not a homepage.

## Quick Start

### Backend

```bash
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5175`.

## Environment Variables

### Backend

Set these in `backend/.env` locally and in Render for production:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-legacy-jwt-secret
ENCRYPTION_KEY=your-fernet-key
OPENROUTER_API_KEY=sk-or-...
FREE_TIER_MODEL=openrouter/free
FREE_TIER_MONTHLY_LIMIT=10
ALLOWED_ORIGINS=http://localhost:5175,https://byme.faragallah.tech
ENVIRONMENT=development
```

Use `ENVIRONMENT=production` on Render.

Generate an encryption key with:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Notes:

- `SUPABASE_SERVICE_KEY` is the service role key and must never be exposed to the frontend.
- `SUPABASE_JWT_SECRET` is the legacy JWT secret from the same Supabase project.
- The backend now falls back to Supabase Auth when local JWT verification cannot validate a managed signing key token.
- `FREE_TIER_MODEL=openrouter/free` is recommended because OpenRouter free model availability changes.

### Frontend

Set these in `frontend/.env.local` locally and in Vercel for production:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_API_URL=https://byme-2y5y.onrender.com
```

Vite bakes `VITE_*` variables into the build. After changing them in Vercel, redeploy the frontend.

## Database

Run Supabase migrations in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_user_settings.sql`
3. `supabase/migrations/003_feedback_and_post_type.sql`
4. `supabase/migrations/004_style_language_notes.sql`
5. `supabase/migrations/005_raw_posts_in_style.sql`
6. `supabase/migrations/006_raw_posts_sharelink.sql`
7. `supabase/migrations/007_raw_posts_engagement.sql`
8. `supabase/migrations/008_generated_posts_final_drafts.sql`

## Deployment

### Vercel

Deploy the `frontend` app on Vercel. The repo includes Vercel rewrites so direct refreshes on routes like `/onboarding` and `/app` serve the Vite SPA instead of a platform `404`.

Required Vercel variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_API_URL=https://byme-2y5y.onrender.com
```

### Render

Deploy the FastAPI backend on Render with:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required Render variables are the backend variables listed above. In production, `ALLOWED_ORIGINS` must include the exact frontend origin, for example:

```env
ALLOWED_ORIGINS=https://byme.faragallah.tech,https://your-vercel-app.vercel.app
ENVIRONMENT=production
```

### Supabase Auth

In Supabase Authentication URL settings:

```text
Site URL: https://byme.faragallah.tech
Redirect URLs:
https://byme.faragallah.tech/**
https://your-vercel-app.vercel.app/**
```

## Custom Domain

The intended custom domain is:

```text
byme.faragallah.tech
```

Create this DNS record at the domain provider:

```text
Type: CNAME
Name/Host: byme
Value/Target: cname.vercel-dns-0.com
TTL: Auto
```

Then add `byme.faragallah.tech` in Vercel project settings.

## Onboarding Flow

```text
Sign up -> Upload LinkedIn archive ZIP or Shares CSV -> Choose posts -> Choose provider -> Analyze style -> Review profile -> Generate posts
```

The upload flow supports full LinkedIn archive ZIPs, extracted Shares CSV files, and LinkedIn analytics Excel files for engagement ranking.

## Plans

| Plan | Powered by | Monthly limit | User API key |
|---|---|---:|---|
| Try ByMe | OpenRouter platform key | 10 posts | No |
| Own API Key | User-selected provider | Unlimited | Yes |

Users can switch plans in Settings.

## Tests

Frontend:

```bash
cd frontend
npm test
npm run build
```

Backend:

```bash
cd backend
python -m unittest discover -s tests
```

## Troubleshooting

- `Cannot reach the ByMe API`: check `VITE_API_URL`, Render status, and `ALLOWED_ORIGINS`.
- CORS preflight `400`: add the exact frontend origin to Render `ALLOWED_ORIGINS`.
- `Invalid session`: verify Vercel and Render use the same Supabase project. Render logs should show Supabase Auth fallback if local JWT verification fails.
- OpenRouter `No endpoints found`: update `FREE_TIER_MODEL`, preferably to `openrouter/free`.
- Vercel `404: NOT_FOUND` on refresh: confirm the Vercel rewrite config is deployed in the active project root.
