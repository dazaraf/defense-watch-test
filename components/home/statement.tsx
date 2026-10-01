"use client";

import { useEffect, useRef, useState } from "react";

const STATEMENT =
  "Defense Watch scores America's defense manufacturers on their ability to surge, withstand disruption, and deliver under every war scenario.";

const WORDS = STATEMENT.split(" ");

/**
 * Scroll-linked word reveal: each word turns from mist to navy as the section
 * moves up through the viewport, and back to mist when scrolling in reverse —
 * the text animates on and off screen in both directions.
 */
export function Statement() {
  const sectionRef = useRef<HTMLElement>(null);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let frame = 0;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame = requestAnimationFrame(() => setLit(WORDS.length));
      return () => cancelAnimationFrame(frame);
    }

    function update() {
      frame = 0;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the section top enters at 90% of the viewport, 1 once it has
      // scrolled up past the top — spread over a full viewport height so the
      // reveal is still mid-flight once the paragraph is centered on screen.
      const progress = (vh * 0.9 - rect.top) / vh;
      const clamped = Math.min(1, Math.max(0, progress));
      setLit(Math.round(clamped * WORDS.length));
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} className="bg-paper px-8 py-28 text-center lg:px-[120px] lg:py-40">
      <p className="mx-auto max-w-[1120px] font-numeral text-[clamp(1.75rem,3.75vw,3.375rem)] leading-[1.28] tracking-[-0.01em] text-balance">
        {WORDS.map((word, i) => (
          <span
            key={i}
            className={`transition-colors duration-300 ${i < lit ? "text-navy" : "text-mist"}`}
          >
            {word}
            {i < WORDS.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
    </section>
  );
}
