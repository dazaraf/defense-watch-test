import Link from "next/link";
import type { Company, PillarScores } from "@/lib/data/companies";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RiskChip } from "@/components/rankings/risk-chip";
import { CompanyLogo } from "@/components/rankings/company-logo";
import { PillarRadar } from "./pillar-radar";
import { PillarBars } from "./pillar-bars";
import { TierPosition } from "./tier-position";

const TIER_COPY: Record<Company["tier"], { label: string; plural: string }> = {
  prime: { label: "Prime Contractor", plural: "primes" },
  subcontractor: { label: "Other", plural: "other companies" },
};

const SUBTYPE_LABEL: Record<NonNullable<Company["subtype"]>, string> = {
  "technology-enabled": "Technology-Enabled",
  traditional: "Traditional",
  strategic: "Strategic",
  materials: "Materials",
};

const CONFIDENCE_LABEL: Record<NonNullable<Company["dataConfidence"]>, string> = {
  high: "High — public financials verified",
  medium: "Medium — private/estimated scale",
  low: "Low — fast-moving or unverified",
};

function Trend({ direction, magnitude }: { direction: Company["trendDirection"]; magnitude: number }) {
  if (direction === "up") {
    return <span className="text-success-green">▲ {magnitude} this quarter</span>;
  }
  if (direction === "down") {
    return <span className="text-adversary-red">▼ {magnitude} this quarter</span>;
  }
  return <span className="text-muted">— flat this quarter</span>;
}

function tierAverage(companies: Company[]): PillarScores {
  const n = companies.length;
  return {
    surgeCapacity: companies.reduce((s, c) => s + c.pillarScores.surgeCapacity, 0) / n,
    investmentQuality: companies.reduce((s, c) => s + c.pillarScores.investmentQuality, 0) / n,
    americaScore: companies.reduce((s, c) => s + c.pillarScores.americaScore, 0) / n,
    adversaryExposure: companies.reduce((s, c) => s + c.pillarScores.adversaryExposure, 0) / n,
  };
}

export function CompanyView({
  company,
  tierCompanies,
  allCompanies,
}: {
  company: Company;
  tierCompanies: Company[];
  allCompanies: Company[];
}) {
  const copy = TIER_COPY[company.tier];
  const average = tierAverage(tierCompanies);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 py-8 pb-14 sm:px-6 sm:py-10 lg:px-10">
        <Link
          href="/rankings"
          className="font-mono text-[10px] tracking-[0.14em] text-muted hover:text-old-glory"
        >
          ← BACK TO THE INDEX
        </Link>

        <div className="mt-4 font-mono text-[11px] tracking-[0.18em] text-old-glory">
          {copy.label.toUpperCase()}
          {company.subtype ? ` · ${SUBTYPE_LABEL[company.subtype].toUpperCase()}` : ""} ·{" "}
          {company.category.toUpperCase()}
        </div>

        <div className="mt-[10px] flex flex-wrap items-center gap-x-4 gap-y-2">
          <CompanyLogo name={company.name} src={company.logoSrc} height={56} />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-[-0.01em] text-navy sm:text-[42px]">
              {company.name}
            </h1>
            {company.ticker ? (
              <span className="font-mono text-[13px] text-muted">{company.ticker}</span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-2 font-mono text-[12px] text-secondary">
          <span>HQ {company.headquarters}</span>
          {company.employees ? <span>{company.employees} EMPLOYEES</span> : null}
          <span>RANK #{company.rank} OF {allCompanies.length} COMPANIES</span>
          <RiskChip level={company.riskLevel} />
        </div>

        {company.ownership || company.keyPrograms.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2 border-l-2 border-l-card-border pl-4 text-[13px] leading-relaxed text-secondary">
            {company.ownership ? (
              <div>
                <span className="font-semibold text-ink">Ownership · </span>
                {company.ownership}
              </div>
            ) : null}
            {company.keyPrograms.length > 0 ? (
              <div>
                <span className="font-semibold text-ink">Key programs · </span>
                {company.keyPrograms.join(", ")}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-end gap-x-12 gap-y-4 border-y border-y-card-border py-5">
          <div>
            <div className="font-mono text-[10px] tracking-[0.12em] text-muted">ARSENAL SCORE</div>
            <div className="font-mono text-[56px] font-bold leading-none text-navy sm:text-[64px]">
              {company.arsenalScore}
            </div>
          </div>
          <div className="pb-[6px] font-mono text-[13px]">
            <Trend direction={company.trendDirection} magnitude={Math.abs(company.quarterTrend)} />
          </div>
          {company.dataConfidence ? (
            <div className="pb-[6px] font-mono text-[11px] text-muted">
              DATA CONFIDENCE: {CONFIDENCE_LABEL[company.dataConfidence].toUpperCase()}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[300px_1fr]">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">Pillar signature</h2>
            <p className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-secondary">
              Four pillars, 0–100, plotted against the {copy.plural} tier average.
            </p>
            <div className="mt-4">
              <PillarRadar scores={company.pillarScores} tierAverage={average} />
            </div>
          </div>

          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">How the score is built</h2>
            <p className="mt-1 max-w-[520px] text-[12px] leading-relaxed text-secondary">
              Each pillar is weighted differently for {copy.plural}: {company.tier === "prime" ? "primes weight America Score and Adversary Exposure more heavily" : "other companies weight Surge Capacity and Investment Quality more heavily"}.
            </p>
            <div className="mt-4">
              <PillarBars company={company} />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-[15px] font-bold text-ink">Position in the Index</h2>
          <p className="mt-1 max-w-[560px] text-[12px] leading-relaxed text-secondary">
            Arsenal Score against every other company in the index this quarter.
          </p>
          <div className="mt-5 max-w-[640px]">
            <TierPosition company={company} allCompanies={allCompanies} />
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-2 font-mono text-[9px] tracking-[0.1em] text-muted sm:flex-row">
          <span>
            SOURCE: FPDS, SEC FILINGS, CFIUS NOTICES, SAM.GOV ·
            METHODOLOGY: DEFENSEWATCH.COM/METHODOLOGY
          </span>
          <span>DEFENSE WATCH · Q3 2026</span>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
