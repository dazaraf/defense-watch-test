"use client";

// Bump this whenever particle-reveal.html changes — the iframe `src` string
// only changes (forcing a re-fetch instead of reusing whatever the browser
// already has loaded) when this does.
const ANIMATION_VERSION = 15;

/**
 * WebGL "sand particle reveal" for a pillar's illustration — the shared
 * particle-reveal.html renders whichever image the `image` prop points at,
 * so every pillar reuses one iframe'd animation instead of one file each.
 *
 * - `tint` (hex, no #): overrides the particle color's light end. Omit for
 *   the default cream.
 * - `bg` (hex, no #): the canvas's clear color and duotone dark end — match
 *   it to whatever section the reveal sits on (e.g. the paper background)
 *   so an opaque canvas still reads as part of the page. Omit for the
 *   default navy. True canvas transparency was tried for this and dropped —
 *   `alpha:true` + non-premultiplied blending is a known-flaky combination
 *   across browsers/GPUs; matching the clear color is the same trick the
 *   navy hover-boxes already use, just parameterized.
 * - `rawColor`: uses the source image's actual pixel color instead of the
 *   duotone remap — for multi-hue sources (e.g. a flag) where the duotone's
 *   single-color ramp would flatten distinct hues together.
 * - `fit`: fraction of the container the image scales to fill (default
 *   0.85, matching the hover-box look). Use closer to 1 for a full-bleed
 *   background instead of a centered box.
 * - `cover`: scale up until the image fully covers the container (may crop
 *   one axis) instead of fitting entirely inside it — for a section whose
 *   aspect ratio doesn't match the source image's, so there's no letterbox
 *   margin.
 */
export function PillarReveal({
  image,
  title,
  tint,
  bg,
  rawColor,
  fit,
  cover,
}: {
  image: string;
  title: string;
  tint?: string;
  bg?: string;
  rawColor?: boolean;
  fit?: number;
  cover?: boolean;
}) {
  const params = new URLSearchParams({ v: String(ANIMATION_VERSION), image });
  if (tint) params.set("tint", tint);
  if (bg) params.set("bg", bg);
  if (rawColor) params.set("rawcolor", "1");
  if (fit) params.set("fit", String(fit));
  if (cover) params.set("cover", "1");

  return (
    <iframe
      src={`/animations/particle-reveal.html?${params.toString()}`}
      title={`${title} — particle reveal`}
      className="block h-full w-full"
      style={{ border: "none" }}
      sandbox="allow-scripts allow-same-origin"
      loading="lazy"
    />
  );
}
