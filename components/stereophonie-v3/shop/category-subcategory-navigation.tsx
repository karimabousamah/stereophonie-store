"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type StorefrontSubcategoryNavigationItem = {
  id: string;
  name: string;
  href: string;
  imageUrl: string | null;
  theme: "light" | "dark";
  hasChildren: boolean;
};

export type StorefrontSubcategoryNavigation = {
  eyebrow: string;
  title: string;
  backHref: string | null;
  backLabel: string | null;
  items: StorefrontSubcategoryNavigationItem[];
};

export default function CategorySubcategoryNavigation({
  navigation,
  selectedSubcategoryId = "",
  variant = "compact",
}: {
  navigation: StorefrontSubcategoryNavigation;
  selectedSubcategoryId?: string;
  variant?: "compact" | "cards";
}) {
  const cardMode =
    variant === "cards";

  const listRef =
    useRef<HTMLDivElement>(null);

  const [hasOverflow, setHasOverflow] =
    useState(false);

  const groupSignature =
    navigation.items
      .map((item) => item.id)
      .join("|");

  const measureOverflow =
    useCallback(() => {
      const list =
        listRef.current;

      if (
        cardMode ||
        !list
      ) {
        setHasOverflow(false);
        return;
      }

      const style =
        window.getComputedStyle(
          list,
        );

      const scrollable =
        style.overflowX === "auto" ||
        style.overflowX === "scroll";

      const overflowing =
        list.scrollWidth >
        list.clientWidth + 1;

      setHasOverflow(
        scrollable &&
          overflowing,
      );
    }, [cardMode]);

  useEffect(() => {
    const list =
      listRef.current;

    if (
      cardMode ||
      !list
    ) {
      setHasOverflow(false);
      return;
    }

    /*
     * Restore scroll position from the Subcategory navigation
     * immediately preceding this render.
     *
     * Restoration happens ONLY if the sibling row is identical.
     */
    try {
      const raw =
        window.sessionStorage.getItem(
          "st3:subcategory-scroll-position",
        );

      if (raw) {
        const saved =
          JSON.parse(raw) as {
            pathname?: string;
            signature?: string;
            scrollLeft?: number;
          };

        window.sessionStorage.removeItem(
          "st3:subcategory-scroll-position",
        );

        if (
          saved.pathname ===
            window.location.pathname &&
          saved.signature ===
            groupSignature &&
          typeof saved.scrollLeft ===
            "number"
        ) {
          const restore =
            () => {
              const maximum =
                Math.max(
                  0,
                  list.scrollWidth -
                    list.clientWidth,
                );

              list.scrollLeft =
                Math.min(
                  Math.max(
                    0,
                    saved.scrollLeft ?? 0,
                  ),
                  maximum,
                );
            };

          window.requestAnimationFrame(
            () => {
              window.requestAnimationFrame(
                restore,
              );
            },
          );
        }
      }
    } catch {
      /*
       * sessionStorage is only an enhancement.
       */
    }

    let secondFrame = 0;

    const firstFrame =
      window.requestAnimationFrame(
        () => {
          secondFrame =
            window.requestAnimationFrame(
              measureOverflow,
            );
        },
      );

    const observer =
      typeof ResizeObserver !==
      "undefined"
        ? new ResizeObserver(
            measureOverflow,
          )
        : null;

    observer?.observe(
      list,
    );

    Array.from(
      list.children,
    ).forEach((child) => {
      observer?.observe(
        child,
      );
    });

    window.addEventListener(
      "resize",
      measureOverflow,
    );

    window.addEventListener(
      "orientationchange",
      measureOverflow,
    );

    return () => {
      window.cancelAnimationFrame(
        firstFrame,
      );

      if (secondFrame) {
        window.cancelAnimationFrame(
          secondFrame,
        );
      }

      observer?.disconnect();

      window.removeEventListener(
        "resize",
        measureOverflow,
      );

      window.removeEventListener(
        "orientationchange",
        measureOverflow,
      );
    };
  }, [
    cardMode,
    groupSignature,
    measureOverflow,
    selectedSubcategoryId,
  ]);

  function rememberScrollPosition() {
    const list =
      listRef.current;

    if (!list) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        "st3:subcategory-scroll-position",
        JSON.stringify({
          pathname:
            window.location.pathname,
          signature:
            groupSignature,
          scrollLeft:
            list.scrollLeft,
        }),
      );
    } catch {
      /*
       * Navigation still works when storage is unavailable.
       */
    }
  }

  if (
    navigation.items.length === 0 &&
    !navigation.backHref
  ) {
    return null;
  }

  return (
    <section
      className={`st3-shop-subcategories ${
        cardMode
          ? "is-card-mode"
          : "is-compact-mode"
      }`}
      aria-label="Subcategories"
    >
      <div className="st3-shop-subcategories__inner">
        <div className="st3-shop-subcategories__context">
          <div className="st3-shop-subcategories__copy">
            <span>
              {navigation.eyebrow}
            </span>
          </div>

          {navigation.backHref &&
          navigation.backLabel ? (
            <Link
              href={navigation.backHref}
              data-transition-label={navigation.backLabel}
              className="st3-shop-subcategories__back"
            >
              <span aria-hidden="true">
                ←
              </span>

              {navigation.backLabel}
            </Link>
          ) : null}
        </div>

        {navigation.items.length > 0 ? (
          cardMode ? (
            <div
              className="st3-shop-subcategories__grid"
              data-count={navigation.items.length}
            >
              {navigation.items.map(
                (subcategory) => (
                  <Link
                    key={subcategory.id}
                    href={subcategory.href}
                    data-subcategory-id={
                      subcategory.id
                    }
                    className="st3-shop-subcategories__card"
                    aria-label={`${
                      subcategory.hasChildren
                        ? "Explore"
                        : "Shop"
                    } ${subcategory.name}`}
                  >
                    <span
                      className={`st3-shop-subcategories__card-media ${
                        subcategory.theme === "dark"
                          ? "is-dark"
                          : ""
                      }`}
                      aria-hidden="true"
                    >
                      {subcategory.imageUrl ? (
                        <img
                          src={
                            subcategory.imageUrl
                          }
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="st3-shop-subcategories__placeholder" />
                      )}
                    </span>

                    <span className="st3-shop-subcategories__card-footer">
                      <strong>
                        {subcategory.name}
                      </strong>

                      <span
                        className="st3-shop-subcategories__card-arrow"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </span>
                  </Link>
                ),
              )}
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                className="st3-shop-subcategories__list"
              >
                {navigation.items.map(
                  (subcategory) => (
                    <Link
                      key={subcategory.id}
                      href={
                        selectedSubcategoryId ===
                          subcategory.id &&
                        navigation.backHref
                          ? navigation.backHref
                          : subcategory.href
                      }
                      onClick={
                        rememberScrollPosition
                      }
                      data-subcategory-id={
                        subcategory.id
                      }
                      data-transition-label={
                        selectedSubcategoryId ===
                          subcategory.id &&
                        navigation.backLabel
                          ? navigation.backLabel
                          : subcategory.name
                      }
                      className={`st3-shop-subcategories__item ${
                        selectedSubcategoryId ===
                        subcategory.id
                          ? "is-active"
                          : ""
                      }`}
                      aria-current={
                        selectedSubcategoryId ===
                        subcategory.id
                          ? "page"
                          : undefined
                      }
                      aria-label={`${
                        subcategory.hasChildren
                          ? "Explore"
                          : "Shop"
                      } ${subcategory.name}`}
                    >
                      <span
                        className={`st3-shop-subcategories__thumb ${
                          subcategory.theme === "dark"
                            ? "is-dark"
                            : ""
                        }`}
                        aria-hidden="true"
                      >
                        {subcategory.imageUrl ? (
                          <img
                            src={
                              subcategory.imageUrl
                            }
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="st3-shop-subcategories__placeholder" />
                        )}
                      </span>

                      <span className="st3-shop-subcategories__name">
                        {subcategory.name}
                      </span>

                      <span
                        className="st3-shop-subcategories__arrow"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </Link>
                  ),
                )}
              </div>

              {navigation.items.length > 1 ? (
                <div
                  className={`st3-shop-subcategories__scroll-hint ${
                    hasOverflow
                      ? "is-overflowing"
                      : ""
                  }`}
                  aria-hidden="true"
                >
                  <span className="st3-shop-subcategories__scroll-hint-mobile">
                    Swipe to explore
                  </span>

                  <span className="st3-shop-subcategories__scroll-hint-desktop">
                    Scroll to explore
                  </span>

                  <span className="st3-shop-subcategories__scroll-hint-arrow">
                    →
                  </span>
                </div>
              ) : null}
            </>
          )
        ) : null}
      </div>
    </section>
  );
}
