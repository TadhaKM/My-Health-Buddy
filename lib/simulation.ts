import type { HabitsInput, OrganName, YearKey, SimulationResponse } from "./types";

const ORGANS: OrganName[] = ["lungs", "heart", "liver", "brain", "body_fat"];
const YEARS: YearKey[] = ["0", "5", "10", "20"];

const SCORE_BASELINE: Record<OrganName, number> = {
  lungs: 6,
  heart: 6,
  liver: 6,
  brain: 6,
  body_fat: 6,
};

const IMPACT_WEIGHTS = {
  smoking: {
    none: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    occasional: { lungs: 14, heart: 9, liver: 0, brain: 4, body_fat: 0 },
    daily: { lungs: 32, heart: 18, liver: 0, brain: 8, body_fat: 0 },
  },
  alcohol: {
    none: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    weekends: { lungs: 0, heart: 4, liver: 12, brain: 8, body_fat: 0 },
    frequent: { lungs: 0, heart: 8, liver: 30, brain: 18, body_fat: 0 },
  },
  sleep: {
    "8h": { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    "6h": { lungs: 0, heart: 9, liver: 0, brain: 12, body_fat: 0 },
    "5h": { lungs: 0, heart: 18, liver: 0, brain: 24, body_fat: 0 },
  },
  exercise: {
    regular: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    low: { lungs: 0, heart: 14, liver: 0, brain: 0, body_fat: 16 },
    none: { lungs: 0, heart: 26, liver: 0, brain: 0, body_fat: 30 },
  },
  diet: {
    balanced: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    average: { lungs: 0, heart: 6, liver: 8, brain: 0, body_fat: 12 },
    poor: { lungs: 0, heart: 12, liver: 18, brain: 0, body_fat: 28 },
  },
} as const;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function makeTimeline(year0: number): Record<YearKey, number> {
  const y0 = clamp(year0);
  const y5 = clamp(y0 + Math.max(2, Math.round(y0 * 0.12)));
  const y10 = clamp(Math.max(y5, y5 + Math.max(2, Math.round(y5 * 0.15))));
  const y20 = clamp(Math.max(y10, y10 + Math.max(3, Math.round(y10 * 0.25))));
  return { "0": y0, "5": y5, "10": y10, "20": y20 };
}

function buildSummary(simulation: SimulationResponse): string {
  const ranked = ORGANS
    .map((organ) => ({ organ, value: simulation.organs[organ]["20"] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((e) => (e.organ === "body_fat" ? "body fat" : e.organ));

  const topList = ranked.join(", ").replace(/, ([^,]*)$/, " and $1");
  const highest = Math.max(...ORGANS.map((o) => simulation.organs[o]["20"]));

  if (highest < 25) {
    return "Projected strain stays relatively low over time. Keeping current habits should help maintain a flatter long-term risk curve.";
  }
  if (highest < 60) {
    return `The strongest long-term strain appears in ${topList}. Small lifestyle improvements could slow progression.`;
  }
  return `Projected long-term strain is highest in ${topList}. Reducing high-risk habits could meaningfully flatten these trajectories.`;
}

export function generateMockSimulation(input: HabitsInput): SimulationResponse {
  const scores = { ...SCORE_BASELINE };

  for (const organ of ORGANS) {
    scores[organ] +=
      IMPACT_WEIGHTS.smoking[input.smoking][organ] +
      IMPACT_WEIGHTS.alcohol[input.alcohol][organ] +
      IMPACT_WEIGHTS.sleep[input.sleep][organ] +
      IMPACT_WEIGHTS.exercise[input.exercise][organ] +
      IMPACT_WEIGHTS.diet[input.diet][organ];
  }

  const simulation: SimulationResponse = {
    organs: {
      lungs: makeTimeline(scores.lungs),
      heart: makeTimeline(scores.heart),
      liver: makeTimeline(scores.liver),
      brain: makeTimeline(scores.brain),
      body_fat: makeTimeline(scores.body_fat),
    },
    summary: "",
  };

  simulation.summary = buildSummary(simulation);
  return simulation;
}

export function buildSimulationPrompt(input: HabitsInput): string {
  return `You are a health simulation engine for an educational demo (not medical advice).

Given these lifestyle habits:
- Smoking: ${input.smoking}
- Alcohol: ${input.alcohol}
- Sleep: ${input.sleep}
- Exercise: ${input.exercise}
- Diet: ${input.diet}${input.chatText ? `\n- Additional context: "${input.chatText}"` : ""}

Estimate the projected organ strain over 0, 5, 10, and 20 years.

Rules:
- All values must be integers from 0 to 100
- Values must increase or stay the same over time (never decrease)
- smoking strongly impacts lungs and heart
- alcohol strongly impacts liver and brain
- poor sleep strongly impacts brain and heart
- low exercise strongly impacts heart and body_fat
- poor diet strongly impacts body_fat and liver, moderate impact on heart

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "organs": {
    "lungs": { "0": number, "5": number, "10": number, "20": number },
    "heart": { "0": number, "5": number, "10": number, "20": number },
    "liver": { "0": number, "5": number, "10": number, "20": number },
    "brain": { "0": number, "5": number, "10": number, "20": number },
    "body_fat": { "0": number, "5": number, "10": number, "20": number }
  },
  "summary": "1-2 sentence plain text summary of projected health trajectory"
}`;
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw === "object" && raw !== null) return raw;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Try extracting JSON object from surrounding text
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function toSafeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return clamp(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return clamp(parsed);
  }
  return null;
}

export function normalizeSimulationResponse(
  raw: unknown,
  fallback: SimulationResponse
): SimulationResponse {
  const parsed = parseMaybeJson(raw) as {
    organs?: Partial<Record<string, Partial<Record<YearKey, unknown>>>>;
    summary?: unknown;
  } | null;

  const organs = ORGANS.reduce((acc, organ) => {
    const source =
      parsed?.organs?.[organ] ??
      (organ === "body_fat" ? parsed?.organs?.["body-fat"] : undefined);

    const timeline = YEARS.reduce((tl, year) => {
      tl[year] = toSafeInt(source?.[year]) ?? fallback.organs[organ][year];
      return tl;
    }, {} as Record<YearKey, number>);

    // Ensure non-decreasing
    const y0 = clamp(timeline["0"]);
    const y5 = clamp(Math.max(y0, timeline["5"]));
    const y10 = clamp(Math.max(y5, timeline["10"]));
    const y20 = clamp(Math.max(y10, timeline["20"]));
    acc[organ] = { "0": y0, "5": y5, "10": y10, "20": y20 };

    return acc;
  }, {} as Record<OrganName, Record<YearKey, number>>);

  const rawSummary = typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
  const summary = (rawSummary || fallback.summary)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")
    .trim();

  return { organs, summary: summary || fallback.summary };
}
