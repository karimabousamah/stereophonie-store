"use client";

import Link from "next/link";
import {
  ArrowRight,
  Heart,
  LoaderCircle,
  Menu,
  PackageSearch,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import CartButton from "@/components/cart/cart-button";
import WishlistButton from "@/components/wishlist/wishlist-button";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import BrandLogo from "@/components/storefront/brand-logo";
import { useStoreSettings } from "@/components/storefront/store-settings-provider";

const navigationLinks = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Shop",
    href: "/shop",
  },
  {
    label: "Collections",
    href: "/collections",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Track order",
    href: "/track-order",
  },
];

const mobileUtilityLinks = [
  {
    label: "Track",
    href: "/track-order",
    icon: PackageSearch,
  },
  {
    label: "Account",
    href: "/account",
    icon: UserRound,
  },
];

const searchSuggestions = [
  {
    label: "All products",
    href: "/shop",
  },
  {
    label: "New arrivals",
    href: "/shop?filter=new",
  },
  {
    label: "Featured",
    href: "/shop?filter=featured",
  },
  {
    label: "Trending",
    href: "/shop?filter=trending",
  },
];

const SEARCH_HISTORY_STORAGE_KEY = "nita-style-recent-searches";

const MAX_RECENT_SEARCHES = 5;

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  imageAlt: string;
  price: number | null;
  regularPrice: number | null;
  onSale: boolean;
  availability: string;
  availabilityStatus: string;
};

type SearchResponse = {
  results?: SearchResult[];
  error?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Price unavailable";
  }

  return currencyFormatter.format(value);
}

function availabilityDotClass(status: string) {
  if (status === "in_stock") {
    return "bg-emerald-500";
  }

  if (status === "low_stock") {
    return "bg-amber-500";
  }

  if (status === "coming_soon") {
    return "bg-blue-500";
  }

  return "bg-black/25";
}

export default function StoreHeader() {
  const { storeName } = useStoreSettings();

  const pathname = usePathname();

  const { productCount: wishlistProductCount, hydrated: wishlistHydrated } =
    useWishlist();

  const visibleWishlistCount = wishlistHydrated ? wishlistProductCount : 0;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);

  const [query, setQuery] = useState("");

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);

  const [searchError, setSearchError] = useState<string | null>(null);

  const [scrolled, setScrolled] = useState(false);

  const [mounted, setMounted] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const overlayOpen = mobileMenuOpen || searchOpen;

  useEffect(() => {
    setMounted(true);

    try {
      const storedSearches = window.localStorage.getItem(
        SEARCH_HISTORY_STORAGE_KEY,
      );

      if (!storedSearches) {
        return;
      }

      const parsedSearches = JSON.parse(storedSearches);

      if (!Array.isArray(parsedSearches)) {
        return;
      }

      setRecentSearches(
        parsedSearches
          .filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length >= 2,
          )
          .slice(0, MAX_RECENT_SEARCHES),
      );
    } catch {
      window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setQuery("");
    setSearchResults([]);
    setSearchError(null);
  }, [pathname]);

  useEffect(() => {
    if (!overlayOpen) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;

    const scrollPosition = window.scrollY;

    const previousBodyPosition = body.style.position;

    const previousBodyTop = body.style.top;

    const previousBodyWidth = body.style.width;

    const previousBodyOverflow = body.style.overflow;

    const previousHtmlOverflow = html.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollPosition}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    html.style.overflow = "hidden";

    return () => {
      body.style.position = previousBodyPosition;

      body.style.top = previousBodyTop;

      body.style.width = previousBodyWidth;

      body.style.overflow = previousBodyOverflow;

      html.style.overflow = previousHtmlOverflow;

      window.scrollTo(0, scrollPosition);
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlayOpen) {
      return;
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setMobileMenuOpen(false);
      setSearchOpen(false);
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 350);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [searchOpen]);

  useEffect(() => {
    const cleanedQuery = query.trim();

    if (cleanedQuery.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);

      return;
    }

    const controller = new AbortController();

    setSearchLoading(true);
    setSearchError(null);

    const searchTimer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/products/search?q=${encodeURIComponent(cleanedQuery)}`,
          {
            method: "GET",
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        const data = (await response.json()) as SearchResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Products could not be searched.");
        }

        setSearchResults(data.results ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSearchResults([]);

        setSearchError(
          error instanceof Error
            ? error.message
            : "Products could not be searched.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(searchTimer);

      controller.abort();
    };
  }, [query]);

  function linkIsActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  }

  function openSearch() {
    setMobileMenuOpen(false);
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setSearchResults([]);
    setSearchError(null);
  }

  function rememberSearch(value: string) {
    const cleanedValue = value.trim();

    if (cleanedValue.length < 2) {
      return;
    }

    setRecentSearches((currentSearches) => {
      const nextSearches = [
        cleanedValue,
        ...currentSearches.filter(
          (search) => search.toLowerCase() !== cleanedValue.toLowerCase(),
        ),
      ].slice(0, MAX_RECENT_SEARCHES);

      window.localStorage.setItem(
        SEARCH_HISTORY_STORAGE_KEY,
        JSON.stringify(nextSearches),
      );

      return nextSearches;
    });
  }

  function clearSearchHistory() {
    setRecentSearches([]);

    window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  }

  function removeRecentSearch(searchToRemove: string) {
    setRecentSearches((currentSearches) => {
      const nextSearches = currentSearches.filter(
        (search) => search !== searchToRemove,
      );

      if (nextSearches.length === 0) {
        window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
      } else {
        window.localStorage.setItem(
          SEARCH_HISTORY_STORAGE_KEY,
          JSON.stringify(nextSearches),
        );
      }

      return nextSearches;
    });
  }

  function reuseSearch(search: string) {
    setQuery(search);
    rememberSearch(search);

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }

  const cleanedQuery = query.trim();

  const mobileMenu = (
    <div
      className={`fixed inset-0 z-[2147483004] transition ${
        mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 bg-black/50 shadow-none backdrop-blur-[2px] transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`fixed inset-y-0 left-0 flex h-[100dvh] w-[92%] max-w-[430px] flex-col overflow-hidden bg-white shadow-[25px_0_80px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex min-h-[88px] shrink-0 items-center justify-between border-b border-black/10 px-6">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={`${storeName} homepage`}
            className="inline-flex bg-transparent shadow-none"
          >
            <BrandLogo variant="black" className="w-[150px]" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-12 w-12 items-center justify-center border border-black/10 bg-white text-black shadow-none transition duration-300 hover:border-black hover:bg-black hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col">
            <nav className="px-6 pt-6">
              <div className="divide-y divide-black/10 border-y border-black/10">
                {navigationLinks.map((link) => {
                  const active = linkIsActive(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="group flex min-h-[76px] items-center justify-between bg-transparent py-4 shadow-none"
                    >
                      <span
                        className={`text-[29px] font-semibold tracking-[-0.045em] transition duration-300 group-hover:translate-x-1 ${
                          active
                            ? "text-black"
                            : "text-black/50 group-hover:text-black"
                        }`}
                      >
                        {link.label}
                      </span>

                      {active ? (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-black" />
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-black/25 transition duration-300 group-hover:translate-x-1 group-hover:text-black" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="mt-auto px-6 pb-7 pt-9">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
                Quick access
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openSearch}
                  className="group flex min-h-[82px] flex-col items-center justify-center gap-2.5 border border-black/10 bg-white px-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-black shadow-none transition duration-300 hover:border-black hover:bg-black hover:text-white"
                >
                  <Search className="h-5 w-5 transition duration-300 group-hover:scale-105" />
                  Search
                </button>

                <Link
                  href="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="group relative flex min-h-[82px] flex-col items-center justify-center gap-2.5 border border-black/10 bg-white px-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-black shadow-none transition duration-300 hover:border-black hover:bg-black hover:text-white"
                >
                  <span className="relative">
                    <Heart
                      className={`h-5 w-5 transition duration-300 group-hover:scale-105 ${
                        visibleWishlistCount > 0 ? "fill-current" : ""
                      }`}
                    />
                  </span>
                  Wishlist
                </Link>

                {mobileUtilityLinks.map((link) => {
                  const Icon = link.icon;

                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="group flex min-h-[82px] flex-col items-center justify-center gap-2.5 border border-black/10 bg-white px-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-black shadow-none transition duration-300 hover:border-black hover:bg-black hover:text-white"
                    >
                      <Icon className="h-5 w-5 transition duration-300 group-hover:scale-105" />

                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-7 border-t border-black/10 pt-5">
                <p className="text-xs leading-6 text-black/40">
                  Selected Italian women&apos;s apparel for modern everyday
                  style.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  const searchPanel = (
    <div
      className={`fixed inset-0 z-[2147483005] transition ${
        searchOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={closeSearch}
        aria-label="Close product search"
        className={`fixed inset-0 bg-black/55 backdrop-blur-[3px] transition-opacity duration-300 ${
          searchOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className={`fixed inset-x-0 top-0 flex max-h-[100dvh] min-h-[72vh] flex-col overflow-hidden bg-white shadow-[0_30px_100px_rgba(0,0,0,0.25)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:inset-x-5 sm:top-5 sm:max-h-[calc(100dvh-40px)] sm:min-h-0 lg:left-1/2 lg:right-auto lg:w-[min(1100px,calc(100%-80px))] lg:-translate-x-1/2 ${
          searchOpen ? "translate-y-0" : "-translate-y-[110%]"
        }`}
      >
        <header className="flex min-h-[78px] shrink-0 items-center justify-between border-b border-black/10 px-5 sm:min-h-[88px] sm:px-8">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-black/35">
              {storeName}
            </p>

            <h2 className="mt-1 text-lg font-semibold uppercase tracking-[0.12em]">
              Search products
            </h2>
          </div>

          <button
            type="button"
            onClick={closeSearch}
            aria-label="Close search"
            className="flex h-12 w-12 items-center justify-center border border-black/10 bg-white text-black transition hover:border-black hover:bg-black hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="shrink-0 border-b border-black/10 px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex min-h-[62px] items-center gap-4 border border-black bg-white px-4 sm:min-h-[72px] sm:px-6">
            <Search className="h-5 w-5 shrink-0 text-black/40" />

            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  rememberSearch(query);
                }
              }}
              placeholder="Search dresses, tops, bags..."
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-black/30 sm:text-xl"
            />

            {searchLoading ? (
              <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-black/40" />
            ) : null}

            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/40 transition hover:text-black"
              >
                Clear
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-xs text-black/40">
            Enter at least two letters to search the collection.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {cleanedQuery.length < 2 ? (
            <div className="px-5 py-8 sm:px-8 sm:py-10">
              {recentSearches.length > 0 ? (
                <section className="mb-9 border-b border-black/10 pb-8">
                  <div className="flex items-center justify-between gap-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
                      Recent searches
                    </p>

                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/35 transition hover:text-black"
                    >
                      Clear history
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {recentSearches.map((search) => (
                      <div
                        key={search}
                        className="flex min-h-10 items-stretch overflow-hidden border border-black/10 bg-white transition hover:border-black"
                      >
                        <button
                          type="button"
                          onClick={() => reuseSearch(search)}
                          className="group flex min-w-0 items-center gap-3 px-4 text-left text-xs font-medium text-black/65 transition hover:bg-black hover:text-white"
                        >
                          <Search className="h-3.5 w-3.5 shrink-0 text-black/30 transition group-hover:text-white/65" />

                          <span className="max-w-[180px] truncate">
                            {search}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeRecentSearch(search)}
                          aria-label={`Remove ${search} from recent searches`}
                          title="Remove this search"
                          className="flex w-10 shrink-0 items-center justify-center border-l border-black/10 text-black/35 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
                Explore
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {searchSuggestions.map((suggestion) => (
                  <Link
                    key={suggestion.href}
                    href={suggestion.href}
                    onClick={closeSearch}
                    className="group flex min-h-[68px] items-center justify-between border border-black/10 px-5 transition hover:border-black hover:bg-black hover:text-white"
                  >
                    <span className="text-sm font-semibold">
                      {suggestion.label}
                    </span>

                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {searchError ? (
            <div className="px-5 py-10 sm:px-8">
              <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {searchError}
              </div>
            </div>
          ) : null}

          {!searchLoading &&
          !searchError &&
          cleanedQuery.length >= 2 &&
          searchResults.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
              <Search className="h-8 w-8 text-black/20" />

              <h3 className="mt-5 text-2xl font-semibold">No products found</h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-black/45">
                No published products match “{cleanedQuery}”. Try another
                product name.
              </p>

              <Link
                href="/shop"
                onClick={closeSearch}
                className="mt-6 inline-flex min-h-12 items-center justify-center border border-black bg-black px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#242424]"
              >
                Browse all products
              </Link>
            </div>
          ) : null}

          {!searchError && searchResults.length > 0 ? (
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
                  Search results
                </p>

                <p className="text-xs text-black/40">
                  {searchResults.length}{" "}
                  {searchResults.length === 1 ? "product" : "products"}
                </p>
              </div>

              <div className="divide-y divide-black/10 border-y border-black/10">
                {searchResults.map((product) => (
                  <Link
                    key={product.id}
                    href={`/shop/${encodeURIComponent(product.slug)}`}
                    onClick={() => {
                      rememberSearch(cleanedQuery);
                      closeSearch();
                    }}
                    className="group grid grid-cols-[84px_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[110px_1fr_auto] sm:gap-6 sm:py-5"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-[#f3f2ef]">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.imageAlt}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-[8px] font-semibold uppercase tracking-[0.15em] text-black/25">
                            No image
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
                        {product.category}
                      </p>

                      <h3 className="mt-2 truncate text-sm font-semibold transition group-hover:underline sm:text-lg">
                        {product.name}
                      </h3>

                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${availabilityDotClass(
                            product.availabilityStatus,
                          )}`}
                        />

                        <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-black/45">
                          {product.availability}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-w-[80px] flex-col items-end">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold sm:text-base">
                          {formatPrice(product.price)}
                        </span>

                        {product.onSale && product.regularPrice !== null ? (
                          <span className="text-xs text-black/35 line-through">
                            {formatPrice(product.regularPrice)}
                          </span>
                        ) : null}
                      </div>

                      <ArrowRight className="mt-4 h-4 w-4 text-black/25 transition group-hover:translate-x-1 group-hover:text-black" />
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Link
                  href="/shop"
                  onClick={closeSearch}
                  className="group inline-flex min-h-12 items-center gap-3 border border-black px-5 text-[9px] font-semibold uppercase tracking-[0.16em] transition hover:bg-black hover:text-white"
                >
                  View full collection
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "border-black/10 bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            : "border-black/10 bg-white"
        }`}
      >
        <div
          className={`mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-5 transition-all duration-300 sm:px-8 lg:px-12 ${
            scrolled ? "h-[72px]" : "h-[88px]"
          }`}
        >
          <nav className="hidden items-center gap-6 lg:flex xl:gap-7">
            {navigationLinks.map((link) => {
              const active = linkIsActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition xl:text-[11px] ${
                    active ? "text-black" : "text-black/50 hover:text-black"
                  }`}
                >
                  {link.label}

                  <span
                    className={`absolute inset-x-0 bottom-0 h-px origin-left bg-black transition-transform duration-300 ${
                      active
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            className="flex h-11 w-11 items-center justify-start bg-transparent text-black shadow-none lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link
            href="/"
            className="justify-self-center bg-transparent text-center shadow-none"
          >
            <span className="block whitespace-nowrap text-xl font-semibold uppercase tracking-[0.24em] sm:text-2xl">
              {storeName}
            </span>

            <span className="mt-1 hidden text-[8px] font-medium uppercase tracking-[0.3em] text-black/35 sm:block">
              Italian apparel
            </span>
          </Link>

          <div className="flex items-center justify-end gap-3 sm:gap-4 xl:gap-5">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search products"
              aria-expanded={searchOpen}
              className="hidden items-center gap-2 bg-transparent text-[11px] font-semibold uppercase tracking-[0.15em] text-black/50 shadow-none transition hover:text-black sm:inline-flex"
            >
              <Search className="h-4 w-4" />

              <span className="hidden 2xl:inline">Search</span>
            </button>

            <Link
              href="/track-order"
              aria-label="Track order"
              className="hidden items-center gap-2 bg-transparent text-[11px] font-semibold uppercase tracking-[0.15em] text-black/50 shadow-none transition hover:text-black xl:inline-flex"
            >
              <PackageSearch className="h-4 w-4" />

              <span className="hidden 2xl:inline">Track</span>
            </Link>

            <Link
              href="/account"
              aria-label="Account"
              className="hidden items-center gap-2 bg-transparent text-[11px] font-semibold uppercase tracking-[0.15em] text-black/50 shadow-none transition hover:text-black sm:inline-flex"
            >
              <UserRound className="h-4 w-4" />

              <span className="hidden 2xl:inline">Account</span>
            </Link>

            <div className="hidden sm:block">
              <WishlistButton />
            </div>

            <CartButton />
          </div>
        </div>
      </header>

      {mounted
        ? createPortal(
            <>
              {mobileMenu}
              {searchPanel}
            </>,
            document.body,
          )
        : null}
    </>
  );
}
