import { buildSimulationPrompt, generateFallbackSimulation, normalizeSimulationResponse } from '../../../lib/simulation';
import { hasCompleteSimulationShape, validateHabitsInput } from '../../../lib/validators';

async function callModel(prompt: string): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new Error('No AI API key configured. Set OPENAI_API_KEY or LOVABLE_API_KEY.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Return strict JSON only with keys organs and summary. No markdown, no extra text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Model request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON request body.' }, 400);
  }

  const validated = validateHabitsInput(body);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  const fallback = generateFallbackSimulation(validated.data);

  try {
    const prompt = buildSimulationPrompt(validated.data);
    const modelRaw = await callModel(prompt);
    const normalized = normalizeSimulationResponse(modelRaw, fallback);

    if (!hasCompleteSimulationShape(normalized)) {
      return json(fallback);
    }

    return json(normalized);
  } catch (error) {
    console.error('Simulation model fallback used:', error);
    return json(fallback);
  }
}
