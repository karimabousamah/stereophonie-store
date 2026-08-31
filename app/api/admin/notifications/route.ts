import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type IdRow = {
  id: string;
};

function ids(rows: IdRow[] | null) {
  return (rows ?? []).map((row) => String(row.id));
}

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
    supabase.from("orders").select("id").eq("status", "pending"),

    supabase.from("products").select("id").eq("status", "draft"),

    supabase
      .from("product_variants")
      .select("id")
      .in("availability_status", ["low_stock", "out_of_stock"]),

    supabase.from("stock_alerts").select("id").eq("status", "pending"),
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

  const itemIds = {
    pendingOrders: ids(pendingOrdersResult.data as IdRow[] | null),

    draftProducts: ids(draftProductsResult.data as IdRow[] | null),

    lowStockVariants: ids(lowStockVariantsResult.data as IdRow[] | null),

    pendingStockAlerts: ids(pendingStockAlertsResult.data as IdRow[] | null),
  };

  const counts = {
    pendingOrders: itemIds.pendingOrders.length,
    draftProducts: itemIds.draftProducts.length,
    lowStockVariants: itemIds.lowStockVariants.length,
    pendingStockAlerts: itemIds.pendingStockAlerts.length,
  };

  return NextResponse.json(
    {
      success: true,

      counts,

      itemIds,

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
