import type { Habits, OrganId, OrganRisk, RiskLevel, TimelineYear } from '@/lib/health-types';
import type { HabitsInput, OrganName, YearKey, SimulationResponse } from '../../lib/types';
import { normalizeSimulationResponse } from '../../lib/simulation';
import { habitsToPayload } from '@/lib/preset-contract';

export type { SimulationResponse };
export type SimulationUiState = 'idle' | 'simulating' | 'done' | 'failed';

export const SIMULATION_TIMING_TARGET_MS = 2500;
export const SIMULATION_TIMEOUT_MS = 7000;

export type SimulationRunResult = {
  response: SimulationResponse;
  uiState: Exclude<SimulationUiState, 'idle'>;
  durationMs: number;
  usedFallback: boolean;
};

const YEAR_LOOKUP: Record<TimelineYear, YearKey> = {
  0: '0',
  5: '5',
  10: '10',
  20: '20',
};

const ORGANS: OrganName[] = ['lungs', 'heart', 'liver', 'brain', 'body_fat'];

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
    occasional: { lungs: 18, heart: 12, liver: 0, brain: 5, body_fat: 0 },
    daily: { lungs: 42, heart: 26, liver: 0, brain: 10, body_fat: 0 },
  },
  alcohol: {
    none: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    weekends: { lungs: 0, heart: 5, liver: 15, brain: 10, body_fat: 0 },
    frequent: { lungs: 0, heart: 10, liver: 36, brain: 24, body_fat: 0 },
  },
  sleep: {
    '8h': { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    '6h': { lungs: 0, heart: 11, liver: 0, brain: 14, body_fat: 0 },
    '5h': { lungs: 0, heart: 24, liver: 0, brain: 30, body_fat: 0 },
  },
  exercise: {
    regular: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    low: { lungs: 0, heart: 18, liver: 0, brain: 0, body_fat: 20 },
    none: { lungs: 0, heart: 32, liver: 0, brain: 0, body_fat: 36 },
  },
  diet: {
    balanced: { lungs: 0, heart: 0, liver: 0, brain: 0, body_fat: 0 },
    average: { lungs: 0, heart: 8, liver: 10, brain: 0, body_fat: 14 },
    poor: { lungs: 0, heart: 16, liver: 24, brain: 0, body_fat: 34 },
  },
} as const;

const ORGAN_LABELS: Record<OrganId, string> = {
  brain: 'Brain',
  heart: 'Heart',
  lungs: 'Lungs',
  liver: 'Liver',
  'body-fat': 'Body Fat',
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toRisk(score: number): RiskLevel {
  return score < 20 ? 'low' : score < 45 ? 'moderate' : score < 70 ? 'high' : 'critical';
}

function makeTimeline(year0Value: number): Record<YearKey, number> {
  const y0 = clampScore(year0Value);
  const y5 = clampScore(y0 + Math.max(3, Math.round(y0 * 0.15)));
  const y10 = clampScore(Math.max(y5, y5 + Math.max(3, Math.round(y5 * 0.18))));
  const y20 = clampScore(Math.max(y10, y10 + Math.max(4, Math.round(y10 * 0.3))));

  return {
    '0': y0,
    '5': y5,
    '10': y10,
    '20': y20,
  };
}

function buildSimulationSummary(simulation: SimulationResponse): string {
  const ranked = ORGANS
    .map((organ) => ({ organ, value: simulation.organs[organ]['20'] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((entry) => (entry.organ === 'body_fat' ? 'body fat' : entry.organ));

  const topList = ranked.join(', ').replace(/, ([^,]*)$/, ' and $1');
  const highest = simulation.organs[ORGANS[0]]['20'];

  if (highest < 25) {
    return 'Projected strain stays relatively low over time. Keeping current habits should help maintain a flatter long-term risk curve.';
  }

  if (highest < 60) {
    return `The strongest long-term strain appears in ${topList}. Small lifestyle improvements could slow progression.`;
  }

  return `Projected long-term strain is highest in ${topList}. Reducing high-risk habits could meaningfully flatten these trajectories.`;
}

function organSummary(organ: OrganId, risk: RiskLevel): string {
  const summaries: Record<OrganId, Record<RiskLevel, string>> = {
    lungs: {
      low: 'Lungs appear healthy with current habits.',
      moderate: 'Some strain on respiratory function over time.',
      high: 'Noticeable decline in lung capacity expected.',
      critical: 'Severe respiratory strain is projected.',
    },
    heart: {
      low: 'Heart health looks strong.',
      moderate: 'Mild cardiovascular strain is developing.',
      high: 'Elevated risk of heart-related issues is projected.',
      critical: 'Significant cardiovascular stress is expected.',
    },
    liver: {
      low: 'Liver function remains normal.',
      moderate: 'Some metabolic strain on the liver is likely.',
      high: 'Liver is showing signs of increased long-term load.',
      critical: 'Liver health is critically impacted at this trajectory.',
    },
    brain: {
      low: 'Cognitive function appears stable.',
      moderate: 'Mild impact on focus and recovery may emerge.',
      high: 'Noticeable cognitive strain risk is projected.',
      critical: 'Significant brain health concerns are projected.',
    },
    'body-fat': {
      low: 'Body composition remains in a healthy range.',
      moderate: 'Gradual body fat increase is likely over time.',
      high: 'Notable body composition changes are projected.',
      critical: 'Significant metabolic and weight stress is projected.',
    },
  };

  return summaries[organ][risk];
}

export function generateLocalSimulation(habits: Habits): SimulationResponse {
  const input = habitsToPayload(habits);
  const scores: Record<OrganName, number> = { ...SCORE_BASELINE };

  const smokingImpact = IMPACT_WEIGHTS.smoking[input.smoking];
  const alcoholImpact = IMPACT_WEIGHTS.alcohol[input.alcohol];
  const sleepImpact = IMPACT_WEIGHTS.sleep[input.sleep];
  const exerciseImpact = IMPACT_WEIGHTS.exercise[input.exercise];
  const dietImpact = IMPACT_WEIGHTS.diet[input.diet];

  for (const organ of ORGANS) {
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

  simulation.summary = buildSimulationSummary(simulation);
  return simulation;
}

export async function fetchSimulation(habits: Habits, chatText?: string): Promise<SimulationResponse> {
  const result = await runSimulation(habits, chatText);
  return result.response;
}

export async function runSimulation(habits: Habits, chatText?: string): Promise<SimulationRunResult> {
  const fallback = generateLocalSimulation(habits);
  const endpoint = import.meta.env.VITE_SIMULATION_API_URL || '/api/simulate';
  const startedAt = performance.now();
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), SIMULATION_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habitsToPayload(habits, chatText)),
      signal: abortController.signal,
    });
    clearTimeout(timeoutHandle);
    const durationMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      return {
        response: fallback,
        uiState: 'failed',
        durationMs,
        usedFallback: true,
      };
    }

    const data = await response.json();
    return {
      response: normalizeSimulationResponse(data, fallback),
      uiState: 'done',
      durationMs,
      usedFallback: false,
    };
  } catch {
    clearTimeout(timeoutHandle);
    return {
      response: fallback,
      uiState: 'failed',
      durationMs: Math.round(performance.now() - startedAt),
      usedFallback: true,
    };
  }
}

export function toOrganRisks(simulation: SimulationResponse, years: TimelineYear): OrganRisk[] {
  const year = YEAR_LOOKUP[years];

  const scores: Record<OrganId, number> = {
    brain: simulation.organs.brain[year],
    heart: simulation.organs.heart[year],
    lungs: simulation.organs.lungs[year],
    liver: simulation.organs.liver[year],
    'body-fat': simulation.organs.body_fat[year],
  };

  const orderedOrgans: OrganId[] = ['brain', 'heart', 'lungs', 'liver', 'body-fat'];

  return orderedOrgans.map((organ) => {
    const score = clampScore(scores[organ]);
    const risk = toRisk(score);

    return {
      organ,
      label: ORGAN_LABELS[organ],
      score,
      risk,
      summary: organSummary(organ, risk),
    };
  });
}
