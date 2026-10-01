import type { Company } from "@/lib/data/companies";
import { PILLARS, pillarWeight, type PillarMeta } from "@/lib/data/scoring";

const COLOR: Record<PillarMeta["id"], string> = {
  surgeCapacity: "var(--color-navy)",
  investmentQuality: "var(--color-score-mid)",
  americaScore: "var(--color-old-glory)",
  adversaryExposure: "var(--color-success-green)",
};

export function PillarBars({ company }: { company: Company }) {
  const rows = PILLARS.map((pillar) => {
    const weight = pillarWeight(pillar, company.tier);
    const score = company.pillarScores[pillar.id];
    const contribution = score * weight;
    return { pillar, weight, score, contribution };
  });
  const total = rows.reduce((sum, r) => sum + r.contribution, 0);

  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.1em] text-muted">
        ARSENAL SCORE = Σ (PILLAR SCORE × {company.tier.toUpperCase()} WEIGHT)
      </div>

      <div className="mt-3 flex h-7 w-full overflow-hidden border border-card-border">
        {rows.map(({ pillar, contribution }) => (
          <div
            key={pillar.id}
            style={{ width: `${contribution}%`, background: COLOR[pillar.id] }}
            title={`${pillar.name}: ${contribution.toFixed(1)} pts`}
          />
        ))}
        <div className="flex-1" style={{ background: "var(--color-row-divider)" }} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map(({ pillar, weight, score, contribution }) => (
          <div key={pillar.id}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[12px]">
              <span
                className="inline-block h-[10px] w-[10px] flex-none"
                style={{ background: COLOR[pillar.id] }}
              />
              <span className="w-[150px] flex-none font-display text-[13px] font-semibold text-ink">
                {pillar.name}
              </span>
              <span className="text-secondary">
                {score}/100 · ×{Math.round(weight * 100)}%
              </span>
              <span className="sm:ml-auto text-navy">{contribution.toFixed(1)} pts</span>
            </div>
            {company.pillarRationale ? (
              <p className="mt-1 pl-[22px] text-[12px] leading-relaxed text-secondary">
                {company.pillarRationale[pillar.id]}
              </p>
            ) : null}
          </div>
        ))}

        <div className="mt-1 flex items-baseline gap-3 border-t border-t-card-border pt-[10px] font-mono text-[12px]">
          <span className="w-[160px] flex-none font-display text-[13px] font-bold text-ink">
            Arsenal Score
          </span>
          <span className="text-secondary">
            {total.toFixed(1)} pts{Math.round(total) !== company.arsenalScore ? ", rounded" : ""}
          </span>
          <span className="ml-auto text-[17px] font-semibold text-navy">{company.arsenalScore}</span>
        </div>
      </div>
    </div>
  );
}
