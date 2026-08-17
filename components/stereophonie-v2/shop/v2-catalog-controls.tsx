"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
  Tags,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type SortOption = "newest" | "price-asc" | "price-desc";

type FilterModal = "category" | "brand" | "price" | null;

type PriceHandle = "minimum" | "maximum" | null;

type Props = {
  categories: string[];
  brands: string[];
  selectedCategory: string;
  selectedBrand: string;
  selectedAvailability: string;
  selectedSort: SortOption;
  selectedMinPrice: number | null;
  selectedMaxPrice: number | null;
  minimumAvailablePrice: number;
  maximumAvailablePrice: number;
  searchValue?: string;
};

const PRICE_GAP = 5;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function money(value: number) {
  return `$${Math.round(value)}`;
}

export default function V2CatalogControls({
  categories,
  brands,
  selectedCategory,
  selectedBrand,
  selectedAvailability,
  selectedSort,
  selectedMinPrice,
  selectedMaxPrice,
  minimumAvailablePrice,
  maximumAvailablePrice,
  searchValue = "",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchValue);

  const [stockOnly, setStockOnly] = useState(
    selectedAvailability === "in-stock",
  );

  const [sort, setSort] = useState<SortOption>(selectedSort);

  const [modal, setModal] = useState<FilterModal>(null);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const databaseMinimum = useMemo(
    () => Math.max(0, Math.floor(Number(minimumAvailablePrice) || 0)),
    [minimumAvailablePrice],
  );

  const databaseMaximum = useMemo(() => {
    const realMaximum = Math.ceil(Number(maximumAvailablePrice) || 0);

    return Math.max(realMaximum, databaseMinimum + PRICE_GAP);
  }, [maximumAvailablePrice, databaseMinimum]);

  const initialMinimum = clamp(
    selectedMinPrice ?? databaseMinimum,
    databaseMinimum,
    databaseMaximum - PRICE_GAP,
  );

  const initialMaximum = clamp(
    selectedMaxPrice ?? databaseMaximum,
    initialMinimum + PRICE_GAP,
    databaseMaximum,
  );

  const [minimum, setMinimum] = useState(initialMinimum);
  const [maximum, setMaximum] = useState(initialMaximum);

  const minimumRef = useRef(initialMinimum);
  const maximumRef = useRef(initialMaximum);

  const priceRailRef = useRef<HTMLDivElement | null>(null);

  const [activePriceHandle, setActivePriceHandle] = useState<PriceHandle>(null);

  useEffect(() => {
    setQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    setStockOnly(selectedAvailability === "in-stock");
  }, [selectedAvailability]);

  useEffect(() => {
    setSort(selectedSort);
  }, [selectedSort]);

  useEffect(() => {
    const nextMinimum = clamp(
      selectedMinPrice ?? databaseMinimum,
      databaseMinimum,
      databaseMaximum - PRICE_GAP,
    );

    const nextMaximum = clamp(
      selectedMaxPrice ?? databaseMaximum,
      nextMinimum + PRICE_GAP,
      databaseMaximum,
    );

    minimumRef.current = nextMinimum;
    maximumRef.current = nextMaximum;

    setMinimum(nextMinimum);
    setMaximum(nextMaximum);
  }, [selectedMinPrice, selectedMaxPrice, databaseMinimum, databaseMaximum]);

  useEffect(() => {
    if (!modal && !mobileFiltersOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (modal) {
        setModal(null);
      } else {
        setMobileFiltersOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modal, mobileFiltersOpen]);

  function navigate(updates: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(window.location.search);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    params.delete("page");

    const nextSearch = params.toString();

    startTransition(() => {
      router.push(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
        scroll: false,
      });
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    navigate({
      search: query.trim() || null,
    });
  }

  function chooseCategory(category: string) {
    navigate({
      category: category || null,
    });

    setModal(null);
  }

  function chooseBrand(brand: string) {
    navigate({
      brand: brand || null,
    });

    setModal(null);
  }

  function toggleStock() {
    const next = !stockOnly;

    setStockOnly(next);

    navigate({
      availability: next ? "in-stock" : null,
    });
  }

  function changeSort(nextSort: SortOption) {
    setSort(nextSort);

    navigate({
      sort: nextSort === "newest" ? null : nextSort,
    });
  }

  function clearAll() {
    setQuery("");
    setStockOnly(false);
    setSort("newest");

    minimumRef.current = databaseMinimum;
    maximumRef.current = databaseMaximum;

    setMinimum(databaseMinimum);
    setMaximum(databaseMaximum);

    setModal(null);
    setMobileFiltersOpen(false);

    startTransition(() => {
      router.push(pathname, {
        scroll: false,
      });
    });
  }

  function commitPrice() {
    const correctedMinimum = clamp(
      Math.round(minimumRef.current),
      databaseMinimum,
      databaseMaximum - PRICE_GAP,
    );

    const correctedMaximum = clamp(
      Math.round(maximumRef.current),
      correctedMinimum + PRICE_GAP,
      databaseMaximum,
    );

    minimumRef.current = correctedMinimum;
    maximumRef.current = correctedMaximum;

    setMinimum(correctedMinimum);
    setMaximum(correctedMaximum);

    navigate({
      minPrice:
        correctedMinimum > databaseMinimum ? String(correctedMinimum) : null,

      maxPrice:
        correctedMaximum < databaseMaximum ? String(correctedMaximum) : null,
    });
  }

  function setPriceFromPointer(
    handle: Exclude<PriceHandle, null>,
    clientX: number,
  ) {
    const rail = priceRailRef.current;

    if (!rail) {
      return;
    }

    const rect = rail.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

    const requested = Math.round(
      databaseMinimum + ratio * (databaseMaximum - databaseMinimum),
    );

    if (handle === "minimum") {
      const nextMinimum = clamp(
        requested,
        databaseMinimum,
        maximumRef.current - PRICE_GAP,
      );

      minimumRef.current = nextMinimum;
      setMinimum(nextMinimum);

      return;
    }

    const nextMaximum = clamp(
      requested,
      minimumRef.current + PRICE_GAP,
      databaseMaximum,
    );

    maximumRef.current = nextMaximum;
    setMaximum(nextMaximum);
  }

  function beginPriceDrag(
    handle: Exclude<PriceHandle, null>,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture?.(event.pointerId);

    setActivePriceHandle(handle);

    setPriceFromPointer(handle, event.clientX);
  }

  useEffect(() => {
    if (!activePriceHandle) {
      return;
    }

    const handle: Exclude<PriceHandle, null> = activePriceHandle;

    function move(event: PointerEvent) {
      event.preventDefault();
      setPriceFromPointer(handle, event.clientX);
    }

    function finish() {
      setActivePriceHandle(null);
      commitPrice();
    }

    window.addEventListener("pointermove", move, {
      passive: false,
    });

    window.addEventListener("pointerup", finish, {
      once: true,
    });

    window.addEventListener("pointercancel", finish, {
      once: true,
    });

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [activePriceHandle, databaseMinimum, databaseMaximum]);

  const totalRange = Math.max(PRICE_GAP, databaseMaximum - databaseMinimum);

  const minimumPercentage = ((minimum - databaseMinimum) / totalRange) * 100;

  const maximumPercentage = ((maximum - databaseMinimum) / totalRange) * 100;

  const priceIsActive = minimum > databaseMinimum || maximum < databaseMaximum;

  const activeFilterCount = [
    Boolean(selectedCategory),
    Boolean(selectedBrand),
    stockOnly,
    priceIsActive,
    sort !== "newest",
  ].filter(Boolean).length;

  function selectorRow({
    icon,
    label,
    value,
    onClick,
    active,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    onClick: () => void;
    active: boolean;
  }) {
    return (
      <button
        type="button"
        className={`st-filter-v10-selector ${active ? "is-active" : ""}`}
        onClick={onClick}
      >
        <span className="st-filter-v10-selector__icon">{icon}</span>

        <span className="st-filter-v10-selector__copy">
          <small>{label}</small>
          <strong>{value}</strong>
        </span>

        <ChevronRight />
      </button>
    );
  }

  function renderCompactFilterPanel() {
    return (
      <div className="st-filter-v10-panel">
        <div className="st-filter-v10-diagnostics">
          <div>
            <small>ACTIVE FILTERS</small>
            <strong>{String(activeFilterCount).padStart(2, "0")}</strong>
          </div>

          <span>
            <i />
            FILTER BUS ONLINE
          </span>
        </div>

        <section className="st-filter-v10-section">
          <span className="st-filter-v10-label">DISCOVER</span>

          <div className="st-filter-v10-selector-stack">
            {selectorRow({
              icon: <Tags />,
              label: "CATEGORY",
              value: selectedCategory || "ALL CATEGORIES",
              onClick: () => setModal("category"),
              active: Boolean(selectedCategory),
            })}

            {selectorRow({
              icon: <Tag />,
              label: "BRAND",
              value: selectedBrand || "ALL BRANDS",
              onClick: () => setModal("brand"),
              active: Boolean(selectedBrand),
            })}

            {selectorRow({
              icon: <SlidersHorizontal />,
              label: "PRICE RANGE",
              value: `${money(minimum)} — ${money(maximum)}`,
              onClick: () => setModal("price"),
              active: priceIsActive,
            })}
          </div>
        </section>

        <section className="st-filter-v10-section">
          <span className="st-filter-v10-label">AVAILABILITY</span>

          <button
            type="button"
            className={`st-filter-v10-stock ${stockOnly ? "is-active" : ""}`}
            aria-pressed={stockOnly}
            onClick={toggleStock}
          >
            <span className="st-filter-v10-stock__switch">
              <i />
            </span>

            <span>
              <small>INVENTORY FILTER</small>
              <strong>IN STOCK ONLY</strong>
            </span>

            <em>{stockOnly ? "ON" : "OFF"}</em>
          </button>
        </section>

        <section className="st-filter-v10-section">
          <span className="st-filter-v10-label">SORT PRODUCTS</span>

          <div className="st-filter-v10-sort">
            <select
              value={sort}
              onChange={(event) => changeSort(event.target.value as SortOption)}
            >
              <option value="newest">NEWEST FIRST</option>
              <option value="price-asc">PRICE / LOW TO HIGH</option>
              <option value="price-desc">PRICE / HIGH TO LOW</option>
            </select>

            <ChevronDown />
          </div>
        </section>

        <section className="st-filter-v10-reset-section">
          <button
            type="button"
            className="st-filter-v10-reset"
            onClick={clearAll}
          >
            <RotateCcw />

            <span>
              <small>SYSTEM COMMAND</small>
              <strong>RESET FILTERS</strong>
            </span>
          </button>
        </section>
      </div>
    );
  }

  function renderChoiceModal(
    title: string,
    eyebrow: string,
    options: string[],
    selected: string,
    allLabel: string,
    onSelect: (value: string) => void,
  ) {
    return (
      <div className="st-filter-v10-modal__body">
        <header className="st-filter-v10-modal__heading">
          <div>
            <small>{eyebrow}</small>
            <h2>{title}</h2>
          </div>

          <button
            type="button"
            onClick={() => setModal(null)}
            aria-label={`Close ${title}`}
          >
            <X />
          </button>
        </header>

        <div className="st-filter-v10-choice-list">
          <button
            type="button"
            className={!selected ? "is-active" : ""}
            onClick={() => onSelect("")}
          >
            <span>
              <small>00</small>
              <strong>{allLabel}</strong>
            </span>

            {!selected ? <Check /> : <ChevronRight />}
          </button>

          {options.map((option, index) => {
            const active = selected === option;

            return (
              <button
                key={option}
                type="button"
                className={active ? "is-active" : ""}
                onClick={() => onSelect(option)}
              >
                <span>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <strong>{option.toUpperCase()}</strong>
                </span>

                {active ? <Check /> : <ChevronRight />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderPriceModal() {
    return (
      <div className="st-filter-v10-modal__body">
        <header className="st-filter-v10-modal__heading">
          <div>
            <small>CATALOG / PRICE WINDOW</small>
            <h2>SELECT PRICE RANGE</h2>
          </div>

          <button
            type="button"
            onClick={() => setModal(null)}
            aria-label="Close price range"
          >
            <X />
          </button>
        </header>

        <div className="st-filter-v10-price">
          <div className="st-filter-v10-price__readout">
            <div>
              <small>MINIMUM</small>
              <strong>{money(minimum)}</strong>
            </div>

            <div>
              <small>CATALOG WINDOW</small>
              <span>
                {money(databaseMinimum)} — {money(databaseMaximum)}
              </span>
            </div>

            <div>
              <small>MAXIMUM</small>
              <strong>{money(maximum)}</strong>
            </div>
          </div>

          <div className="st-filter-v10-price__hardware">
            <div
              ref={priceRailRef}
              className="st-filter-v10-price__track"
              onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();

                const ratio = clamp(
                  (event.clientX - rect.left) / rect.width,
                  0,
                  1,
                );

                const requested =
                  databaseMinimum + ratio * (databaseMaximum - databaseMinimum);

                const minDistance = Math.abs(requested - minimum);
                const maxDistance = Math.abs(requested - maximum);

                const nextHandle =
                  minDistance <= maxDistance ? "minimum" : "maximum";

                setActivePriceHandle(nextHandle);

                setPriceFromPointer(nextHandle, event.clientX);
              }}
            >
              <div className="st-filter-v10-price__rail" />

              <div
                className="st-filter-v10-price__active"
                style={{
                  left: `${minimumPercentage}%`,
                  right: `${100 - maximumPercentage}%`,
                }}
              />

              <button
                type="button"
                className={`st-filter-v10-price__node st-filter-v10-price__node--minimum ${
                  activePriceHandle === "minimum" ? "is-active" : ""
                }`}
                aria-label="Minimum price"
                aria-valuemin={databaseMinimum}
                aria-valuemax={maximum - PRICE_GAP}
                aria-valuenow={minimum}
                style={{
                  left: `${minimumPercentage}%`,
                }}
                onPointerDown={(event) => beginPriceDrag("minimum", event)}
              >
                <span>MIN</span>
              </button>

              <button
                type="button"
                className={`st-filter-v10-price__node st-filter-v10-price__node--maximum ${
                  activePriceHandle === "maximum" ? "is-active" : ""
                }`}
                aria-label="Maximum price"
                aria-valuemin={minimum + PRICE_GAP}
                aria-valuemax={databaseMaximum}
                aria-valuenow={maximum}
                style={{
                  left: `${maximumPercentage}%`,
                }}
                onPointerDown={(event) => beginPriceDrag("maximum", event)}
              >
                <span>MAX</span>
              </button>
            </div>

            <div className="st-filter-v10-price__scale">
              <span>{money(databaseMinimum)}</span>

              <strong>MINIMUM SEPARATION / ${PRICE_GAP}</strong>

              <span>{money(databaseMaximum)}</span>
            </div>
          </div>

          <div className="st-filter-v10-price__actions">
            <button
              type="button"
              onClick={() => {
                minimumRef.current = databaseMinimum;
                maximumRef.current = databaseMaximum;

                setMinimum(databaseMinimum);
                setMaximum(databaseMaximum);

                navigate({
                  minPrice: null,
                  maxPrice: null,
                });
              }}
            >
              RESET RANGE
            </button>

            <button
              type="button"
              onClick={() => {
                commitPrice();
                setModal(null);
              }}
            >
              APPLY RANGE
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="st-v2-catalog-tools st-filter-v10-tools">
        <form className="st-v2-catalog-search" onSubmit={submitSearch}>
          <Search />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="SEARCH PRODUCTS, BRANDS, MODELS..."
          />

          <button type="submit">SEARCH</button>
        </form>

        <button
          type="button"
          className="st-filter-v10-mobile-trigger"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <SlidersHorizontal />
          FILTERS
          <span>{String(activeFilterCount).padStart(2, "0")}</span>
        </button>
      </div>

      <aside className="st-v2-catalog-sidebar st-filter-v10-sidebar">
        <div className="st-filter-v10-title">
          <div>
            <Filter />
            <strong>FILTER SYSTEM</strong>
          </div>

          <span>V10.0</span>
        </div>

        {renderCompactFilterPanel()}
      </aside>

      {mobileFiltersOpen ? (
        <div className="st-filter-v10-mobile">
          <button
            type="button"
            className="st-filter-v10-mobile__backdrop"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          />

          <div className="st-filter-v10-mobile__sheet">
            <header>
              <div>
                <SlidersHorizontal />
                <strong>FILTER SYSTEM / V10</strong>
              </div>

              <button type="button" onClick={() => setMobileFiltersOpen(false)}>
                <X />
              </button>
            </header>

            <div className="st-filter-v10-mobile__content">
              {renderCompactFilterPanel()}
            </div>
          </div>
        </div>
      ) : null}

      {modal ? (
        <div className="st-filter-v10-modal">
          <button
            type="button"
            className="st-filter-v10-modal__backdrop"
            onClick={() => setModal(null)}
            aria-label="Close filter selector"
          />

          <section
            className="st-filter-v10-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Catalog filter selector"
          >
            {modal === "category"
              ? renderChoiceModal(
                  "CHOOSE CATEGORY",
                  "CATALOG / CATEGORY",
                  categories,
                  selectedCategory,
                  "ALL CATEGORIES",
                  chooseCategory,
                )
              : null}

            {modal === "brand"
              ? renderChoiceModal(
                  "CHOOSE BRAND",
                  "CATALOG / BRAND",
                  brands,
                  selectedBrand,
                  "ALL BRANDS",
                  chooseBrand,
                )
              : null}

            {modal === "price" ? renderPriceModal() : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
