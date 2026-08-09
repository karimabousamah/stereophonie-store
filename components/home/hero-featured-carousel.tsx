"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroFeaturedSlide = {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  altText: string;
};

type HeroFeaturedCarouselProps = {
  slides: HeroFeaturedSlide[];
};

const AUTO_CHANGE_DELAY = 4000;

export default function HeroFeaturedCarousel({
  slides,
}: HeroFeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const [progressKey, setProgressKey] = useState(0);

  const touchStartX = useRef<number | null>(null);

  const touchCurrentX = useRef<number | null>(null);

  const hasMultipleSlides = slides.length > 1;

  const resetProgress = useCallback(() => {
    setProgressKey((value) => value + 1);
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      if (slides.length === 0) {
        return;
      }

      const normalizedIndex = (index + slides.length) % slides.length;

      setActiveIndex(normalizedIndex);
      resetProgress();
    },
    [resetProgress, slides.length],
  );

  const goNext = useCallback(() => {
    setActiveIndex((current) => {
      if (slides.length === 0) {
        return 0;
      }

      return (current + 1) % slides.length;
    });

    resetProgress();
  }, [resetProgress, slides.length]);

  const goPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (slides.length === 0) {
        return 0;
      }

      return (current - 1 + slides.length) % slides.length;
    });

    resetProgress();
  }, [resetProgress, slides.length]);

  useEffect(() => {
    if (!hasMultipleSlides) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => {
        return (current + 1) % slides.length;
      });

      setProgressKey((value) => value + 1);
    }, AUTO_CHANGE_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeIndex, hasMultipleSlides, progressKey, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const nextIndex = (activeIndex + 1) % slides.length;

    const image = new window.Image();

    image.src = slides[nextIndex].imageUrl;
  }, [activeIndex, slides]);

  if (slides.length === 0) {
    return (
      <div className="flex h-full min-h-[560px] items-center justify-center bg-neutral-200">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-black/30">
          Collection coming soon
        </span>
      </div>
    );
  }

  const activeSlide = slides[activeIndex];

  const slideNumber = String(activeIndex + 1).padStart(2, "0");

  const totalSlides = String(slides.length).padStart(2, "0");

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const x = event.touches[0]?.clientX;

    touchStartX.current = typeof x === "number" ? x : null;

    touchCurrentX.current = touchStartX.current;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const x = event.touches[0]?.clientX;

    if (typeof x === "number") {
      touchCurrentX.current = x;
    }
  }

  function handleTouchEnd() {
    if (touchStartX.current === null || touchCurrentX.current === null) {
      return;
    }

    const difference = touchStartX.current - touchCurrentX.current;

    if (Math.abs(difference) >= 45) {
      if (difference > 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    touchStartX.current = null;
    touchCurrentX.current = null;
  }

  return (
    <div
      className="relative h-full min-h-[560px] overflow-hidden bg-neutral-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-[850ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              index === activeIndex
                ? "z-10 scale-100 opacity-100"
                : "z-0 scale-[1.025] opacity-0"
            }`}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.altText}
              fill
              priority={index === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      <div className="absolute inset-x-5 bottom-5 z-30 sm:inset-x-8 sm:bottom-8">
        <div className="overflow-hidden border border-white/20 bg-black/60 text-white backdrop-blur-xl">
          {hasMultipleSlides ? (
            <div className="h-[2px] bg-white/15">
              <div
                key={progressKey}
                className="h-full origin-left bg-white"
                style={{
                  animation: "nitaHeroCarouselProgress 4000ms linear forwards",
                }}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
            <Link
              href={activeSlide.slug ? `/shop/${activeSlide.slug}` : "/shop"}
              className="group min-w-0 flex-1 !text-white"
            >
              <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/50 sm:text-[9px]">
                Featured piece
              </p>

              <div className="mt-2 flex items-center gap-3">
                <p
                  key={activeSlide.id}
                  className="truncate text-base font-semibold sm:text-lg"
                >
                  {activeSlide.name}
                </p>

                <ArrowRight className="h-4 w-4 shrink-0 opacity-55 transition-transform duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
              </div>
            </Link>

            {hasMultipleSlides ? (
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={goPrevious}
                  aria-label="Previous featured product"
                  className="flex h-9 w-9 items-center justify-center border border-white/20 text-white transition hover:border-white hover:bg-white hover:text-black sm:h-10 sm:w-10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <span className="min-w-[58px] text-center text-[9px] font-semibold tracking-[0.15em] text-white/55 sm:min-w-[68px] sm:text-[10px]">
                  <span className="text-white">{slideNumber}</span>
                  <span className="mx-1 text-white/30">/</span>
                  {totalSlides}
                </span>

                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next featured product"
                  className="flex h-9 w-9 items-center justify-center border border-white/20 text-white transition hover:border-white hover:bg-white hover:text-black sm:h-10 sm:w-10"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes nitaHeroCarouselProgress {
          from {
            transform: scaleX(0);
          }

          to {
            transform: scaleX(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          div {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
