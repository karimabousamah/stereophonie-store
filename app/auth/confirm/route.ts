import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  const tokenHash = requestUrl.searchParams.get("token_hash");

  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  const requestedNext = requestUrl.searchParams.get("next");

  const next = requestedNext?.startsWith("/") ? requestedNext : "/account";

  const supabase = await createClient();

  let confirmationError: Error | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    confirmationError = error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    confirmationError = error;
  } else {
    confirmationError = new Error("The confirmation link is incomplete.");
  }

  if (confirmationError) {
    return NextResponse.redirect(
      new URL(
        `/account?mode=login&error=${encodeURIComponent(
          "The confirmation link has expired or is invalid.",
        )}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      `${next}?message=${encodeURIComponent(
        "Your email has been confirmed successfully.",
      )}`,
      requestUrl.origin,
    ),
  );
}
