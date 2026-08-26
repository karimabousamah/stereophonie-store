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

import { createBrandInline } from "@/components/admin/product-brand-picker-actions";

export type ProductBrandOption = {
  id: string;
  name: string;
};

type ProductBrandPickerProps = {
  brands: ProductBrandOption[];
  defaultValue?: string;
  name?: string;
  onBrandChange?: (brand: ProductBrandOption | null) => void;
};

type FloatingPosition = {
  top: number;
  left: number;
  width: number;
};

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export default function ProductBrandPicker({
  brands,
  defaultValue = "",
  name = "brand_id",
  onBrandChange,
}: ProductBrandPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [options, setOptions] = useState<ProductBrandOption[]>(brands);
  const [selectedId, setSelectedId] = useState(defaultValue);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [creationMessage, setCreationMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  const [position, setPosition] = useState<FloatingPosition>({
    top: 0,
    left: 0,
    width: 360,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOptions(brands);
  }, [brands]);

  useEffect(() => {
    setSelectedId(defaultValue);
  }, [defaultValue]);

  const selectedBrand =
    options.find((brand) => brand.id === selectedId) ?? null;

  const cleanQuery = query.trim();
  const normalizedQuery = normalize(cleanQuery);

  const filteredBrands = useMemo(() => {
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((brand) =>
      normalize(brand.name).includes(normalizedQuery),
    );
  }, [options, normalizedQuery]);

  const exactMatch = useMemo(() => {
    if (!normalizedQuery) {
      return null;
    }

    return (
      options.find((brand) => normalize(brand.name) === normalizedQuery) ?? null
    );
  }, [options, normalizedQuery]);

  const canCreate = Boolean(cleanQuery && !exactMatch);

  function updatePosition() {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();

    const viewportPadding = 16;
    const desiredWidth = Math.max(rect.width, 390);
    const maximumWidth = Math.min(desiredWidth, window.innerWidth - 32);

    let left = rect.left;

    if (left + maximumWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - maximumWidth - viewportPadding;
    }

    if (left < viewportPadding) {
      left = viewportPadding;
    }

    setPosition({
      top: rect.bottom + 8,
      left,
      width: maximumWidth,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    const handleViewportChange = () => updatePosition();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 30);

    function handlePointerDown(event: MouseEvent) {
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

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalizedQuery]);

  function chooseBrand(brand: ProductBrandOption | null) {
    setSelectedId(brand?.id ?? "");
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    setError("");
    setCreationMessage("");

    onBrandChange?.(brand);

    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }

  async function createRequestedBrand() {
    const requestedName = cleanQuery;

    if (!requestedName || creating) {
      return;
    }

    setCreating(true);
    setError("");
    setCreationMessage("");

    try {
      const result = await createBrandInline(requestedName);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const nextBrand = result.brand;

      setOptions((current) => {
        if (current.some((brand) => brand.id === nextBrand.id)) {
          return current;
        }

        return [...current, nextBrand].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });

      setSelectedId(nextBrand.id);
      setQuery("");
      setActiveIndex(-1);

      setCreationMessage(
        result.created
          ? `${nextBrand.name} was created and selected.`
          : `${nextBrand.name} already existed and was selected.`,
      );

      onBrandChange?.(nextBrand);

      window.setTimeout(() => {
        setOpen(false);
        triggerRef.current?.focus();
      }, 450);
    } catch {
      setError("The brand could not be created. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (filteredBrands.length === 0) {
        return;
      }

      setActiveIndex((current) =>
        current < filteredBrands.length - 1 ? current + 1 : 0,
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (filteredBrands.length === 0) {
        return;
      }

      setActiveIndex((current) =>
        current > 0 ? current - 1 : filteredBrands.length - 1,
      );

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (activeIndex >= 0 && filteredBrands[activeIndex]) {
        chooseBrand(filteredBrands[activeIndex]);
        return;
      }

      if (filteredBrands.length === 1) {
        chooseBrand(filteredBrands[0]);
        return;
      }

      if (canCreate) {
        void createRequestedBrand();
      }
    }
  }

  const dropdown =
    mounted && open
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[10000] overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.08)]"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            role="dialog"
            aria-label="Choose product brand"
          >
            <div className="border-b border-black/[0.07] p-3">
              <div className="flex min-h-[48px] items-center gap-3 rounded-[13px] border border-black/10 bg-[#f7f7f8] px-3.5 transition focus-within:border-[#d59a2e]/65 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(253,183,62,0.10)]">
                <Search className="h-[17px] w-[17px] shrink-0 text-black/42" />

                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setError("");
                    setCreationMessage("");
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search brands..."
                  autoComplete="off"
                  className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[14px] font-medium text-[#1d1d1f] outline-none ring-0 shadow-none placeholder:text-black/35 focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none st-admin-product-brand-picker__search-input"
                  aria-label="Search brands"
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
                      searchRef.current?.focus();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-black/35 transition hover:bg-black/[0.055] hover:text-black/70"
                    aria-label="Clear brand search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-4 px-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.17em] text-black/35">
                  Brand directory
                </span>

                <span className="text-[11px] font-medium text-black/38">
                  {filteredBrands.length}{" "}
                  {filteredBrands.length === 1 ? "brand" : "brands"}
                </span>
              </div>
            </div>

            <div className="max-h-[330px] overflow-y-auto overscroll-contain p-2">
              {!normalizedQuery ? (
                <button
                  type="button"
                  onClick={() => chooseBrand(null)}
                  className={`mb-1 flex min-h-[46px] w-full items-center justify-between rounded-[12px] px-3.5 text-left transition ${
                    !selectedId
                      ? "bg-[#fff6df] text-[#8a5900]"
                      : "text-black/62 hover:bg-black/[0.035] hover:text-black"
                  }`}
                >
                  <span className="text-[13px] font-semibold">No brand</span>

                  {!selectedId ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fdb73e] text-black">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  ) : null}
                </button>
              ) : null}

              {filteredBrands.length > 0 ? (
                <div role="listbox" aria-label="Available brands">
                  {filteredBrands.map((brand, index) => {
                    const selected = brand.id === selectedId;
                    const active = index === activeIndex;

                    return (
                      <button
                        key={brand.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => chooseBrand(brand)}
                        className={`mb-1 flex min-h-[46px] w-full items-center justify-between gap-4 rounded-[12px] px-3.5 text-left transition ${
                          selected
                            ? "bg-[#fff6df] text-[#7b5000]"
                            : active
                              ? "bg-black/[0.045] text-black"
                              : "text-black/72 hover:bg-black/[0.035] hover:text-black"
                        }`}
                      >
                        <span className="min-w-0 truncate text-[13px] font-semibold">
                          {brand.name}
                        </span>

                        {selected ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fdb73e] text-black shadow-[0_4px_12px_rgba(253,183,62,0.25)]">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
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
                    No matching brand
                  </p>

                  <p className="mt-1 text-[12px] leading-5 text-black/40">
                    You can create this brand without leaving the product.
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
              <div className="border-t border-black/[0.07] bg-[#fafafa] p-2.5">
                <button
                  type="button"
                  onClick={() => void createRequestedBrand()}
                  disabled={creating}
                  className="group flex min-h-[48px] w-full items-center justify-between gap-4 rounded-[13px] border border-[#e0a535]/55 bg-[#fffaf0] px-3.5 text-left transition hover:border-[#d29525] hover:bg-[#fff5dd] hover:shadow-[0_8px_24px_rgba(253,183,62,0.16)] disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fdb73e] text-black shadow-[0_5px_14px_rgba(253,183,62,0.25)]">
                      {creating ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" strokeWidth={2.2} />
                      )}
                    </span>

                    <span className="min-w-0">
                      <strong className="block truncate text-[12px] font-semibold text-[#1d1d1f]">
                        {creating ? "Creating brand..." : `Add “${cleanQuery}”`}
                      </strong>

                      <small className="mt-0.5 block text-[10px] font-medium text-black/38">
                        Create and select automatically
                      </small>
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
    <div className="relative mt-3 w-full">
      <input type="hidden" name={name} value={selectedId} />

      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setError("");
          setCreationMessage("");

          if (!open) {
            requestAnimationFrame(updatePosition);
          }
        }}
        className={`group relative flex min-h-[52px] w-full items-center justify-between gap-4 rounded-[13px] border px-4 text-left outline-none transition ${
          open
            ? "border-[#d59a2e]/70 bg-white shadow-[0_0_0_4px_rgba(253,183,62,0.09),0_6px_18px_rgba(0,0,0,0.045)]"
            : "border-black/10 bg-[#111111] text-white hover:border-white/25 hover:bg-[#151515]"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
              open
                ? "bg-[#fdb73e] text-black"
                : "bg-white/[0.07] text-white/55 group-hover:bg-white/[0.10] group-hover:text-white/75"
            }`}
          >
            <Search className="h-4 w-4" />
          </span>

          <span className="min-w-0">
            <small
              className={`block text-[9px] font-semibold uppercase tracking-[0.17em] transition ${
                open ? "text-black/38" : "text-white/28"
              }`}
            >
              Brand
            </small>

            <strong
              className={`mt-0.5 block truncate text-[13px] font-semibold ${
                open
                  ? "text-[#1d1d1f]"
                  : selectedBrand
                    ? "text-white"
                    : "text-white/50"
              }`}
            >
              {selectedBrand?.name ?? "Select brand"}
            </strong>
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 transition duration-200 ${
            open
              ? "rotate-180 text-[#9a6500]"
              : "text-white/38 group-hover:text-white/65"
          }`}
        />
      </button>

      {selectedBrand ? (
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-[10px] font-medium text-white/30">
            Selected brand
          </span>

          <button
            type="button"
            onClick={() => chooseBrand(null)}
            className="text-[10px] font-semibold text-[#d89b28] transition hover:text-[#fdb73e]"
          >
            Clear
          </button>
        </div>
      ) : null}

      {dropdown}
    </div>
  );
}
