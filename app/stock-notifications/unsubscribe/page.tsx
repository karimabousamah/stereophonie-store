import Link from "next/link";

import {
  BellOff,
  CheckCircle2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import StoreFooter from "@/components/storefront/store-footer";

import StoreHeader from "@/components/storefront/store-header";

import { unsubscribeStockNotifications } from "./actions";

type UnsubscribePageProps = {
  searchParams: Promise<{
    token?: string;

    status?: string;
  }>;
};

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const params = await searchParams;

  const token = typeof params.token === "string" ? params.token.trim() : "";

  const status = typeof params.status === "string" ? params.status : "";

  const success = status === "success";

  const failed = status === "error" || status === "invalid";

  return (
    <main className="min-h-screen bg-[#f5f4f1] text-black">
      <StoreHeader />

      <section className="mx-auto flex min-h-[680px] max-w-[1600px] items-center justify-center px-5 py-20 sm:px-8 lg:px-12">
        <div className="w-full max-w-xl border border-black/10 bg-white p-7 shadow-[0_30px_100px_rgba(0,0,0,0.08)] sm:p-12">
          {success ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
                Preferences updated
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                You are unsubscribed
              </h1>

              <p className="mt-5 text-sm leading-7 text-black/55">
                You will no longer receive Stereophonie wishlist, low-stock,
                out-of-stock, or restock notification emails. Your saved
                wishlist products remain available.
              </p>
            </>
          ) : failed ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center bg-red-50 text-red-700">
                <TriangleAlert className="h-6 w-6" />
              </div>

              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
                Link unavailable
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                We could not update your preferences
              </h1>

              <p className="mt-5 text-sm leading-7 text-black/55">
                This unsubscribe link is invalid or no longer available. No
                changes were made to your notification preferences.
              </p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center bg-black text-white">
                <BellOff className="h-6 w-6" />
              </div>

              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
                Email preferences
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                Stop stock notifications?
              </h1>

              <p className="mt-5 text-sm leading-7 text-black/55">
                This will stop wishlist, low-stock, out-of-stock, and restock
                emails from Stereophonie. Products already saved in your
                wishlist will not be removed.
              </p>

              {token ? (
                <form
                  action={unsubscribeStockNotifications}

                  className="mt-8"
                >
                  <input
                    type="hidden"

                    name="token"

                    value={token}
                  />

                  <button
                    type="submit"

                    className="flex min-h-14 w-full items-center justify-center bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#242424]"
                  >
                    Unsubscribe from stock emails
                  </button>
                </form>
              ) : (
                <div className="mt-8 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  This unsubscribe link is incomplete.
                </div>
              )}

              <div className="mt-6 flex items-start gap-3 border-t border-black/10 pt-6 text-xs leading-5 text-black/40">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

                <p>
                  This secure link only changes notification preferences. It
                  does not provide access to your account.
                </p>
              </div>
            </>
          )}

          <Link
            href="/shop"

            className="mt-8 inline-flex min-h-12 w-full items-center justify-center border border-black/15 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition hover:border-black"
          >
            Return to shop
          </Link>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
