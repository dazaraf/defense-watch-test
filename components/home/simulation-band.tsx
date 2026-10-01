"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PillarReveal } from "./pillar-reveal";

export function SimulationBand() {
  const router = useRouter();

  // The simulation route pulls ~2.4MB of three.js, so prefetch only on
  // intent (hover/focus) instead of taxing every homepage load with it.
  function prefetchSimulation() {
    router.prefetch("/simulation");
  }

  return (
    <section className="relative isolate flex min-h-dvh items-center overflow-hidden border-t border-card-border bg-paper text-navy lg:justify-end">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <PillarReveal
          image="/images/pillars/american-flag.webp"
          title="American flag"
          bg="F7F8FA"
          rawColor
          cover
          fit={1.02}
        />
      </div>
      <div className="pointer-events-none px-6 py-20 lg:px-12">
        <div className="inline-block max-w-[520px] border border-card-border bg-white px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="mb-5 max-w-[480px] font-numeral text-3xl leading-[1.12] text-navy lg:text-[40px]">
            Stress-test the arsenal before the adversary does.
          </h2>
          <p className="mb-9 max-w-[480px] text-base leading-relaxed text-secondary">
            Six war scenarios, from a Taiwan Strait shock to a two-front multi-theater fight,
            drain real munition inventories against surge-rated production and show which
            lines hold.
          </p>
          <Link
            href="/simulation"
            prefetch={false}
            onMouseEnter={prefetchSimulation}
            onFocus={prefetchSimulation}
            className="pointer-events-auto inline-block bg-old-glory px-[30px] py-[15px] text-[15px] font-semibold text-white transition-colors hover:bg-old-glory/90"
          >
            Run the Simulation
          </Link>
        </div>
      </div>
    </section>
  );
}
