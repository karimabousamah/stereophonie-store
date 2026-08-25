import Link from "next/link";

export type V3ProductImage = {
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

export type V3ProductVariant = {
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  size?: string | null;
  variant_name?: string | null;
  attributes?: Record<string, unknown> | null;
  is_active?: boolean | null;
  availability_status:
    | "in_stock"
    | "low_stock"
    | "out_of_stock"
    | "coming_soon"
    | null;
};

export type V3Product = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categoryName: string;
  brandName: string;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
  created_at: string | null;
  images: V3ProductImage[];
  variants: V3ProductVariant[];
};

function numberValue(value: unknown) {
  const parsed =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function activeVariants(product: V3Product) {
  return product.variants.filter(
    (variant) => variant.is_active !== false,
  );
}

function variantPrice(variant: V3ProductVariant) {
  const regular = numberValue(variant.regular_price);
  const sale = numberValue(variant.sale_price);

  if (
    regular > 0 &&
    sale > 0 &&
    sale < regular
  ) {
    return sale;
  }

  return regular;
}

function lowestPrice(product: V3Product) {
  const prices = activeVariants(product)
    .map(variantPrice)
    .filter((price) => price > 0);

  if (!prices.length) {
    return null;
  }

  return Math.min(...prices);
}

function lowestRegularPrice(product: V3Product) {
  const prices = activeVariants(product)
    .map((variant) =>
      numberValue(variant.regular_price),
    )
    .filter((price) => price > 0);

  if (!prices.length) {
    return null;
  }

  return Math.min(...prices);
}

export function isProductOnOffer(
  product: V3Product,
) {
  return activeVariants(product).some(
    (variant) => {
      const regular = numberValue(
        variant.regular_price,
      );

      const sale = numberValue(
        variant.sale_price,
      );

      return (
        regular > 0 &&
        sale > 0 &&
        sale < regular
      );
    },
  );
}

export function isCurrentNewDrop(
  product: V3Product,
) {
  if (
    !product.is_new_arrival ||
    !product.new_drop_started_at
  ) {
    return false;
  }

  const started = new Date(
    product.new_drop_started_at,
  ).getTime();

  if (!Number.isFinite(started)) {
    return false;
  }

  const sevenDays =
    7 * 24 * 60 * 60 * 1000;

  const age = Date.now() - started;

  return age >= 0 && age < sevenDays;
}

function productImage(product: V3Product) {
  const available = product.images
    .filter((image) => image.image_url)
    .sort((first, second) => {
      if (
        first.is_primary !==
        second.is_primary
      ) {
        return first.is_primary ? -1 : 1;
      }

      return (
        (first.position ?? 0) -
        (second.position ?? 0)
      );
    });

  return available[0] ?? null;
}

function productAvailability(
  product: V3Product,
) {
  const variants = activeVariants(product);

  if (!variants.length) {
    return "Unavailable";
  }

  if (
    variants.some(
      (variant) =>
        variant.availability_status ===
          "in_stock" ||
        variant.availability_status ===
          "low_stock" ||
        variant.stock_quantity > 0,
    )
  ) {
    return "Available";
  }

  if (
    variants.some(
      (variant) =>
        variant.availability_status ===
        "coming_soon",
    )
  ) {
    return "Coming soon";
  }

  return "Out of stock";
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function V3ProductCard({
  product,
}: {
  product: V3Product;
}) {
  const image = productImage(product);
  const price = lowestPrice(product);
  const regularPrice =
    lowestRegularPrice(product);
  const onOffer = isProductOnOffer(product);
  const newDrop = isCurrentNewDrop(product);

  const href = product.slug
    ? `/shop/${product.slug}`
    : `/shop`;

  return (
    <article className="st3-product-card">
      <Link
        href={href}
        className="st3-product-card__media"
        aria-label={`View ${product.name}`}
      >
        <div className="st3-product-card__badges">
          {newDrop ? (
            <span className="st3-product-card__badge">
              New
            </span>
          ) : null}

          {onOffer ? (
            <span className="st3-product-card__badge st3-product-card__badge--offer">
              Offer
            </span>
          ) : null}
        </div>

        {image?.image_url ? (
          <img
            src={image.image_url}
            alt={
              image.alt_text ||
              product.name
            }
            className="st3-product-card__image"
            loading="lazy"
          />
        ) : (
          <div className="st3-product-card__placeholder">
            <span>Stereophonie</span>
          </div>
        )}
      </Link>

      <div className="st3-product-card__content">
        <div className="st3-product-card__meta">
          {product.brandName ||
            product.categoryName}
        </div>

        <Link
          href={href}
          className="st3-product-card__name"
        >
          {product.name}
        </Link>

        <div className="st3-product-card__bottom">
          <div className="st3-product-card__pricing">
            {price !== null ? (
              <>
                <span className="st3-product-card__price">
                  {money(price)}
                </span>

                {onOffer &&
                regularPrice !== null &&
                regularPrice > price ? (
                  <span className="st3-product-card__old-price">
                    {money(regularPrice)}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="st3-product-card__price">
                Contact us
              </span>
            )}
          </div>

          <span className="st3-product-card__availability">
            {productAvailability(product)}
          </span>
        </div>
      </div>
    </article>
  );
}
