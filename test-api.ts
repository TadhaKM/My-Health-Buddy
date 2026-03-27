import { generateMockSimulation } from "./lib/simulation";
import type { HabitsInput, SimulationResponse } from "./lib/types";

type TestCase = {
  name: string;
  payload: HabitsInput;
  expect: {
    highestOrgan: string;
    lowestOrgan: string;
    year20Range: [number, number]; // [min, max] for the highest organ at year 20
  };
};

const tests: TestCase[] = [
  {
    name: "1. Healthy lifestyle",
    payload: {
      smoking: "none",
      alcohol: "none",
      sleep: "8h",
      exercise: "regular",
      diet: "balanced",
    },
    expect: {
      highestOrgan: "(all equal)",
      lowestOrgan: "(all equal)",
      year20Range: [5, 20],
    },
  },
  {
    name: "2. Daily smoker",
    payload: {
      smoking: "daily",
      alcohol: "weekends",
      sleep: "6h",
      exercise: "low",
      diet: "average",
    },
    expect: {
      highestOrgan: "heart",
      lowestOrgan: "liver",
      year20Range: [60, 100],
    },
  },
  {
    name: "3. Poor lifestyle combo",
    payload: {
      smoking: "none",
      alcohol: "frequent",
      sleep: "5h",
      exercise: "none",
      diet: "poor",
    },
    expect: {
      highestOrgan: "heart",
      lowestOrgan: "lungs",
      year20Range: [80, 100],
    },
  },
];

function getHighestOrgan(res: SimulationResponse): string {
  return Object.entries(res.organs)
    .sort((a, b) => b[1]["20"] - a[1]["20"])[0][0];
}

function getLowestOrgan(res: SimulationResponse): string {
  return Object.entries(res.organs)
    .sort((a, b) => a[1]["20"] - b[1]["20"])[0][0];
}

function isNonDecreasing(timeline: Record<string, number>): boolean {
  return timeline["0"] <= timeline["5"]
    && timeline["5"] <= timeline["10"]
    && timeline["10"] <= timeline["20"];
}

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`\n=== ${test.name} ===`);
  const result = generateMockSimulation(test.payload);
  console.log(JSON.stringify(result, null, 2));

  // Check all values are 0-100 integers
  const allValid = Object.values(result.organs).every((timeline) =>
    Object.values(timeline).every((v) => Number.isInteger(v) && v >= 0 && v <= 100)
  );

  // Check non-decreasing
  const allNonDecreasing = Object.values(result.organs).every(isNonDecreasing);

  // Check all organs present
  const allOrgans = ["lungs", "heart", "liver", "brain", "body_fat"].every(
    (o) => o in result.organs
  );

  // Check summary exists
  const hasSummary = typeof result.summary === "string" && result.summary.length > 0;

  const highest = getHighestOrgan(result);
  const lowest = getLowestOrgan(result);
  const highestVal = result.organs[highest as keyof typeof result.organs]["20"];

  const checks = [
    { label: "Values 0-100", ok: allValid },
    { label: "Non-decreasing", ok: allNonDecreasing },
    { label: "All organs present", ok: allOrgans },
    { label: "Has summary", ok: hasSummary },
    {
      label: `Highest organ year 20 in range [${test.expect.year20Range}]`,
      ok: highestVal >= test.expect.year20Range[0] && highestVal <= test.expect.year20Range[1],
    },
  ];

  for (const check of checks) {
    const icon = check.ok ? "PASS" : "FAIL";
    console.log(`  ${icon}: ${check.label}`);
    if (check.ok) passed++; else failed++;
  }

  console.log(`  Highest organ: ${highest} (${highestVal})`);
  console.log(`  Lowest organ: ${lowest}`);
}

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
