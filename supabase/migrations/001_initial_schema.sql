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
-- ========================================
CREATE TABLE generated_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    topic         TEXT NOT NULL,
    key_points    TEXT NOT NULL,
    provider_used VARCHAR(20) NOT NULL,
    model_used    VARCHAR(100) NOT NULL,
    plan_type     VARCHAR(10) DEFAULT 'free',  -- 'free' | 'byok'
    output        TEXT NOT NULL,
    tokens_used   INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ROW LEVEL SECURITY
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
