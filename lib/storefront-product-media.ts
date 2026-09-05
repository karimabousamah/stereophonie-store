export type StorefrontMediaAssignment = {
  variant_id: string;
  position: number;
  is_primary: boolean;
};

export type StorefrontMediaImage = {
  id?: string | null;
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;

  variant_id?: string | null;
  variant_position?: number | null;
  is_variant_primary?: boolean | null;

  product_image_variants?: StorefrontMediaAssignment[] | null;
};

export type StorefrontMediaVariant = {
  id?: string | null;
  display_position?: number | null;
  variant_name?: string | null;
  size?: string | null;
  is_active?: boolean | null;
};

/**
 * Authoritative storefront card photograph order.
 *
 * The administrator's FIRST active configuration controls product-card media:
 *
 *   Position 1 / Main = normal product-card image
 *   Position 2        = hover image
 *   Position 3+       = remaining gallery order
 *
 * Configuration-specific product_image_variants metadata is authoritative.
 * Legacy product_images.position remains a fallback only.
 */
export function storefrontConfigurationImages<
  TImage extends StorefrontMediaImage,
  TVariant extends StorefrontMediaVariant,
>(
  inputImages: readonly TImage[] | null | undefined,
  inputVariants: readonly TVariant[] | null | undefined,
): TImage[] {
  const images = [...(inputImages ?? [])];

  if (images.length <= 1) {
    return images.map((image, index) => ({
      ...image,
      position: index,
      is_primary: index === 0,
    }));
  }

  const firstConfiguration = [...(inputVariants ?? [])]
    .filter((variant) => variant.is_active !== false)
    .sort((first, second) => {
      const positionDifference =
        Number(first.display_position ?? 0) -
        Number(second.display_position ?? 0);

      if (positionDifference !== 0) {
        return positionDifference;
      }

      return String(first.variant_name ?? first.size ?? "").localeCompare(
        String(second.variant_name ?? second.size ?? ""),
        undefined,
        {
          numeric: true,
        },
      );
    })[0];

  const legacyFallback = () =>
    [...images]
      .sort(
        (first, second) =>
          Number(first.position ?? 0) - Number(second.position ?? 0),
      )
      .map((image, index) => ({
        ...image,
        position: index,
        is_primary: index === 0,
      }));

  if (!firstConfiguration?.id) {
    return legacyFallback();
  }

  const gallery = images
    .map((image) => ({
      image,
      assignment: Array.isArray(image.product_image_variants)
        ? image.product_image_variants.find(
            (assignment) => assignment.variant_id === firstConfiguration.id,
          )
        : undefined,
    }))
    .filter(
      (
        entry,
      ): entry is {
        image: TImage;
        assignment: StorefrontMediaAssignment;
      } => Boolean(entry.assignment),
    )
    .sort((first, second) => {
      /*
       * Admin's explicit Main choice always wins.
       *
       * This is important for older products whose saved position may
       * not yet be zero even though the photograph is marked Main.
       */
      if (
        Boolean(first.assignment.is_primary) !==
        Boolean(second.assignment.is_primary)
      ) {
        return first.assignment.is_primary ? -1 : 1;
      }

      const positionDifference =
        Number(first.assignment.position ?? 0) -
        Number(second.assignment.position ?? 0);

      if (positionDifference !== 0) {
        return positionDifference;
      }

      const firstIdentity = String(
        first.image.id ?? first.image.image_url ?? "",
      );

      const secondIdentity = String(
        second.image.id ?? second.image.image_url ?? "",
      );

      return firstIdentity.localeCompare(secondIdentity);
    });

  if (gallery.length === 0) {
    return legacyFallback();
  }

  return gallery.map(({ image }, index) => ({
    ...image,
    position: index,
    is_primary: index === 0,
  }));
}
