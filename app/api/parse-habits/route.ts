import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

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
3. The summary must be friendly, educational, and ≤ 2 sentences.
4. Return ONLY valid JSON, no markdown, no explanation.

Return this exact JSON format:
{
  "habits": { "smoking": number, "alcohol": number, "sleep": number, "exercise": number, "diet": number },
  "summary": "string"
}`;

export async function POST(request: Request) {
  let message: string;
  let currentHabits: Record<string, number>;

  try {
    ({ message, currentHabits } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server not configured — add ANTHROPIC_API_KEY to .env" },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Current habits: ${JSON.stringify(currentHabits)}\n\nUser message: "${message}"`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock?.text ?? "";

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed);
    } catch {
      // Try extracting JSON from surrounding text
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return NextResponse.json(parsed);
      }
      return NextResponse.json({
        habits: currentHabits,
        summary: "I couldn't quite understand that. Try describing your smoking, diet, sleep, or exercise habits.",
      });
    }
  } catch (err) {
    console.error("Claude API error:", err);
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited — try again shortly." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
