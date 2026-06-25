import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are Diverge — a personal growth coach inside a journaling and goal-tracking app.
You are calm, deeply perceptive, and highly personalized. You connect the dots between what people write,
their emotional patterns, and their goals. You give rich, meaningful insight — not surface-level platitudes.
Return only valid JSON in the exact schema requested.
Do not add commentary, extra fields, or explanations.`;

function buildPrompt(params: {
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
}): string {
  const { type, categories, recentEntries, profile, previousGoals, streakData, content } = params;
  const goalCount = profile?.daily_goal_limit || 3;

  const ctx = [
    `Coaching style: ${profile?.coaching_style || "gentle coach"}`,
    `Journaling style: ${profile?.journaling_style || "freeform"}`,
    `Biggest obstacle: ${profile?.biggest_obstacle || "building consistent habits"}`,
    `30-day vision: ${profile?.success_vision || "become more disciplined"}`,
    `Level: ${profile?.user_level || 1}, Total XP: ${profile?.total_xp_earned || 0}`,
    `Streak: ${streakData ? `${streakData.current_streak} days (best: ${streakData.longest_streak})` : "none yet"}`,
    `Today: ${new Date().toISOString().split("T")[0]}`,
  ].join("\n");

  const catsText = (categories || []).map((c) => `- ${c.name}: ${c.growth_description || "grow here"}`).join("\n");
  const recentText = (recentEntries || []).slice(0, 3).map((e) => `[${e.entry_date || "recent"}] ${e.content.slice(0, 200)}`).join("\n");
  const prevText = (previousGoals || []).slice(0, 8).map((g) => `${g.completed ? "[DONE]" : "[SKIP]"} (${g.difficulty}) ${g.title}`).join("\n");

  if (type === "daily_goals" || type === "manual_refresh") {
    return `USER CONTEXT:\n${ctx}\n\nCATEGORIES:\n${catsText || "None set."}\n${recentText ? `\nRECENT JOURNAL:\n${recentText}` : ""}${prevText ? `\nPREVIOUS GOALS (do not repeat):\n${prevText}` : ""}

Generate exactly ${goalCount} personalized daily goals. Rules:
- Easy: quick win, 5-10 min (xp: 5)
- Medium: moderate focus, 15-30 min (xp: 10)
- Hard: stretches comfort zone, 30+ min (xp: 20)
- Each goal must be specific and doable today

Return ONLY this JSON:
{"title":"motivational title for today","daily_goals":[{"text":"specific goal","difficulty":"easy","xp":5,"categoryName":"exact category name"}],"coach_note":"one coaching sentence max 25 words","insight":"one brief observation"}`;
  }

  if (type === "journal_insight" || type === "journal_completion_insight") {
    return `USER CONTEXT:\n${ctx}\n\nJOURNAL ENTRY:\n"${content}"\n${recentText ? `\nPREVIOUS ENTRIES:\n${recentText}` : ""}

Analyze this journal entry deeply and holistically. Go beyond the surface — identify emotional undercurrents, connect the writing to their stated goals and growth areas, and spot meaningful patterns across recent entries if available. Be specific, not generic.

Return ONLY this JSON:
{"summary":"3-4 sentences: what this entry reveals about where they are mentally/emotionally, any themes or patterns detected, and how it connects to their stated goals or vision","reflection":"2-3 sentences of personalized coaching that acknowledges what they wrote and offers a perspective shift or encouragement grounded in their specific situation","next_focus":"one specific, meaningful thing to focus on in their next session based on what surfaced in this entry","action_step":"one small, concrete action they can take today that directly addresses something from this entry"}`;
  }

  if (type === "today_coaching") {
    return `USER CONTEXT:\n${ctx}\n${recentText ? `\nRECENT JOURNAL:\n${recentText}` : "\nNo recent entries."}

Return ONLY this JSON:
{"coach_note":"one calm personalized coaching sentence max 25 words","next_focus":"one specific thing to focus on today","insight":"one brief observation about their journey"}`;
  }

  if (type === "onboarding_plan") {
    return `USER CONTEXT:\n${ctx}\n\nCATEGORIES:\n${catsText}

Return ONLY this JSON:
{"plan_title":"personalized plan title","summary":"2-3 sentence personalized plan overview","categories":[${(categories || []).map((c) => `"${c.name}"`).join(",")}],"daily_routine":["item 1","item 2","item 3"],"first_week_focus":["focus 1","focus 2","focus 3"],"motivation_note":"one powerful personalized sentence"}`;
  }

  return `{"error":"unknown_request_type"}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { _user_id, ...aiBody } = body as Record<string, unknown>;

    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!token) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string;

    // Detect internal DB-gateway calls: the bearer token will be the project anon
    // key (role: "anon") and the verified user_id is passed in the body.
    let tokenRole = "";
    try {
      const payloadB64 = token.split(".")[1];
      const padding = payloadB64.length % 4 === 0 ? "" : "=".repeat(4 - (payloadB64.length % 4));
      const decoded = JSON.parse(atob(payloadB64 + padding));
      tokenRole = decoded?.role ?? "";
    } catch { /* ignore */ }

    if (tokenRole === "anon" && typeof _user_id === "string" && _user_id.length > 0) {
      // Trusted call from the call_ai() PostgreSQL function.
      // auth.uid() already verified the user on the DB side.
      userId = _user_id;
    } else {
      // Direct call with a user JWT (e.g. future native app).
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    console.log(`[generate-ai] user=${userId} type=${(aiBody as Record<string, unknown>).type}`);

    const userPrompt = buildPrompt(aiBody as Parameters<typeof buildPrompt>[0]);

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
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI error (${response.status}): ${errText}`);
    }

    const openaiData = await response.json();
    const outputText = openaiData?.choices?.[0]?.message?.content;
    if (!outputText) throw new Error("No content in OpenAI response");

    const result = JSON.parse(outputText);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-ai] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
