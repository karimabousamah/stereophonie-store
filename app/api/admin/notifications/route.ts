import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    return NextResponse.json(
      {
        success: false,
        message: "Administrator access required.",
      },
      {
        status: 403,
      },
    );
  }

  const [
    pendingOrdersResult,
    draftProductsResult,
    lowStockVariantsResult,
    pendingStockAlertsResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "draft"),

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

  const databaseError =
    pendingOrdersResult.error ||
    draftProductsResult.error ||
    lowStockVariantsResult.error ||
    pendingStockAlertsResult.error;

  if (databaseError) {
    console.error("Admin notification query failed:", databaseError);

    return NextResponse.json(
      {
        success: false,
        message: "Notifications could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }

  const counts = {
    pendingOrders: pendingOrdersResult.count ?? 0,

    draftProducts: draftProductsResult.count ?? 0,

    lowStockVariants: lowStockVariantsResult.count ?? 0,

    pendingStockAlerts: pendingStockAlertsResult.count ?? 0,
  };

  return NextResponse.json(
    {
      success: true,

      counts,

      total:
        counts.pendingOrders +
        counts.draftProducts +
        counts.lowStockVariants +
        counts.pendingStockAlerts,

      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
