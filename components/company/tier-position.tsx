import type { Company } from "@/lib/data/companies";

export function TierPosition({
  company,
  allCompanies,
}: {
  company: Company;
  allCompanies: Company[];
}) {
  const average = allCompanies.reduce((sum, c) => sum + c.arsenalScore, 0) / allCompanies.length;

  return (
    <div>
      <div className="relative h-8 w-full">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2" style={{ background: "var(--color-row-divider)" }} />
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${average}%`, background: "var(--color-secondary)" }}
        />
        {allCompanies.map((c) => {
          const isSelf = c.slug === company.slug;
          return (
            <div
              key={c.slug}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${c.arsenalScore}%`,
                width: isSelf ? 12 : 6,
                height: isSelf ? 12 : 6,
                background: isSelf ? "var(--color-old-glory)" : "var(--color-allied-blue)",
                boxShadow: isSelf ? "0 0 0 3px rgba(191,10,48,0.18)" : "none",
              }}
              title={`${c.name} · ${c.arsenalScore}`}
            />
          );
        })}
      </div>

      <div className="flex justify-between font-mono text-[9px] tracking-[0.08em] text-muted">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>

      <p className="mt-2 font-mono text-[11px] text-secondary">
        RANK #{company.rank} OF {allCompanies.length} COMPANIES · INDEX AVERAGE {average.toFixed(0)}
      </p>
    </div>
  );
}
