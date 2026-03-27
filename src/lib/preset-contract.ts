import type { Habits } from '@/lib/health-types';
import type { HabitsInput } from '../../lib/types';

export type PresetKey = 'healthy' | 'smoker' | 'poorSleep' | 'stressCombo';

export const PRESET_TO_PAYLOAD: Record<PresetKey, { label: string; payload: HabitsInput }> = {
  healthy: {
    label: 'Healthy',
    payload: {
      smoking: 'none',
      alcohol: 'none',
      sleep: '8h',
      exercise: 'regular',
      diet: 'balanced',
    },
  },
  smoker: {
    label: 'Smoker',
    payload: {
      smoking: 'daily',
      alcohol: 'weekends',
      sleep: '6h',
      exercise: 'low',
      diet: 'average',
    },
  },
  poorSleep: {
    label: 'Poor Sleep',
    payload: {
      smoking: 'none',
      alcohol: 'weekends',
      sleep: '5h',
      exercise: 'low',
      diet: 'average',
    },
  },
  stressCombo: {
    label: 'Stress Combo',
    payload: {
      smoking: 'occasional',
      alcohol: 'frequent',
      sleep: '5h',
      exercise: 'none',
      diet: 'poor',
    },
  },
};

export const PRESET_UI_LABELS: Record<PresetKey, string> = {
  healthy: '💚 Healthy',
  smoker: '🚬 Smoker',
  poorSleep: '😵 Poor Sleep',
  stressCombo: '⚡ Stress Combo',
};

const SMOKING_LEVEL: Record<HabitsInput['smoking'], Habits['smoking']> = {
  none: 0,
  occasional: 1,
  daily: 2,
};

const ALCOHOL_LEVEL: Record<HabitsInput['alcohol'], Habits['alcohol']> = {
  none: 0,
  weekends: 1,
  frequent: 2,
};

const SLEEP_LEVEL: Record<HabitsInput['sleep'], Habits['sleep']> = {
  '8h': 0,
  '6h': 1,
  '5h': 2,
};

const EXERCISE_LEVEL: Record<HabitsInput['exercise'], Habits['exercise']> = {
  regular: 0,
  low: 1,
  none: 2,
};

const DIET_LEVEL: Record<HabitsInput['diet'], Habits['diet']> = {
  balanced: 0,
  average: 1,
  poor: 2,
};

export function payloadToHabits(payload: HabitsInput): Habits {
  return {
    smoking: SMOKING_LEVEL[payload.smoking],
    alcohol: ALCOHOL_LEVEL[payload.alcohol],
    sleep: SLEEP_LEVEL[payload.sleep],
    exercise: EXERCISE_LEVEL[payload.exercise],
    diet: DIET_LEVEL[payload.diet],
  };
}

export function habitsToPayload(habits: Habits, chatText?: string): HabitsInput {
  const smokingMap: HabitsInput['smoking'][] = ['none', 'occasional', 'daily'];
  const alcoholMap: HabitsInput['alcohol'][] = ['none', 'weekends', 'frequent'];
  const sleepMap: HabitsInput['sleep'][] = ['8h', '6h', '5h'];
  const exerciseMap: HabitsInput['exercise'][] = ['regular', 'low', 'none'];
  const dietMap: HabitsInput['diet'][] = ['balanced', 'average', 'poor'];

  return {
    smoking: smokingMap[habits.smoking],
    alcohol: alcoholMap[habits.alcohol],
    sleep: sleepMap[habits.sleep],
    exercise: exerciseMap[habits.exercise],
    diet: dietMap[habits.diet],
    chatText,
  };
}
