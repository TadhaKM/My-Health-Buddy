import { PRESET_TO_PAYLOAD, PRESET_UI_LABELS, payloadToHabits } from '@/lib/preset-contract';
import type { BloodBiomarkers } from './biomarker-types';

export type HabitLevel = 0 | 1 | 2;

export interface HabitConfig {
  id: string;
  label: string;
  icon: string;
  levels: [string, string, string];
}

export interface Habits {
  smoking: HabitLevel;
  alcohol: HabitLevel;
  sleep: HabitLevel;
  exercise: HabitLevel;
  diet: HabitLevel;
  stress: HabitLevel;
  hydration: HabitLevel;
}

export interface Demographics {
  age: number | null;
  height: number | null;
  weight: number | null;
  sex: 'male' | 'female' | 'other' | null;
}

export type OrganId = 'brain' | 'heart' | 'lungs' | 'liver' | 'body-fat' | 'kidneys';

export type TimelineYear = 0 | 5 | 10 | 20;

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface OrganRisk {
  organ: OrganId;
  label: string;
  risk: RiskLevel;
  score: number;
  summary: string;
}

export const HABIT_CONFIGS: HabitConfig[] = [
  { id: 'smoking', label: 'Smoking', icon: '🚬', levels: ['None', 'Occasional', 'Daily'] },
  { id: 'alcohol', label: 'Alcohol', icon: '🍷', levels: ['None', 'Weekends', 'Frequent'] },
  { id: 'sleep', label: 'Sleep', icon: '😴', levels: ['7-9h', '6h', '≤5h'] },
  { id: 'exercise', label: 'Exercise', icon: '🏃', levels: ['150+ min/wk', '60-149', '<60'] },
  { id: 'diet', label: 'Diet', icon: '🥗', levels: ['Balanced', 'Average', 'Poor'] },
  { id: 'stress', label: 'Stress', icon: '🧠', levels: ['Low', 'Moderate', 'High'] },
  { id: 'hydration', label: 'Hydration', icon: '💧', levels: ['8+ cups', '4-7 cups', '<4 cups'] },
];

export const TIMELINE_YEARS: TimelineYear[] = [0, 5, 10, 20];

export const DEFAULT_HABITS: Habits = {
  smoking: 0,
  alcohol: 0,
  sleep: 0,
  exercise: 0,
  diet: 0,
  stress: 0,
  hydration: 0,
};

export const DEFAULT_DEMOGRAPHICS: Demographics = {
  age: null,
  height: null,
  weight: null,
  sex: null,
};

export const PRESETS: Record<string, { label: string; habits: Habits }> = {
  healthy: { label: PRESET_UI_LABELS.healthy, habits: payloadToHabits(PRESET_TO_PAYLOAD.healthy.payload) },
  smoker: { label: PRESET_UI_LABELS.smoker, habits: payloadToHabits(PRESET_TO_PAYLOAD.smoker.payload) },
  poorSleep: { label: PRESET_UI_LABELS.poorSleep, habits: payloadToHabits(PRESET_TO_PAYLOAD.poorSleep.payload) },
  stressCombo: { label: PRESET_UI_LABELS.stressCombo, habits: payloadToHabits(PRESET_TO_PAYLOAD.stressCombo.payload) },
};

export function calculateOrganRisks(
  habits: Habits,
  years: TimelineYear,
  demographics?: Demographics,
  biomarkers?: BloodBiomarkers | null,
): OrganRisk[] {
  const timeFactor = years / 20;

  let ageMod = 1.0;
  if (demographics?.age) {
    ageMod = 1.0 + Math.max(0, (demographics.age - 25) * 0.008);
  }

  let bmiMod = 1.0;
  if (demographics?.height && demographics?.weight) {
    const heightM = demographics.height / 100;
    const bmi = demographics.weight / (heightM * heightM);
    if (bmi < 18.5) bmiMod = 1.1;
    else if (bmi >= 25 && bmi < 30) bmiMod = 1.15;
    else if (bmi >= 30) bmiMod = 1.3;
  }

  let lungBioBoost = 0;
  let heartBioBoost = 0;
  let liverBioBoost = 0;
  let brainBioBoost = 0;
  let fatBioBoost = 0;
  let kidneyBioBoost = 0;

  if (biomarkers) {
    if (biomarkers.totalCholesterol !== null && biomarkers.totalCholesterol >= 240) heartBioBoost += 12;
    if (biomarkers.ldl !== null && biomarkers.ldl >= 160) heartBioBoost += 15;
    if (biomarkers.hdl !== null && biomarkers.hdl < 40) heartBioBoost += 10;
    if (biomarkers.triglycerides !== null && biomarkers.triglycerides >= 200) {
      heartBioBoost += 8;
      fatBioBoost += 8;
    }
    if (biomarkers.systolic !== null && biomarkers.systolic >= 140) heartBioBoost += 18;
    else if (biomarkers.systolic !== null && biomarkers.systolic >= 130) heartBioBoost += 8;
    if (biomarkers.crp !== null && biomarkers.crp >= 3) {
      heartBioBoost += 8;
      brainBioBoost += 5;
    }

    if (biomarkers.alt !== null && biomarkers.alt > 56) liverBioBoost += 18;
    if (biomarkers.ast !== null && biomarkers.ast > 40) liverBioBoost += 12;

    if (biomarkers.creatinine !== null && biomarkers.creatinine > 1.3) kidneyBioBoost += 15;
    if (biomarkers.egfr !== null) {
      if (biomarkers.egfr < 60) kidneyBioBoost += 25;
      else if (biomarkers.egfr < 90) kidneyBioBoost += 10;
    }
    if (biomarkers.bun !== null && biomarkers.bun > 20) kidneyBioBoost += 8;

    if (biomarkers.vitaminD !== null && biomarkers.vitaminD < 20) brainBioBoost += 8;
    if (biomarkers.tsh !== null && (biomarkers.tsh > 4 || biomarkers.tsh < 0.4)) brainBioBoost += 8;
    if (biomarkers.hba1c !== null && biomarkers.hba1c >= 6.5) brainBioBoost += 10;

    if (biomarkers.hemoglobin !== null) {
      const isMale = demographics?.sex === 'male';
      const low = isMale ? 13.5 : 12;
      if (biomarkers.hemoglobin < low) lungBioBoost += 10;
    }

    if (biomarkers.fastingGlucose !== null && biomarkers.fastingGlucose >= 126) fatBioBoost += 12;
    else if (biomarkers.fastingGlucose !== null && biomarkers.fastingGlucose >= 100) fatBioBoost += 5;
    if (biomarkers.hba1c !== null && biomarkers.hba1c >= 6.5) fatBioBoost += 10;
    if (biomarkers.ferritin !== null && biomarkers.ferritin < 15) fatBioBoost += 5;
  }

  const r2 = (n: number) => parseFloat(n.toFixed(2));

  const lungScore = r2(
    Math.min(
      100,
      (habits.smoking * 35 + habits.exercise * 12 + habits.diet * 5 + habits.hydration * 3) * (0.3 + timeFactor * 0.7) * ageMod +
        lungBioBoost,
    ),
  );
  const heartScore = r2(
    Math.min(
      100,
      (habits.smoking * 15 + habits.exercise * 22 + habits.diet * 15 + habits.alcohol * 10 + habits.stress * 12) *
        (0.3 + timeFactor * 0.7) *
        ageMod *
        bmiMod +
        heartBioBoost,
    ),
  );
  const liverScore = r2(
    Math.min(
      100,
      (habits.alcohol * 30 + habits.diet * 15 + habits.smoking * 5 + habits.hydration * 5) * (0.3 + timeFactor * 0.7) * ageMod +
        liverBioBoost,
    ),
  );
  const brainScore = r2(
    Math.min(
      100,
      (habits.sleep * 25 + habits.alcohol * 12 + habits.smoking * 8 + habits.stress * 18 + habits.hydration * 5) * (0.3 + timeFactor * 0.7) * ageMod +
        brainBioBoost,
    ),
  );
  const fatScore = r2(
    Math.min(
      100,
      (habits.exercise * 22 + habits.diet * 25 + habits.sleep * 8 + habits.stress * 8 + habits.hydration * 4) * (0.3 + timeFactor * 0.7) * bmiMod +
        fatBioBoost,
    ),
  );
  const kidneyScore = r2(
    Math.min(
      100,
      (habits.hydration * 28 + habits.diet * 18 + habits.alcohol * 10 + habits.smoking * 5 + habits.stress * 5) * (0.3 + timeFactor * 0.7) * ageMod +
        kidneyBioBoost,
    ),
  );

  const toRisk = (score: number): RiskLevel => (score < 20 ? 'low' : score < 45 ? 'moderate' : score < 70 ? 'high' : 'critical');

  const summaries: Record<OrganId, (r: RiskLevel) => string> = {
    lungs: (r) =>
      r === 'low'
        ? 'Lungs appear healthy. The WHO notes non-smokers maintain strong lung function through life.'
        : r === 'moderate'
          ? 'Some respiratory strain is projected over time.'
          : r === 'high'
            ? 'Significant decline in lung capacity is projected if current patterns continue.'
            : 'Severe respiratory risk is projected without lifestyle changes.',
    heart: (r) =>
      r === 'low'
        ? 'Heart health looks strong with your current pattern.'
        : r === 'moderate'
          ? 'Mild cardiovascular strain is developing.'
          : r === 'high'
            ? 'Elevated cardiovascular risk is projected.'
            : 'Critical cardiovascular stress is projected.',
    liver: (r) =>
      r === 'low'
        ? 'Liver function remains healthy.'
        : r === 'moderate'
          ? 'Some metabolic strain on the liver is developing.'
          : r === 'high'
            ? 'The liver is showing signs of increased long-term load.'
            : 'Critical liver health risk is projected.',
    brain: (r) =>
      r === 'low'
        ? 'Cognitive function appears well maintained.'
        : r === 'moderate'
          ? 'Mild impact on focus and cognition is projected.'
          : r === 'high'
            ? 'Noticeable cognitive decline risk is projected.'
            : 'Significant brain health concerns are projected.',
    'body-fat': (r) =>
      r === 'low'
        ? 'Body composition looks healthy.'
        : r === 'moderate'
          ? 'Gradual body composition change is likely.'
          : r === 'high'
            ? 'Notable metabolic and body composition changes are projected.'
            : 'Significant metabolic and weight concerns are projected.',
    kidneys: (r) =>
      r === 'low'
        ? 'Kidney function looks healthy and well supported.'
        : r === 'moderate'
          ? 'Mild kidney strain is projected over time.'
          : r === 'high'
            ? 'Elevated kidney risk is projected.'
            : 'Critical kidney stress is projected.',
  };

  return [
    { organ: 'brain', label: 'Brain', risk: toRisk(brainScore), score: brainScore, summary: summaries.brain(toRisk(brainScore)) },
    { organ: 'heart', label: 'Heart', risk: toRisk(heartScore), score: heartScore, summary: summaries.heart(toRisk(heartScore)) },
    { organ: 'lungs', label: 'Lungs', risk: toRisk(lungScore), score: lungScore, summary: summaries.lungs(toRisk(lungScore)) },
    { organ: 'liver', label: 'Liver', risk: toRisk(liverScore), score: liverScore, summary: summaries.liver(toRisk(liverScore)) },
    { organ: 'kidneys', label: 'Kidneys', risk: toRisk(kidneyScore), score: kidneyScore, summary: summaries.kidneys(toRisk(kidneyScore)) },
    { organ: 'body-fat', label: 'Body Fat', risk: toRisk(fatScore), score: fatScore, summary: summaries['body-fat'](toRisk(fatScore)) },
  ];
}
