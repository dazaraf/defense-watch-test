import type { RiskLevel } from "@/lib/data/companies";

const RING_COLOR: Record<RiskLevel, string> = {
  clean: "var(--color-success-green)",
  moderate: "var(--color-score-mid)",
  severe: "var(--color-adversary-red)",
  critical: "var(--color-adversary-red)",
};

const SIZE = 60;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ score, riskLevel }: { score: number; riskLevel: RiskLevel }) {
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = CIRCUMFERENCE * pct;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="shrink-0"
      role="img"
      aria-label={`Arsenal Score ${score} of 100`}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--color-row-divider)"
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={RING_COLOR[riskLevel]}
        strokeWidth={STROKE}
        strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
      <text
        x="50%"
        y="53%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-display font-bold"
        style={{ fontSize: 17, fill: "var(--color-navy)" }}
      >
        {score}
      </text>
    </svg>
  );
}
