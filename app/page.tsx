import { HomeHero } from "@/components/home/home-hero";
import { Methodology } from "@/components/home/methodology";
import { SimulationBand } from "@/components/home/simulation-band";
import { Statement } from "@/components/home/statement";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function Home() {
  return (
    <>
      <SiteHeader variant="hero" />

      <main className="flex flex-1 flex-col">
        <HomeHero />
        <Statement />
        <Methodology />
        <SimulationBand />
      </main>

      <SiteFooter />
    </>
  );
}
