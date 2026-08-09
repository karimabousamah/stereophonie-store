import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import DashboardClient from "./dashboard-client";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login?error=This%20account%20is%20not%20authorized");
  }

  const [
    liveProductsResult,
    draftProductsResult,
    pendingOrdersResult,
    completedOrdersResult,
    paidOrdersResult,
    lowStockVariantsResult,
    pendingStockAlertsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "published"),

    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "draft"),

    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "completed"),

    supabase
      .from("orders")
      .select("total")
      .eq("payment_status", "paid")
      .neq("status", "cancelled"),

    supabase
      .from("product_variants")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("availability_status", ["low_stock", "out_of_stock"]),

    supabase
      .from("stock_alerts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),
  ]);

  const liveProducts = liveProductsResult.count ?? 0;

  const draftProducts = draftProductsResult.count ?? 0;

  const pendingOrders = pendingOrdersResult.count ?? 0;

  const completedOrders = completedOrdersResult.count ?? 0;

  const lowStockVariants = lowStockVariantsResult.count ?? 0;

  const pendingStockAlerts = pendingStockAlertsResult.count ?? 0;

  const revenue = (paidOrdersResult.data ?? []).reduce((total, order) => {
    return total + Number(order.total ?? 0);
  }, 0);

  return (
    <DashboardClient
      role={admin.role}
      statistics={{
        liveProducts,
        draftProducts,
        pendingOrders,
        completedOrders,
        revenue,
        lowStockVariants,
        pendingStockAlerts,
      }}
    />
  );
}
