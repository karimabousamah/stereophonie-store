"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_MFA_COOKIE,
  ADMIN_MFA_TTL_SECONDS,
  ADMIN_OTP_CHALLENGE_COOKIE,
  ADMIN_OTP_TTL_SECONDS,
  createAdminOtpChallenge,
  createAdminVerification,
  verifyAdminOtpChallenge,
} from "@/lib/admin-security/otp";
import { sendAdminLoginOtp } from "@/lib/email/send-admin-login-otp";
import { createClient } from "@/lib/supabase/server";

function loginError(
  message: string,
  step?: "otp",
): never {
  const suffix =
    step === "otp" ? "&step=otp" : "";

  redirect(
    `/admin/login?error=${encodeURIComponent(
      message,
    )}${suffix}`,
  );
}

function secureCookie() {
  return process.env.NODE_ENV === "production";
}

export async function login(
  formData: FormData,
) {
  const email = String(
    formData.get("email") ?? "",
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? "",
  );

  if (!email || !password) {
    loginError(
      "Enter your email address and password.",
    );
  }

  const supabase = await createClient();

  const {
    data: loginData,
    error: loginErrorResult,
  } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (loginErrorResult) {
    loginError(
      "The email address or password is incorrect.",
    );
  }

  const userId = loginData.user?.id;

  if (!userId) {
    loginError(
      "The administrator session could not be created.",
    );
  }

  const {
    data: administrator,
    error: administratorError,
  } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (
    administratorError ||
    !administrator ||
    !administrator.is_active
  ) {
    await supabase.auth.signOut();

    loginError(
      "This account does not have active administrator access.",
    );
  }

  const {
    code,
    token,
  } = createAdminOtpChallenge(
    userId,
    email,
  );

  const delivery =
    await sendAdminLoginOtp(
      email,
      code,
    );

  if (!delivery.success) {
    await supabase.auth.signOut();

    loginError(
      delivery.message ||
        "The administrator verification code could not be sent.",
    );
  }

  const cookieStore = await cookies();

  cookieStore.delete(
    ADMIN_MFA_COOKIE,
  );

  cookieStore.set(
    ADMIN_OTP_CHALLENGE_COOKIE,
    token,
    {
      httpOnly: true,
      secure: secureCookie(),
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_OTP_TTL_SECONDS,
    },
  );

  redirect("/admin/login?step=otp");
}

export async function verifyAdminOtp(
  formData: FormData,
) {
  const code = String(
    formData.get("code") ?? "",
  )
    .replace(/\D/g, "")
    .slice(0, 6);

  if (code.length !== 6) {
    loginError(
      "Enter the complete six-digit verification code.",
      "otp",
    );
  }

  const cookieStore = await cookies();

  const result =
    verifyAdminOtpChallenge(
      cookieStore.get(
        ADMIN_OTP_CHALLENGE_COOKIE,
      )?.value,
      code,
    );

  if (!result.ok) {
    if (
      result.reason === "incorrect" &&
      result.token
    ) {
      cookieStore.set(
        ADMIN_OTP_CHALLENGE_COOKIE,
        result.token,
        {
          httpOnly: true,
          secure: secureCookie(),
          sameSite: "lax",
          path: "/",
          maxAge: ADMIN_OTP_TTL_SECONDS,
        },
      );

      loginError(
        `Incorrect verification code. ${result.attemptsRemaining} attempt${
          result.attemptsRemaining === 1
            ? ""
            : "s"
        } remaining.`,
        "otp",
      );
    }

    cookieStore.delete(
      ADMIN_OTP_CHALLENGE_COOKIE,
    );

    loginError(
      result.reason === "expired"
        ? "This verification code expired. Sign in again to receive a new code."
        : "The verification session is no longer valid. Sign in again.",
    );
  }

  const supabase = await createClient();

  const {
    data: userResult,
  } = await supabase.auth.getUser();

  if (
    !userResult.user ||
    userResult.user.id !==
      result.challenge.userId
  ) {
    cookieStore.delete(
      ADMIN_OTP_CHALLENGE_COOKIE,
    );

    loginError(
      "Your administrator session expired. Sign in again.",
    );
  }

  const {
    data: administrator,
  } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq(
      "user_id",
      result.challenge.userId,
    )
    .maybeSingle();

  if (
    !administrator ||
    !administrator.is_active
  ) {
    await supabase.auth.signOut();

    loginError(
      "This administrator account is no longer active.",
    );
  }

  cookieStore.delete(
    ADMIN_OTP_CHALLENGE_COOKIE,
  );

  cookieStore.set(
    ADMIN_MFA_COOKIE,
    createAdminVerification(
      result.challenge.userId,
    ),
    {
      httpOnly: true,
      secure: secureCookie(),
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_MFA_TTL_SECONDS,
    },
  );

  redirect("/admin");
}
