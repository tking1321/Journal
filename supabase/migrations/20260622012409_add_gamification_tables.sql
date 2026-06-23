-- Daily completion rings: track journal/goals/reflection per day
CREATE TABLE IF NOT EXISTS daily_rings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ring_date date NOT NULL DEFAULT CURRENT_DATE,
  journal_done boolean NOT NULL DEFAULT false,
  goals_done boolean NOT NULL DEFAULT false,
  reflection_done boolean NOT NULL DEFAULT false,
  day_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ring_date)
);

ALTER TABLE daily_rings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rings" ON daily_rings;
CREATE POLICY "select_own_rings" ON daily_rings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_rings" ON daily_rings;
CREATE POLICY "insert_own_rings" ON daily_rings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_rings" ON daily_rings;
CREATE POLICY "update_own_rings" ON daily_rings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_rings" ON daily_rings;
CREATE POLICY "delete_own_rings" ON daily_rings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Achievements: surprise unlocks
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_achievements" ON achievements;
CREATE POLICY "select_own_achievements" ON achievements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_achievements" ON achievements;
CREATE POLICY "insert_own_achievements" ON achievements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_achievements" ON achievements;
CREATE POLICY "update_own_achievements" ON achievements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_achievements" ON achievements;
CREATE POLICY "delete_own_achievements" ON achievements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Monthly island progress
CREATE TABLE IF NOT EXISTS island_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  buildings_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE island_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_island" ON island_progress;
CREATE POLICY "select_own_island" ON island_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_island" ON island_progress;
CREATE POLICY "insert_own_island" ON island_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_island" ON island_progress;
CREATE POLICY "update_own_island" ON island_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_island" ON island_progress;
CREATE POLICY "delete_own_island" ON island_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Extend streaks table with gamification fields
ALTER TABLE streaks
  ADD COLUMN IF NOT EXISTS streak_goal integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS freeze_uses_remaining integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS freeze_month text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_rings_user_date ON daily_rings(user_id, ring_date);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_island_progress_user_id ON island_progress(user_id);
