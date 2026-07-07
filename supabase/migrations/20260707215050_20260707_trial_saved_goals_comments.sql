/*
# Add trial enforcement, saved goals, and goal comments

## Summary
This migration adds three groups of changes:

1. Trial enforcement fields on profiles:
   - `trial_end_date` (timestamptz) — set to trial_start_date + 7 days when a trial begins
   - `has_used_free_trial` (boolean, default false) — permanently true once any trial is started

2. New `saved_goals` table — stores user-bookmarked goals as permanent snapshots:
   - Fully independent of the daily `goals` table; persists even if daily goals are deleted/regenerated
   - Captures title, difficulty, xp_value, goal_date, and a reference to the original goal (nullable)
   - Owner-scoped RLS: each user sees only their own saved goals

3. New `goal_comments` table — permanent notes attached to a saved goal:
   - Each comment belongs to one saved_goal
   - Owner-scoped RLS via user_id
   - Cascade-deletes when the parent saved_goal is deleted

## New Columns on profiles
- `trial_end_date timestamptz` — when the free trial expires (null = never started)
- `has_used_free_trial boolean NOT NULL DEFAULT false` — true once a trial has ever been activated; never reset

## New Tables

### saved_goals
- id uuid (primary key)
- user_id uuid (owner, references auth.users, default auth.uid())
- original_goal_id uuid (nullable — the original goals.id; becomes null if daily goal is later deleted)
- title text (the goal text)
- difficulty text (easy / medium / hard)
- xp_value integer (XP awarded for this goal)
- goal_date date (the day this goal was originally for)
- saved_at timestamptz (when the user bookmarked it)

### goal_comments
- id uuid (primary key)
- user_id uuid (owner, references auth.users, default auth.uid())
- saved_goal_id uuid (references saved_goals.id, cascade on delete)
- text text (the comment body)
- created_at timestamptz

## Security
- RLS enabled on both new tables
- 4 separate per-verb policies (select/insert/update/delete) scoped to authenticated users only
- owner check via auth.uid() = user_id on all policies
*/

-- Add trial enforcement columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trial_end_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_end_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_used_free_trial'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_used_free_trial boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Saved goals table
CREATE TABLE IF NOT EXISTS saved_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  original_goal_id uuid,
  title text NOT NULL,
  difficulty text NOT NULL DEFAULT 'easy',
  xp_value integer NOT NULL DEFAULT 5,
  goal_date date,
  saved_at timestamptz DEFAULT now()
);

ALTER TABLE saved_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_goals" ON saved_goals;
CREATE POLICY "select_own_saved_goals" ON saved_goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_goals" ON saved_goals;
CREATE POLICY "insert_own_saved_goals" ON saved_goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_saved_goals" ON saved_goals;
CREATE POLICY "update_own_saved_goals" ON saved_goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_goals" ON saved_goals;
CREATE POLICY "delete_own_saved_goals" ON saved_goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Goal comments table
CREATE TABLE IF NOT EXISTS goal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_goal_id uuid NOT NULL REFERENCES saved_goals(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_goal_comments" ON goal_comments;
CREATE POLICY "select_own_goal_comments" ON goal_comments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_goal_comments" ON goal_comments;
CREATE POLICY "insert_own_goal_comments" ON goal_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_goal_comments" ON goal_comments;
CREATE POLICY "update_own_goal_comments" ON goal_comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_goal_comments" ON goal_comments;
CREATE POLICY "delete_own_goal_comments" ON goal_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_goals_user_id ON saved_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_comments_saved_goal_id ON goal_comments(saved_goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_comments_user_id ON goal_comments(user_id);
