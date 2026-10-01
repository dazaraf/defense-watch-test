"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/rankings", label: "Rankings" },
  { href: "/simulation", label: "Simulation" },
] as const;

type SimulationControls = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

/**
 * Shared header for every page: a compact light bar with the wordmark and the
 * Home / Rankings / Simulation nav, the current page shown filled. It is 55px
 * tall on every page — terminal.css lays the simulation theater out against
 * that height. `variant="hero"` fixes it to the top of the homepage's
 * full-bleed hero; the default variant sits in normal document flow.
 */
export function SiteHeader({
  variant = "default",
  active,
  simulationControls,
}: {
  variant?: "default" | "hero";
  active?: "rankings" | "simulation";
  simulationControls?: SimulationControls;
}) {
  const isHero = variant === "hero";
  const pathname = usePathname();
  const router = useRouter();
  const transitionTimer = useRef<number | null>(null);
  const [enteringSimulation, setEnteringSimulation] = useState(false);

  useEffect(() => {
    return () => {
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current);
      }
    };
  }, []);

  // The simulation route pulls ~2.4MB of three.js, so prefetch only on
  // intent (hover/focus) instead of taxing every page load with it. A hover
  // precedes a click by enough time to warm the cache for the transition.
  function prefetchSimulation() {
    router.prefetch("/simulation");
  }

  function enterSimulation(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !isHero ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (enteringSimulation) return;
    setEnteringSimulation(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    transitionTimer.current = window.setTimeout(
      () => router.push("/simulation"),
      reducedMotion ? 180 : 680,
    );
  }

  const isActive = (href: string) => {
    if (href === "/simulation" && active === "simulation") return true;
    if (href === "/rankings" && active === "rankings") return true;
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className={`h-[55px] border-t-4 border-t-old-glory border-b border-b-navy/12 bg-white ${
        isHero ? "fixed inset-x-0 top-0 z-50" : ""
      }`}
    >
      <div className="flex h-[50px] flex-nowrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Defense Watch home" className="flex shrink-0 items-center gap-2">
          <Image src="/brand/eagle.png" alt="" width={815} height={590} priority className="h-[34px] w-auto" />
          <Image
            src="/brand/wordmark.png"
            alt="Defense Watch"
            width={1008}
            height={183}
            priority
            className="hidden h-[22px] w-auto min-[400px]:block"
          />
        </Link>
        <nav className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.href === "/simulation" ? false : undefined}
              onClick={link.href === "/simulation" ? enterSimulation : undefined}
              onMouseEnter={link.href === "/simulation" ? prefetchSimulation : undefined}
              onFocus={link.href === "/simulation" ? prefetchSimulation : undefined}
              className={`whitespace-nowrap border px-2.5 py-2 text-[12px] font-semibold transition-colors sm:px-3 ${
                isActive(link.href)
                  ? "border-navy bg-navy text-white"
                  : "border-navy/40 text-navy hover:border-navy hover:bg-navy hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {simulationControls && (
            <button
              type="button"
              onClick={simulationControls.onToggleTheme}
              className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center border border-navy/40 p-0 font-semibold text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
              aria-label={`Switch to ${simulationControls.theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${simulationControls.theme === "dark" ? "light" : "dark"} mode`}
            >
              {simulationControls.theme === "dark" ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4 fill-none stroke-current"
                  strokeWidth="1.5"
                >
                  <circle cx="10" cy="10" r="3" />
                  <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6 16 16M16 4l-1.4 1.4M5.4 14.6 4 16" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4 fill-none stroke-current"
                  strokeWidth="1.5"
                >
                  <path d="M16.7 12.5A7 7 0 0 1 7.5 3.3 7 7 0 1 0 16.7 12.5Z" />
                </svg>
              )}
            </button>
          )}
        </nav>
      </div>
      {enteringSimulation && (
        <div
          className="simulation-entry-overlay"
          role="status"
          aria-label="Opening Defense Watch simulation"
        >
          <div className="simulation-entry-lockup">
            <strong>Defense Watch</strong>
            <span className="simulation-entry-track" aria-hidden="true">
              <i />
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
