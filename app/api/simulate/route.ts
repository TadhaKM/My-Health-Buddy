import { NextRequest, NextResponse } from "next/server";
import {
  buildSimulationPrompt,
  generateMockSimulation,
  normalizeSimulationResponse
} from "@/lib/simulation";
import type { HabitsInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    message: "Use POST /api/simulate with a JSON body to run the simulation.",
    requiredFields: {
      smoking: ["none", "occasional", "daily"],
      alcohol: ["none", "weekends", "frequent"],
      sleep: ["8h", "6h", "5h"],
      exercise: ["regular", "low", "none"],
      diet: ["balanced", "average", "poor"],
      chatText: "optional string"
    }
  });
}

const ALLOWED_VALUES = {
  smoking: ["none", "occasional", "daily"],
  alcohol: ["none", "weekends", "frequent"],
  sleep: ["8h", "6h", "5h"],
  exercise: ["regular", "low", "none"],
  diet: ["balanced", "average", "poor"]
} as const;

function isStringIn<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function validateHabitsInput(body: unknown): { ok: true; data: HabitsInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const source = body as Record<string, unknown>;

  if (!isStringIn(source.smoking, ALLOWED_VALUES.smoking)) {
    return { ok: false, error: "Invalid smoking value." };
  }

  if (!isStringIn(source.alcohol, ALLOWED_VALUES.alcohol)) {
    return { ok: false, error: "Invalid alcohol value." };
  }

  if (!isStringIn(source.sleep, ALLOWED_VALUES.sleep)) {
    return { ok: false, error: "Invalid sleep value." };
  }

  if (!isStringIn(source.exercise, ALLOWED_VALUES.exercise)) {
    return { ok: false, error: "Invalid exercise value." };
  }

  if (!isStringIn(source.diet, ALLOWED_VALUES.diet)) {
    return { ok: false, error: "Invalid diet value." };
  }

  if (source.chatText !== undefined && typeof source.chatText !== "string") {
    return { ok: false, error: "chatText must be a string when provided." };
  }

  return {
    ok: true,
    data: {
      smoking: source.smoking,
      alcohol: source.alcohol,
      sleep: source.sleep,
      exercise: source.exercise,
      diet: source.diet,
      chatText: source.chatText
    }
  };
}

async function callModel(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return only strict JSON for the requested schema."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model call failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Model response content was empty");
  }

  return content;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateHabitsInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const fallback = generateMockSimulation(validated.data);

  try {
    const prompt = buildSimulationPrompt(validated.data);
    const modelOutput = await callModel(prompt);
    const normalized = normalizeSimulationResponse(modelOutput, fallback);
    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json(fallback);
  }
}
