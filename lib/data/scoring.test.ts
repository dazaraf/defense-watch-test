import { describe, it, expect } from "vitest";
import rankings from "@data/rankings_new.json";
import scoringModel from "@data/scoring_model.json";
import scoringModelNew from "@data/scoring_model_new.json";
import { PILLARS, pillarWeight } from "./scoring";

describe("pillar weights", () => {
  it("defines all four pillars", () => {
    expect(PILLARS.map((p) => p.id).sort()).toEqual([
      "adversaryExposure",
      "americaScore",
      "investmentQuality",
      "surgeCapacity",
    ]);
  });

  it("prime weights sum to 1.0", () => {
    const sum = PILLARS.reduce((acc, p) => acc + p.primeWeight, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("subcontractor weights sum to 1.0", () => {
    const sum = PILLARS.reduce((acc, p) => acc + p.subcontractorWeight, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it.each(PILLARS)("pillarWeight returns the right tier's weight for $id", (p) => {
    expect(pillarWeight(p, "prime")).toBe(p.primeWeight);
    expect(pillarWeight(p, "subcontractor")).toBe(p.subcontractorWeight);
  });
});

// The weights live in three files: scoring_model.json (read by the site),
// scoring_model_new.json (read by the simulation), and the scoring_weights
// block embedded in rankings_new.json. Nothing structurally prevents them
// from drifting apart — this test does.
describe("weights agree across all three data files", () => {
  type RawPillar = { id: string; prime_weight: number; subcontractor_weight: number };
  const modelPillars = scoringModel.arsenal_score.pillars as RawPillar[];
  const modelNewPillars = scoringModelNew.arsenal_score.pillars as RawPillar[];
  const embedded = rankings.scoring_weights as Record<
    "prime" | "subcontractor",
    Record<string, number>
  >;

  it.each(modelPillars)("$id matches scoring_model_new.json", (p) => {
    const other = modelNewPillars.find((x) => x.id === p.id);
    expect(other, `pillar ${p.id} missing from scoring_model_new.json`).toBeDefined();
    expect(other?.prime_weight).toBe(p.prime_weight);
    expect(other?.subcontractor_weight).toBe(p.subcontractor_weight);
  });

  it.each(modelPillars)("$id matches rankings_new.json scoring_weights", (p) => {
    expect(embedded.prime[p.id]).toBe(p.prime_weight);
    expect(embedded.subcontractor[p.id]).toBe(p.subcontractor_weight);
  });
});
