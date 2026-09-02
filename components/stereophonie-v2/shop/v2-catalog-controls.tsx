"use client";

import Image from "next/image";
import {
  ChevronDown,
  Filter,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

type SortOption = "newest" | "price-asc" | "price-desc";

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  imageAlt: string;
  price: number | null;
  availability: string;
};

type SearchResponse = {
  results?: SearchResult[];
  error?: string;
};

type Props = {
  categories: string[];
  brands: string[];
  selectedCategory: string;
  selectedBrand: string;
  selectedAvailability: string;
  selectedSort: SortOption;
  selectedMinPrice: number | null;
  selectedMaxPrice: number | null;
  minimumAvailablePrice: number;
  maximumAvailablePrice: number;
  searchValue?: string;
};

function money(value: number) {
  return `$${Math.round(value)}`;
}

function preciseMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function V2CatalogControls({
  categories,
  brands,
  selectedCategory,
  selectedBrand,
  selectedAvailability,
  selectedSort,
  selectedMinPrice,
  selectedMaxPrice,
  minimumAvailablePrice,
  maximumAvailablePrice,
  searchValue = "",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchShellRef = useRef<HTMLDivElement>(null);
  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const brandPickerRef = useRef<HTMLDivElement>(null);
  const mobileFilterBarRef = useRef<HTMLDivElement>(null);

  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchValue);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const cleanQuery = query.trim();

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileFilterHeight, setMobileFilterHeight] = useState(0);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [brandQuery, setBrandQuery] = useState("");

  const [priceOpen, setPriceOpen] = useState(false);
  const [priceMounted, setPriceMounted] = useState(false);
  const [priceVisible, setPriceVisible] = useState(false);

  /*
   * Measure the real mobile filter-bar height.
   *
   * We animate between exactly 0px and the bar's actual scrollHeight.
   * This avoids the artificial delay caused by animating toward a large
   * fixed max-height that is much taller than the real controls.
   */
  useEffect(() => {
    const filterBar = mobileFilterBarRef.current;

    if (!filterBar) {
      return;
    }

    function measureMobileFilterBar() {
      const bar = mobileFilterBarRef.current;

      if (!bar) {
        return;
      }

      setMobileFilterHeight(bar.scrollHeight);
    }

    measureMobileFilterBar();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measureMobileFilterBar)
        : null;

    resizeObserver?.observe(filterBar);
    window.addEventListener("resize", measureMobileFilterBar);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measureMobileFilterBar);
    };
  }, []);

  /*
   * Keep the Price panel mounted briefly while it closes,
   * allowing the CSS exit animation to complete.
   */

  useEffect(() => {
    let closeTimer: number | undefined;
    let frameOne: number | undefined;
    let frameTwo: number | undefined;

    if (priceOpen) {
      /*
       * Phase 1:
       * mount the panel but keep it in its ENTERING state.
       */
      setPriceMounted(true);
      setPriceVisible(false);

      /*
       * Phase 2:
       * wait for the browser to actually paint the entering state,
       * then promote it to OPEN.
       *
       * Two RAFs are intentional. A single RAF may be collapsed by
       * React/browser batching and cause the panel to appear instantly.
       */
      frameOne = window.requestAnimationFrame(() => {
        frameTwo = window.requestAnimationFrame(() => {
          setPriceVisible(true);
        });
      });

      return () => {
        if (frameOne !== undefined) {
          window.cancelAnimationFrame(frameOne);
        }

        if (frameTwo !== undefined) {
          window.cancelAnimationFrame(frameTwo);
        }
      };
    }

    /*
     * CLOSE:
     * first transition OPEN -> CLOSING,
     * then physically remove it after the animation completes.
     */
    setPriceVisible(false);

    if (priceMounted) {
      closeTimer = window.setTimeout(() => {
        setPriceMounted(false);
      }, 290);
    }

    return () => {
      if (closeTimer !== undefined) {
        window.clearTimeout(closeTimer);
      }

      if (frameOne !== undefined) {
        window.cancelAnimationFrame(frameOne);
      }

      if (frameTwo !== undefined) {
        window.cancelAnimationFrame(frameTwo);
      }
    };
  }, [priceOpen, priceMounted]);

  useEffect(() => {
    if (!priceOpen) {
      return;
    }

    function closePriceOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPriceOpen(false);
      }
    }

    window.addEventListener("keydown", closePriceOnEscape);

    return () => {
      window.removeEventListener("keydown", closePriceOnEscape);
    };
  }, [priceOpen]);

  const [minimum, setMinimum] = useState(
    selectedMinPrice ?? minimumAvailablePrice,
  );

  const [maximum, setMaximum] = useState(
    selectedMaxPrice ?? maximumAvailablePrice,
  );

  useEffect(() => {
    setQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (!cleanQuery) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const response = await fetch(
          `/api/products/search?q=${encodeURIComponent(cleanQuery)}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );
        const data = (await response.json()) as SearchResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Search is temporarily unavailable.");
        }

        setSearchResults(data.results ?? []);
        setActiveSuggestion(-1);
      } catch (searchRequestError) {
        if (controller.signal.aborted) {
          return;
        }

        setSearchResults([]);
        setSearchError(
          searchRequestError instanceof Error
            ? searchRequestError.message
            : "Search is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cleanQuery]);

  useEffect(() => {
    function closeSuggestions(event: PointerEvent) {
      if (!searchShellRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    }

    document.addEventListener("pointerdown", closeSuggestions);

    return () => document.removeEventListener("pointerdown", closeSuggestions);
  }, []);

  useEffect(() => {
    setMinimum(selectedMinPrice ?? minimumAvailablePrice);
    setMaximum(selectedMaxPrice ?? maximumAvailablePrice);
  }, [
    selectedMinPrice,
    selectedMaxPrice,
    minimumAvailablePrice,
    maximumAvailablePrice,
  ]);

  function navigate(
    updates: Record<string, string | number | null | undefined>,
  ) {
    const params = new URLSearchParams(window.location.search);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    const next = params.toString();

    startTransition(() => {
      router.push(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cleanQuery) {
      return;
    }

    setSuggestionsOpen(false);
    setActiveSuggestion(-1);

    navigate({
      search: cleanQuery,
    });
  }

  function openProduct(result: SearchResult) {
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    router.push(`/shop/${result.slug}`);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
      return;
    }

    if (!suggestionsOpen || searchResults.length === 0) {
      if (event.key === "ArrowDown" && cleanQuery) {
        setSuggestionsOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current >= searchResults.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current <= 0 ? searchResults.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      openProduct(searchResults[activeSuggestion]);
    }
  }

  function applyPrice() {
    const realMinimum = Math.max(
      minimumAvailablePrice,
      Math.min(minimum, maximumAvailablePrice),
    );

    const realMaximum = Math.max(
      realMinimum,
      Math.min(maximum, maximumAvailablePrice),
    );

    setMinimum(realMinimum);
    setMaximum(realMaximum);

    navigate({
      minPrice: realMinimum <= minimumAvailablePrice ? null : realMinimum,

      maxPrice: realMaximum >= maximumAvailablePrice ? null : realMaximum,
    });

    setPriceOpen(false);
  }

  function resetPrice() {
    setMinimum(minimumAvailablePrice);
    setMaximum(maximumAvailablePrice);

    navigate({
      minPrice: null,
      maxPrice: null,
    });

    setPriceOpen(false);
  }

  const hasPriceFilter = selectedMinPrice !== null || selectedMaxPrice !== null;

  const normalizedCategoryQuery = categoryQuery.trim().toLowerCase();

  const normalizedBrandQuery = brandQuery.trim().toLowerCase();

  const filteredCategories = categories.filter((category) =>
    category.toLowerCase().includes(normalizedCategoryQuery),
  );

  const filteredBrands = brands.filter((brand) =>
    brand.toLowerCase().includes(normalizedBrandQuery),
  );

  useEffect(() => {
    function handlePickerOutsideClick(event: PointerEvent) {
      const target = event.target as Node;

      if (categoryOpen && !categoryPickerRef.current?.contains(target)) {
        setCategoryOpen(false);
        setCategoryQuery("");
      }

      if (brandOpen && !brandPickerRef.current?.contains(target)) {
        setBrandOpen(false);
        setBrandQuery("");
      }
    }

    function handlePickerEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setCategoryOpen(false);
      setBrandOpen(false);
      setCategoryQuery("");
      setBrandQuery("");
    }

    document.addEventListener("pointerdown", handlePickerOutsideClick);

    window.addEventListener("keydown", handlePickerEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePickerOutsideClick);

      window.removeEventListener("keydown", handlePickerEscape);
    };
  }, [categoryOpen, brandOpen]);

  return (
    <div className="st-filter-v4">
      <div ref={searchShellRef} className="st-filter-v4__search-shell">
        <form className="st-filter-v4__search" onSubmit={submitSearch}>
          <Search aria-hidden="true" />

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSuggestionsOpen(Boolean(event.target.value.trim()));
              setActiveSuggestion(-1);
            }}
            onFocus={() => setSuggestionsOpen(Boolean(cleanQuery))}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search products, brands or models"
            aria-label="Search products"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && Boolean(cleanQuery)}
            aria-controls="shop-product-suggestions"
            aria-activedescendant={
              activeSuggestion >= 0
                ? `shop-product-suggestion-${searchResults[activeSuggestion]?.id}`
                : undefined
            }
            autoComplete="off"
          />

          {searchLoading ? (
            <LoaderCircle
              className="st-filter-v4__search-loader"
              aria-label="Searching products"
            />
          ) : query ? (
            <button
              type="button"
              className="st-filter-v4__clear-search"
              onClick={() => {
                setQuery("");
                setSearchResults([]);
                setSearchError("");
                setSuggestionsOpen(false);
                navigate({ search: null });
              }}
              aria-label="Clear search"
            >
              <X />
            </button>
          ) : null}

          <button type="submit" className="st-filter-v4__search-button">
            Search
          </button>
        </form>

        {suggestionsOpen && cleanQuery ? (
          <div
            id="shop-product-suggestions"
            className="st-filter-v4__suggestions"
            role="listbox"
            aria-label="Suggested products"
          >
            {searchError ? (
              <div className="st-filter-v4__suggestion-message" role="alert">
                <strong>Search is unavailable.</strong>
                <span>{searchError}</span>
              </div>
            ) : searchLoading && searchResults.length === 0 ? (
              <div className="st-filter-v4__suggestion-message" role="status">
                <LoaderCircle className="st-filter-v4__suggestion-spinner" />
                <span>Finding matching products…</span>
              </div>
            ) : !searchLoading && searchResults.length === 0 ? (
              <div className="st-filter-v4__suggestion-message" role="status">
                <strong>No products found for “{cleanQuery}”.</strong>
                <span>Try another product, brand, or model.</span>
              </div>
            ) : (
              <>
                <div className="st-filter-v4__suggestion-heading">
                  <span>Suggested products</span>
                  <small>{searchResults.length} matches</small>
                </div>

                <div className="st-filter-v4__suggestion-list">
                  {searchResults.slice(0, 6).map((result, index) => (
                    <button
                      key={result.id}
                      id={`shop-product-suggestion-${result.id}`}
                      type="button"
                      className={`st-filter-v4__suggestion ${
                        activeSuggestion === index ? "is-active" : ""
                      }`}
                      role="option"
                      aria-selected={activeSuggestion === index}
                      onMouseEnter={() => setActiveSuggestion(index)}
                      onClick={() => openProduct(result)}
                    >
                      <span className="st-filter-v4__suggestion-image">
                        {result.imageUrl ? (
                          <Image
                            src={result.imageUrl}
                            alt={result.imageAlt}
                            width={58}
                            height={58}
                            sizes="58px"
                          />
                        ) : (
                          <Search aria-hidden="true" />
                        )}
                      </span>

                      <span className="st-filter-v4__suggestion-copy">
                        <small>{result.brand || result.category}</small>
                        <strong>{result.name}</strong>
                        <em>{result.availability}</em>
                      </span>

                      <span className="st-filter-v4__suggestion-price">
                        {result.price !== null
                          ? preciseMoney(result.price)
                          : "View"}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="st-filter-v4__view-results"
                  onClick={() => {
                    setSuggestionsOpen(false);
                    navigate({ search: cleanQuery });
                  }}
                >
                  View all results for “{cleanQuery}”
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`st-filter-v4__mobile-toggle ${
          mobileFiltersOpen ? "is-open" : ""
        }`}
        aria-expanded={mobileFiltersOpen}
        aria-controls="shop-mobile-filter-panel"
        onClick={() => {
          setMobileFiltersOpen((current) => {
            const next = !current;

            if (next && mobileFilterBarRef.current) {
              setMobileFilterHeight(mobileFilterBarRef.current.scrollHeight);
            }

            if (!next) {
              setCategoryOpen(false);
              setBrandOpen(false);
              setCategoryQuery("");
              setBrandQuery("");
              setPriceOpen(false);
            }

            return next;
          });
        }}
      >
        <span className="st-filter-v4__mobile-toggle-copy">
          <Filter aria-hidden="true" />
          <strong>{mobileFiltersOpen ? "Close filters" : "Filters"}</strong>
        </span>

        <ChevronDown
          aria-hidden="true"
          className={mobileFiltersOpen ? "is-open" : ""}
        />
      </button>

      <div
        ref={mobileFilterBarRef}
        id="shop-mobile-filter-panel"
        className={`st-filter-v4__bar ${
          mobileFiltersOpen ? "is-mobile-open" : ""
        }`}
        style={{
          height: mobileFiltersOpen ? `${mobileFilterHeight}px` : "0px",
        }}
      >
        <div className="st-filter-v4__filters">
          <div
            ref={categoryPickerRef}
            className={`st-filter-v4__picker ${
              selectedCategory ? "is-active" : ""
            }`}
          >
            <button
              type="button"
              className="st-filter-v4__picker-trigger"
              aria-haspopup="listbox"
              aria-expanded={categoryOpen}
              onClick={() => {
                setCategoryOpen((current) => !current);
                setBrandOpen(false);
                setBrandQuery("");
                setPriceOpen(false);
              }}
            >
              <span>{selectedCategory || "Category"}</span>

              <ChevronDown className={categoryOpen ? "is-open" : ""} />
            </button>

            {categoryOpen ? (
              <div
                className="st-filter-v4__picker-popover"
                role="dialog"
                aria-label="Category filter"
              >
                <div className="st-filter-v4__picker-title">
                  <div>
                    <small>Category</small>
                    <strong>Choose category</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCategoryOpen(false);
                      setCategoryQuery("");
                    }}
                    aria-label="Close category filter"
                  >
                    <X />
                  </button>
                </div>

                <label className="st-filter-v4__picker-search">
                  <Search aria-hidden="true" />

                  <input
                    type="search"
                    value={categoryQuery}
                    onChange={(event) => setCategoryQuery(event.target.value)}
                    placeholder="Search categories"
                    autoComplete="off"
                    autoFocus
                  />

                  {categoryQuery ? (
                    <button
                      type="button"
                      onClick={() => setCategoryQuery("")}
                      aria-label="Clear category search"
                    >
                      <X />
                    </button>
                  ) : null}
                </label>

                <div
                  className="st-filter-v4__picker-list"
                  role="listbox"
                  aria-label="Categories"
                >
                  <button
                    type="button"
                    className={`st-filter-v4__picker-option ${
                      !selectedCategory ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      setCategoryOpen(false);
                      setCategoryQuery("");

                      navigate({
                        category: null,
                      });
                    }}
                  >
                    <span>All categories</span>

                    {!selectedCategory ? <strong>Selected</strong> : null}
                  </button>

                  {filteredCategories.map((category) => (
                    <button
                      type="button"
                      key={category}
                      className={`st-filter-v4__picker-option ${
                        selectedCategory === category ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        setCategoryOpen(false);
                        setCategoryQuery("");

                        navigate({
                          category,
                        });
                      }}
                    >
                      <span>{category}</span>

                      {selectedCategory === category ? (
                        <strong>Selected</strong>
                      ) : null}
                    </button>
                  ))}

                  {filteredCategories.length === 0 ? (
                    <div className="st-filter-v4__picker-empty">
                      No matching categories
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div
            ref={brandPickerRef}
            className={`st-filter-v4__picker ${
              selectedBrand ? "is-active" : ""
            }`}
          >
            <button
              type="button"
              className="st-filter-v4__picker-trigger"
              aria-haspopup="listbox"
              aria-expanded={brandOpen}
              onClick={() => {
                setBrandOpen((current) => !current);
                setCategoryOpen(false);
                setCategoryQuery("");
                setPriceOpen(false);
              }}
            >
              <span>{selectedBrand || "Brand"}</span>

              <ChevronDown className={brandOpen ? "is-open" : ""} />
            </button>

            {brandOpen ? (
              <div
                className="st-filter-v4__picker-popover"
                role="dialog"
                aria-label="Brand filter"
              >
                <div className="st-filter-v4__picker-title">
                  <div>
                    <small>Brand</small>
                    <strong>Choose brand</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBrandOpen(false);
                      setBrandQuery("");
                    }}
                    aria-label="Close brand filter"
                  >
                    <X />
                  </button>
                </div>

                <label className="st-filter-v4__picker-search">
                  <Search aria-hidden="true" />

                  <input
                    type="search"
                    value={brandQuery}
                    onChange={(event) => setBrandQuery(event.target.value)}
                    placeholder="Search brands"
                    autoComplete="off"
                    autoFocus
                  />

                  {brandQuery ? (
                    <button
                      type="button"
                      onClick={() => setBrandQuery("")}
                      aria-label="Clear brand search"
                    >
                      <X />
                    </button>
                  ) : null}
                </label>

                <div
                  className="st-filter-v4__picker-list"
                  role="listbox"
                  aria-label="Brands"
                >
                  <button
                    type="button"
                    className={`st-filter-v4__picker-option ${
                      !selectedBrand ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      setBrandOpen(false);
                      setBrandQuery("");

                      navigate({
                        brand: null,
                      });
                    }}
                  >
                    <span>All brands</span>

                    {!selectedBrand ? <strong>Selected</strong> : null}
                  </button>

                  {filteredBrands.map((brand) => (
                    <button
                      type="button"
                      key={brand}
                      className={`st-filter-v4__picker-option ${
                        selectedBrand === brand ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        setBrandOpen(false);
                        setBrandQuery("");

                        navigate({
                          brand,
                        });
                      }}
                    >
                      <span>{brand}</span>

                      {selectedBrand === brand ? (
                        <strong>Selected</strong>
                      ) : null}
                    </button>
                  ))}

                  {filteredBrands.length === 0 ? (
                    <div className="st-filter-v4__picker-empty">
                      No matching brands
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="st-filter-v4__price-wrap">
            <button
              type="button"
              className={`st-filter-v4__pill ${
                hasPriceFilter ? "is-active" : ""
              }`}
              onClick={() => setPriceOpen((value) => !value)}
              aria-expanded={priceOpen}
            >
              <SlidersHorizontal />

              <span>
                {hasPriceFilter
                  ? `${money(
                      selectedMinPrice ?? minimumAvailablePrice,
                    )} – ${money(selectedMaxPrice ?? maximumAvailablePrice)}`
                  : "Price"}
              </span>

              <ChevronDown />
            </button>

            {priceMounted ? (
              <>
                <button
                  type="button"
                  className={`st-filter-v4__price-backdrop ${
                    priceOpen
                      ? priceVisible
                        ? "is-open"
                        : "is-entering"
                      : "is-closing"
                  }`}
                  onClick={() => setPriceOpen(false)}
                  aria-label="Close price filter"
                />

                <div
                  className={`st-filter-v4__price-popover ${
                    priceOpen
                      ? priceVisible
                        ? "is-open"
                        : "is-entering"
                      : "is-closing"
                  }`}
                  role="dialog"
                  aria-modal="false"
                  aria-label="Price range"
                >
                  <div className="st-filter-v4__price-title">
                    <div>
                      <small>Price</small>
                      <strong>Choose a range</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPriceOpen(false)}
                      aria-label="Close"
                    >
                      <X />
                    </button>
                  </div>

                  <div className="st-filter-v4__price-fields">
                    <label>
                      <span>Minimum</span>

                      <div>
                        <span>$</span>

                        <input
                          type="number"
                          min={minimumAvailablePrice}
                          max={maximum}
                          value={minimum}
                          onChange={(event) =>
                            setMinimum(Number(event.target.value))
                          }
                        />
                      </div>
                    </label>

                    <label>
                      <span>Maximum</span>

                      <div>
                        <span>$</span>

                        <input
                          type="number"
                          min={minimum}
                          max={maximumAvailablePrice}
                          value={maximum}
                          onChange={(event) =>
                            setMaximum(Number(event.target.value))
                          }
                        />
                      </div>
                    </label>
                  </div>

                  <div className="st-filter-v4__price-range">
                    Available range: {money(minimumAvailablePrice)} –{" "}
                    {money(maximumAvailablePrice)}
                  </div>

                  <div className="st-filter-v4__price-actions">
                    <button type="button" onClick={resetPrice}>
                      Reset
                    </button>

                    <button type="button" onClick={applyPrice}>
                      Apply
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <button
            type="button"
            className={`st-filter-v4__pill ${
              selectedAvailability === "in-stock" ? "is-active" : ""
            }`}
            onClick={() =>
              navigate({
                availability:
                  selectedAvailability === "in-stock" ? null : "in-stock",
              })
            }
          >
            <span className="st-filter-v4__stock-dot" />
            In stock
          </button>
        </div>

        <label className="st-filter-v4__sort">
          <span>Sort</span>

          <select
            value={selectedSort}
            onChange={(event) =>
              navigate({
                sort: event.target.value,
              })
            }
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>

          <ChevronDown />
        </label>
      </div>
    </div>
  );
}
