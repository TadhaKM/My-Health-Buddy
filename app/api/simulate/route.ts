import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { HabitsInput } from "../../../lib/types";

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
import {
  generateMockSimulation,
  buildSimulationPrompt,
  normalizeSimulationResponse,
} from "../../../lib/simulation";

const VALID_VALUES: Record<keyof Omit<HabitsInput, "chatText">, string[]> = {
  smoking: ["none", "occasional", "daily"],
  alcohol: ["none", "weekends", "frequent"],
  sleep: ["8h", "6h", "5h"],
  exercise: ["regular", "low", "none"],
  diet: ["balanced", "average", "poor"],
};

function validateInput(body: unknown): HabitsInput | null {
  if (typeof body !== "object" || body === null) return null;
  const input = body as Record<string, unknown>;

  for (const [key, allowed] of Object.entries(VALID_VALUES)) {
    if (!allowed.includes(input[key] as string)) return null;
  }

  return {
    smoking: input.smoking,
    alcohol: input.alcohol,
    sleep: input.sleep,
    exercise: input.exercise,
    diet: input.diet,
    chatText: typeof input.chatText === "string" ? input.chatText : undefined,
  } as HabitsInput;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = validateInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid input. Required: smoking, alcohol, sleep, exercise, diet" },
      { status: 400 }
    );
  }

  // Always generate fallback first
  const fallback = generateMockSimulation(input);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallback);
  }

  try {
    const client = new Anthropic({ apiKey });
    const prompt = buildSimulationPrompt(input);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock?.text ?? "";

    return NextResponse.json(normalizeSimulationResponse(raw, fallback));
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json(fallback);
  }
}
