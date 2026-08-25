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
  type: "brand" | "product" | "category" | "order";
  selector: string;
  datasetKey:
    | "adminBrandSearch"
    | "adminProductSearch"
    | "adminCategorySearch"
    | "adminOrderSearch";
  eyebrow: string;
  title: string;
  placeholder: string;
  singular: string;
  plural: string;
};

export default function AdminDirectorySearch({
  total,
  type,
  selector,
  datasetKey,
  eyebrow,
  title,
  placeholder,
  singular,
  plural,
}: Props) {
  const [query, setQuery] =
    useState("");

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
          selector,
        ),
      );

    let visible = 0;

    cards.forEach(
      (card) => {
        const searchable =
          String(
            card.dataset[
              datasetKey
            ] ?? "",
          ).toLocaleLowerCase();

        const matches =
          !normalizedQuery ||
          searchable.includes(
            normalizedQuery,
          );

        card.hidden =
          !matches;

        if (matches) {
          visible += 1;
        }
      },
    );

    setVisibleCount(
      visible,
    );
  }, [
    normalizedQuery,
    total,
    selector,
    datasetKey,
  ]);

  function clearSearch() {
    setQuery("");

    requestAnimationFrame(
      () => {
        inputRef
          .current
          ?.focus();
      },
    );
  }

  const displayedCount =
    normalizedQuery
      ? visibleCount
      : total;

  return (
    <section
      className="st-admin-directory-search"
      data-directory-type={type}
      aria-label={title}
    >
      <div className="st-admin-directory-search__heading">
        <div>
          <span>
            {eyebrow}
          </span>

          <strong>
            {title}
          </strong>
        </div>

        <div className="st-admin-directory-search__count">
          <strong>
            {displayedCount}
          </strong>

          <span>
            {normalizedQuery
              ? displayedCount === 1
                ? "match"
                : "matches"
              : displayedCount === 1
                ? singular
                : plural}
          </span>
        </div>
      </div>

      <label
        className="st-admin-directory-search__field"
      >
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
          onChange={
            (event) =>
              setQuery(
                event.target.value,
              )
          }
          placeholder={placeholder}
          aria-label={title}
          autoComplete="off"
          spellCheck={false}
        />

        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={`Clear ${type} search`}
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
                  ? singular
                  : plural
              } match “${query.trim()}”.`
            : `No ${singular} matches “${query.trim()}”.`}
        </p>
      ) : null}
    </section>
  );
}
