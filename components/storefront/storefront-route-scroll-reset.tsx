"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/*
 * STEREOPHONIE STOREFRONT ROUTE SCROLL RESET
 *
 * A genuine page change should always begin at the top.
 *
 * Examples:
 *   /              -> /shop                => TOP
 *   /shop          -> /shop/product        => TOP
 *   /shop/productA -> /shop/productB       => TOP
 *
 * Query-string-only updates deliberately do not trigger this:
 *   /shop?category=Phones
 *   /shop?category=Laptops
 *
 * That preserves the Shop's existing filter/navigation behavior.
 */
export default function StorefrontRouteScrollReset() {
  const pathname = usePathname();

  const previousPathnameRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    /*
     * Admin pages are not part of the customer storefront and should
     * retain their own navigation/scroll behavior.
     */
    if (pathname.startsWith("/admin")) {
      previousPathnameRef.current = pathname;
      return;
    }

    const previousPathname = previousPathnameRef.current;

    /*
     * First storefront render OR a genuine pathname change.
     *
     * Search/query changes on the same pathname intentionally do
     * nothing because usePathname() does not change for those.
     */
    if (
      previousPathname === null ||
      previousPathname !== pathname
    ) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      /*
       * Run once more on the next paint so browser/Next navigation
       * restoration cannot re-apply the previous page position after
       * the first layout pass.
       */
      const frame = window.requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto",
        });
      });

      previousPathnameRef.current = pathname;

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    previousPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}
