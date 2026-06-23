/*
# Create self-improvement journaling app schema

1. New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `display_name` (text)
  - `coaching_style` (text) - preferred support style
  - `journaling_style` (text)
  - `daily_time_commitment` (text)
  - `biggest_obstacle` (text)
  - `success_vision` (text)
  - `reminder_time` (text)
  - `subscription_status` (text) - free/trial/active/expired
  - `trial_start_date` (timestamptz)
  - `subscription_plan` (text) - monthly/annual
  - `onboarding_completed` (boolean)
  - `created_at` (timestamptz)

- `categories`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `name` (text) - e.g. "better communicator"
  - `growth_description` (text) - how they want to grow
  - `created_at` (timestamptz)

- `journal_entries`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `content` (text)
  - `ai_summary` (text)
  - `mood` (text)
  - `entry_date` (date)
  - `created_at` (timestamptz)

- `goals`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `category_id` (uuid, references categories)
  - `title` (text)
  - `description` (text)
  - `completed` (boolean)
  - `goal_date` (date)
  - `created_at` (timestamptz)

- `streaks`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `current_streak` (integer)
  - `longest_streak` (integer)
  - `last_active_date` (date)
  - `created_at` (timestamptz)

- `weekly_summaries`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `summary` (text)
  - `patterns` (text)
  - `week_start` (date)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on all tables
- Owner-scoped CRUD policies for authenticated users
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  coaching_style text,
  journaling_style text,
  daily_time_commitment text,
  biggest_obstacle text,
  success_vision text,
  reminder_time text,
  subscription_status text NOT NULL DEFAULT 'free',
  trial_start_date timestamptz,
  subscription_plan text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  growth_description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  ai_summary text,
  mood text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_entries" ON journal_entries;
CREATE POLICY "select_own_entries" ON journal_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_entries" ON journal_entries;
CREATE POLICY "insert_own_entries" ON journal_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_entries" ON journal_entries;
CREATE POLICY "update_own_entries" ON journal_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_entries" ON journal_entries;
CREATE POLICY "delete_own_entries" ON journal_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  completed boolean NOT NULL DEFAULT false,
  goal_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_goals" ON goals;
CREATE POLICY "select_own_goals" ON goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_goals" ON goals;
CREATE POLICY "insert_own_goals" ON goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_goals" ON goals;
CREATE POLICY "update_own_goals" ON goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_goals" ON goals;
CREATE POLICY "delete_own_goals" ON goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Streaks table
CREATE TABLE IF NOT EXISTS streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_streaks" ON streaks;
CREATE POLICY "select_own_streaks" ON streaks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_streaks" ON streaks;
CREATE POLICY "insert_own_streaks" ON streaks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_streaks" ON streaks;
CREATE POLICY "update_own_streaks" ON streaks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_streaks" ON streaks;
CREATE POLICY "delete_own_streaks" ON streaks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Weekly summaries table
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text,
  patterns text,
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_summaries" ON weekly_summaries;
CREATE POLICY "select_own_summaries" ON weekly_summaries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_summaries" ON weekly_summaries;
CREATE POLICY "insert_own_summaries" ON weekly_summaries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_summaries" ON weekly_summaries;
CREATE POLICY "update_own_summaries" ON weekly_summaries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_summaries" ON weekly_summaries;
CREATE POLICY "delete_own_summaries" ON weekly_summaries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_date ON goals(goal_date);
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
