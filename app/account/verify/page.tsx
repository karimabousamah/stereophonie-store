import Link from "next/link";
import { redirect } from "next/navigation";

import VerificationForm from "./verification-form";

type VerifyPageProps = {
  searchParams: Promise<{
    email?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;

  const email = params.email?.trim().toLowerCase();

  if (!email) {
    redirect(
      `/account?mode=register&error=${encodeURIComponent(
        "Create your customer account before entering a verification code.",
      )}`,
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f2ee] text-black">
      <header className="border-b border-black/10">
        <div className="mx-auto grid max-w-[1380px] grid-cols-3 items-center px-5 py-6 sm:px-8 lg:px-12">
          <Link
            href="/account?mode=register"
            className="justify-self-start bg-transparent text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 shadow-none transition hover:text-black"
          >
            ← Back
          </Link>

          <Link
            href="/"
            className="justify-self-center bg-transparent text-center shadow-none"
          >
            <span className="block text-lg font-semibold uppercase tracking-[0.32em]">
              Stereophonie
            </span>

            <span className="mt-1 block text-[7px] uppercase tracking-[0.34em] text-neutral-400">
              Electronics & Technology
            </span>
          </Link>

          <span className="justify-self-end text-[8px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Verification
          </span>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-91px)] max-w-[1380px] items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full max-w-[1080px] overflow-hidden border border-black/10 bg-white shadow-[0_35px_100px_rgba(0,0,0,0.08)] lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="hidden bg-[#0b0b0b] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-white/35">
                Final security step
              </p>

              <h1 className="mt-7 text-5xl font-medium uppercase leading-[0.92] tracking-[-0.05em]">
                Confirm
                <br />
                it&apos;s you.
              </h1>

              <p className="mt-7 max-w-sm text-sm leading-7 text-white/45">
                Enter the private verification code sent to your email to
                activate your Stereophonie customer account.
              </p>
            </div>

            <p className="border-t border-white/10 pt-7 text-[9px] uppercase tracking-[0.18em] text-white/30">
              One-time secure verification
            </p>
          </aside>

          <div className="flex items-center p-7 sm:p-12 lg:p-16">
            <VerificationForm
              email={email}
              error={params.error}
              message={params.message}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
