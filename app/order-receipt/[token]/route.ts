import "server-only";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildOrderReceiptPdf,
  type OrderReceiptItem,
} from "@/lib/email/order-receipt-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

type UnknownRow = Record<string, unknown>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export async function GET(_request: Request, context: RouteContext) {
  const { token: rawToken } = await context.params;
  const token = rawToken.trim();

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return new NextResponse("Receipt not found.", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  let admin;

  try {
    admin = createAdminClient();
  } catch (error) {
    console.error(
      "Receipt route could not initialize Supabase admin client:",
      error,
    );

    return new NextResponse("Receipt is temporarily unavailable.", {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  const { data: orderData, error: orderError } = await admin
    .from("orders")
    .select("*")
    .eq("receipt_token", token)
    .maybeSingle();

  if (orderError) {
    console.error("Secure receipt order lookup failed:", orderError.message);

    return new NextResponse("Receipt is temporarily unavailable.", {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (!orderData) {
    return new NextResponse("Receipt not found.", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  const order = orderData as UnknownRow;
  const orderId = clean(order.id);

  if (!orderId) {
    return new NextResponse("Receipt not found.", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  const { data: itemData, error: itemError } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemError) {
    console.error("Secure receipt item lookup failed:", itemError.message);

    return new NextResponse("Receipt is temporarily unavailable.", {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  const rows = (itemData ?? []) as UnknownRow[];

  const variantIds = Array.from(
    new Set(rows.map((row) => clean(row.variant_id)).filter(Boolean)),
  );

  const skuByVariantId = new Map<string, string>();

  if (variantIds.length > 0) {
    const { data: variants, error: variantsError } = await admin
      .from("product_variants")
      .select("id, sku, variant_name, size")
      .in("id", variantIds);

    if (variantsError) {
      console.error(
        "Secure receipt variant lookup failed:",
        variantsError.message,
      );
    } else {
      for (const variant of variants ?? []) {
        const row = variant as UnknownRow;
        const id = clean(row.id);

        if (id) {
          skuByVariantId.set(id, clean(row.sku));
        }
      }
    }
  }

  const items: OrderReceiptItem[] = rows.map((row) => {
    const variantId = clean(row.variant_id);

    return {
      name:
        clean(row.product_name) ||
        clean(row.name) ||
        clean(row.title) ||
        "Product",

      sku: variantId ? skuByVariantId.get(variantId) || null : null,

      configuration:
        clean(row.variant_name) ||
        clean(row.configuration) ||
        clean(row.size) ||
        null,

      quantity: Math.max(1, Math.trunc(numberValue(row.quantity))),

      unitPrice: Math.max(
        0,
        numberValue(row.unit_price ?? row.price ?? row.product_price),
      ),
    };
  });

  const fulfillmentMethod =
    clean(order.fulfillment_method) === "pickup" ? "pickup" : "delivery";

  const pdf = await buildOrderReceiptPdf({
    orderNumber: clean(order.order_number) || "Order",
    createdAt: clean(order.created_at) || null,

    fulfillmentMethod,

    paymentMethod: "cash_on_delivery",

    customer: {
      firstName: clean(order.customer_first_name),
      lastName: clean(order.customer_last_name),
      email: clean(order.customer_email),
      phone: clean(order.customer_phone),
      country: clean(order.delivery_country),
      city: clean(order.delivery_city),
      area: clean(order.delivery_area),
      address: clean(order.delivery_address),
      building: clean(order.delivery_building),
      floor: clean(order.delivery_floor),
      deliveryNotes: clean(order.delivery_notes),
    },

    items,

    subtotal: Math.max(0, numberValue(order.subtotal)),
    discountAmount: Math.max(0, numberValue(order.discount_amount)),
    deliveryFee: Math.max(0, numberValue(order.delivery_fee)),
    total: Math.max(0, numberValue(order.total)),
    couponCode: clean(order.coupon_code) || null,
  });

  const orderNumber = clean(order.order_number) || "Order";

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Stereophonie-Receipt-${safeFilename(
        orderNumber,
      )}.pdf"`,

      "Cache-Control": "private, no-store, max-age=0",

      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
    },
  });
}
