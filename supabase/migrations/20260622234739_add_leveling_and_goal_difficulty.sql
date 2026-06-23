-- Add leveling and goal difficulty fields

-- Profile leveling fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_xp_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_goal_limit integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_goal_generation_date date;

-- Goal difficulty fields
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'easy',
  ADD COLUMN IF NOT EXISTS xp_value integer NOT NULL DEFAULT 5;
