import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL = "gpt-5.4-mini";

const SYSTEM_INSTRUCTIONS = `You are an AI self-improvement coach inside a journaling and growth app.
You are calm, concise, supportive, and highly personalized.
Return only valid JSON in the exact schema requested.
Do not add commentary.
Do not add extra fields.
Do not explain your reasoning.
Do not mention policies or limitations.`;

function buildUserInput(params: {
  type: string;
  categories?: Array<{ name: string; growth_description?: string | null }>;
  recentEntries?: Array<{ content: string; entry_date?: string }>;
  profile?: {
    coaching_style?: string | null;
    journaling_style?: string | null;
    biggest_obstacle?: string | null;
    success_vision?: string | null;
    user_level?: number;
    current_xp?: number;
    total_xp_earned?: number;
    daily_goal_limit?: number;
  };
  previousGoals?: Array<{ title: string; completed: boolean; difficulty: string }>;
  streakData?: { current_streak: number; longest_streak: number } | null;
  content?: string;
  entries?: Array<{ content: string; entry_date: string }>;
  goalsCompleted?: number;
  totalGoals?: number;
}): string {
  const { type, categories, recentEntries, profile, previousGoals, streakData, content, entries, goalsCompleted, totalGoals } = params;

  const goalCount = profile?.daily_goal_limit || 3;

  const context = `USER CONTEXT:
- Coaching style: ${profile?.coaching_style || "gentle coach"}
- Journaling style: ${profile?.journaling_style || "freeform"}
- Biggest obstacle: ${profile?.biggest_obstacle || "building consistent habits"}
- 30-day vision: ${profile?.success_vision || "become more disciplined"}
- Current level: ${profile?.user_level || 1}
- Total XP: ${profile?.total_xp_earned || 0}
- Daily goal limit: ${goalCount}
- Streak: ${streakData ? `${streakData.current_streak} days (best: ${streakData.longest_streak})` : "none yet"}
- Today: ${new Date().toISOString().split("T")[0]}`;

  const categoriesText = (categories || [])
    .map((c) => `- ${c.name}: ${c.growth_description || "grow in this area"}`)
    .join("\n");

  const recentText = (recentEntries || []).slice(0, 3)
    .map((e) => `[${e.entry_date || "recent"}] ${e.content.slice(0, 200)}`)
    .join("\n");

  const prevGoalsText = (previousGoals || []).slice(0, 8)
    .map((g) => `${g.completed ? "[DONE]" : "[INCOMPLETE]"} (${g.difficulty}) ${g.title}`)
    .join("\n");

  if (type === "daily_goals" || type === "manual_refresh") {
    return `${context}

REQUEST: Generate exactly ${goalCount} personalized daily goals.

CATEGORIES:
${categoriesText || "No categories set."}

${recentText ? `RECENT JOURNAL:\n${recentText}` : ""}
${prevGoalsText ? `\nPREVIOUS GOALS (do not repeat):\n${prevGoalsText}` : ""}

RULES:
- Generate exactly ${goalCount} goals
- Maximum distribution: 3 easy, 2 medium, 1 hard
- Easy = quick win, 5-10 min (5 XP)
- Medium = moderate focus, 15-30 min (10 XP)
- Hard = stretches comfort zone, 30+ min (20 XP)
- Each goal must be specific, concrete, and doable today
- Tie goals to the user's categories

RETURN THIS EXACT JSON SCHEMA:
{
  "title": "short motivational title for today",
  "daily_goals": [
    { "text": "specific actionable goal", "difficulty": "easy", "xp": 5, "categoryName": "exact category name" }
  ],
  "coach_note": "one calm coaching sentence (max 25 words)",
  "insight": "one brief observation about their pattern or progress"
}`;
  }

  if (type === "journal_insight" || type === "journal_completion_insight") {
    return `${context}

REQUEST: Provide insight on this journal entry.

ENTRY:
"${content}"

${recentText ? `PREVIOUS ENTRIES:\n${recentText}` : ""}

RETURN THIS EXACT JSON SCHEMA:
{
  "summary": "1-sentence insight about what they wrote",
  "reflection": "1-sentence coaching thought (max 20 words)",
  "next_focus": "specific thing to focus on next",
  "action_step": "one concrete small action they can take today"
}`;
  }

  if (type === "today_coaching") {
    return `${context}

REQUEST: Write a single daily coaching message.

${recentText ? `RECENT JOURNAL:\n${recentText}` : "No recent entries."}

RETURN THIS EXACT JSON SCHEMA:
{
  "coach_note": "one calm, personalized coaching sentence (max 25 words)",
  "next_focus": "one specific thing to focus on today",
  "insight": ""
}`;
  }

  if (type === "onboarding_plan") {
    return `${context}

REQUEST: Generate a personalized 30-day growth plan preview.

CATEGORIES:
${categoriesText}

RETURN THIS EXACT JSON SCHEMA:
{
  "plan_title": "personalized plan title",
  "summary": "2-3 sentence personalized plan overview",
  "categories": [${(categories || []).map(c => `"${c.name}"`).join(", ")}],
  "daily_routine": ["item 1", "item 2", "item 3"],
  "first_week_focus": ["focus 1", "focus 2", "focus 3"],
  "motivation_note": "one powerful personalized sentence"
}`;
  }

  return `RETURN THIS EXACT JSON: { "error": "unknown_request_type" }`;
}

function validateResponse(type: string, data: Record<string, unknown>): boolean {
  if (!data || typeof data !== "object") return false;
  if ("error" in data) return false;

  if (type === "daily_goals" || type === "manual_refresh") {
    return Array.isArray(data.daily_goals) && (data.daily_goals as unknown[]).length > 0;
  }
  if (type === "journal_insight" || type === "journal_completion_insight") {
    return typeof data.summary === "string" && data.summary.length > 0;
  }
  if (type === "today_coaching") {
    return typeof data.coach_note === "string" && data.coach_note.length > 0;
  }
  if (type === "onboarding_plan") {
    return typeof data.plan_title === "string" && data.plan_title.length > 0;
  }
  return false;
}

function getDateFieldForType(type: string): string | null {
  if (type === "daily_goals" || type === "manual_refresh") return "last_goal_generation_date";
  if (type === "journal_insight" || type === "journal_completion_insight") return "last_insight_generation_date";
  if (type === "today_coaching") return "last_insight_generation_date";
  if (type === "onboarding_plan") return "last_plan_generation_date";
  return null;
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

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { type } = body;
    const today = new Date().toISOString().split("T")[0];

    // Fetch profile for guards
    const { data: prof } = await supabase
      .from("profiles")
      .select("ai_request_lock, ai_generation_count_today, last_ai_request_date, last_ai_request_type, last_ai_response_json, last_goal_generation_date, last_insight_generation_date, last_plan_generation_date")
      .eq("id", userId)
      .maybeSingle();

    if (!prof) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block parallel requests
    if (prof.ai_request_lock) {
      return new Response(
        JSON.stringify({ error: "Request already in progress" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplication: return cached result if already generated today for this type
    // manual_refresh bypasses cache
    if (type !== "manual_refresh") {
      const dateField = getDateFieldForType(type);
      const dateValue = dateField ? (prof as Record<string, unknown>)[dateField] : null;

      if (
        dateValue === today &&
        prof.last_ai_request_type === type &&
        prof.last_ai_response_json &&
        validateResponse(type, prof.last_ai_response_json as Record<string, unknown>)
      ) {
        return new Response(JSON.stringify(prof.last_ai_response_json), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Set lock
    await supabase.from("profiles").update({ ai_request_lock: true }).eq("id", userId);

    let result: Record<string, unknown> = {};

    try {
      const userInput = buildUserInput(body);

      // Use OpenAI Responses API
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          instructions: SYSTEM_INSTRUCTIONS,
          input: userInput,
          text: {
            format: { type: "json_object" },
          },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI error (${response.status}): ${err}`);
      }

      const data = await response.json();

      // Parse output from Responses API structure
      const outputText = data.output?.[0]?.content?.[0]?.text
        || data.output_text
        || null;

      if (!outputText) {
        throw new Error("No output text in AI response");
      }

      result = JSON.parse(outputText);

      // Validate the response
      if (!validateResponse(type, result)) {
        throw new Error("AI response failed validation");
      }

      // Save successful result
      const dateField = getDateFieldForType(type);
      const countToday = prof.last_ai_request_date === today
        ? (prof.ai_generation_count_today || 0) + 1
        : 1;

      const profileUpdate: Record<string, unknown> = {
        ai_request_lock: false,
        last_ai_request_type: type,
        last_ai_request_date: today,
        last_ai_response_json: result,
        last_ai_response_at: new Date().toISOString(),
        ai_generation_count_today: countToday,
      };

      if (dateField) {
        profileUpdate[dateField] = today;
      }

      await supabase.from("profiles").update(profileUpdate).eq("id", userId);

    } catch (innerErr) {
      // Release lock without caching failed response
      await supabase.from("profiles").update({ ai_request_lock: false }).eq("id", userId).catch(() => {});
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
