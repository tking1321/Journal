ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_goal_refresh_date date;
