"use client";

import {
  Search,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type CategoryStatusFilter =
  | "all"
  | "active"
  | "inactive";

type Props = {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
};

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase();
}

export default function CategorySearch({
  totalCount,
  activeCount,
  inactiveCount,
}: Props) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [query, setQuery] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<CategoryStatusFilter>(
    "all",
  );

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(totalCount);

  /*
   * Let the Category tree know when a status filter changes.
   * The tree uses this only to expand branches required to
   * reveal matching nested subcategories.
   */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        "st-admin:category-status-filter",
        {
          detail: {
            status: statusFilter,
          },
        },
      ),
    );
  }, [statusFilter]);


  useEffect(() => {
    const normalizedQuery =
      normalize(query);

    const categoryCards =
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-admin-category-card="true"]',
        ),
      );

    const subcategoryCards =
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-admin-subcategory-card="true"]',
        ),
      );

    function statusMatches(
      status: string | undefined,
    ) {
      if (statusFilter === "all") {
        return true;
      }

      return status === statusFilter;
    }

    let nextVisibleCount = 0;

    /*
     * Resolve subcategories first.
     *
     * Root Category visibility can then remain on when
     * one of its descendants matches the current search /
     * status filter.
     */
    subcategoryCards.forEach(
      (card) => {
        const searchText =
          normalize(
            card.dataset
              .adminSubcategorySearch ??
              "",
          );

        const queryMatches =
          !normalizedQuery ||
          searchText.includes(
            normalizedQuery,
          );

        const matches =
          queryMatches &&
          statusMatches(
            card.dataset
              .adminSubcategoryStatus,
          );

        card.hidden = !matches;

        if (matches) {
          nextVisibleCount += 1;
        }
      },
    );

    categoryCards.forEach(
      (card) => {
        const searchText =
          normalize(
            card.dataset
              .adminCategorySearch ??
              "",
          );

        const queryMatches =
          !normalizedQuery ||
          searchText.includes(
            normalizedQuery,
          );

        const selfMatches =
          queryMatches &&
          statusMatches(
            card.dataset
              .adminCategoryStatus,
          );

        const matchingChild =
          Array.from(
            card.querySelectorAll<HTMLElement>(
              '[data-admin-subcategory-card="true"]',
            ),
          ).some(
            (child) =>
              !child.hidden,
          );

        /*
         * Keep the root branch available when a matching
         * descendant lives inside it.
         */
        const groupMatches =
          selfMatches ||
          matchingChild;

        card.hidden =
          !groupMatches;

        if (selfMatches) {
          nextVisibleCount += 1;
        }
      },
    );

    setVisibleCount(
      nextVisibleCount,
    );
  }, [
    query,
    statusFilter,
    totalCount,
  ]);

  function clearSearch() {
    setQuery("");

    window.requestAnimationFrame(
      () => {
        inputRef.current?.focus();
      },
    );
  }

  const normalizedQuery =
    normalize(query);

  const filtering =
    Boolean(normalizedQuery) ||
    statusFilter !== "all";

  return (
    <section
      className="st-admin-directory-search st-admin-product-directory-v2 st-admin-category-directory-v2"
      aria-label="Search category directory"
      data-category-status-filter={
        statusFilter
      }
    >
      <div className="st-admin-product-directory-v2__toolbar st-category-directory-search-row">
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
              setQuery(
                event.target.value,
              )
            }
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
          className="st-category-directory-status-filters"
          aria-label="Filter categories by status"
        >
          <button
            type="button"
            className={
              statusFilter === "all"
                ? "is-active"
                : undefined
            }
            aria-pressed={
              statusFilter === "all"
            }
            onClick={() =>
              setStatusFilter("all")
            }
          >
            <span>All</span>
            <small>
              {totalCount}
            </small>
          </button>

          <button
            type="button"
            className={
              statusFilter ===
              "active"
                ? "is-active"
                : undefined
            }
            aria-pressed={
              statusFilter ===
              "active"
            }
            onClick={() =>
              setStatusFilter(
                "active",
              )
            }
          >
            <span>Active</span>
            <small>
              {activeCount}
            </small>
          </button>

          <button
            type="button"
            className={
              statusFilter ===
              "inactive"
                ? "is-active"
                : undefined
            }
            aria-pressed={
              statusFilter ===
              "inactive"
            }
            onClick={() =>
              setStatusFilter(
                "inactive",
              )
            }
          >
            <span>Inactive</span>
            <small>
              {inactiveCount}
            </small>
          </button>
        </div>
      </div>

      {filtering ? (
        <p className="st-admin-directory-search__status">
          {visibleCount > 0
            ? `${visibleCount} ${
                visibleCount === 1
                  ? "result matches"
                  : "results match"
              } the current filters.`
            : "No category or subcategory matches the current filters."}
        </p>
      ) : null}
    </section>
  );
}
