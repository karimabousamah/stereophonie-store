import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import {
  V3Header,
} from "@/components/stereophonie-v3/layout/v3-header";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";

import ResetPasswordForm from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token_hash?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params =
    await searchParams;

  const tokenHash =
    params.token_hash?.trim() ?? "";

  if (!tokenHash) {
    redirect(
      `/account?mode=forgot&error=${encodeURIComponent(
        "Your password reset link is incomplete. Request a new reset link.",
      )}`,
    );
  }

  return (
    <>
      <V3Header />

      <main className="st-auth-clean st-auth-reset-password">
        <section className="st-auth-clean-stage">
          <div className="st-auth-clean-card">
            <div className="st-auth-clean-brand">
              <Link
                href="/"
                className="st-auth-clean-logo"
                aria-label="Stereophonie Store home"
              />

              <div className="st-auth-clean-security">
                <ShieldCheck />

                <span>
                  Secure account
                </span>
              </div>
            </div>

            <div className="st-auth-clean-heading">
              <span>
                My account
              </span>

              <h1>
                Choose a new password
              </h1>

              <p>
                Enter and confirm your new
                Stereophonie account password.
              </p>
            </div>

            {params.error ? (
              <div
                className="st-auth-clean-message is-error"
                role="alert"
              >
                <span>!</span>

                <p>
                  {params.error}
                </p>
              </div>
            ) : null}

            <ResetPasswordForm
              tokenHash={tokenHash}
            />

            <footer className="st-auth-clean-footer">
              <span>
                Remember your password?
              </span>

              <Link href="/account?mode=login">
                Sign in

                <ArrowRight />
              </Link>
            </footer>
          </div>
        </section>
      </main>

      <V3Footer />
    </>
  );
}
