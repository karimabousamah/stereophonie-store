"use client";

import { Camera, Search, X } from "lucide-react";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import dynamic from "next/dynamic";

import {
  primeBarcodeScannerAudio,
} from "@/components/admin/products/product-barcode-scanner-audio";

import {
  consumeProductDirectoryReturnState,
  rememberProductDirectoryReturnState,
  type ProductDirectoryStatusFilter as ProductStatusFilter,
} from "@/components/admin/products/product-directory-return-state";

const ProductBarcodeScanner =
  dynamic(
    () =>
      import(
        "@/components/admin/products/product-barcode-scanner"
      ),
    {
      /*
       * Camera scanning is optional Product-directory UI.
       * Keep the large decoder/tracking implementation out of the
       * initial Products bundle and load it only when requested.
       */
      ssr: false,
    },
  );

type ProductIssueFilter =
  | "missing_category"
  | "missing_brand"
  | "missing_photographs"
  | "old_drafts"
  | null;

const PRODUCT_ISSUE_LABELS: Record<
  Exclude<ProductIssueFilter, null>,
  string
> = {
  missing_category: "Missing category",
  missing_brand: "Missing brand",
  missing_photographs: "Missing photographs",
  old_drafts: "Old drafts",
};

type Props = {
  total: number;
  liveTotal: number;
  draftTotal: number;
  comingSoonTotal: number;
  askForPriceTotal: number;
  outOfStockTotal: number;
  archivedTotal: number;
  initialFilter?: ProductStatusFilter;
  initialIssueFilter?: ProductIssueFilter;
};

export default function ProductSearch({
  total,
  liveTotal,
  draftTotal,
  comingSoonTotal,
  askForPriceTotal,
  outOfStockTotal,
  initialFilter = "all",
  initialIssueFilter = null,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>(initialFilter);
  const [issueFilter, setIssueFilter] =
    useState<ProductIssueFilter>(initialIssueFilter);

  const [visibleCount, setVisibleCount] = useState(total);

  const [pendingRestoreScrollY, setPendingRestoreScrollY] =
    useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scannerButtonRef = useRef<HTMLButtonElement>(null);
  const directoryRef = useRef<HTMLElement>(null);

  const [isSticky, setIsSticky] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);

  const returnStateConsumedRef = useRef(false);

  const normalizedQuery = useMemo(
    () => query.trim().toLocaleLowerCase(),
    [query],
  );

  /*
   * Restore the previous Products-directory state before
   * the browser paints the returned page.
   */
  useLayoutEffect(() => {
    if (returnStateConsumedRef.current) {
      return;
    }

    returnStateConsumedRef.current = true;

    if (initialIssueFilter) {
      return;
    }

    const snapshot =
      consumeProductDirectoryReturnState();

    if (!snapshot) {
      return;
    }

    setQuery(snapshot.query);
    setStatus(snapshot.status);
    setPendingRestoreScrollY(
      snapshot.scrollY,
    );
  }, [initialIssueFilter]);

  /*
   * ST_ADMIN_PRODUCTS_STICKY_CORNER_STATE_V1
   *
   * Keep the Products navigator rounded in its natural position,
   * but make its top corners square only while position: sticky
   * is actually engaged beneath the Admin header.
   *
   * Read the element's computed CSS top so desktop (64px) and
   * mobile (56px) stay aligned with the existing sticky rules.
   */
  useEffect(() => {
    const element = directoryRef.current;

    if (!element) {
      return;
    }

    let animationFrame = 0;

    const updateStickyState = () => {
      cancelAnimationFrame(animationFrame);

      animationFrame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const computedTop = Number.parseFloat(
          window.getComputedStyle(element).top,
        );

        const nextSticky =
          Number.isFinite(computedTop) &&
          rect.top <= computedTop + 0.5;

        setIsSticky((current) =>
          current === nextSticky ? current : nextSticky,
        );
      });
    };

    updateStickyState();

    window.addEventListener("scroll", updateStickyState, {
      passive: true,
    });
    window.addEventListener("resize", updateStickyState);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateStickyState);
      window.removeEventListener("resize", updateStickyState);
    };
  }, []);

  /*
   * The product rows are rendered by the server page, outside
   * this toolbar component. Listen at document level so clicking
   * the real product Edit link captures the exact directory state.
   */
  useEffect(() => {
    function handleProductNavigation(
      event: MouseEvent,
    ) {
      if (
        event.button !== 0 ||
        event.defaultPrevented
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link =
        target.closest<HTMLAnchorElement>(
          "a.st-admin-products-directory__edit-link",
        );

      if (!link) {
        return;
      }

      const destination =
        new URL(
          link.href,
          window.location.origin,
        );

      if (
        !/^\/admin\/products\/[^/]+\/?$/.test(
          destination.pathname,
        )
      ) {
        return;
      }

      rememberProductDirectoryReturnState({
        query,
        status,
        scrollY: window.scrollY,
        productPath:
          destination.pathname,
      });
    }

    document.addEventListener(
      "click",
      handleProductNavigation,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        handleProductNavigation,
        true,
      );
    };
  }, [query, status]);

  useLayoutEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-admin-product-search-card="true"]',
      ),
    );

    let visible = 0;

    cards.forEach((card) => {
      const searchable =
        card.dataset.adminProductSearch?.toLocaleLowerCase() ?? "";

      const productStatus = card.dataset.adminProductStatus ?? "";
      const productAvailability = card.dataset.adminProductAvailability ?? "";

      const matchesQuery =
        !normalizedQuery || searchable.includes(normalizedQuery);

      const productOutOfStock = card.dataset.adminProductOutOfStock === "true";

      const matchesStatus =
        status === "all" ||
        (status === "coming_soon"
          ? productAvailability === "coming_soon"
          : status === "ask_for_price"
            ? productAvailability === "ask_for_price"
            : status === "out_of_stock"
              ? productOutOfStock
              : productStatus === status);

      const productIssues =
        (card.dataset.adminProductIssues ?? "")
          .split(" ")
          .filter(Boolean);

      const matchesIssue =
        issueFilter === null ||
        productIssues.includes(issueFilter);

      const matches =
        matchesQuery &&
        matchesStatus &&
        matchesIssue;

      card.hidden = !matches;

      if (matches) {
        visible += 1;
      }
    });

    setVisibleCount(visible);

    if (pendingRestoreScrollY !== null) {
      const targetScrollY =
        pendingRestoreScrollY;

      /*
       * Row visibility has already been updated synchronously,
       * so restore against the same filtered layout the admin left.
       */
      window.scrollTo({
        top: targetScrollY,
        left: 0,
        behavior: "auto",
      });

      /*
       * One extra frame protects against late browser layout
       * reconciliation without producing smooth scrolling.
       */
      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: targetScrollY,
          left: 0,
          behavior: "auto",
        });
      });

      setPendingRestoreScrollY(null);
    }
  }, [
    normalizedQuery,
    status,
    issueFilter,
    pendingRestoreScrollY,
  ]);

  const closeBarcodeScanner = useCallback(() => {
    setScannerOpen(false);

    requestAnimationFrame(() => {
      scannerButtonRef.current?.focus();
    });
  }, []);

  const handleBarcodeDetected = useCallback((barcode: string) => {
    const cleanBarcode = barcode.trim();

    if (!cleanBarcode) {
      return;
    }

    /*
     * A camera scan should locate the product regardless of which
     * directory status filter happened to be active beforehand.
     *
     * The decoded value still flows through the exact same search
     * state used by typing and USB/Bluetooth barcode readers.
     */
    setIssueFilter(null);
    setStatus("all");
    removeIssueQueryFromUrl();
    setQuery(cleanBarcode);
    setScannerOpen(false);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  function clearSearch() {
    setQuery("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function removeIssueQueryFromUrl() {
    const url = new URL(window.location.href);

    url.searchParams.delete("issue");

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  function clearIssueFilter() {
    setIssueFilter(null);
    removeIssueQueryFromUrl();
  }

  function selectStatus(nextStatus: ProductStatusFilter) {
    setIssueFilter(null);
    setStatus(nextStatus);
    removeIssueQueryFromUrl();
  }

  return (
    <section
      ref={directoryRef}
      className="st-admin-directory-search st-admin-product-directory-v2"
      aria-label="Product directory"
      data-product-filter={status}
      data-sticky={isSticky ? "true" : "false"}
    >
      <div className="st-admin-product-directory-v2__toolbar">
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, barcode, SKU, category or brand"
            aria-label="Search products by name, barcode, SKU, category or brand"
            autoComplete="off"
            spellCheck={false}
          />

          <button
            ref={scannerButtonRef}
            type="button"
            className="st-admin-product-barcode-trigger"
            onClick={() => {
              primeBarcodeScannerAudio();
              setScannerOpen(true);
            }}
            aria-label="Scan product barcode with camera"
            aria-haspopup="dialog"
            title="Scan barcode"
          >
            <Camera aria-hidden="true" />
          </button>

          {query ? (
            <>
              <span
                className="st-admin-product-search-separator"
                aria-hidden="true"
              />

              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear product search"
              >
                <X />
              </button>
            </>
          ) : null}
        </label>

        <div
          className="st-admin-product-directory-v2__filters"
          aria-label="Filter products"
        >
          <button
            type="button"
            className={status === "all" ? "is-active" : ""}
            onClick={() => selectStatus("all")}
          >
            <span>All</span>
            <strong>{total}</strong>
          </button>

          <button
            type="button"
            className={status === "published" ? "is-active" : ""}
            onClick={() => selectStatus("published")}
          >
            <span>Live</span>
            <strong>{liveTotal}</strong>
          </button>

          <button
            type="button"
            className={status === "draft" ? "is-active" : ""}
            onClick={() => selectStatus("draft")}
          >
            <span>Drafts</span>
            <strong>{draftTotal}</strong>
          </button>

          <button
            type="button"
            className={status === "coming_soon" ? "is-active" : ""}
            onClick={() => selectStatus("coming_soon")}
          >
            <span>Coming soon</span>
            <strong>{comingSoonTotal}</strong>
          </button>

          <button
            type="button"
            className={status === "ask_for_price" ? "is-active" : ""}
            onClick={() => selectStatus("ask_for_price")}
          >
            <span>Ask for price</span>
            <strong>{askForPriceTotal}</strong>
          </button>

          <button
            type="button"
            className={status === "out_of_stock" ? "is-active" : ""}
            onClick={() => selectStatus("out_of_stock")}
          >
            <span>Out of stock</span>
            <strong>{outOfStockTotal}</strong>
          </button>
        </div>

        {/* ST_ADMIN_PRODUCTS_RIGHT_COUNT_REMOVED_V1 */}
      </div>

      {issueFilter ? (
        <div className="st-admin-product-issue-filter">
          <div>
            <span>Dashboard filter</span>

            <strong>{PRODUCT_ISSUE_LABELS[issueFilter]}</strong>

            <small>
              {visibleCount}{" "}
              {visibleCount === 1 ? "product" : "products"}
            </small>
          </div>

          <button
            type="button"
            onClick={clearIssueFilter}
            aria-label="Clear dashboard issue filter"
          >
            <span>Clear filter</span>
            <X aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {normalizedQuery ? (
        <p className="st-admin-directory-search__status">
          {visibleCount > 0
            ? `${visibleCount} ${
                visibleCount === 1 ? "product matches" : "products match"
              } “${query.trim()}”.`
            : `No product matches “${query.trim()}” in this section.`}
        </p>
      ) : null}
      {scannerOpen ? (
        <ProductBarcodeScanner
          onClose={closeBarcodeScanner}
          onDetected={handleBarcodeDetected}
        />
      ) : null}
    </section>
  );
}
