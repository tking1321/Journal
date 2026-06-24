import { supabase } from './supabase';

export type AiRequestType =
  | 'daily_goals'
  | 'journal_insight'
  | 'today_coaching'
  | 'onboarding_plan'
  | 'manual_refresh'
  | 'journal_completion_insight';

export interface AiProfile {
  coaching_style?: string | null;
  journaling_style?: string | null;
  biggest_obstacle?: string | null;
  success_vision?: string | null;
  user_level?: number;
  current_xp?: number;
  total_xp_earned?: number;
  daily_goal_limit?: number;
}

export interface DailyGoalsResult {
  title: string;
  daily_goals: Array<{ text: string; difficulty: string; xp: number; categoryName: string }>;
  coach_note: string;
  insight: string;
}

export interface JournalInsightResult {
  summary: string;
  reflection: string;
  next_focus: string;
  action_step: string;
}

export interface TodayCoachingResult {
  coach_note: string;
  next_focus: string;
  insight: string;
}

export interface OnboardingPlanResult {
  plan_title: string;
  summary: string;
  categories: string[];
  daily_routine: string[];
  first_week_focus: string[];
  motivation_note: string;
}

async function callAI(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn(`AI request failed (${response.status}):`, text);
    return null;
  }

  const result = await response.json();
  if (result && typeof result === 'object' && 'error' in result) {
    console.warn('AI returned error:', result.error);
    return null;
  }

  return result;
}

export async function generateDailyGoals(params: {
  categories: Array<{ name: string; growth_description: string | null }>;
  recentEntries: Array<{ content: string; entry_date: string }>;
  previousGoals: Array<{ title: string; completed: boolean; difficulty: string }>;
  streakData: { current_streak: number; longest_streak: number } | null;
  profile: AiProfile;
}): Promise<DailyGoalsResult | null> {
  const result = await callAI({
    type: 'daily_goals',
    categories: params.categories,
    recentEntries: params.recentEntries,
    previousGoals: params.previousGoals,
    streakData: params.streakData,
    profile: params.profile,
  });
  return result as DailyGoalsResult | null;
}

export async function refreshDailyGoals(params: {
  categories: Array<{ name: string; growth_description: string | null }>;
  recentEntries: Array<{ content: string; entry_date: string }>;
  previousGoals: Array<{ title: string; completed: boolean; difficulty: string }>;
  streakData: { current_streak: number; longest_streak: number } | null;
  profile: AiProfile;
}): Promise<DailyGoalsResult | null> {
  const result = await callAI({
    type: 'manual_refresh',
    categories: params.categories,
    recentEntries: params.recentEntries,
    previousGoals: params.previousGoals,
    streakData: params.streakData,
    profile: params.profile,
  });
  return result as DailyGoalsResult | null;
}

export async function generateJournalInsight(params: {
  content: string;
  recentEntries: Array<{ content: string; entry_date?: string }>;
  profile: AiProfile;
}): Promise<JournalInsightResult | null> {
  const result = await callAI({
    type: 'journal_insight',
    content: params.content,
    recentEntries: params.recentEntries,
    profile: params.profile,
  });
  return result as JournalInsightResult | null;
}

export async function generateTodayCoaching(params: {
  recentEntries: Array<{ content: string; entry_date?: string }>;
  profile: AiProfile;
}): Promise<TodayCoachingResult | null> {
  const result = await callAI({
    type: 'today_coaching',
    recentEntries: params.recentEntries,
    profile: params.profile,
  });
  return result as TodayCoachingResult | null;
}

export async function generateOnboardingPlan(params: {
  categories: Array<{ name: string; growth_description?: string | null }>;
  profile: AiProfile;
}): Promise<OnboardingPlanResult | null> {
  const result = await callAI({
    type: 'onboarding_plan',
    categories: params.categories,
    profile: params.profile,
  });
  return result as OnboardingPlanResult | null;
}
