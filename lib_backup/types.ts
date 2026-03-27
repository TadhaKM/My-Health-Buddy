export const SIMULATION_YEARS = ['0', '5', '10', '20'] as const;
export const SIMULATION_ORGANS = ['lungs', 'heart', 'liver', 'brain', 'body_fat'] as const;

export type SimulationYear = (typeof SIMULATION_YEARS)[number];
export type OrganName = (typeof SIMULATION_ORGANS)[number];

export type HabitsInput = {
  smoking: 'none' | 'occasional' | 'daily';
  alcohol: 'none' | 'weekends' | 'frequent';
  sleep: '8h' | '6h' | '5h';
  exercise: 'regular' | 'low' | 'none';
  diet: 'balanced' | 'average' | 'poor';
  chatText?: string;
};

export type OrganTimeline = Record<SimulationYear, number>;

export type SimulationResponse = {
  organs: Record<OrganName, OrganTimeline>;
  summary: string;
};
