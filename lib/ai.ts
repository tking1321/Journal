import { supabase } from './supabase';

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

export interface AiResult {
  title: string;
  summary: string;
  goals: Array<{ title: string; text: string; description: string; categoryName: string; difficulty: string; xp: number }>;
  reflection: string;
  next_focus: string;
  insight: string;
}

async function callEdgeFunction(body: Record<string, unknown>): Promise<AiResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Edge function error: ${err}`);
  }

  const result = await response.json() as AiResult;

  if (result && typeof result === 'object' && 'error' in result) {
    throw new Error(String((result as any).error));
  }

  if (Array.isArray(result.goals)) {
    result.goals = result.goals.map((g: any) => ({
      ...g,
      title: g.title || g.text || '',
      text: g.text || g.title || '',
    }));
  }

  return result;
}

export async function generateGoals(params: {
  userId: string;
  categories: Array<{ name: string; growth_description: string | null }>;
  recentEntries: Array<{ content: string; entry_date: string }>;
  previousGoals: Array<{ title: string; completed: boolean; difficulty: string }>;
  streakData: { current_streak: number; longest_streak: number } | null;
  profile: AiProfile;
  today: string;
}): Promise<AiResult | null> {
  const { categories, recentEntries, previousGoals, streakData, profile } = params;
  try {
    return await callEdgeFunction({
      type: 'goals',
      categories,
      recentEntries,
      previousGoals,
      streakData,
      profile,
      dailyGoalLimit: profile.daily_goal_limit || 3,
    });
  } catch (err) {
    console.warn('AI goal generation failed:', err);
    return null;
  }
}

export async function generateJournalInsight(params: {
  userId: string;
  content: string;
  recentEntries: Array<{ content: string }>;
  profile: AiProfile;
}): Promise<AiResult | null> {
  const { content, recentEntries, profile } = params;
  try {
    return await callEdgeFunction({
      type: 'journal_summary',
      content,
      recentEntries,
      profile,
    });
  } catch (err) {
    console.warn('AI journal insight failed:', err);
    return null;
  }
}

export async function generateDailyInsight(params: {
  userId: string;
  recentEntries: Array<{ content: string }>;
  profile: AiProfile;
  today: string;
}): Promise<AiResult | null> {
  const { recentEntries, profile } = params;
  try {
    return await callEdgeFunction({
      type: 'reflection',
      recentEntries,
      profile,
    });
  } catch (err) {
    console.warn('AI daily insight failed:', err);
    return null;
  }
}

export async function generateWeeklySummary(params: {
  userId: string;
  entries: Array<{ content: string; entry_date: string }>;
  goalsCompleted: number;
  totalGoals: number;
  profile: AiProfile;
  streakData: { current_streak: number; longest_streak: number } | null;
  today: string;
}): Promise<AiResult | null> {
  const { entries, goalsCompleted, totalGoals, profile, streakData } = params;
  try {
    return await callEdgeFunction({
      type: 'weekly_summary',
      entries,
      goalsCompleted,
      totalGoals,
      profile,
      streakData,
    });
  } catch (err) {
    console.warn('AI weekly summary failed:', err);
    return null;
  }
}

export async function generateOnboardingPlan(params: {
  userId: string;
  categories: Array<{ name: string; growth_description?: string | null }>;
  profile: AiProfile;
  today: string;
}): Promise<AiResult | null> {
  const { categories, profile } = params;
  try {
    return await callEdgeFunction({
      type: 'onboarding_plan',
      categories,
      profile,
    });
  } catch (err) {
    console.warn('AI onboarding plan failed:', err);
    return null;
  }
}
