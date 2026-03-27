import type { Habits, HabitLevel } from '@/lib/health-types';

export interface DemoHealthSnapshot {
  stepsPerDay: number;
  sleepHours: number;
  activityMinutes: number;
}

export const DEFAULT_DEMO_HEALTH_SNAPSHOT: DemoHealthSnapshot = {
  stepsPerDay: 5200,
  sleepHours: 6.2,
  activityMinutes: 24,
};

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampFloat(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function mapStepsToExerciseLevel(stepsPerDay: number, activityMinutes: number): HabitLevel {
  if (stepsPerDay > 8000 || activityMinutes >= 45) return 0;
  if (stepsPerDay >= 4000 || activityMinutes >= 20) return 1;
  return 2;
}

export function mapSleepHoursToSleepLevel(sleepHours: number): HabitLevel {
  if (sleepHours >= 8) return 0;
  if (sleepHours >= 6) return 1;
  return 2;
}

export function mapHealthSnapshotToHabits(baseHabits: Habits, snapshot: DemoHealthSnapshot): Habits {
  return {
    ...baseHabits,
    sleep: mapSleepHoursToSleepLevel(snapshot.sleepHours),
    exercise: mapStepsToExerciseLevel(snapshot.stepsPerDay, snapshot.activityMinutes),
  };
}

export function normalizeDemoHealthSnapshot(snapshot: DemoHealthSnapshot): DemoHealthSnapshot {
  return {
    stepsPerDay: clampInt(snapshot.stepsPerDay, 0, 40000),
    sleepHours: Number(clampFloat(snapshot.sleepHours, 0, 16).toFixed(1)),
    activityMinutes: clampInt(snapshot.activityMinutes, 0, 300),
  };
}

export function generateDemoGoogleFitSnapshot(): DemoHealthSnapshot {
  const profile = Math.random();

  if (profile < 0.33) {
    return {
      stepsPerDay: 9100,
      sleepHours: 7.9,
      activityMinutes: 52,
    };
  }

  if (profile < 0.66) {
    return {
      stepsPerDay: 5600,
      sleepHours: 6.3,
      activityMinutes: 27,
    };
  }

  return {
    stepsPerDay: 2900,
    sleepHours: 5.4,
    activityMinutes: 11,
  };
}
