"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminAccessResult = {
  ok: boolean;
  message: string;
  isAdmin?: boolean;
};

export async function setCustomerAdminAccess(
  targetUserId: string,
  makeAdmin: boolean,
): Promise<AdminAccessResult> {
  const normalizedTargetUserId =
    String(targetUserId ?? "").trim();

  if (!normalizedTargetUserId) {
    return {
      ok: false,
      message: "The selected account could not be identified.",
    };
  }

  /*
   * Authenticate the administrator making the change.
   */
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const currentUserId =
    claimsData?.claims?.sub;

  if (!currentUserId) {
    return {
      ok: false,
      message: "Your administrator session has expired.",
    };
  }

  const { data: currentAdmin, error: currentAdminError } =
    await supabase
      .from("admin_users")
      .select("user_id, role, is_active")
      .eq("user_id", currentUserId)
      .single();

  if (
    currentAdminError ||
    !currentAdmin ||
    !currentAdmin.is_active
  ) {
    return {
      ok: false,
      message: "You do not have permission to manage administrators.",
    };
  }

  /*
   * Never allow an administrator to remove their own access from
   * this screen. This prevents an accidental admin lockout.
   */
  if (
    currentUserId === normalizedTargetUserId &&
    !makeAdmin
  ) {
    return {
      ok: false,
      message: "You cannot remove your own administrator access.",
    };
  }

  const adminClient =
    createAdminClient();

  /*
   * Confirm that the selected account genuinely exists in Supabase Auth.
   */
  const {
    data: targetUserResponse,
    error: targetUserError,
  } =
    await adminClient.auth.admin.getUserById(
      normalizedTargetUserId,
    );

  if (
    targetUserError ||
    !targetUserResponse?.user
  ) {
    return {
      ok: false,
      message: "That customer account no longer exists.",
    };
  }

  if (makeAdmin) {
    /*
     * Existing inactive administrators are reactivated.
     * New administrators receive the normal "admin" role.
     */
    const { error } =
      await adminClient
        .from("admin_users")
        .upsert(
          {
            user_id:
              normalizedTargetUserId,
            role:
              "admin",
            is_active:
              true,
          },
          {
            onConflict:
              "user_id",
          },
        );

    if (error) {
      console.error(
        "Could not grant administrator access:",
        error,
      );

      return {
        ok: false,
        message:
          error.message ||
          "Administrator access could not be granted.",
      };
    }

    revalidatePath("/admin/customers");
    revalidatePath("/admin");

    return {
      ok: true,
      isAdmin: true,
      message: "Administrator access granted.",
    };
  }

  /*
   * Do not delete the admin row.
   *
   * Keeping the record inactive is safer and preserves the existing
   * administrative history while immediately removing dashboard access.
   */
  const { error } =
    await adminClient
      .from("admin_users")
      .update({
        is_active: false,
      })
      .eq(
        "user_id",
        normalizedTargetUserId,
      );

  if (error) {
    console.error(
      "Could not remove administrator access:",
      error,
    );

    return {
      ok: false,
      message:
        error.message ||
        "Administrator access could not be removed.",
    };
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin");

  return {
    ok: true,
    isAdmin: false,
    message: "Administrator access removed.",
  };
}
