import { supabase } from './supabase';

const MODEL = 'gpt-4.5-mini';
const MAX_TOKENS = 900;

const SYSTEM_PROMPT =
  'You are an AI coach for a self-improvement journaling app. Be concise, supportive, specific, and actionable. Return only the requested JSON with no extra text or markdown.';

const LEVEL_THRESHOLDS = [0, 20, 40, 65, 95, 130, 170];

function getThresholdForLevel(level: number): number {
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1];
  const lastBase = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  let sum = lastBase;
  const extra = level - LEVEL_THRESHOLDS.length;
  for (let i = 0; i < extra; i++) {
    sum += 40 + (LEVEL_THRESHOLDS.length + i) * 5;
  }
  return sum;
}

function getXpInCurrentLevel(totalXp: number, level: number): number {
  return totalXp - getThresholdForLevel(level);
}

function getXpForNextLevel(level: number): number {
  return getThresholdForLevel(level + 1) - getThresholdForLevel(level);
}

const GOAL_DISTRIBUTIONS: Record<number, Array<{ difficulty: string; xp: number }>> = {
  3: [{ difficulty: 'easy', xp: 5 }, { difficulty: 'medium', xp: 10 }, { difficulty: 'hard', xp: 20 }],
  4: [{ difficulty: 'easy', xp: 5 }, { difficulty: 'easy', xp: 5 }, { difficulty: 'medium', xp: 10 }, { difficulty: 'hard', xp: 20 }],
  5: [{ difficulty: 'easy', xp: 5 }, { difficulty: 'easy', xp: 5 }, { difficulty: 'medium', xp: 10 }, { difficulty: 'medium', xp: 10 }, { difficulty: 'hard', xp: 20 }],
  6: [{ difficulty: 'easy', xp: 5 }, { difficulty: 'easy', xp: 5 }, { difficulty: 'easy', xp: 5 }, { difficulty: 'medium', xp: 10 }, { difficulty: 'medium', xp: 10 }, { difficulty: 'hard', xp: 20 }],
};

function buildCoachVoice(coachingStyle: string | undefined): string {
  const voiceMap: Record<string, string> = {
    'strict coach': 'Direct, no-nonsense, demanding. Expects results.',
    'gentle coach': 'Warm, encouraging, compassionate. Believes in the user.',
    'reflective prompts': 'Socratic, asks powerful questions, illuminates rather than prescribes.',
    'accountability': 'Results-obsessed, tracks commitments, celebrates follow-through.',
    'direct action': 'Pragmatic, gives concrete next steps only.',
  };
  return voiceMap[coachingStyle || 'gentle coach'] || voiceMap['gentle coach'];
}

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

function buildUserPrompt(params: {
  type: string;
  categories?: Array<{ name: string; growth_description?: string | null }>;
  recentEntries?: Array<{ content: string; entry_date?: string }>;
  profile?: AiProfile;
  previousGoals?: Array<{ title: string; completed: boolean; difficulty: string }>;
  streakData?: { current_streak: number; longest_streak: number } | null;
  dailyGoalLimit?: number;
  content?: string;
  entries?: Array<{ content: string; entry_date: string }>;
  goalsCompleted?: number;
  totalGoals?: number;
}): string {
  const { type, categories, recentEntries, profile, previousGoals, streakData, dailyGoalLimit, content, entries, goalsCompleted, totalGoals } = params;

  const goalCount = dailyGoalLimit || profile?.daily_goal_limit || 3;
  const distribution = GOAL_DISTRIBUTIONS[goalCount] || GOAL_DISTRIBUTIONS[3];
  const coachVoice = buildCoachVoice(profile?.coaching_style ?? undefined);
  const level = profile?.user_level || 1;
  const totalXp = profile?.total_xp_earned || 0;
  const xpInLevel = getXpInCurrentLevel(totalXp, level);
  const xpNeeded = getXpForNextLevel(level);

  const baseContext = `Coach voice: ${coachVoice}
User profile:
- Coaching style: ${profile?.coaching_style || 'gentle coach'}
- Journaling style: ${profile?.journaling_style || 'freeform'}
- Biggest obstacle: ${profile?.biggest_obstacle || 'building consistent habits'}
- 30-day vision: ${profile?.success_vision || 'become more disciplined'}
- Current level: ${level} (${xpInLevel}/${xpNeeded} XP to next level)
- Daily goal limit: ${goalCount}`;

  const streakContext = streakData
    ? `Streak: ${streakData.current_streak} days current, ${streakData.longest_streak} longest.`
    : '';

  const prevGoalsContext = (previousGoals || []).slice(0, 8)
    .map((g) => `${g.completed ? '[DONE]' : '[UNFINISHED]'} (${g.difficulty}) ${g.title}`)
    .join('\n');

  const recentContext = (recentEntries || []).slice(0, 3)
    .map((e) => e.content.slice(0, 200))
    .join(' | ');

  if (type === 'goals') {
    const categoryList = (categories || [])
      .map((c) => `- ${c.name}: ${c.growth_description || 'grow in this area'}`)
      .join('\n');

    const difficultySpec = distribution
      .map((d) => `- 1 ${d.difficulty} goal (${d.xp} XP)`)
      .join('\n');

    return `${baseContext}

Request type: daily_goals
Generate exactly ${goalCount} personalized daily goals.

Required difficulty distribution:
${difficultySpec}

Growth areas:
${categoryList}

${recentContext ? `Recent journal context: ${recentContext}` : ''}
${prevGoalsContext ? `\nPrevious goals (do NOT duplicate):\n${prevGoalsContext}` : ''}
${streakContext ? `\n${streakContext}` : ''}

Rules:
- Easy: simple daily habit, quick win (5-10 min)
- Medium: moderate effort, requires focus (15-30 min)
- Hard: challenging, stretches comfort zone (30+ min)
- Do not repeat titles from previous goals
- Make every goal specific and tied to their growth areas

Return strict JSON:
{
  "title": "Today's Focus",
  "summary": "One sentence about what today is about",
  "goals": [
    { "text": "Specific actionable goal", "difficulty": "easy|medium|hard", "xp": 5, "description": "Brief context (1 sentence)", "categoryName": "exact category name" }
  ],
  "reflection": "One sentence coaching message in their voice",
  "next_focus": "",
  "insight": ""
}`;
  }

  if (type === 'journal_summary') {
    return `${baseContext}

Request type: journal_reflection
The user just saved this journal entry:
"${content}"

${recentContext ? `Previous entries context: ${recentContext}` : ''}

Return strict JSON:
{
  "title": "",
  "summary": "1-sentence insight about the entry",
  "goals": [],
  "reflection": "1-sentence coaching message (max 20 words)",
  "next_focus": "Specific thing to focus on next",
  "insight": "Perceptive observation about their pattern"
}`;
  }

  if (type === 'reflection') {
    return `${baseContext}

Request type: reflection
${recentContext ? `Recent journal entries: ${recentContext}` : 'No recent entries.'}

Write a single coaching sentence for today (max 20 words).

Return strict JSON:
{
  "title": "",
  "summary": "",
  "goals": [],
  "reflection": "Your coaching message here",
  "next_focus": "",
  "insight": ""
}`;
  }

  return `Return JSON: { "title": "", "summary": "Unknown request type", "goals": [], "reflection": "", "next_focus": "", "insight": "" }`;
}

async function callOpenAI(userPrompt: string): Promise<AiResult> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content) as AiResult;

  // Normalize goals: support both .text and .title from model
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
  const { userId, categories, recentEntries, previousGoals, streakData, profile, today } = params;

  try {
    const prompt = buildUserPrompt({
      type: 'goals',
      categories,
      recentEntries,
      previousGoals,
      streakData,
      profile,
      dailyGoalLimit: profile.daily_goal_limit || 3,
    });

    const result = await callOpenAI(prompt);

    // Cache result and mark generation date
    await supabase.from('profiles').update({
      last_goal_generation_date: today,
      last_ai_request_type: 'goals',
      last_ai_request_date: today,
      last_ai_response_json: result as unknown as Record<string, unknown>,
    }).eq('id', userId);

    return result;
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
    const prompt = buildUserPrompt({
      type: 'journal_summary',
      content,
      recentEntries,
      profile,
    });

    return await callOpenAI(prompt);
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
  const { userId, recentEntries, profile, today } = params;

  try {
    const prompt = buildUserPrompt({
      type: 'reflection',
      recentEntries,
      profile,
    });

    const result = await callOpenAI(prompt);

    await supabase.from('profiles').update({
      last_ai_request_type: 'reflection',
      last_ai_request_date: today,
      last_ai_response_json: result as unknown as Record<string, unknown>,
    }).eq('id', userId);

    return result;
  } catch (err) {
    console.warn('AI daily insight failed:', err);
    return null;
  }
}
