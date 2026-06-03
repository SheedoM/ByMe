# ByMe — Pre-Production Audit

_Audit date: 2026-06-04 · commit `90ced38`_

This audit covers everything that should be addressed before ByMe goes to real users.
Items are grouped by severity:

- **P0 — Blockers**: do not ship without these. Security holes, money leaks, or guaranteed breakage.
- **P1 — Important**: ship-blocking for anything beyond a tiny beta. Reliability, cost control, ops.
- **P2 — Polish**: should-do soon, not strictly blocking.

---

## ✅ Status (updated 2026-06-04)

**All P0 and P1 items are resolved in code.** Remaining work is operational (done by you in dashboards) and P2 polish:

- **Ops before deploy:** rotate keys for a fresh prod Supabase project, apply migrations `001`→`008`, set all env vars on the host, set `ENVIRONMENT=production` + `ALLOWED_ORIGINS` to the real frontend URL, and confirm `FREE_TIER_MODEL` is a real `:free` model.
- **Still open (P2):** background-task durability on serverless, security headers, account deletion/data-export endpoint, privacy copy, consolidate planning docs.

Fixed in code: free-tier model (#1), user_id audit verified clean (#2), upload caps + stray file (#3), CORS prod gate (#5), startup validation (#6), local JWT verify (#7), LLM timeouts + token caps (#8), rate-limited LLM endpoints (#9), pytest config + CI (#10/#11), frontend ErrorBoundary + 401 refresh/sign-out (#12), generic 500 handler + logging (part of #13).

---

## P0 — Blockers

### 1. The "free tier" runs on a PAID model (cost/billing leak)
`backend/app/llm/factory.py:36` — `get_free_tier_provider()` hardcodes `model="gpt-4o-mini"` through OpenRouter. That is **not** a free model (the free ones in `VALID_MODELS["openrouter"]` carry the `:free` suffix, e.g. `google/gemini-2.0-flash-exp:free`). Every "Try ByMe" generation is billing the platform's OpenRouter balance — and the bare id `gpt-4o-mini` may not even resolve on OpenRouter (needs `openai/` prefix), so free-tier generation could be silently failing instead.
- **Fix:** point the free tier at an actual `:free` model id, and make the free model configurable via env. Decide deliberately what the trial costs you.
- Also: `BYME_GEMINI_API_KEY` (`config.py:11`) is loaded but never used — remove or wire it in.

### 2. Backend uses the Supabase service-role key, which bypasses RLS entirely
`config.py:17` and `middleware/auth.py:9` create clients with `SUPABASE_SERVICE_KEY`. The service role **bypasses all Row-Level Security**. The RLS policies in `001_initial_schema.sql` are therefore decorative for the backend — the *only* thing preventing cross-user data access is that every query manually includes `.eq("user_id", user_id)`.
- **Risk:** one missing `.eq("user_id", ...)` on any query = cross-tenant data leak, with no DB safety net.
- **Fix:** audit every `db.table(...)` call for a user_id filter (especially updates/deletes). Add a regression test. Longer term, consider a per-request client using the user's JWT so RLS actually applies as defense-in-depth.

### 3. No file-size limit on uploads (DoS / OOM)
`routers/style.py:39` (`/upload`) and the analytics upload both do `content = await file.read()` with no cap. A multi-GB upload is read fully into memory → OOM. Multiply by concurrent requests.
- **Fix:** reject by `Content-Length`, cap the read (e.g. 10–25 MB), and validate the extension before reading.

### 4. Secrets / stray files hygiene
- `backend/=3.1.0` is a junk file created by a botched `pip install openpyxl>=3.1.0` (the `>=3.1.0` got redirected to a file). Delete it.
- `.env` files are correctly gitignored (verified — not tracked). Before launch, **rotate** `ENCRYPTION_KEY`, `SUPABASE_SERVICE_KEY`, and `OPENROUTER_API_KEY` since they've lived in local dev for a while, and confirm none were ever committed in history.
- **Critical:** if `ENCRYPTION_KEY` is ever rotated, all stored BYOK keys become undecryptable. Document this and plan key management before users store keys.

### 5. CORS regex permanently allows localhost in production
`main.py:28` — `allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"` is always active, with `allow_credentials=True` and `allow_methods=["*"]`. In production this should be removed; rely solely on the explicit `ALLOWED_ORIGINS` env. Also confirm `ALLOWED_ORIGINS` is actually set in prod or the real frontend origin will be blocked.

---

## P1 — Important

### 6. No startup config validation
`config.py` reads env vars but nothing fails fast if `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, or `ENCRYPTION_KEY` are missing. The app boots and then 500s cryptically at runtime.
- **Fix:** validate required vars on startup and refuse to boot without them.

### 7. Auth does a network call to Supabase on every request
`middleware/auth.py:31` calls `db.auth.get_user(token)` per request — a round-trip to Supabase for every API call. This adds latency and is a rate-limit/availability dependency. `SUPABASE_JWT_SECRET` is already in config and `PyJWT` is already a dependency, both unused.
- **Fix:** verify the JWT locally with `SUPABASE_JWT_SECRET` (fall back to remote only on demand). Big latency + resilience win.
- Also `auth.py:38` leaks `str(e)` to the client — return a generic 401.

### 8. LLM calls have no timeout and inconsistent token caps
- `openai_provider.py` sets **no** `max_tokens` and **no** timeout. A hung provider hangs the request indefinitely; an unbounded response is an unbounded bill. `claude.py` caps at 2048 but also has no timeout.
- **Fix:** set request timeouts on all provider clients, a sane `max_tokens` everywhere, and ideally one retry on transient errors.

### 9. `/generate/hooks` is unmetered — free-key abuse vector
`routers/generate.py` rate-limits `/generate/` by monthly count, but `/generate/hooks` calls the LLM with no limit. A user (or bot) can hammer hooks generation and burn the platform's free-tier OpenRouter spend.
- **Fix:** count hooks against a limit too, or add per-IP/per-user rate limiting (e.g. slowapi) across all LLM endpoints.

### 10. No CI, no enforced quality gates
No `.github/workflows`. Tests, lint, and build are never run automatically.
- **Fix:** add CI that runs `pytest tests/`, frontend `npm run build`, and a linter on every push.

### 11. Test suite is narrow and misconfigured
- `pytest` from the backend root tries to collect `scripts/smoke_test.py` and fails (no `pytest.ini`/`testpaths`). `pytest tests/` passes 20 tests but coverage is limited to CSV parsing, analytics matching, settings validation, and generation UX — **no auth tests, no endpoint/integration tests, no RLS/ownership tests.**
- The global Python used here is **missing `supabase`** (`import supabase` fails) — dependency install isn't reproducible outside whatever venv runs the server.
- **Fix:** add `pyproject.toml`/`pytest.ini` with `testpaths = tests`, pin a venv + `requirements` install in CI, and add ownership/auth integration tests.

### 12. No frontend error boundary or 401 handling strategy
- No React `ErrorBoundary` — one render error blanks the whole app.
- `services/api.js:19` deliberately doesn't handle 401 (to avoid redirect loops) — but that means an expired session just produces silent failures everywhere. Need a real strategy: refresh token, or route to login on 401 for protected calls.

### 13. No observability
No structured logging, no error tracking (Sentry or similar), no request logging. When something breaks in prod you'll be blind.
- **Fix:** add error tracking on both frontend and backend, and structured request logs.

---

## P2 — Polish

- **`.env.example` drift:** `frontend/.env.example` says `VITE_API_URL=http://localhost:8005` but the backend runs on `:8000` and vite on `:5175`. Align the examples.
- **Background task DB client:** `extract_and_store_style` runs as a FastAPI `BackgroundTask`; on a serverless host (Vercel/Lambda) background tasks can be killed when the response returns. Confirm the deploy target keeps the worker alive, or move analysis to a proper queue.
- **`generated_posts.key_points` is `NOT NULL`** (`001_initial_schema.sql:48`) but the new single-idea flow may send empty key points — verify inserts still satisfy the constraint (post_generator joins them into the idea, but the column write path should be checked).
- **No `robots`, no rate-limit headers, no security headers** (CSP, HSTS, X-Frame-Options). Add a security-headers middleware.
- **No account deletion / data export path** — for a tool that ingests a user's full LinkedIn history, GDPR-style "delete my data" is worth having. `ON DELETE CASCADE` is in place, so it's mostly a UI/endpoint.
- **Privacy copy:** uploading a LinkedIn archive is sensitive. A clear privacy note on what's stored (raw posts) and for how long would build trust.
- **Two overlapping planning docs** (`byme_audit_and_plan.md`, `byme_implementation_plan.md`) — consolidate or archive to avoid stale guidance.
- **`scripts/` not excluded from test discovery** (see #11).

---

## Suggested pre-production order

1. **Money & security first (P0):** fix free-tier model (#1), upload size caps (#3), CORS prod config (#5), delete stray file + rotate keys (#4), and complete the user_id-filter audit (#2).
2. **Reliability (P1):** startup validation (#6), local JWT verify (#7), LLM timeouts/token caps (#8), rate-limit all LLM endpoints (#9).
3. **Ops (P1):** CI + test config (#10, #11), error tracking/logging (#13), frontend error boundary + 401 strategy (#12).
4. **Polish (P2):** as time allows.

---

## What's already solid

- BYOK with Fernet-encrypted key storage (`services/encryption.py`).
- Clean LLM provider abstraction with a factory (`llm/factory.py`).
- RLS policies defined on all tables (even if bypassed by the service key — keep them for the future).
- Sensible onboarding flow, i18n (en/ar) with RTL handling, and localStorage state persistence.
- 20 passing unit tests covering the trickiest parsing logic (CSV, analytics matching).
