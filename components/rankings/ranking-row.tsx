import Link from "next/link";
import type { CompanyListItem } from "@/lib/data/companies";
import { RiskChip } from "./risk-chip";
import { ScoreRing } from "./score-ring";
import { PillarMiniBars } from "./pillar-mini-bars";
import { CompanyLogo } from "./company-logo";

const TIER_LABEL: Record<CompanyListItem["tier"], string> = {
  prime: "PRIME",
  subcontractor: "OTHER",
};

function Trend({ direction, magnitude }: { direction: CompanyListItem["trendDirection"]; magnitude: number }) {
  if (direction === "up") {
    return <span className="text-success-green">▲ {magnitude}</span>;
  }
  if (direction === "down") {
    return <span className="text-adversary-red">▼ {magnitude}</span>;
  }
  return <span className="text-muted">— {magnitude}</span>;
}

export function RankingRow({ company }: { company: CompanyListItem }) {
  return (
    <Link
      href={`/company/${company.slug}`}
      className="flex flex-col gap-4 border-b border-b-row-divider border-l-2 border-l-transparent px-3 py-4 transition-colors hover:border-l-old-glory hover:bg-white sm:flex-row sm:items-center sm:gap-5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <CompanyLogo name={company.name} src={company.logoSrc} height={32} width={120} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-[16px] font-bold text-ink">{company.name}</span>
            <span className="border border-navy/25 bg-navy/[0.06] px-[6px] py-[1px] font-mono text-[9px] font-bold tracking-[0.08em] text-navy">
              {TIER_LABEL[company.tier]}
            </span>
          </div>
          <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[12px] text-secondary">
            <span className="bg-paper border border-card-border px-[7px] py-[2px] text-[11px] font-medium text-secondary">
              {company.category}
            </span>
            <span>{company.headquarters}</span>
            {company.employees ? <span className="hidden sm:inline">· {company.employees}</span> : null}
          </div>
        </div>
        <div className="ml-auto sm:hidden">
          <RiskChip level={company.riskLevel} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 pl-12 sm:ml-auto sm:flex-none sm:pl-0">
        <div className="flex flex-col items-center gap-1">
          <ScoreRing score={company.arsenalScore} riskLevel={company.riskLevel} />
          <span className="font-mono text-[10px]">
            <Trend direction={company.trendDirection} magnitude={Math.abs(company.quarterTrend)} />
          </span>
        </div>

        <PillarMiniBars scores={company.pillarScores} />

        <div className="hidden w-[158px] flex-none justify-center sm:flex">
          <RiskChip level={company.riskLevel} />
        </div>
      </div>
    </Link>
  );
}
