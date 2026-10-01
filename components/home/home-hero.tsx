/**
 * Full-bleed video hero; the fixed SiteHeader floats above it. Two encodes are
 * served via <source media> so phones on cellular don't pull the desktop
 * bitrate — the browser picks before it starts buffering.
 */
export function HomeHero() {
  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0a0e18]">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="/video/hero-poster.jpg"
      >
        <source src="/video/hero-mobile.mp4" media="(max-width: 767px)" type="video/mp4" />
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,14,24,0.35) 0%, rgba(10,14,24,0.15) 40%, rgba(10,14,24,0.55) 100%)",
        }}
      />

      <h1 className="animate-fade-in-up relative max-w-[1100px] px-8 text-center font-display text-[clamp(2.75rem,5.4vw,4.875rem)] leading-[1.06] font-bold tracking-[-0.015em] text-white">
        Manufacturing Readiness <br className="hidden md:inline" />
        for Every War Scenario
      </h1>
    </section>
  );
}
