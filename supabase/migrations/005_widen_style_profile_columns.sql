-- The style-extraction LLM returns richer values than the original column
-- limits allow: `tone` includes secondary tone shifts (often > 100 chars), and
-- the descriptive enum-ish fields are not always returned as a single short
-- keyword. Widen them to TEXT so a valid profile never fails to save with
-- "value too long for type character varying".
ALTER TABLE style_profiles
  ALTER COLUMN tone                 TYPE TEXT,
  ALTER COLUMN emoji_usage          TYPE TEXT,
  ALTER COLUMN structure_preference TYPE TEXT,
  ALTER COLUMN paragraph_length     TYPE TEXT;
