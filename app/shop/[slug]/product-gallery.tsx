"use client";

import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ProductImage = {
  id: string;
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

type ProductGalleryProps = {
  productName: string;
  images: ProductImage[];
};

export default function ProductGallery({
  productName,
  images,
}: ProductGalleryProps) {
  const orderedImages = useMemo(() => {
    const sorted = [...images].sort(
      (first, second) => first.position - second.position,
    );

    const primaryIndex = sorted.findIndex((image) => image.is_primary);

    if (primaryIndex <= 0) {
      return sorted;
    }

    return [
      sorted[primaryIndex],
      ...sorted.filter((_, index) => index !== primaryIndex),
    ];
  }, [images]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selectedImage = orderedImages[selectedIndex] ?? null;
  const hasSeveralImages = orderedImages.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedIndex >= orderedImages.length) {
      setSelectedIndex(0);
    }
  }, [orderedImages.length, selectedIndex]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);

      if (event.key === "ArrowLeft" && hasSeveralImages) {
        setSelectedIndex(
          (current) =>
            (current - 1 + orderedImages.length) % orderedImages.length,
        );
      }

      if (event.key === "ArrowRight" && hasSeveralImages) {
        setSelectedIndex((current) => (current + 1) % orderedImages.length);
      }
    }

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [lightboxOpen, hasSeveralImages, orderedImages.length]);

  function previous() {
    if (!hasSeveralImages) return;

    setSelectedIndex(
      (current) => (current - 1 + orderedImages.length) % orderedImages.length,
    );
  }

  function next() {
    if (!hasSeveralImages) return;

    setSelectedIndex((current) => (current + 1) % orderedImages.length);
  }

  if (orderedImages.length === 0) {
    return (
      <div className="stereo-product-gallery-empty">
        <ImageOff />

        <div>
          <strong>Product photography unavailable</strong>
          <span>Images will appear here when added by the store.</span>
        </div>
      </div>
    );
  }

  const lightbox =
    mounted && lightboxOpen && selectedImage
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${productName} image viewer`}
            className="stereo-gallery-lightbox"
          >
            <div className="stereo-gallery-lightbox__top">
              <div>
                <span>PRODUCT VIEWER</span>
                <strong>{productName}</strong>
              </div>

              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label="Close image viewer"
              >
                <X />
              </button>
            </div>

            <div className="stereo-gallery-lightbox__stage">
              {selectedImage.image_url ? (
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.alt_text ?? productName}
                />
              ) : (
                <ImageOff />
              )}

              {hasSeveralImages ? (
                <>
                  <button
                    type="button"
                    className="stereo-gallery-lightbox__previous"
                    onClick={previous}
                    aria-label="Previous image"
                  >
                    <ChevronLeft />
                  </button>

                  <button
                    type="button"
                    className="stereo-gallery-lightbox__next"
                    onClick={next}
                    aria-label="Next image"
                  >
                    <ChevronRight />
                  </button>
                </>
              ) : null}
            </div>

            <div className="stereo-gallery-lightbox__counter">
              IMAGE {String(selectedIndex + 1).padStart(2, "0")}
              {" / "}
              {String(orderedImages.length).padStart(2, "0")}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="stereo-product-gallery">
        <div className="stereo-product-gallery__stage">
          <div className="stereo-product-gallery__grid" />

          {selectedImage?.image_url ? (
            <img
              key={selectedImage.id}
              src={selectedImage.image_url}
              alt={selectedImage.alt_text ?? productName}
              loading="eager"
              fetchPriority="high"
              className="stereo-product-gallery__main-image"
            />
          ) : (
            <ImageOff className="stereo-product-gallery__missing" />
          )}

          <div className="stereo-product-gallery__counter">
            VIEW {String(selectedIndex + 1).padStart(2, "0")} /
            {String(orderedImages.length).padStart(2, "0")}
          </div>

          {selectedImage?.image_url ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="stereo-product-gallery__expand"
            >
              <Expand />
              Fullscreen
            </button>
          ) : null}

          {hasSeveralImages ? (
            <div className="stereo-product-gallery__arrows">
              <button
                type="button"
                onClick={previous}
                aria-label="Previous product image"
              >
                <ChevronLeft />
              </button>

              <button
                type="button"
                onClick={next}
                aria-label="Next product image"
              >
                <ChevronRight />
              </button>
            </div>
          ) : null}
        </div>

        {hasSeveralImages ? (
          <div className="stereo-product-gallery__thumbnails">
            {orderedImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Product image ${index + 1}`}
                aria-pressed={selectedIndex === index}
                className={selectedIndex === index ? "is-active" : undefined}
              >
                {image.image_url ? (
                  <img
                    src={image.image_url}
                    alt={image.alt_text ?? `${productName} view ${index + 1}`}
                  />
                ) : (
                  <ImageOff />
                )}

                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightbox}
    </>
  );
}
