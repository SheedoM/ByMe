-- ========================================
-- USER SETTINGS
-- Stores plan type (free | byok) and BYOK
-- provider configuration per user.
-- The API key is stored encrypted — never
-- expose the raw key anywhere.
-- ========================================
CREATE TABLE user_settings (
    user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type             VARCHAR(10) DEFAULT 'free',   -- 'free' | 'byok'
    byok_provider         VARCHAR(20),                  -- 'claude' | 'openai' | 'gemini'
    byok_model            VARCHAR(100),                 -- e.g. 'claude-3-5-sonnet-20241022'
    byok_api_key_encrypted TEXT,                        -- Fernet-encrypted key
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings: user owns their data"
    ON user_settings FOR ALL
    USING (auth.uid() = user_id);

-- ========================================
-- INDEX
-- ========================================
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
