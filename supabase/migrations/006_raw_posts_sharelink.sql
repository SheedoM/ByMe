-- Store the LinkedIn post URL so users can identify and verify posts
-- in the "Pick your best posts" selector.
ALTER TABLE raw_posts ADD COLUMN IF NOT EXISTS share_link TEXT;
