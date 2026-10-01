import { PILLARS } from "@/lib/data/scoring";
import { PillarReveal } from "./pillar-reveal";
import { ScrollReveal } from "./scroll-reveal";

const DISPLAY: Record<
  string,
  { title: string; blurb: string; accent: boolean; image?: string; tint?: string; large?: boolean }
> = {
  surgeCapacity: {
    title: "Surge Capacity",
    blurb:
      "Ability to multiply output under wartime demand. Measures production-line flexibility, spare tooling, and material stockpile depth. A high score means a facility can convert from peacetime to surge rates in weeks, not years.",
    accent: false,
    image: "/images/pillars/surge-capacity.webp",
  },
  americaScore: {
    title: "Domestic Contribution",
    blurb:
      "Share of production rooted on American soil. Weighs where components are actually manufactured, not just assembled, along with domestic job creation and facility footprint. Offshored subassemblies count against the score even when final assembly happens stateside.",
    accent: false,
    image: "/images/pillars/domestic-contribution.webp",
  },
  adversaryExposure: {
    title: "Adversary Exposure",
    blurb:
      "Supply-chain and ownership ties to hostile actors. Flags foreign ownership stakes, dependency on adversary-controlled inputs, and financing tied to sanctioned or state-linked entities. Even indirect exposure through a subcontractor's subcontractor counts against the score.",
    accent: true,
    image: "/images/pillars/adversary-exposure.webp",
    tint: "D19288",
    large: true,
  },
  investmentQuality: {
    title: "Investment Quality",
    blurb:
      "Capital discipline behind capacity expansion. Looks at how funding is structured, whether investment actually converts into deployed capacity, and how durable the ownership behind it is. Debt-fueled growth with no capacity to show for it scores lower than patient, disciplined capital.",
    accent: false,
    image: "/images/pillars/investment.webp",
    large: true,
  },
};

// Design order: cascades top-to-bottom, alternating left/right.
const ORDER = ["surgeCapacity", "americaScore", "adversaryExposure", "investmentQuality"] as const;

export function Methodology() {
  const pillars = ORDER.map((id) => {
    const meta = PILLARS.find((p) => p.id === id);
    if (!meta) throw new Error(`Missing pillar in scoring model: ${id}`);
    return { ...meta, ...DISPLAY[id], weight: Math.round(meta.primeWeight * 100) };
  });

  return (
    <ScrollReveal>
      <section className="bg-navy-scores px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div className="mb-16 text-center lg:mb-24">
          <h2 className="mx-auto font-numeral text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
            How Defense Watch Scores Defense Manufacturers
          </h2>
        </div>

        <div className="flex flex-col gap-24 sm:gap-32 lg:gap-40">
          {pillars.map((p, i) => {
            const alignRight = i % 2 === 1;
            const color = p.accent ? "text-old-glory" : "text-white";

            const text = (
              <div
                className={`flex flex-col ${
                  alignRight ? "sm:items-end sm:text-right" : "sm:items-start sm:text-left"
                }`}
              >
                <div className={`font-numeral text-6xl leading-none sm:text-7xl lg:text-8xl ${color}`}>
                  {p.weight}%
                </div>
                <div className={`mt-3 font-numeral text-xl sm:text-2xl lg:text-3xl ${color}`}>
                  {p.title}
                </div>
                <div
                  className={`mt-3 max-w-sm text-sm leading-relaxed sm:text-base ${
                    p.accent ? "text-[#f3c3cb]" : "text-white/70"
                  }`}
                >
                  {p.blurb}
                </div>
              </div>
            );

            if (!p.image) {
              return (
                <div
                  key={p.id}
                  className={`flex md:min-h-[300px] md:items-center ${
                    alignRight ? "justify-end" : "justify-start"
                  }`}
                >
                  {text}
                </div>
              );
            }

            const visual = (
              <div
                className={
                  p.large
                    ? "h-[520px] w-full sm:h-[600px] md:h-[700px] md:min-w-0 md:flex-1 lg:h-[840px]"
                    : "h-[440px] w-full sm:h-[500px] md:h-[560px] md:min-w-0 md:flex-1 lg:h-[680px]"
                }
              >
                <PillarReveal image={p.image} title={p.title} tint={p.tint} />
              </div>
            );

            return (
              <div
                key={p.id}
                className="flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-16"
              >
                {alignRight ? (
                  <>
                    {visual}
                    {text}
                  </>
                ) : (
                  <>
                    {text}
                    {visual}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </ScrollReveal>
  );
}
