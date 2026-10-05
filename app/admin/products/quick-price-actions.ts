"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { SHOP_CATALOGUE_CACHE_TAG } from "@/lib/storefront-shop-loader";
import { createClient } from "@/lib/supabase/server";

type QuickPriceResult =
  | {
      ok: true;
      regularPrice: number;
      salePrice: number | null;
    }
  | {
      ok: false;
      message: string;
    };

async function requireAdministrator() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (error || !admin?.is_active) {
    redirect("/admin/login");
  }

  return supabase;
}

export async function updateProductVariantQuickPrice(
  formData: FormData,
): Promise<QuickPriceResult> {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();

  const regularPriceText = String(
    formData.get("regular_price") ?? "",
  ).trim();

  const salePriceText = String(
    formData.get("sale_price") ?? "",
  ).trim();

  if (!productId || !variantId) {
    return {
      ok: false,
      message: "The product configuration could not be identified.",
    };
  }

  const regularPrice = Number(regularPriceText);

  if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
    return {
      ok: false,
      message: "Enter a valid regular price greater than zero.",
    };
  }

  let salePrice: number | null = null;

  if (salePriceText) {
    const parsedSalePrice = Number(salePriceText);

    if (
      !Number.isFinite(parsedSalePrice) ||
      parsedSalePrice < 0 ||
      parsedSalePrice >= regularPrice
    ) {
      return {
        ok: false,
        message: "Sale price must be lower than the regular price.",
      };
    }

    salePrice = parsedSalePrice;
  }

  const { data: existingVariant, error: existingVariantError } =
    await supabase
      .from("product_variants")
      .select("id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();

  if (existingVariantError) {
    return {
      ok: false,
      message: existingVariantError.message,
    };
  }

  if (!existingVariant) {
    return {
      ok: false,
      message: "This product configuration no longer exists.",
    };
  }

  const { error: updateError } = await supabase
    .from("product_variants")
    .update({
      regular_price: regularPrice,
      sale_price: salePrice,
    })
    .eq("id", variantId)
    .eq("product_id", productId);

  if (updateError) {
    return {
      ok: false,
      message: updateError.message,
    };
  }

  updateTag(SHOP_CATALOGUE_CACHE_TAG);
  revalidateTag(SHOP_CATALOGUE_CACHE_TAG, "max");

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");

  return {
    ok: true,
    regularPrice,
    salePrice,
  };
}
