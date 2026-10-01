export type SeriesPoint = {
  day: number;
  inventory: number;
  inventoryPct: number;
  production: number;
  consumption: number;
  supplyDays: number | null;
  dailyBalance: number;
  burnRatio: number | null;
};

export type SimulationRun = {
  stockoutDay: number | null;
  /** True when this mode's production rate meets or beats theater burn — the line never empties. */
  sustained: boolean;
  /** Algebraic horizon in days (can exceed the displayed horizon); null when sustained or not expended in this theater. */
  horizonDays: number | null;
  series: SeriesPoint[];
};

export type CompanyPillarScores = {
  surgeCapacity: number;
  investmentQuality: number;
  americaScore: number;
  adversaryExposure: number;
};

export type CompanyRankingView = {
  rank: number;
  name: string;
  ticker: string;
  tier: "prime" | "subcontractor";
  category: string;
  arsenalScore: number;
  pillarScores: CompanyPillarScores;
  riskLevel: "clean" | "moderate" | "severe" | "critical";
  riskLabel: string;
  quarterTrend: string;
  trendDirection: "up" | "down" | "flat";
  dataConfidence: "high" | "medium" | "low";
  keyPrograms: string[];
};

export type MunitionView = {
  id: string;
  name: string;
  manufacturer: string;
  startingInventory: number;
  baselineProduction: number;
  peakConsumption: number;
  industrialBase: CompanyRankingView[];
  surgeMultiple: number;
  assetClass: string;
  legacy: SimulationRun;
  advanced: SimulationRun;
};

export type TheaterDaySummary = {
  readiness: number;
  stockouts: number;
  posture: "CRITICAL" | "DEGRADED" | "OPERATIONAL";
};

export type ScenarioView = {
  id: string;
  label: string;
  longLabel: string;
  description: string;
  summary: { legacy: TheaterDaySummary[]; advanced: TheaterDaySummary[] };
  munitions: MunitionView[];
};
