import { NextResponse } from "next/server";

import {
  storefrontImageDisplayUrl,
  storefrontPrimaryImageForVariant,
} from "@/lib/storefront-product-media";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

const SITE_URL = "https://www.stereophoniestore.com";
const CURRENCY = "USD";

type MerchantVariant = {
  id: string;
  sku: string | null;
  barcode: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number | null;
  variant_name: string | null;
  size: string | null;
  display_position: number | null;
  is_active: boolean | null;
  availability_status:
    | "in_stock"
    | "low_stock"
    | "out_of_stock"
    | "coming_soon"
    | null;
};

type MerchantImage = {
  id: string;
  image_url: string | null;
  storage_path: string | null;
  storefront_image_url?: string | null;
  alt_text: string | null;
  position: number | null;
  is_primary: boolean | null;
  variant_id: string | null;
  variant_position: number | null;
  is_variant_primary: boolean | null;
  product_image_variants:
    | {
        variant_id: string;
        position: number;
        is_primary: boolean;
      }[]
    | null;
};

type NamedRelation =
  | {
      name: string | null;
    }
  | {
      name: string | null;
    }[]
  | null;

type MerchantProduct = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categories: NamedRelation;
  brands: NamedRelation;
  product_images: MerchantImage[] | null;
  product_variants: MerchantVariant[] | null;
};

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function relationName(relation: NamedRelation) {
  if (Array.isArray(relation)) {
    return String(relation[0]?.name ?? "").trim();
  }

  return String(relation?.name ?? "").trim();
}

function positivePrice(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : null;
}

function merchantPrice(variant: MerchantVariant) {
  const regular = positivePrice(variant.regular_price);
  const sale = positivePrice(variant.sale_price);

  if (sale !== null && regular !== null && sale < regular) {
    return sale;
  }

  return regular;
}

function merchantAvailability(
  variant: MerchantVariant,
): "in_stock" | "out_of_stock" | "preorder" {
  if (variant.availability_status === "coming_soon") {
    return "preorder";
  }

  if (
    (variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock") &&
    Number(variant.stock_quantity ?? 0) > 0
  ) {
    return "in_stock";
  }

  return "out_of_stock";
}

function orderedVariants(
  variants: MerchantVariant[] | null | undefined,
) {
  return [...(variants ?? [])]
    .filter((variant) => variant.is_active !== false)
    .sort((first, second) => {
      const positionDifference =
        Number(first.display_position ?? 0) -
        Number(second.display_position ?? 0);

      if (positionDifference !== 0) {
        return positionDifference;
      }

      return String(
        first.variant_name ?? first.size ?? "",
      ).localeCompare(
        String(second.variant_name ?? second.size ?? ""),
        undefined,
        {
          numeric: true,
        },
      );
    });
}

function selectMerchantVariant(
  variants: MerchantVariant[] | null | undefined,
) {
  const ordered = orderedVariants(variants);

  const purchasable = ordered.find(
    (variant) =>
      merchantAvailability(variant) === "in_stock" &&
      merchantPrice(variant) !== null,
  );

  if (purchasable) {
    return purchasable;
  }

  return ordered.find(
    (variant) => merchantPrice(variant) !== null,
  ) ?? null;
}

function validGtin(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, "")
    .trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  if (![8, 12, 13, 14].includes(normalized.length)) {
    return null;
  }

  return normalized;
}

function storefrontThumbnailPath(storagePath: string) {
  const normalized = storagePath.trim().replace(/^\/+/, "");
  const slash = normalized.lastIndexOf("/");
  const directory = slash >= 0 ? normalized.slice(0, slash) : "";
  const filename = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const dot = filename.lastIndexOf(".");
  const basename = dot > 0 ? filename.slice(0, dot) : filename;

  return directory
    ? `${directory}/storefront/${basename}.webp`
    : `storefront/${basename}.webp`;
}

function merchantImagesWithStorefrontUrls(
  images: MerchantImage[] | null | undefined,
  supabase: ReturnType<typeof createAdminClient>,
) {
  return (images ?? []).map((image) => {
    const storagePath = String(image.storage_path ?? "").trim();

    if (!storagePath) {
      return image;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(storefrontThumbnailPath(storagePath));

    return {
      ...image,
      storefront_image_url: data.publicUrl,
    };
  });
}

function productDescription(product: MerchantProduct) {
  const description = String(product.description ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return description || String(product.name ?? "").trim();
}

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        description,

        categories (
          name
        ),

        brands (
          name
        ),

        product_images (
          id,
          image_url,
          storage_path,
          alt_text,
          position,
          is_primary,
          variant_id,
          variant_position,
          is_variant_primary,
          product_image_variants (
            variant_id,
            position,
            is_primary
          )
        ),

        product_variants (
          id,
          sku,
          barcode,
          regular_price,
          sale_price,
          stock_quantity,
          variant_name,
          size,
          display_position,
          is_active,
          availability_status
        )
      `,
    )
    .eq("status", "published")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Google Merchant feed could not load products:",
      error,
    );

    return new NextResponse(
      "Google Merchant product feed is temporarily unavailable.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const products = (data ?? []) as MerchantProduct[];

  const items = products.flatMap((product) => {
    const slug = String(product.slug ?? "").trim();

    if (!slug) {
      return [];
    }

    const variant = selectMerchantVariant(
      product.product_variants,
    );

    if (!variant) {
      return [];
    }

    const price = merchantPrice(variant);

    if (price === null) {
      return [];
    }

    const merchantImages =
      merchantImagesWithStorefrontUrls(
        product.product_images,
        supabase,
      );

    const primaryImage =
      storefrontPrimaryImageForVariant(
        merchantImages,
        variant.id,
      );

    const imageUrl =
      storefrontImageDisplayUrl(primaryImage);

    if (!imageUrl) {
      return [];
    }

    const productUrl =
      `${SITE_URL}/shop/${encodeURIComponent(slug)}`;

    const brand = relationName(product.brands);
    const category = relationName(product.categories);
    const gtin = validGtin(variant.barcode);
    const availability = merchantAvailability(variant);

    const identifierExists =
      gtin || brand
        ? null
        : "no";

    return [
      [
        "    <item>",
        `      <g:id>${xmlEscape(product.id)}</g:id>`,
        `      <g:title>${xmlEscape(product.name)}</g:title>`,
        `      <g:description>${xmlEscape(productDescription(product))}</g:description>`,
        `      <g:link>${xmlEscape(productUrl)}</g:link>`,
        `      <g:image_link>${xmlEscape(imageUrl)}</g:image_link>`,
        "      <g:condition>new</g:condition>",
        `      <g:availability>${availability}</g:availability>`,
        `      <g:price>${price.toFixed(2)} ${CURRENCY}</g:price>`,
        brand
          ? `      <g:brand>${xmlEscape(brand)}</g:brand>`
          : "",
        category
          ? `      <g:product_type>${xmlEscape(category)}</g:product_type>`
          : "",
        gtin
          ? `      <g:gtin>${xmlEscape(gtin)}</g:gtin>`
          : "",
        identifierExists
          ? `      <g:identifier_exists>${identifierExists}</g:identifier_exists>`
          : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n"),
    ];
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">',
    "  <channel>",
    "    <title>Stereophonie Store Product Feed</title>",
    `    <link>${SITE_URL}</link>`,
    "    <description>Published products available from Stereophonie Store</description>",
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
