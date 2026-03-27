import {
  SIMULATION_ORGANS,
  SIMULATION_YEARS,
  type HabitsInput,
  type OrganName,
  type SimulationResponse,
  type SimulationYear,
} from './types';

const HABIT_ENUMS = {
  smoking: ['none', 'occasional', 'daily'],
  alcohol: ['none', 'weekends', 'frequent'],
  sleep: ['8h', '6h', '5h'],
  exercise: ['regular', 'low', 'none'],
  diet: ['balanced', 'average', 'poor'],
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasRequiredOrgans(value: unknown): value is Record<OrganName, unknown> {
  if (!isObject(value)) {
    return false;
  }

  return SIMULATION_ORGANS.every((organ) => organ in value);
}

function hasRequiredYears(value: unknown): value is Record<SimulationYear, unknown> {
  if (!isObject(value)) {
    return false;
  }

  return SIMULATION_YEARS.every((year) => year in value);
}

function isValidHabit<K extends keyof typeof HABIT_ENUMS>(key: K, value: unknown): value is (typeof HABIT_ENUMS)[K][number] {
  return typeof value === 'string' && (HABIT_ENUMS[key] as readonly string[]).includes(value);
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function toSafeInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampScore(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return clampScore(parsed);
    }
  }

  return null;
}

export function validateHabitsInput(raw: unknown):
  | { ok: true; data: HabitsInput }
  | { ok: false; error: string } {
  if (!isObject(raw)) {
    return { ok: false, error: 'Body must be a JSON object.' };
  }

  if (!isValidHabit('smoking', raw.smoking)) {
    return { ok: false, error: 'Invalid smoking value.' };
  }
  if (!isValidHabit('alcohol', raw.alcohol)) {
    return { ok: false, error: 'Invalid alcohol value.' };
  }
  if (!isValidHabit('sleep', raw.sleep)) {
    return { ok: false, error: 'Invalid sleep value.' };
  }
  if (!isValidHabit('exercise', raw.exercise)) {
    return { ok: false, error: 'Invalid exercise value.' };
  }
  if (!isValidHabit('diet', raw.diet)) {
    return { ok: false, error: 'Invalid diet value.' };
  }

  if (raw.chatText !== undefined && typeof raw.chatText !== 'string') {
    return { ok: false, error: 'chatText must be a string when provided.' };
  }

  return {
    ok: true,
    data: {
      smoking: raw.smoking,
      alcohol: raw.alcohol,
      sleep: raw.sleep,
      exercise: raw.exercise,
      diet: raw.diet,
      chatText: typeof raw.chatText === 'string' ? raw.chatText : undefined,
    },
  };
}

export function hasCompleteSimulationShape(value: unknown): value is SimulationResponse {
  if (!isObject(value)) {
    return false;
  }

  if (typeof value.summary !== 'string') {
    return false;
  }

  if (!hasRequiredOrgans(value.organs)) {
    return false;
  }

  return SIMULATION_ORGANS.every((organ) => hasRequiredYears(value.organs[organ]));
}
