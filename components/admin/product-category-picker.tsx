"use client";

import {
 Check,
 ChevronDown,
 LoaderCircle,
 Plus,
 Search,
 X,
} from "lucide-react";
import {
 useEffect,
 useLayoutEffect,
 useMemo,
 useRef,
 useState,
 type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { createCategoryInline } from "@/components/admin/product-category-picker-actions";

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

 const [options, setOptions] = useState(categories);
 const [selectedId, setSelectedId] = useState(defaultValue);
 const [query, setQuery] = useState("");
 const [open, setOpen] = useState(false);
 const [activeIndex, setActiveIndex] = useState(-1);
 const [mounted, setMounted] = useState(false);
 const [creating, setCreating] = useState(false);
 const [error, setError] = useState("");
 const [creationMessage, setCreationMessage] = useState("");

 const [position, setPosition] = useState({
 top: 0,
 left: 0,
 width: 390,
  });

 useEffect(() => {
 setMounted(true);
  }, []);

 useEffect(() => {
 setOptions(categories);
  }, [categories]);

 useEffect(() => {
 setSelectedId(defaultValue);
  }, [defaultValue]);

 const selectedCategory =
 options.find((category) => category.id === selectedId) ?? null;

 const cleanQuery = normalize(query);

 const filtered = useMemo(() => {
 if (!cleanQuery) {
 return options;
    }

 return options.filter((category) =>
 normalize(category.name).includes(cleanQuery),
    );
  }, [options, cleanQuery]);

 const exactMatch = options.some(
    (category) => normalize(category.name) === cleanQuery,
  );

 const canCreate = Boolean(cleanQuery && !exactMatch);

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
 setError("");
 setCreationMessage("");

 onCategoryChange?.(category);
  }

 async function createRequestedCategory() {
 const requestedName = query.replace(/\s+/g, " ").trim();

 if (!requestedName || creating || !canCreate) {
 return;
    }

 setCreating(true);
 setError("");
 setCreationMessage("");

 try {
 const result = await createCategoryInline(requestedName);

 if (!result.ok) {
 setError(result.error);
 return;
      }

 const nextCategory = result.category;

 setOptions((current) => {
 if (current.some((category) => category.id === nextCategory.id)) {
 return current;
        }

 return [...current, nextCategory].sort((a, b) =>
 a.name.localeCompare(b.name),
        );
      });

 setSelectedId(nextCategory.id);
 setQuery("");
 setActiveIndex(-1);

 setCreationMessage(
 result.created
          ? `${nextCategory.name} was created and selected.`
          : `${nextCategory.name} already existed and was selected.`,
      );

 onCategoryChange?.(nextCategory);

 window.setTimeout(() => {
 setOpen(false);
 triggerRef.current?.focus();
      }, 450);
    } catch {
 setError("The category could not be created. Please try again.");
    } finally {
 setCreating(false);
    }
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
      } else if (canCreate) {
 void createRequestedCategory();
      }
    }
  }

 const dropdown =
 mounted && open
      ? createPortal(
          <div
            ref={dropdownRef}
            className="st-admin-category-picker__dropdown fixed z-[10000] overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.08)]"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            role="dialog"
            aria-label="Choose product category"
          >
            <div className="border-b border-black/[0.07] p-3">
              <div className="st-admin-picker-search-final st-admin-option-directory-search-v2 flex min-h-[48px] items-center gap-3 rounded-[13px] border border-black/10 bg-[#f7f7f8] px-3.5 transition focus-within:border-[#d59a2e]/65 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(253,183,62,0.10)]">
                <Search className="h-[17px] w-[17px] shrink-0 text-black/42" />

                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setError("");
                    setCreationMessage("");
                  }}
                  onKeyDown={keyDown}
                  placeholder="Search categories..."
                  autoComplete="off"
                  className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[14px] font-medium text-[#1d1d1f] outline-none ring-0 shadow-none placeholder:text-black/35 focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none st-admin-category-picker__search-input st-admin-picker-search-input-final"
                  aria-label="Search categories"
                  role="combobox"
                  aria-expanded="true"
                  aria-autocomplete="list"
                />

                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setError("");
                      setCreationMessage("");
                      requestAnimationFrame(() => {
                        searchRef.current?.focus();
                      });
                    }}
                    className="st-admin-picker-search-clear-final"
                    aria-label="Clear category search"
                  >
                    <X
                      className="h-3.5 w-3.5"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-4 px-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.17em] text-black/35">
                  Category directory
                </span>

                <span className="text-[11px] font-medium text-black/38">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "category" : "categories"}
                </span>
              </div>
            </div>

            <div className="max-h-[330px] overflow-y-auto overscroll-contain p-2">
              {filtered.length ? (
                <div role="listbox" aria-label="Available categories">
                  {filtered.map((category, index) => {
                    const selected = category.id === selectedId;
                    const active = index === activeIndex;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(category)}
                        className={`mb-1 flex min-h-[46px] w-full items-center justify-between gap-4 rounded-[12px] px-3.5 text-left transition ${
                          selected
                            ? "bg-[#fff6df] text-[#7b5000]"
                            : active
                              ? "bg-black/[0.045] text-black"
                              : "text-black/72 hover:bg-black/[0.035] hover:text-black"
                        }`}
                      >
                        <span className="min-w-0 truncate text-[13px] font-semibold">
                          {category.name}
                        </span>

                        {selected ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fdb73e] text-black shadow-[0_4px_12px_rgba(253,183,62,0.25)]">
                            <Check
                              className="h-3.5 w-3.5"
                              strokeWidth={2.5}
                            />
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/22">
                            Select
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-7 text-center">
                  <Search className="mx-auto h-5 w-5 text-black/20" />

                  <p className="mt-3 text-[13px] font-semibold text-black/65">
                    No matching category
                  </p>

                  <p className="mt-1 text-[12px] leading-5 text-black/40">
                    You can create this category without leaving the product.
                  </p>
                </div>
              )}
            </div>

            {error ? (
              <div className="border-t border-red-500/10 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
                {error}
              </div>
            ) : null}

            {creationMessage ? (
              <div className="border-t border-emerald-500/10 bg-emerald-50 px-4 py-3 text-[12px] font-medium text-emerald-700">
                {creationMessage}
              </div>
            ) : null}

            {canCreate ? (
                <div className="st-admin-picker-create-footer-v40">
                  <button
 type="button"
 onClick={() => void createRequestedCategory()}
 disabled={creating}
 className="st-admin-picker-create-action-v40"
                  >
                    <span className="st-admin-picker-create-content-v40">
                      <span className="st-admin-picker-create-icon-v40">
                        {creating ? (
                          <LoaderCircle className="st-admin-picker-create-spinner-v40" />
                        ) : (
                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </span>

                      <span className="st-admin-picker-create-copy-v40">
                        <strong>
                          {creating
                            ? "Creating category..."
                            : `Add “${query.replace(/\s+/g, " ").trim()}”`}
                        </strong>
                        <small>Create and select automatically</small>
                      </span>
                    </span>
                  </button>
                </div>
              ) : null}
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
 setError("");
 setCreationMessage("");
 onCategoryChange?.(null);
          }}
 className="st-admin-organization-clear-chip-v2"
        >
          <span>Clear category</span>
          <X aria-hidden="true" />
        </button>
      ) : null}

      {dropdown}
    </div>
  );
}
