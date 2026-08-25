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

  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchValue);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const cleanQuery = query.trim();

  const [priceOpen, setPriceOpen] = useState(false);
  const [priceMounted, setPriceMounted] = useState(false);
  const [priceVisible, setPriceVisible] = useState(false);

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
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
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
      minPrice:
        realMinimum <= minimumAvailablePrice
          ? null
          : realMinimum,

      maxPrice:
        realMaximum >= maximumAvailablePrice
          ? null
          : realMaximum,
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

  const hasPriceFilter =
    selectedMinPrice !== null ||
    selectedMaxPrice !== null;

  return (
    <div className="st-filter-v4">
      <div
        ref={searchShellRef}
        className="st-filter-v4__search-shell"
      >
        <form
          className="st-filter-v4__search"
          onSubmit={submitSearch}
        >
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

          <button
            type="submit"
            className="st-filter-v4__search-button"
          >
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

      <div className="st-filter-v4__bar">
        <div className="st-filter-v4__filters">
          <label className="st-filter-v4__select">
            <span>Category</span>

            <select
              value={selectedCategory}
              onChange={(event) =>
                navigate({
                  category: event.target.value || null,
                })
              }
            >
              <option value="">All categories</option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            <ChevronDown />
          </label>

          <label className="st-filter-v4__select">
            <span>Brand</span>

            <select
              value={selectedBrand}
              onChange={(event) =>
                navigate({
                  brand: event.target.value || null,
                })
              }
            >
              <option value="">All brands</option>

              {brands.map((brand) => (
                <option
                  key={brand}
                  value={brand}
                >
                  {brand}
                </option>
              ))}
            </select>

            <ChevronDown />
          </label>

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
                      selectedMinPrice ??
                        minimumAvailablePrice,
                    )} – ${money(
                      selectedMaxPrice ??
                        maximumAvailablePrice,
                    )}`
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
                            setMinimum(
                              Number(event.target.value),
                            )
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
                            setMaximum(
                              Number(event.target.value),
                            )
                          }
                        />
                      </div>
                    </label>
                  </div>

                  <div className="st-filter-v4__price-range">
                    Available range:{" "}
                    {money(minimumAvailablePrice)} –{" "}
                    {money(maximumAvailablePrice)}
                  </div>

                  <div className="st-filter-v4__price-actions">
                    <button
                      type="button"
                      onClick={resetPrice}
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={applyPrice}
                    >
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
              selectedAvailability === "in-stock"
                ? "is-active"
                : ""
            }`}
            onClick={() =>
              navigate({
                availability:
                  selectedAvailability === "in-stock"
                    ? null
                    : "in-stock",
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
            <option value="price-asc">
              Price: low to high
            </option>
            <option value="price-desc">
              Price: high to low
            </option>
          </select>

          <ChevronDown />
        </label>
      </div>

      <div className="st-filter-v4__mobile-label">
        <Filter />
        Shop filters
      </div>
    </div>
  );
}
