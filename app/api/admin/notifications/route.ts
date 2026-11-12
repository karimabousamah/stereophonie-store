import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NotificationCategory =
  | "pendingOrders"
  | "draftProducts"
  | "lowStockVariants"
  | "pendingStockAlerts";

type NotificationTone =
  | "amber"
  | "red"
  | "blue"
  | "neutral";

type AdminNotification = {
  id: string;
  category: NotificationCategory;
  sourceId: string;
  title: string;
  description: string;
  href: string;
  tone: NotificationTone;
};

type PendingOrderRow = {
  id: string;
  order_number: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  total: number | null;
  created_at: string | null;
};

type DraftProductRow = {
  id: string;
  name: string;
  created_at: string | null;
};

type InventoryVariantRow = {
  id: string;
  product_id: string;
  size: string | null;
  sku: string | null;
  stock_quantity: number | null;
  availability_status: string;
};

type StockAlertRow = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  email: string;
  requested_at: string | null;
};

type ProductNameRow = {
  id: string;
  name: string;
};

function money(value: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

function safeName(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export async function GET() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

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

  const { data: admin, error: adminError } =
    await supabase
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
      .select(
        `
          id,
          order_number,
          customer_first_name,
          customer_last_name,
          total,
          created_at
        `,
      )
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("products")
      .select(
        `
          id,
          name,
          created_at
        `,
      )
      .eq("status", "draft")
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("product_variants")
      .select(
        `
          id,
          product_id,
          size,
          sku,
          stock_quantity,
          availability_status
        `,
      )
      .in(
        "availability_status",
        ["low_stock", "out_of_stock"],
      )
      .order("stock_quantity", {
        ascending: true,
      }),

    supabase
      .from("stock_alerts")
      .select(
        `
          id,
          product_id,
          variant_id,
          email,
          requested_at
        `,
      )
      .eq("status", "pending")
      .order("requested_at", {
        ascending: false,
      }),
  ]);

  const databaseError =
    pendingOrdersResult.error ||
    draftProductsResult.error ||
    lowStockVariantsResult.error ||
    pendingStockAlertsResult.error;

  if (databaseError) {
    console.error(
      "Admin notification query failed:",
      databaseError,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Notifications could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }

  const pendingOrders =
    (pendingOrdersResult.data ??
      []) as unknown as PendingOrderRow[];

  const draftProducts =
    (draftProductsResult.data ??
      []) as unknown as DraftProductRow[];

  const inventoryVariants =
    (lowStockVariantsResult.data ??
      []) as unknown as InventoryVariantRow[];

  const stockAlerts =
    (pendingStockAlertsResult.data ??
      []) as unknown as StockAlertRow[];

  /*
   * Resolve product names once for inventory warnings
   * and customer stock requests.
   */
  const productIds = Array.from(
    new Set(
      [
        ...inventoryVariants.map(
          (variant) => variant.product_id,
        ),
        ...stockAlerts
          .map((alert) => alert.product_id)
          .filter(
            (value): value is string =>
              typeof value === "string" &&
              value.length > 0,
          ),
      ].filter(Boolean),
    ),
  );

  let productNames: ProductNameRow[] = [];

  if (productIds.length > 0) {
    const productNamesResult = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);

    if (productNamesResult.error) {
      console.error(
        "Admin notification product lookup failed:",
        productNamesResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Notifications could not be loaded.",
        },
        {
          status: 500,
        },
      );
    }

    productNames =
      (productNamesResult.data ??
        []) as unknown as ProductNameRow[];
  }

  const productNameById = new Map(
    productNames.map((product) => [
      String(product.id),
      product.name,
    ]),
  );

  const variantById = new Map(
    inventoryVariants.map((variant) => [
      String(variant.id),
      variant,
    ]),
  );

  const notifications: AdminNotification[] = [];

  /*
   * ORDERS
   * Every pending order gets its own exact notification.
   */
  for (const order of pendingOrders) {
    const customerName = [
      safeName(order.customer_first_name),
      safeName(order.customer_last_name),
    ]
      .filter(Boolean)
      .join(" ");

    notifications.push({
      id: `pendingOrders:${order.id}`,
      category: "pendingOrders",
      sourceId: String(order.id),

      title: `Order ${order.order_number}`,

      description: [
        customerName || "Customer",
        money(order.total),
        "Pending confirmation",
      ].join(" • "),

      href: `/admin/orders/${order.id}`,

      tone: "amber",
    });
  }

  /*
   * INVENTORY
   * Every low/out-of-stock configuration points directly
   * to its product editor.
   */
  for (const variant of inventoryVariants) {
    const productName =
      productNameById.get(
        String(variant.product_id),
      ) ?? "Product";

    const availabilityLabel =
      variant.availability_status ===
      "out_of_stock"
        ? "Out of stock"
        : "Low stock";

    const details = [
      safeName(variant.size)
        ? `Size ${safeName(variant.size)}`
        : "",
      safeName(variant.sku)
        ? `SKU ${safeName(variant.sku)}`
        : "",
      `${Number(
        variant.stock_quantity ?? 0,
      )} available`,
    ].filter(Boolean);

    notifications.push({
      id: `lowStockVariants:${variant.id}`,
      category: "lowStockVariants",
      sourceId: String(variant.id),

      title:
        `${productName} — ${availabilityLabel}`,

      description: details.join(" • "),

      href:
        `/admin/products/${variant.product_id}`,

      tone: "red",
    });
  }

  /*
   * CUSTOMER STOCK REQUESTS
   * Route to the exact request row.
   */
  for (const alert of stockAlerts) {
    const productName =
      alert.product_id
        ? productNameById.get(
            String(alert.product_id),
          ) ?? "Product"
        : "Product";

    const variant =
      alert.variant_id
        ? variantById.get(
            String(alert.variant_id),
          )
        : null;

    notifications.push({
      id: `pendingStockAlerts:${alert.id}`,
      category: "pendingStockAlerts",
      sourceId: String(alert.id),

      title:
        `${productName} — Stock request`,

      description: [
        alert.email,
        variant?.size
          ? `Size ${variant.size}`
          : "",
      ]
        .filter(Boolean)
        .join(" • "),

      href:
        `/admin/stock-alerts?status=pending#alert-${alert.id}`,

      tone: "blue",
    });
  }

  /*
   * DRAFT PRODUCTS
   * Every draft points directly to the product editor.
   */
  for (const product of draftProducts) {
    notifications.push({
      id: `draftProducts:${product.id}`,
      category: "draftProducts",
      sourceId: String(product.id),

      title: `${product.name} — Draft`,

      description:
        "Draft product is hidden from the customer storefront.",

      href:
        `/admin/products/${product.id}`,

      tone: "neutral",
    });
  }

  const itemIds: Record<
    NotificationCategory,
    string[]
  > = {
    pendingOrders: pendingOrders.map(
      (order) => String(order.id),
    ),

    draftProducts: draftProducts.map(
      (product) => String(product.id),
    ),

    lowStockVariants: inventoryVariants.map(
      (variant) => String(variant.id),
    ),

    pendingStockAlerts: stockAlerts.map(
      (alert) => String(alert.id),
    ),
  };

  const counts = {
    pendingOrders:
      itemIds.pendingOrders.length,

    draftProducts:
      itemIds.draftProducts.length,

    lowStockVariants:
      itemIds.lowStockVariants.length,

    pendingStockAlerts:
      itemIds.pendingStockAlerts.length,
  };

  return NextResponse.json(
    {
      success: true,

      counts,

      itemIds,

      notifications,

      total: notifications.length,

      generatedAt:
        new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}
