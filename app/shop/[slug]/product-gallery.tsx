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
  const ordered = useMemo(() => {
    const sorted = [...images].sort(
      (first, second) => first.position - second.position,
    );

    const primary = sorted.findIndex((image) => image.is_primary);

    if (primary <= 0) {
      return sorted;
    }

    return [sorted[primary], ...sorted.filter((_, index) => index !== primary)];
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const current = ordered[activeIndex] ?? null;
  const several = ordered.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    const oldOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreen(false);
      }

      if (event.key === "ArrowLeft" && several) {
        setActiveIndex(
          (value) => (value - 1 + ordered.length) % ordered.length,
        );
      }

      if (event.key === "ArrowRight" && several) {
        setActiveIndex((value) => (value + 1) % ordered.length);
      }
    };

    window.addEventListener("keydown", keyboard);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", keyboard);
    };
  }, [fullscreen, ordered.length, several]);

  function previous() {
    if (!several) {
      return;
    }

    setActiveIndex((value) => (value - 1 + ordered.length) % ordered.length);
  }

  function next() {
    if (!several) {
      return;
    }

    setActiveIndex((value) => (value + 1) % ordered.length);
  }

  if (!ordered.length) {
    return (
      <div className="st-pdp17-gallery-empty">
        <ImageOff />
        <strong>IMAGE SIGNAL UNAVAILABLE</strong>
        <span>Product photography has not been uploaded yet.</span>
      </div>
    );
  }

  const lightbox =
    mounted && fullscreen && current
      ? createPortal(
          <div className="st-pdp17-lightbox" role="dialog" aria-modal="true">
            <header>
              <div>
                <i />
                <span>IMAGE VIEWER / {productName}</span>
              </div>

              <button
                type="button"
                onClick={() => setFullscreen(false)}
                aria-label="Close fullscreen image"
              >
                <X />
              </button>
            </header>

            <div className="st-pdp17-lightbox__stage">
              {current.image_url ? (
                <img
                  src={current.image_url}
                  alt={current.alt_text ?? productName}
                />
              ) : (
                <ImageOff />
              )}

              {several ? (
                <>
                  <button
                    type="button"
                    className="is-prev"
                    onClick={previous}
                    aria-label="Previous image"
                  >
                    <ChevronLeft />
                  </button>

                  <button
                    type="button"
                    className="is-next"
                    onClick={next}
                    aria-label="Next image"
                  >
                    <ChevronRight />
                  </button>
                </>
              ) : null}
            </div>

            <footer>
              VIEW {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(ordered.length).padStart(2, "0")}
            </footer>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="st-pdp17-gallery">
        <div className="st-pdp17-gallery__stage">
          <div className="st-pdp17-gallery__grid" />

          <span className="st-pdp17-gallery__label">PRODUCT VISUAL / LIVE</span>

          {current?.image_url ? (
            <img
              key={current.id}
              src={current.image_url}
              alt={current.alt_text ?? productName}
              className="st-pdp17-gallery__image"
              loading="eager"
              fetchPriority="high"
            />
          ) : (
            <ImageOff className="st-pdp17-gallery__missing" />
          )}

          <span className="st-pdp17-gallery__counter">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(ordered.length).padStart(2, "0")}
          </span>

          {current?.image_url ? (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="st-pdp17-gallery__fullscreen"
              aria-label={`Expand ${productName} product image`}
            >
              <Expand />
              EXPAND
            </button>
          ) : null}

          {several ? (
            <div className="st-pdp17-gallery__nav">
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

        {several ? (
          <div className="st-pdp17-gallery__thumbs">
            {ordered.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={activeIndex === index ? "is-active" : ""}
                aria-pressed={activeIndex === index}
              >
                {image.image_url ? (
                  <img
                    src={image.image_url}
                    alt={image.alt_text ?? `${productName} ${index + 1}`}
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
