-- ========================================
-- FEEDBACK
-- Stores the user's 1-click rating on each
-- generated post. Used for future style
-- profile improvement (V2 feature).
-- ========================================
ALTER TABLE generated_posts
  ADD COLUMN feedback     VARCHAR(20),  -- 'nailed_it' | 'almost' | 'not_quite' | NULL
  ADD COLUMN post_type    VARCHAR(20),  -- 'story' | 'hot_take' | 'lesson' | 'observation' | 'update'
  ADD COLUMN selected_hook TEXT;         -- the hook the user selected, if hook variants were used

-- Run this in Supabase SQL Editor.
