import { createFileRoute } from "@tanstack/react-router"
import { createAPIFileRoute } from "@tanstack/react-start/api";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Schema — what Claude must return (structured output, guaranteed valid JSON)
// ─────────────────────────────────────────────────────────────────────────────
const HabitLevel = z.union([z.literal(0), z.literal(1), z.literal(2)]);

const HabitAnalysisSchema = z.object({
  habits: z.object({
    smoking: HabitLevel,
    alcohol: HabitLevel,
    sleep: HabitLevel,
    exercise: HabitLevel,
    diet: HabitLevel,
  }),
  summary: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM = `You are a health habit analyzer for "Future You", an educational health visualization app.

Your job: parse the user's message about their lifestyle, update habit scores, and provide a short health insight.

Habit scoring (0 = healthiest, 2 = worst):
  smoking:  0 = none,          1 = occasional,    2 = daily
  alcohol:  0 = none/rare,     1 = weekends,       2 = frequent/daily
  sleep:    0 = 8 h+ quality,  1 = 6 h average,   2 = ≤5 h / poor quality
  exercise: 0 = regular,       1 = light/infrequent, 2 = sedentary
  diet:     0 = balanced/whole foods, 1 = average, 2 = poor/junk food

Rules:
1. Only change habits the user explicitly mentions — keep all others at their current value.
2. If the user asks a general health question without mentioning specific habits, keep ALL habits unchanged and answer the question in the summary.
3. The summary must be friendly, educational, and ≤ 2 sentences.`;

// ─────────────────────────────────────────────────────────────────────────────
// API Route — POST /api/parse-habits
// ─────────────────────────────────────────────────────────────────────────────
export const Route = createAPIFileRoute("/api/parse-habits")({
  POST: async ({ request }) => {
    // ── 1. Parse request body ─────────────────────────────────────────────
    let message: string;
    let currentHabits: Record<string, number>;

    try {
      ({ message, currentHabits } = await request.json());
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!message || typeof message !== "string") {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    // ── 2. API key ────────────────────────────────────────────────────────
    //    Dev: add ANTHROPIC_API_KEY=sk-ant-... to .env
    //    Cloudflare prod: wrangler secret put ANTHROPIC_API_KEY
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return Response.json(
        { error: "Server not configured — add ANTHROPIC_API_KEY to .env" },
        { status: 500 }
      );
    }

    // ── 3. Call Claude ────────────────────────────────────────────────────
    const client = new Anthropic({ apiKey });

    try {
      const response = await client.messages.parse({
        model: "claude-opus-4-6",
        max_tokens: 512,
        thinking: { type: "adaptive" },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Current habits: ${JSON.stringify(currentHabits)}\n\nUser message: "${message}"`,
          },
        ],
        output_config: {
          format: zodOutputFormat(HabitAnalysisSchema, "habit_analysis"),
        },
      });

      // parsed_output is null only on refusal — default to unchanged habits
      const result = response.parsed_output ?? {
        habits: currentHabits,
        summary: "I couldn't quite understand that. Try describing your smoking, diet, sleep, or exercise habits.",
      };

      return Response.json(result);
    } catch (err) {
      console.error("Claude API error:", err);

      if (err instanceof Anthropic.RateLimitError) {
        return Response.json({ error: "Rate limited — try again shortly." }, { status: 429 });
      }
      if (err instanceof Anthropic.AuthenticationError) {
        return Response.json({ error: "Invalid API key" }, { status: 401 });
      }
      return Response.json({ error: "AI request failed" }, { status: 500 });
    }
  },
});
