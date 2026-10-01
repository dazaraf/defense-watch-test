import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1160px] flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-10">
        <div className="font-mono text-[11px] tracking-[0.18em] text-old-glory">
          ERROR 404
        </div>
        <h1 className="mt-3 font-display text-[48px] font-bold leading-[1.05] tracking-[-0.01em] text-navy sm:text-[64px]">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-[14px] leading-relaxed text-secondary">
          The page you&rsquo;re looking for doesn&rsquo;t exist, or has moved. Check the URL, or
          head back to the index.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <Link
            href="/"
            className="bg-old-glory px-6 py-3 font-display text-[13px] font-semibold text-white transition-colors hover:bg-old-glory-hover"
          >
            Back to home
          </Link>
          <Link
            href="/rankings"
            className="font-mono text-[11px] tracking-[0.1em] text-secondary hover:text-old-glory"
          >
            VIEW RANKINGS →
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
