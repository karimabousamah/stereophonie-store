"use client";

import {
  Check,
  ChevronDown,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

type MerchandiseFilter = "" | "new" | "featured" | "trending";

type AvailabilityFilter = "" | "in-stock";

type SortOption = "newest" | "price-asc" | "price-desc";

type CollectionOption = {
  id: string;
  name: string;
  slug: string;
};

type ShopFilterBarProps = {
  categories: string[];
  collections: CollectionOption[];
  productCount: number;
  selectedFilter: MerchandiseFilter;
  selectedCategory: string;
  selectedCollection: string;
  selectedAvailability: AvailabilityFilter;
  sizes: string[];
  selectedSize: string;
  selectedMinPrice: number | null;
  selectedMaxPrice: number | null;
  maximumAvailablePrice: number;
  selectedSort: SortOption;
};

const merchandiseFilters: {
  label: string;
  value: MerchandiseFilter;
}[] = [
  {
    label: "All",
    value: "",
  },
  {
    label: "New arrivals",
    value: "new",
  },
  {
    label: "Featured",
    value: "featured",
  },
  {
    label: "Trending",
    value: "trending",
  },
];

const sortOptions: {
  label: string;
  value: SortOption;
}[] = [
  {
    label: "Newest first",
    value: "newest",
  },
  {
    label: "Price: low to high",
    value: "price-asc",
  },
  {
    label: "Price: high to low",
    value: "price-desc",
  },
];

function filterButtonClass(active: boolean) {
  return active
    ? "border-black bg-black text-white"
    : "border-black/10 bg-white text-black/45 hover:border-black hover:text-black";
}

type PriceRangeSliderProps = {
  minimum: number;
  maximum: number;
  maximumAvailablePrice: number;
  disabled?: boolean;
  onMinimumChange: (value: number) => void;
  onMaximumChange: (value: number) => void;
  onCommit?: (minimum: number, maximum: number) => void;
};

type ActivePriceHandle = "minimum" | "maximum" | null;

function PriceRangeSlider({
  minimum,
  maximum,
  maximumAvailablePrice,
  disabled = false,
  onMinimumChange,
  onMaximumChange,
  onCommit,
}: PriceRangeSliderProps) {
  const minimumGap = 5;

  const trackRef = useRef<HTMLDivElement | null>(null);

  const correctionKeyRef = useRef("");

  const [activeHandle, setActiveHandle] = useState<ActivePriceHandle>(null);

  const absoluteMaximum = Math.max(
    minimumGap,
    Math.round(maximumAvailablePrice),
  );

  /*
   * These values are always valid.
   *
   * Examples with a $60 maximum:
   * 60–60 becomes 55–60
   * 59–60 becomes 55–60
   * 56–60 becomes 55–60
   */
  const safeMaximum = Math.min(
    absoluteMaximum,
    Math.max(minimumGap, Math.round(maximum)),
  );

  const safeMinimum = Math.min(
    Math.max(0, Math.round(minimum)),
    safeMaximum - minimumGap,
  );

  const correctedMaximum = Math.max(safeMaximum, safeMinimum + minimumGap);

  const minimumPercentage = (safeMinimum / absoluteMaximum) * 100;

  const maximumPercentage = (correctedMaximum / absoluteMaximum) * 100;

  /*
   * Repair invalid values coming from
   * old state or an old shop URL.
   */
  useEffect(() => {
    const rawMinimum = Math.round(minimum);

    const rawMaximum = Math.round(maximum);

    if (rawMinimum === safeMinimum && rawMaximum === correctedMaximum) {
      correctionKeyRef.current = "";
      return;
    }

    const correctionKey = `${rawMinimum}:${rawMaximum}->${safeMinimum}:${correctedMaximum}`;

    if (correctionKeyRef.current === correctionKey) {
      return;
    }

    correctionKeyRef.current = correctionKey;

    onMinimumChange(safeMinimum);
    onMaximumChange(correctedMaximum);

    onCommit?.(safeMinimum, correctedMaximum);
  }, [
    minimum,
    maximum,
    safeMinimum,
    correctedMaximum,
    onMinimumChange,
    onMaximumChange,
    onCommit,
  ]);

  function clamp(value: number, minimumValue: number, maximumValue: number) {
    return Math.min(Math.max(value, minimumValue), maximumValue);
  }

  function getValueFromPointer(clientX: number) {
    const track = trackRef.current;

    if (!track) {
      return 0;
    }

    const rectangle = track.getBoundingClientRect();

    if (rectangle.width <= 0) {
      return 0;
    }

    const percentage = clamp(
      (clientX - rectangle.left) / rectangle.width,
      0,
      1,
    );

    return Math.round(percentage * absoluteMaximum);
  }

  function updateMinimum(requestedValue: number) {
    const nextMinimum = clamp(
      Math.round(requestedValue),
      0,
      correctedMaximum - minimumGap,
    );

    onMinimumChange(nextMinimum);

    return nextMinimum;
  }

  function updateMaximum(requestedValue: number) {
    const nextMaximum = clamp(
      Math.round(requestedValue),
      safeMinimum + minimumGap,
      absoluteMaximum,
    );

    onMaximumChange(nextMaximum);

    return nextMaximum;
  }

  function finishInteraction() {
    setActiveHandle(null);

    onCommit?.(safeMinimum, correctedMaximum);
  }

  useEffect(() => {
    if (!activeHandle) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();

      const requestedValue = getValueFromPointer(event.clientX);

      if (activeHandle === "minimum") {
        updateMinimum(requestedValue);
      } else {
        updateMaximum(requestedValue);
      }
    }

    function handlePointerUp() {
      finishInteraction();
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });

    window.addEventListener("pointerup", handlePointerUp);

    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", handlePointerUp);

      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [activeHandle, safeMinimum, correctedMaximum, absoluteMaximum]);

  function handleTrackPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    event.preventDefault();

    const requestedValue = getValueFromPointer(event.clientX);

    const minimumDistance = Math.abs(requestedValue - safeMinimum);

    const maximumDistance = Math.abs(requestedValue - correctedMaximum);

    if (minimumDistance <= maximumDistance) {
      setActiveHandle("minimum");

      updateMinimum(requestedValue);
    } else {
      setActiveHandle("maximum");

      updateMaximum(requestedValue);
    }
  }

  function handleMinimumKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    let nextValue: number | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextValue = safeMinimum - 1;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextValue = safeMinimum + 1;
    }

    if (event.key === "Home") {
      nextValue = 0;
    }

    if (event.key === "End") {
      nextValue = correctedMaximum - minimumGap;
    }

    if (nextValue === null) {
      return;
    }

    event.preventDefault();

    const correctedValue = updateMinimum(nextValue);

    onCommit?.(correctedValue, correctedMaximum);
  }

  function handleMaximumKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    let nextValue: number | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextValue = correctedMaximum - 1;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextValue = correctedMaximum + 1;
    }

    if (event.key === "Home") {
      nextValue = safeMinimum + minimumGap;
    }

    if (event.key === "End") {
      nextValue = absoluteMaximum;
    }

    if (nextValue === null) {
      return;
    }

    event.preventDefault();

    const correctedValue = updateMaximum(nextValue);

    onCommit?.(safeMinimum, correctedValue);
  }

  return (
    <div>
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className={`relative h-10 touch-none ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        {/* Complete price line */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-black/15" />

        {/* Active selected line */}
        <div
          className="pointer-events-none absolute top-1/2 h-[3px] -translate-y-1/2 bg-black"
          style={{
            left: `${minimumPercentage}%`,
            right: `${100 - maximumPercentage}%`,
          }}
        />

        {/* Minimum white circle */}
        <button
          type="button"
          role="slider"
          aria-label="Minimum price"
          aria-valuemin={0}
          aria-valuemax={correctedMaximum - minimumGap}
          aria-valuenow={safeMinimum}
          disabled={disabled}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();

            setActiveHandle("minimum");
          }}
          onKeyDown={handleMinimumKeyDown}
          className="absolute top-1/2 z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border border-black/25 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.08)] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 active:scale-110 disabled:pointer-events-none"
          style={{
            left: `${minimumPercentage}%`,
          }}
        />

        {/* Maximum white circle */}
        <button
          type="button"
          role="slider"
          aria-label="Maximum price"
          aria-valuemin={safeMinimum + minimumGap}
          aria-valuemax={absoluteMaximum}
          aria-valuenow={correctedMaximum}
          disabled={disabled}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();

            setActiveHandle("maximum");
          }}
          onKeyDown={handleMaximumKeyDown}
          className="absolute top-1/2 z-40 h-5 w-5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border border-black/25 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.08)] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 active:scale-110 disabled:pointer-events-none"
          style={{
            left: `${maximumPercentage}%`,
          }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold tracking-[0.05em] text-black/55">
        <span>${safeMinimum}</span>

        <span className="text-black/25">Price range</span>

        <span>${correctedMaximum}</span>
      </div>
    </div>
  );
}

export default function ShopFilterBar({
  categories,
  collections,
  productCount,
  selectedFilter,
  selectedCategory,
  selectedCollection,
  selectedAvailability,
  sizes,
  selectedSize,
  selectedMinPrice,
  selectedMaxPrice,
  maximumAvailablePrice,
  selectedSort,
}: ShopFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [isPending, startTransition] = useTransition();

  const [draftFilter, setDraftFilter] =
    useState<MerchandiseFilter>(selectedFilter);

  const [draftCategory, setDraftCategory] = useState(selectedCategory);

  const [draftCollection, setDraftCollection] = useState(selectedCollection);

  const [draftAvailability, setDraftAvailability] =
    useState<AvailabilityFilter>(selectedAvailability);

  const [draftSize, setDraftSize] = useState(selectedSize);

  const [draftMinPrice, setDraftMinPrice] = useState(
    selectedMinPrice === null ? "" : String(selectedMinPrice),
  );

  const [draftMaxPrice, setDraftMaxPrice] = useState(
    String(selectedMaxPrice ?? maximumAvailablePrice),
  );

  const [desktopMinimumPrice, setDesktopMinimumPrice] = useState(
    selectedMinPrice ?? 0,
  );

  const [desktopMaximumPrice, setDesktopMaximumPrice] = useState(
    selectedMaxPrice ?? maximumAvailablePrice,
  );

  const [draftSort, setDraftSort] = useState<SortOption>(selectedSort);

  useEffect(() => {
    setDesktopMinimumPrice(selectedMinPrice ?? 0);

    setDesktopMaximumPrice(selectedMaxPrice ?? maximumAvailablePrice);
  }, [selectedMinPrice, selectedMaxPrice, maximumAvailablePrice]);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;

    const scrollPosition = window.scrollY;

    const previousBodyPosition = body.style.position;

    const previousBodyTop = body.style.top;

    const previousBodyWidth = body.style.width;

    const previousBodyOverflow = body.style.overflow;

    const previousHtmlOverflow = html.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollPosition}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    html.style.overflow = "hidden";

    return () => {
      body.style.position = previousBodyPosition;

      body.style.top = previousBodyTop;

      body.style.width = previousBodyWidth;

      body.style.overflow = previousBodyOverflow;

      html.style.overflow = previousHtmlOverflow;

      window.scrollTo(0, scrollPosition);
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return;
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileFiltersOpen(false);
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [mobileFiltersOpen]);

  function updateFilters(
    values: {
      filter?: MerchandiseFilter;
      category?: string;
      collection?: string;
      availability?: AvailabilityFilter;
      size?: string;
      minPrice?: string;
      maxPrice?: string;
      sort?: SortOption;
    },
    closeMobilePanel = false,
  ) {
    const parameters = new URLSearchParams(window.location.search);

    if (values.filter !== undefined) {
      if (values.filter) {
        parameters.set("filter", values.filter);
      } else {
        parameters.delete("filter");
      }
    }

    if (values.category !== undefined) {
      if (values.category) {
        parameters.set("category", values.category);
      } else {
        parameters.delete("category");
      }
    }

    if (values.collection !== undefined) {
      if (values.collection) {
        parameters.set("collection", values.collection);
      } else {
        parameters.delete("collection");
      }
    }

    if (values.availability !== undefined) {
      if (values.availability) {
        parameters.set("availability", values.availability);
      } else {
        parameters.delete("availability");
      }
    }

    if (values.size !== undefined) {
      if (values.size) {
        parameters.set("size", values.size);
      } else {
        parameters.delete("size");
      }
    }

    if (values.minPrice !== undefined) {
      const minimumPrice = values.minPrice.trim();

      if (minimumPrice) {
        parameters.set("minPrice", minimumPrice);
      } else {
        parameters.delete("minPrice");
      }
    }

    if (values.maxPrice !== undefined) {
      const maximumPrice = values.maxPrice.trim();

      if (maximumPrice) {
        parameters.set("maxPrice", maximumPrice);
      } else {
        parameters.delete("maxPrice");
      }
    }

    if (values.sort !== undefined) {
      if (values.sort && values.sort !== "newest") {
        parameters.set("sort", values.sort);
      } else {
        parameters.delete("sort");
      }
    }

    parameters.delete("page");

    const queryString = parameters.toString();

    const destination = queryString ? `${pathname}?${queryString}` : pathname;

    if (closeMobilePanel) {
      setMobileFiltersOpen(false);
    }

    startTransition(() => {
      router.push(destination, {
        scroll: false,
      });
    });
  }

  function clearFilters() {
    setDraftFilter("");
    setDraftCategory("");
    setDraftCollection("");
    setDraftAvailability("");
    setDraftSize("");
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setDraftSort("newest");

    startTransition(() => {
      router.push(pathname, {
        scroll: false,
      });
    });

    setMobileFiltersOpen(false);
  }

  function openMobileFilters() {
    setDraftFilter(selectedFilter);

    setDraftCategory(selectedCategory);

    setDraftCollection(selectedCollection);

    setDraftAvailability(selectedAvailability);

    setDraftSize(selectedSize);

    setDraftMinPrice(selectedMinPrice === null ? "" : String(selectedMinPrice));

    setDraftMaxPrice(String(selectedMaxPrice ?? maximumAvailablePrice));

    setDraftSort(selectedSort);

    setMobileFiltersOpen(true);
  }

  function applyMobileFilters() {
    updateFilters(
      {
        filter: draftFilter,
        category: draftCategory,
        collection: draftCollection,
        availability: draftAvailability,
        size: draftSize,
        minPrice: Number(draftMinPrice) > 0 ? draftMinPrice : "",
        maxPrice:
          Number(draftMaxPrice) < maximumAvailablePrice ? draftMaxPrice : "",
        sort: draftSort,
      },
      true,
    );
  }

  const activeFilterCount = [
    Boolean(selectedFilter),
    Boolean(selectedCategory),
    Boolean(selectedCollection),
    Boolean(selectedAvailability),
    Boolean(selectedSize),
    selectedMinPrice !== null,
    selectedMaxPrice !== null,
    selectedSort !== "newest",
  ].filter(Boolean).length;

  const mobilePanel = (
    <div
      className={`fixed inset-0 z-[2147483006] md:hidden ${
        mobileFiltersOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Close shop filters"
        onClick={() => setMobileFiltersOpen(false)}
        className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          mobileFiltersOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Shop filters"
        className={`fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-25px_80px_rgba(0,0,0,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileFiltersOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <header className="flex min-h-[78px] shrink-0 items-center justify-between border-b border-black/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-black/10">
              <SlidersHorizontal className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
                Refine collection
              </p>

              <h2 className="mt-1 text-base font-semibold">
                Filters & sorting
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
            className="flex h-11 w-11 items-center justify-center border border-black/10 transition hover:border-black hover:bg-black hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
          <section>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Collection
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {merchandiseFilters.map((filter) => {
                const active = draftFilter === filter.value;

                return (
                  <button
                    key={filter.value || "all"}
                    type="button"
                    onClick={() => setDraftFilter(filter.value)}
                    className={`flex min-h-[52px] items-center justify-between border px-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] transition ${filterButtonClass(
                      active,
                    )}`}
                  >
                    {filter.label}

                    {active ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-8 border-t border-black/10 pt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Collection
            </p>

            <div className="relative mt-4">
              <select
                value={draftCollection}
                onChange={(event) => setDraftCollection(event.target.value)}
                className="h-14 w-full appearance-none border border-black/15 bg-white px-4 pr-12 text-sm font-medium outline-none transition focus:border-black"
              >
                <option value="">All collections</option>

                {collections.map((collection) => (
                  <option key={collection.id} value={collection.slug}>
                    {collection.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            </div>
          </section>

          <section className="mt-8 border-t border-black/10 pt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Category
            </p>

            <div className="relative mt-4">
              <select
                value={draftCategory}
                onChange={(event) => setDraftCategory(event.target.value)}
                className="h-14 w-full appearance-none border border-black/15 bg-white px-4 pr-12 text-sm font-medium outline-none transition focus:border-black"
              >
                <option value="">All categories</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            </div>
          </section>

          {/* Mobile storefront size filter */}
          <section className="mt-8 border-t border-black/10 pt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Size
            </p>

            {sizes.length > 0 ? (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {sizes.map((size) => {
                  const active = draftSize === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setDraftSize(active ? "" : size)}
                      className={`flex min-h-[48px] items-center justify-center border px-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] transition ${filterButtonClass(
                        active,
                      )}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-black/40">
                No sizes are currently available.
              </p>
            )}
          </section>

          {/* Mobile storefront price filter */}
          <section className="mt-8 border-t border-black/10 pt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Price
            </p>

            <div className="mt-5">
              <PriceRangeSlider
                minimum={Number(draftMinPrice || 0)}
                maximum={Number(draftMaxPrice || maximumAvailablePrice)}
                maximumAvailablePrice={maximumAvailablePrice}
                onMinimumChange={(value) => setDraftMinPrice(String(value))}
                onMaximumChange={(value) => setDraftMaxPrice(String(value))}
              />
            </div>
          </section>

          <section className="mt-8 border-t border-black/10 pt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Availability
            </p>

            <button
              type="button"
              onClick={() =>
                setDraftAvailability(
                  draftAvailability === "in-stock" ? "" : "in-stock",
                )
              }
              className={`mt-4 flex min-h-[58px] w-full items-center justify-between border px-4 text-sm font-semibold transition ${filterButtonClass(
                draftAvailability === "in-stock",
              )}`}
            >
              Show in-stock products only
              <span
                className={`flex h-5 w-5 items-center justify-center border ${
                  draftAvailability === "in-stock"
                    ? "border-white bg-white text-black"
                    : "border-black/20 bg-white"
                }`}
              >
                {draftAvailability === "in-stock" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
              </span>
            </button>
          </section>

          <section className="mt-8 border-t border-black/10 pt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Sort products
            </p>

            <div className="relative mt-4">
              <select
                value={draftSort}
                onChange={(event) =>
                  setDraftSort(event.target.value as SortOption)
                }
                className="h-14 w-full appearance-none border border-black/15 bg-white px-4 pr-12 text-sm font-medium outline-none transition focus:border-black"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            </div>
          </section>
        </div>

        <footer className="shrink-0 border-t border-black/10 bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <button
              type="button"
              onClick={clearFilters}
              disabled={isPending}
              className="flex min-h-[54px] items-center justify-center gap-2 border border-black/15 px-5 text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:border-black disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>

            <button
              type="button"
              onClick={applyMobileFilters}
              disabled={isPending}
              className="min-h-[54px] border border-black bg-black px-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#242424] disabled:opacity-50"
            >
              {isPending
                ? "Applying..."
                : `Show ${productCount} ${
                    productCount === 1 ? "product" : "products"
                  }`}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );

  return (
    <>
      {/* Mobile filter toolbar */}
      <section className="border-b border-black/10 bg-white md:hidden">
        <div className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/35">
                Collection
              </p>

              <p className="mt-1 text-sm font-semibold">
                {productCount} {productCount === 1 ? "product" : "products"}
              </p>
            </div>

            <button
              type="button"
              onClick={openMobileFilters}
              className="relative flex min-h-[48px] items-center gap-3 border border-black px-5 text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:bg-black hover:text-white"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[9px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </section>

      {/* Desktop left filter sidebar */}
      <aside className="hidden border-r border-black/10 py-16 pr-8 md:block">
        <div className="sticky top-24">
          <div className="flex items-center justify-between border-b border-black/10 pb-5">
            <div>
              <p className="text-2xl font-semibold uppercase tracking-[-0.03em]">
                Filter
              </p>

              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">
                {productCount} {productCount === 1 ? "product" : "products"}
              </p>
            </div>

            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                disabled={isPending}
                className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/40 transition hover:text-black disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : null}
          </div>

          <section className="border-b border-black/10 py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              Products
            </p>

            <div className="mt-4 space-y-1">
              {merchandiseFilters.map((filter) => {
                const active = selectedFilter === filter.value;

                return (
                  <button
                    key={filter.value || "all"}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      updateFilters({
                        filter: filter.value,
                      })
                    }
                    className={`flex min-h-10 w-full items-center justify-between px-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
                      active
                        ? "bg-black text-white"
                        : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                    }`}
                  >
                    {filter.label}

                    {active ? <Check className="h-3.5 w-3.5" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-b border-black/10 py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              Price
            </p>

            <div className="mt-5">
              <PriceRangeSlider
                minimum={desktopMinimumPrice}
                maximum={desktopMaximumPrice}
                maximumAvailablePrice={maximumAvailablePrice}
                disabled={isPending}
                onMinimumChange={setDesktopMinimumPrice}
                onMaximumChange={setDesktopMaximumPrice}
                onCommit={() =>
                  updateFilters({
                    minPrice:
                      desktopMinimumPrice > 0
                        ? String(desktopMinimumPrice)
                        : "",
                    maxPrice:
                      desktopMaximumPrice < maximumAvailablePrice
                        ? String(desktopMaximumPrice)
                        : "",
                  })
                }
              />
            </div>
          </section>

          <section className="border-b border-black/10 py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              Categories
            </p>

            <div className="mt-4 space-y-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  updateFilters({
                    category: "",
                  })
                }
                className={`flex min-h-9 w-full items-center justify-between px-3 text-left text-[11px] font-medium transition ${
                  !selectedCategory
                    ? "bg-black text-white"
                    : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                }`}
              >
                All categories
                {!selectedCategory ? <Check className="h-3.5 w-3.5" /> : null}
              </button>

              {categories.map((category) => {
                const active = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      updateFilters({
                        category: active ? "" : category,
                      })
                    }
                    className={`flex min-h-9 w-full items-center justify-between px-3 text-left text-[11px] font-medium transition ${
                      active
                        ? "bg-black text-white"
                        : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                    }`}
                  >
                    {category}

                    {active ? <Check className="h-3.5 w-3.5" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          {collections.length > 0 ? (
            <section className="border-b border-black/10 py-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                Collections
              </p>

              <div className="mt-4 space-y-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    updateFilters({
                      collection: "",
                    })
                  }
                  className={`flex min-h-9 w-full items-center justify-between px-3 text-left text-[11px] font-medium transition ${
                    !selectedCollection
                      ? "bg-black text-white"
                      : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                  }`}
                >
                  All collections
                  {!selectedCollection ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                </button>

                {collections.map((collection) => {
                  const active = selectedCollection === collection.slug;

                  return (
                    <button
                      key={collection.id}
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        updateFilters({
                          collection: active ? "" : collection.slug,
                        })
                      }
                      className={`flex min-h-9 w-full items-center justify-between px-3 text-left text-[11px] font-medium transition ${
                        active
                          ? "bg-black text-white"
                          : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                      }`}
                    >
                      {collection.name}

                      {active ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {sizes.length > 0 ? (
            <section className="border-b border-black/10 py-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                Size
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {sizes.map((size) => {
                  const active = selectedSize === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        updateFilters({
                          size: active ? "" : size,
                        })
                      }
                      className={`min-h-10 border px-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${filterButtonClass(
                        active,
                      )}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="border-b border-black/10 py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              Availability
            </p>

            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                updateFilters({
                  availability:
                    selectedAvailability === "in-stock" ? "" : "in-stock",
                })
              }
              className="mt-4 flex min-h-11 w-full items-center justify-between text-left text-[11px] font-medium text-black/60 transition hover:text-black disabled:opacity-50"
            >
              In stock only
              <span
                className={`flex h-5 w-5 items-center justify-center border ${
                  selectedAvailability === "in-stock"
                    ? "border-black bg-black text-white"
                    : "border-black/20 bg-white"
                }`}
              >
                {selectedAvailability === "in-stock" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
              </span>
            </button>
          </section>

          <section className="py-7">
            <label>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                Sort products
              </span>

              <div className="relative mt-4">
                <select
                  value={selectedSort}
                  disabled={isPending}
                  onChange={(event) =>
                    updateFilters({
                      sort: event.target.value as SortOption,
                    })
                  }
                  className="h-12 w-full appearance-none border border-black/15 bg-white px-4 pr-10 text-[10px] font-semibold uppercase tracking-[0.1em] outline-none transition hover:border-black focus:border-black disabled:opacity-50"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              </div>
            </label>
          </section>
        </div>
      </aside>

      {mounted ? createPortal(mobilePanel, document.body) : null}
    </>
  );
}
