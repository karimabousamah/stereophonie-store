#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { processStoreImage } from "../../lib/stereophonie-v3/images/process-store-image.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const manifestPath = path.join(here, "shopify-products.manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

const args = new Set(process.argv.slice(2));
const valueArg = (prefix) => {
  const raw = process.argv.slice(2).find((arg) => arg.startsWith(`${prefix}=`));
  return raw ? raw.slice(prefix.length + 1) : null;
};

const execute = args.has("--execute");
const all = args.has("--all");
const limitRaw = valueArg("--limit");
const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10) || 1) : 5;
const handle = valueArg("--handle");
const confirm = valueArg("--confirm");

if (all && execute && confirm !== "IMPORT_ALL_284") {
  console.error("Full import protection triggered.");
  console.error("Use: --execute --all --confirm=IMPORT_ALL_284");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_HANDLES = [
  "samsung-usb-c-to-usb-c-cable-5-a-1-8m",
  "samsung-galaxy-watch-8",
  "jbl-flip6",
  "iphone-clear-case-with-magsafe",
  "ludo",
];

const STEREOPHONIE_COLOR_PALETTE = [
  { name: "Black", hex: "#111111" },
  { name: "Midnight", hex: "#1D2530" },
  { name: "Graphite", hex: "#4B4B4D" },
  { name: "Space Gray", hex: "#6B6B6D" },
  { name: "Silver", hex: "#C9C9C9" },
  { name: "White", hex: "#F7F7F5" },
  { name: "Clear", hex: "transparent" },
  { name: "Cream", hex: "#EFE7D5" },
  { name: "Beige", hex: "#D8C3A5" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Titanium", hex: "#8D8A83" },
  { name: "Natural Titanium", hex: "#A69F91" },
  { name: "Desert Titanium", hex: "#B39A82" },
  { name: "Blue", hex: "#2F6BFF" },
  { name: "Navy", hex: "#14213D" },
  { name: "Sky Blue", hex: "#7CC7F2" },
  { name: "Teal", hex: "#2A9D8F" },
  { name: "Turquoise", hex: "#40C9C6" },
  { name: "Green", hex: "#4E8B57" },
  { name: "Mint", hex: "#98D8C8" },
  { name: "Olive", hex: "#727A3E" },
  { name: "Yellow", hex: "#F4C430" },
  { name: "Orange", hex: "#F57C00" },
  { name: "Coral", hex: "#FF6F61" },
  { name: "Red", hex: "#D92D20" },
  { name: "Burgundy", hex: "#6B1D2A" },
  { name: "Pink", hex: "#E98AAE" },
  { name: "Hot Pink", hex: "#FF4FA3" },
  { name: "Purple", hex: "#7651C9" },
  { name: "Lavender", hex: "#B9A7E8" },
  { name: "Brown", hex: "#765341" },
  { name: "Copper", hex: "#B87333" },
];

function normalizeColorKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveStereophonieColor(rawValue) {
  const raw = normalizeColorKey(rawValue);

  if (!raw) return null;

  // Shopify sometimes exports option values such as
  // "black-4" / "white-4". Remove a trailing numeric
  // discriminator when looking up the physical colour.
  const withoutNumericSuffix = raw.replace(/\s+\d+$/, "").trim();

  const aliases = new Map([
    ["grey", "Space Gray"],
    ["gray", "Space Gray"],
    ["space grey", "Space Gray"],
    ["space gray", "Space Gray"],
    ["graphite", "Graphite"],
    ["silver", "Silver"],
    ["black", "Black"],
    ["white", "White"],
    ["clear", "Clear"],
    ["transparent", "Clear"],
    ["midnight", "Midnight"],
    ["cream", "Cream"],
    ["beige", "Beige"],
    ["gold", "Gold"],
    ["rose gold", "Rose Gold"],
    ["titanium", "Titanium"],
    ["natural titanium", "Natural Titanium"],
    ["desert titanium", "Desert Titanium"],
    ["blue", "Blue"],
    ["navy", "Navy"],
    ["sky blue", "Sky Blue"],
    ["teal", "Teal"],
    ["turquoise", "Turquoise"],
    ["green", "Green"],
    ["mint", "Mint"],
    ["olive", "Olive"],
    ["yellow", "Yellow"],
    ["orange", "Orange"],
    ["coral", "Coral"],
    ["red", "Red"],
    ["burgundy", "Burgundy"],
    ["pink", "Pink"],
    ["hot pink", "Hot Pink"],
    ["purple", "Purple"],
    ["lavender", "Lavender"],
    ["brown", "Brown"],
    ["copper", "Copper"],
  ]);

  const canonicalName =
    aliases.get(raw) ?? aliases.get(withoutNumericSuffix) ?? null;

  if (!canonicalName) return null;

  return (
    STEREOPHONIE_COLOR_PALETTE.find((color) => color.name === canonicalName) ??
    null
  );
}

function enrichVariantColorAttributes(attributes) {
  const source =
    attributes && typeof attributes === "object" ? { ...attributes } : {};

  const possibleColorEntries = Object.entries(source).filter(([key]) => {
    const normalizedKey = normalizeColorKey(key);

    return (
      normalizedKey === "color" ||
      normalizedKey === "colour" ||
      normalizedKey === "band color" ||
      normalizedKey === "band colour" ||
      normalizedKey === "case color" ||
      normalizedKey === "case colour"
    );
  });

  for (const [, value] of possibleColorEntries) {
    const resolved = resolveStereophonieColor(value);

    if (!resolved) continue;

    source.color = resolved.name;
    source.color_name = resolved.name;
    source.color_hex = resolved.hex;

    return source;
  }

  return source;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TECHNICAL_SECTION_NAMES = new Set([
  "key features",
  "features",
  "additional features",
  "specifications",
  "technical specifications",
  "technical specification",
  "technical specs",
  "tech specs",
  "general specifications",
  "audio specifications",
  "control and connection specifications",
  "battery",
  "dimensions",
  "connectivity & controls",
  "connectivity and controls",
  "sensors & chips",
  "sensors and chips",
  "audio & noise control",
  "audio and noise control",
  "durability",
  "fit & size",
  "fit and size",
  "hearing health",
  "system requirements",
  "compatibility",
]);

const DESCRIPTION_STOP_SECTIONS = new Set([
  "in conclusion",
  "conclusion",
  "final conclusion",
  "what's in the box",
  "whats in the box",
  "in the box",
  "how it works",
]);

function cleanTechnicalLabel(value) {
  return String(value ?? "")
    .replace(/^[•\-–—*]+\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/[:：]\s*$/, "")
    .trim();
}

function cleanTechnicalValue(value) {
  return String(value ?? "")
    .replace(/^[•\-–—*]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedSectionHeading(value) {
  return cleanTechnicalLabel(value)
    .toLowerCase()
    .replace(/[.:]+$/, "")
    .trim();
}

function looksLikeSectionHeading(line) {
  const normalized = normalizedSectionHeading(line);

  if (
    TECHNICAL_SECTION_NAMES.has(normalized) ||
    DESCRIPTION_STOP_SECTIONS.has(normalized)
  ) {
    return normalized;
  }

  return null;
}

function parseTechnicalPair(line) {
  const cleaned = String(line ?? "").trim();

  if (!cleaned) return null;

  const colonIndex = cleaned.indexOf(":");

  if (colonIndex > 0) {
    const name = cleanTechnicalLabel(cleaned.slice(0, colonIndex));
    const value = cleanTechnicalValue(cleaned.slice(colonIndex + 1));

    if (name && value) {
      return { name, value };
    }
  }

  return null;
}

function uniqueTechnicalSpecs(specs) {
  const seen = new Set();
  const output = [];

  for (const spec of specs) {
    const name = cleanTechnicalLabel(spec.name);
    const value = cleanTechnicalValue(spec.value);

    if (!name || !value) continue;

    const key = `${name.toLowerCase()}::${value.toLowerCase()}`;

    if (seen.has(key)) continue;

    seen.add(key);
    output.push({ name, value });
  }

  return output;
}

function parseShopifyTechnicalContent(rawDescription) {
  const description = String(rawDescription ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (!description) {
    return {
      description: null,
      technicalSpecs: [],
    };
  }

  const lines = description.split("\n").map((line) => line.trim());

  const descriptionLines = [];
  const technicalSpecs = [];

  let mode = "description";
  let technicalSection = null;
  let pendingFeatureName = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line) {
      if (mode === "description") {
        descriptionLines.push("");
      }
      continue;
    }

    const heading = looksLikeSectionHeading(line);

    if (heading) {
      if (DESCRIPTION_STOP_SECTIONS.has(heading)) {
        mode = "ignore";
        technicalSection = null;
        pendingFeatureName = null;
        continue;
      }

      mode = "technical";
      technicalSection = cleanTechnicalLabel(line);
      pendingFeatureName = null;
      continue;
    }

    if (mode === "ignore") {
      continue;
    }

    if (mode === "description") {
      /*
       * Also recognize common headings that do not use a colon.
       */
      const lower = normalizedSectionHeading(line);

      if (
        lower === "why you’ll love them" ||
        lower === "why you'll love them"
      ) {
        mode = "technical";
        technicalSection = "Key Features";
        continue;
      }

      descriptionLines.push(line);
      continue;
    }

    const pair = parseTechnicalPair(line);

    if (pair) {
      technicalSpecs.push(pair);
      pendingFeatureName = null;
      continue;
    }

    /*
     * Key-feature sections frequently use:
     *
     *   Super Fast Charging
     *   Combines USB-C PD 3.0...
     *
     * Treat the first line as the spec name and the following prose
     * line as its value.
     */
    const nextLine = lines[index + 1]?.trim() ?? "";
    const nextHeading = nextLine ? looksLikeSectionHeading(nextLine) : null;
    const nextPair = nextLine ? parseTechnicalPair(nextLine) : null;

    const sectionLower = normalizedSectionHeading(technicalSection ?? "");

    const featureLikeSection =
      sectionLower.includes("feature") ||
      sectionLower === "why you’ll love them" ||
      sectionLower === "why you'll love them";

    if (featureLikeSection && nextLine && !nextHeading && !nextPair) {
      technicalSpecs.push({
        name: cleanTechnicalLabel(line),
        value: cleanTechnicalValue(nextLine),
      });

      index += 1;
      pendingFeatureName = null;
      continue;
    }

    /*
     * A standalone technical line still belongs in Technical Specs.
     * Preserve it instead of throwing Shopify information away.
     */
    const fallbackName =
      technicalSection && !sectionLower.includes("specification")
        ? technicalSection
        : "Technical Detail";

    technicalSpecs.push({
      name: fallbackName,
      value: cleanTechnicalValue(line),
    });

    pendingFeatureName = null;
  }

  const cleanedDescription = descriptionLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    description: cleanedDescription || null,
    technicalSpecs: uniqueTechnicalSpecs(technicalSpecs),
  };
}

const CONFIGURATION_HIERARCHY_KEY = "__configuration_hierarchy";
const TECHNICAL_SPECS_KEY = "__technical_specs";

function normalizeAttributeKey(value) {
  return normalize(value).replace(/\s+/g, "_");
}

/*
 * The manifest preserves Shopify option order through object insertion
 * order in variant.attributes.
 *
 * Build one stable product-level hierarchy from the first appearance
 * of each option key across all exact configurations.
 */
function configurationHierarchy(product) {
  const hierarchy = [];
  const seen = new Set();

  for (const variant of product.variants ?? []) {
    const attributes =
      variant?.attributes && typeof variant.attributes === "object"
        ? variant.attributes
        : {};

    for (const rawKey of Object.keys(attributes)) {
      const key = normalizeAttributeKey(rawKey);

      if (!key || key === CONFIGURATION_HIERARCHY_KEY || seen.has(key)) {
        continue;
      }

      seen.add(key);
      hierarchy.push(key);
    }
  }

  return hierarchy;
}

function normalizedVariantAttributes(variant, hierarchy) {
  const rawAttributes =
    variant?.attributes && typeof variant.attributes === "object"
      ? variant.attributes
      : {};

  const attributes = {};

  for (const [rawKey, rawValue] of Object.entries(rawAttributes)) {
    const key = normalizeAttributeKey(rawKey);

    if (!key || key === CONFIGURATION_HIERARCHY_KEY) {
      continue;
    }

    const value = String(rawValue ?? "").trim();

    if (value) {
      attributes[key] = value;
    }
  }

  attributes[CONFIGURATION_HIERARCHY_KEY] = hierarchy;

  return enrichVariantColorAttributes(attributes);
}

function slugify(value) {
  return (
    normalize(value)
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || crypto.randomUUID()
  );
}

function safeExtension(contentType, url) {
  const type = String(contentType ?? "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";

  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".jpeg") || pathname.endsWith(".jpg")) return "jpg";
  if (pathname.endsWith(".png")) return "png";
  if (pathname.endsWith(".webp")) return "webp";
  return null;
}

function productAvailability(variants) {
  if (
    variants.every((variant) => variant.availability_status === "coming_soon")
  ) {
    return "coming_soon";
  }
  if (
    variants.some((variant) =>
      ["in_stock", "low_stock"].includes(variant.availability_status),
    )
  ) {
    return "in_stock";
  }
  return "out_of_stock";
}

async function getCatalogContext() {
  const [categoriesResult, brandsResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,is_active")
      .eq("is_active", true),
    supabase
      .from("brands")
      .select("id,name,slug,is_active")
      .eq("is_active", true),
    supabase.from("products").select("id,name,slug,product_variants(sku)"),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (brandsResult.error) throw brandsResult.error;
  if (productsResult.error) throw productsResult.error;

  const categories = categoriesResult.data ?? [];
  const brands = brandsResult.data ?? [];
  const existingProducts = productsResult.data ?? [];

  const categoriesByName = new Map(
    categories.map((item) => [normalize(item.name), item]),
  );
  const brandsByName = new Map(
    brands.map((item) => [normalize(item.name), item]),
  );

  const existingNames = new Map(
    existingProducts.map((item) => [normalize(item.name), item]),
  );
  const existingSlugs = new Set(
    existingProducts.map((item) => item.slug).filter(Boolean),
  );
  const existingSkus = new Map();

  for (const product of existingProducts) {
    for (const variant of product.product_variants ?? []) {
      const sku = normalize(variant?.sku);
      if (sku) existingSkus.set(sku, product);
    }
  }

  return {
    categories,
    brands,
    categoriesByName,
    brandsByName,
    existingProducts,
    existingNames,
    existingSlugs,
    existingSkus,
  };
}

function resolveBrand(product, ctx) {
  const vendor = product.vendor ?? "";
  const vendorNorm = normalize(vendor);

  /*
   * Shopify vendor is authoritative whenever it is a real manufacturer/vendor.
   *
   * A few legacy Shopify vendor values describe a product family/type instead
   * of the actual manufacturer, so map those explicitly.
   */
  const vendorAliases = {
    "tp link": "tp link",
    cudy: "cudy",
    playstation: "playstation",

    // Legacy Shopify vendor corrections.
    chromecast: "google",
    "echo dot": "amazon",
    mug: "stanley",
  };

  if (vendorNorm && vendorNorm !== "stereophonie") {
    const targetBrandNorm = vendorAliases[vendorNorm] ?? vendorNorm;
    const direct = ctx.brandsByName.get(targetBrandNorm);

    /*
     * Do NOT fall back to title matching for a real Shopify vendor.
     *
     * If the vendor's brand does not exist in Stereophonie yet, leave it
     * unresolved so the migration audit exposes it explicitly.
     */
    return direct ?? null;
  }

  /*
   * Shopify used "Stereophonie" as the merchant/vendor placeholder for many
   * products. Only these placeholder products may infer their manufacturer
   * from the product title.
   *
   * Prefix-only matching is intentional:
   *
   *   "Samsung Galaxy..."       -> Samsung
   *   "Ring Spotlight Cam..."   -> Ring
   *   "LED Ring Light..."       -> NOT Ring
   *
   * Longest brand first prevents a shorter brand prefix from winning when
   * brand names overlap.
   */
  const titleNorm = normalize(product.name);

  if (!titleNorm) return null;

  const candidates = ctx.brands
    .filter((brand) => {
      const brandNorm = normalize(brand.name);

      if (brandNorm.length < 2) return false;

      return titleNorm === brandNorm || titleNorm.startsWith(`${brandNorm} `);
    })
    .sort((a, b) => normalize(b.name).length - normalize(a.name).length);

  return candidates[0] ?? null;
}

function duplicateReason(product, ctx) {
  const byName = ctx.existingNames.get(normalize(product.name));
  if (byName) return `existing product name (${byName.id})`;

  for (const variant of product.variants) {
    if (!variant.sku) continue;
    const bySku = ctx.existingSkus.get(normalize(variant.sku));
    if (bySku) return `existing SKU ${variant.sku} (${bySku.id})`;
  }

  return null;
}

function chooseSlug(product, ctx) {
  const preferred = slugify(product.shopify_handle || product.name);
  if (!ctx.existingSlugs.has(preferred)) return preferred;

  let index = 2;
  while (ctx.existingSlugs.has(`${preferred}-${index}`)) index += 1;
  return `${preferred}-${index}`;
}

async function downloadImage(image) {
  const response = await fetch(image.source_url, {
    redirect: "follow",
    headers: { "user-agent": "Stereophonie-Shopify-Migration/1.0" },
  });

  if (!response.ok) {
    throw new Error(
      `Image download failed (${response.status}) ${image.source_url}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const extension = safeExtension(contentType, image.source_url);
  if (!extension) {
    throw new Error(
      `Unsupported image type "${contentType}" for ${image.source_url}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const max = 10 * 1024 * 1024;
  if (bytes.byteLength > max) {
    throw new Error(`Image is larger than 10 MB: ${image.source_url}`);
  }

  const uploadContentType =
    extension === "jpg" ? "image/jpeg" : `image/${extension}`;
  const processed = await processStoreImage({
    input: Buffer.from(bytes),
    kind: "product",
  });

  return {
    bytes: new Uint8Array(processed),
    extension: "png",
    contentType: "image/png",
  };
}

function validateProductForImport(product) {
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    throw new Error("BLOCKED: product has no configurations.");
  }

  const hierarchy = configurationHierarchy(product);

  const duplicateHierarchyKeys = hierarchy.filter(
    (key, index, allKeys) => allKeys.indexOf(key) !== index,
  );

  if (duplicateHierarchyKeys.length > 0) {
    throw new Error(
      `BLOCKED: duplicate normalized configuration keys: ${duplicateHierarchyKeys.join(", ")}`,
    );
  }

  for (const variant of product.variants) {
    const normalizedAttributes = normalizedVariantAttributes(
      variant,
      hierarchy,
    );

    for (const key of hierarchy) {
      if (!String(normalizedAttributes[key] ?? "").trim()) {
        throw new Error(
          `BLOCKED: configuration "${variant.variant_name}" is missing hierarchy value "${key}".`,
        );
      }
    }
  }

  const invalidSaleVariants = product.variants.filter((variant) => {
    if (
      variant.sale_price === null ||
      variant.sale_price === undefined ||
      variant.sale_price === ""
    ) {
      return false;
    }

    const salePrice = Number(variant.sale_price);
    const regularPrice = Number(variant.regular_price);

    /*
     * Supplier imports are drafts. A missing regular price is allowed
     * until an administrator completes the product before publishing.
     */
    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      return false;
    }

    return (
      !Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= regularPrice
    );
  });

  if (invalidSaleVariants.length > 0) {
    const names = invalidSaleVariants
      .map((variant) => variant.variant_name || "Unnamed configuration")
      .join(", ");

    throw new Error(
      `BLOCKED: ${invalidSaleVariants.length} configuration(s) have an invalid sale price: ${names}`,
    );
  }
}

function selectImagesForImport(product) {
  // Preserve every Shopify photograph during supplier migration.
  // Legacy image_import_limit metadata is intentionally ignored.
  return Array.isArray(product.images) ? product.images.slice() : [];
}

async function importOne(product, ctx) {
  validateProductForImport(product);

  const category = ctx.categoriesByName.get(normalize(product.target_category));
  if (!category) {
    throw new Error(`Missing target category: ${product.target_category}`);
  }

  const duplicate = duplicateReason(product, ctx);
  if (duplicate) {
    return { status: "skipped", reason: duplicate };
  }

  const brand = resolveBrand(product, ctx);
  const slug = chooseSlug(product, ctx);
  const selectedImages = selectImagesForImport(product);
  const technicalContent = parseShopifyTechnicalContent(product.description);

  // Download/validate images before changing the database.
  const downloadedImages = [];
  for (const image of selectedImages) {
    downloadedImages.push({ image, file: await downloadImage(image) });
  }

  const { data: createdProduct, error: productError } = await supabase
    .from("products")
    .insert({
      name: product.name,
      slug,
      description: technicalContent.description,
      category_id: category.id,
      brand_id: brand?.id ?? null,
      collection_id: null,
      status: "draft",
      availability: productAvailability(product.variants),
      is_featured: false,
      is_trending: false,
      is_new_arrival: false,
    })
    .select("id")
    .single();

  if (productError || !createdProduct) {
    throw new Error(productError?.message ?? "Product creation failed.");
  }

  const productId = createdProduct.id;
  const uploadedPaths = [];

  try {
    const hierarchy = configurationHierarchy(product);

    const variantRows = product.variants.map((variant) => ({
      product_id: productId,
      size: variant.variant_name,
      variant_name: variant.variant_name,
      display_position: variant.display_position ?? 0,
      attributes: {
        ...normalizedVariantAttributes(variant, hierarchy),
        ...(technicalContent.technicalSpecs.length > 0
          ? {
              [TECHNICAL_SPECS_KEY]: technicalContent.technicalSpecs,
            }
          : {}),
      },
      sku: variant.sku || null,
      regular_price: Number(variant.regular_price) || 0,
      sale_price:
        Number.isFinite(Number(variant.regular_price)) &&
        Number(variant.regular_price) > 0 &&
        variant.sale_price !== null &&
        variant.sale_price !== undefined &&
        variant.sale_price !== ""
          ? Number(variant.sale_price)
          : null,
      stock_quantity: Number(variant.stock_quantity) || 0,
      low_stock_threshold: Number(variant.low_stock_threshold) || 5,
      availability_status: variant.availability_status,
    }));

    const { data: insertedVariants, error: variantsError } = await supabase
      .from("product_variants")
      .insert(variantRows)
      .select("id,variant_name");

    if (variantsError) throw variantsError;

    const variantIds = new Map(
      (insertedVariants ?? []).map((variant) => [
        variant.variant_name,
        variant.id,
      ]),
    );

    const variantNamesById = new Map(
      (insertedVariants ?? []).map((variant) => [
        variant.id,
        variant.variant_name,
      ]),
    );

    const variantImagePositions = new Map();
    let storedImageCount = 0;
    let imageAssignmentCount = 0;

    for (let index = 0; index < downloadedImages.length; index += 1) {
      const { image, file } = downloadedImages[index];
      const storagePath = `${productId}/shopify-${String(index).padStart(2, "0")}-${crypto.randomUUID()}.${file.extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(storagePath, file.bytes, {
          contentType: file.contentType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPaths.push(storagePath);

      const { data: publicUrl } = supabase.storage
        .from("product-images")
        .getPublicUrl(storagePath);

      /*
       * The current manifest has zero or one exact configuration
       * name per Shopify image. Normalize to an array so the
       * persistence layer itself is genuinely many-to-many.
       */
      const requestedVariantNames = Array.from(
        new Set(
          [
            ...(Array.isArray(image.variant_names) ? image.variant_names : []),
            image.variant_name,
          ]
            .map((value) => String(value ?? "").trim())
            .filter(Boolean),
        ),
      );

      const assignedVariantIds = requestedVariantNames.map((variantName) => {
        const variantId = variantIds.get(variantName);

        if (!variantId) {
          throw new Error(
            `Image references unknown configuration "${variantName}" for ${product.name}.`,
          );
        }

        return variantId;
      });

      const legacyVariantId =
        assignedVariantIds.length === 1 ? assignedVariantIds[0] : null;

      const legacyVariantName = legacyVariantId
        ? (variantNamesById.get(legacyVariantId) ?? null)
        : null;

      const legacyVariantPosition = legacyVariantId
        ? (variantImagePositions.get(legacyVariantId) ?? 0)
        : 0;

      const legacyVariantPrimary =
        legacyVariantId !== null && legacyVariantPosition === 0;

      const { data: insertedImage, error: imageError } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          storage_path: storagePath,
          image_url: publicUrl.publicUrl,
          alt_text: image.alt_text || `${product.name} photograph ${index + 1}`,
          position: index,
          is_primary: index === 0,
          variant_id: legacyVariantId,
          variant_name: legacyVariantName,
          variant_position: legacyVariantPosition,
          is_variant_primary: legacyVariantPrimary,
        })
        .select("id")
        .single();

      if (imageError || !insertedImage) {
        throw imageError ?? new Error("Product image insertion failed.");
      }

      storedImageCount += 1;

      if (assignedVariantIds.length > 0) {
        const junctionRows = assignedVariantIds.map((variantId) => {
          const position = variantImagePositions.get(variantId) ?? 0;

          variantImagePositions.set(variantId, position + 1);

          return {
            image_id: insertedImage.id,
            variant_id: variantId,
            position,
            is_primary: position === 0,
          };
        });

        const { error: junctionError } = await supabase
          .from("product_image_variants")
          .insert(junctionRows);

        if (junctionError) {
          throw junctionError;
        }

        imageAssignmentCount += junctionRows.length;
      }
    }

    // Keep in-memory duplicate protection current during the same run.
    ctx.existingNames.set(normalize(product.name), {
      id: productId,
      name: product.name,
      slug,
    });
    ctx.existingSlugs.add(slug);
    for (const variant of product.variants) {
      if (variant.sku)
        ctx.existingSkus.set(normalize(variant.sku), {
          id: productId,
          name: product.name,
          slug,
        });
    }

    return {
      status: "imported",
      productId,
      brand: brand?.name ?? null,
      category: category.name,
      variants: product.variants.length,
      images: storedImageCount,
      imageAssignments: imageAssignmentCount,
      hierarchy,
      truncatedImages: 0,
    };
  } catch (error) {
    const rollbackErrors = [];

    if (uploadedPaths.length > 0) {
      const { error: storageRollbackError } = await supabase.storage
        .from("product-images")
        .remove(uploadedPaths);

      if (storageRollbackError) {
        rollbackErrors.push(
          `storage cleanup failed: ${storageRollbackError.message}`,
        );
      }
    }

    const { error: productRollbackError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (productRollbackError) {
      rollbackErrors.push(
        `product cleanup failed: ${productRollbackError.message}`,
      );
    }

    if (rollbackErrors.length > 0) {
      const originalMessage =
        error instanceof Error ? error.message : String(error);

      throw new Error(
        `${originalMessage} | ROLLBACK WARNING: ${rollbackErrors.join("; ")}`,
      );
    }

    throw error;
  }
}

function plannedProducts() {
  const products = manifest.products ?? [];

  if (handle) {
    const matched = products.find(
      (product) => product.shopify_handle === handle,
    );

    if (!matched) {
      throw new Error(`Unknown Shopify handle: ${handle}`);
    }

    return [matched];
  }

  if (all) return products;

  const selected = TEST_HANDLES.map((testHandle) =>
    products.find((product) => product.shopify_handle === testHandle),
  ).filter(Boolean);

  if (selected.length >= limit) return selected.slice(0, limit);

  const used = new Set(selected.map((product) => product.shopify_handle));

  for (const product of products) {
    if (selected.length >= limit) break;

    if (!used.has(product.shopify_handle)) {
      selected.push(product);
    }
  }

  return selected;
}

async function main() {
  const ctx = await getCatalogContext();
  const plan = plannedProducts();

  console.log("\n============================================================");
  console.log(" STEREOPHONIE SHOPIFY MIGRATION");
  console.log(execute ? " MODE: EXECUTE" : " MODE: DRY RUN");
  console.log("============================================================");
  console.log(`Manifest products: ${manifest.product_count}`);
  console.log(`Existing Stereophonie products: ${ctx.existingProducts.length}`);
  console.log(`Planned this run: ${plan.length}`);

  let imported = 0;
  let skipped = 0;
  let blocked = 0;
  let failed = 0;

  for (let index = 0; index < plan.length; index += 1) {
    const product = plan[index];
    const category = ctx.categoriesByName.get(
      normalize(product.target_category),
    );
    const brand = resolveBrand(product, ctx);
    const duplicate = duplicateReason(product, ctx);
    const imageCount = product.images.length;

    console.log(`\n[${index + 1}/${plan.length}] ${product.name}`);
    console.log(`  Shopify: ${product.shopify_handle}`);
    console.log(
      `  Status: ${product.source_status} -> draft (supplier review)`,
    );
    console.log(
      `  Category: ${product.target_category}${category ? "" : " [MISSING]"}`,
    );
    console.log(`  Brand: ${brand?.name ?? "UNRESOLVED"}`);
    const hierarchy = configurationHierarchy(product);

    console.log(`  Variants: ${product.variants.length}`);
    console.log(
      `  Hierarchy: ${hierarchy.length > 0 ? hierarchy.join(" -> ") : "none"}`,
    );
    console.log(`  Images: ${product.images.length} -> import ${imageCount}`);

    if (duplicate) {
      console.log(`  SKIP: ${duplicate}`);
      skipped += 1;
      continue;
    }

    if (!category) {
      console.log("  ERROR: target category does not exist.");
      failed += 1;
      continue;
    }

    if (!execute) {
      try {
        validateProductForImport(product);
        console.log("  Preflight: PASS");
        console.log("  DRY RUN: no changes made.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.log(`  Preflight: BLOCKED — ${message}`);
        blocked += 1;
        continue;
      }
      continue;
    }

    try {
      const result = await importOne(product, ctx);
      if (result.status === "skipped") {
        console.log(`  SKIPPED: ${result.reason}`);
        skipped += 1;
      } else {
        console.log(`  IMPORTED: ${result.productId}`);
        console.log(
          `  Stored ${result.variants} variants and ${result.images} physical images.`,
        );
        console.log(`  Image assignments: ${result.imageAssignments}.`);
        console.log(
          `  Hierarchy: ${result.hierarchy.length > 0 ? result.hierarchy.join(" -> ") : "none"}.`,
        );
        imported += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.startsWith("BLOCKED:")) {
        console.log(`  BLOCKED: ${message.slice("BLOCKED:".length).trim()}`);
        blocked += 1;
        continue;
      }

      console.error(`  FAILED: ${message}`);
      failed += 1;
    }
  }

  console.log("\n============================================================");
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Blocked: ${blocked}`);
  console.log(`Failed: ${failed}`);
  if (!execute)
    console.log("Dry run only — database and storage were not changed.");
  console.log("============================================================\n");

  if (failed > 0) process.exitCode = 1;
}

await main();
