import type { CompanyListItem } from "@/lib/data/companies";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RankingsExplorer } from "./rankings-explorer";

const PILLAR_LEGEND: { id: string; label: string; className: string }[] = [
  { id: "surgeCapacity", label: "Surge Capacity", className: "bg-navy" },
  { id: "investmentQuality", label: "Investment Quality", className: "bg-score-mid" },
  { id: "americaScore", label: "America Score", className: "bg-old-glory" },
  { id: "adversaryExposure", label: "Adversary Exposure", className: "bg-success-green" },
];

export function RankingsView({ companies }: { companies: CompanyListItem[] }) {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 py-10 pb-20 sm:px-6 sm:py-[52px] lg:px-10">
        <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.01em] text-navy sm:text-[42px]">
          The Index
        </h1>
        <p className="mt-[14px] max-w-[640px] text-[14px] leading-relaxed text-secondary">
          {companies.length} companies scored
          0–100 across four pillars: surge capacity, investment quality, domestic contribution,
          and adversary exposure. Recalculated quarterly from FPDS, SEC filings, and CFIUS
          notices. Primes and other companies are weighted differently; see Methodology.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] tracking-[0.1em] text-muted">
          <span>PILLARS:</span>
          {PILLAR_LEGEND.map((p) => (
            <span key={p.id} className="flex items-center gap-[6px] font-bold text-secondary">
              <span className={`inline-block h-[8px] w-[8px] rounded-full ${p.className}`} />
              {p.label}
            </span>
          ))}
        </div>

        <div className="mt-8">
          <RankingsExplorer companies={companies} />
        </div>

        <div className="mt-[18px] flex flex-col justify-between gap-2 font-mono text-[9px] tracking-[0.1em] text-muted sm:flex-row">
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
