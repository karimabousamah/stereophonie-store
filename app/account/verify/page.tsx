import { redirect } from "next/navigation";

import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import VerificationForm from "./verification-form";

type VerifyPageProps = {
  searchParams: Promise<{
    email?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function VerifyPage({
  searchParams,
}: VerifyPageProps) {
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
    <>
      <V3Header />

      <main className="st-account-verification">
        <div className="st-account-verification__ambient st-account-verification__ambient--one" />
        <div className="st-account-verification__ambient st-account-verification__ambient--two" />

        <section className="st-account-verification__stage">
          <VerificationForm
            email={email}
            error={params.error}
            message={params.message}
          />
        </section>
      </main>

      <V3Footer />
    </>
  );
}
