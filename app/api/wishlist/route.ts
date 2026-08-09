import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type WishlistRequestBody = {
  action?: unknown;
  productId?: unknown;
  email?: unknown;
  guestAccessToken?: unknown;
  guestItems?: unknown;
};

type GuestSyncItem = {
  productId: string;
  guestAccessToken: string;
};

type ProductImageRow = {
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

type ProductVariantRow = {
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | null;
};

type CategoryRow = {
  name: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  status: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  categories: CategoryRow | CategoryRow[] | null;
  product_images: ProductImageRow[] | null;
  product_variants: ProductVariantRow[] | null;
};

type WishlistRow = {
  product_id: string;
  created_at: string;
  products: ProductRow | ProductRow[] | null;
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

function getCategoryName(value: CategoryRow | CategoryRow[] | null) {
  if (Array.isArray(value)) {
    return value[0]?.name?.trim() || "Collection";
  }

  return value?.name?.trim() || "Collection";
}

function getProduct(value: ProductRow | ProductRow[] | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function parseGuestItems(value: unknown): GuestSyncItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueItems = new Map<string, GuestSyncItem>();

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const submittedItem = item as {
      productId?: unknown;
      guestAccessToken?: unknown;
    };

    const productId =
      typeof submittedItem.productId === "string"
        ? submittedItem.productId.trim()
        : "";

    const guestAccessToken =
      typeof submittedItem.guestAccessToken === "string"
        ? submittedItem.guestAccessToken.trim()
        : "";

    if (!isUuid(productId) || !isUuid(guestAccessToken)) {
      continue;
    }

    uniqueItems.set(productId, {
      productId,
      guestAccessToken,
    });
  }

  return Array.from(uniqueItems.values());
}

async function readRequestBody(request: NextRequest) {
  try {
    return (await request.json()) as WishlistRequestBody;
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      success: true,
      authenticated: false,
      products: [],
    });
  }

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      `
      product_id,
      created_at,
      products (
        id,
        name,
        slug,
        description,
        status,
        is_featured,
        is_trending,
        is_new_arrival,
        categories (
          name
        ),
        product_images (
          image_url,
          alt_text,
          position,
          is_primary
        ),
        product_variants (
          regular_price,
          sale_price,
          stock_quantity,
          availability_status
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Account wishlist could not be loaded:", error);

    return NextResponse.json(
      {
        success: false,
        authenticated: true,
        message: error.message || "Your wishlist could not be loaded.",
        products: [],
      },
      {
        status: 500,
      },
    );
  }

  const rows = (data ?? []) as unknown as WishlistRow[];

  const products = rows.flatMap((row) => {
    const product = getProduct(row.products);

    if (!product || product.status !== "published") {
      return [];
    }

    return [
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryName: getCategoryName(product.categories),
        is_featured: product.is_featured,
        is_trending: product.is_trending,
        is_new_arrival: product.is_new_arrival,
        images: [...(product.product_images ?? [])].sort(
          (first, second) => first.position - second.position,
        ),
        variants: product.product_variants ?? [],
      },
    ];
  });

  return NextResponse.json({
    success: true,
    authenticated: true,
    email: user.email ?? null,
    products,
  });
}

export async function POST(request: NextRequest) {
  const body = await readRequestBody(request);

  if (!body) {
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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (action === "sync") {
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          message: "You must be signed in to synchronize your wishlist.",
        },
        {
          status: 401,
        },
      );
    }

    if (Array.isArray(body.guestItems) && body.guestItems.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many wishlist items were submitted.",
        },
        {
          status: 400,
        },
      );
    }

    const guestItems = parseGuestItems(body.guestItems);

    const { data, error } = await supabase.rpc("merge_guest_wishlist_items", {
      requested_items: guestItems,
    });

    if (error) {
      console.error("Guest wishlist could not be synchronized:", error);

      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          message:
            error.message || "Your guest wishlist could not be synchronized.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      message: "Your wishlist is synchronized.",
      result: data,
    });
  }

  const productId =
    typeof body.productId === "string" ? body.productId.trim() : "";

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

  const isGuest = !user;

  if (isGuest && !submittedEmail) {
    return NextResponse.json(
      {
        success: false,
        requiresEmail: true,
        message:
          "Enter your email address to save this product and receive stock updates.",
      },
      {
        status: 400,
      },
    );
  }

  if (isGuest && !isValidEmail(submittedEmail)) {
    return NextResponse.json(
      {
        success: false,
        requiresEmail: true,
        message: "Please enter a valid email address.",
      },
      {
        status: 400,
      },
    );
  }

  const { data, error } = await supabase.rpc("add_wishlist_item", {
    requested_product_id: productId,
    requested_email: isGuest ? submittedEmail : null,
  });

  if (error) {
    console.error("Wishlist item could not be added:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "The product could not be added to your wishlist.",
      },
      {
        status: 400,
      },
    );
  }

  const result = typeof data === "object" && data !== null ? data : null;

  return NextResponse.json({
    success: true,
    authenticated: !isGuest,
    source: isGuest ? "guest" : "account",
    email:
      result && "email" in result
        ? result.email
        : (user?.email ?? submittedEmail),
    guestAccessToken:
      result && "guest_access_token" in result
        ? result.guest_access_token
        : null,
    message: "The product was added to your wishlist.",
    result,
  });
}

export async function DELETE(request: NextRequest) {
  const body = await readRequestBody(request);

  if (!body) {
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

  const submittedEmail =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const guestAccessToken =
    typeof body.guestAccessToken === "string"
      ? body.guestAccessToken.trim()
      : "";

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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  if (isGuest && (!isValidEmail(submittedEmail) || !isUuid(guestAccessToken))) {
    return NextResponse.json(
      {
        success: false,
        message: "The guest wishlist information is invalid.",
      },
      {
        status: 400,
      },
    );
  }

  const { data, error } = await supabase.rpc("remove_wishlist_item", {
    requested_product_id: productId,
    requested_email: isGuest ? submittedEmail : null,
    requested_guest_token: isGuest ? guestAccessToken : null,
  });

  if (error) {
    console.error("Wishlist item could not be removed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "The product could not be removed from your wishlist.",
      },
      {
        status: 400,
      },
    );
  }

  return NextResponse.json({
    success: true,
    message: "The product was removed from your wishlist.",
    result: data,
  });
}
