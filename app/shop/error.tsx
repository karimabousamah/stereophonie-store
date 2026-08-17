"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import V2Footer from "@/components/stereophonie-v2/layout/v2-footer";
import V2Header from "@/components/stereophonie-v2/layout/v2-header";

export default function ShopError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="st-v2 st-v2-shop">
      <V2Header />

      <section className="flex min-h-[70vh] items-center bg-[#f5f5f2] px-5 py-16 sm:px-8">
        <div className="mx-auto w-full max-w-[900px] border border-black/15 bg-white">
          <div className="border-b border-black/10 bg-black px-6 py-4 text-white">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Catalog system / error
            </p>
          </div>

          <div className="px-6 py-14 text-center sm:px-12">
            <div className="mx-auto grid h-16 w-16 place-items-center border border-red-600/25 bg-red-600/[0.05]">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>

            <h1 className="mt-7 text-3xl font-semibold uppercase tracking-[-0.04em] sm:text-5xl">
              Catalog temporarily unavailable.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-black/50">
              The product database could not be loaded correctly. Try loading
              the catalog again.
            </p>

            <button
              type="button"
              onClick={reset}
              className="mx-auto mt-8 flex min-h-13 items-center justify-center gap-3 border border-black bg-black px-7 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-black"
            >
              <RefreshCw className="h-4 w-4" />
              Retry catalog
            </button>
          </div>
        </div>
      </section>

      <V2Footer />
    </main>
  );
}
