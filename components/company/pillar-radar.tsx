import type { PillarScores } from "@/lib/data/companies";

const ORDER: (keyof PillarScores)[] = [
  "surgeCapacity",
  "investmentQuality",
  "americaScore",
  "adversaryExposure",
];

const SHORT: Record<keyof PillarScores, string> = {
  surgeCapacity: "S",
  investmentQuality: "I",
  americaScore: "A",
  adversaryExposure: "X",
};

const SIZE = 300;
const CENTER = SIZE / 2;
const MAX_R = 112;
const LABEL_R = 136;
const RINGS = [25, 50, 75, 100];
const PAD_X = 34;
const PAD_Y = 20;

function angleAt(i: number): number {
  return ((-90 + i * 90) * Math.PI) / 180;
}

function point(value: number, i: number): { x: number; y: number } {
  const r = (Math.max(0, Math.min(100, value)) / 100) * MAX_R;
  const a = angleAt(i);
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) };
}

function polygon(scores: PillarScores): string {
  return ORDER.map((key, i) => {
    const p = point(scores[key], i);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
}

function labelAnchor(i: number): "middle" | "start" | "end" {
  if (i === 1) return "start";
  if (i === 3) return "end";
  return "middle";
}

function labelDy(i: number): number {
  if (i === 0) return -6;
  if (i === 2) return 14;
  return 4;
}

export function PillarRadar({
  scores,
  tierAverage,
}: {
  scores: PillarScores;
  tierAverage: PillarScores;
}) {
  return (
    <div>
      <svg
        viewBox={`${-PAD_X} ${-PAD_Y} ${SIZE + PAD_X * 2} ${SIZE + PAD_Y * 2}`}
        className="w-full max-w-[300px]"
        role="img"
        aria-label="Pillar score radar, this company vs. tier average"
      >
        <g style={{ stroke: "var(--color-card-border)", fill: "none" }}>
          {RINGS.map((level) => (
            <polygon key={level} points={polygon({ surgeCapacity: level, investmentQuality: level, americaScore: level, adversaryExposure: level })} />
          ))}
          {ORDER.map((_, i) => {
            const p = point(100, i);
            return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} />;
          })}
        </g>

        <polygon
          points={polygon(tierAverage)}
          style={{ fill: "none", stroke: "var(--color-secondary)" }}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        <polygon
          points={polygon(scores)}
          style={{ fill: "var(--color-old-glory)", stroke: "var(--color-navy)" }}
          fillOpacity={0.16}
          strokeWidth={2}
        />

        {ORDER.map((key, i) => {
          const p = point(scores[key], i);
          const lp = point(112, i);
          return (
            <g key={key}>
              <circle cx={p.x} cy={p.y} r={3.5} style={{ fill: "var(--color-navy)" }} />
              <text
                x={CENTER + ((LABEL_R / MAX_R) * (lp.x - CENTER))}
                y={CENTER + ((LABEL_R / MAX_R) * (lp.y - CENTER))}
                textAnchor={labelAnchor(i)}
                dy={labelDy(i)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontVariantNumeric: "tabular-nums",
                  fill: "var(--color-ink)",
                }}
              >
                {SHORT[key]} {scores[key]}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center gap-5 font-mono text-[10px] tracking-[0.08em] text-muted">
        <span className="flex items-center gap-[6px]">
          <span className="inline-block h-[2px] w-[14px]" style={{ background: "var(--color-navy)" }} />
          THIS COMPANY
        </span>
        <span className="flex items-center gap-[6px]">
          <span
            className="inline-block h-0 w-[14px] border-t-[1.5px]"
            style={{ borderColor: "var(--color-secondary)", borderStyle: "dashed" }}
          />
          TIER AVERAGE
        </span>
      </div>
    </div>
  );
}
