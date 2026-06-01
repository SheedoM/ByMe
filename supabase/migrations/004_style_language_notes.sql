-- Captures the user's natural writing language, register, dialect, and
-- code-switching pattern as free text rather than a rigid enum.
ALTER TABLE style_profiles
  ADD COLUMN IF NOT EXISTS language_style_notes TEXT;
