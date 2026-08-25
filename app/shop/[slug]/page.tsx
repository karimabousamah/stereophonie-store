import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Gamepad2,
  PackageCheck,
  ShieldCheck,
  Truck,
  Undo2,
  Zap,
} from "lucide-react";

import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";
import { createClient } from "@/lib/supabase/server";

import ProductGallery from "./product-gallery";
import ProductPurchaseControls from "./product-purchase-controls";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    notify?: string;
  }>;
};

type ProductImage = {
  id: string;
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;

  /*
   * NULL / blank = shared photograph.
   * A populated value means the photograph belongs to one
   * exact sellable configuration.
   */
  variant_name: string | null;
  is_variant_primary: boolean | null;
  variant_position: number | null;
  variant_id: string | null;
};

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type ProductVariant = {
  id: string;
  size: string;
  variant_name: string | null;
  display_position: number | null;
  attributes: Record<string, string> | null;
  sku: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus;
};

type Relation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

function relationName(relation: Relation, fallback: string) {
  if (!relation) {
    return fallback;
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() || fallback;
  }

  return relation.name?.trim() || fallback;
}

function lowestPrices(variants: ProductVariant[]) {
  const prices = variants
    .map((variant) => {
      const regular =
        typeof variant.regular_price === "number"
          ? variant.regular_price
          : null;

      const sale =
        typeof variant.sale_price === "number" ? variant.sale_price : null;

      if (sale !== null && regular !== null && sale > 0 && sale < regular) {
        return {
          current: sale,
          regular,
          sale: true,
        };
      }

      if (regular !== null && regular > 0) {
        return {
          current: regular,
          regular,
          sale: false,
        };
      }

      return null;
    })
    .filter(
      (
        price,
      ): price is {
        current: number;
        regular: number;
        sale: boolean;
      } => Boolean(price),
    )
    .sort((first, second) => first.current - second.current);

  return prices[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      `
        name,
        description,
        status,
        categories ( name ),
        brands ( name ),
        product_images (
          image_url,
          position,
          is_primary
        )
      `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!product) {
    return {
      title: "Product | Stereophonie",
      description: "Explore electronics and technology at Stereophonie.",
    };
  }

  const brand = relationName(product.brands as Relation, "");
  const category = relationName(product.categories as Relation, "Technology");

  const title = [product.name, brand, "Stereophonie"]
    .filter(Boolean)
    .join(" | ");

  const description =
    product.description?.trim() ||
    `Shop ${product.name} in ${category} at Stereophonie.`;

  const images = (
    (product.product_images as {
      image_url: string | null;
      position: number;
      is_primary: boolean;
    }[]) ?? []
  )
    .filter((image) => Boolean(image.image_url))
    .sort((first, second) => {
      if (first.is_primary !== second.is_primary) {
        return first.is_primary ? -1 : 1;
      }

      return first.position - second.position;
    });

  const primaryImage = images[0]?.image_url ?? undefined;

  return {
    title,
    description: description.slice(0, 160),

    openGraph: {
      title,
      description: description.slice(0, 200),
      type: "website",
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        description,
        status,
        is_featured,
        is_trending,
        is_new_arrival,
        category_id,
        brand_id,
        collection_id,

        categories (
          name
        ),

        brands (
          name
        ),

        collections (
          name
        ),

        product_images (
          id,
          image_url,
          alt_text,
          position,
          is_primary,
          variant_name,
          variant_id,
          variant_position,
          is_variant_primary
        ),

        product_variants (
          id,
          size,
          variant_name,
          display_position,
          attributes,
          sku,
          regular_price,
          sale_price,
          stock_quantity,
          low_stock_threshold,
          availability_status
        )
      `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !product) {
    notFound();
  }

  /*
   * Stable non-null references for recommendation helpers.
   * TypeScript does not always preserve Supabase narrowing
   * inside nested functions, so capture the verified values.
   */
  const currentProductName = product.name;
  const currentProductBrandId = product.brand_id;
  const currentProductCategoryId = product.category_id;
  const currentProductCollectionId = product.collection_id;

  const images = ((product.product_images as ProductImage[]) ?? []).sort(
    (first, second) => first.position - second.position,
  );

  const primary = images.find((image) => image.is_primary) ?? images[0] ?? null;

  const galleryImages = primary
    ? [primary, ...images.filter((image) => image.id !== primary.id)]
    : images;

  const variants = ((product.product_variants as ProductVariant[]) ?? []).sort(
    (first, second) => {
      const firstPosition =
        Number(
          first.display_position ??
          0,
        );

      const secondPosition =
        Number(
          second.display_position ??
          0,
        );

      if (
        firstPosition !==
        secondPosition
      ) {
        return (
          firstPosition -
          secondPosition
        );
      }

      return (
        first.variant_name?.trim() ||
        first.size ||
        ""
      ).localeCompare(
        second.variant_name?.trim() ||
        second.size ||
        "",
        undefined,
        {
          numeric: true,
        },
      );
    },
  );

  const price = lowestPrices(variants);

  const brandName = relationName(
    product.brands as Relation,
    "Stereophonie Select",
  );

  const categoryName = relationName(
    product.categories as Relation,
    "Technology",
  );

  const collectionName = relationName(
    product.collections as Relation,
    categoryName,
  );

  const available = variants.some(
    (variant) =>
      variant.stock_quantity > 0 &&
      (variant.availability_status === "in_stock" ||
        variant.availability_status === "low_stock"),
  );

  const firstAttributes =
    variants.find(
      (variant) => variant.attributes && typeof variant.attributes === "object",
    )?.attributes ?? {};

  /*
   * ============================================================
   * SMART "YOU MAY ALSO LIKE" ENGINE
   *
   * Priority:
   * 1. Directly compatible accessories
   * 2. Same-brand ecosystem products
   * 3. Logical complementary categories
   * 4. Same collection
   * 5. Same-category alternatives
   *
   * Only available products are recommended.
   * ============================================================
   */

  const normalizeRecommendationText = (value: unknown) =>
    String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const recommendationSourceText =
    normalizeRecommendationText(
      [
        currentProductName,
        product.description ?? "",
        brandName,
        categoryName,
        collectionName,
      ].join(" "),
    );

  const sourceIsPhone =
    /\b(phone|iphone|smartphone|mobile)\b/.test(
      recommendationSourceText,
    );

  const sourceIsLaptop =
    /\b(laptop|macbook|notebook|computer|pc)\b/.test(
      recommendationSourceText,
    );

  const sourceIsTablet =
    /\b(tablet|ipad|galaxy tab)\b/.test(
      recommendationSourceText,
    );

  const sourceIsWatch =
    /\b(watch|smartwatch|apple watch|fitness watch)\b/.test(
      recommendationSourceText,
    );

  const sourceIsGaming =
    /\b(playstation|ps5|xbox|nintendo|switch|console|gaming)\b/.test(
      recommendationSourceText,
    );

  const sourceIsCamera =
    /\b(camera|gopro|photography|instax|polaroid)\b/.test(
      recommendationSourceText,
    );

  const sourceIsAudio =
    /\b(airpods|earphones|earbuds|headphones|headset|speaker|audio)\b/.test(
      recommendationSourceText,
    );


  /*
   * ============================================================
   * STEREOPHONIE — SMART AUTOMATED CROSS-SELL ENGINE
   * ============================================================
   *
   * Recommendation priority:
   *
   * 1. Exact compatibility
   * 2. Directly complementary accessories
   * 3. Same ecosystem when commercially relevant
   * 4. Same product family / sensible alternatives
   * 5. Same collection
   * 6. Same category
   *
   * Unrelated catalogue products receive strong penalties.
   *
   * IMPORTANT:
   * We deliberately do NOT fill all four recommendation slots
   * when the catalogue contains no sensible recommendation.
   *
   * A Xiaomi scooter should never receive a random iPhone simply
   * because four cards need to be rendered.
   * ============================================================
   */

  

  function recommendationTokens(
    value: unknown,
  ) {
    return normalizeRecommendationText(
      value,
    )
      .split(" ")
      .filter(Boolean);
  }

  function relationRecommendationName(
    value: unknown,
  ) {
    if (!value) {
      return "";
    }

    if (Array.isArray(value)) {
      const first =
        value[0] as {
          name?: unknown;
        } | undefined;

      return normalizeRecommendationText(
        first?.name,
      );
    }

    if (
      typeof value === "object"
    ) {
      return normalizeRecommendationText(
        (
          value as {
            name?: unknown;
          }
        ).name,
      );
    }

    return "";
  }

  function flattenRecommendationAttributes(
    variantsValue: unknown,
  ) {
    if (!Array.isArray(variantsValue)) {
      return "";
    }

    const values: string[] = [];

    for (const variant of variantsValue) {
      if (
        !variant ||
        typeof variant !== "object"
      ) {
        continue;
      }

      const attributes =
        (
          variant as {
            attributes?: unknown;
          }
        ).attributes;

      if (
        !attributes ||
        typeof attributes !== "object" ||
        Array.isArray(attributes)
      ) {
        continue;
      }

      for (
        const [key, value]
        of Object.entries(
          attributes as Record<
            string,
            unknown
          >,
        )
      ) {
        values.push(
          key,
          String(value ?? ""),
        );
      }
    }

    return normalizeRecommendationText(
      values.join(" "),
    );
  }

  type RecommendationFamily =
    | "phone"
    | "tablet"
    | "laptop"
    | "desktop"
    | "watch"
    | "audio"
    | "gaming"
    | "camera"
    | "mobility"
    | "networking"
    | "accessory"
    | "other";

  function recommendationFamily(
    textValue: string,
  ): RecommendationFamily {
    const value =
      normalizeRecommendationText(
        textValue,
      );

    if (
      /\b(scooter|electric scooter|e scooter|escooter|mobility|hoverboard|e bike|ebike|electric bike)\b/.test(
        value,
      )
    ) {
      return "mobility";
    }

    if (
      /\b(iphone|smartphone|mobile phone|phone|galaxy s\d|pixel phone)\b/.test(
        value,
      )
    ) {
      return "phone";
    }

    if (
      /\b(ipad|tablet|galaxy tab|surface tablet)\b/.test(
        value,
      )
    ) {
      return "tablet";
    }

    if (
      /\b(macbook|laptop|notebook|ultrabook)\b/.test(
        value,
      )
    ) {
      return "laptop";
    }

    if (
      /\b(desktop|imac|pc tower|all in one|mini pc)\b/.test(
        value,
      )
    ) {
      return "desktop";
    }

    if (
      /\b(apple watch|smartwatch|smart watch|fitness watch|watch)\b/.test(
        value,
      )
    ) {
      return "watch";
    }

    if (
      /\b(airpods|earbuds|earphones|headphones|headset|speaker|soundbar|audio)\b/.test(
        value,
      )
    ) {
      return "audio";
    }

    if (
      /\b(playstation|ps5|ps4|xbox|nintendo|switch|gaming|video game|controller|console)\b/.test(
        value,
      )
    ) {
      return "gaming";
    }

    if (
      /\b(camera|dslr|mirrorless|gopro|action camera|lens)\b/.test(
        value,
      )
    ) {
      return "camera";
    }

    if (
      /\b(router|mesh|wifi|wi fi|networking|ethernet|access point|range extender|switch network)\b/.test(
        value,
      )
    ) {
      return "networking";
    }

    if (
      /\b(case|cover|coque|screen protector|charger|charging|cable|adapter|power bank|dock|hub|stand|mount|holder|strap|band|bag|sleeve|keyboard|mouse|stylus|pencil|tripod|memory card|microphone)\b/.test(
        value,
      )
    ) {
      return "accessory";
    }

    return "other";
  }

  const sourceVariantAttributes =
    normalizeRecommendationText(
      variants
        .map(
          (variant) =>
            Object.entries(
              variant.attributes ?? {},
            )
              .flatMap(
                ([key, value]) => [
                  key,
                  String(
                    value ?? "",
                  ),
                ],
              )
              .join(" "),
        )
        .join(" "),
    );

  const sourceRecommendationText =
    normalizeRecommendationText(
      [
        currentProductName,
        brandName,
        categoryName,
        collectionName,
        product.description ?? "",
        sourceVariantAttributes,
      ].join(" "),
    );

  const sourceFamily =
    recommendationFamily(
      sourceRecommendationText,
    );

  /*
   * Model tokens intentionally preserve numbers.
   *
   * Examples:
   *
   * iPhone 17 Pro
   * Galaxy S26 Ultra
   * iPad Pro 13
   */
  const ignoredRecommendationTokens =
    new Set([
      "apple",
      "samsung",
      "xiaomi",
      "sony",
      "huawei",
      "phone",
      "smartphone",
      "tablet",
      "laptop",
      "desktop",
      "watch",
      "smartwatch",
      "electric",
      "scooter",
      "gaming",
      "audio",
      "camera",
      "product",
      "with",
      "and",
      "for",
      "the",
      "new",
    ]);

  const sourceModelTokens =
    recommendationTokens(
      currentProductName,
    ).filter(
      (token) =>
        token.length >= 2 &&
        !ignoredRecommendationTokens.has(
          token,
        ),
    );

  const genericAccessoryWords =
    /\b(case|cover|coque|screen protector|charger|charging|cable|adapter|power bank|dock|hub|stand|mount|holder|strap|band|bag|sleeve|keyboard|mouse|stylus|pencil|tripod|memory card|microphone|controller|headset)\b/;

  function complementaryScore(
    source:
      RecommendationFamily,
    candidateText: string,
    candidateFamily:
      RecommendationFamily,
  ) {
    switch (source) {
      case "phone":
        if (
          /\b(case|cover|coque|screen protector|charger|cable|adapter|power bank|airpods|earbuds|earphones|headphones|smartwatch|watch|car mount|holder)\b/.test(
            candidateText,
          )
        ) {
          return 58;
        }

        return 0;

      case "tablet":
        if (
          /\b(case|cover|keyboard|stylus|pencil|stand|charger|cable|adapter|airpods|earphones|headphones|mouse)\b/.test(
            candidateText,
          )
        ) {
          return 58;
        }

        return 0;

      case "laptop":
        if (
          /\b(mouse|keyboard|charger|adapter|cable|hub|dock|monitor|screen|headphones|headset|earphones|bag|sleeve|stand)\b/.test(
            candidateText,
          )
        ) {
          return 55;
        }

        return 0;

      case "desktop":
        if (
          /\b(mouse|keyboard|monitor|screen|headset|headphones|speaker|webcam|microphone|cable|adapter|ups)\b/.test(
            candidateText,
          )
        ) {
          return 54;
        }

        return 0;

      case "watch":
        if (
          /\b(strap|band|charger|charging|case|cover|screen protector|phone|iphone|earbuds|earphones|airpods)\b/.test(
            candidateText,
          )
        ) {
          return 52;
        }

        return 0;

      case "audio":
        if (
          /\b(case|cover|charger|charging|cable|adapter|stand|phone|tablet|laptop|computer)\b/.test(
            candidateText,
          )
        ) {
          return 38;
        }

        return 0;

      case "gaming":
        if (
          /\b(controller|headset|headphones|gaming mouse|gaming keyboard|keyboard|mouse|monitor|video game|game|charger|cable|stand)\b/.test(
            candidateText,
          )
        ) {
          return 56;
        }

        return 0;

      case "camera":
        if (
          /\b(tripod|memory card|microphone|mic|bag|case|battery|charger|cable|adapter|mount|gimbal)\b/.test(
            candidateText,
          )
        ) {
          return 56;
        }

        return 0;

      case "mobility":
        if (
          /\b(helmet|lock|phone holder|phone mount|mount|bag|pump|light|lights|reflector|charger|charging|tire|tyre|inner tube|scooter accessory|electric scooter accessory)\b/.test(
            candidateText,
          )
        ) {
          return 62;
        }

        /*
         * Another scooter is a sensible alternative,
         * although weaker than a complementary accessory.
         */
        if (
          candidateFamily ===
          "mobility"
        ) {
          return 24;
        }

        return 0;

      case "networking":
        if (
          /\b(ethernet|cable|switch|access point|range extender|mesh|router|adapter|wifi|wi fi)\b/.test(
            candidateText,
          )
        ) {
          return 48;
        }

        return 0;

      default:
        return 0;
    }
  }

  function incompatiblePenalty(
    source:
      RecommendationFamily,
    candidate:
      RecommendationFamily,
    candidateText: string,
  ) {
    if (
      source === "other" ||
      candidate === "other" ||
      candidate === "accessory"
    ) {
      return 0;
    }

    /*
     * These cross-family combinations are almost never useful
     * merchandising recommendations without an explicit
     * compatibility signal.
     */
    const stronglyUnrelated =
      new Set([
        "mobility:phone",
        "mobility:tablet",
        "mobility:laptop",
        "mobility:desktop",
        "mobility:gaming",
        "mobility:camera",
        "phone:mobility",
        "tablet:mobility",
        "laptop:mobility",
        "desktop:mobility",
        "gaming:mobility",
        "camera:mobility",
        "networking:watch",
        "networking:camera",
        "watch:networking",
      ]);

    if (
      stronglyUnrelated.has(
        `${source}:${candidate}`,
      )
    ) {
      return -90;
    }

    /*
     * Generic unrelated device families get a lighter penalty.
     */
    if (
      source !== candidate &&
      !genericAccessoryWords.test(
        candidateText,
      )
    ) {
      return -24;
    }

    return 0;
  }

  function recommendationCompatibilityScore(
    item: any,
  ) {
    const candidateBrandName =
      relationRecommendationName(
        item.brands,
      );

    const candidateCategoryName =
      relationRecommendationName(
        item.categories,
      );

    const candidateAttributes =
      flattenRecommendationAttributes(
        item.product_variants,
      );

    const candidateText =
      normalizeRecommendationText(
        [
          item.name,
          item.description ?? "",
          candidateBrandName,
          candidateCategoryName,
          candidateAttributes,
        ].join(" "),
      );

    const candidateFamily =
      recommendationFamily(
        candidateText,
      );

    let score = 0;

    /*
     * ------------------------------------------------------------
     * 1. EXACT / EXPLICIT COMPATIBILITY
     * ------------------------------------------------------------
     */

    const normalizedSourceName =
      normalizeRecommendationText(
        currentProductName,
      );

    if (
      normalizedSourceName &&
      candidateText.includes(
        normalizedSourceName,
      )
    ) {
      score += 130;
    }

    /*
     * Configuration attributes can explicitly contain:
     *
     * compatibility: iPhone 17 Pro
     * model: iPhone 17 Pro
     *
     * Candidate variant attributes are now part of candidateText.
     */
    if (
      normalizedSourceName &&
      candidateAttributes.includes(
        normalizedSourceName,
      )
    ) {
      score += 140;
    }

    const matchingModelTokens =
      sourceModelTokens.filter(
        (token) =>
          candidateText.includes(
            token,
          ),
      ).length;

    if (
      genericAccessoryWords.test(
        candidateText,
      ) &&
      matchingModelTokens >= 3
    ) {
      score += 85;
    } else if (
      genericAccessoryWords.test(
        candidateText,
      ) &&
      matchingModelTokens === 2
    ) {
      score += 62;
    } else if (
      genericAccessoryWords.test(
        candidateText,
      ) &&
      matchingModelTokens === 1
    ) {
      score += 24;
    }

    /*
     * ------------------------------------------------------------
     * 2. COMPLEMENTARY PRODUCT RELATIONSHIP
     * ------------------------------------------------------------
     */

    score +=
      complementaryScore(
        sourceFamily,
        candidateText,
        candidateFamily,
      );

    /*
     * ------------------------------------------------------------
     * 3. PRODUCT FAMILY
     * ------------------------------------------------------------
     *
     * A same-family product is a sensible alternative.
     */
    if (
      sourceFamily !== "other" &&
      candidateFamily ===
        sourceFamily
    ) {
      score += 28;
    }

    /*
     * ------------------------------------------------------------
     * 4. BRAND / ECOSYSTEM
     * ------------------------------------------------------------
     *
     * Brand is useful, but NEVER powerful enough on its own to
     * make an unrelated device appear.
     */
    const sameBrand =
      Boolean(
        currentProductBrandId,
      ) &&
      item.brand_id ===
        currentProductBrandId;

    if (sameBrand) {
      if (
        sourceFamily ===
          candidateFamily
      ) {
        score += 28;
      } else if (
        complementaryScore(
          sourceFamily,
          candidateText,
          candidateFamily,
        ) > 0
      ) {
        score += 24;
      } else {
        /*
         * Same brand but unrelated product:
         * tiny ecosystem tie-breaker only.
         */
        score += 6;
      }
    }

    /*
     * ------------------------------------------------------------
     * 5. COLLECTION / CATEGORY
     * ------------------------------------------------------------
     */

    if (
      currentProductCollectionId &&
      item.collection_id ===
        currentProductCollectionId
    ) {
      score += 18;
    }

    if (
      currentProductCategoryId &&
      item.category_id ===
        currentProductCategoryId
    ) {
      score += 16;
    }

    /*
     * ------------------------------------------------------------
     * 6. NEGATIVE RELEVANCE
     * ------------------------------------------------------------
     */

    score +=
      incompatiblePenalty(
        sourceFamily,
        candidateFamily,
        candidateText,
      );

    /*
     * ------------------------------------------------------------
     * 7. MERCHANDISING TIE BREAKERS
     * ------------------------------------------------------------
     *
     * These cannot rescue an irrelevant recommendation.
     */

    if (item.is_featured) {
      score += 3;
    }

    if (item.is_trending) {
      score += 2;
    }

    if (item.is_new_arrival) {
      score += 2;
    }

    return {
      score,
      candidateFamily,
      sameBrand,
      candidateText,
    };
  }

  function isCandidateAvailable(
    item: any,
  ) {
    const candidateVariants =
      Array.isArray(
        item.product_variants,
      )
        ? item.product_variants
        : [];

    return candidateVariants.some(
      (variant: any) =>
        Number(
          variant.stock_quantity ??
            0,
        ) > 0 &&
        (
          variant.availability_status ===
            "in_stock" ||
          variant.availability_status ===
            "low_stock"
        ),
    );
  }

  const {
    data: relatedData,
    error: relatedError,
  } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        description,
        status,
        category_id,
        brand_id,
        collection_id,
        is_featured,
        is_trending,
        is_new_arrival,

        categories (
          name
        ),

        brands (
          name
        ),

        product_images (
          image_url,
          alt_text,
          position,
          is_primary,
          variant_id,
          variant_position,
          is_variant_primary
        ),

        product_variants (
          regular_price,
          sale_price,
          stock_quantity,
          size,
          variant_name,
          display_position,
          attributes,
          availability_status
        )
      `,
    )
    .eq(
      "status",
      "published",
    )
    .neq(
      "id",
      product.id,
    )
    .limit(120);

  if (relatedError) {
    console.error(
      "Related products could not be loaded:",
      relatedError,
    );
  }

  const scoredRelatedProducts =
    (
      (
        relatedData ??
        []
      ) as any[]
    )
      .filter(
        isCandidateAvailable,
      )
      .map(
        (item) => {
          const relevance =
            recommendationCompatibilityScore(
              item,
            );

          return {
            ...relevance,
            item,
          };
        },
      )
      .sort(
        (
          first,
          second,
        ) => {
          if (
            first.score !==
            second.score
          ) {
            return (
              second.score -
              first.score
            );
          }

          /*
           * Same-brand products only win ties after relevance
           * has already been established.
           */
          if (
            first.sameBrand !==
            second.sameBrand
          ) {
            return first.sameBrand
              ? -1
              : 1;
          }

          return String(
            first.item.name ?? "",
          ).localeCompare(
            String(
              second.item.name ??
                "",
            ),
          );
        },
      );

  /*
   * Minimum relevance threshold.
   *
   * This is one of the most important parts of the engine.
   *
   * If the catalogue has:
   *
   * Xiaomi Scooter
   * iPhone 17
   * iPhone 17 Case
   *
   * the engine will NOT recommend the iPhones simply because
   * there is empty space.
   */
  const strongRecommendations =
    scoredRelatedProducts.filter(
      (candidate) =>
        candidate.score >= 24,
    );

  /*
   * Prefer complementary items before alternatives when their
   * relevance scores are close.
   *
   * This improves cross-selling:
   *
   * iPhone
   * → compatible case
   * → AirPods
   * → Apple Watch
   * → another iPhone only afterwards
   */
  const diversifiedRecommendations: typeof strongRecommendations =
    [];

  const usedFamilies =
    new Map<
      RecommendationFamily,
      number
    >();

  for (
    const candidate
    of strongRecommendations
  ) {
    if (
      diversifiedRecommendations.length >=
      4
    ) {
      break;
    }

    const familyCount =
      usedFamilies.get(
        candidate.candidateFamily,
      ) ?? 0;

    /*
     * Avoid filling all four cards with almost identical
     * alternatives when complementary items exist.
     */
    if (
      familyCount >= 2 &&
      strongRecommendations.some(
        (other) =>
          other !== candidate &&
          (
            usedFamilies.get(
              other.candidateFamily,
            ) ?? 0
          ) === 0 &&
          other.score >=
            candidate.score - 14,
      )
    ) {
      continue;
    }

    diversifiedRecommendations.push(
      candidate,
    );

    usedFamilies.set(
      candidate.candidateFamily,
      familyCount + 1,
    );
  }

  const relatedProducts =
    diversifiedRecommendations
      .slice(0, 4)
      .map(
        ({ item }) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,

          description:
            item.description ??
            null,

          categoryName:
            relationName(
              item.categories as Relation,
              "Technology",
            ),

          is_featured:
            item.is_featured,

          is_trending:
            item.is_trending,

          is_new_arrival:
            item.is_new_arrival,

          images:
            item.product_images ??
            [],

          variants:
            item.product_variants ??
            [],
        }),
      );

  return (
    <>
      <V3Header />

      <main className="st-product-v5">
        <div className="st-product-v5__shell">
          <nav className="st-product-v5__breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/shop">Shop</Link>
            <span>/</span>
            <strong>{product.name}</strong>
          </nav>

          <header className="st-product-v5__intro">
            <div>
              <span className="st-product-v5__category">
                {brandName} · {categoryName}
              </span>

              <h1>{product.name}</h1>
            </div>

            <div className="st-product-v5__intro-meta">
              {price ? (
                <div className="st-product-v5__price">
                  <strong>
                    ${price.current.toFixed(2)}
                  </strong>

                  {price.sale ? (
                    <del>
                      ${price.regular.toFixed(2)}
                    </del>
                  ) : null}
                </div>
              ) : (
                <div className="st-product-v5__price">
                  <strong>Contact us</strong>
                </div>
              )}

              <span
                className={`st-product-v5__availability ${
                  available ? "is-available" : ""
                }`}
              >
                <i />
                {available ? "In stock" : "Unavailable"}
              </span>
            </div>
          </header>

          <section className="st-product-v5__gallery">
            <ProductGallery
              productName={product.name}
              images={galleryImages}
            />
          </section>

          <section className="st-product-v5__buy">
            <header className="st-product-v5__buy-heading">
              <div>
                <span>Purchase</span>
                <h2>Choose your options.</h2>
              </div>

              <small>
                Ref. {product.id.slice(0, 8).toUpperCase()}
              </small>
            </header>

            <ProductPurchaseControls
              product={{
                id: product.id,
                slug: product.slug ?? slug,
                name: product.name,
                imageUrl: primary?.image_url ?? null,
                description: product.description ?? null,
                categoryName,
                is_featured: product.is_featured,
                is_trending: product.is_trending,
                is_new_arrival: product.is_new_arrival,

                images: galleryImages.map((image) => ({
                  image_url: image.image_url,
                  alt_text: image.alt_text,
                  position: image.position,
                  is_primary: image.is_primary,
                })),

                variants: variants.map((variant) => ({
                  regular_price: variant.regular_price,
                  sale_price: variant.sale_price,
                  stock_quantity: variant.stock_quantity,
                  availability_status: variant.availability_status,
                })),
              }}
              variants={variants}
              openStockNotification={query.notify === "1"}
            />
          </section>

          <section className="st-product-v5__details">
            <div className="st-product-v5__description">
              <span>Product details</span>

              <h2>Product overview.</h2>

              <p>
                {product.description ||
                  `${product.name} by ${brandName}.`}
              </p>

              <dl className="st-product-v5__basic-info">
                <div>
                  <dt>Brand</dt>
                  <dd>{brandName}</dd>
                </div>

                <div>
                  <dt>Category</dt>
                  <dd>{categoryName}</dd>
                </div>

                <div>
                  <dt>Collection</dt>
                  <dd>{collectionName}</dd>
                </div>
              </dl>
            </div>

            <div className="st-product-v5__specifications">
              <span>Specifications</span>

              <h2>Specifications.</h2>

              {Object.keys(firstAttributes).length ? (
                <dl>
                  {Object.entries(firstAttributes)
                    .slice(0, 12)
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>
                          {key
                            .replace(/[_-]+/g, " ")
                            .replace(/\b\w/g, (character) =>
                              character.toUpperCase(),
                            )}
                        </dt>

                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p>
                  Technical information will appear
                  when a configuration is available.
                </p>
              )}
            </div>
          </section>

          <section className="st-product-v5__services">
            <Link href="/delivery">
              <Truck />

              <div>
                <strong>Delivery</strong>
                <span>View delivery information</span>
              </div>

              <ArrowRight />
            </Link>

            <Link href="/returns">
              <Undo2 />

              <div>
                <strong>Returns</strong>
                <span>View returns policy</span>
              </div>

              <ArrowRight />
            </Link>

            <div>
              <ShieldCheck />

              <div>
                <strong>Secure checkout</strong>
                <span>Protected ordering</span>
              </div>
            </div>
          </section>

          {relatedProducts.length ? (
            <section className="st-product-v5__related">
              <header>
                <div>
                  <span>Recommended</span>
                  <h2>You may also like.</h2>
                </div>

                <Link href="/shop">
                  View all
                  <ArrowRight />
                </Link>
              </header>

              <div className="st-related-products-grid st-product-v5__related-grid">
                {relatedProducts.map(
                  (relatedProduct, index) => (
                    <V2ProductCard
                      key={relatedProduct.id}
                      product={relatedProduct}
                      index={index}
                    />
                  ),
                )}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <V3Footer />
    </>
  );
}
