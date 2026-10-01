import "server-only";
import raw from "@data/scoring_model.json";
import type { Tier } from "./companies";

export interface PillarMeta {
  id: "surgeCapacity" | "investmentQuality" | "americaScore" | "adversaryExposure";
  rawId: string;
  name: string;
  short: string;
  primeWeight: number;
  subcontractorWeight: number;
}

interface RawPillar {
  id: string;
  name: string;
  prime_weight: number;
  subcontractor_weight: number;
}

const ID_MAP: Record<string, PillarMeta["id"]> = {
  surge_capacity: "surgeCapacity",
  investment_quality: "investmentQuality",
  america_score: "americaScore",
  adversary_exposure: "adversaryExposure",
};

const SHORT_LABEL: Record<PillarMeta["id"], string> = {
  surgeCapacity: "S",
  investmentQuality: "I",
  americaScore: "A",
  adversaryExposure: "X",
};

export const PILLARS: PillarMeta[] = (
  raw.arsenal_score.pillars as RawPillar[]
).map((p) => {
  const id = ID_MAP[p.id];
  return {
    id,
    rawId: p.id,
    name: p.name,
    short: SHORT_LABEL[id],
    primeWeight: p.prime_weight,
    subcontractorWeight: p.subcontractor_weight,
  };
});

export function pillarWeight(pillar: PillarMeta, tier: Tier): number {
  return tier === "prime" ? pillar.primeWeight : pillar.subcontractorWeight;
}
