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
  const orderedImages = useMemo(
    () => [...images].sort((first, second) => first.position - second.position),
    [images],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [mounted, setMounted] = useState(false);

  const selectedImage = orderedImages[selectedIndex] ?? null;

  const hasSeveralImages = orderedImages.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedIndex < orderedImages.length) {
      return;
    }

    setSelectedIndex(0);
  }, [orderedImages.length, selectedIndex]);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      }

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

  function showPreviousImage() {
    if (!hasSeveralImages) {
      return;
    }

    setSelectedIndex(
      (current) => (current - 1 + orderedImages.length) % orderedImages.length,
    );
  }

  function showNextImage() {
    if (!hasSeveralImages) {
      return;
    }

    setSelectedIndex((current) => (current + 1) % orderedImages.length);
  }

  const lightbox =
    mounted && lightboxOpen && selectedImage
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${productName} image gallery`}
            className="fixed inset-0 z-[2147483010] bg-black"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close enlarged image"
              className="absolute right-4 top-4 z-30 flex h-12 w-12 items-center justify-center border border-white/25 bg-black/40 text-white backdrop-blur-md transition hover:bg-white hover:text-black sm:right-7 sm:top-7"
            >
              <X className="h-5 w-5" />
            </button>

            {hasSeveralImages ? (
              <button
                type="button"
                onClick={showPreviousImage}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/40 text-white backdrop-blur-md transition hover:bg-white hover:text-black sm:left-7"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : null}

            <div className="flex h-full w-full items-center justify-center px-5 py-20 sm:px-20">
              {selectedImage.image_url ? (
                <img
                  key={selectedImage.id}
                  src={selectedImage.image_url}
                  alt={selectedImage.alt_text ?? productName}
                  className="nita-product-photo max-h-[calc(100dvh-8rem)] max-w-full object-contain"
                />
              ) : (
                <ImageOff className="h-12 w-12 text-white/30" />
              )}
            </div>

            <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 border border-white/20 bg-black/50 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              {selectedIndex + 1} / {Math.max(orderedImages.length, 1)}
            </div>

            {hasSeveralImages ? (
              <button
                type="button"
                onClick={showNextImage}
                aria-label="Next image"
                className="absolute right-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/40 text-white backdrop-blur-md transition hover:bg-white hover:text-black sm:right-7"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  if (orderedImages.length === 0) {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-[#f3f2ef] sm:min-h-[680px] lg:min-h-[760px]">
        <div className="text-center">
          <ImageOff className="mx-auto h-10 w-10 text-black/20" />

          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
            Image unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={
          hasSeveralImages ? "grid gap-4 lg:grid-cols-[92px_minmax(0,1fr)]" : ""
        }
      >
        {hasSeveralImages ? (
          <div className="order-2 flex gap-3 overflow-x-auto pb-2 lg:order-1 lg:flex-col lg:overflow-visible">
            {orderedImages.map((image, index) => {
              const active = selectedIndex === index;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={active}
                  className={`relative h-[108px] w-[84px] shrink-0 overflow-hidden border bg-[#f3f2ef] transition duration-300 lg:h-[116px] lg:w-full ${
                    active
                      ? "border-black/15 opacity-100 ring-1 ring-black/10"
                      : "border-transparent opacity-55 hover:border-black/20 hover:opacity-100"
                  }`}
                >
                  {image.image_url ? (
                    <img
                      src={image.image_url}
                      alt={
                        image.alt_text ?? `${productName} image ${index + 1}`
                      }
                      loading={index < 2 ? "eager" : "lazy"}
                      className="nita-product-photo h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="h-5 w-5 text-black/20" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={hasSeveralImages ? "order-1 lg:order-2" : ""}>
          <div className="group relative min-h-[520px] overflow-hidden bg-[#f3f2ef] sm:min-h-[680px] lg:min-h-[760px]">
            {selectedImage?.image_url ? (
              <img
                key={selectedImage.id}
                src={selectedImage.image_url}
                alt={selectedImage.alt_text ?? productName}
                loading="eager"
                fetchPriority="high"
                className="nita-product-photo absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[520px] items-center justify-center">
                <ImageOff className="h-10 w-10 text-black/20" />
              </div>
            )}

            <div className="absolute left-4 top-4 bg-white/90 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.17em] backdrop-blur-sm">
              {selectedIndex + 1} / {orderedImages.length}
            </div>

            {selectedImage?.image_url ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-4 right-4 flex min-h-12 items-center gap-2 border border-black/10 bg-white/90 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-black backdrop-blur-sm transition hover:border-black hover:bg-black hover:text-white"
              >
                <Expand className="h-4 w-4" />
                Enlarge
              </button>
            ) : null}

            {hasSeveralImages ? (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  aria-label="Previous product image"
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-black/10 bg-white/85 text-black opacity-0 backdrop-blur-sm transition hover:bg-black hover:text-white group-hover:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label="Next product image"
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-black/10 bg-white/85 text-black opacity-0 backdrop-blur-sm transition hover:bg-black hover:text-white group-hover:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {lightbox}
    </>
  );
}
