"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function unsubscribeStockNotifications(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();

  if (!UUID_PATTERN.test(token)) {
    redirect("/stock-notifications/unsubscribe?status=invalid");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "unsubscribe_stock_notifications",

    {
      requested_token: token,
    },
  );

  if (error) {
    console.error(
      "Stock notification unsubscribe failed:",

      error,
    );

    redirect("/stock-notifications/unsubscribe?status=error");
  }

  redirect("/stock-notifications/unsubscribe?status=success");
}
