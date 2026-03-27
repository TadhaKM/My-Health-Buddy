import type { HabitsInput, OrganName, SimulationResponse, YearKey } from "@/lib/types";

const ORGANS: OrganName[] = ["lungs", "heart", "liver", "brain", "body_fat"];
const YEARS: YearKey[] = ["0", "5", "10", "20"];

const SCORE_BASELINE: Record<OrganName, number> = {
  lungs: 6,
  heart: 6,
  liver: 6,
  brain: 6,
  body_fat: 6
};

const HABIT_IMPACTS = {
  smoking: {
    none: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    occasional: { lungs: 14, heart: 9, liver: 0, brain: 4, body_fat: 0 },
    daily: { lungs: 32, heart: 18, liver: 0, brain: 8, body_fat: 0 }
  },
  alcohol: {
    none: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    weekends: { lungs: 0, heart: 4, liver: 12, brain: 8, body_fat: 0 },
    frequent: { lungs: 0, heart: 8, liver: 30, brain: 18, body_fat: 0 }
  },
  sleep: {
    "8h": { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    "6h": { lungs: 0, heart: 9, liver: 0, brain: 12, body_fat: 0 },
    "5h": { lungs: 0, heart: 18, liver: 0, brain: 24, body_fat: 0 }
  },
  exercise: {
    regular: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    low: { lungs: 0, heart: 14, liver: 0, brain: 0, body_fat: 16 },
    none: { lungs: 0, heart: 26, liver: 0, brain: 0, body_fat: 30 }
  },
  diet: {
    balanced: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    average: { lungs: 0, heart: 6, liver: 8, brain: 0, body_fat: 12 },
    poor: { lungs: 0, heart: 12, liver: 18, brain: 0, body_fat: 28 }
  }
} as const;

const ORGAN_LABELS: Record<OrganName, string> = {
  lungs: "lungs",
  heart: "heart",
  liver: "liver",
  brain: "brain",
  body_fat: "body fat"
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toSafeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampScore(value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return clampScore(parsed);
    }
  }

  return null;
}

function makeTimeline(year0Value: number): Record<YearKey, number> {
  const y0 = clampScore(year0Value);
  const y5 = clampScore(y0 + Math.max(2, Math.round(y0 * 0.12)));
  const y10 = clampScore(Math.max(y5, y5 + Math.max(2, Math.round(y5 * 0.15))));
  const y20 = clampScore(Math.max(y10, y10 + Math.max(3, Math.round(y10 * 0.25))));

  return {
    "0": y0,
    "5": y5,
    "10": y10,
    "20": y20
  };
}

function ensureNonDecreasingTimeline(timeline: Record<YearKey, number>): Record<YearKey, number> {
  const y0 = clampScore(timeline["0"]);
  const y5 = clampScore(Math.max(y0, timeline["5"]));
  const y10 = clampScore(Math.max(y5, timeline["10"]));
  const y20 = clampScore(Math.max(y10, timeline["20"]));

  return {
    "0": y0,
    "5": y5,
    "10": y10,
    "20": y20
  };
}

function buildSummary(organs: SimulationResponse["organs"]): string {
  const ranked = ORGANS
    .map((organ) => ({ organ, value: organs[organ]["20"] }))
    .sort((a, b) => b.value - a.value);

  const topNames = ranked.slice(0, 3).map((entry) => ORGAN_LABELS[entry.organ]);
  const topList = topNames.join(", ").replace(/, ([^,]*)$/, " and $1");
  const highest = ranked[0]?.value ?? 0;

  if (highest < 25) {
    return `Projected strain stays relatively low, with only mild pressure on ${topNames[0]} and ${topNames[1]}. Keeping these habits steady should help keep long-term risk flatter.`;
  }

  if (highest < 60) {
    return `The strongest long-term strain appears in ${topList}. Small improvements to sleep, activity, and diet could noticeably slow the curve.`;
  }

  return `Projected long-term strain is highest in ${topList}. Reducing high-risk habits could meaningfully flatten these trajectories over time.`;
}

function tryParseModelOutput(raw: unknown): unknown {
  if (typeof raw === "object" && raw !== null) {
    return raw;
  }

  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonSliceMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonSliceMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonSliceMatch[0]);
    } catch {
      return null;
    }
  }
}

export function generateMockSimulation(input: HabitsInput): SimulationResponse {
  const scores: Record<OrganName, number> = { ...SCORE_BASELINE };

  const smokingImpact = HABIT_IMPACTS.smoking[input.smoking];
  const alcoholImpact = HABIT_IMPACTS.alcohol[input.alcohol];
  const sleepImpact = HABIT_IMPACTS.sleep[input.sleep];
  const exerciseImpact = HABIT_IMPACTS.exercise[input.exercise];
  const dietImpact = HABIT_IMPACTS.diet[input.diet];

  for (const organ of ORGANS) {
    scores[organ] +=
      smokingImpact[organ] +
      alcoholImpact[organ] +
      sleepImpact[organ] +
      exerciseImpact[organ] +
      dietImpact[organ];
  }

  const organs = ORGANS.reduce((acc, organ) => {
    acc[organ] = makeTimeline(scores[organ]);
    return acc;
  }, {} as SimulationResponse["organs"]);

  return {
    organs,
    summary: buildSummary(organs)
  };
}

export function buildSimulationPrompt(input: HabitsInput): string {
  const chatText = input.chatText?.trim() || "(none)";

  return [
    "You are generating an educational health habit simulation for a hackathon demo.",
    "Return only valid JSON, no markdown and no extra keys.",
    "Use plausible but non-clinical estimates and keep values as integers 0-100.",
    "Values should generally stay flat or increase from year 0 to 20.",
    "Required output shape:",
    "{",
    '  "organs": {',
    '    "lungs": { "0": number, "5": number, "10": number, "20": number },',
    '    "heart": { "0": number, "5": number, "10": number, "20": number },',
    '    "liver": { "0": number, "5": number, "10": number, "20": number },',
    '    "brain": { "0": number, "5": number, "10": number, "20": number },',
    '    "body_fat": { "0": number, "5": number, "10": number, "20": number }',
    "  },",
    '  "summary": "short explanation"',
    "}",
    "Habit mapping guidance:",
    "- smoking strongly affects lungs and heart, mildly brain",
    "- alcohol strongly affects liver and brain, mildly heart",
    "- poor sleep strongly affects brain and heart",
    "- low exercise strongly affects heart and body_fat",
    "- poor diet strongly affects body_fat and liver, moderately heart",
    "Input habits:",
    JSON.stringify(
      {
        smoking: input.smoking,
        alcohol: input.alcohol,
        sleep: input.sleep,
        exercise: input.exercise,
        diet: input.diet,
        chatText
      },
      null,
      2
    ),
    "Summary should be 1-2 short sentences."
  ].join("\n");
}

export function normalizeSimulationResponse(
  raw: unknown,
  fallback: SimulationResponse
): SimulationResponse {
  const parsed = tryParseModelOutput(raw) as
    | {
        organs?: Partial<Record<OrganName, Partial<Record<YearKey, unknown>>>>;
        summary?: unknown;
      }
    | null;

  const organs = ORGANS.reduce((acc, organ) => {
    const source = parsed?.organs?.[organ];
    const repairedTimeline = YEARS.reduce((timeline, year) => {
      const candidate = toSafeInt(source?.[year]);
      timeline[year] = candidate ?? fallback.organs[organ][year];
      return timeline;
    }, {} as Record<YearKey, number>);

    acc[organ] = ensureNonDecreasingTimeline(repairedTimeline);
    return acc;
  }, {} as SimulationResponse["organs"]);

  const rawSummary = typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
  const summarySource = rawSummary || fallback.summary;
  const normalizedSummary = summarySource
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")
    .trim();

  return {
    organs,
    summary: normalizedSummary || fallback.summary
  };
}
