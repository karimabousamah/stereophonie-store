import { type NextRequest, NextResponse } from "next/server";

import {
  loadShopProductBatch,
  SHOP_PRODUCTS_PER_BATCH,
} from "@/lib/storefront-shop-loader";
import {
  shopSelectedAvailability,
  shopSelectedPrice,
  shopSelectedSort,
} from "@/lib/storefront-shop-catalog";

export const dynamic = "force-dynamic";

function nonNegativeInteger(
  value: string | null,
  fallback: number,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  const parameters = request.nextUrl.searchParams;

  const search =
    parameters.get("search")?.trim() ||
    parameters.get("q")?.trim() ||
    "";

  const category = parameters.get("category")?.trim() ?? "";

  const offers =
    parameters.get("offers")?.trim().toLowerCase() === "true";

  const brand = parameters.get("brand")?.trim() ?? "";

  const availability = shopSelectedAvailability(
    parameters.get("availability")?.trim().toLowerCase() ?? "",
  );

  const requestedMinimumPrice = shopSelectedPrice(
    parameters.get("minPrice") ?? "",
  );

  const requestedMaximumPrice = shopSelectedPrice(
    parameters.get("maxPrice") ?? "",
  );

  const sort = shopSelectedSort(
    parameters.get("sort")?.trim().toLowerCase() ?? "",
  );

  const offset = nonNegativeInteger(
    parameters.get("offset"),
    0,
  );

  const limit = Math.max(
    1,
    nonNegativeInteger(
      parameters.get("limit"),
      SHOP_PRODUCTS_PER_BATCH,
    ),
  );

  const result = await loadShopProductBatch({
    filters: {
      search,
      category,
      offers,
      brand,
      availability,
      requestedMinimumPrice,
      requestedMaximumPrice,
      sort,
    },
    offset,
    limit,
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
