"use client";

import {
  KeyboardEvent,
  TouchEvent,
  WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type GalleryImage = {
  src: string;
  alt: string;

  /*
   * Legacy configuration name.
   * Kept so older products continue working.
   */
  variantName: string;

  /*
   * Stable configuration-media relationship.
   */
  variantId: string;

  /*
   * Photograph order inside its configuration.
   */
  variantPosition: number;

  /*
   * Each configuration can have its own main photograph.
   */
  isVariantPrimary: boolean;
  variantAssignments: {
    variantId: string;
    position: number;
    isPrimary: boolean;
  }[];
};

type ProductGalleryProps = {
  images?: readonly unknown[];
  imageUrl?: string | null;
  image_url?: string | null;
  productName?: string;
  name?: string;
  title?: string;
  [key: string]: unknown;
};

function readString(value: unknown, keys: string[]): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = record[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function readNumber(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = Number(record[key]);

    if (Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return null;
}

function readBoolean(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    if (typeof record[key] === "boolean") {
      return record[key] as boolean;
    }
  }

  return null;
}

function normalizeImages(
  images: readonly unknown[] | undefined,
  fallbackUrl: string | null | undefined,
  productName: string,
): GalleryImage[] {
  const normalized: GalleryImage[] = [];
  const seen = new Set<string>();

  for (const image of images ?? []) {
    const src = readString(image, [
      "url",
      "src",
      "image_url",
      "imageUrl",
      "public_url",
      "publicUrl",
      "storage_url",
      "storageUrl",
    ]);

    if (!src || seen.has(src)) {
      continue;
    }

    seen.add(src);

    const alt =
      readString(image, ["alt", "alt_text", "altText", "caption", "name"]) ??
      productName;

    const variantName =
      readString(image, ["variant_name", "variantName"]) ?? "";

    const variantId = readString(image, ["variant_id", "variantId"]) ?? "";

    const variantPositionValue = readNumber(image, [
      "variant_position",
      "variantPosition",
    ]);

    const variantPosition =
      typeof variantPositionValue === "number"
        ? variantPositionValue
        : normalized.length;

    const isVariantPrimary =
      readBoolean(image, ["is_variant_primary", "isVariantPrimary"]) ?? false;

    const imageRecord =
      image && typeof image === "object"
        ? (image as Record<string, unknown>)
        : {};

    const rawVariantAssignments = Array.isArray(
      imageRecord.product_image_variants,
    )
      ? imageRecord.product_image_variants
      : [];

    const variantAssignments = rawVariantAssignments
      .map((assignment) => {
        if (!assignment || typeof assignment !== "object") {
          return null;
        }

        const assignmentRecord = assignment as Record<string, unknown>;
        const assignmentVariantId = String(
          assignmentRecord.variant_id ?? "",
        ).trim();

        if (!assignmentVariantId) {
          return null;
        }

        const assignmentPosition = Number(assignmentRecord.position ?? 0);

        return {
          variantId: assignmentVariantId,
          position: Number.isFinite(assignmentPosition)
            ? assignmentPosition
            : 0,
          isPrimary: assignmentRecord.is_primary === true,
        };
      })
      .filter(
        (
          assignment,
        ): assignment is {
          variantId: string;
          position: number;
          isPrimary: boolean;
        } => Boolean(assignment),
      );

    normalized.push({
      src,
      alt,
      variantName,
      variantId,
      variantAssignments,
      variantPosition,
      isVariantPrimary,
    });
  }

  const fallback = typeof fallbackUrl === "string" ? fallbackUrl.trim() : "";

  if (fallback && !seen.has(fallback)) {
    normalized.unshift({
      src: fallback,
      alt: productName,
      variantName: "",
      variantId: "",
      variantAssignments: [],
      variantPosition: -1,
      isVariantPrimary: false,
    });
  }

  return normalized;
}

function normalizedConfiguration(value: string) {
  return value.trim().toLocaleLowerCase();
}

function productPageImageScale(productName: string) {
  /*
   * Product-page-only image scaling.
   *
   * Strip punctuation/spaces so names such as:
   * "Apple Pencil (USB-C)"
   * "Apple Pencil USB-C"
   * "Apple Pencil USB C"
   *
   * all resolve to the same key.
   */
  const productKey = productName.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

  const enlargedProducts = new Set(["applepencilpro", "applepencilusbc"]);

  return enlargedProducts.has(productKey) ? 1.55 : 1;
}

export default function ProductGallery(props: ProductGalleryProps) {
  const productName =
    (typeof props.productName === "string" && props.productName.trim()) ||
    (typeof props.name === "string" && props.name.trim()) ||
    (typeof props.title === "string" && props.title.trim()) ||
    "Product";

  const imageScale = productPageImageScale(productName);

  const fallback =
    (typeof props.imageUrl === "string" ? props.imageUrl : null) ??
    (typeof props.image_url === "string" ? props.image_url : null);

  const allImages = useMemo(
    () => normalizeImages(props.images, fallback, productName),
    [props.images, fallback, productName],
  );

  /*
   * Empty means no configuration has been explicitly selected yet.
   *
   * Shared images are always visible.
   * Configuration-specific images appear only when their exact
   * configuration is active.
   */
  const [selectedConfiguration, setSelectedConfiguration] = useState("");

  const [selectedVariantId, setSelectedVariantId] = useState("");

  useEffect(() => {
    function handleConfigurationChange(event: Event) {
      const customEvent = event as CustomEvent<{
        variantId?: string;
        variantName?: string;
      }>;

      setSelectedVariantId(String(customEvent.detail?.variantId ?? "").trim());

      setSelectedConfiguration(
        String(customEvent.detail?.variantName ?? "").trim(),
      );
    }

    window.addEventListener(
      "stereophonie:product-configuration",
      handleConfigurationChange,
    );

    return () => {
      window.removeEventListener(
        "stereophonie:product-configuration",
        handleConfigurationChange,
      );
    };
  }, []);

  const galleryImages = useMemo(() => {
    const requestedName = normalizedConfiguration(selectedConfiguration);

    const requestedId = selectedVariantId.trim();

    const shared = allImages.filter(
      (image) =>
        image.variantAssignments.length === 0 &&
        !String(image.variantId ?? "").trim() &&
        !String(image.variantName ?? "").trim(),
    );

    if (!requestedId && !requestedName) {
      return shared.length ? shared : allImages;
    }

    const specific = allImages
      .filter((image) => {
        /*
         * New many-to-many assignments are authoritative.
         */
        if (requestedId && image.variantAssignments.length > 0) {
          return image.variantAssignments.some(
            (assignment) => assignment.variantId === requestedId,
          );
        }

        /*
         * Legacy single-variant fallback.
         */
        const legacyVariantId = String(image.variantId ?? "").trim();

        if (requestedId && legacyVariantId) {
          return legacyVariantId === requestedId;
        }

        /*
         * Older legacy name fallback.
         */
        return (
          normalizedConfiguration(String(image.variantName ?? "")) ===
          requestedName
        );
      })
      .sort((first, second) => {
        const firstAssignment = requestedId
          ? first.variantAssignments.find(
              (assignment) => assignment.variantId === requestedId,
            )
          : undefined;

        const secondAssignment = requestedId
          ? second.variantAssignments.find(
              (assignment) => assignment.variantId === requestedId,
            )
          : undefined;

        const firstPrimary =
          firstAssignment?.isPrimary ?? first.isVariantPrimary;

        const secondPrimary =
          secondAssignment?.isPrimary ?? second.isVariantPrimary;

        const primaryDifference =
          Number(Boolean(secondPrimary)) - Number(Boolean(firstPrimary));

        if (primaryDifference) {
          return primaryDifference;
        }

        const firstPosition =
          firstAssignment?.position ?? first.variantPosition ?? 0;

        const secondPosition =
          secondAssignment?.position ?? second.variantPosition ?? 0;

        return Number(firstPosition) - Number(secondPosition);
      });

    /*
     * Exact configuration media appears first.
     * Shared media remains available afterwards.
     */
    const combined = [...specific, ...shared];

    return combined.length ? combined : allImages;
  }, [allImages, selectedConfiguration, selectedVariantId]);

  const [activeIndex, setActiveIndex] = useState(0);

  /*
   * A different configuration can expose a completely different
   * photograph set. Always return to the first photograph so the
   * customer immediately sees the correct configuration image.
   */
  useEffect(() => {
    setActiveIndex(0);
    setPreviousIndex(null);
    setDirection("next");
    setTransitioning(false);

    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }

    setAutoplayResetKey((current) => current + 1);
  }, [selectedConfiguration, selectedVariantId]);

  const [autoplayResetKey, setAutoplayResetKey] = useState(0);

  const [previousIndex, setPreviousIndex] = useState<number | null>(null);

  const [direction, setDirection] = useState<"next" | "previous">("next");

  const [transitioning, setTransitioning] = useState(false);

  const transitionTimer = useRef<number | null>(null);

  const touchStart = useRef<number | null>(null);

  const wheelLocked = useRef(false);

  const total = galleryImages.length;

  const safeIndex = total > 0 ? Math.min(activeIndex, total - 1) : 0;

  const activeImage = galleryImages[safeIndex] ?? null;

  const outgoingImage =
    previousIndex !== null
      ? (galleryImages[
          Math.min(previousIndex, Math.max(galleryImages.length - 1, 0))
        ] ?? null)
      : null;

  /*
   * When colour/configuration changes, return cleanly to the first
   * appropriate photograph.
   */
  useEffect(() => {
    setPreviousIndex(null);
    setActiveIndex(0);
    setTransitioning(false);
    setAutoplayResetKey((current) => current + 1);
  }, [selectedConfiguration, selectedVariantId]);

  useEffect(() => {
    return () => {
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current);
      }
    };
  }, []);

  function select(requestedIndex: number, manual = true) {
    if (total < 2 || transitioning) {
      return;
    }

    const nextIndex = (requestedIndex + total) % total;

    if (nextIndex === safeIndex) {
      return;
    }

    const nextDirection =
      requestedIndex > safeIndex || (safeIndex === total - 1 && nextIndex === 0)
        ? "next"
        : "previous";

    if (safeIndex === 0 && nextIndex === total - 1) {
      setDirection("previous");
    } else {
      setDirection(nextDirection);
    }

    setPreviousIndex(safeIndex);

    setActiveIndex(nextIndex);

    setTransitioning(true);

    if (manual) {
      setAutoplayResetKey((current) => current + 1);
    }

    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current);
    }

    transitionTimer.current = window.setTimeout(() => {
      setTransitioning(false);
      setPreviousIndex(null);
    }, 520);
  }

  useEffect(() => {
    if (total < 2 || transitioning) {
      return;
    }

    const timer = window.setTimeout(() => {
      select(safeIndex + 1, false);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [total, safeIndex, autoplayResetKey, transitioning]);

  function previous() {
    select(safeIndex - 1);
  }

  function next() {
    select(safeIndex + 1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    }
  }

  function handleWheel(event: WheelEvent<HTMLElement>) {
    if (total < 2 || wheelLocked.current) {
      return;
    }

    const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY);

    if (!horizontalIntent) {
      return;
    }

    event.preventDefault();

    wheelLocked.current = true;

    if (event.deltaX > 0) {
      next();
    } else {
      previous();
    }

    window.setTimeout(() => {
      wheelLocked.current = false;
    }, 420);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStart.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStart.current === null || total < 2) {
      touchStart.current = null;
      return;
    }

    const endX = event.changedTouches[0]?.clientX;

    if (typeof endX !== "number") {
      touchStart.current = null;
      return;
    }

    const difference = touchStart.current - endX;

    touchStart.current = null;

    if (Math.abs(difference) < 42) {
      return;
    }

    if (difference > 0) {
      next();
    } else {
      previous();
    }
  }

  if (!activeImage) {
    return (
      <section
        className="st-pg-modern st-pg-modern--empty"
        aria-label={`${productName} image gallery`}
      >
        <span>Image unavailable</span>
      </section>
    );
  }

  return (
    <section
      className="st-pg-modern"
      aria-label={`${productName} image gallery`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="st-pg-modern__viewport">
        <div
          className={`st-pg-modern__stage ${
            direction === "next" ? "is-next" : "is-previous"
          }`}
        >
          {outgoingImage ? (
            <img
              className={`st-pg-modern__image st-pg-modern__image--outgoing ${
                direction === "next" ? "is-next" : "is-previous"
              }`}
              src={outgoingImage.src}
              alt=""
              aria-hidden="true"
              style={{ scale: imageScale }}
              draggable={false}
            />
          ) : null}

          <img
            key={`${activeImage.src}-${safeIndex}-${selectedConfiguration}`}
            className={`st-pg-modern__image st-pg-modern__image--incoming ${
              transitioning ? "is-transitioning" : ""
            } ${direction === "next" ? "is-next" : "is-previous"}`}
            src={activeImage.src}
            alt={activeImage.alt}
            draggable={false}
            style={{ scale: imageScale }}
          />
        </div>

        {total > 1 ? (
          <nav
            className="st-pg-modern__pagination"
            aria-label="Product images"
            style={{
              ["--st-gallery-index" as string]: safeIndex,

              ["--st-gallery-count" as string]: total,
            }}
          >
            <span className="st-pg-modern__active-track" aria-hidden="true" />

            {galleryImages.map((image, index) => {
              const selected = index === safeIndex;

              return (
                <button
                  key={`${image.src}-${index}`}
                  type="button"
                  className="st-pg-modern__dot"
                  aria-label={`View image ${index + 1} of ${total}`}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => select(index)}
                >
                  <span />
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
