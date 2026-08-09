"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getAlertId(formData: FormData) {
  const value = formData.get("alertId");

  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error("The stock alert is invalid.");
  }

  return value;
}

async function getAdminClient() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login");
  }

  return supabase;
}

export async function markStockAlertNotified(formData: FormData) {
  const alertId = getAlertId(formData);

  const supabase = await getAdminClient();

  const { error } = await supabase
    .from("stock_alerts")
    .update({
      status: "notified",
      notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) {
    throw new Error(`Stock alert could not be updated: ${error.message}`);
  }

  revalidatePath("/admin/stock-alerts");
}

export async function cancelStockAlert(formData: FormData) {
  const alertId = getAlertId(formData);

  const supabase = await getAdminClient();

  const { error } = await supabase
    .from("stock_alerts")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) {
    throw new Error(`Stock alert could not be cancelled: ${error.message}`);
  }

  revalidatePath("/admin/stock-alerts");
}

export async function reopenStockAlert(formData: FormData) {
  const alertId = getAlertId(formData);

  const supabase = await getAdminClient();

  const { error } = await supabase
    .from("stock_alerts")
    .update({
      status: "pending",
      notified_at: null,
      requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) {
    throw new Error(`Stock alert could not be reopened: ${error.message}`);
  }

  revalidatePath("/admin/stock-alerts");
}

export async function deleteStockAlert(formData: FormData) {
  const alertId = getAlertId(formData);

  const supabase = await getAdminClient();

  const { error } = await supabase
    .from("stock_alerts")
    .delete()
    .eq("id", alertId);

  if (error) {
    throw new Error(`Stock alert could not be deleted: ${error.message}`);
  }

  revalidatePath("/admin/stock-alerts");
}
