import "server-only";
import fs from "node:fs";
import path from "node:path";
import raw from "@data/rankings_new.json";

export type Tier = "prime" | "subcontractor";
export type RiskLevel = "clean" | "moderate" | "severe" | "critical";
export type TrendDirection = "up" | "down" | "flat";
export type Subtype = "technology-enabled" | "traditional" | "strategic" | "materials";
export type DataConfidence = "high" | "medium" | "low";

export interface PillarScores {
  surgeCapacity: number;
  investmentQuality: number;
  americaScore: number;
  adversaryExposure: number;
}

export interface PillarRationale {
  surgeCapacity: string;
  investmentQuality: string;
  americaScore: string;
  adversaryExposure: string;
}

export interface Company {
  slug: string;
  rank: number;
  name: string;
  ticker: string | null;
  logoSrc: string | null;
  tier: Tier;
  subtype: Subtype | null;
  category: string;
  headquarters: string;
  employees: string | null;
  ownership: string | null;
  keyPrograms: string[];
  arsenalScore: number;
  quarterTrend: number;
  trendDirection: TrendDirection;
  pillarScores: PillarScores;
  pillarRationale: PillarRationale | null;
  riskLevel: RiskLevel;
  riskLabel: string;
  dataConfidence: DataConfidence | null;
}

interface RawCompany {
  rank: number;
  name: string;
  ticker?: string;
  tier: string;
  subtype?: string;
  category: string;
  headquarters: string;
  employees?: string;
  ownership?: string;
  key_programs?: string[];
  arsenal_score: number;
  quarter_trend: string;
  trend_direction: string;
  pillar_scores: {
    surge_capacity: number;
    investment_quality: number;
    america_score: number;
    adversary_exposure: number;
  };
  pillar_rationale?: {
    surge_capacity: string;
    investment_quality: string;
    america_score: string;
    adversary_exposure: string;
  };
  risk_level: string;
  risk_label: string;
  data_confidence?: string;
}

const KNOWN_SUBTYPES: Subtype[] = ["technology-enabled", "traditional", "strategic", "materials"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Which logo file exists is resolved here, at build time, so the client
// renders the final URL directly. Probing candidate extensions from the
// browser meant every row 404'd an .svg before its real logo could load.
const LOGO_DIR = ["public/logos"]
  .map((p) => path.join(process.cwd(), p))
  .find((p) => fs.existsSync(p));

function logoSrcFor(slug: string): string | null {
  if (!LOGO_DIR) return null;
  for (const ext of ["svg", "png"]) {
    if (fs.existsSync(path.join(LOGO_DIR, `${slug}.${ext}`))) {
      return `/logos/${slug}.${ext}`;
    }
  }
  return null;
}

function normalize(r: RawCompany): Omit<Company, "rank"> {
  const slug = slugify(r.name);
  return {
    slug,
    name: r.name,
    ticker: r.ticker ?? null,
    logoSrc: logoSrcFor(slug),
    tier: r.tier === "prime" ? "prime" : "subcontractor",
    subtype: KNOWN_SUBTYPES.includes(r.subtype as Subtype) ? (r.subtype as Subtype) : null,
    category: r.category,
    headquarters: r.headquarters,
    employees: r.employees ?? null,
    ownership: r.ownership ?? null,
    keyPrograms: r.key_programs ?? [],
    arsenalScore: r.arsenal_score,
    quarterTrend: parseInt(r.quarter_trend, 10) || 0,
    trendDirection: r.trend_direction as TrendDirection,
    pillarScores: {
      surgeCapacity: r.pillar_scores.surge_capacity,
      investmentQuality: r.pillar_scores.investment_quality,
      americaScore: r.pillar_scores.america_score,
      adversaryExposure: r.pillar_scores.adversary_exposure,
    },
    pillarRationale: r.pillar_rationale
      ? {
          surgeCapacity: r.pillar_rationale.surge_capacity,
          investmentQuality: r.pillar_rationale.investment_quality,
          americaScore: r.pillar_rationale.america_score,
          adversaryExposure: r.pillar_rationale.adversary_exposure,
        }
      : null,
    riskLevel: r.risk_level as RiskLevel,
    riskLabel: r.risk_label,
    dataConfidence: (r.data_confidence as DataConfidence) ?? null,
  };
}

// Ranked separately per tier — primes and subcontractors use different pillar
// weights, so their arsenal scores aren't on a directly comparable scale.
function rankWithinTier(items: RawCompany[]): Company[] {
  return items
    .map(normalize)
    .sort((a, b) => b.arsenalScore - a.arsenalScore || a.name.localeCompare(b.name))
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

const companies: Company[] = [
  ...rankWithinTier(raw.primes as RawCompany[]),
  ...rankWithinTier(raw.subcontractors as RawCompany[]),
];

// The rankings explorer is a client component, so everything passed to it is
// serialized into the page payload (SECURITY_GUIDELINES §5). This is the
// whitelist of fields the rankings rows render and sort on — nothing else
// crosses the boundary.
export interface CompanyListItem {
  slug: string;
  rank: number;
  name: string;
  logoSrc: string | null;
  tier: Tier;
  category: string;
  headquarters: string;
  employees: string | null;
  arsenalScore: number;
  quarterTrend: number;
  trendDirection: TrendDirection;
  pillarScores: PillarScores;
  riskLevel: RiskLevel;
}

export function getRankingsList(): CompanyListItem[] {
  return companies.map((c) => ({
    slug: c.slug,
    rank: c.rank,
    name: c.name,
    logoSrc: c.logoSrc,
    tier: c.tier,
    category: c.category,
    headquarters: c.headquarters,
    employees: c.employees,
    arsenalScore: c.arsenalScore,
    quarterTrend: c.quarterTrend,
    trendDirection: c.trendDirection,
    pillarScores: c.pillarScores,
    riskLevel: c.riskLevel,
  }));
}

export function getAllCompanies(): Company[] {
  return companies;
}

export function getCompaniesByTier(tier: Tier): Company[] {
  return companies.filter((c) => c.tier === tier);
}

export function getCompanyBySlug(slug: string): Company | undefined {
  return companies.find((c) => c.slug === slug);
}

export function getCategories(): string[] {
  return Array.from(new Set(companies.map((c) => c.category))).sort();
}
