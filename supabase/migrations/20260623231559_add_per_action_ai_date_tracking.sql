ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_insight_generation_date date,
  ADD COLUMN IF NOT EXISTS last_plan_generation_date date,
  ADD COLUMN IF NOT EXISTS last_summary_generation_date date,
  ADD COLUMN IF NOT EXISTS last_weekly_summary_json jsonb;
