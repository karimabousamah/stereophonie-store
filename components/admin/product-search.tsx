"use client";

import {
  Search,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Props = {
  total: number;
  liveTotal: number;
  draftTotal: number;
  outOfStockTotal: number;
};

type ProductStatusFilter =
  | "all"
  | "published"
  | "draft"
  | "out_of_stock";

export default function ProductSearch({
  total,
  liveTotal,
  draftTotal,
  outOfStockTotal,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<ProductStatusFilter>("all");

  const [visibleCount, setVisibleCount] =
    useState(total);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const normalizedQuery =
    useMemo(
      () =>
        query
          .trim()
          .toLocaleLowerCase(),
      [query],
    );

  useEffect(() => {
    const cards =
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-admin-product-search-card="true"]',
        ),
      );

    let visible = 0;

    cards.forEach((card) => {
      const searchable =
        card.dataset
          .adminProductSearch
          ?.toLocaleLowerCase() ?? "";

      const productStatus =
        card.dataset.adminProductStatus ?? "";

      const matchesQuery =
        !normalizedQuery ||
        searchable.includes(normalizedQuery);

      const productOutOfStock =
        card.dataset.adminProductOutOfStock === "true";

      const matchesStatus =
        status === "all" ||
        (
          status === "out_of_stock"
            ? productOutOfStock
            : productStatus === status
        );

      const matches =
        matchesQuery && matchesStatus;

      card.hidden = !matches;

      if (matches) {
        visible += 1;
      }
    });

    setVisibleCount(visible);
  }, [
    normalizedQuery,
    status,
  ]);

  function clearSearch() {
    setQuery("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  const directoryTotal =
    status === "published"
      ? liveTotal
      : status === "draft"
        ? draftTotal
        : status === "out_of_stock"
          ? outOfStockTotal
          : total;

  return (
    <section
      className="st-admin-directory-search st-admin-product-directory-v2"
      aria-label="Product directory"
    >
      <div className="st-admin-directory-search__heading">
        <div>
          <span>Product directory</span>

          <strong>Find a product</strong>
        </div>

        <div className="st-admin-directory-search__count">
          <strong>
            {normalizedQuery
              ? visibleCount
              : directoryTotal}
          </strong>

          <span>
            {(normalizedQuery
              ? visibleCount
              : directoryTotal) === 1
              ? "product"
              : "products"}
          </span>
        </div>
      </div>

      <div
        className="st-admin-product-directory-v2__filters"
        aria-label="Filter products"
      >
        <button
          type="button"
          className={
            status === "all"
              ? "is-active"
              : ""
          }
          onClick={() => setStatus("all")}
        >
          <span>All products</span>
          <strong>{total}</strong>
        </button>

        <button
          type="button"
          className={
            status === "published"
              ? "is-active"
              : ""
          }
          onClick={() => setStatus("published")}
        >
          <span>Live</span>
          <strong>{liveTotal}</strong>
        </button>

        <button
          type="button"
          className={
            status === "draft"
              ? "is-active"
              : ""
          }
          onClick={() => setStatus("draft")}
        >
          <span>Drafts</span>
          <strong>{draftTotal}</strong>
        </button>

        <button
          type="button"
          className={
            status === "out_of_stock"
              ? "is-active"
              : ""
          }
          onClick={() => setStatus("out_of_stock")}
        >
          <span>Out of stock</span>
          <strong>{outOfStockTotal}</strong>
        </button>
      </div>

      <label className="st-admin-directory-search__field">
        <span
          className="st-admin-directory-search__icon"
          aria-hidden="true"
        >
          <Search />
        </span>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search iPhone, Samsung, headphones, gaming..."
          aria-label="Search products"
          autoComplete="off"
          spellCheck={false}
        />

        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear product search"
          >
            <X />
          </button>
        ) : null}
      </label>

      {normalizedQuery ? (
        <p className="st-admin-directory-search__status">
          {visibleCount > 0
            ? `${visibleCount} ${
                visibleCount === 1
                  ? "product matches"
                  : "products match"
              } “${query.trim()}”.`
            : `No product matches “${query.trim()}” in this section.`}
        </p>
      ) : null}
    </section>
  );
}
