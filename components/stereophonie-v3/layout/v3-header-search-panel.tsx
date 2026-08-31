"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  History,
  LoaderCircle,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

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

const searchHistoryStorageKey = "stereophonie-search-history-v1";
const maximumSearchHistoryItems = 6;

function readSearchHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedHistory = JSON.parse(
      window.localStorage.getItem(searchHistoryStorageKey) ?? "[]",
    );

    if (!Array.isArray(storedHistory)) {
      return [];
    }

    const uniqueHistory: string[] = [];

    for (const item of storedHistory) {
      if (typeof item !== "string") {
        continue;
      }

      const cleanItem = item.trim().replace(/\s+/g, " ").slice(0, 80);

      if (
        cleanItem &&
        !uniqueHistory.some(
          (historyItem) =>
            historyItem.toLowerCase() === cleanItem.toLowerCase(),
        )
      ) {
        uniqueHistory.push(cleanItem);
      }

      if (uniqueHistory.length === maximumSearchHistoryItems) {
        break;
      }
    }

    return uniqueHistory;
  } catch {
    return [];
  }
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function V3HeaderSearchPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchHistory, setSearchHistory] =
    useState<string[]>(readSearchHistory);
  const cleanQuery = query.trim();

  useEffect(() => {
    if (!cleanQuery) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

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

        setResults(data.results ?? []);
      } catch (searchError) {
        if (controller.signal.aborted) {
          return;
        }

        setResults([]);
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Search is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cleanQuery]);

  function updateQuery(value: string) {
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      setError("");
      setLoading(false);
    }
  }

  function persistSearchHistory(nextHistory: string[]) {
    setSearchHistory(nextHistory);

    try {
      if (nextHistory.length === 0) {
        window.localStorage.removeItem(searchHistoryStorageKey);
      } else {
        window.localStorage.setItem(
          searchHistoryStorageKey,
          JSON.stringify(nextHistory),
        );
      }
    } catch {
      // Search still works when browser storage is unavailable.
    }
  }

  function rememberSearch(value: string) {
    const cleanValue = value.trim().replace(/\s+/g, " ").slice(0, 80);

    if (!cleanValue) {
      return;
    }

    persistSearchHistory(
      [
        cleanValue,
        ...searchHistory.filter(
          (historyItem) =>
            historyItem.toLowerCase() !== cleanValue.toLowerCase(),
        ),
      ].slice(0, maximumSearchHistoryItems),
    );
  }

  function selectHistoryItem(historyItem: string) {
    updateQuery(historyItem);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function removeHistoryItem(historyItem: string) {
    persistSearchHistory(searchHistory.filter((item) => item !== historyItem));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cleanQuery) {
      return;
    }

    rememberSearch(cleanQuery);
    onClose();
    router.push(`/shop?search=${encodeURIComponent(cleanQuery)}`);
  }

  return (
    <section className="st3-utility-search" aria-label="Product search">
      <form className="st3-utility-search__form" onSubmit={submitSearch}>
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search Stereophonie"
          aria-label="Search products, brands, and categories"
          autoComplete="off"
        />
        {loading ? <LoaderCircle className="st3-utility-spin" /> : null}
      </form>

      {!cleanQuery ? (
        <div className="st3-utility-search__history">
          <div className="st3-utility-search__history-heading">
            <div className="st3-utility-search__history-title">
              <p>Search history</p>
              {searchHistory.length > 0 ? (
                <span aria-label={`${searchHistory.length} saved searches`}>
                  {searchHistory.length}
                </span>
              ) : null}
            </div>
            {searchHistory.length > 0 ? (
              <button
                type="button"
                className="st3-utility-search__history-clear"
                onClick={() => persistSearchHistory([])}
              >
                <Trash2 aria-hidden="true" />
                <span>Clear history</span>
              </button>
            ) : null}
          </div>

          {searchHistory.length > 0 ? (
            <div
              className="st3-utility-search__history-list"
              role="list"
              aria-label="Search history"
            >
              {searchHistory.map((historyItem) => (
                <div
                  key={historyItem.toLowerCase()}
                  className="st3-utility-search__history-item"
                  role="listitem"
                >
                  <button
                    type="button"
                    className="st3-utility-search__history-term"
                    onClick={() => selectHistoryItem(historyItem)}
                  >
                    <span className="st3-utility-search__history-icon">
                      <History aria-hidden="true" />
                    </span>
                    <span>{historyItem}</span>
                  </button>
                  <button
                    type="button"
                    className="st3-utility-search__history-remove"
                    aria-label={`Remove ${historyItem} from search history`}
                    title={`Remove “${historyItem}”`}
                    onClick={() => removeHistoryItem(historyItem)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="st3-utility-search__history-empty">
              <span aria-hidden="true">
                <History />
              </span>
              <p>Your recent searches will appear here.</p>
            </div>
          )}
        </div>
      ) : error ? (
        <div className="st3-utility-search__message" role="alert">
          <strong>Search is unavailable.</strong>
          <span>{error}</span>
        </div>
      ) : !loading && results.length === 0 ? (
        <div className="st3-utility-search__message" role="status">
          <strong>No results for “{cleanQuery}”.</strong>
          <span>Try a product name, brand, model, or category.</span>
        </div>
      ) : results.length > 0 ? (
        <div className="st3-utility-search__results">
          <div className="st3-utility-search__results-heading">
            <p>Product results</p>
            <button
              type="button"
              onClick={() => {
                rememberSearch(cleanQuery);
                onClose();
                router.push(`/shop?search=${encodeURIComponent(cleanQuery)}`);
              }}
            >
              View all
              <ArrowRight />
            </button>
          </div>

          <div className="st3-utility-search__grid">
            {results.slice(0, 4).map((result) => (
              <Link
                key={result.id}
                href={`/shop/${result.slug}`}
                onClick={() => {
                  rememberSearch(cleanQuery);
                  onClose();
                }}
                className="st3-utility-search-card"
              >
                <div className="st3-utility-search-card__image">
                  {result.imageUrl ? (
                    <Image
                      src={result.imageUrl}
                      alt={result.imageAlt}
                      width={140}
                      height={140}
                      sizes="140px"
                    />
                  ) : (
                    <Search />
                  )}
                </div>
                <div>
                  <p>{result.brand || result.category}</p>
                  <h3>{result.name}</h3>
                  <span>
                    {result.price !== null
                      ? money(result.price)
                      : "View details"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
