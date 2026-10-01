import type { PillarScores } from "@/lib/data/companies";

const PILLAR_ORDER: (keyof PillarScores)[] = [
  "surgeCapacity",
  "investmentQuality",
  "americaScore",
  "adversaryExposure",
];

const SHORT_LABEL: Record<keyof PillarScores, string> = {
  surgeCapacity: "SRG",
  investmentQuality: "INV",
  americaScore: "USA",
  adversaryExposure: "ADV",
};

const FULL_LABEL: Record<keyof PillarScores, string> = {
  surgeCapacity: "Surge Capacity",
  investmentQuality: "Investment Quality",
  americaScore: "America Score",
  adversaryExposure: "Adversary Exposure",
};

const BAR_COLOR: Record<keyof PillarScores, string> = {
  surgeCapacity: "bg-navy",
  investmentQuality: "bg-score-mid",
  americaScore: "bg-old-glory",
  adversaryExposure: "bg-success-green",
};

export function PillarMiniBars({ scores }: { scores: PillarScores }) {
  return (
    <div className="flex items-end gap-3">
      {PILLAR_ORDER.map((key) => (
        <div key={key} className="flex w-10 flex-none flex-col items-center gap-1" title={`${FULL_LABEL[key]}: ${scores[key]}/100`}>
          <span className="font-mono text-[12px] font-semibold text-ink">{scores[key]}</span>
          <div className="h-[5px] w-full overflow-hidden rounded-full bg-row-divider">
            <div className={`h-full rounded-full ${BAR_COLOR[key]}`} style={{ width: `${scores[key]}%` }} />
          </div>
          <span className="font-mono text-[9px] tracking-[0.06em] text-muted">{SHORT_LABEL[key]}</span>
        </div>
      ))}
    </div>
  );
}
