import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import theaterModel from "@data/theater_model.json";
import { getCommandTheaterData } from "./simulation";
import { horizonState, stockpileHorizonLabel, orderByBaselineDepletion } from "./simulation-presentation";
import { MANUFACTURER_MARKS, munitionImage } from "./simulation-assets";
import { THEATERS } from "./theater";

describe("horizon presentation", () => {
  it.each([
    [{ stockoutDay: 98, horizonDays: 97, sustained: false }, "D098", "stockout"],
    [{ stockoutDay: null, horizonDays: 1504, sustained: false }, "D1504", "finite"],
    [{ stockoutDay: null, horizonDays: null, sustained: true }, "SUSTAIN", "sustained"],
    [{ stockoutDay: null, horizonDays: null, sustained: false }, "—", "unused"],
  ] as const)("labels %j as %s", (run, label, state) => {
    expect(stockpileHorizonLabel(run)).toBe(label);
    expect(horizonState(run)).toBe(state);
  });

  it.each(getCommandTheaterData())("$id exposes every changed horizon when toggled", (scenario) => {
    for (const munition of scenario.munitions) {
      const { legacy, advanced } = munition;
      if (legacy.horizonDays !== advanced.horizonDays || legacy.sustained !== advanced.sustained) {
        expect(stockpileHorizonLabel(legacy)).not.toBe(stockpileHorizonLabel(advanced));
      }
    }
  });
});

describe("interface asset coverage", () => {
  it.each(theaterModel.weapons)("$id has a licensed thumbnail and manufacturer mark", (weapon) => {
    const path = resolve("public", `.${munitionImage(weapon.id)}`);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync("asset-sources/munitions.md", "utf8")).toContain(`\`${weapon.id}.jpg\``);
    const marks = MANUFACTURER_MARKS[weapon.prime];
    expect(marks?.length).toBeGreaterThan(0);
    for (const mark of marks) {
      if (mark.file) expect(existsSync(resolve("public/assets/manufacturer-marks", mark.file))).toBe(true);
      else expect(mark.monogram?.trim().length).toBeGreaterThan(0);
    }
  });
  it.each(theaterModel.theaters)("$id has a map configuration", (theater) => {
    expect(THEATERS[theater.id]).toBeDefined();
  });
});

describe("baseline lane order", () => {
  it("orders Taiwan by depletion and keeps the source data unchanged", () => {
    const scenario = getCommandTheaterData().find(item => item.id === "taiwan")!;
    const original = scenario.munitions.map(item => item.id);
    expect(orderByBaselineDepletion(scenario.munitions).map(item => item.id)).toEqual([
      "lrasm", "jassm", "sm6", "tlam", "thaad", "sm3", "sting", "harm", "jav", "amraam", "pac3", "m155",
    ]);
    expect(scenario.munitions.map(item => item.id)).toEqual(original);
  });
  it.each(getCommandTheaterData())("$id ignores advanced depletion dates and puts unused lanes last", scenario => {
    const ordered = orderByBaselineDepletion(scenario.munitions);
    const changed = scenario.munitions.map(item => ({ ...item, advanced: { ...item.advanced, stockoutDay: 1, horizonDays: 1 } }));
    expect(orderByBaselineDepletion(changed).map(item => item.id)).toEqual(ordered.map(item => item.id));
    if (scenario.id === "epicfury") expect(ordered.at(-1)?.id).toBe("lrasm");
  });
});
