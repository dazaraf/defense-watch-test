import { describe, it, expect } from "vitest";
import theaterModel from "@data/theater_model.json";
import theaterModelExpected from "@data/theater_model.expected.json";
import rankings from "@data/rankings_new.json";
import { getCommandTheaterData } from "./simulation";

const HORIZON = theaterModel.model.horizon_days;
const SITE_ORDER = ["taiwan", "korea", "baltic", "maritime", "multi", "epicfury"];
const scenarios = getCommandTheaterData();
const rankingNames = new Set([
  ...rankings.primes.map((c) => c.name),
  ...rankings.subcontractors.map((c) => c.name),
]);

type ExpectedCell = number | "SUSTAIN" | null;

describe("command theater data", () => {
  it("ships six theaters in site order", () => {
    expect(scenarios.map((s) => s.id)).toEqual(SITE_ORDER);
  });

  it("every theater carries all twelve weapons", () => {
    for (const scenario of scenarios) {
      expect(scenario.munitions).toHaveLength(12);
    }
  });

  // The acceptance test: the engine must reproduce the client's Sustainment
  // Horizon sheet cell for cell. This is the definition of done for the v2
  // engine rewrite (see web/README.md).
  it.each(
    scenarios.flatMap((scenario) =>
      scenario.munitions.flatMap((munition) => [
        { theater: scenario.id, weapon: munition.id, mode: "legacy" as const, run: munition.legacy },
        { theater: scenario.id, weapon: munition.id, mode: "advanced" as const, run: munition.advanced },
      ]),
    ),
  )("$theater/$weapon $mode matches the client's Sustainment Horizon sheet", ({ theater, weapon, mode, run }) => {
    const expectedKey = mode === "legacy" ? "baseline" : "advanced";
    const expected = (
      theaterModelExpected.horizons as Record<string, Record<string, Record<string, ExpectedCell>>>
    )[theater][weapon][expectedKey];

    if (expected === "SUSTAIN") {
      expect(run.sustained).toBe(true);
      expect(run.stockoutDay).toBeNull();
      return;
    }

    if (expected === null) {
      expect(run.sustained).toBe(false);
      expect(run.horizonDays).toBeNull();
      expect(run.stockoutDay).toBeNull();
      return;
    }

    expect(run.sustained).toBe(false);
    expect(run.horizonDays).toBe(expected);
    if (expected <= HORIZON) {
      // Flat burn means the day loop should land exactly on the algebraic
      // horizon; allow one day of slack for rounding, per web/README.md.
      expect(run.stockoutDay).not.toBeNull();
      expect(Math.abs((run.stockoutDay as number) - expected)).toBeLessThanOrEqual(1);
    } else {
      expect(run.stockoutDay).toBeNull();
    }
  });

  it.each(scenarios.flatMap((s) => s.munitions.map((m) => ({ scenario: s.id, munition: m }))))(
    "$scenario/$munition.id series spans the full horizon in both modes",
    ({ munition }) => {
      for (const run of [munition.legacy, munition.advanced]) {
        expect(run.series).toHaveLength(HORIZON);
        expect(run.series[0].day).toBe(1);
        expect(run.series[run.series.length - 1].day).toBe(HORIZON);
      }
    },
  );

  it.each(scenarios.flatMap((s) => s.munitions.map((m) => ({ scenario: s.id, munition: m }))))(
    "$scenario/$munition.id series values are sane",
    ({ munition }) => {
      for (const run of [munition.legacy, munition.advanced]) {
        for (const point of run.series) {
          expect(point.inventory).toBeGreaterThanOrEqual(0);
          expect(point.inventoryPct).toBeCloseTo(
            point.inventory / munition.startingInventory,
            3,
          );
          expect(point.production).toBeGreaterThanOrEqual(0);
          expect(point.consumption).toBeGreaterThanOrEqual(0);
        }
      }
    },
  );

  it("advanced manufacturing never trails baseline production or inventory", () => {
    for (const scenario of scenarios) {
      for (const munition of scenario.munitions) {
        for (let index = 0; index < HORIZON; index += 1) {
          const legacy = munition.legacy.series[index];
          const advanced = munition.advanced.series[index];
          expect(advanced.production).toBeGreaterThanOrEqual(legacy.production);
          expect(advanced.inventory).toBeGreaterThanOrEqual(legacy.inventory);
        }
      }
    }
  });

  it("advanced manufacturing never stocks out earlier than baseline", () => {
    for (const scenario of scenarios) {
      for (const munition of scenario.munitions) {
        const legacyHorizon = munition.legacy.stockoutDay ?? HORIZON + 1;
        const advancedHorizon = munition.advanced.stockoutDay ?? HORIZON + 1;
        expect(advancedHorizon).toBeGreaterThanOrEqual(legacyHorizon);
      }
    }
  });

  it("every munition resolves an industrial base in the rankings roster", () => {
    for (const weapon of theaterModel.weapons) {
      expect(weapon.industrial_base.length).toBeGreaterThan(0);
      for (const name of weapon.industrial_base) {
        expect(rankingNames.has(name), `${weapon.id}: "${name}" not in rankings_new.json`).toBe(
          true,
        );
      }
    }
    for (const scenario of scenarios) {
      for (const munition of scenario.munitions) {
        expect(munition.industrialBase.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("simulation display contract", () => {
  it("only serializes the active scenario, munition, and run fields", () => {
    for (const scenario of scenarios) {
      expect(Object.keys(scenario).sort()).toEqual(["description", "id", "label", "longLabel", "munitions", "summary"]);
      for (const munition of scenario.munitions) {
        expect(Object.keys(munition).sort()).toEqual([
          "advanced", "assetClass", "baselineProduction", "id", "industrialBase", "legacy",
          "manufacturer", "name", "peakConsumption", "startingInventory", "surgeMultiple",
        ]);
        for (const run of [munition.legacy, munition.advanced]) {
          expect(Object.keys(run).sort()).toEqual(["horizonDays", "series", "stockoutDay", "sustained"]);
          expect(Object.keys(run.series[0]).sort()).toEqual([
            "burnRatio", "consumption", "dailyBalance", "day", "inventory", "inventoryPct", "production", "supplyDays",
          ]);
        }
      }
    }
  });

  it("preserves the Taiwan Tomahawk assessment's displayed precision", () => {
    const run = scenarios[0].munitions.find(m => m.id === "tlam")!.legacy;
    expect(run.series[0].supplyDays!.toFixed(1)).toBe("298.9");
    expect(run.series[0].dailyBalance).toBeCloseTo(-6.42, 2);
    expect(run.series[0].burnRatio!.toFixed(1)).toBe("26.7");
    expect(run.series[run.stockoutDay! - 1].supplyDays).toBe(0);
  });

  it("represents unused LRASM without infinite or NaN payload values", () => {
    const munition = scenarios.find(s => s.id === "epicfury")!.munitions.find(m => m.id === "lrasm")!;
    for (const run of [munition.legacy, munition.advanced]) {
      for (const point of run.series) {
        expect(point.supplyDays).toBeNull();
        expect(point.burnRatio).toBe(0);
        expect(Number.isFinite(point.dailyBalance)).toBe(true);
      }
    }
  });

  it("supplies readiness and stockout summaries for every displayed day and mode", () => {
    for (const scenario of scenarios) {
      for (const mode of ["legacy", "advanced"] as const) {
        expect(scenario.summary[mode]).toHaveLength(HORIZON);
        for (const summary of scenario.summary[mode]) {
          expect(Number.isInteger(summary.readiness)).toBe(true);
          expect(summary.stockouts).toBeGreaterThanOrEqual(0);
          expect(summary.stockouts).toBeLessThanOrEqual(12);
          expect(["OPERATIONAL", "DEGRADED", "CRITICAL"]).toContain(summary.posture);
        }
      }
    }
    expect(scenarios[0].summary.legacy[0]).toEqual({ readiness: 100, stockouts: 0, posture: "OPERATIONAL" });
    expect(scenarios[0].summary.legacy[HORIZON - 1].stockouts).toBe(4);
    expect(scenarios[0].summary.advanced[HORIZON - 1].stockouts).toBe(3);
  });
});
