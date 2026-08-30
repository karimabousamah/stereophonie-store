"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type ProductCategoryOption = {
  id: string;
  name: string;
};

type Props = {
  categories: ProductCategoryOption[];
  defaultValue?: string;
  name?: string;
  onCategoryChange?: (category: ProductCategoryOption | null) => void;
};

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function ProductCategoryPicker({
  categories,
  defaultValue = "",
  name = "category_id",
  onCategoryChange,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 390,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelectedId(defaultValue);
  }, [defaultValue]);

  const selectedCategory =
    categories.find((category) => category.id === selectedId) ?? null;

  const cleanQuery = normalize(query);

  const filtered = useMemo(() => {
    if (!cleanQuery) {
      return categories;
    }

    return categories.filter((category) =>
      normalize(category.name).includes(cleanQuery),
    );
  }, [categories, cleanQuery]);

  function calculatePosition() {
    const button = triggerRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const padding = 16;

    let width = Math.max(rect.width, 390);

    width = Math.min(width, window.innerWidth - padding * 2);

    let left = rect.left;

    if (left + width > window.innerWidth - padding) {
      left = window.innerWidth - width - padding;
    }

    left = Math.max(padding, left);

    setPosition({
      top: rect.bottom + 8,
      left,
      width,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    calculatePosition();

    const update = () => calculatePosition();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 30);

    function outside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
      setActiveIndex(-1);
    }

    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function choose(category: ProductCategoryOption) {
    setSelectedId(category.id);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);

    onCategoryChange?.(category);
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!filtered.length) return;

      setActiveIndex((current) =>
        current < filtered.length - 1 ? current + 1 : 0,
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!filtered.length) return;

      setActiveIndex((current) =>
        current > 0 ? current - 1 : filtered.length - 1,
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (activeIndex >= 0 && filtered[activeIndex]) {
        choose(filtered[activeIndex]);
      } else if (filtered.length === 1) {
        choose(filtered[0]);
      }
    }
  }

  const dropdown =
    mounted && open
      ? createPortal(
          <div
            ref={dropdownRef}
            className="st-admin-category-picker__dropdown"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            <div className="st-admin-category-picker__search-shell">
              <Search className="h-4 w-4 shrink-0" />

              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={keyDown}
                placeholder="Search categories..."
                autoComplete="off"
                className="st-admin-category-picker__search-input"
              />

              {query ? (
                <button
                  type="button"
                  className="st-admin-category-picker__clear"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  aria-label="Clear category search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="st-admin-category-picker__directory-heading">
              <span>Category directory</span>
              <small>{filtered.length} categories</small>
            </div>

            <div className="st-admin-category-picker__list">
              {filtered.length ? (
                filtered.map((category, index) => {
                  const selected = category.id === selectedId;
                  const active = index === activeIndex;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`st-admin-category-picker__option ${
                        selected ? "is-selected" : ""
                      } ${active ? "is-active" : ""}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(category)}
                    >
                      <strong>{category.name}</strong>

                      {selected ? (
                        <span className="st-admin-category-picker__check">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                      ) : (
                        <small>Select</small>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="st-admin-category-picker__empty">
                  No category found
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="st-admin-category-picker">
      <input type="hidden" name={name} value={selectedId} />

      <button
        ref={triggerRef}
        type="button"
        className={`st-admin-category-picker__trigger ${open ? "is-open" : ""}`}
        onClick={() => {
          setOpen((current) => !current);

          if (!open) {
            requestAnimationFrame(calculatePosition);
          }
        }}
        aria-expanded={open}
      >
        <span className="st-admin-category-picker__trigger-icon">
          <Search className="h-4 w-4" />
        </span>

        <span className="st-admin-category-picker__trigger-copy">
          <small>Category</small>
          <strong>{selectedCategory?.name ?? "Select category"}</strong>
        </span>

        <ChevronDown className="st-admin-category-picker__chevron h-4 w-4" />
      </button>
      {selectedCategory ? (
        <button
          type="button"
          onClick={() => {
            setSelectedId("");
            setQuery("");
            setOpen(false);
            setActiveIndex(-1);
            onCategoryChange?.(null);
          }}
          className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/42 transition hover:border-[#fdb73e]/35 hover:bg-[#fdb73e]/[0.08] hover:text-[#f4bd55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fdb73e]/25"
        >
          <X className="h-3 w-3" />
          Clear category
        </button>
      ) : null}

      {dropdown}
    </div>
  );
}
