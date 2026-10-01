import { describe, it, expect } from "vitest";
import raw from "@data/rankings_new.json";
import {
  getAllCompanies,
  getCompaniesByTier,
  getCompanyBySlug,
  getRankingsList,
} from "./companies";

const RISK_LEVELS = ["clean", "moderate", "severe", "critical"];
const TREND_DIRECTIONS = ["up", "down", "flat"];

describe("companies data", () => {
  it("loads all twenty-seven companies", () => {
    expect(getAllCompanies()).toHaveLength(27);
  });

  it("splits into six primes and twenty-one subcontractors", () => {
    expect(getCompaniesByTier("prime")).toHaveLength(6);
    expect(getCompaniesByTier("subcontractor")).toHaveLength(21);
  });

  // normalize() casts these with `as`, which validates nothing at runtime —
  // a typo in the JSON would render a broken risk chip on a named contractor.
  it.each(getAllCompanies())("$name normalizes cleanly", (c) => {
    expect(RISK_LEVELS).toContain(c.riskLevel);
    expect(TREND_DIRECTIONS).toContain(c.trendDirection);
    expect(c.arsenalScore).toBeGreaterThanOrEqual(0);
    expect(c.arsenalScore).toBeLessThanOrEqual(100);
    for (const score of Object.values(c.pillarScores)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  // parseInt(x) || 0 collapses a genuine "0" and an unparseable string into
  // the same value, so validate the raw strings parse rather than the output.
  it("every raw quarter_trend parses as an integer", () => {
    for (const row of [...raw.primes, ...raw.subcontractors]) {
      expect(
        Number.isInteger(parseInt(row.quarter_trend, 10)),
        `${row.name}: quarter_trend ${JSON.stringify(row.quarter_trend)} does not parse`,
      ).toBe(true);
    }
  });

  it("has no duplicate slugs", () => {
    const slugs = getAllCompanies().map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(getAllCompanies())("$name round-trips through its slug", (c) => {
    expect(getCompanyBySlug(c.slug)).toEqual(c);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getCompanyBySlug("not-a-company")).toBeUndefined();
  });

  // Primes and subcontractors are ranked separately (different pillar weights),
  // so each tier gets its own contiguous 1..N rather than one combined 1..27.
  it("assigns contiguous unique ranks 1..N within each tier", () => {
    for (const tier of ["prime", "subcontractor"] as const) {
      const ranks = getCompaniesByTier(tier)
        .map((c) => c.rank)
        .sort((a, b) => a - b);
      expect(ranks).toEqual(Array.from({ length: ranks.length }, (_, i) => i + 1));
    }
  });
});

describe("rankings list whitelist (SECURITY_GUIDELINES §5)", () => {
  // The list is serialized into the /rankings client payload. Adding a field
  // here must be a conscious decision, so the exact key set is pinned.
  const WHITELIST = [
    "slug",
    "rank",
    "name",
    "logoSrc",
    "tier",
    "category",
    "headquarters",
    "employees",
    "arsenalScore",
    "quarterTrend",
    "trendDirection",
    "pillarScores",
    "riskLevel",
  ].sort();

  it("exposes exactly the whitelisted fields", () => {
    for (const item of getRankingsList()) {
      expect(Object.keys(item).sort()).toEqual(WHITELIST);
    }
  });

  it("covers every company", () => {
    expect(getRankingsList()).toHaveLength(getAllCompanies().length);
  });

  // logoSrc is resolved against public/logos at build time — a renamed or
  // deleted file would silently degrade that company to a monogram badge.
  it.each(getAllCompanies())("$name resolves a logo file", (c) => {
    expect(c.logoSrc).not.toBeNull();
  });
});
