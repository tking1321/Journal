import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 900;

const SYSTEM_PROMPT = `You are an AI coach for a self-improvement journaling app. Be concise, supportive, specific, and actionable. Return only the requested JSON with no extra text or markdown.`;

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
  3: [{ difficulty: "easy", xp: 5 }, { difficulty: "medium", xp: 10 }, { difficulty: "hard", xp: 20 }],
  4: [{ difficulty: "easy", xp: 5 }, { difficulty: "easy", xp: 5 }, { difficulty: "medium", xp: 10 }, { difficulty: "hard", xp: 20 }],
  5: [{ difficulty: "easy", xp: 5 }, { difficulty: "easy", xp: 5 }, { difficulty: "medium", xp: 10 }, { difficulty: "medium", xp: 10 }, { difficulty: "hard", xp: 20 }],
  6: [{ difficulty: "easy", xp: 5 }, { difficulty: "easy", xp: 5 }, { difficulty: "easy", xp: 5 }, { difficulty: "medium", xp: 10 }, { difficulty: "medium", xp: 10 }, { difficulty: "hard", xp: 20 }],
};

function buildCoachVoice(coachingStyle: string | undefined): string {
  const voiceMap: Record<string, string> = {
    "strict coach": "Direct, no-nonsense, demanding. Expects results.",
    "gentle coach": "Warm, encouraging, compassionate. Believes in the user.",
    "reflective prompts": "Socratic, asks powerful questions, illuminates rather than prescribes.",
    "accountability": "Results-obsessed, tracks commitments, celebrates follow-through.",
    "direct action": "Pragmatic, gives concrete next steps only.",
  };
  return voiceMap[coachingStyle || "gentle coach"] || voiceMap["gentle coach"];
}

function buildUserPrompt(params: {
  type: string;
  categories?: Array<{ name: string; growth_description?: string }>;
  recentEntries?: Array<{ content: string; entry_date?: string }>;
  profile?: {
    coaching_style?: string;
    journaling_style?: string;
    biggest_obstacle?: string;
    success_vision?: string;
    user_level?: number;
    current_xp?: number;
    total_xp_earned?: number;
    daily_goal_limit?: number;
  };
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
  const coachVoice = buildCoachVoice(profile?.coaching_style);
  const level = profile?.user_level || 1;
  const totalXp = profile?.total_xp_earned || 0;
  const xpInLevel = getXpInCurrentLevel(totalXp, level);
  const xpNeeded = getXpForNextLevel(level);

  const baseContext = `Coach voice: ${coachVoice}
User profile:
- Coaching style: ${profile?.coaching_style || "gentle coach"}
- Journaling style: ${profile?.journaling_style || "freeform"}
- Biggest obstacle: ${profile?.biggest_obstacle || "building consistent habits"}
- 30-day vision: ${profile?.success_vision || "become more disciplined"}
- Current level: ${level} (${xpInLevel}/${xpNeeded} XP to next level)
- Daily goal limit: ${goalCount}`;

  const streakContext = streakData
    ? `Streak: ${streakData.current_streak} days current, ${streakData.longest_streak} longest.`
    : "";

  const prevGoalsContext = (previousGoals || []).slice(0, 8)
    .map((g) => `${g.completed ? "[DONE]" : "[UNFINISHED]"} (${g.difficulty}) ${g.title}`)
    .join("\n");

  const recentContext = (recentEntries || []).slice(0, 3)
    .map((e) => e.content.slice(0, 200))
    .join(" | ");

  if (type === "goals" || type === "daily_goals") {
    const categoryList = (categories || [])
      .map((c) => `- ${c.name}: ${c.growth_description || "grow in this area"}`)
      .join("\n");

    const difficultySpec = distribution
      .map((d) => `- 1 ${d.difficulty} goal (${d.xp} XP)`)
      .join("\n");

    return `${baseContext}

Request type: daily_goals
Generate exactly ${goalCount} personalized daily goals.

Required difficulty distribution:
${difficultySpec}

Growth areas:
${categoryList}

${recentContext ? `Recent journal context: ${recentContext}` : ""}
${prevGoalsContext ? `\nPrevious goals (do NOT duplicate):\n${prevGoalsContext}` : ""}
${streakContext ? `\n${streakContext}` : ""}

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

  if (type === "journal_summary" || type === "journal_reflection") {
    return `${baseContext}

Request type: journal_reflection
The user just saved this journal entry:
"${content}"

${recentContext ? `Previous entries context: ${recentContext}` : ""}

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

  if (type === "weekly_summary") {
    const entriesText = (entries || [])
      .map((e) => `[${e.entry_date}] ${e.content.slice(0, 150)}`)
      .join("\n");
    const completionRate = (totalGoals || 0) > 0
      ? Math.round(((goalsCompleted || 0) / (totalGoals || 1)) * 100)
      : 0;

    return `${baseContext}

Request type: weekly_summary
${streakContext}

This week's journal entries:
${entriesText || "No entries this week."}

Stats: ${goalsCompleted}/${totalGoals} goals completed (${completionRate}% rate).

Return strict JSON:
{
  "title": "Weekly Review",
  "summary": "2-3 sentence summary of their week",
  "goals": [],
  "reflection": "One powerful coaching sentence for next week",
  "next_focus": "The single most important area to focus on next week",
  "insight": "One key pattern you notice from their data"
}`;
  }

  if (type === "reflection") {
    return `${baseContext}

Request type: reflection
${recentContext ? `Recent journal entries: ${recentContext}` : "No recent entries."}

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

  if (type === "onboarding_plan") {
    const categoryList = (categories || [])
      .map((c) => `- ${c.name}: ${c.growth_description || "grow in this area"}`)
      .join("\n");

    return `${baseContext}

Request type: onboarding_plan
The user has just completed onboarding. Generate a personalized 30-day growth plan summary based on their specific answers.

Growth areas they chose:
${categoryList}

Return strict JSON:
{
  "title": "Your 30-Day Journey",
  "summary": "2-3 sentence personalized plan overview tied to their specific categories and biggest obstacle",
  "goals": [],
  "reflection": "One powerful motivating sentence personalized to their coaching style and 30-day vision",
  "next_focus": "The single most important thing to focus on in week one",
  "insight": ""
}`;
  }

  return `Return JSON: { "title": "", "summary": "Unknown request type", "goals": [], "reflection": "", "next_focus": "", "insight": "" }`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let userId: string | null = null;

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body = await req.json();
    const { type, categories, recentEntries, profile, previousGoals, streakData, dailyGoalLimit, content, entries, goalsCompleted, totalGoals } = body;

    const today = new Date().toISOString().split("T")[0];

    if (userId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("ai_request_lock, ai_generation_count_today, last_ai_request_date, last_ai_request_type, last_ai_response_json")
        .eq("id", userId)
        .maybeSingle();

      if (prof) {
        // Return cached result for goals only if the cached response has actual content
        if (
          prof.last_ai_request_date === today &&
          prof.last_ai_request_type === type &&
          prof.last_ai_response_json &&
          Array.isArray((prof.last_ai_response_json as Record<string, unknown>).goals) &&
          ((prof.last_ai_response_json as Record<string, unknown>).goals as unknown[]).length > 0 &&
          (type === "daily_goals" || type === "goals")
        ) {
          return new Response(JSON.stringify(prof.last_ai_response_json), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Block parallel requests
        if (prof.ai_request_lock) {
          return new Response(
            JSON.stringify({ error: "Request already in progress" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Reset daily count on new day
        if (prof.last_ai_request_date !== today) {
          await supabase.from("profiles").update({ ai_generation_count_today: 0 }).eq("id", userId);
        }

        // Set lock
        await supabase.from("profiles").update({ ai_request_lock: true }).eq("id", userId);
      }
    }

    let result: Record<string, unknown> = {};

    try {
      const userPrompt = buildUserPrompt({
        type, categories, recentEntries, profile, previousGoals, streakData,
        dailyGoalLimit, content, entries, goalsCompleted, totalGoals,
      });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: MAX_TOKENS,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI error: ${err}`);
      }

      const data = await response.json();
      result = JSON.parse(data.choices[0].message.content);

      // Normalize goals field: support both "goals[].text" and "goals[].title" from AI
      if (Array.isArray(result.goals)) {
        result.goals = (result.goals as Array<Record<string, unknown>>).map((g) => ({
          ...g,
          title: g.title || g.text || "",
          text: g.text || g.title || "",
        }));
      }

      // Only persist successful responses
      if (userId) {
        const currentCount = await supabase
          .from("profiles")
          .select("ai_generation_count_today")
          .eq("id", userId)
          .maybeSingle();

        await supabase.from("profiles").update({
          ai_request_lock: false,
          last_ai_request_type: type,
          last_ai_request_date: today,
          last_ai_response_json: result,
          last_ai_response_at: new Date().toISOString(),
          ai_generation_count_today: (currentCount.data?.ai_generation_count_today || 0) + 1,
        }).eq("id", userId);
      }
    } catch (innerErr) {
      // Release lock without caching the failed result
      if (userId) {
        await supabase.from("profiles").update({ ai_request_lock: false }).eq("id", userId).catch(() => {});
      }
      throw innerErr;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (userId) {
      await supabase.from("profiles").update({ ai_request_lock: false }).eq("id", userId).catch(() => {});
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
