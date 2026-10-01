import type { MunitionView, SimulationRun } from "./types";

type HorizonRun = Pick<SimulationRun, "stockoutDay" | "sustained" | "horizonDays">;

export function horizonState(run: HorizonRun) {
  if (run.stockoutDay !== null) return "stockout";
  if (run.sustained) return "sustained";
  return run.horizonDays !== null ? "finite" : "unused";
}

export function stockpileHorizonLabel(run: HorizonRun): string {
  if (run.sustained) return "SUSTAIN";
  const day = run.stockoutDay ?? run.horizonDays;
  return day === null ? "—" : `D${String(day).padStart(3, "0")}`;
}

// Baseline alone fixes the comparison order, regardless of the selected mode.
export function orderByBaselineDepletion(munitions: MunitionView[]) {
  const rank = (munition: MunitionView) => {
    const run = munition.legacy;
    if (run.sustained) return Number.MAX_VALUE;
    return run.stockoutDay ?? run.horizonDays ?? Infinity;
  };
  return [...munitions].sort((a, b) => rank(a) - rank(b));
}
