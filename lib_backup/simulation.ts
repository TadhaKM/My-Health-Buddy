import {
  SIMULATION_ORGANS,
  SIMULATION_YEARS,
  type HabitsInput,
  type OrganName,
  type OrganTimeline,
  type SimulationResponse,
  type SimulationYear,
} from './types';
import { clampScore, toSafeInt } from './validators';

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
    '8h': { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    '6h': { lungs: 0, heart: 9, liver: 0, brain: 12, body_fat: 0 },
    '5h': { lungs: 0, heart: 18, liver: 0, brain: 24, body_fat: 0 },
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

function ensureNonDecreasingTimeline(timeline: OrganTimeline): OrganTimeline {
  const y0 = clampScore(timeline['0']);
  const y5 = clampScore(Math.max(y0, timeline['5']));
  const y10 = clampScore(Math.max(y5, timeline['10']));
  const y20 = clampScore(Math.max(y10, timeline['20']));

  return {
    '0': y0,
    '5': y5,
    '10': y10,
    '20': y20,
  };
}

function makeTimeline(year0Value: number): OrganTimeline {
  const y0 = clampScore(year0Value);
  const y5 = clampScore(y0 + Math.max(2, Math.round(y0 * 0.12)));
  const y10 = clampScore(Math.max(y5, y5 + Math.max(2, Math.round(y5 * 0.15))));
  const y20 = clampScore(Math.max(y10, y10 + Math.max(3, Math.round(y10 * 0.25))));

  return ensureNonDecreasingTimeline({
    '0': y0,
    '5': y5,
    '10': y10,
    '20': y20,
  });
}

function buildSummary(simulation: SimulationResponse): string {
  const ranked = SIMULATION_ORGANS
    .map((organ) => ({ organ, value: simulation.organs[organ]['20'] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const topList = ranked
    .map((entry) => (entry.organ === 'body_fat' ? 'body fat' : entry.organ))
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1');

  const highest = ranked[0]?.value ?? 0;

  if (highest < 25) {
    return 'Projected strain stays relatively low over time. Keeping current habits should help maintain a flatter long-term risk curve.';
  }

  if (highest < 60) {
    return `The strongest long-term strain appears in ${topList}. Small lifestyle improvements could slow progression.`;
  }

  return `Projected long-term strain is highest in ${topList}. Reducing high-risk habits could meaningfully flatten these trajectories.`;
}

export function generateFallbackSimulation(input: HabitsInput): SimulationResponse {
  const scores: Record<OrganName, number> = { ...SCORE_BASELINE };

  const smokingImpact = IMPACT_WEIGHTS.smoking[input.smoking];
  const alcoholImpact = IMPACT_WEIGHTS.alcohol[input.alcohol];
  const sleepImpact = IMPACT_WEIGHTS.sleep[input.sleep];
  const exerciseImpact = IMPACT_WEIGHTS.exercise[input.exercise];
  const dietImpact = IMPACT_WEIGHTS.diet[input.diet];

  for (const organ of SIMULATION_ORGANS) {
    scores[organ] +=
      smokingImpact[organ] +
      alcoholImpact[organ] +
      sleepImpact[organ] +
      exerciseImpact[organ] +
      dietImpact[organ];
  }

  const simulation: SimulationResponse = {
    organs: {
      lungs: makeTimeline(scores.lungs),
      heart: makeTimeline(scores.heart),
      liver: makeTimeline(scores.liver),
      brain: makeTimeline(scores.brain),
      body_fat: makeTimeline(scores.body_fat),
    },
    summary: '',
  };

  simulation.summary = buildSummary(simulation);
  return simulation;
}

export function buildSimulationPrompt(input: HabitsInput): string {
  const chatContext = input.chatText?.trim() ? `User note: "${input.chatText.trim()}"\n` : '';

  return [
    'You are simulating long-term health strain for a non-medical demo application.',
    'Output ONLY valid JSON with this exact shape:',
    '{"organs":{"lungs":{"0":number,"5":number,"10":number,"20":number},"heart":{"0":number,"5":number,"10":number,"20":number},"liver":{"0":number,"5":number,"10":number,"20":number},"brain":{"0":number,"5":number,"10":number,"20":number},"body_fat":{"0":number,"5":number,"10":number,"20":number}},"summary":"string"}',
    'Rules:',
    '- Scores are integers between 0 and 100.',
    '- Values must be non-decreasing over time for each organ.',
    '- Years must be exactly keys "0", "5", "10", and "20".',
    '- Include all organs: lungs, heart, liver, brain, body_fat.',
    '- Keep summary to 1-2 short sentences.',
    'Habit input:',
    `- smoking: ${input.smoking}`,
    `- alcohol: ${input.alcohol}`,
    `- sleep: ${input.sleep}`,
    `- exercise: ${input.exercise}`,
    `- diet: ${input.diet}`,
    chatContext,
  ]
    .filter(Boolean)
    .join('\n');
}

function parseModelOutput(raw: unknown): unknown {
  if (typeof raw === 'object' && raw !== null) {
    return raw;
  }

  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first < 0 || last <= first) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

export function normalizeSimulationResponse(raw: unknown, fallback: SimulationResponse): SimulationResponse {
  const parsed = parseModelOutput(raw) as
    | {
        organs?: Partial<Record<OrganName, Partial<Record<SimulationYear, unknown>>>> & {
          ['body-fat']?: Partial<Record<SimulationYear, unknown>>;
        };
        summary?: unknown;
      }
    | null;

  const organs = SIMULATION_ORGANS.reduce((acc, organ) => {
    const source = parsed?.organs?.[organ] ?? (organ === 'body_fat' ? parsed?.organs?.['body-fat'] : undefined);

    const timeline = SIMULATION_YEARS.reduce((t, year) => {
      const candidate = toSafeInt(source?.[year]);
      t[year] = candidate ?? fallback.organs[organ][year];
      return t;
    }, {} as OrganTimeline);

    acc[organ] = ensureNonDecreasingTimeline(timeline);
    return acc;
  }, {} as Record<OrganName, OrganTimeline>);

  const rawSummary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : '';
  const summary = (rawSummary || fallback.summary)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .trim();

  return {
    organs,
    summary: summary || fallback.summary,
  };
}
