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


/* ==========================================================
   ST AUTHORITATIVE PRIMARY IMAGE HELPERS
   ========================================================== */

export type StorefrontResolvableImage = {
  id?: string | null;
  image_url?: string | null;
  storefront_image_url?: string | null;
  position?: number | null;
  is_primary?: boolean | null;
  variant_id?: string | null;
  variant_position?: number | null;
  is_variant_primary?: boolean | null;
  product_image_variants?:
    | {
        variant_id: string;
        position: number;
        is_primary: boolean;
      }[]
    | null;
};

function storefrontResolvableImageIdentity(
  image: StorefrontResolvableImage,
) {
  return String(
    image.id ??
      image.storefront_image_url ??
      image.image_url ??
      "",
  );
}

export function storefrontImagesForVariant<
  TImage extends StorefrontResolvableImage,
>(
  images: TImage[] | null | undefined,
  variantId: string | null | undefined,
): TImage[] {
  const available = [...(images ?? [])].filter((image) =>
    Boolean(
      String(
        image.storefront_image_url ??
          image.image_url ??
          "",
      ).trim(),
    ),
  );

  const requestedVariantId = String(
    variantId ?? "",
  ).trim();

  if (requestedVariantId) {
    const configurationImages = available
      .map((image) => {
        const assignment =
          Array.isArray(image.product_image_variants)
            ? image.product_image_variants.find(
                (candidate) =>
                  candidate.variant_id === requestedVariantId,
              )
            : undefined;

        const legacyVariantMatch =
          String(image.variant_id ?? "").trim() ===
          requestedVariantId;

        if (!assignment && !legacyVariantMatch) {
          return null;
        }

        return {
          image,

          isPrimary:
            Boolean(assignment?.is_primary) ||
            (
              legacyVariantMatch &&
              Boolean(image.is_variant_primary)
            ),

          position: Number(
            assignment?.position ??
              (
                legacyVariantMatch
                  ? image.variant_position
                  : null
              ) ??
              image.position ??
              0,
          ),
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          image: TImage;
          isPrimary: boolean;
          position: number;
        } => entry !== null,
      )
      .sort((first, second) => {
        if (first.isPrimary !== second.isPrimary) {
          return first.isPrimary ? -1 : 1;
        }

        if (first.position !== second.position) {
          return first.position - second.position;
        }

        return storefrontResolvableImageIdentity(
          first.image,
        ).localeCompare(
          storefrontResolvableImageIdentity(second.image),
        );
      });

    if (configurationImages.length > 0) {
      return configurationImages.map(({ image }) => image);
    }
  }

  return available.sort((first, second) => {
    if (
      Boolean(first.is_primary) !==
      Boolean(second.is_primary)
    ) {
      return first.is_primary ? -1 : 1;
    }

    const positionDifference =
      Number(first.position ?? 0) -
      Number(second.position ?? 0);

    if (positionDifference !== 0) {
      return positionDifference;
    }

    return storefrontResolvableImageIdentity(
      first,
    ).localeCompare(
      storefrontResolvableImageIdentity(second),
    );
  });
}

export function storefrontPrimaryImageForVariant<
  TImage extends StorefrontResolvableImage,
>(
  images: TImage[] | null | undefined,
  variantId: string | null | undefined,
) {
  return storefrontImagesForVariant(
    images,
    variantId,
  )[0] ?? null;
}

export function storefrontImageDisplayUrl(
  image: StorefrontResolvableImage | null | undefined,
) {
  const storefrontUrl = String(
    image?.storefront_image_url ?? "",
  ).trim();

  if (storefrontUrl) {
    return storefrontUrl;
  }

  const originalUrl = String(
    image?.image_url ?? "",
  ).trim();

  return originalUrl || null;
}

/* ==========================================================
   ST AUTHORITATIVE PRIMARY IMAGE HELPERS END
   ========================================================== */
