ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_ai_request_type text,
  ADD COLUMN IF NOT EXISTS last_ai_request_date date,
  ADD COLUMN IF NOT EXISTS last_ai_response_json jsonb,
  ADD COLUMN IF NOT EXISTS last_ai_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_request_lock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_generation_count_today integer NOT NULL DEFAULT 0;

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS ai_reflection text,
  ADD COLUMN IF NOT EXISTS ai_next_focus text;
