-- Store the user's edited final version of a generated post.
-- The original AI output remains immutable in generated_posts.output.
ALTER TABLE generated_posts
  ADD COLUMN IF NOT EXISTS final_output TEXT,
  ADD COLUMN IF NOT EXISTS final_saved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_in_style BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_generated_posts_final_examples
  ON generated_posts(user_id, final_saved_at DESC)
  WHERE final_in_style = true;
