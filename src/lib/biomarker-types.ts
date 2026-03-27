import type { Habits, Demographics } from './health-types';

/* ── Biomarker types ── */
export interface BloodBiomarkers {
  // Lipid Panel
  totalCholesterol: number | null;   // mg/dL, normal <200
  ldl: number | null;                // mg/dL, normal <100
  hdl: number | null;                // mg/dL, normal >40M />50F
  triglycerides: number | null;      // mg/dL, normal <150

  // Blood Sugar
  fastingGlucose: number | null;     // mg/dL, normal 70-100
  hba1c: number | null;             // %, normal <5.7

  // Kidney
  creatinine: number | null;         // mg/dL, normal 0.7-1.3
  bun: number | null;                // mg/dL, normal 7-20
  egfr: number | null;               // mL/min, normal >90

  // Liver
  alt: number | null;                // U/L, normal 7-56
  ast: number | null;                // U/L, normal 10-40

  // Blood Pressure
  systolic: number | null;           // mmHg, normal <120
  diastolic: number | null;          // mmHg, normal <80

  // CBC
  hemoglobin: number | null;         // g/dL, normal 13.5-17.5M / 12-16F
  wbc: number | null;                // x10³/µL, normal 4.5-11

  // Prostate (optional, male)
  psa: number | null;                // ng/mL, normal <4.0

  // Thyroid
  tsh: number | null;                // mIU/L, normal 0.4-4.0

  // Inflammation
  crp: number | null;                // mg/L, normal <3.0

  // Iron
  ferritin: number | null;           // ng/mL, normal 20-250M / 10-120F

  // Vitamin D
  vitaminD: number | null;           // ng/mL, normal 30-100
}

export const DEFAULT_BIOMARKERS: BloodBiomarkers = {
  totalCholesterol: null, ldl: null, hdl: null, triglycerides: null,
  fastingGlucose: null, hba1c: null,
  creatinine: null, bun: null, egfr: null,
  alt: null, ast: null,
  systolic: null, diastolic: null,
  hemoglobin: null, wbc: null,
  psa: null, tsh: null, crp: null, ferritin: null, vitaminD: null,
};

/* ── Biomarker field config ── */
export interface BiomarkerField {
  key: keyof BloodBiomarkers;
  label: string;
  unit: string;
  normalRange: string;
  group: string;
  maleOnly?: boolean;
}

export const BIOMARKER_FIELDS: BiomarkerField[] = [
  // Lipid Panel
  { key: 'totalCholesterol', label: 'Total Cholesterol', unit: 'mg/dL', normalRange: '<200', group: 'Lipid Panel' },
  { key: 'ldl', label: 'LDL (Bad)', unit: 'mg/dL', normalRange: '<100', group: 'Lipid Panel' },
  { key: 'hdl', label: 'HDL (Good)', unit: 'mg/dL', normalRange: '>40', group: 'Lipid Panel' },
  { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', normalRange: '<150', group: 'Lipid Panel' },

  // Blood Sugar
  { key: 'fastingGlucose', label: 'Fasting Glucose', unit: 'mg/dL', normalRange: '70–100', group: 'Blood Sugar' },
  { key: 'hba1c', label: 'HbA1c', unit: '%', normalRange: '<5.7', group: 'Blood Sugar' },

  // Kidney Function
  { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', normalRange: '0.7–1.3', group: 'Kidney Function' },
  { key: 'bun', label: 'BUN', unit: 'mg/dL', normalRange: '7–20', group: 'Kidney Function' },
  { key: 'egfr', label: 'eGFR', unit: 'mL/min', normalRange: '>90', group: 'Kidney Function' },

  // Liver Function
  { key: 'alt', label: 'ALT', unit: 'U/L', normalRange: '7–56', group: 'Liver Function' },
  { key: 'ast', label: 'AST', unit: 'U/L', normalRange: '10–40', group: 'Liver Function' },

  // Blood Pressure
  { key: 'systolic', label: 'Systolic BP', unit: 'mmHg', normalRange: '<120', group: 'Blood Pressure' },
  { key: 'diastolic', label: 'Diastolic BP', unit: 'mmHg', normalRange: '<80', group: 'Blood Pressure' },

  // CBC
  { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', normalRange: '12–17.5', group: 'Complete Blood Count' },
  { key: 'wbc', label: 'White Blood Cells', unit: 'x10³/µL', normalRange: '4.5–11', group: 'Complete Blood Count' },

  // Prostate
  { key: 'psa', label: 'PSA', unit: 'ng/mL', normalRange: '<4.0', group: 'Prostate', maleOnly: true },

  // Thyroid
  { key: 'tsh', label: 'TSH', unit: 'mIU/L', normalRange: '0.4–4.0', group: 'Thyroid' },

  // Inflammation
  { key: 'crp', label: 'CRP', unit: 'mg/L', normalRange: '<3.0', group: 'Inflammation' },

  // Iron
  { key: 'ferritin', label: 'Ferritin', unit: 'ng/mL', normalRange: '10–250', group: 'Iron Studies' },

  // Vitamin D
  { key: 'vitaminD', label: 'Vitamin D', unit: 'ng/mL', normalRange: '30–100', group: 'Vitamins' },
];

/* ── Disease Risk ── */
export interface DiseaseRisk {
  name: string;
  risk: 'low' | 'moderate' | 'high' | 'critical';
  score: number; // 0-100
  description: string;
  source: string;
  factors: string[];
}

/**
 * Calculate disease risks based on habits, demographics, and optional biomarkers.
 * References: WHO, CDC, AHA, ADA, NCI guidelines.
 */
export function calculateDiseaseRisks(
  habits: Habits,
  demographics: Demographics,
  biomarkers: BloodBiomarkers,
): DiseaseRisk[] {
  const age = demographics.age ?? 30;
  const isMale = demographics.sex === 'male';
  const bmi = demographics.height && demographics.weight
    ? demographics.weight / ((demographics.height / 100) ** 2)
    : 24;

  const toRisk = (s: number): DiseaseRisk['risk'] =>
    s < 20 ? 'low' : s < 45 ? 'moderate' : s < 70 ? 'high' : 'critical';

  const diseases: DiseaseRisk[] = [];

  // 1. Type 2 Diabetes — ADA risk factors
  let diabetesScore = 0;
  diabetesScore += habits.diet * 12;
  diabetesScore += habits.exercise * 10;
  diabetesScore += Math.max(0, (age - 40) * 0.5);
  if (bmi >= 30) diabetesScore += 20;
  else if (bmi >= 25) diabetesScore += 10;
  if (biomarkers.hba1c !== null) {
    if (biomarkers.hba1c >= 6.5) diabetesScore += 35;
    else if (biomarkers.hba1c >= 5.7) diabetesScore += 15;
  }
  if (biomarkers.fastingGlucose !== null) {
    if (biomarkers.fastingGlucose >= 126) diabetesScore += 30;
    else if (biomarkers.fastingGlucose >= 100) diabetesScore += 12;
  }
  diabetesScore = Math.min(100, diabetesScore);
  const diabetesFactors: string[] = [];
  if (habits.diet >= 2) diabetesFactors.push('Poor diet');
  if (habits.exercise >= 2) diabetesFactors.push('Sedentary lifestyle');
  if (bmi >= 30) diabetesFactors.push('BMI ≥30 (obese)');
  if (biomarkers.hba1c !== null && biomarkers.hba1c >= 5.7) diabetesFactors.push(`HbA1c ${biomarkers.hba1c}%`);
  if (biomarkers.fastingGlucose !== null && biomarkers.fastingGlucose >= 100) diabetesFactors.push(`Fasting glucose ${biomarkers.fastingGlucose}`);
  diseases.push({
    name: 'Type 2 Diabetes',
    risk: toRisk(diabetesScore),
    score: diabetesScore,
    description: 'Chronic condition affecting blood sugar regulation. Preventable through diet, exercise, and weight management.',
    source: 'ADA Standards of Care 2024, WHO Diabetes Guidelines',
    factors: diabetesFactors.length > 0 ? diabetesFactors : ['No major risk factors detected'],
  });

  // 2. Cardiovascular Disease — AHA ASCVD
  let cvdScore = 0;
  cvdScore += habits.smoking * 18;
  cvdScore += habits.exercise * 12;
  cvdScore += habits.stress * 8;
  cvdScore += habits.diet * 8;
  cvdScore += Math.max(0, (age - 35) * 0.6);
  if (bmi >= 30) cvdScore += 12;
  if (biomarkers.totalCholesterol !== null && biomarkers.totalCholesterol >= 240) cvdScore += 15;
  if (biomarkers.ldl !== null && biomarkers.ldl >= 160) cvdScore += 18;
  if (biomarkers.hdl !== null && biomarkers.hdl < 40) cvdScore += 12;
  if (biomarkers.systolic !== null && biomarkers.systolic >= 140) cvdScore += 20;
  else if (biomarkers.systolic !== null && biomarkers.systolic >= 130) cvdScore += 10;
  if (biomarkers.crp !== null && biomarkers.crp >= 3) cvdScore += 8;
  cvdScore = Math.min(100, cvdScore);
  const cvdFactors: string[] = [];
  if (habits.smoking >= 2) cvdFactors.push('Daily smoking');
  if (habits.exercise >= 2) cvdFactors.push('Sedentary');
  if (biomarkers.systolic !== null && biomarkers.systolic >= 130) cvdFactors.push(`BP ${biomarkers.systolic}/${biomarkers.diastolic ?? '?'}`);
  if (biomarkers.ldl !== null && biomarkers.ldl >= 160) cvdFactors.push(`LDL ${biomarkers.ldl}`);
  if (biomarkers.totalCholesterol !== null && biomarkers.totalCholesterol >= 240) cvdFactors.push(`Cholesterol ${biomarkers.totalCholesterol}`);
  diseases.push({
    name: 'Cardiovascular Disease',
    risk: toRisk(cvdScore),
    score: cvdScore,
    description: 'Leading cause of death globally. Includes coronary artery disease, stroke, and heart failure.',
    source: 'AHA/ACC ASCVD Risk Guidelines, WHO CVD Report',
    factors: cvdFactors.length > 0 ? cvdFactors : ['No major risk factors detected'],
  });

  // 3. Chronic Kidney Disease
  let ckdScore = 0;
  ckdScore += habits.hydration * 15;
  ckdScore += habits.diet * 8;
  ckdScore += Math.max(0, (age - 50) * 0.4);
  if (biomarkers.creatinine !== null && biomarkers.creatinine > 1.3) ckdScore += 20;
  if (biomarkers.egfr !== null) {
    if (biomarkers.egfr < 60) ckdScore += 30;
    else if (biomarkers.egfr < 90) ckdScore += 12;
  }
  if (biomarkers.bun !== null && biomarkers.bun > 20) ckdScore += 10;
  if (biomarkers.systolic !== null && biomarkers.systolic >= 140) ckdScore += 12;
  ckdScore = Math.min(100, ckdScore);
  const ckdFactors: string[] = [];
  if (habits.hydration >= 2) ckdFactors.push('Poor hydration');
  if (biomarkers.egfr !== null && biomarkers.egfr < 90) ckdFactors.push(`eGFR ${biomarkers.egfr}`);
  if (biomarkers.creatinine !== null && biomarkers.creatinine > 1.3) ckdFactors.push(`Creatinine ${biomarkers.creatinine}`);
  diseases.push({
    name: 'Chronic Kidney Disease',
    risk: toRisk(ckdScore),
    score: ckdScore,
    description: 'Gradual loss of kidney function over time. Hypertension and diabetes are the leading causes.',
    source: 'NIDDK, KDIGO Guidelines 2024',
    factors: ckdFactors.length > 0 ? ckdFactors : ['No major risk factors detected'],
  });

  // 4. Liver Disease
  let liverScore = 0;
  liverScore += habits.alcohol * 20;
  liverScore += habits.diet * 10;
  if (bmi >= 30) liverScore += 15;
  if (biomarkers.alt !== null && biomarkers.alt > 56) liverScore += 20;
  if (biomarkers.ast !== null && biomarkers.ast > 40) liverScore += 15;
  liverScore = Math.min(100, liverScore);
  const liverFactors: string[] = [];
  if (habits.alcohol >= 2) liverFactors.push('Heavy alcohol use');
  if (bmi >= 30) liverFactors.push('Obesity (NAFLD risk)');
  if (biomarkers.alt !== null && biomarkers.alt > 56) liverFactors.push(`ALT ${biomarkers.alt}`);
  if (biomarkers.ast !== null && biomarkers.ast > 40) liverFactors.push(`AST ${biomarkers.ast}`);
  diseases.push({
    name: 'Liver Disease',
    risk: toRisk(liverScore),
    score: liverScore,
    description: 'Includes fatty liver (NAFLD), alcoholic liver disease, and cirrhosis. Often silent until advanced.',
    source: 'AASLD Practice Guidelines, CDC Liver Disease Data',
    factors: liverFactors.length > 0 ? liverFactors : ['No major risk factors detected'],
  });

  // 5. COPD / Lung Disease
  let lungScore = 0;
  lungScore += habits.smoking * 30;
  lungScore += habits.exercise * 5;
  lungScore += Math.max(0, (age - 40) * 0.3);
  lungScore = Math.min(100, lungScore);
  const lungFactors: string[] = [];
  if (habits.smoking >= 1) lungFactors.push(habits.smoking >= 2 ? 'Daily smoking' : 'Occasional smoking');
  diseases.push({
    name: 'COPD / Lung Disease',
    risk: toRisk(lungScore),
    score: lungScore,
    description: 'Chronic obstructive pulmonary disease. Smoking is the primary cause of 80% of cases.',
    source: 'WHO COPD Report, CDC Chronic Disease Prevention',
    factors: lungFactors.length > 0 ? lungFactors : ['No major risk factors detected'],
  });

  // 6. Hypertension
  let htnScore = 0;
  htnScore += habits.stress * 12;
  htnScore += habits.diet * 10;
  htnScore += habits.exercise * 8;
  htnScore += Math.max(0, (age - 30) * 0.5);
  if (biomarkers.systolic !== null) {
    if (biomarkers.systolic >= 140) htnScore += 30;
    else if (biomarkers.systolic >= 130) htnScore += 15;
    else if (biomarkers.systolic >= 120) htnScore += 5;
  }
  htnScore = Math.min(100, htnScore);
  const htnFactors: string[] = [];
  if (habits.stress >= 2) htnFactors.push('High stress');
  if (habits.diet >= 2) htnFactors.push('Poor diet (likely high sodium)');
  if (biomarkers.systolic !== null && biomarkers.systolic >= 130) htnFactors.push(`BP ${biomarkers.systolic}/${biomarkers.diastolic ?? '?'}`);
  diseases.push({
    name: 'Hypertension',
    risk: toRisk(htnScore),
    score: htnScore,
    description: 'High blood pressure damages arteries and organs silently. Known as "the silent killer."',
    source: 'AHA Blood Pressure Guidelines 2024, JNC-8',
    factors: htnFactors.length > 0 ? htnFactors : ['No major risk factors detected'],
  });

  // 7. Depression / Mental Health
  let mentalScore = 0;
  mentalScore += habits.stress * 18;
  mentalScore += habits.sleep * 15;
  mentalScore += habits.exercise * 6;
  mentalScore += habits.alcohol * 5;
  if (biomarkers.vitaminD !== null && biomarkers.vitaminD < 20) mentalScore += 10;
  if (biomarkers.tsh !== null && (biomarkers.tsh > 4 || biomarkers.tsh < 0.4)) mentalScore += 10;
  mentalScore = Math.min(100, mentalScore);
  const mentalFactors: string[] = [];
  if (habits.stress >= 2) mentalFactors.push('Chronic stress');
  if (habits.sleep >= 2) mentalFactors.push('Sleep deprivation');
  if (biomarkers.vitaminD !== null && biomarkers.vitaminD < 20) mentalFactors.push(`Vitamin D ${biomarkers.vitaminD} (low)`);
  diseases.push({
    name: 'Depression / Mental Health',
    risk: toRisk(mentalScore),
    score: mentalScore,
    description: 'Stress, poor sleep, and sedentary lifestyle are significant modifiable risk factors for depression.',
    source: 'WHO Mental Health Report, NIH NIMH Data',
    factors: mentalFactors.length > 0 ? mentalFactors : ['No major risk factors detected'],
  });

  // 8. Prostate Cancer (male only)
  if (isMale || demographics.sex === null) {
    let prostateScore = 0;
    prostateScore += Math.max(0, (age - 50) * 0.8);
    if (biomarkers.psa !== null) {
      if (biomarkers.psa >= 10) prostateScore += 40;
      else if (biomarkers.psa >= 4) prostateScore += 20;
      else if (biomarkers.psa >= 2.5) prostateScore += 8;
    }
    if (habits.diet >= 2) prostateScore += 8;
    prostateScore = Math.min(100, prostateScore);
    const prostateFactors: string[] = [];
    if (age >= 50) prostateFactors.push(`Age ${age} (screening recommended 50+)`);
    if (biomarkers.psa !== null && biomarkers.psa >= 4) prostateFactors.push(`PSA ${biomarkers.psa} ng/mL`);
    diseases.push({
      name: 'Prostate Cancer',
      risk: toRisk(prostateScore),
      score: prostateScore,
      description: 'Most common cancer in men. Age and PSA levels are key screening indicators.',
      source: 'NCI, ACS Screening Guidelines, USPSTF',
      factors: prostateFactors.length > 0 ? prostateFactors : ['No major risk factors at this age'],
    });
  }

  // 9. Anemia
  let anemiaScore = 0;
  if (biomarkers.hemoglobin !== null) {
    const low = isMale ? 13.5 : 12;
    if (biomarkers.hemoglobin < low - 2) anemiaScore += 35;
    else if (biomarkers.hemoglobin < low) anemiaScore += 15;
  }
  if (biomarkers.ferritin !== null && biomarkers.ferritin < 15) anemiaScore += 25;
  if (habits.diet >= 2) anemiaScore += 10;
  anemiaScore = Math.min(100, anemiaScore);
  const anemiaFactors: string[] = [];
  if (biomarkers.hemoglobin !== null && biomarkers.hemoglobin < (isMale ? 13.5 : 12)) anemiaFactors.push(`Hemoglobin ${biomarkers.hemoglobin}`);
  if (biomarkers.ferritin !== null && biomarkers.ferritin < 15) anemiaFactors.push(`Ferritin ${biomarkers.ferritin} (low)`);
  if (habits.diet >= 2) anemiaFactors.push('Poor diet');
  diseases.push({
    name: 'Anemia',
    risk: toRisk(anemiaScore),
    score: anemiaScore,
    description: 'Insufficient healthy red blood cells. Often caused by iron deficiency, poor diet, or chronic disease.',
    source: 'WHO Anemia Guidelines, ASH',
    factors: anemiaFactors.length > 0 ? anemiaFactors : ['No indicators detected'],
  });

  // 10. Thyroid Disorder
  let thyroidScore = 0;
  if (biomarkers.tsh !== null) {
    if (biomarkers.tsh > 10 || biomarkers.tsh < 0.1) thyroidScore += 35;
    else if (biomarkers.tsh > 4 || biomarkers.tsh < 0.4) thyroidScore += 18;
  }
  if (habits.stress >= 2) thyroidScore += 8;
  thyroidScore = Math.min(100, thyroidScore);
  const thyroidFactors: string[] = [];
  if (biomarkers.tsh !== null && (biomarkers.tsh > 4 || biomarkers.tsh < 0.4)) thyroidFactors.push(`TSH ${biomarkers.tsh}`);
  diseases.push({
    name: 'Thyroid Disorder',
    risk: toRisk(thyroidScore),
    score: thyroidScore,
    description: 'Includes hypothyroidism and hyperthyroidism. TSH is the primary screening test.',
    source: 'ATA Guidelines, Endocrine Society',
    factors: thyroidFactors.length > 0 ? thyroidFactors : ['No indicators — consider TSH screening'],
  });

  return diseases.sort((a, b) => b.score - a.score);
}
