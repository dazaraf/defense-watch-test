"use client";

import { useState } from "react";

const STOPWORDS = new Set([
  "the",
  "of",
  "and",
  "inc",
  "llc",
  "corp",
  "corporation",
  "technologies",
  "industries",
  "systems",
  "group",
  "co",
  "defense",
  "space",
  "security",
  "us",
  "operations",
]);

const PALETTE = ["bg-navy", "bg-old-glory", "bg-success-green", "bg-score-mid", "bg-pillar-a"];

function initials(name: string): string {
  const clean = name.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s]/g, " ");
  const words = clean.split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const pick = (significant.length ? significant : words).slice(0, 2);
  const letters = pick.map((w) => w[0]?.toUpperCase() ?? "").join("");
  return letters || name.slice(0, 2).toUpperCase();
}

function paletteClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function MonogramBadge({ name, height }: { name: string; height: number }) {
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded font-display font-bold text-white ${paletteClass(name)}`}
      style={{ width: height, height, fontSize: height * 0.4 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

// `src` is resolved server-side at build time (lib/data/companies.ts), so the
// browser fetches the real file straight from the server-rendered HTML — no
// hydration round-trip, no probing 404s. The onError monogram fallback only
// covers a file that exists but fails to decode. These are wide wordmark
// logos, not square icon marks, so sizing is by a fixed height with the width
// following the logo's own aspect ratio (capped so an unusually wide logo
// can't dominate the row).
export function CompanyLogo({
  name,
  src,
  height = 32,
  width,
}: {
  name: string;
  src: string | null;
  height?: number;
  // Fixed slot width, so a row of logos with different aspect ratios still
  // leaves whatever follows (e.g. the company name) starting at the same x
  // position. Omit to size the wrapper to the logo's own rendered width.
  width?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <MonogramBadge name={name} height={height} />;
  }

  const imgHeight = height * 0.6;
  const maxWidth = width ?? height * 3.4;

  return (
    <span
      className="inline-flex flex-none items-center justify-center"
      style={{ height, width }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="object-contain"
        style={{ height: imgHeight, width: "auto", maxWidth }}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
