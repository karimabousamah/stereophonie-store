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

  const isPasswordRecovery =
    next === "/account/reset-password";

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
    const errorDestination = isPasswordRecovery
      ? `/account?mode=forgot&error=${encodeURIComponent(
          "The password reset link has expired or is invalid. Request a new one.",
        )}`
      : `/account?mode=login&error=${encodeURIComponent(
          "The confirmation link has expired or is invalid.",
        )}`;

    return NextResponse.redirect(
      new URL(errorDestination, requestUrl.origin),
    );
  }

  if (isPasswordRecovery) {
    const response = NextResponse.redirect(
      new URL("/account/reset-password", requestUrl.origin),
    );

    response.cookies.set(
      "stereophonie-password-recovery",
      "active",
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      },
    );

    return response;
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
