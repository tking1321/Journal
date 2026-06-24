import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are an AI self-improvement coach inside a journaling and growth app.
You are calm, concise, supportive, and highly personalized.
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

Return ONLY this JSON:
{"summary":"1-sentence insight about what they wrote","reflection":"1-sentence coaching thought max 20 words","next_focus":"specific thing to focus on next","action_step":"one concrete small action for today"}`;
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

function validateResponse(type: string, data: Record<string, unknown>): boolean {
  if (!data || typeof data !== "object") return false;
  if ("error" in data) return false;
  if (type === "daily_goals" || type === "manual_refresh") return Array.isArray(data.daily_goals) && (data.daily_goals as unknown[]).length > 0;
  if (type === "journal_insight" || type === "journal_completion_insight") return typeof data.summary === "string" && data.summary.length > 0;
  if (type === "today_coaching") return typeof data.coach_note === "string" && data.coach_note.length > 0;
  if (type === "onboarding_plan") return typeof data.plan_title === "string" && data.plan_title.length > 0;
  return false;
}

function dateFieldForType(type: string): string | null {
  if (type === "daily_goals" || type === "manual_refresh") return "last_goal_generation_date";
  if (type === "journal_insight" || type === "journal_completion_insight") return "last_insight_generation_date";
  if (type === "today_coaching") return "last_coaching_generation_date";
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
      console.error("[generate-ai] OPENAI_API_KEY secret is not set");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type, _token } = body;

    const authToken = (_token as string | undefined) || req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    if (!authToken) {
      console.error("[generate-ai] Missing auth token");
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      console.error("[generate-ai] Auth failed:", authError?.message ?? "no user");
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = user.id;
    const today = new Date().toISOString().split("T")[0];

    console.log(`[generate-ai] user=${userId} type=${type}`);

    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select("ai_request_lock, ai_generation_count_today, last_ai_request_date, last_ai_request_type, last_ai_response_json, last_ai_response_at, last_goal_generation_date, last_insight_generation_date, last_plan_generation_date, last_coaching_generation_date")
      .eq("id", userId)
      .maybeSingle();

    if (profError || !prof) {
      console.error("[generate-ai] Profile fetch error:", profError?.message ?? "not found");
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (prof.ai_request_lock) {
      // Auto-expire stale locks (left over from timed-out runs) older than 2 minutes.
      const lastResponse = (prof as Record<string, unknown>).last_ai_response_at as string | null;
      const lockIsStale = !lastResponse || (Date.now() - new Date(lastResponse).getTime() > 2 * 60 * 1000);
      if (lockIsStale) {
        console.log("[generate-ai] Stale lock detected, auto-releasing");
        await supabase.from("profiles").update({ ai_request_lock: false }).eq("id", userId);
      } else {
        console.log("[generate-ai] Lock active, rejecting duplicate request");
        return new Response(JSON.stringify({ error: "Request already in progress" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Return cached result for today if valid (manual_refresh bypasses cache)
    if (type !== "manual_refresh") {
      const dateField = dateFieldForType(type);
      const dateValue = dateField ? (prof as Record<string, unknown>)[dateField] : null;
      if (
        dateValue === today &&
        prof.last_ai_request_type === type &&
        prof.last_ai_response_json &&
        validateResponse(type, prof.last_ai_response_json as Record<string, unknown>)
      ) {
        console.log(`[generate-ai] Returning cached response for type=${type}`);
        return new Response(JSON.stringify(prof.last_ai_response_json), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await supabase.from("profiles").update({ ai_request_lock: true }).eq("id", userId);

    let result: Record<string, unknown> = {};

    try {
      const userPrompt = buildPrompt(body);

      console.log(`[generate-ai] Calling OpenAI model=${MODEL} type=${type}`);

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
        console.error(`[generate-ai] OpenAI error status=${response.status}:`, errText);
        throw new Error(`OpenAI error (${response.status}): ${errText}`);
      }

      const openaiData = await response.json();
      const outputText = openaiData?.choices?.[0]?.message?.content;

      if (!outputText) {
        console.error("[generate-ai] No content in OpenAI response:", JSON.stringify(openaiData));
        throw new Error("No content in OpenAI response");
      }

      console.log(`[generate-ai] OpenAI response received, parsing JSON`);
      result = JSON.parse(outputText);

      if (!validateResponse(type, result)) {
        console.error(`[generate-ai] Validation failed for type=${type}:`, JSON.stringify(result));
        throw new Error(`AI response failed validation for type: ${type}`);
      }

      const dateField = dateFieldForType(type);
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
      if (dateField) profileUpdate[dateField] = today;

      await supabase.from("profiles").update(profileUpdate).eq("id", userId);
      console.log(`[generate-ai] Success type=${type}`);

    } catch (innerErr) {
      await supabase.from("profiles").update({ ai_request_lock: false }).eq("id", userId).catch(() => {});
      throw innerErr;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-ai] Unhandled error:", msg);
    if (userId) {
      await supabase.from("profiles").update({ ai_request_lock: false }).eq("id", userId).catch(() => {});
    }
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
