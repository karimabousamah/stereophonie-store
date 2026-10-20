import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type StockAlertRequest = {
  productId?: unknown;
  variantId?: unknown;
  email?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function isValidEmail(value: string) {
  return (
    value.length >= 5 &&
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export async function POST(request: NextRequest) {
  try {
    let body: StockAlertRequest;

    try {
      body = (await request.json()) as StockAlertRequest;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "The request body is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const productId =
      typeof body.productId === "string" ? body.productId.trim() : "";

    const variantId =
      typeof body.variantId === "string" ? body.variantId.trim() : null;

    const submittedEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!isUuid(productId)) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected product is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    if (variantId !== null && !isUuid(variantId)) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected size or option is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = await createClient();

    const {
      data: alertProduct,
      error: alertProductError,
    } = await supabase
      .from("products")
      .select("availability")
      .eq("id", productId)
      .maybeSingle();

    if (alertProductError || !alertProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected product is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    if (alertProduct.availability === "ask_for_price") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ask for Price products do not use stock notifications.",
        },
        {
          status: 400,
        },
      );
    }

    if (variantId !== null) {
      const {
        data: alertVariant,
        error: alertVariantError,
      } = await supabase
        .from("product_variants")
        .select("availability_status")
        .eq("id", variantId)
        .eq("product_id", productId)
        .maybeSingle();

      if (alertVariantError || !alertVariant) {
        return NextResponse.json(
          {
            success: false,
            message: "The selected size or option is invalid.",
          },
          {
            status: 400,
          },
        );
      }

      if (alertVariant.availability_status === "ask_for_price") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Ask for Price configurations do not use stock notifications.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const accountEmail = user?.email?.trim().toLowerCase() ?? "";

    const notificationEmail = accountEmail || submittedEmail;

    if (!notificationEmail) {
      return NextResponse.json(
        {
          success: false,
          requiresEmail: true,
          message:
            "Please enter your email address to receive this notification.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidEmail(notificationEmail)) {
      return NextResponse.json(
        {
          success: false,
          requiresEmail: !accountEmail,
          message: "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await supabase.rpc("request_stock_alert", {
      requested_product_id: productId,
      requested_variant_id: variantId,
      requested_email: notificationEmail,
    });

    if (error) {
      console.error("Stock alert request failed:", error);

      return NextResponse.json(
        {
          success: false,
          message:
            error.message || "The notification request could not be submitted.",
        },
        {
          status: 400,
        },
      );
    }

    const result = typeof data === "object" && data !== null ? data : null;

    return NextResponse.json({
      success: true,
      email: notificationEmail,
      usedAccountEmail: Boolean(accountEmail),
      message:
        result && "message" in result && typeof result.message === "string"
          ? result.message
          : variantId
            ? "You will be notified when this size or option becomes available."
            : "You will be notified when this product becomes available.",
      result,
    });
  } catch (error) {
    console.error("Unexpected stock alert error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The notification request could not be submitted.",
      },
      {
        status: 500,
      },
    );
  }
}
