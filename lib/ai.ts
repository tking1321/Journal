import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

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

// Throws an Error with the actual message from the edge function on failure.
async function callAI(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data?.error ?? `HTTP ${response.status}`;
    console.error('[AI] edge function error:', detail);
    throw new Error(detail);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const detail = String((data as Record<string, unknown>).error);
    console.error('[AI] edge function returned error field:', detail);
    throw new Error(detail);
  }

  return data as Record<string, unknown>;
}

export async function generateDailyGoals(params: {
  categories: Array<{ name: string; growth_description: string | null }>;
  recentEntries: Array<{ content: string; entry_date: string }>;
  previousGoals: Array<{ title: string; completed: boolean; difficulty: string }>;
  streakData: { current_streak: number; longest_streak: number } | null;
  profile: AiProfile;
}): Promise<DailyGoalsResult | null> {
  try {
    return (await callAI({
      type: 'daily_goals',
      categories: params.categories,
      recentEntries: params.recentEntries,
      previousGoals: params.previousGoals,
      streakData: params.streakData,
      profile: params.profile,
    })) as DailyGoalsResult;
  } catch {
    return null;
  }
}

export async function refreshDailyGoals(params: {
  categories: Array<{ name: string; growth_description: string | null }>;
  recentEntries: Array<{ content: string; entry_date: string }>;
  previousGoals: Array<{ title: string; completed: boolean; difficulty: string }>;
  streakData: { current_streak: number; longest_streak: number } | null;
  profile: AiProfile;
}): Promise<DailyGoalsResult | null> {
  try {
    return (await callAI({
      type: 'manual_refresh',
      categories: params.categories,
      recentEntries: params.recentEntries,
      previousGoals: params.previousGoals,
      streakData: params.streakData,
      profile: params.profile,
    })) as DailyGoalsResult;
  } catch {
    return null;
  }
}

// Returns { result, error } so callers can surface the actual error to the user.
export async function generateJournalInsight(params: {
  content: string;
  recentEntries: Array<{ content: string; entry_date?: string }>;
  profile: AiProfile;
}): Promise<{ result: JournalInsightResult | null; error: string | null }> {
  try {
    const result = (await callAI({
      type: 'journal_insight',
      content: params.content,
      recentEntries: params.recentEntries,
      profile: params.profile,
    })) as JournalInsightResult;
    return { result, error: null };
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Returns { result, error } so callers can surface the actual error to the user.
export async function generateTodayCoaching(params: {
  recentEntries: Array<{ content: string; entry_date?: string }>;
  profile: AiProfile;
}): Promise<{ result: TodayCoachingResult | null; error: string | null }> {
  try {
    const result = (await callAI({
      type: 'today_coaching',
      recentEntries: params.recentEntries,
      profile: params.profile,
    })) as TodayCoachingResult;
    return { result, error: null };
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Returns { result, error } so callers can surface the actual error to the user.
export async function generateOnboardingPlan(params: {
  categories: Array<{ name: string; growth_description?: string | null }>;
  profile: AiProfile;
}): Promise<{ result: OnboardingPlanResult | null; error: string | null }> {
  try {
    const result = (await callAI({
      type: 'onboarding_plan',
      categories: params.categories,
      profile: params.profile,
    })) as OnboardingPlanResult;
    return { result, error: null };
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
