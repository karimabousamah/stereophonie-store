"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type DiscountType = "percentage" | "fixed";

type AdminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

type CouponFormValues = {
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number | null;
  minimumSubtotal: number;
  maxDiscountAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  firstOrderOnly: boolean;
  maximumRedemptions: number | null;
  customerRedemptionLimit: number | null;
};

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: FormDataEntryValue | null) {
  const cleaned = cleanText(value);

  return cleaned || null;
}

function requiredNumber(value: FormDataEntryValue | null) {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function optionalPositiveNumber(value: FormDataEntryValue | null) {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function optionalPositiveInteger(value: FormDataEntryValue | null) {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function optionalDate(value: FormDataEntryValue | null) {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return null;
  }

  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function checkboxIsChecked(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function couponCodeIsValid(code: string) {
  return /^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code);
}

function redirectWithError(message: string): never {
  redirect(`/admin/coupons?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(message: string): never {
  redirect(`/admin/coupons?success=${encodeURIComponent(message)}`);
}

async function requireAdministrator(): Promise<AdminContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", user.id)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login");
  }

  return {
    supabase,
    userId: user.id,
  };
}

function refreshCouponPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/coupons");
  revalidatePath("/checkout");
  revalidatePath("/checkout/review");
  revalidatePath("/account");
  revalidatePath("/track-order");
}

function readCouponForm(formData: FormData): CouponFormValues {
  const discountType = cleanText(formData.get("discount_type")) as DiscountType;

  return {
    code: cleanText(formData.get("code")).toUpperCase(),

    name: cleanText(formData.get("name")),

    description: optionalText(formData.get("description")),

    discountType,

    discountValue: requiredNumber(formData.get("discount_value")),

    minimumSubtotal: requiredNumber(formData.get("minimum_subtotal")) ?? 0,

    maxDiscountAmount: optionalPositiveNumber(
      formData.get("max_discount_amount"),
    ),

    startsAt: optionalDate(formData.get("starts_at")),

    endsAt: optionalDate(formData.get("ends_at")),

    isActive: checkboxIsChecked(formData.get("is_active")),

    firstOrderOnly: checkboxIsChecked(formData.get("first_order_only")),

    maximumRedemptions: optionalPositiveInteger(
      formData.get("max_redemptions"),
    ),

    customerRedemptionLimit: optionalPositiveInteger(
      formData.get("max_redemptions_per_customer"),
    ),
  };
}

function validateCouponForm(values: CouponFormValues, formData: FormData) {
  if (!values.name) {
    return "Coupon name is required.";
  }

  if (!values.code) {
    return "Coupon code is required.";
  }

  if (!couponCodeIsValid(values.code)) {
    return "Coupon codes must contain 3 to 40 uppercase letters, numbers, underscores, or hyphens.";
  }

  if (values.discountType !== "percentage" && values.discountType !== "fixed") {
    return "Select a valid discount type.";
  }

  if (values.discountValue === null || values.discountValue <= 0) {
    return "Discount value must be greater than zero.";
  }

  if (values.discountType === "percentage" && values.discountValue > 100) {
    return "Percentage discounts cannot exceed 100%.";
  }

  if (values.minimumSubtotal < 0) {
    return "Minimum spend cannot be negative.";
  }

  const rawMaximumDiscount = cleanText(formData.get("max_discount_amount"));

  if (rawMaximumDiscount && values.maxDiscountAmount === null) {
    return "Maximum discount must be greater than zero.";
  }

  const rawTotalLimit = cleanText(formData.get("max_redemptions"));

  if (rawTotalLimit && values.maximumRedemptions === null) {
    return "Total usage limit must be a positive whole number.";
  }

  const rawCustomerLimit = cleanText(
    formData.get("max_redemptions_per_customer"),
  );

  if (rawCustomerLimit && values.customerRedemptionLimit === null) {
    return "Customer usage limit must be a positive whole number.";
  }

  if (
    values.startsAt &&
    values.endsAt &&
    new Date(values.endsAt).getTime() <= new Date(values.startsAt).getTime()
  ) {
    return "The expiration date must be after the starting date.";
  }

  return null;
}

function buildCouponDatabaseValues(values: CouponFormValues) {
  return {
    code: values.code,

    name: values.name,

    description: values.description?.slice(0, 1000) ?? null,

    discount_type: values.discountType,

    discount_value: values.discountValue,

    minimum_subtotal: values.minimumSubtotal,

    max_discount_amount:
      values.discountType === "percentage" ? values.maxDiscountAmount : null,

    starts_at: values.startsAt,

    ends_at: values.endsAt,

    is_active: values.isActive,

    first_order_only: values.firstOrderOnly,

    max_redemptions: values.maximumRedemptions,

    max_redemptions_per_customer: values.customerRedemptionLimit,
  };
}

function handleCouponDatabaseError(error: {
  code?: string;
  message: string;
}): never {
  if (
    error.code === "23505" ||
    error.message.toLowerCase().includes("duplicate")
  ) {
    redirectWithError("A coupon with this code already exists.");
  }

  redirectWithError(error.message);
}

export async function createCoupon(formData: FormData) {
  const { supabase, userId } = await requireAdministrator();

  const values = readCouponForm(formData);

  const validationError = validateCouponForm(values, formData);

  if (validationError) {
    redirectWithError(validationError);
  }

  const { error } = await supabase.from("coupons").insert({
    ...buildCouponDatabaseValues(values),

    created_by: userId,
  });

  if (error) {
    handleCouponDatabaseError(error);
  }

  refreshCouponPages();

  redirectWithSuccess("Coupon created successfully.");
}

export async function updateCoupon(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const couponId = cleanText(formData.get("coupon_id"));

  if (!couponId) {
    redirectWithError("The coupon could not be identified.");
  }

  const values = readCouponForm(formData);

  const validationError = validateCouponForm(values, formData);

  if (validationError) {
    redirectWithError(validationError);
  }

  const { data: updatedCoupon, error } = await supabase
    .from("coupons")
    .update(buildCouponDatabaseValues(values))
    .eq("id", couponId)
    .select("id")
    .maybeSingle();

  if (error) {
    handleCouponDatabaseError(error);
  }

  if (!updatedCoupon) {
    redirectWithError("The coupon could not be found.");
  }

  refreshCouponPages();

  redirectWithSuccess("Coupon updated successfully.");
}

export async function deleteCoupon(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const couponId = cleanText(formData.get("coupon_id"));

  if (!couponId) {
    redirectWithError("The coupon could not be identified.");
  }

  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("id, code")
    .eq("id", couponId)
    .maybeSingle();

  if (couponError || !coupon) {
    redirectWithError("The coupon could not be found.");
  }

  const { count: redemptionCount, error: redemptionError } = await supabase
    .from("coupon_redemptions")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("coupon_id", couponId);

  if (redemptionError) {
    redirectWithError("The coupon usage history could not be checked.");
  }

  if (Number(redemptionCount ?? 0) > 0) {
    redirectWithError(
      "This coupon has already been used and cannot be permanently deleted. Disable it instead to preserve order history.",
    );
  }

  const { error } = await supabase.from("coupons").delete().eq("id", couponId);

  if (error) {
    handleCouponDatabaseError(error);
  }

  refreshCouponPages();

  redirectWithSuccess(`Coupon ${coupon.code} deleted successfully.`);
}

/*
 * These actions remain available temporarily so the
 * existing page continues working until its old controls
 * are fully replaced by the complete editor.
 */

export async function updateCouponCode(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const couponId = cleanText(formData.get("coupon_id"));

  const code = cleanText(formData.get("code")).toUpperCase();

  if (!couponId || !couponCodeIsValid(code)) {
    redirectWithError("Enter a valid coupon code.");
  }

  const { error } = await supabase
    .from("coupons")
    .update({
      code,
    })
    .eq("id", couponId);

  if (error) {
    handleCouponDatabaseError(error);
  }

  refreshCouponPages();

  redirectWithSuccess("Coupon code updated successfully.");
}

export async function toggleCouponStatus(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const couponId = cleanText(formData.get("coupon_id"));

  const currentStatus = cleanText(formData.get("current_status")) === "true";

  if (!couponId) {
    redirectWithError("The coupon could not be identified.");
  }

  const { error } = await supabase
    .from("coupons")
    .update({
      is_active: !currentStatus,
    })
    .eq("id", couponId);

  if (error) {
    redirectWithError(error.message);
  }

  refreshCouponPages();

  redirectWithSuccess(
    currentStatus
      ? "Coupon disabled successfully."
      : "Coupon activated successfully.",
  );
}

export async function updateCouponSchedule(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const couponId = cleanText(formData.get("coupon_id"));

  const startsAt = optionalDate(formData.get("starts_at"));

  const endsAt = optionalDate(formData.get("ends_at"));

  if (!couponId) {
    redirectWithError("The coupon could not be identified.");
  }

  if (
    startsAt &&
    endsAt &&
    new Date(endsAt).getTime() <= new Date(startsAt).getTime()
  ) {
    redirectWithError("The expiration date must be after the starting date.");
  }

  const { error } = await supabase
    .from("coupons")
    .update({
      starts_at: startsAt,

      ends_at: endsAt,
    })
    .eq("id", couponId);

  if (error) {
    redirectWithError(error.message);
  }

  refreshCouponPages();

  redirectWithSuccess("Coupon schedule updated successfully.");
}
