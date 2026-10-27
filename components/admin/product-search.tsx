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

type Props = {
  total: number;
  liveTotal: number;
  draftTotal: number;
  comingSoonTotal: number;
  askForPriceTotal: number;
  outOfStockTotal: number;
  archivedTotal: number;
  initialFilter?: ProductStatusFilter;
};

export default function ProductSearch({
  total,
  liveTotal,
  draftTotal,
  comingSoonTotal,
  askForPriceTotal,
  outOfStockTotal,
  initialFilter = "all",
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>(initialFilter);

  const [visibleCount, setVisibleCount] = useState(total);

  const [pendingRestoreScrollY, setPendingRestoreScrollY] =
    useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scannerButtonRef = useRef<HTMLButtonElement>(null);

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

      const matches = matchesQuery && matchesStatus;

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
    setStatus("all");
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

  return (
    <section
      className="st-admin-directory-search st-admin-product-directory-v2"
      aria-label="Product directory"
      data-product-filter={status}
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
            onClick={() => setStatus("all")}
          >
            <span>All</span>
            <strong>{total}</strong>
          </button>

          <button
            type="button"
            className={status === "published" ? "is-active" : ""}
            onClick={() => setStatus("published")}
          >
            <span>Live</span>
            <strong>{liveTotal}</strong>
          </button>

          <button
            type="button"
            className={status === "draft" ? "is-active" : ""}
            onClick={() => setStatus("draft")}
          >
            <span>Drafts</span>
            <strong>{draftTotal}</strong>
          </button>

          <button
            type="button"
            className={status === "coming_soon" ? "is-active" : ""}
            onClick={() => setStatus("coming_soon")}
          >
            <span>Coming soon</span>
            <strong>{comingSoonTotal}</strong>
          </button>

          <button
            type="button"
            className={status === "ask_for_price" ? "is-active" : ""}
            onClick={() => setStatus("ask_for_price")}
          >
            <span>Ask for price</span>
            <strong>{askForPriceTotal}</strong>
          </button>

          <button
            type="button"
            className={status === "out_of_stock" ? "is-active" : ""}
            onClick={() => setStatus("out_of_stock")}
          >
            <span>Out of stock</span>
            <strong>{outOfStockTotal}</strong>
          </button>
        </div>

        {/* ST_ADMIN_PRODUCTS_RIGHT_COUNT_REMOVED_V1 */}
      </div>

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
