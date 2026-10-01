import "server-only";

import rankingsSource from "../data/rankings_new.json";
import theaterModelSource from "../data/theater_model.json";
import type {
  CompanyRankingView,
  MunitionView,
  ScenarioView,
  SeriesPoint,
  SimulationRun,
} from "./types";

type WeaponInput = {
  id: string;
  name: string;
  short_name: string;
  asset_class: string;
  prime: string;
  industrial_base: string[];
  current_production_per_year: number;
  surge_multiple: number;
  surge_production_per_year: number;
  available_inventory_units: number;
};

type ExpenditureCell = {
  units_90d: number;
};

type TheaterInput = {
  id: string;
  label: string;
  long_label: string;
  description: string;
  expenditure: Record<string, ExpenditureCell>;
};

type CompanyRankingInput = {
  rank: number;
  name: string;
  ticker: string;
  tier: "prime" | "subcontractor";
  category: string;
  headquarters: string;
  arsenal_score: number;
  pillar_scores: {
    surge_capacity: number;
    investment_quality: number;
    america_score: number;
    adversary_exposure: number;
  };
  risk_level: "clean" | "moderate" | "severe" | "critical";
  risk_label: string;
  quarter_trend: string;
  trend_direction: "up" | "down" | "flat";
  data_confidence: "high" | "medium" | "low";
  key_programs: string[];
};

const rankingInputs = [
  ...(rankingsSource.primes as CompanyRankingInput[]),
  ...(rankingsSource.subcontractors as CompanyRankingInput[]),
];

const rankingsByName = new Map(
  rankingInputs.map((company) => [company.name, company]),
);

function prepareCompanyRanking(company: CompanyRankingInput): CompanyRankingView {
  return {
    rank: company.rank,
    name: company.name,
    ticker: company.ticker,
    tier: company.tier,
    category: company.category,
    arsenalScore: company.arsenal_score,
    pillarScores: {
      surgeCapacity: company.pillar_scores.surge_capacity,
      investmentQuality: company.pillar_scores.investment_quality,
      americaScore: company.pillar_scores.america_score,
      adversaryExposure: company.pillar_scores.adversary_exposure,
    },
    riskLevel: company.risk_level,
    riskLabel: company.risk_label,
    quarterTrend: company.quarter_trend,
    trendDirection: company.trend_direction,
    dataConfidence: company.data_confidence,
    keyPrograms: company.key_programs,
  };
}

function industrialBaseFor(names: string[]): CompanyRankingView[] {
  return names
    .map((name) => rankingsByName.get(name))
    .filter((company): company is CompanyRankingInput => company !== undefined)
    .map(prepareCompanyRanking);
}

const model = theaterModelSource.model;
const horizon = model.horizon_days;
const campaignDays = model.campaign_days;
const daysPerYear = model.days_per_year;

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

// The client's model: production and consumption are both flat rates, not a
// ramp — baseline runs at current production, advanced runs at the surge
// rate, from day 1. See web/README.md "v2: simulation engine handoff".
function runSimulation(
  productionPerDay: number,
  consumptionPerDay: number,
  startingInventory: number,
): SimulationRun {
  const sustained = consumptionPerDay > 0 && productionPerDay >= consumptionPerDay;
  const horizonDays =
    consumptionPerDay === 0 || sustained
      ? null
      : Math.round(startingInventory / (consumptionPerDay - productionPerDay));

  let inventory = startingInventory;
  let stockoutDay: number | null = null;
  const series: SeriesPoint[] = [];

  for (let day = 1; day <= horizon; day += 1) {
    inventory = Math.max(0, inventory + productionPerDay - consumptionPerDay);
    if (stockoutDay === null && inventory <= 0) stockoutDay = day;

    // Match the visible series precision so the assessment agrees with its inputs.
    const visibleInventory = round(inventory);
    const production = round(productionPerDay);
    const consumption = round(consumptionPerDay);
    series.push({
      day,
      inventory: visibleInventory,
      inventoryPct: round(inventory / startingInventory, 4),
      production,
      consumption,
      supplyDays: consumption > 0 ? visibleInventory / consumption : null,
      dailyBalance: production - consumption,
      burnRatio: production > 0 ? consumption / production : null,
    });
  }

  return {
    stockoutDay,
    sustained,
    horizonDays,
    series,
  };
}

function prepareMunition(weapon: WeaponInput, expenditure: ExpenditureCell): MunitionView {
  const burnPerDay = expenditure.units_90d / campaignDays;
  const baselineProductionPerDay = weapon.current_production_per_year / daysPerYear;
  const advancedProductionPerDay = weapon.surge_production_per_year / daysPerYear;
  const startingInventory = weapon.available_inventory_units;

  return {
    id: weapon.id,
    name: weapon.short_name,
    manufacturer: weapon.prime,
    startingInventory,
    baselineProduction: round(baselineProductionPerDay),
    peakConsumption: round(burnPerDay),
    industrialBase: industrialBaseFor(weapon.industrial_base),
    surgeMultiple: weapon.surge_multiple,
    assetClass: weapon.asset_class,
    legacy: runSimulation(
      baselineProductionPerDay,
      burnPerDay,
      startingInventory,
    ),
    advanced: runSimulation(
      advancedProductionPerDay,
      burnPerDay,
      startingInventory,
    ),
  };
}

const weapons = theaterModelSource.weapons as WeaponInput[];
const theaters = theaterModelSource.theaters as unknown as TheaterInput[];

export function getCommandTheaterData(): ScenarioView[] {
  return theaters.map((theater) => {
    const munitions = weapons.map((weapon) =>
      prepareMunition(weapon, theater.expenditure[weapon.id]),
    );
    const summarize = (mode: "legacy" | "advanced") =>
      Array.from({ length: horizon }, (_, index) => {
        const readiness = Math.round(munitions.reduce(
          (sum, munition) => sum + munition[mode].series[index].inventoryPct,
          0,
        ) / munitions.length * 100);
        return {
          readiness,
          stockouts: munitions.filter((munition) => {
            const stockout = munition[mode].stockoutDay;
            return stockout !== null && stockout <= index + 1;
          }).length,
          posture: readiness < 25 ? "CRITICAL" as const
            : readiness < 55 ? "DEGRADED" as const : "OPERATIONAL" as const,
        };
      });
    return {
      id: theater.id,
      label: theater.label,
      longLabel: theater.long_label,
      description: theater.description,
      summary: { legacy: summarize("legacy"), advanced: summarize("advanced") },
      munitions,
    };
  });
}
