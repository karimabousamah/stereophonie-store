"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function StorefrontEffects() {
  const pathname = usePathname();

  const [routeLoading, setRouteLoading] = useState(false);

  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;

    setRouteLoading(true);

    const timeout = window.setTimeout(() => {
      setRouteLoading(false);
    }, 550);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.setAttribute("data-revealed", "true");

          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -50px 0px",
      },
    );

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      const link = target?.closest("a") as HTMLAnchorElement | null;

      if (!link) {
        return;
      }

      const href = link.getAttribute("href");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        link.target === "_blank"
      ) {
        return;
      }

      const currentUrl = new URL(window.location.href);

      const nextUrl = new URL(link.href, window.location.href);

      if (
        currentUrl.pathname === nextUrl.pathname &&
        currentUrl.search === nextUrl.search
      ) {
        return;
      }

      if (currentUrl.origin !== nextUrl.origin) {
        return;
      }

      setRouteLoading(true);
    }

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[500] h-[2px] origin-left bg-black transition-all duration-500 ${
          routeLoading ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
        }`}
      />

      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-[490] bg-white transition-opacity duration-300 ${
          routeLoading ? "opacity-[0.18]" : "opacity-0"
        }`}
      />
    </>
  );
}
