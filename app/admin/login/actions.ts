"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function loginError(message: string): never {
  redirect(`/admin/login?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    loginError("Enter your email address and password.");
  }

  const supabase = await createClient();

  const { data: loginData, error: loginErrorResult } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (loginErrorResult) {
    loginError(loginErrorResult.message);
  }

  const userId = loginData.user?.id;

  if (!userId) {
    loginError(
      "The account was authenticated, but the user session could not be created.",
    );
  }

  const { data: administrator, error: administratorError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (administratorError || !administrator || !administrator.is_active) {
    await supabase.auth.signOut();

    loginError("This account does not have active administrator access.");
  }

  redirect("/admin");
}
