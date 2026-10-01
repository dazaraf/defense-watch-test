"use client";

import { useMemo, useState } from "react";
import type { CompanyListItem, Tier } from "@/lib/data/companies";
import { RankingRow } from "./ranking-row";

type TierFilter = "all" | Tier;

const TIER_OPTIONS: { key: TierFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "prime", label: "Prime Contractors" },
  { key: "subcontractor", label: "Other" },
];

function byRank(a: CompanyListItem, b: CompanyListItem): number {
  return a.rank - b.rank;
}

export function RankingsExplorer({ companies }: { companies: CompanyListItem[] }) {
  const [tier, setTier] = useState<TierFilter>("all");

  const filtered = useMemo(() => {
    if (tier === "all") {
      const primes = companies.filter((c) => c.tier === "prime").sort(byRank);
      const subcontractors = companies.filter((c) => c.tier === "subcontractor").sort(byRank);
      return [...primes, ...subcontractors];
    }
    return companies.filter((c) => c.tier === tier).sort(byRank);
  }, [companies, tier]);

  return (
    <div>
      <div className="inline-flex w-fit gap-1 border border-card-border bg-white p-1">
        {TIER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setTier(opt.key)}
            className={`whitespace-nowrap px-3 py-[7px] font-sans text-[13px] font-semibold transition-colors ${
              tier === opt.key
                ? "bg-navy text-white"
                : "text-secondary hover:bg-paper hover:text-navy"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        {filtered.map((c) => (
          <RankingRow key={c.slug} company={c} />
        ))}
        {filtered.length === 0 ? (
          <div className="py-10 text-center font-mono text-[12px] text-muted">
            No companies in this category.
          </div>
        ) : null}
      </div>
    </div>
  );
}
