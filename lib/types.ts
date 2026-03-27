export type HabitsInput = {
  smoking: "none" | "occasional" | "daily";
  alcohol: "none" | "weekends" | "frequent";
  sleep: "8h" | "6h" | "5h";
  exercise: "regular" | "low" | "none";
  diet: "balanced" | "average" | "poor";
  chatText?: string;
};

export type OrganName = "lungs" | "heart" | "liver" | "brain" | "body_fat";

export type YearKey = "0" | "5" | "10" | "20";

export type OrganTimeline = Record<YearKey, number>;

export type SimulationResponse = {
  organs: Record<OrganName, OrganTimeline>;
  summary: string;
};
