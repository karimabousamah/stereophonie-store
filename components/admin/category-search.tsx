"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  categoryCount: number;
  subcategoryCount: number;
};

export default function CategorySearch({
  categoryCount,
  subcategoryCount,
}: Props) {
  const [query, setQuery] = useState("");
  const [visibleCategoryCount, setVisibleCategoryCount] =
    useState(categoryCount);
  const [visibleSubcategoryCount, setVisibleSubcategoryCount] =
    useState(subcategoryCount);

  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = useMemo(
    () => query.trim().toLocaleLowerCase(),
    [query],
  );

  useEffect(() => {
    const categoryCards = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-admin-category-card="true"]',
      ),
    );

    const subcategoryCards = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-admin-subcategory-card="true"]',
      ),
    );

    let nextVisibleCategories = 0;
    let nextVisibleSubcategories = 0;

    categoryCards.forEach((card) => {
      const searchable = String(
        card.dataset.adminCategorySearch ?? "",
      ).toLocaleLowerCase();

      const matches = !normalizedQuery || searchable.includes(normalizedQuery);

      card.hidden = !matches;

      if (matches) {
        nextVisibleCategories += 1;
      }
    });

    subcategoryCards.forEach((card) => {
      const searchable = String(
        card.dataset.adminSubcategorySearch ?? "",
      ).toLocaleLowerCase();

      const matches = !normalizedQuery || searchable.includes(normalizedQuery);

      card.hidden = !matches;

      if (matches) {
        nextVisibleSubcategories += 1;
      }
    });

    setVisibleCategoryCount(nextVisibleCategories);
    setVisibleSubcategoryCount(nextVisibleSubcategories);
  }, [normalizedQuery]);

  function clearSearch() {
    setQuery("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  const displayedCategories = normalizedQuery
    ? visibleCategoryCount
    : categoryCount;

  const displayedSubcategories = normalizedQuery
    ? visibleSubcategoryCount
    : subcategoryCount;

  const displayedTotal = displayedCategories + displayedSubcategories;

  return (
    <section
      className="st-admin-directory-search st-admin-product-directory-v2 st-admin-category-directory-v2"
      aria-label="Search category directory"
    >
      <div className="st-admin-product-directory-v2__toolbar st-category-directory-search-row">
        <label className="st-admin-directory-search__field">
          <span className="st-admin-directory-search__icon" aria-hidden="true">
            <Search />
          </span>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search categories or subcategories"
            aria-label="Search categories or subcategories"
            autoComplete="off"
            spellCheck={false}
          />

          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear category search"
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <div
          className="st-category-directory-counters"
          aria-label="Category directory totals"
        >
          <div className="st-category-directory-counter is-total">
            <span>All</span>
            <strong>{displayedTotal}</strong>
          </div>

          <div className="st-category-directory-counter">
            <span>Categories</span>
            <strong>{displayedCategories}</strong>
          </div>

          <div className="st-category-directory-counter">
            <span>Subcategories</span>
            <strong>{displayedSubcategories}</strong>
          </div>
        </div>
      </div>

      {normalizedQuery ? (
        <p className="st-admin-directory-search__status">
          {displayedTotal > 0
            ? `${displayedTotal} ${
                displayedTotal === 1 ? "result matches" : "results match"
              } “${query.trim()}”.`
            : `No category or subcategory matches “${query.trim()}”.`}
        </p>
      ) : null}
    </section>
  );
}
