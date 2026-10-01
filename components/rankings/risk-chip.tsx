import type { RiskLevel } from "@/lib/data/companies";

const SEVERITY_LABEL: Record<RiskLevel, string> = {
  clean: "Low Exposure",
  moderate: "Moderate Exposure",
  severe: "Severe Exposure",
  critical: "Severe Exposure",
};

const SEVERITY_STYLE: Record<RiskLevel, string> = {
  clean: "border-navy bg-white text-navy",
  moderate: "border-navy bg-navy text-white",
  severe: "border-old-glory bg-old-glory text-white",
  critical: "border-old-glory-hover bg-old-glory-hover text-white",
};

export function RiskChip({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full border-2 px-[11px] py-[3px] font-sans text-[11px] font-bold ${SEVERITY_STYLE[level]}`}
    >
      {SEVERITY_LABEL[level]}
    </span>
  );
}
