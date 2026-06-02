-- Engagement score derived from the optional LinkedIn Analytics export.
-- NULL means analytics have not been uploaded for this post yet.
ALTER TABLE raw_posts ADD COLUMN IF NOT EXISTS engagement_score INTEGER;
