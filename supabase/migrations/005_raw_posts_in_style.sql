-- Mark which raw posts are included in the user's style analysis.
-- Defaults to true so all existing posts remain active after the migration.
ALTER TABLE raw_posts ADD COLUMN IF NOT EXISTS in_style boolean NOT NULL DEFAULT true;
