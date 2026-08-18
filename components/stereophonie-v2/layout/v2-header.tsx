"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
  } from "next/navigation";
import {
  ChevronRight,
  Heart,
  LoaderCircle,
  MapPin,
  Menu,
  PackageSearch,
  Search,
  ShoppingCart,
  UserRound,
  X,
  } from "lucide-react";
import { FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import BrandLogo from "@/components/storefront/brand-logo";
import { useCart } from "@/components/cart/cart-provider";

const SEARCH_HISTORY_STORAGE_KEY =
  "stereophonie-v2-search-history";

const MAX_SEARCH_HISTORY = 7;

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string;
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
  brands?: string[];
  categories?: string[];
  error?: string;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "PRICE N/A";
  }

  return money.format(value);
}

function availabilityClass(status: string) {
  if (status === "in_stock") {
    return "is-stock";
  }

  if (status === "low_stock") {
    return "is-low";
  }

  if (status === "coming_soon") {
    return "is-coming";
  }

  return "is-out";
}

function HighlightMatch({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const clean = query.trim();

  if (!clean) {
    return <>{text}</>;
  }

  const index = text
    .toLowerCase()
    .indexOf(clean.toLowerCase());

  if (index < 0) {
    return <>{text}</>;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark>
        {text.slice(index, index + clean.length)}
      </mark>
      {text.slice(index + clean.length)}
    </>
  );
}


type HeaderCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
};

export default function V2Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedHeaderCategory =
    searchParams.get("category")?.trim().toLowerCase() ?? "";

  const isOffersActive =
    pathname === "/shop" &&
    searchParams.get("offers") === "true";


  const isAllProductsActive =
    pathname === "/shop" &&
    !isOffersActive &&
    selectedHeaderCategory.length === 0;

  function isHeaderCategoryActive(categoryName: string) {
    return (
      pathname === "/shop" &&
      !isOffersActive &&
      selectedHeaderCategory ===
        categoryName.trim().toLowerCase()
    );
  }


  const isTrackOrderPage =
    pathname === "/track-order" ||
    pathname.startsWith("/track-order/");

  const {
    totalItems,
    isCartReady,
    openCart,
  } = useCart();

  const categoryStripRef =
    useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [headerCategories, setHeaderCategories] =
    useState<HeaderCategory[]>([]);



  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchLoading, setSearchLoading] =
    useState(false);

  const [searchError, setSearchError] =
    useState<string | null>(null);

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([]);

  const [brandSuggestions, setBrandSuggestions] =
    useState<string[]>([]);

  const [
    categorySuggestions,
    setCategorySuggestions,
  ] = useState<string[]>([]);

  const [activeResult, setActiveResult] =
    useState(-1);

  const [recentSearches, setRecentSearches] =
    useState<string[]>([]);

  const searchRootRef =
    useRef<HTMLDivElement | null>(null);

  const cleanQuery = query.trim();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        SEARCH_HISTORY_STORAGE_KEY,
      );

      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return;
      }

      setRecentSearches(
        parsed
          .filter(
            (item): item is string =>
              typeof item === "string" &&
              item.trim().length > 0,
          )
          .slice(0, MAX_SEARCH_HISTORY),
      );
    } catch {
      window.localStorage.removeItem(
        SEARCH_HISTORY_STORAGE_KEY,
      );
    }
  }, []);

  useEffect(() => {
    if (cleanQuery.length < 1) {
      setSearchResults([]);
      setBrandSuggestions([]);
      setCategorySuggestions([]);
      setSearchLoading(false);
      setSearchError(null);
      setActiveResult(-1);

      return;
    }

    const controller =
      new AbortController();

    const timer = window.setTimeout(
      async () => {
        setSearchLoading(true);
        setSearchError(null);

        try {
          const response = await fetch(
            `/api/products/search?q=${encodeURIComponent(
              cleanQuery,
            )}`,
            {
              signal: controller.signal,
              headers: {
                Accept: "application/json",
              },
            },
          );

          const data =
            (await response.json()) as SearchResponse;

          if (!response.ok) {
            throw new Error(
              data.error ??
                "Search database unavailable.",
            );
          }

          setSearchResults(
            data.results ?? [],
          );

          setBrandSuggestions(
            data.brands ?? [],
          );

          setCategorySuggestions(
            data.categories ?? [],
          );

          setActiveResult(-1);
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          setSearchResults([]);
          setBrandSuggestions([]);
          setCategorySuggestions([]);

          setSearchError(
            error instanceof Error
              ? error.message
              : "Search database unavailable.",
          );
        } finally {
          if (!controller.signal.aborted) {
            setSearchLoading(false);
          }
        }
      },
      220,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cleanQuery]);

  useEffect(() => {
    function handleOutside(
      event: MouseEvent,
    ) {
      if (
        searchRootRef.current &&
        !searchRootRef.current.contains(
          event.target as Node,
        )
      ) {
        setSearchOpen(false);
        setActiveResult(-1);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside,
      );
    };
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setActiveResult(-1);
  }, [pathname]);

  function saveSearchHistory(
    searches: string[],
  ) {
    setRecentSearches(searches);

    if (searches.length === 0) {
      window.localStorage.removeItem(
        SEARCH_HISTORY_STORAGE_KEY,
      );

      return;
    }

    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(searches),
    );
  }

  function rememberSearch(value: string) {
    const cleaned = value.trim();

    if (!cleaned) {
      return;
    }

    const next = [
      cleaned,
      ...recentSearches.filter(
        (search) =>
          search.toLowerCase() !==
          cleaned.toLowerCase(),
      ),
    ].slice(0, MAX_SEARCH_HISTORY);

    saveSearchHistory(next);
  }

  function clearSearchHistory() {
    saveSearchHistory([]);
  }

  function removeSearchHistoryItem(
    value: string,
  ) {
    saveSearchHistory(
      recentSearches.filter(
        (search) => search !== value,
      ),
    );
  }

  function reuseSearchHistory(
    value: string,
  ) {
    setQuery(value);
    setSearchOpen(true);
    setActiveResult(-1);
  }


  useEffect(() => {
    let cancelled = false;

    async function loadHeaderCategories() {
      try {
        const response = await fetch(
          "/api/storefront/header-categories",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Header category request failed (${response.status})`,
          );
        }

        const payload = (await response.json()) as {
          categories?: HeaderCategory[];
        };

        if (cancelled) {
          return;
        }

        const categories = Array.isArray(payload.categories)
          ? payload.categories.filter(
              (category) =>
                Boolean(category?.id) &&
                Boolean(category?.name?.trim()),
            )
          : [];

        setHeaderCategories(categories);
      } catch (error) {
        console.error(
          "Stereophonie header categories could not load:",
          error,
        );

        if (!cancelled) {
          setHeaderCategories([]);
        }
      }
    }

    void loadHeaderCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  
  /* HEADER CATEGORY AUTO-SCROLL EFFECT START */
  useEffect(() => {
    const currentRail =
      categoryStripRef.current;

    if (!currentRail) {
      return;
    }

    const railElement: HTMLDivElement =
      currentRail;

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
    ) {
      return;
    }

    let animationFrame = 0;

    let direction: 1 | -1 = 1;

    let previousTime =
      performance.now();

    /*
     * Smooth, clearly visible speed.
     */
    const speed = 120;

    let pauseUntil =
      performance.now() + 350;

    let pointerInside = false;

    let virtualScroll =
      railElement.scrollLeft;

    function pauseFor(
      milliseconds: number,
    ) {
      pauseUntil =
        performance.now() +
        milliseconds;
    }

    function syncVirtualPosition() {
      virtualScroll =
        railElement.scrollLeft;
    }

    function animate(now: number) {
      const deltaSeconds = Math.min(
        Math.max(
          (now - previousTime) / 1000,
          0,
        ),
        0.04,
      );

      previousTime = now;

      const maxScroll = Math.max(
        0,
        railElement.scrollWidth -
          railElement.clientWidth,
      );

      if (maxScroll <= 1) {
        virtualScroll = 0;
        railElement.scrollLeft = 0;

        animationFrame =
          window.requestAnimationFrame(
            animate,
          );

        return;
      }

      if (
        pointerInside ||
        now < pauseUntil
      ) {
        syncVirtualPosition();

        animationFrame =
          window.requestAnimationFrame(
            animate,
          );

        return;
      }

      virtualScroll +=
        speed *
        deltaSeconds *
        direction;

      /*
       * RIGHT EDGE:
       * pause briefly then reverse.
       */
      if (virtualScroll >= maxScroll) {
        virtualScroll = maxScroll;
        direction = -1;
        pauseUntil = now + 220;
      }

      /*
       * LEFT EDGE:
       * pause briefly then move right again.
       */
      else if (virtualScroll <= 0) {
        virtualScroll = 0;
        direction = 1;
        pauseUntil = now + 220;
      }

      railElement.scrollLeft =
        virtualScroll;

      animationFrame =
        window.requestAnimationFrame(
          animate,
        );
    }

    function handlePointerEnter() {
      pointerInside = true;
      syncVirtualPosition();
    }

    function handlePointerLeave() {
      pointerInside = false;
      syncVirtualPosition();
      pauseFor(400);
    }

    function handleManualInteraction() {
      syncVirtualPosition();
      pauseFor(1100);
    }

    function handleScroll() {
      if (
        pointerInside ||
        performance.now() < pauseUntil
      ) {
        syncVirtualPosition();
      }
    }

    railElement.addEventListener(
      "pointerenter",
      handlePointerEnter,
    );

    railElement.addEventListener(
      "pointerleave",
      handlePointerLeave,
    );

    railElement.addEventListener(
      "pointerdown",
      handleManualInteraction,
      {
        passive: true,
      },
    );

    railElement.addEventListener(
      "touchstart",
      handleManualInteraction,
      {
        passive: true,
      },
    );

    railElement.addEventListener(
      "wheel",
      handleManualInteraction,
      {
        passive: true,
      },
    );

    railElement.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    animationFrame =
      window.requestAnimationFrame(
        animate,
      );

    return () => {
      window.cancelAnimationFrame(
        animationFrame,
      );

      railElement.removeEventListener(
        "pointerenter",
        handlePointerEnter,
      );

      railElement.removeEventListener(
        "pointerleave",
        handlePointerLeave,
      );

      railElement.removeEventListener(
        "pointerdown",
        handleManualInteraction,
      );

      railElement.removeEventListener(
        "touchstart",
        handleManualInteraction,
      );

      railElement.removeEventListener(
        "wheel",
        handleManualInteraction,
      );

      railElement.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, [headerCategories.length]);
  /* HEADER CATEGORY AUTO-SCROLL EFFECT END */

function submitSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value = query.trim();

    if (value) {
      rememberSearch(value);
    }

    setSearchOpen(false);

    router.push(
      value
        ? `/shop?search=${encodeURIComponent(
            value,
          )}`
        : "/shop",
    );
  }

  function openProduct(
    product: SearchResult,
  ) {
    if (cleanQuery) {
      rememberSearch(cleanQuery);
    }

    setSearchOpen(false);
    setActiveResult(-1);

    router.push(
      `/shop/${encodeURIComponent(
        product.slug,
      )}`,
    );
  }

  function searchBrand(brand: string) {
    setSearchOpen(false);

    router.push(
      `/shop?brand=${encodeURIComponent(
        brand,
      )}`,
    );
  }

  function searchCategory(
    category: string,
  ) {
    setSearchOpen(false);

    router.push(
      `/shop?category=${encodeURIComponent(
        category,
      )}`,
    );
  }

  function handleSearchKeyboard(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchOpen(false);
      setActiveResult(-1);
      return;
    }

    if (
      event.key === "ArrowDown" &&
      searchResults.length > 0
    ) {
      event.preventDefault();

      setSearchOpen(true);

      setActiveResult((current) => {
        if (
          current >=
          searchResults.length - 1
        ) {
          return 0;
        }

        return current + 1;
      });

      return;
    }

    if (
      event.key === "ArrowUp" &&
      searchResults.length > 0
    ) {
      event.preventDefault();

      setSearchOpen(true);

      setActiveResult((current) => {
        if (current <= 0) {
          return (
            searchResults.length - 1
          );
        }

        return current - 1;
      });

      return;
    }

    if (
      event.key === "Enter" &&
      activeResult >= 0 &&
      searchResults[activeResult]
    ) {
      event.preventDefault();

      openProduct(
        searchResults[activeResult],
      );
    }
  }

  const hasSuggestions =
    brandSuggestions.length > 0 ||
    categorySuggestions.length > 0;

  const hasResults =
    searchResults.length > 0;

  return (
    <>
      <header className="st-v2-header">
        <div className="st-v2-header__signal">
          <div className="st-v2-container st-v2-header__signal-inner">
            <div>
              <span className="st-v2-led" />
              <span>SYSTEM ONLINE</span>
            </div>

            <div className="st-v2-header__signal-right">
              <Link
                href="/track-order"
                className="st-v2-header__track-order"
                aria-label="Track your order"
              >
                <PackageSearch />
                TRACK ORDER
              </Link>

              <span>
                DELIVERY / LEBANON
              </span>

              <span>
                STORE PICKUP / AVAILABLE
              </span>
            </div>
          </div>
        </div>

        <div className="st-v2-header__main">
          <div className="st-v2-container st-v2-header__main-inner">
            <Link
              href="/"
              className="st-v2-header__logo"
            >
              <BrandLogo
                className="w-[190px] md:w-[225px]"
                priority
              />
            </Link>

            <div
              ref={searchRootRef}
              className="st-v2-live-search"
            >
              <form
                className={`st-v2-header__search st-v2-live-search__form ${
                  searchOpen ? "is-live-search-open" : ""
                }`}
                onSubmit={submitSearch}
                role="search"
              >
                <Search className="st-v2-live-search__search-icon" />

                <div className="st-v2-live-search__input-shell">
                  <input
                    value={query}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onKeyDown={handleSearchKeyboard}
                    placeholder="Search products, brands, models..."
                    aria-label="Search products"
                    aria-expanded={searchOpen}
                    aria-controls="st-v2-search-results"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <div className="st-v2-live-search__input-actions">
                    {searchLoading ? (
                      <LoaderCircle className="st-v2-live-search__loader" />
                    ) : null}

                    {query ? (
                      <button
                        type="button"
                        className="st-v2-live-search__clear"
                        aria-label="Clear search"
                        title="Clear search"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setQuery("");
                          setSearchResults([]);
                          setBrandSuggestions([]);
                          setCategorySuggestions([]);
                          setSearchOpen(true);
                          setActiveResult(-1);
                        }}
                      >
                        <X />
                      </button>
                    ) : null}
                  </div>
                </div>

                <button
                  type="submit"
                  className="st-v2-live-search__go"
                  aria-label="Search"
                >
                  <span>GO</span>
                  <ChevronRight />
                </button>
              </form>

              <div
                id="st-v2-search-results"
                className={`st-v2-live-search__panel ${
                  searchOpen
                    ? "is-open"
                    : ""
                }`}
              >
                {cleanQuery.length === 0 ? (
                  <div className="st-v2-live-search__idle">
                    <div className="st-v2-live-search__idle-status">
                      <span className="st-v2-led" />
                      LIVE PRODUCT DATABASE
                    </div>

                    {recentSearches.length > 0 ? (
                      <section className="st-v2-live-search__history">
                        <div className="st-v2-live-search__history-head">
                          <div>
                            <span>SEARCH MEMORY</span>
                            <strong>RECENT SEARCHES</strong>
                          </div>

                          <button
                            type="button"
                            onClick={clearSearchHistory}
                          >
                            CLEAR ALL
                          </button>
                        </div>

                        <div className="st-v2-live-search__history-list">
                          {recentSearches.map(
                            (search, index) => (
                              <div
                                key={`${search}-${index}`}
                                className="st-v2-live-search__history-row"
                              >
                                <button
                                  type="button"
                                  className="st-v2-live-search__history-reuse"
                                  onClick={() =>
                                    reuseSearchHistory(
                                      search,
                                    )
                                  }
                                >
                                  <Search />

                                  <span>
                                    {search}
                                  </span>

                                  <ChevronRight />
                                </button>

                                <button
                                  type="button"
                                  className="st-v2-live-search__history-remove"
                                  aria-label={`Remove ${search} from search history`}
                                  title="Remove this search"
                                  onClick={() =>
                                    removeSearchHistoryItem(
                                      search,
                                    )
                                  }
                                >
                                  <X />
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    ) : (
                      <div className="st-search-welcome-v3">
                        <section className="st-search-welcome-v3__intro">
                          <div className="st-search-welcome-v3__eyebrow">
                            <span className="st-v2-led" />
                            SEARCH SYSTEM / READY
                          </div>

                          <h3>
                            START
                            <br />
                            TYPING<span>.</span>
                          </h3>

                          <p>
                            Search the complete Stereophonie catalog instantly.
                            Find products, brands, categories and models as you type.
                          </p>

                          <div className="st-search-welcome-v3__ready">
                          <span>INPUT STATUS</span>
                          <b className="st-search-welcome-v3__ready-slash">/</b>
                          <strong>READY</strong>
                          <i />
                        </div>
                        </section>

                        <section className="st-search-welcome-v3__database">
                          <header>
                            <div>
                              <span>SEARCHABLE DATABASE</span>
                              <strong>CATALOG INDEX</strong>
                            </div>

                            <small>04 SOURCES</small>
                          </header>

                          <div className="st-search-welcome-v3__grid">
                            <div>
                              <span>01</span>
                              <strong>PRODUCTS</strong>
                              <small>DEVICE CATALOG</small>
                            </div>

                            <div>
                              <span>02</span>
                              <strong>BRANDS</strong>
                              <small>MANUFACTURERS</small>
                            </div>

                            <div>
                              <span>03</span>
                              <strong>CATEGORIES</strong>
                              <small>PRODUCT TYPES</small>
                            </div>

                            <div>
                              <span>04</span>
                              <strong>MODELS</strong>
                              <small>HARDWARE NAMES</small>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                ) : null}

                {cleanQuery.length >
                  0 &&
                searchLoading &&
                !hasResults ? (
                  <div className="st-v2-live-search__state">
                    <LoaderCircle />
                    <span>
                      SCANNING CATALOG...
                    </span>
                  </div>
                ) : null}

                {searchError ? (
                  <div className="st-v2-live-search__state is-error">
                    <span>
                      SEARCH SYSTEM ERROR
                    </span>

                    <small>
                      {searchError}
                    </small>
                  </div>
                ) : null}

                {!searchError &&
                !searchLoading &&
                cleanQuery.length >
                  0 &&
                !hasResults &&
                !hasSuggestions ? (
                  <div className="st-v2-live-search__empty">
                    <Search />

                    <span>
                      RESULT / 000
                    </span>

                    <strong>
                      NO HARDWARE FOUND.
                    </strong>

                    <p>
                      Try another product,
                      brand or model.
                    </p>
                  </div>
                ) : null}

                {!searchError &&
                cleanQuery.length >
                  0 &&
                hasSuggestions ? (
                  <div className="st-v2-live-search__suggestions">
                    {brandSuggestions.length >
                    0 ? (
                      <section>
                        <span>
                          BRANDS
                        </span>

                        <div>
                          {brandSuggestions.map(
                            (brand) => (
                              <button
                                key={
                                  brand
                                }
                                type="button"
                                onClick={() =>
                                  searchBrand(
                                    brand,
                                  )
                                }
                              >
                                <span>
                                  {
                                    brand
                                  }
                                </span>

                                <ChevronRight />
                              </button>
                            ),
                          )}
                        </div>
                      </section>
                    ) : null}

                    {categorySuggestions.length >
                    0 ? (
                      <section>
                        <span>
                          CATEGORIES
                        </span>

                        <div>
                          {categorySuggestions.map(
                            (
                              category,
                            ) => (
                              <button
                                key={
                                  category
                                }
                                type="button"
                                onClick={() =>
                                  searchCategory(
                                    category,
                                  )
                                }
                              >
                                <span>
                                  {
                                    category
                                  }
                                </span>

                                <ChevronRight />
                              </button>
                            ),
                          )}
                        </div>
                      </section>
                    ) : null}
                  </div>
                ) : null}

                {!searchError &&
                hasResults ? (
                  <section className="st-v2-live-search__products">
                    <header>
                      <div>
                        <span className="st-v2-led" />
                        PRODUCT MATCHES
                      </div>

                      <strong>
                        {String(
                          searchResults.length,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </strong>
                    </header>

                    <div className="st-v2-live-search__product-list">
                      {searchResults.map(
                        (
                          product,
                          index,
                        ) => (
                          <button
                            key={
                              product.id
                            }
                            type="button"
                            className={
                              activeResult ===
                              index
                                ? "is-active"
                                : ""
                            }
                            onMouseEnter={() =>
                              setActiveResult(
                                index,
                              )
                            }
                            onClick={() =>
                              openProduct(
                                product,
                              )
                            }
                          >
                            <div className="st-v2-live-search__image">
                              {product.imageUrl ? (
                                <img
                                  src={
                                    product.imageUrl
                                  }
                                  alt={
                                    product.imageAlt
                                  }
                                />
                              ) : (
                                <span>
                                  NO IMAGE
                                </span>
                              )}
                            </div>

                            <div className="st-v2-live-search__product-info">
                              <small>
                                {product.brand
                                  ? `${product.brand} / `
                                  : ""}
                                {
                                  product.category
                                }
                              </small>

                              <strong>
                                <HighlightMatch
                                  text={
                                    product.name
                                  }
                                  query={
                                    cleanQuery
                                  }
                                />
                              </strong>

                              <span
                                className={`st-v2-live-search__availability ${availabilityClass(
                                  product.availabilityStatus,
                                )}`}
                              >
                                <i />
                                {
                                  product.availability
                                }
                              </span>
                            </div>

                            <div className="st-v2-live-search__price">
                              <strong>
                                {formatPrice(
                                  product.price,
                                )}
                              </strong>

                              {product.onSale &&
                              product.regularPrice !==
                                null ? (
                                <del>
                                  {formatPrice(
                                    product.regularPrice,
                                  )}
                                </del>
                              ) : null}

                              <ChevronRight />
                            </div>
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="st-v2-live-search__all"
                      onClick={() => {
                        if (cleanQuery) {
                          rememberSearch(
                            cleanQuery,
                          );
                        }

                        setSearchOpen(
                          false,
                        );

                        router.push(
                          `/shop?search=${encodeURIComponent(
                            cleanQuery,
                          )}`,
                        );
                      }}
                    >
                      <span>
                        VIEW ALL RESULTS FOR
                        “{cleanQuery}”
                      </span>

                      <ChevronRight />
                    </button>
                  </section>
                ) : null}

                <div className="st-v2-live-search__keys">
                  <span>
                    ↑ ↓ NAVIGATE
                  </span>

                  <span>
                    ENTER SELECT
                  </span>

                  <span>
                    ESC CLOSE
                  </span>
                </div>
              </div>
            </div>

            <div className="st-v2-header__actions">
              <Link
                href="/track-order"
                className={`st-v2-header__track-main ${
                  isTrackOrderPage
                    ? "is-track-order-active"
                    : ""
                }`}
                aria-current={
                  isTrackOrderPage
                    ? "page"
                    : undefined
                }
                aria-label="Track your order"
              >
                <PackageSearch />
                <span>
                  TRACK ORDER
                </span>
              </Link>

              <Link
                href="/account"
                aria-label="Account"
              >
                <UserRound />
              </Link>

              <Link
                href="/wishlist"
                aria-label="Wishlist"
              >
                <Heart />
              </Link>

              <button
                type="button"
                onClick={openCart}
                className="st-v2-header__cart-trigger"
                aria-label={`Open cart terminal with ${totalItems} ${
                  totalItems === 1
                    ? "item"
                    : "items"
                }`}
              >
                <ShoppingCart />

                {isCartReady &&
                totalItems > 0 ? (
                  <span className="st-v2-header__cart-count">
                    {totalItems >
                    99
                      ? "99+"
                      : totalItems}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                className="st-v2-header__menu-button"
                onClick={() =>
                  setMenuOpen(true)
                }
                aria-label="Open menu"
              >
                <Menu />
              </button>
            </div>
          </div>
        </div>

        <div className="st-v2-header__departments">
          <div className="st-v2-container st-v2-header__departments-inner"
            ref={categoryStripRef}
          >
<Link
              href="/shop?offers=true"
              className={`is-offer ${
                isOffersActive ? "is-active" : ""
              }`}
              aria-current={
                isOffersActive ? "page" : undefined
              }
            >
              OFFERS
            </Link>
            <Link
              href="/shop"
            
              className={`is-primary ${
                isAllProductsActive ? "is-active" : ""
              }`}
              aria-current={
                isAllProductsActive ? "page" : undefined
              }
            >
              ALL PRODUCTS
            </Link>

            {headerCategories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(
                  category.name,
                )}`}
                title={category.name}
              
                className={
                  isHeaderCategoryActive(category.name)
                    ? "is-active"
                    : undefined
                }
                aria-current={
                  isHeaderCategoryActive(category.name)
                    ? "page"
                    : undefined
                }
              >
                {category.name.toUpperCase()}
              </Link>
            ))}
            </div>
        </div>
      </header>

      <div
        className={`st-v2-menu ${
          menuOpen
            ? "st-v2-menu--open"
            : ""
        }`}
      >
        <button
          type="button"
          className="st-v2-menu__backdrop"
          onClick={() =>
            setMenuOpen(false)
          }
          aria-label="Close menu"
        />

        <aside className="st-v2-menu__panel">
          <div className="st-v2-menu__top">
            <div>
              <span className="st-v2-led" />
              <span>
                MENU / PLAYER 01
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <X />
            </button>
          </div>

          <BrandLogo className="mt-8 w-[210px]" />

          <nav className="st-v2-menu__nav">
            <Link
              href="/shop"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <span>01</span>
              SHOP
              <ChevronRight />
            </Link>

            <Link
              href="/account"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <span>02</span>
              ACCOUNT
              <ChevronRight />
            </Link>

            <Link
              href="/wishlist"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <span>03</span>
              WISHLIST
              <ChevronRight />
            </Link>

            <Link
              href="/track-order"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <span>04</span>
              TRACK ORDER
              <ChevronRight />
            </Link>

            <Link
              href="/about"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <span>05</span>
              ABOUT
              <ChevronRight />
            </Link>
          </nav>

          <a
            href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
            target="_blank"
            rel="noreferrer"
            className="st-v2-menu__location"
          >
            <MapPin />
            VISIT STEREOPHONIE
          </a>
        </aside>
      </div>

      <style jsx>{`
        .st-v2-live-search {
          position: relative;
          z-index: 120;
          min-width: 0;
        }

        .st-v2-live-search
          :global(.st-v2-header__search) {
          position: relative;
          z-index: 2;
        }

        .st-v2-live-search
          :global(.st-v2-header__search.is-live-search-open) {
          border-color: #111;
        }


        @keyframes stSearchSpin {
          to {
            transform: rotate(360deg);
          }
        }


        /*
         * SEARCH INPUT V2
         * Keep the original header geometry intact while allowing
         * loading / clear controls to live inside the input.
         */

        .st-v2-live-search {
          width: 100%;
          min-width: 0;
        }

        .st-v2-live-search__form {
          position: relative;

          display: grid !important;
          grid-template-columns:
            46px
            minmax(0, 1fr)
            82px !important;

          width: 100%;
          min-width: 0;

          align-items: stretch !important;

          padding: 0 !important;

          overflow: hidden;

          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .st-v2-live-search__form.is-live-search-open {
          border-color: rgba(0, 0, 0, 0.72) !important;

          box-shadow:
            inset 0 -2px 0 rgba(237, 28, 36, 0.9);
        }

        .st-v2-live-search__search-icon {
          align-self: center;

          width: 18px !important;
          height: 18px !important;

          margin: 0 auto !important;

          color: rgba(0, 0, 0, 0.48);

          pointer-events: none;
        }

        .st-v2-live-search__input-shell {
          position: relative;

          display: flex;
          min-width: 0;
          height: 100%;

          align-items: center;
        }

        .st-v2-live-search__input-shell input {
          width: 100% !important;
          min-width: 0 !important;
          height: 100% !important;
          min-height: 52px !important;

          margin: 0 !important;

          border: 0 !important;
          outline: 0 !important;

          padding:
            0
            82px
            0
            0 !important;

          background: transparent !important;
          color: #111 !important;

          font-family:
            Arial,
            Helvetica,
            sans-serif !important;

          font-size: 14px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
          letter-spacing: -0.01em !important;

          appearance: none;
          -webkit-appearance: none;
        }

        .st-v2-live-search__input-shell input::placeholder {
          color: rgba(0, 0, 0, 0.38) !important;

          font-size: 13px !important;
          font-weight: 400 !important;
          letter-spacing: 0 !important;

          opacity: 1;
        }

        .st-v2-live-search__input-shell input::-webkit-search-cancel-button {
          display: none;
          -webkit-appearance: none;
        }

        .st-v2-live-search__input-actions {
          position: absolute;

          top: 50%;
          right: 10px;

          display: flex;
          align-items: center;
          gap: 4px;

          transform: translateY(-50%);
        }

        .st-v2-live-search__loader {
          position: static !important;

          width: 16px !important;
          height: 16px !important;

          flex: 0 0 auto;

          margin: 0 5px 0 0 !important;

          color: rgba(0, 0, 0, 0.38);

          animation: stSearchSpin 0.8s linear infinite;
        }

        .st-v2-live-search__clear {
          position: static !important;

          display: grid !important;

          width: 31px !important;
          min-width: 31px !important;
          height: 31px !important;
          min-height: 31px !important;

          place-items: center !important;
          flex: 0 0 31px !important;

          margin: 0 !important;

          border: 1px solid transparent !important;
          border-radius: 0 !important;

          padding: 0 !important;

          background: transparent !important;
          color: rgba(0, 0, 0, 0.35) !important;

          box-shadow: none !important;

          transition:
            color 150ms ease,
            background 150ms ease,
            border-color 150ms ease !important;
        }

        .st-v2-live-search__clear:hover,
        .st-v2-live-search__clear:focus-visible {
          border-color: rgba(0, 0, 0, 0.1) !important;

          background: rgba(0, 0, 0, 0.045) !important;
          color: #111 !important;

          transform: none !important;
        }

        .st-v2-live-search__clear svg {
          width: 14px !important;
          height: 14px !important;

          stroke-width: 1.8;
        }

        .st-v2-live-search__go {
          position: relative;

          display: flex !important;

          width: 82px !important;
          min-width: 82px !important;
          height: 100% !important;
          min-height: 52px !important;

          align-items: center !important;
          justify-content: center !important;

          gap: 8px !important;

          grid-column: 3 !important;
          grid-row: 1 !important;

          margin: 0 !important;

          border: 0 !important;
          border-left:
            1px solid
            rgba(255, 255, 255, 0.08) !important;

          border-radius: 0 !important;

          padding: 0 14px !important;

          background: #090909 !important;
          color: #fff !important;

          box-shadow: none !important;

          font-size: 9px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          letter-spacing: 0.16em !important;
          text-transform: uppercase !important;

          overflow: hidden;

          transition:
            background 160ms ease,
            color 160ms ease !important;
        }

        .st-v2-live-search__go::after {
          position: absolute;

          right: 0;
          bottom: 0;
          left: 0;

          height: 2px;

          background: #ed1c24;

          content: "";

          transform: scaleX(0);
          transform-origin: left;

          transition:
            transform 180ms ease;
        }

        .st-v2-live-search__go:hover {
          background: #181818 !important;

          transform: none !important;
        }

        .st-v2-live-search__go:hover::after,
        .st-v2-live-search__go:focus-visible::after {
          transform: scaleX(1);
        }

        .st-v2-live-search__go span {
          display: block;

          transform: translateY(0.5px);
        }

        .st-v2-live-search__go svg {
          width: 13px !important;
          height: 13px !important;

          flex: 0 0 auto;

          stroke-width: 2;
        }

        @media (max-width: 1180px) {
          .st-v2-live-search__form {
            grid-template-columns:
              40px
              minmax(0, 1fr)
              72px !important;
          }

          .st-v2-live-search__go {
            width: 72px !important;
            min-width: 72px !important;
          }

          .st-v2-live-search__input-shell input {
            font-size: 13px !important;
          }
        }


        /*
         * =====================================================
         * STEREOPHONIE LIVE SEARCH — PRECISION CONTROL PASS
         * Exact vertical alignment for icon / input / clear / GO
         * =====================================================
         */

        .st-v2-live-search__form {
          --st-search-height: 54px;

          display: flex !important;
          width: 100%;
          height: var(--st-search-height) !important;
          min-height: var(--st-search-height) !important;

          align-items: center !important;

          overflow: hidden;

          padding: 0 !important;

          border: 1px solid rgba(0, 0, 0, 0.18) !important;

          background: rgba(255, 255, 255, 0.96) !important;
        }

        .st-v2-live-search__form.is-live-search-open {
          border-color: rgba(0, 0, 0, 0.72) !important;

          box-shadow:
            inset 0 -2px 0 #ed1c24 !important;
        }

        /*
         * Search icon column
         */

        .st-v2-live-search__search-icon {
          display: block !important;

          width: 18px !important;
          height: 18px !important;

          flex: 0 0 18px !important;

          align-self: center !important;

          margin:
            0
            17px
            0
            17px !important;

          color: rgba(0, 0, 0, 0.48) !important;

          transform: none !important;

          stroke-width: 1.8;

          pointer-events: none;
        }

        /*
         * Input body
         */

        .st-v2-live-search__input-shell {
          position: relative;

          display: flex !important;

          min-width: 0;
          height: 100% !important;

          flex: 1 1 auto;

          align-items: center !important;
        }

        .st-v2-live-search__input-shell input {
          display: block !important;

          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;

          margin: 0 !important;

          border: 0 !important;
          outline: 0 !important;

          padding:
            0
            78px
            0
            0 !important;

          background: transparent !important;

          color: #111 !important;

          font-size: 14px !important;
          font-weight: 500 !important;
          line-height: var(--st-search-height) !important;

          letter-spacing: -0.01em !important;

          vertical-align: middle !important;

          appearance: none;
          -webkit-appearance: none;
        }

        .st-v2-live-search__input-shell input::placeholder {
          color: rgba(0, 0, 0, 0.38) !important;

          font-size: 13px !important;
          font-weight: 400 !important;

          line-height: var(--st-search-height) !important;

          opacity: 1;
        }

        /*
         * Clear / loader controls
         */

        .st-v2-live-search__input-actions {
          position: absolute;

          top: 0;
          right: 8px;
          bottom: 0;

          display: flex !important;

          height: 100%;

          align-items: center !important;
          justify-content: center;

          gap: 5px;

          transform: none !important;
        }

        .st-v2-live-search__loader {
          display: block !important;

          width: 15px !important;
          height: 15px !important;

          flex: 0 0 15px !important;

          margin: 0 4px 0 0 !important;

          color: rgba(0, 0, 0, 0.35) !important;

          transform-origin: center;
        }

        .st-v2-live-search__clear {
          display: flex !important;

          width: 32px !important;
          height: 32px !important;

          min-width: 32px !important;
          min-height: 32px !important;

          flex: 0 0 32px !important;

          align-items: center !important;
          justify-content: center !important;

          margin: 0 !important;

          border: 0 !important;

          padding: 0 !important;

          background: transparent !important;
          color: rgba(0, 0, 0, 0.34) !important;

          line-height: 1 !important;

          transform: none !important;
        }

        .st-v2-live-search__clear:hover,
        .st-v2-live-search__clear:focus-visible {
          background: rgba(0, 0, 0, 0.045) !important;
          color: #111 !important;

          transform: none !important;
        }

        .st-v2-live-search__clear svg {
          display: block;

          width: 13px !important;
          height: 13px !important;

          margin: 0 !important;

          stroke-width: 1.8;
        }

        /*
         * GO control
         */

        .st-v2-live-search__go {
          position: relative;

          display: flex !important;

          width: 86px !important;
          min-width: 86px !important;

          height: var(--st-search-height) !important;
          min-height: var(--st-search-height) !important;

          flex: 0 0 86px !important;

          align-items: center !important;
          justify-content: center !important;

          gap: 9px !important;

          align-self: stretch !important;

          margin: 0 !important;

          border: 0 !important;
          border-left:
            1px solid
            rgba(255, 255, 255, 0.08) !important;

          padding: 0 !important;

          background: #090909 !important;
          color: #fff !important;

          font-size: 9px !important;
          font-weight: 900 !important;
          line-height: 1 !important;

          letter-spacing: 0.15em !important;

          text-transform: uppercase;

          transform: none !important;
        }

        .st-v2-live-search__go span {
          display: flex !important;

          height: 100%;

          align-items: center !important;
          justify-content: center !important;

          margin: 0 !important;

          line-height: 1 !important;

          transform: none !important;
        }

        .st-v2-live-search__go svg {
          display: block !important;

          width: 13px !important;
          height: 13px !important;

          flex: 0 0 13px !important;

          margin: 0 !important;

          stroke-width: 2;

          transform: none !important;
        }

        .st-v2-live-search__go::after {
          position: absolute;

          right: 0;
          bottom: 0;
          left: 0;

          height: 2px;

          background: #ed1c24;

          content: "";

          transform: scaleX(0);

          transform-origin: left center;

          transition:
            transform 180ms ease;
        }

        .st-v2-live-search__go:hover,
        .st-v2-live-search__go:focus-visible {
          background: #171717 !important;

          transform: none !important;
        }

        .st-v2-live-search__go:hover::after,
        .st-v2-live-search__go:focus-visible::after {
          transform: scaleX(1);
        }

        /*
         * Make inherited global SVG / button rules harmless
         */

        .st-v2-live-search__form > svg,
        .st-v2-live-search__form button svg {
          position: static !important;

          top: auto !important;
          right: auto !important;
          bottom: auto !important;
          left: auto !important;
        }

        @media (max-width: 1180px) {
          .st-v2-live-search__form {
            --st-search-height: 52px;
          }

          .st-v2-live-search__search-icon {
            margin:
              0
              14px
              0
              14px !important;
          }

          .st-v2-live-search__go {
            width: 78px !important;
            min-width: 78px !important;

            flex-basis: 78px !important;
          }
        }


        /*
         * =====================================================
         * SEARCH INPUT — FINAL SPACING / BASELINE PASS
         * =====================================================
         */

        .st-v2-live-search__search-icon {
          margin:
            0
            15px
            0
            17px !important;
        }

        .st-v2-live-search__input-shell input {
          padding:
            1px
            78px
            0
            8px !important;

          line-height: normal !important;
        }

        .st-v2-live-search__input-shell input::placeholder {
          line-height: normal !important;
        }

        /*
         * =====================================================
         * RECENT SEARCH MEMORY
         * =====================================================
         */

        .st-v2-live-search__idle {
          padding: 0 !important;
        }

        .st-v2-live-search__idle-status {
          display: flex;
          min-height: 42px;
          align-items: center;
          gap: 9px;

          padding: 0 18px;

          border-bottom:
            1px solid
            rgba(0, 0, 0, 0.1);

          background: #0a0a0a;

          color:
            rgba(
              255,
              255,
              255,
              0.55
            );

          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .st-v2-live-search__start {
          padding: 28px 30px 31px;
        }

        .st-v2-live-search__start
          strong {
          display: block;

          font-size: 22px;
          font-weight: 950;

          letter-spacing: -0.035em;
        }

        .st-v2-live-search__start p {
          max-width: 430px;

          margin: 8px 0 0;

          color:
            rgba(
              0,
              0,
              0,
              0.45
            );

          font-size: 12px;
          line-height: 1.65;
        }

        .st-v2-live-search__history {
          background:
            rgba(
              255,
              255,
              255,
              0.98
            );
        }

        .st-v2-live-search__history-head {
          display: flex;
          min-height: 68px;

          align-items: center;
          justify-content: space-between;

          gap: 20px;

          padding: 0 20px;

          border-bottom:
            1px solid
            rgba(
              0,
              0,
              0,
              0.095
            );

          background:
            #f5f5f2;
        }

        .st-v2-live-search__history-head
          > div {
          display: grid;
          gap: 5px;
        }

        .st-v2-live-search__history-head
          span {
          color:
            rgba(
              0,
              0,
              0,
              0.36
            );

          font-size: 7px;
          font-weight: 900;

          letter-spacing:
            0.18em;
        }

        .st-v2-live-search__history-head
          strong {
          font-size: 11px;
          font-weight: 950;

          letter-spacing:
            0.08em;
        }

        .st-v2-live-search__history-head
          > button {
          min-height: 34px;

          border:
            1px solid
            rgba(
              0,
              0,
              0,
              0.14
            );

          padding: 0 13px;

          background: #fff;
          color:
            rgba(
              0,
              0,
              0,
              0.55
            );

          font-size: 7px;
          font-weight: 900;

          letter-spacing:
            0.14em;

          transition:
            background
              160ms ease,
            color
              160ms ease,
            border-color
              160ms ease;
        }

        .st-v2-live-search__history-head
          > button:hover {
          border-color:
            #ed1c24;

          background:
            #ed1c24;

          color: #fff;
        }

        .st-v2-live-search__history-list {
          max-height: 290px;

          overflow-y: auto;
        }

        .st-v2-live-search__history-row {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            48px;

          min-height: 52px;

          border-bottom:
            1px solid
            rgba(
              0,
              0,
              0,
              0.075
            );

          background: #fff;
        }

        .st-v2-live-search__history-row:last-child {
          border-bottom: 0;
        }

        .st-v2-live-search__history-reuse {
          display: grid;

          grid-template-columns:
            18px
            minmax(0, 1fr)
            14px;

          align-items: center;

          gap: 12px;

          border: 0;

          padding:
            0
            15px
            0
            18px;

          background:
            transparent;

          color: #111;

          text-align: left;

          transition:
            background
              150ms ease,
            padding
              180ms ease;
        }

        .st-v2-live-search__history-reuse:hover {
          background:
            #f4f4f1;

          padding-left:
            22px;
        }

        .st-v2-live-search__history-reuse
          > svg:first-child {
          width: 14px;
          height: 14px;

          color:
            rgba(
              0,
              0,
              0,
              0.32
            );

          stroke-width: 1.8;
        }

        .st-v2-live-search__history-reuse
          span {
          overflow: hidden;

          font-size: 11px;
          font-weight: 750;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;
        }

        .st-v2-live-search__history-reuse
          > svg:last-child {
          width: 13px;
          height: 13px;

          color:
            rgba(
              0,
              0,
              0,
              0.25
            );
        }

        .st-v2-live-search__history-remove {
          display: flex;

          align-items: center;
          justify-content: center;

          border: 0;
          border-left:
            1px solid
            rgba(
              0,
              0,
              0,
              0.075
            );

          padding: 0;

          background: #fff;

          color:
            rgba(
              0,
              0,
              0,
              0.3
            );

          transition:
            background
              150ms ease,
            color
              150ms ease;
        }

        .st-v2-live-search__history-remove:hover {
          background:
            rgba(
              237,
              28,
              36,
              0.07
            );

          color:
            #ed1c24;
        }

        .st-v2-live-search__history-remove
          svg {
          width: 13px;
          height: 13px;

          stroke-width: 1.8;
        }

        @media (max-width: 767px) {
          .st-v2-live-search__input-shell input {
            padding-left:
              6px !important;
          }

          .st-v2-live-search__history-head {
            min-height: 62px;

            padding:
              0
              14px;
          }

          .st-v2-live-search__history-row {
            grid-template-columns:
              minmax(
                0,
                1fr
              )
              44px;
          }

          .st-v2-live-search__history-reuse {
            padding:
              0
              12px
              0
              14px;
          }
        }


        /*
         * =====================================================
         * STEREOPHONIE SEARCH TERMINAL — EMPTY STATE V2
         * =====================================================
         */

        .st-v2-live-search__start {
          position: relative;

          overflow: hidden;

          padding:
            30px
            30px
            0 !important;

          background:
            linear-gradient(
              90deg,
              rgba(237, 28, 36, 0.025),
              transparent 34%
            ),
            transparent;
        }

        .st-v2-live-search__start::before {
          position: absolute;

          top: 0;
          right: 0;

          width: 180px;
          height: 180px;

          pointer-events: none;

          background:
            radial-gradient(
              circle,
              rgba(237, 28, 36, 0.065),
              transparent 67%
            );

          content: "";
        }

        .st-v2-live-search__start-command {
          position: relative;
          z-index: 1;

          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            auto;

          align-items: start;

          gap: 42px;

          padding-bottom: 27px;
        }

        .st-v2-live-search__start-copy {
          max-width: 560px;
        }

        .st-v2-live-search__start-eyebrow {
          display: flex;
          align-items: center;

          gap: 9px;

          margin: 0;

          color: #ed1c24 !important;

          font-size: 7px !important;
          font-weight: 950 !important;
          line-height: 1 !important;

          letter-spacing:
            0.19em !important;

          text-transform: uppercase;
        }

        .st-v2-live-search__start-eyebrow::before {
          width: 16px;
          height: 2px;

          flex: 0 0 auto;

          background: #ed1c24;

          content: "";
        }

        .st-v2-live-search__start-copy > strong {
          display: block;

          margin-top: 15px !important;

          color: #111;

          font-size:
            clamp(
              24px,
              2.15vw,
              34px
            ) !important;

          font-weight: 950 !important;
          line-height: 0.96 !important;

          letter-spacing:
            -0.05em !important;

          text-transform: uppercase;
        }

        .st-v2-live-search__start-copy
          > strong
          > span {
          color: #ed1c24;
        }

        .st-v2-live-search__start-copy p {
          max-width: 520px;

          margin:
            13px
            0
            0 !important;

          color:
            rgba(
              0,
              0,
              0,
              0.48
            ) !important;

          font-size: 11px !important;
          font-weight: 500;
          line-height: 1.7 !important;

          letter-spacing: 0 !important;
        }

        /*
         * Small system status card.
         */

        .st-v2-live-search__start-status {
          display: grid;

          grid-template-columns:
            auto
            auto
            7px;

          align-items: center;

          gap: 10px;

          min-height: 38px;

          border:
            1px solid
            rgba(
              0,
              0,
              0,
              0.1
            );

          padding:
            0
            12px;

          background:
            rgba(
              255,
              255,
              255,
              0.72
            );
        }

        .st-v2-live-search__start-status
          > span {
          color:
            rgba(
              0,
              0,
              0,
              0.3
            ) !important;

          font-size: 6px !important;
          font-weight: 900 !important;

          letter-spacing:
            0.16em !important;
        }

        .st-v2-live-search__start-status
          > strong {
          margin: 0 !important;

          color: #111;

          font-size: 7px !important;
          font-weight: 950 !important;

          letter-spacing:
            0.13em !important;
        }

        .st-v2-live-search__start-status
          .st-v2-led {
          width: 6px;
          height: 6px;
        }

        /*
         * Searchable-content matrix.
         */

        .st-v2-live-search__capabilities {
          position: relative;
          z-index: 1;

          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );

          border-top:
            1px solid
            rgba(
              0,
              0,
              0,
              0.09
            );

          border-bottom:
            1px solid
            rgba(
              0,
              0,
              0,
              0.09
            );
        }

        .st-v2-live-search__capabilities
          > div {
          display: flex;

          min-width: 0;
          min-height: 54px;

          align-items: center;

          gap: 10px;

          padding:
            0
            15px;
        }

        .st-v2-live-search__capabilities
          > div:first-child {
          padding-left: 0;
        }

        .st-v2-live-search__capabilities
          > div
          + div {
          border-left:
            1px solid
            rgba(
              0,
              0,
              0,
              0.08
            );
        }

        .st-v2-live-search__capabilities
          span {
          flex: 0 0 auto;

          color: #ed1c24 !important;

          font-size: 6px !important;
          font-weight: 950 !important;

          letter-spacing:
            0.12em !important;
        }

        .st-v2-live-search__capabilities
          strong {
          overflow: hidden;

          margin: 0 !important;

          color:
            rgba(
              0,
              0,
              0,
              0.67
            );

          font-size: 7px !important;
          font-weight: 900 !important;

          letter-spacing:
            0.14em !important;

          text-overflow: ellipsis;

          white-space: nowrap;
        }

        /*
         * Technical bottom rail.
         */

        .st-v2-live-search__start-foot {
          position: relative;
          z-index: 1;

          display: flex;

          min-height: 34px;

          align-items: center;
          justify-content: space-between;

          gap: 20px;

          color:
            rgba(
              0,
              0,
              0,
              0.25
            );

          font-size: 6px;
          font-weight: 900;

          letter-spacing:
            0.15em;

          text-transform: uppercase;
        }

        /*
         * Give the empty terminal an intentional,
         * compact height instead of a large empty void.
         */

        .st-v2-live-search__idle
          .st-v2-live-search__start
          + * {
          margin-top: 0;
        }

        @media (hover: hover) {
          .st-v2-live-search__capabilities
            > div {
            transition:
              background
                160ms ease;
          }

          .st-v2-live-search__capabilities
            > div:hover {
            background:
              rgba(
                0,
                0,
                0,
                0.025
              );
          }
        }

        @media (max-width: 860px) {
          .st-v2-live-search__start-command {
            grid-template-columns:
              1fr;

            gap: 18px;
          }

          .st-v2-live-search__start-status {
            width: fit-content;
          }

          .st-v2-live-search__capabilities {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }

          .st-v2-live-search__capabilities
            > div:nth-child(3) {
            border-left: 0;

            border-top:
              1px solid
              rgba(
                0,
                0,
                0,
                0.08
              );
          }

          .st-v2-live-search__capabilities
            > div:nth-child(4) {
            border-top:
              1px solid
              rgba(
                0,
                0,
                0,
                0.08
              );
          }

          .st-v2-live-search__capabilities
            > div:first-child,
          .st-v2-live-search__capabilities
            > div:nth-child(3) {
            padding-left:
              0;
          }
        }

        @media (max-width: 600px) {
          .st-v2-live-search__start {
            padding:
              24px
              18px
              0 !important;
          }

          .st-v2-live-search__start-copy
            > strong {
            font-size:
              26px !important;
          }

          .st-v2-live-search__start-copy p {
            max-width: 390px;

            font-size:
              10px !important;
          }

          .st-v2-live-search__capabilities
            > div {
            min-height: 48px;

            padding:
              0
              10px;
          }

          .st-v2-live-search__start-foot {
            min-height: 38px;

            font-size: 5px;
          }

          .st-v2-live-search__start-foot
            span:last-child {
            display: none;
          }
        }


        /*
         * =====================================================
         * SEARCHABLE DATABASE ROW — FULL LABEL PASS
         * =====================================================
         */

        .st-v2-live-search__capabilities-wrap {
          position: relative;
          z-index: 1;

          margin-top: 4px;

          border-top:
            1px solid
            rgba(
              0,
              0,
              0,
              0.09
            );

          border-bottom:
            1px solid
            rgba(
              0,
              0,
              0,
              0.09
            );

          background:
            rgba(
              255,
              255,
              255,
              0.56
            );
        }

        .st-v2-live-search__capabilities-label {
          display: flex;

          min-height: 30px;

          align-items: center;

          padding:
            0
            15px;

          border-bottom:
            1px solid
            rgba(
              0,
              0,
              0,
              0.07
            );

          color:
            rgba(
              0,
              0,
              0,
              0.28
            );

          font-size: 6px;
          font-weight: 900;

          letter-spacing:
            0.18em;

          text-transform:
            uppercase;
        }

        .st-v2-live-search__capabilities {
          display: grid !important;

          grid-template-columns:
            repeat(
              4,
              minmax(
                0,
                1fr
              )
            ) !important;

          border: 0 !important;
        }

        .st-v2-live-search__capabilities
          > div {
          display: flex !important;

          min-width: 0;

          min-height: 60px !important;

          align-items: center !important;

          justify-content: flex-start;

          gap: 11px !important;

          padding:
            0
            18px !important;

          border: 0 !important;

          background:
            transparent;

          transition:
            background
              150ms ease;
        }

        .st-v2-live-search__capabilities
          > div
          + div {
          border-left:
            1px solid
            rgba(
              0,
              0,
              0,
              0.08
            ) !important;
        }

        .st-v2-live-search__capabilities
          > div:first-child {
          padding-left:
            18px !important;
        }

        .st-v2-live-search__capabilities
          span {
          flex: 0 0 auto;

          color: #ed1c24 !important;

          font-size: 7px !important;
          font-weight: 950 !important;

          line-height: 1 !important;

          letter-spacing:
            0.12em !important;

          white-space:
            nowrap;
        }

        .st-v2-live-search__capabilities
          strong {
          display: block !important;

          min-width: 0;

          overflow: visible !important;

          margin: 0 !important;

          color:
            rgba(
              0,
              0,
              0,
              0.72
            ) !important;

          font-size: 8px !important;
          font-weight: 950 !important;

          line-height: 1 !important;

          letter-spacing:
            0.13em !important;

          text-overflow:
            clip !important;

          white-space:
            nowrap !important;
        }

        @media (hover: hover) {
          .st-v2-live-search__capabilities
            > div:hover {
            background:
              rgba(
                237,
                28,
                36,
                0.035
              );
          }
        }

        @media (max-width: 920px) {
          .st-v2-live-search__capabilities {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              ) !important;
          }

          .st-v2-live-search__capabilities
            > div:nth-child(3) {
            border-top:
              1px solid
              rgba(
                0,
                0,
                0,
                0.08
              ) !important;

            border-left:
              0 !important;
          }

          .st-v2-live-search__capabilities
            > div:nth-child(4) {
            border-top:
              1px solid
              rgba(
                0,
                0,
                0,
                0.08
              ) !important;
          }
        }

        @media (max-width: 540px) {
          .st-v2-live-search__capabilities {
            grid-template-columns:
              1fr !important;
          }

          .st-v2-live-search__capabilities
            > div {
            min-height:
              48px !important;
          }

          .st-v2-live-search__capabilities
            > div
            + div {
            border-top:
              1px solid
              rgba(
                0,
                0,
                0,
                0.08
              ) !important;

            border-left:
              0 !important;
          }

          .st-v2-live-search__capabilities
            > div:nth-child(3),
          .st-v2-live-search__capabilities
            > div:nth-child(4) {
            border-left:
              0 !important;
          }
        }


        /*
         * =====================================================
         * SEARCH WELCOME V3
         * Clean isolated layout — no dependency on older
         * capability/start styles.
         * =====================================================
         */

        .st-search-welcome-v3 {
          display: grid;

          grid-template-columns:
            minmax(260px, 0.82fr)
            minmax(380px, 1.18fr);

          min-height: 250px;

          background:
            linear-gradient(
              90deg,
              rgba(237, 28, 36, 0.025),
              transparent 38%
            ),
            #fff;
        }

        /*
         * LEFT / SEARCH COMMAND
         */

        .st-search-welcome-v3__intro {
          display: flex;
          flex-direction: column;
          justify-content: center;

          min-width: 0;

          padding:
            34px
            38px;

          border-right:
            1px solid
            rgba(0, 0, 0, 0.09);
        }

        .st-search-welcome-v3__eyebrow {
          display: flex;
          align-items: center;

          gap: 9px;

          color:
            rgba(0, 0, 0, 0.4);

          font-size: 7px;
          font-weight: 900;

          letter-spacing:
            0.18em;

          text-transform:
            uppercase;
        }

        .st-search-welcome-v3__eyebrow
          .st-v2-led {
          width: 6px;
          height: 6px;
        }

        .st-search-welcome-v3__intro h3 {
          margin:
            18px
            0
            0;

          color: #0a0a0a;

          font-size:
            clamp(
              31px,
              3vw,
              44px
            );

          font-weight: 950;

          line-height: 0.83;

          letter-spacing:
            -0.065em;

          text-transform:
            uppercase;
        }

        .st-search-welcome-v3__intro
          h3
          span {
          color: #ed1c24;
        }

        .st-search-welcome-v3__intro p {
          max-width: 380px;

          margin:
            18px
            0
            0;

          color:
            rgba(0, 0, 0, 0.47);

          font-size: 11px;

          font-weight: 500;

          line-height: 1.65;

          letter-spacing: 0;
        }

        .st-search-welcome-v3__ready {
          display: inline-flex;

          width: fit-content;

          min-height: 34px;

          align-items: center;

          gap: 9px;

          margin-top: 22px;

          border:
            1px solid
            rgba(0, 0, 0, 0.1);

          padding:
            0
            11px;

          background:
            rgba(
              250,
              250,
              248,
              0.9
            );
        }

        .st-search-welcome-v3__ready
          span {
          color:
            rgba(0, 0, 0, 0.3);

          font-size: 6px;

          font-weight: 900;

          letter-spacing:
            0.15em;
        }

        .st-search-welcome-v3__ready
          strong {
          color: #111;

          font-size: 7px;

          font-weight: 950;

          letter-spacing:
            0.13em;
        }

        .st-search-welcome-v3__ready
          i {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #48e167;

          box-shadow:
            0 0 9px
            rgba(
              72,
              225,
              103,
              0.6
            );
        }

        /*
         * RIGHT / DATABASE INDEX
         */

        .st-search-welcome-v3__database {
          display: flex;

          min-width: 0;

          flex-direction: column;

          padding:
            29px
            30px
            30px;
        }

        .st-search-welcome-v3__database
          > header {
          display: flex;

          min-height: 43px;

          align-items: flex-start;
          justify-content: space-between;

          gap: 20px;

          padding-bottom: 16px;

          border-bottom:
            1px solid
            rgba(0, 0, 0, 0.1);
        }

        .st-search-welcome-v3__database
          > header
          div {
          display: grid;

          gap: 5px;
        }

        .st-search-welcome-v3__database
          > header
          span {
          color: #ed1c24;

          font-size: 6px;

          font-weight: 950;

          letter-spacing:
            0.18em;
        }

        .st-search-welcome-v3__database
          > header
          strong {
          color: #111;

          font-size: 11px;

          font-weight: 950;

          letter-spacing:
            0.1em;
        }

        .st-search-welcome-v3__database
          > header
          small {
          color:
            rgba(0, 0, 0, 0.3);

          font-size: 6px;

          font-weight: 900;

          letter-spacing:
            0.14em;
        }

        .st-search-welcome-v3__grid {
          display: grid;

          flex: 1;

          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          margin-top: 15px;

          border:
            1px solid
            rgba(0, 0, 0, 0.09);
        }

        .st-search-welcome-v3__grid
          > div {
          display: flex;

          min-width: 0;

          min-height: 72px;

          flex-direction: column;

          justify-content: center;

          padding:
            14px
            17px;

          background:
            rgba(
              255,
              255,
              255,
              0.82
            );
        }

        .st-search-welcome-v3__grid
          > div:nth-child(2),
        .st-search-welcome-v3__grid
          > div:nth-child(4) {
          border-left:
            1px solid
            rgba(0, 0, 0, 0.08);
        }

        .st-search-welcome-v3__grid
          > div:nth-child(3),
        .st-search-welcome-v3__grid
          > div:nth-child(4) {
          border-top:
            1px solid
            rgba(0, 0, 0, 0.08);
        }

        .st-search-welcome-v3__grid
          > div
          > span {
          color: #ed1c24;

          font-size: 6px;

          font-weight: 950;

          letter-spacing:
            0.13em;
        }

        .st-search-welcome-v3__grid
          > div
          > strong {
          display: block;

          margin-top: 6px;

          color: #111;

          font-size: 9px;

          font-weight: 950;

          line-height: 1;

          letter-spacing:
            0.12em;

          white-space: nowrap;
        }

        .st-search-welcome-v3__grid
          > div
          > small {
          display: block;

          margin-top: 7px;

          color:
            rgba(0, 0, 0, 0.32);

          font-size: 6px;

          font-weight: 800;

          line-height: 1;

          letter-spacing:
            0.11em;

          white-space: nowrap;
        }

        @media (hover: hover) {
          .st-search-welcome-v3__grid
            > div {
            transition:
              background 160ms ease;
          }

          .st-search-welcome-v3__grid
            > div:hover {
            background:
              rgba(
                237,
                28,
                36,
                0.035
              );
          }
        }

        /*
         * TABLET
         */

        @media (max-width: 900px) {
          .st-search-welcome-v3 {
            grid-template-columns:
              1fr;

            min-height: 0;
          }

          .st-search-welcome-v3__intro {
            padding:
              28px
              28px;

            border-right: 0;

            border-bottom:
              1px solid
              rgba(
                0,
                0,
                0,
                0.09
              );
          }

          .st-search-welcome-v3__database {
            padding:
              24px
              28px
              27px;
          }
        }

        /*
         * MOBILE
         */

        @media (max-width: 560px) {
          .st-search-welcome-v3__intro {
            padding:
              24px
              20px;
          }

          .st-search-welcome-v3__intro
            h3 {
            font-size: 34px;
          }

          .st-search-welcome-v3__database {
            padding:
              21px
              20px
              23px;
          }

          .st-search-welcome-v3__grid {
            grid-template-columns:
              1fr;
          }

          .st-search-welcome-v3__grid
            > div:nth-child(2),
          .st-search-welcome-v3__grid
            > div:nth-child(3),
          .st-search-welcome-v3__grid
            > div:nth-child(4) {
            border-top:
              1px solid
              rgba(
                0,
                0,
                0,
                0.08
              );

            border-left: 0;
          }

          .st-search-welcome-v3__grid
            > div {
            min-height: 62px;
          }
        }


        /*
         * =====================================================
         * SEARCH WELCOME V3 — INPUT STATUS REFINEMENT
         * =====================================================
         */

        .st-search-welcome-v3__ready {
          display: grid !important;

          grid-template-columns:
            auto
            auto
            7px;

          width: fit-content !important;
          min-width: 188px;

          min-height: 42px !important;

          align-items: center !important;

          column-gap: 13px !important;

          margin-top: 22px !important;

          border:
            1px solid
            rgba(0, 0, 0, 0.1) !important;

          padding:
            0
            14px !important;

          background:
            rgba(
              255,
              255,
              255,
              0.82
            ) !important;

          box-shadow:
            inset 0 0 0 1px
            rgba(
              255,
              255,
              255,
              0.4
            );

          line-height: 1 !important;
        }

        .st-search-welcome-v3__ready
          > span {
          display: block;

          margin: 0 !important;

          color:
            rgba(
              0,
              0,
              0,
              0.34
            ) !important;

          font-size: 6px !important;
          font-weight: 900 !important;

          line-height: 1 !important;

          letter-spacing:
            0.16em !important;

          white-space: nowrap;

          text-transform: uppercase;
        }

        .st-search-welcome-v3__ready
          > strong {
          display: block;

          margin: 0 !important;

          color: #111 !important;

          font-size: 10px !important;
          font-weight: 950 !important;

          line-height: 1 !important;

          letter-spacing:
            0.1em !important;

          white-space: nowrap;

          transform: none !important;
        }

        .st-search-welcome-v3__ready
          > i {
          display: block;

          width: 7px !important;
          height: 7px !important;

          margin: 0 !important;

          border-radius: 50%;

          background:
            #57e872 !important;

          box-shadow:
            0 0 7px
              rgba(
                87,
                232,
                114,
                0.62
              ),
            0 0 14px
              rgba(
                87,
                232,
                114,
                0.2
              ) !important;

          transform: none !important;
        }

        @media (max-width: 560px) {
          .st-search-welcome-v3__ready {
            min-width: 168px;

            min-height: 40px !important;

            column-gap: 10px !important;

            padding:
              0
              12px !important;
          }

          .st-search-welcome-v3__ready
            > strong {
            font-size: 9px !important;
          }
        }

        .st-v2-live-search__panel {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 200;
          width: 100%;
          min-width: min(720px, calc(100vw - 40px));
          overflow: hidden;

          border: 1px solid #111;

          background:
            linear-gradient(
              rgba(0, 0, 0, 0.025) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.025) 1px,
              transparent 1px
            ),
            #fff;

          background-size:
            28px 28px,
            28px 28px,
            auto;

          box-shadow:
            8px 8px 0 #ed1c24,
            0 28px 80px rgba(0, 0, 0, 0.19);

          opacity: 0;
          visibility: hidden;
          pointer-events: none;

          transform:
            translateY(-8px)
            scaleY(0.985);

          transform-origin: top;

          transition:
            opacity 180ms ease,
            visibility 180ms ease,
            transform 260ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .st-v2-live-search__panel.is-open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform:
            translateY(0)
            scaleY(1);
        }

        .st-v2-live-search__idle {
          padding: 30px 32px 32px;
        }

        .st-v2-live-search__idle
          > div {
          display: flex;
          align-items: center;
          gap: 9px;

          color: rgba(0, 0, 0, 0.43);

          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .st-v2-live-search__idle
          strong {
          display: block;
          margin-top: 18px;

          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .st-v2-live-search__idle p {
          max-width: 430px;
          margin: 9px 0 0;

          color: rgba(0, 0, 0, 0.48);

          font-size: 12px;
          line-height: 1.65;
        }

        .st-v2-live-search__state {
          display: flex;
          min-height: 118px;
          align-items: center;
          justify-content: center;
          gap: 12px;

          color: rgba(0, 0, 0, 0.55);

          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .st-v2-live-search__state
          svg {
          width: 17px;
          height: 17px;
          animation: stSearchSpin
            0.8s linear infinite;
        }

        .st-v2-live-search__state.is-error {
          flex-direction: column;
          color: #ed1c24;
        }

        .st-v2-live-search__state
          small {
          color: rgba(0, 0, 0, 0.46);
          font-size: 10px;
          letter-spacing: 0;
        }

        .st-v2-live-search__empty {
          display: flex;
          min-height: 190px;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          padding: 28px;

          text-align: center;
        }

        .st-v2-live-search__empty
          > svg {
          width: 25px;
          height: 25px;
          color: rgba(0, 0, 0, 0.22);
        }

        .st-v2-live-search__empty
          span {
          margin-top: 15px;

          color: #ed1c24;

          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .st-v2-live-search__empty
          strong {
          margin-top: 8px;

          font-size: 17px;
          font-weight: 950;
        }

        .st-v2-live-search__empty p {
          margin: 7px 0 0;

          color: rgba(0, 0, 0, 0.44);

          font-size: 11px;
        }

        .st-v2-live-search__suggestions {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          border-bottom:
            1px solid rgba(0, 0, 0, 0.11);

          background:
            rgba(
              247,
              247,
              245,
              0.96
            );
        }

        .st-v2-live-search__suggestions
          section {
          padding: 17px 20px;
        }

        .st-v2-live-search__suggestions
          section
          + section {
          border-left:
            1px solid
            rgba(0, 0, 0, 0.1);
        }

        .st-v2-live-search__suggestions
          section
          > span {
          color: rgba(0, 0, 0, 0.38);

          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.19em;
        }

        .st-v2-live-search__suggestions
          section
          > div {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;

          margin-top: 10px;
        }

        .st-v2-live-search__suggestions
          button {
          display: flex;
          min-height: 34px;
          align-items: center;
          gap: 8px;

          border: 1px solid
            rgba(0, 0, 0, 0.12);

          padding: 0 11px;

          background: #fff;
          color: #111;

          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .st-v2-live-search__suggestions
          button:hover {
          border-color: #111;
          background: #111;
          color: #fff;
        }

        .st-v2-live-search__suggestions
          svg {
          width: 11px;
          height: 11px;
        }

        .st-v2-live-search__products
          > header {
          display: flex;
          min-height: 42px;
          align-items: center;
          justify-content: space-between;

          border-bottom:
            1px solid
            rgba(0, 0, 0, 0.11);

          padding: 0 18px;

          background: #0a0a0a;
          color: #fff;
        }

        .st-v2-live-search__products
          > header
          div {
          display: flex;
          align-items: center;
          gap: 8px;

          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.17em;
        }

        .st-v2-live-search__products
          > header
          strong {
          color: rgba(
            255,
            255,
            255,
            0.45
          );

          font-size: 8px;
          letter-spacing: 0.12em;
        }

        .st-v2-live-search__product-list {
          max-height: min(
            448px,
            calc(100vh - 260px)
          );

          overflow-y: auto;

          background: white;
        }

        .st-v2-live-search__product-list
          > button {
          display: grid;
          width: 100%;

          grid-template-columns:
            74px
            minmax(0, 1fr)
            auto;

          align-items: center;
          gap: 16px;

          border: 0;
          border-bottom:
            1px solid
            rgba(0, 0, 0, 0.095);

          padding: 10px 14px;

          background: white;
          color: #111;

          text-align: left;

          transition:
            background 140ms ease,
            transform 140ms ease;
        }

        .st-v2-live-search__product-list
          > button:hover,
        .st-v2-live-search__product-list
          > button.is-active {
          background: #f4f4f1;
        }

        .st-v2-live-search__product-list
          > button.is-active {
          box-shadow:
            inset 4px 0 0 #ed1c24;
        }

        .st-v2-live-search__image {
          display: grid;
          width: 74px;
          height: 64px;
          place-items: center;

          overflow: hidden;

          border: 1px solid
            rgba(0, 0, 0, 0.08);

          background: #f3f3f0;
        }

        .st-v2-live-search__image
          img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
        }

        .st-v2-live-search__image
          span {
          color: rgba(0, 0, 0, 0.25);

          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .st-v2-live-search__product-info {
          min-width: 0;
        }

        .st-v2-live-search__product-info
          small {
          display: block;

          overflow: hidden;
          color: rgba(0, 0, 0, 0.4);

          font-size: 7px;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .st-v2-live-search__product-info
          > strong {
          display: block;

          overflow: hidden;

          margin-top: 5px;

          font-size: 12px;
          font-weight: 900;
          letter-spacing: -0.015em;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .st-v2-live-search__product-info
          mark {
          padding: 0 1px;
          background: #ed1c24;
          color: #fff;
        }

        .st-v2-live-search__availability {
          display: flex;
          align-items: center;
          gap: 6px;

          margin-top: 7px;

          color: rgba(0, 0, 0, 0.42);

          font-size: 7px;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .st-v2-live-search__availability
          i {
          width: 5px;
          height: 5px;
          flex: 0 0 auto;

          border-radius: 50%;
          background: #777;
        }

        .st-v2-live-search__availability.is-stock
          i {
          background: #23b64b;
          box-shadow:
            0 0 7px
            rgba(
              35,
              182,
              75,
              0.45
            );
        }

        .st-v2-live-search__availability.is-low
          i {
          background: #eaa317;
        }

        .st-v2-live-search__availability.is-coming
          i {
          background: #2b69ff;
        }

        .st-v2-live-search__availability.is-out
          i {
          background: #999;
        }

        .st-v2-live-search__price {
          display: flex;
          min-width: 88px;
          flex-direction: column;
          align-items: flex-end;
        }

        .st-v2-live-search__price
          strong {
          font-size: 11px;
          font-weight: 950;
        }

        .st-v2-live-search__price
          del {
          margin-top: 3px;

          color: rgba(0, 0, 0, 0.34);

          font-size: 8px;
        }

        .st-v2-live-search__price
          svg {
          width: 14px;
          height: 14px;

          margin-top: 9px;

          color: #ed1c24;
        }

        .st-v2-live-search__all {
          display: flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          justify-content: space-between;

          border: 0;
          border-top:
            1px solid
            rgba(0, 0, 0, 0.1);

          padding: 0 18px;

          background: #f2f2ef;
          color: #111;

          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-align: left;
        }

        .st-v2-live-search__all:hover {
          background: #ed1c24;
          color: #fff;
        }

        .st-v2-live-search__all
          svg {
          width: 14px;
          height: 14px;
        }

        .st-v2-live-search__keys {
          display: flex;
          min-height: 32px;
          align-items: center;
          gap: 20px;

          border-top:
            1px solid
            rgba(0, 0, 0, 0.1);

          padding: 0 16px;

          background: #fff;

          color: rgba(0, 0, 0, 0.3);

          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        @media (
          max-width: 1050px
        ) {
          .st-v2-live-search__panel {
            min-width: min(
              620px,
              calc(100vw - 32px)
            );
          }
        }

        @media (
          max-width: 767px
        ) {
          .st-v2-live-search {
            position: static;
          }

          .st-v2-live-search__panel {
            position: fixed;

            top: 112px;
            right: 16px;
            left: 16px;

            width: auto;
            min-width: 0;

            max-height:
              calc(100dvh - 132px);

            overflow-y: auto;

            box-shadow:
              5px 5px 0 #ed1c24,
              0 24px 60px
                rgba(
                  0,
                  0,
                  0,
                  0.22
                );
          }

          .st-v2-live-search__suggestions {
            grid-template-columns:
              1fr;
          }

          .st-v2-live-search__suggestions
            section
            + section {
            border-top:
              1px solid
              rgba(
                0,
                0,
                0,
                0.1
              );

            border-left: 0;
          }

          .st-v2-live-search__product-list
            > button {
            grid-template-columns:
              58px
              minmax(0, 1fr)
              auto;

            gap: 10px;

            padding: 9px 10px;
          }

          .st-v2-live-search__image {
            width: 58px;
            height: 56px;
          }

          .st-v2-live-search__keys {
            display: none;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .st-v2-live-search__panel {
            transition: none;
          }
        }

        /* ===== SEARCH STATUS FINAL FIX START ===== */

        /*
         * LIVE PRODUCT DATABASE
         * Always visible on the black system bar.
         */

        .st-v2-live-search__idle-status {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;

          color: #ffffff !important;

          opacity: 1 !important;

          font-size: 7px !important;
          font-weight: 950 !important;
          line-height: 1 !important;

          letter-spacing: 0.18em !important;

          text-transform: uppercase !important;

          -webkit-text-fill-color: #ffffff !important;
        }

        .st-v2-live-search__idle-status-label {
          display: inline-block !important;

          color: #ffffff !important;

          opacity: 1 !important;
          visibility: visible !important;

          font-size: 7px !important;
          font-weight: 950 !important;
          line-height: 1 !important;

          letter-spacing: 0.18em !important;

          text-transform: uppercase !important;

          -webkit-text-fill-color: #ffffff !important;

          text-shadow:
            0 1px 0 rgba(0, 0, 0, 0.55) !important;
        }

        /*
         * Professional live-system pulse.
         * Glow + brightness + tiny scale motion.
         */

        @keyframes stFinalLiveLedPulse {
          0%,
          100% {
            opacity: 0.58;

            transform: scale(0.86);

            filter: brightness(0.9);

            box-shadow:
              0 0 4px rgba(89, 244, 112, 0.45),
              0 0 9px rgba(89, 244, 112, 0.14);
          }

          45% {
            opacity: 1;

            transform: scale(1.12);

            filter: brightness(1.22);

            box-shadow:
              0 0 7px rgba(89, 244, 112, 0.98),
              0 0 16px rgba(89, 244, 112, 0.46),
              0 0 26px rgba(89, 244, 112, 0.18);
          }

          70% {
            opacity: 0.82;

            transform: scale(0.97);

            filter: brightness(1);
          }
        }

        /*
         * 1 — LIVE PRODUCT DATABASE LED
         */

        .st-v2-live-search__idle-status > .st-v2-led {
          display: block !important;

          width: 7px !important;
          height: 7px !important;

          flex: 0 0 7px !important;

          margin: 0 !important;

          border-radius: 999px !important;

          background: #59f470 !important;

          opacity: 1 !important;

          animation:
            stFinalLiveLedPulse
            1.55s
            ease-in-out
            infinite !important;

          transform-origin: center !important;
        }

        /*
         * 2 — SEARCH SYSTEM / READY LED
         */

        .st-search-welcome-v3__eyebrow > .st-v2-led {
          display: block !important;

          width: 7px !important;
          height: 7px !important;

          flex: 0 0 7px !important;

          margin: 0 !important;

          border-radius: 999px !important;

          background: #59f470 !important;

          opacity: 1 !important;

          animation:
            stFinalLiveLedPulse
            1.55s
            ease-in-out
            infinite !important;

          animation-delay: -0.42s !important;

          transform-origin: center !important;
        }

        /*
         * INPUT STATUS / READY
         */

        .st-search-welcome-v3__ready {
          display: inline-flex !important;

          width: auto !important;
          min-width: 202px !important;

          height: 43px !important;
          min-height: 43px !important;

          align-items: center !important;
          justify-content: flex-start !important;

          gap: 10px !important;

          margin-top: 22px !important;

          padding: 0 14px !important;

          border:
            1px solid
            rgba(0, 0, 0, 0.10) !important;

          background:
            rgba(255, 255, 255, 0.88) !important;

          line-height: 1 !important;
        }

        .st-search-welcome-v3__ready > span {
          display: inline-flex !important;

          align-items: center !important;

          margin: 0 !important;

          color: rgba(0, 0, 0, 0.38) !important;

          font-size: 6px !important;
          font-weight: 900 !important;
          line-height: 1 !important;

          letter-spacing: 0.16em !important;

          white-space: nowrap !important;
        }

        /*
         * The technical slash.
         */

        .st-search-welcome-v3__ready > b {
          display: inline-flex !important;

          align-items: center !important;
          justify-content: center !important;

          margin: 0 !important;

          color: #ed1c24 !important;

          font-size: 10px !important;
          font-weight: 950 !important;
          line-height: 1 !important;

          transform: translateY(-0.25px) !important;
        }

        .st-search-welcome-v3__ready > strong {
          display: inline-flex !important;

          align-items: center !important;

          margin: 0 !important;

          color: #111111 !important;

          font-size: 10px !important;
          font-weight: 950 !important;
          line-height: 1 !important;

          letter-spacing: 0.10em !important;

          white-space: nowrap !important;

          transform: none !important;
        }

        /*
         * 3 — INPUT STATUS / READY LED
         */

        .st-search-welcome-v3__ready > i {
          display: block !important;

          width: 7px !important;
          height: 7px !important;

          flex: 0 0 7px !important;

          margin:
            0
            0
            0
            auto !important;

          border-radius: 999px !important;

          background: #59f470 !important;

          opacity: 1 !important;

          animation:
            stFinalLiveLedPulse
            1.55s
            ease-in-out
            infinite !important;

          animation-delay: -0.84s !important;

          transform-origin: center !important;
        }

        /*
         * Make SEARCH SYSTEM / READY itself clearer too.
         */

        .st-search-welcome-v3__eyebrow {
          display: flex !important;

          align-items: center !important;

          gap: 9px !important;

          color: rgba(0, 0, 0, 0.45) !important;

          opacity: 1 !important;

          font-size: 7px !important;
          font-weight: 900 !important;

          letter-spacing: 0.18em !important;
        }

        /*
         * Accessibility: users who disable motion get
         * steady green LEDs instead of animation.
         */

        @media (prefers-reduced-motion: reduce) {
          .st-v2-live-search__idle-status > .st-v2-led,
          .st-search-welcome-v3__eyebrow > .st-v2-led,
          .st-search-welcome-v3__ready > i {
            animation: none !important;

            opacity: 1 !important;

            transform: none !important;

            box-shadow:
              0 0 7px rgba(89, 244, 112, 0.65) !important;
          }
        }


        /*
         * =====================================================
         * INPUT STATUS — COMPACT PROFESSIONAL ALIGNMENT
         * =====================================================
         */

        .st-search-welcome-v3__ready {
          display: inline-flex !important;

          width: fit-content !important;
          min-width: 0 !important;

          height: 40px !important;
          min-height: 40px !important;

          align-items: center !important;
          justify-content: flex-start !important;

          gap: 8px !important;

          margin-top: 22px !important;

          padding:
            0
            13px !important;

          border:
            1px solid
            rgba(0, 0, 0, 0.10) !important;

          background:
            rgba(255, 255, 255, 0.9) !important;

          line-height: 1 !important;
        }

        .st-search-welcome-v3__ready > span {
          display: inline-flex !important;

          align-items: center !important;

          margin: 0 !important;

          color:
            rgba(0, 0, 0, 0.38) !important;

          font-size: 6px !important;
          font-weight: 900 !important;
          line-height: 1 !important;

          letter-spacing:
            0.15em !important;

          white-space: nowrap !important;
        }

        .st-search-welcome-v3__ready > b {
          display: inline-flex !important;

          align-items: center !important;
          justify-content: center !important;

          margin: 0 !important;

          color: #ed1c24 !important;

          font-size: 9px !important;
          font-weight: 950 !important;
          line-height: 1 !important;

          transform: none !important;
        }

        .st-search-welcome-v3__ready > strong {
          display: inline-flex !important;

          align-items: center !important;

          margin: 0 !important;

          color: #111 !important;

          font-size: 9px !important;
          font-weight: 950 !important;
          line-height: 1 !important;

          letter-spacing:
            0.10em !important;

          white-space: nowrap !important;

          transform: none !important;
        }

        .st-search-welcome-v3__ready > i {
          display: block !important;

          width: 7px !important;
          height: 7px !important;

          flex: 0 0 7px !important;

          margin:
            0
            0
            0
            2px !important;

          border-radius: 999px !important;

          background: #59f470 !important;

          animation:
            stFinalLiveLedPulse
            1.55s
            ease-in-out
            infinite !important;

          animation-delay: -0.84s !important;

          transform-origin: center !important;
        }

        @media (max-width: 560px) {
          .st-search-welcome-v3__ready {
            height: 38px !important;
            min-height: 38px !important;

            gap: 7px !important;

            padding:
              0
              11px !important;
          }

          .st-search-welcome-v3__ready > strong {
            font-size: 8px !important;
          }
        }


        /* ===== SEARCH STATUS FINAL FIX END ===== */


        /* ===== INPUT STATUS SLASH — HARD FIX ===== */

        .st-search-welcome-v3__ready {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: flex-start !important;

          width: fit-content !important;
          min-width: 0 !important;

          gap: 8px !important;

          padding: 0 13px !important;
        }

        .st-search-welcome-v3__ready > span,
        .st-search-welcome-v3__ready > strong,
        .st-search-welcome-v3__ready-slash {
          display: inline-flex !important;
          align-items: center !important;

          margin: 0 !important;

          line-height: 1 !important;

          visibility: visible !important;
          opacity: 1 !important;
        }

        .st-search-welcome-v3__ready-slash {
          color: #ed1c24 !important;

          font-size: 9px !important;
          font-weight: 950 !important;

          transform: none !important;

          -webkit-text-fill-color: #ed1c24 !important;
        }

        .st-search-welcome-v3__ready > i {
          margin-left: 2px !important;
        }

      `}</style>
    </>
  );
}
