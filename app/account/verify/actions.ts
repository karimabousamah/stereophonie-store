"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function cleanEmail(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function verificationRedirect(
  email: string,
  message: string,
  type: "message" | "error",
): never {
  redirect(
    `/account/verify?email=${encodeURIComponent(
      email,
    )}&${type}=${encodeURIComponent(message)}`,
  );
}

export async function verifyCustomerCode(formData: FormData) {
  const email = cleanEmail(formData.get("email"));

  const code = String(formData.get("code") ?? "")
    .replace(/\D/g, "")
    .trim();

  if (!email) {
    redirect(
      `/account?mode=register&error=${encodeURIComponent(
        "Your email address is missing. Please create the account again.",
      )}`,
    );
  }

  if (!/^\d{6}$/.test(code)) {
    verificationRedirect(
      email,
      "Enter the complete six-digit verification code.",
      "error",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "signup",
  });

  if (error) {
    verificationRedirect(
      email,
      "The verification code is incorrect or has expired. Check the email carefully or request a new code.",
      "error",
    );
  }

  redirect("/?account=verified");
}

export async function resendCustomerCode(formData: FormData) {
  const email = cleanEmail(formData.get("email"));

  if (!email) {
    redirect(
      `/account?mode=register&error=${encodeURIComponent(
        "Enter your email address and create the account again.",
      )}`,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    verificationRedirect(
      email,
      "A new verification code could not be sent yet. Wait briefly and try again.",
      "error",
    );
  }

  verificationRedirect(
    email,
    "A new six-digit verification code was sent to your email address.",
    "message",
  );
}
