# ByMe — Full Implementation Plan

> This is the exact plan I would follow to build ByMe from scratch.
> Every decision is documented with a reason. Every file path is intentional.
> Follow this top to bottom. Do not skip phases.

---

## Table of Contents

1. [Philosophy & Guiding Rules](#philosophy)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Environment Variables](#environment-variables)
5. [Database Schema](#database-schema)
6. [Phase 1 — Project Initialization](#phase-1)
7. [Phase 2 — LLM Abstraction Layer](#phase-2)
8. [Phase 3 — Supabase Setup](#phase-3)
9. [Phase 4 — Authentication Middleware](#phase-4)
10. [Phase 5 — CSV Ingestion Service](#phase-5)
11. [Phase 6 — Style Extraction Pipeline](#phase-6)
12. [Phase 7 — Post Generation Engine](#phase-7)
13. [Phase 8 — API Routes](#phase-8)
14. [Phase 9 — Frontend Architecture](#phase-9)
15. [Phase 10 — Screen Implementations](#phase-10)
16. [Phase 11 — Error Handling & Edge Cases](#phase-11)
17. [Phase 12 — Deployment](#phase-12)
18. [Appendix A — Full Prompt Templates](#appendix-a)
19. [Appendix B — API Contract](#appendix-b)

---

## Philosophy & Guiding Rules {#philosophy}

Before writing a single line of code, lock in these rules. They prevent 80% of technical debt.

**Rule 1 — Never call an LLM directly.**
Every AI call in the entire codebase goes through the LLM factory. No exceptions. This is what makes the multi-provider feature possible without refactoring later.

**Rule 2 — Prompts live in one place.**
All prompts are stored in `backend/app/prompts/`. Not inline in service files, not in route handlers. One file per concern.

**Rule 3 — The style profile is the source of truth.**
Generation always reads from the database. Never from session, never from memory, never passed as a parameter from the frontend. If the profile is stale, that is a data freshness problem — not a generation problem.

**Rule 4 — Frontend knows nothing about which LLM ran.**
The provider selector in the UI sends a string to the backend. The backend decides what to do with it. The frontend never imports any AI SDK.

**Rule 5 — Build the abstraction layer first.**
Phase 2 (LLM layer) must be complete and tested before Phase 6 (style extraction) or Phase 7 (generation) begins. Everything depends on it.

---

## Tech Stack {#tech-stack}

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast dev server, HMR, production-ready |
| Frontend styling | Tailwind CSS | Utility-first, pairs well with component isolation |
| Frontend fonts | Fraunces + DM Sans (Google Fonts) | Editorial, distinctive, not generic SaaS |
| Backend framework | FastAPI (Python 3.11+) | Async-native, great for LLM calls, clean typing |
| Database + Auth | Supabase | Postgres + auth + RLS in one setup |
| LLM providers | Claude (default), GPT-4o, Gemini | Pluggable via abstraction layer |
| Background tasks | FastAPI BackgroundTasks (MVP), Celery (v2) | Style extraction is slow; must be async |
| HTTP client | `httpx` (async) | For any outgoing calls from backend |
| Frontend routing | React Router v6 | Standard, well-documented |
| Frontend state | React Context + hooks | No need for Redux at MVP scale |
| Frontend API calls | Axios with interceptors | Token injection, error handling in one place |
| Hosting (frontend) | Vercel | Zero-config deploy for Vite/React |
| Hosting (backend) | Railway | Simple Python/FastAPI deploys, free tier |

---

## Repository Structure {#repository-structure}

```
byme/
├── frontend/
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Onboarding.jsx
│   │   │   ├── Generator.jsx
│   │   │   └── StyleProfile.jsx
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── AuthGuard.jsx        # redirects unauthenticated users
│   │   │   │   └── OnboardingGuard.jsx  # redirects users with no style profile
│   │   │   ├── layout/
│   │   │   │   ├── PublicNav.jsx
│   │   │   │   └── AppNav.jsx
│   │   │   ├── onboarding/
│   │   │   │   ├── UploadStep.jsx
│   │   │   │   ├── ProcessingStep.jsx
│   │   │   │   └── StyleReviewStep.jsx
│   │   │   ├── generator/
│   │   │   │   ├── InputPanel.jsx
│   │   │   │   ├── OutputPanel.jsx
│   │   │   │   ├── ModelSelector.jsx
│   │   │   │   └── KeyPointsList.jsx
│   │   │   ├── profile/
│   │   │   │   ├── StyleCard.jsx
│   │   │   │   └── StyleEditor.jsx
│   │   │   └── ui/
│   │   │       ├── Button.jsx
│   │   │       ├── Input.jsx
│   │   │       ├── Textarea.jsx
│   │   │       ├── Badge.jsx
│   │   │       ├── Spinner.jsx
│   │   │       └── Toast.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   ├── api.js           # base axios instance + interceptors
│   │   │   ├── auth.js          # login, signup, logout
│   │   │   ├── style.js         # upload, get profile, update profile
│   │   │   └── generate.js      # generate post, get history
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useStyleProfile.js
│   │   │   └── useGenerator.js
│   │   ├── utils/
│   │   │   └── format.js
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   └── fonts.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.local
│
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── config.py             # env vars, settings
│   │   ├── dependencies.py       # shared FastAPI dependencies
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # abstract interface + LLMResponse dataclass
│   │   │   ├── claude.py
│   │   │   ├── openai.py
│   │   │   ├── gemini.py
│   │   │   └── factory.py        # provider registry
│   │   ├── prompts/
│   │   │   ├── style_extraction.py
│   │   │   └── post_generation.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # token validation only; Supabase handles actual auth
│   │   │   ├── style.py          # upload, status, get, update
│   │   │   └── generate.py       # generate, history
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── csv_parser.py
│   │   │   ├── style_extractor.py
│   │   │   └── post_generator.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── style.py          # Pydantic models for style profile
│   │   │   └── generate.py       # Pydantic models for generation request/response
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── auth.py           # JWT verification middleware
│   ├── tests/
│   │   ├── test_llm_factory.py
│   │   ├── test_csv_parser.py
│   │   ├── test_style_extractor.py
│   │   └── test_post_generator.py
│   ├── requirements.txt
│   └── .env
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
└── README.md
```

---

## Environment Variables {#environment-variables}

### Backend — `backend/.env`

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key        # never expose this to frontend
SUPABASE_JWT_SECRET=your-jwt-secret               # from Supabase project settings

# LLM Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# App config
DEFAULT_LLM_PROVIDER=claude                       # which provider to use if none specified
ALLOWED_ORIGINS=http://localhost:5173,https://byme.app
ENVIRONMENT=development                           # development | production

# Rate limiting
MAX_GENERATIONS_PER_DAY=10                        # per user, MVP limit
```

### Frontend — `frontend/.env.local`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key              # safe to expose — Supabase RLS handles security
VITE_API_URL=http://localhost:8000                # backend URL
```

---

## Database Schema {#database-schema}

### File: `supabase/migrations/001_initial_schema.sql`

```sql
-- ========================================
-- RAW POSTS
-- Stores the user's original LinkedIn posts
-- uploaded from the CSV export.
-- ========================================
CREATE TABLE raw_posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content     TEXT NOT NULL,
    post_date   DATE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STYLE PROFILES
-- One profile per user.
-- UPSERT on update, not INSERT.
-- status field tracks extraction progress.
-- ========================================
CREATE TABLE style_profiles (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    status                VARCHAR(20) DEFAULT 'pending',  -- pending | processing | ready | failed
    tone                  VARCHAR(100),
    formality_level       INTEGER CHECK (formality_level BETWEEN 1 AND 10),
    avg_post_length       INTEGER,
    opening_patterns      TEXT[],
    closing_patterns      TEXT[],
    emoji_usage           VARCHAR(20),   -- none | minimal | moderate | heavy
    structure_preference  VARCHAR(20),   -- prose | bullets | mixed
    paragraph_length      VARCHAR(20),   -- short | medium | long
    storytelling_style    TEXT,
    vocabulary_notes      TEXT,
    raw_summary           TEXT,
    posts_analyzed        INTEGER,
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- GENERATED POSTS
-- Full history of every post generated.
-- Useful for future analytics features.
-- ========================================
CREATE TABLE generated_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    topic         TEXT NOT NULL,
    key_points    TEXT NOT NULL,
    provider_used VARCHAR(20) NOT NULL,
    model_used    VARCHAR(100) NOT NULL,
    output        TEXT NOT NULL,
    tokens_used   INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ROW LEVEL SECURITY
-- Every user sees only their own data.
-- ========================================
ALTER TABLE raw_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raw_posts: user owns their data"
    ON raw_posts FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "style_profiles: user owns their data"
    ON style_profiles FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "generated_posts: user owns their data"
    ON generated_posts FOR ALL
    USING (auth.uid() = user_id);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX idx_raw_posts_user_id          ON raw_posts(user_id);
CREATE INDEX idx_style_profiles_user_id     ON style_profiles(user_id);
CREATE INDEX idx_generated_posts_user_id    ON generated_posts(user_id);
CREATE INDEX idx_generated_posts_created_at ON generated_posts(created_at DESC);
```

---

## Phase 1 — Project Initialization {#phase-1}

### 1.1 Initialize the monorepo

```bash
mkdir byme && cd byme
git init
echo "node_modules/\n.env\n.env.local\n__pycache__/\n.venv/" > .gitignore
```

### 1.2 Initialize the frontend

```bash
cd byme
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install axios react-router-dom @supabase/supabase-js
```

### 1.3 Configure Tailwind

```javascript
// frontend/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink:    '#1A1917',
        paper:  '#F8F7F3',
        surface:'#EEECEA',
        muted:  '#7A7870',
        amber: {
          DEFAULT: '#C47B35',
          light:   '#F5E8D5',
          dark:    '#A36128',
        },
      },
    },
  },
  plugins: [],
}
```

### 1.4 Set up Google Fonts

```css
/* frontend/src/styles/fonts.css */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');
```

```css
/* frontend/src/styles/globals.css */
@import './fonts.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background-color: #F8F7F3;
  color: #1A1917;
}
```

### 1.5 Initialize the backend

```bash
cd byme
python -m venv .venv
source .venv/bin/activate          # or .venv\Scripts\activate on Windows
pip install fastapi uvicorn[standard] python-dotenv supabase pyjwt httpx anthropic openai google-generativeai python-multipart
pip freeze > backend/requirements.txt
```

### 1.6 Verify everything runs

```bash
# Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm run dev
```

---

## Phase 2 — LLM Abstraction Layer {#phase-2}

> Build this before anything else. Everything in Phases 6 and 7 depends on it.

### 2.1 Base interface

```python
# backend/app/llm/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMResponse:
    content: str
    provider: str
    model: str
    tokens_used: int


class BaseLLMProvider(ABC):

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7
    ) -> LLMResponse:
        pass

    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    def get_model(self) -> str:
        pass
```

### 2.2 Claude implementation

```python
# backend/app/llm/claude.py
import anthropic
from .base import BaseLLMProvider, LLMResponse


class ClaudeProvider(BaseLLMProvider):

    def __init__(self):
        self.client = anthropic.AsyncAnthropic()
        self._model = "claude-sonnet-4-20250514"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7
    ) -> LLMResponse:
        message = await self.client.messages.create(
            model=self._model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=temperature
        )
        return LLMResponse(
            content=message.content[0].text,
            provider="claude",
            model=self._model,
            tokens_used=message.usage.input_tokens + message.usage.output_tokens
        )

    def get_name(self) -> str:
        return "claude"

    def get_model(self) -> str:
        return self._model
```

### 2.3 OpenAI implementation

```python
# backend/app/llm/openai.py
from openai import AsyncOpenAI
from .base import BaseLLMProvider, LLMResponse


class OpenAIProvider(BaseLLMProvider):

    def __init__(self):
        self.client = AsyncOpenAI()
        self._model = "gpt-4o"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7
    ) -> LLMResponse:
        response = await self.client.chat.completions.create(
            model=self._model,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ]
        )
        usage = response.usage
        return LLMResponse(
            content=response.choices[0].message.content,
            provider="gpt4o",
            model=self._model,
            tokens_used=(usage.prompt_tokens + usage.completion_tokens) if usage else 0
        )

    def get_name(self) -> str:
        return "gpt4o"

    def get_model(self) -> str:
        return self._model
```

### 2.4 Gemini implementation

```python
# backend/app/llm/gemini.py
import google.generativeai as genai
import os
from .base import BaseLLMProvider, LLMResponse


class GeminiProvider(BaseLLMProvider):

    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self._model_name = "gemini-1.5-pro"
        self._model = genai.GenerativeModel(
            model_name=self._model_name,
        )

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7
    ) -> LLMResponse:
        # Gemini combines system + user prompt differently
        full_prompt = f"{system_prompt}\n\n---\n\n{user_prompt}"
        response = await self._model.generate_content_async(
            full_prompt,
            generation_config=genai.types.GenerationConfig(temperature=temperature)
        )
        return LLMResponse(
            content=response.text,
            provider="gemini",
            model=self._model_name,
            tokens_used=0  # Gemini async doesn't always return usage in basic calls
        )

    def get_name(self) -> str:
        return "gemini"

    def get_model(self) -> str:
        return self._model_name
```

### 2.5 Factory (the key piece)

```python
# backend/app/llm/factory.py
import os
from typing import Dict
from .base import BaseLLMProvider
from .claude import ClaudeProvider
from .openai import OpenAIProvider
from .gemini import GeminiProvider


_REGISTRY: Dict[str, BaseLLMProvider] = {}
_initialized = False


def _initialize():
    global _initialized
    if _initialized:
        return
    _REGISTRY["claude"] = ClaudeProvider()
    _REGISTRY["gpt4o"]  = OpenAIProvider()
    _REGISTRY["gemini"] = GeminiProvider()
    _initialized = True


def get_provider(name: str | None = None) -> BaseLLMProvider:
    _initialize()
    resolved = name or os.getenv("DEFAULT_LLM_PROVIDER", "claude")
    if resolved not in _REGISTRY:
        raise ValueError(
            f"Unknown provider '{resolved}'. "
            f"Available: {list(_REGISTRY.keys())}"
        )
    return _REGISTRY[resolved]


def available_providers() -> list[str]:
    _initialize()
    return list(_REGISTRY.keys())
```

### 2.6 Test the abstraction layer before moving on

```python
# backend/tests/test_llm_factory.py
import pytest
from app.llm.factory import get_provider, available_providers

def test_default_provider_is_claude():
    provider = get_provider()
    assert provider.get_name() == "claude"

def test_all_providers_registered():
    providers = available_providers()
    assert "claude" in providers
    assert "gpt4o"  in providers
    assert "gemini" in providers

def test_unknown_provider_raises():
    with pytest.raises(ValueError):
        get_provider("unknown_model")
```

Run with: `pytest backend/tests/test_llm_factory.py`

---

## Phase 3 — Supabase Setup {#phase-3}

### 3.1 Create the Supabase project

1. Go to supabase.com → New project
2. Save the project URL, anon key, service key, and JWT secret
3. Put them in `backend/.env` and `frontend/.env.local`

### 3.2 Run migrations

Go to Supabase Dashboard → SQL Editor → paste and run `001_initial_schema.sql` from the Database Schema section above.

### 3.3 Supabase client for backend

```python
# backend/app/config.py
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_JWT_SECRET  = os.getenv("SUPABASE_JWT_SECRET")

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```

### 3.4 Supabase client for frontend

```javascript
// frontend/src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Phase 4 — Authentication Middleware {#phase-4}

### 4.1 JWT middleware

```python
# backend/app/middleware/auth.py
import jwt
import os
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Verifies the Supabase JWT and returns the user_id (sub claim).
    Every protected route uses this as a dependency.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            os.getenv("SUPABASE_JWT_SECRET"),
            algorithms=["HS256"],
            audience="authenticated"
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token structure")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
```

### 4.2 Auth context in React

```jsx
// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = { user, session, loading }
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### 4.3 Auth guard components

```jsx
// frontend/src/components/auth/AuthGuard.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AuthGuard({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}
```

```jsx
// frontend/src/components/auth/OnboardingGuard.jsx
// Wraps /app — redirects to /onboarding if user has no style profile
import { Navigate } from 'react-router-dom'
import { useStyleProfile } from '../../hooks/useStyleProfile'

export function OnboardingGuard({ children }) {
  const { profile, loading } = useStyleProfile()
  if (loading) return null
  if (!profile || profile.status !== 'ready') return <Navigate to="/onboarding" replace />
  return children
}
```

### 4.4 Axios instance with token injection

```javascript
// frontend/src/services/api.js
import axios from 'axios'
import { supabase } from './supabaseClient'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Inject the JWT into every request automatically
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

---

## Phase 5 — CSV Ingestion Service {#phase-5}

### 5.1 LinkedIn export format

When a user downloads their LinkedIn data (Settings → Data Privacy → Download your data → select "Posts"), LinkedIn provides a zip file. Inside is a `Share.csv` with these columns:

```
Date, ShareCommentary, ShareLink, ShareLinkCategory, ShareLinkDescription
```

`ShareCommentary` is the actual post text. Everything else is metadata.

### 5.2 CSV parser

```python
# backend/app/services/csv_parser.py
import csv
import io
from datetime import datetime
from typing import List


MIN_WORD_COUNT = 20          # ignore very short posts
MAX_POSTS_FOR_ANALYSIS = 30  # use the 30 most recent posts
MAX_CHARS_PER_POST = 2000    # truncate extremely long posts


def parse_linkedin_export(csv_content: bytes) -> List[dict]:
    """
    Parse LinkedIn's Share.csv export.
    Returns a list of dicts with keys: content, post_date.
    Filters out reposts, very short posts, and empty entries.
    """
    content = csv_content.decode('utf-8-sig')  # handle Windows BOM
    reader = csv.DictReader(io.StringIO(content))

    posts = []
    for row in reader:
        text = row.get('ShareCommentary', '').strip()

        # Skip reposts (no original commentary)
        if not text:
            continue

        # Skip too-short posts (not enough style signal)
        if len(text.split()) < MIN_WORD_COUNT:
            continue

        date_str = row.get('Date', '').strip()
        try:
            post_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except (ValueError, AttributeError):
            post_date = None

        posts.append({
            'content':   text[:MAX_CHARS_PER_POST],
            'post_date': post_date,
        })

    # Sort by date descending — most recent first
    posts.sort(
        key=lambda p: p['post_date'] or datetime.min.date(),
        reverse=True
    )

    # Return only the most recent N posts for analysis
    return posts[:MAX_POSTS_FOR_ANALYSIS]


def validate_csv(csv_content: bytes) -> tuple[bool, str]:
    """
    Validate that the uploaded file is a valid LinkedIn posts export.
    Returns (is_valid, error_message).
    """
    try:
        content = csv_content.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))
        headers = reader.fieldnames or []
        if 'ShareCommentary' not in headers:
            return False, "This doesn't look like a LinkedIn posts CSV. Make sure you export 'Posts' from LinkedIn Data Download."
        posts = parse_linkedin_export(csv_content)
        if len(posts) < 5:
            return False, f"Only found {len(posts)} usable posts. ByMe needs at least 5 posts to learn your style."
        return True, ""
    except Exception as e:
        return False, f"Could not read the file: {str(e)}"
```

---

## Phase 6 — Style Extraction Pipeline {#phase-6}

### 6.1 The style extraction prompt

```python
# backend/app/prompts/style_extraction.py

STYLE_EXTRACTION_SYSTEM = """
You are a writing style analyst. You analyze LinkedIn posts written by a single person and extract a precise style profile.

Return ONLY a valid JSON object. No preamble. No explanation. No markdown code fences.

The JSON must have exactly this structure:
{
  "tone": "string — e.g. conversational, inspirational, educational, analytical, personal, blunt",
  "formality_level": number between 1 (very casual) and 10 (very formal),
  "avg_post_length": number — estimated word count of a typical post,
  "opening_patterns": ["string", "string", "string"] — 3 to 5 common ways they start posts,
  "closing_patterns": ["string", "string", "string"] — 3 to 5 common ways they end posts,
  "emoji_usage": "none | minimal | moderate | heavy",
  "structure_preference": "prose | bullets | mixed",
  "paragraph_length": "short | medium | long",
  "storytelling_style": "string — how do they tell stories or make points? Be specific.",
  "vocabulary_notes": "string — notable word choices, phrases they use often, things they avoid",
  "raw_summary": "string — 2 to 3 sentence human-readable summary of this person's writing voice"
}
"""

STYLE_EXTRACTION_USER = """
Analyze the following LinkedIn posts and extract the writer's style profile.

POSTS:
{posts}
"""
```

### 6.2 Style extractor service

```python
# backend/app/services/style_extractor.py
import json
from typing import List
from supabase import Client
from ..llm.factory import get_provider
from ..prompts.style_extraction import STYLE_EXTRACTION_SYSTEM, STYLE_EXTRACTION_USER


async def extract_style(posts: List[dict]) -> dict:
    """
    Sends posts to the LLM and returns the parsed style profile dict.
    Uses Claude by default for best instruction-following on JSON output.
    """
    provider = get_provider("claude")

    posts_text = "\n\n---\n\n".join(
        [p['content'] for p in posts]
    )
    user_prompt = STYLE_EXTRACTION_USER.format(posts=posts_text)

    response = await provider.generate(
        system_prompt=STYLE_EXTRACTION_SYSTEM,
        user_prompt=user_prompt,
        temperature=0.3  # low temp for consistent structured output
    )

    # Strip any accidental markdown fences
    clean = response.content.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]

    try:
        return json.loads(clean)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {str(e)}\nRaw: {response.content[:500]}")


async def extract_and_store_style(
    db: Client,
    user_id: str,
    posts: List[dict]
) -> None:
    """
    Background task: extract style and write to style_profiles table.
    Called by the upload endpoint as a BackgroundTask.
    """
    try:
        profile_data = await extract_style(posts)
        profile_data["user_id"]        = user_id
        profile_data["status"]         = "ready"
        profile_data["posts_analyzed"] = len(posts)

        db.table("style_profiles").upsert(profile_data).execute()

    except Exception as e:
        # Mark the profile as failed so the frontend can show an error
        db.table("style_profiles").upsert({
            "user_id": user_id,
            "status": "failed",
        }).execute()
        raise e
```

---

## Phase 7 — Post Generation Engine {#phase-7}

### 7.1 The generation prompt

```python
# backend/app/prompts/post_generation.py

GENERATION_SYSTEM = """
You are a LinkedIn ghostwriter. You write posts that sound exactly like the person described below.

Not like an AI. Not like a template. Not like a generic LinkedIn post.
Like this specific human, on their best writing day.

THEIR WRITING STYLE PROFILE:

Tone: {tone}
Formality (1=very casual, 10=very formal): {formality_level}
Typical post length: ~{avg_post_length} words
How they typically open posts: {opening_patterns}
How they typically close posts: {closing_patterns}
Emoji usage: {emoji_usage}
Structure preference: {structure_preference}
Paragraph length: {paragraph_length}
Storytelling style: {storytelling_style}
Vocabulary notes: {vocabulary_notes}
Overall voice: {raw_summary}

CRITICAL RULES:
1. Match the formality level exactly. Do not write more formally or casually.
2. Match their structure — if they write prose, write prose. If bullets, use bullets.
3. Open the post the way they typically open. Do not start with a generic hook.
4. Close the post the way they typically close.
5. Stay within ~20 words of their typical post length. Do not over-write.
6. Use their vocabulary. Avoid words or phrases they would never use.
7. If emoji_usage is "none", use zero emojis. If "minimal", use 1 to 2 maximum.
8. The goal: if someone who knows this person read this post, they would say "yes, that's them."

Write only the post. No explanation, no preamble, no title.
"""

GENERATION_USER = """
Write a LinkedIn post about the following:

Topic: {topic}

Key points to include:
{key_points}
"""
```

### 7.2 Post generator service

```python
# backend/app/services/post_generator.py
from supabase import Client
from ..llm.factory import get_provider
from ..prompts.post_generation import GENERATION_SYSTEM, GENERATION_USER


def _format_list(items: list) -> str:
    if not items:
        return "not specified"
    return " | ".join(f'"{item}"' for item in items)


async def generate_post(
    db: Client,
    user_id: str,
    topic: str,
    key_points: list[str],
    provider_name: str | None = None
) -> dict:
    """
    Fetches the user's style profile, constructs the prompt,
    calls the LLM, stores the result, and returns it.
    """
    # 1. Fetch style profile
    result = db.table("style_profiles") \
               .select("*") \
               .eq("user_id", user_id) \
               .single() \
               .execute()

    if not result.data:
        raise ValueError("No style profile found. Complete onboarding first.")

    profile = result.data
    if profile.get("status") != "ready":
        raise ValueError("Style profile is not ready yet.")

    # 2. Build system prompt from profile
    system = GENERATION_SYSTEM.format(
        tone=                profile.get("tone", "not specified"),
        formality_level=     profile.get("formality_level", 5),
        avg_post_length=     profile.get("avg_post_length", 150),
        opening_patterns=    _format_list(profile.get("opening_patterns", [])),
        closing_patterns=    _format_list(profile.get("closing_patterns", [])),
        emoji_usage=         profile.get("emoji_usage", "none"),
        structure_preference=profile.get("structure_preference", "prose"),
        paragraph_length=    profile.get("paragraph_length", "short"),
        storytelling_style=  profile.get("storytelling_style", "not specified"),
        vocabulary_notes=    profile.get("vocabulary_notes", "not specified"),
        raw_summary=         profile.get("raw_summary", "not specified"),
    )

    # 3. Build user prompt
    key_points_str = "\n".join(f"- {point}" for point in key_points)
    user_prompt = GENERATION_USER.format(
        topic=topic,
        key_points=key_points_str
    )

    # 4. Call LLM through factory
    provider = get_provider(provider_name)
    response = await provider.generate(
        system_prompt=system,
        user_prompt=user_prompt,
        temperature=0.8  # slightly higher for creative variation
    )

    # 5. Store in history
    db.table("generated_posts").insert({
        "user_id":      user_id,
        "topic":        topic,
        "key_points":   "\n".join(key_points),
        "provider_used":response.provider,
        "model_used":   response.model,
        "output":       response.content,
        "tokens_used":  response.tokens_used,
    }).execute()

    return {
        "output":    response.content,
        "provider":  response.provider,
        "model":     response.model,
    }
```

---

## Phase 8 — API Routes {#phase-8}

### 8.1 FastAPI main app

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .routers import style, generate

app = FastAPI(title="ByMe API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(style.router,    prefix="/style",    tags=["style"])
app.include_router(generate.router, prefix="/generate", tags=["generate"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### 8.2 Style router

```python
# backend/app/routers/style.py
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends
from ..config import get_supabase
from ..middleware.auth import get_current_user
from ..services.csv_parser import parse_linkedin_export, validate_csv
from ..services.style_extractor import extract_and_store_style
from ..llm.factory import available_providers

router = APIRouter()


@router.post("/upload")
async def upload_posts(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    content = await file.read()

    # Validate the CSV
    is_valid, error_msg = validate_csv(content)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    posts = parse_linkedin_export(content)
    db = get_supabase()

    # Clear old raw posts and insert new ones
    db.table("raw_posts").delete().eq("user_id", user_id).execute()
    db.table("raw_posts").insert([
        {"user_id": user_id, "content": p["content"], "post_date": str(p["post_date"]) if p["post_date"] else None}
        for p in posts
    ]).execute()

    # Mark profile as processing
    db.table("style_profiles").upsert({
        "user_id": user_id,
        "status": "processing"
    }).execute()

    # Run style extraction in background
    background_tasks.add_task(extract_and_store_style, db, user_id, posts)

    return {"status": "processing", "posts_found": len(posts)}


@router.get("/status")
async def get_status(user_id: str = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("style_profiles") \
               .select("status") \
               .eq("user_id", user_id) \
               .maybe_single() \
               .execute()
    if not result.data:
        return {"status": "none"}
    return {"status": result.data["status"]}


@router.get("/profile")
async def get_profile(user_id: str = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("style_profiles") \
               .select("*") \
               .eq("user_id", user_id) \
               .maybe_single() \
               .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No style profile found")
    return result.data


@router.put("/profile")
async def update_profile(
    updates: dict,
    user_id: str = Depends(get_current_user)
):
    """Allow users to manually edit their style profile fields."""
    # Whitelist which fields are editable
    allowed_fields = {
        "tone", "formality_level", "avg_post_length",
        "opening_patterns", "closing_patterns", "emoji_usage",
        "structure_preference", "paragraph_length",
        "storytelling_style", "vocabulary_notes", "raw_summary"
    }
    safe_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    if not safe_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    db = get_supabase()
    db.table("style_profiles") \
      .update(safe_updates) \
      .eq("user_id", user_id) \
      .execute()
    return {"status": "updated"}
```

### 8.3 Generate router

```python
# backend/app/routers/generate.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..config import get_supabase
from ..middleware.auth import get_current_user
from ..services.post_generator import generate_post
from ..llm.factory import available_providers
import os
from datetime import date

router = APIRouter()


class GenerateRequest(BaseModel):
    topic: str
    key_points: list[str]
    provider: str | None = None


@router.post("/")
async def generate(
    request: GenerateRequest,
    user_id: str = Depends(get_current_user)
):
    db = get_supabase()

    # Check daily rate limit
    today = str(date.today())
    limit = int(os.getenv("MAX_GENERATIONS_PER_DAY", 10))
    count_result = db.table("generated_posts") \
                     .select("id", count="exact") \
                     .eq("user_id", user_id) \
                     .gte("created_at", f"{today}T00:00:00") \
                     .execute()

    if count_result.count >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily generation limit of {limit} reached. Try again tomorrow."
        )

    # Validate provider
    if request.provider and request.provider not in available_providers():
        raise HTTPException(
            status_code=400,
            detail=f"Unknown provider. Available: {available_providers()}"
        )

    result = await generate_post(
        db=db,
        user_id=user_id,
        topic=request.topic,
        key_points=request.key_points,
        provider_name=request.provider
    )
    return result


@router.get("/history")
async def get_history(
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    db = get_supabase()
    result = db.table("generated_posts") \
               .select("id, topic, output, provider_used, created_at") \
               .eq("user_id", user_id) \
               .order("created_at", desc=True) \
               .limit(limit) \
               .execute()
    return result.data


@router.get("/providers")
async def get_providers():
    return {"providers": available_providers()}
```

---

## Phase 9 — Frontend Architecture {#phase-9}

### 9.1 Routing setup

```jsx
// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AuthGuard } from './components/auth/AuthGuard'
import { OnboardingGuard } from './components/auth/OnboardingGuard'

import Landing      from './pages/Landing'
import Login        from './pages/Login'
import Signup       from './pages/Signup'
import Onboarding   from './pages/Onboarding'
import Generator    from './pages/Generator'
import StyleProfile from './pages/StyleProfile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"        element={<Landing />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<Signup />} />

          {/* Protected routes — require auth */}
          <Route path="/onboarding" element={
            <AuthGuard><Onboarding /></AuthGuard>
          } />

          {/* Protected routes — require auth AND completed onboarding */}
          <Route path="/app" element={
            <AuthGuard><OnboardingGuard><Generator /></OnboardingGuard></AuthGuard>
          } />
          <Route path="/profile" element={
            <AuthGuard><OnboardingGuard><StyleProfile /></OnboardingGuard></AuthGuard>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

### 9.2 API service layer

```javascript
// frontend/src/services/style.js
import api from './api'

export const uploadPosts = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/style/upload', form)
}

export const getStyleStatus = () => api.get('/style/status')
export const getStyleProfile = () => api.get('/style/profile')
export const updateStyleProfile = (updates) => api.put('/style/profile', updates)
```

```javascript
// frontend/src/services/generate.js
import api from './api'

export const generatePost = ({ topic, key_points, provider }) =>
  api.post('/generate/', { topic, key_points, provider })

export const getHistory = (limit = 20) =>
  api.get(`/generate/history?limit=${limit}`)

export const getProviders = () =>
  api.get('/generate/providers')
```

---

## Phase 10 — Screen Implementations {#phase-10}

### 10.1 Onboarding page flow

The onboarding has 3 internal steps managed with local state:

```
step 1: "upload"     → drag-and-drop CSV upload
step 2: "processing" → spinner + polling /style/status every 3 seconds
step 3: "review"     → show extracted style, let user tweak, confirm
```

```jsx
// frontend/src/pages/Onboarding.jsx
import { useState } from 'react'
import UploadStep     from '../components/onboarding/UploadStep'
import ProcessingStep from '../components/onboarding/ProcessingStep'
import StyleReviewStep from '../components/onboarding/StyleReviewStep'

export default function Onboarding() {
  const [step, setStep] = useState('upload')  // 'upload' | 'processing' | 'review'

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-8">
      {step === 'upload'     && <UploadStep     onDone={() => setStep('processing')} />}
      {step === 'processing' && <ProcessingStep onDone={() => setStep('review')} />}
      {step === 'review'     && <StyleReviewStep />}
    </div>
  )
}
```

The `ProcessingStep` polls every 3 seconds:

```jsx
// frontend/src/components/onboarding/ProcessingStep.jsx
import { useEffect } from 'react'
import { getStyleStatus } from '../../services/style'

export default function ProcessingStep({ onDone }) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await getStyleStatus()
      if (data.status === 'ready') {
        clearInterval(interval)
        onDone()
      }
      if (data.status === 'failed') {
        clearInterval(interval)
        alert('Style extraction failed. Please try uploading again.')
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [onDone])

  return (
    <div className="text-center">
      <div className="font-serif text-3xl font-light text-ink mb-4">
        Learning your voice...
      </div>
      <p className="text-muted text-sm">
        ByMe is reading your posts. This takes about 10 seconds.
      </p>
    </div>
  )
}
```

### 10.2 Generator page layout

Two-panel layout. Left panel has inputs, right panel has output.
State is managed with the `useGenerator` hook.

```javascript
// frontend/src/hooks/useGenerator.js
import { useState } from 'react'
import { generatePost } from '../services/generate'

export function useGenerator() {
  const [topic,      setTopic]      = useState('')
  const [keyPoints,  setKeyPoints]  = useState([''])
  const [provider,   setProvider]   = useState('claude')
  const [output,     setOutput]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const generate = async () => {
    if (!topic.trim()) return
    const points = keyPoints.filter(p => p.trim())
    if (!points.length) return

    setLoading(true)
    setError(null)
    try {
      const { data } = await generatePost({ topic, key_points: points, provider })
      setOutput(data.output)
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return {
    topic, setTopic,
    keyPoints, setKeyPoints,
    provider, setProvider,
    output, setOutput,
    loading, error,
    generate
  }
}
```

### 10.3 Model selector component

```jsx
// frontend/src/components/generator/ModelSelector.jsx
const PROVIDERS = [
  { id: 'claude', label: 'Claude' },
  { id: 'gpt4o',  label: 'GPT-4o' },
  { id: 'gemini', label: 'Gemini' },
]

export default function ModelSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {PROVIDERS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            value === p.id
              ? 'bg-ink text-paper border-ink'
              : 'bg-transparent text-muted border-surface hover:border-muted'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
```

### 10.4 Key points list component

```jsx
// frontend/src/components/generator/KeyPointsList.jsx
export default function KeyPointsList({ points, onChange }) {
  const update = (i, val) => {
    const next = [...points]
    next[i] = val
    onChange(next)
  }
  const add    = () => onChange([...points, ''])
  const remove = (i) => onChange(points.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {points.map((point, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={point}
            onChange={e => update(i, e.target.value)}
            placeholder={`Point ${i + 1}`}
            className="flex-1 bg-paper border border-surface rounded-lg px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:border-muted"
          />
          {points.length > 1 && (
            <button
              onClick={() => remove(i)}
              className="text-muted hover:text-ink text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="text-xs text-muted hover:text-ink underline underline-offset-2"
      >
        + Add point
      </button>
    </div>
  )
}
```

---

## Phase 11 — Error Handling & Edge Cases {#phase-11}

### 11.1 Edge cases to handle

| Scenario | Handling |
|---|---|
| User uploads wrong CSV (not LinkedIn posts) | `validate_csv` catches it, returns 400 with clear message |
| User has fewer than 5 usable posts | `validate_csv` catches it, explains the requirement |
| Style extraction fails mid-background-task | Profile status set to "failed"; frontend shows retry CTA |
| LLM returns invalid JSON for style extraction | `extract_style` raises `ValueError`; propagates to failed status |
| Daily rate limit hit | 429 response with "try again tomorrow" message |
| Provider API key missing or invalid | Provider `generate()` raises exception; caught in generate route, returns 500 with generic message — never expose raw API errors |
| User re-uploads CSV | Old raw posts deleted first, new ones inserted, style profile re-extracted |
| Network timeout on LLM call | httpx/asyncio timeout, returns 504 |

### 11.2 Frontend toast notifications

Every API error should trigger a toast, not a broken UI state. Build a `Toast` component and a `useToast` hook. Wire the axios error interceptor to dispatch toasts for 4xx and 5xx errors.

---

## Phase 12 — Deployment {#phase-12}

### 12.1 Frontend — Vercel

```bash
cd frontend
npm run build
# Push to GitHub. Connect repo to Vercel.
# Set environment variables in Vercel dashboard:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_API_URL  (your Railway backend URL)
```

### 12.2 Backend — Railway

```bash
# Add a Procfile to the backend directory:
echo "web: uvicorn app.main:app --host 0.0.0.0 --port \$PORT" > backend/Procfile

# Push to GitHub. Connect repo to Railway.
# Set all backend environment variables in Railway dashboard.
# Set the root directory to /backend in Railway settings.
```

### 12.3 Pre-deploy checklist

- [ ] `ENVIRONMENT=production` is set in backend
- [ ] `ALLOWED_ORIGINS` contains the Vercel production URL
- [ ] Supabase RLS policies are active (verify in Supabase dashboard)
- [ ] All API keys are in Railway env vars, not in code
- [ ] Run `pytest backend/tests/` and all tests pass
- [ ] Test the full onboarding flow end to end in staging

---

## Appendix A — Full Prompt Templates {#appendix-a}

### Style Extraction System Prompt (full)

```
You are a writing style analyst. You analyze LinkedIn posts written by a single person and extract a precise style profile.

Return ONLY a valid JSON object. No preamble. No explanation. No markdown code fences.

The JSON must have exactly this structure:
{
  "tone": "string — e.g. conversational, inspirational, educational, analytical, personal, blunt",
  "formality_level": number between 1 (very casual) and 10 (very formal),
  "avg_post_length": number — estimated word count of a typical post,
  "opening_patterns": ["string", "string", "string"] — 3 to 5 common ways they start posts,
  "closing_patterns": ["string", "string", "string"] — 3 to 5 common ways they end posts,
  "emoji_usage": "none | minimal | moderate | heavy",
  "structure_preference": "prose | bullets | mixed",
  "paragraph_length": "short | medium | long",
  "storytelling_style": "string — how do they tell stories or make points? Be specific.",
  "vocabulary_notes": "string — notable word choices, phrases they use often, things they avoid",
  "raw_summary": "string — 2 to 3 sentence human-readable summary of this person's writing voice"
}
```

### Post Generation System Prompt (full)

```
You are a LinkedIn ghostwriter. You write posts that sound exactly like the person described below.

Not like an AI. Not like a template. Not like a generic LinkedIn post.
Like this specific human, on their best writing day.

THEIR WRITING STYLE PROFILE:

Tone: {tone}
Formality (1=very casual, 10=very formal): {formality_level}
Typical post length: ~{avg_post_length} words
How they typically open posts: {opening_patterns}
How they typically close posts: {closing_patterns}
Emoji usage: {emoji_usage}
Structure preference: {structure_preference}
Paragraph length: {paragraph_length}
Storytelling style: {storytelling_style}
Vocabulary notes: {vocabulary_notes}
Overall voice: {raw_summary}

CRITICAL RULES:
1. Match the formality level exactly. Do not write more formally or casually.
2. Match their structure — if they write prose, write prose. If bullets, use bullets.
3. Open the post the way they typically open. Do not start with a generic hook.
4. Close the post the way they typically close.
5. Stay within ~20 words of their typical post length. Do not over-write.
6. Use their vocabulary. Avoid words or phrases they would never use.
7. If emoji_usage is "none", use zero emojis. If "minimal", use 1 to 2 maximum.
8. The goal: if someone who knows this person read this post, they would say "yes, that's them."

Write only the post. No explanation, no preamble, no title.
```

---

## Appendix B — API Contract {#appendix-b}

| Method | Route | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/style/upload` | Yes | `file: multipart/form-data` | `{ status, posts_found }` |
| GET | `/style/status` | Yes | — | `{ status: "none\|processing\|ready\|failed" }` |
| GET | `/style/profile` | Yes | — | Full style profile object |
| PUT | `/style/profile` | Yes | `{ field: value }` | `{ status: "updated" }` |
| POST | `/generate/` | Yes | `{ topic, key_points[], provider? }` | `{ output, provider, model }` |
| GET | `/generate/history` | Yes | `?limit=20` | Array of past posts |
| GET | `/generate/providers` | No | — | `{ providers: string[] }` |
| GET | `/health` | No | — | `{ status: "ok" }` |
