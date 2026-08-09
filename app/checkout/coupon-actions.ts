"use server";

import { createClient } from "@/lib/supabase/server";

type PreviewCouponInput = {
  code: string;
  subtotal: number;
  customerEmail?: string;
};

export type PreviewCouponResult = {
  success: boolean;
  code?: string;
  name?: string;
  description?: string | null;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  subtotalAfterDiscount?: number;
  message: string;
};

type CouponRpcResult = {
  success?: boolean;
  code?: string;
  name?: string;
  description?: string | null;
  discount_type?: "percentage" | "fixed";
  discount_value?: number | string;
  discount_amount?: number | string;
  subtotal_after_discount?: number | string;
  message?: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function numberOrZero(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export async function previewCoupon(
  input: PreviewCouponInput,
): Promise<PreviewCouponResult> {
  const code = cleanText(input?.code).toUpperCase();

  const customerEmail = cleanEmail(input?.customerEmail);

  const subtotal = numberOrZero(input?.subtotal);

  if (!code) {
    return {
      success: false,
      message: "Enter a coupon code.",
    };
  }

  if (subtotal <= 0) {
    return {
      success: false,
      message: "Add products to your cart before applying a coupon.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("preview_coupon", {
    coupon_code_input: code,

    cart_subtotal: subtotal,

    customer_email_input: customerEmail || null,
  });

  if (error) {
    console.error("Coupon preview error:", error);

    return {
      success: false,
      message: "The coupon could not be checked. Please try again.",
    };
  }

  const result = data as CouponRpcResult | null;

  if (!result?.success) {
    return {
      success: false,
      message:
        cleanText(result?.message) || "This coupon could not be applied.",
    };
  }

  return {
    success: true,

    code: cleanText(result.code) || code,

    name: cleanText(result.name) || "Promotion",

    description: cleanText(result.description) || null,

    discountType: result.discount_type,

    discountValue: numberOrZero(result.discount_value),

    discountAmount: numberOrZero(result.discount_amount),

    subtotalAfterDiscount: numberOrZero(result.subtotal_after_discount),

    message: cleanText(result.message) || "Coupon applied successfully.",
  };
}
