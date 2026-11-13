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

type Props = {
  total: number;
};

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase();
}

export default function OrderSearch({
  total,
}: Props) {
  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const [query, setQuery] =
    useState("");

  useEffect(() => {
    const normalizedQuery =
      normalize(query);

    const rows =
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-admin-order-search-card="true"]',
        ),
      );

    rows.forEach((row) => {
      const searchText =
        normalize(
          row.dataset
            .adminOrderSearch ??
            "",
        );

      const matches =
        !normalizedQuery ||
        searchText.includes(
          normalizedQuery,
        );

      row.hidden = !matches;
    });
  }, [
    query,
    total,
  ]);

  return (
    <label className="st-admin-orders-v6__search-field">
      <span
        className="st-admin-orders-v6__search-icon"
        aria-hidden="true"
      >
        <Search />
      </span>

      <input
        ref={searchInputRef}
        id="st-admin-orders-search-input"
        className="st-admin-orders-v6__search-input"
        type="text"
        value={query}
        onChange={(event) =>
          setQuery(
            event.target.value,
          )
        }
        placeholder="Search orders, customers, phone, email, products or location"
        aria-label="Search orders, customers, phone, email, products or location"
        autoComplete="off"
        spellCheck={false}
      />

      {query ? (
        <button
          type="button"
          className="st-admin-orders-v6__search-clear"
          onClick={() => {
            setQuery("");
            searchInputRef.current?.focus();
          }}
          aria-label="Clear order search"
        >
          <X aria-hidden="true" />
        </button>
      ) : null}
    </label>
  );
}
