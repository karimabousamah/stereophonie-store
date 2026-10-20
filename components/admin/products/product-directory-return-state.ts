export type ProductDirectoryStatusFilter =
  | "all"
  | "published"
  | "draft"
  | "coming_soon"
  | "ask_for_price"
  | "out_of_stock"
  | "archived";

export type ProductDirectoryReturnSnapshot = {
  query: string;
  status: ProductDirectoryStatusFilter;
  scrollY: number;
  productPath: string;
  savedAt: number;
};

const snapshotStorageKey =
  "st-admin-products-directory-return-snapshot-v1";

const restoreRequestStorageKey =
  "st-admin-products-directory-return-request-v1";

/*
 * This state exists only to support the immediate
 * Products -> Edit Product -> Products workflow.
 *
 * Do not let an ancient directory state reappear later.
 */
const maximumSnapshotAgeMs =
  30 * 60 * 1000;

const validStatuses:
  ProductDirectoryStatusFilter[] = [
    "all",
    "published",
    "draft",
    "coming_soon",
    "ask_for_price",
    "out_of_stock",
    "archived",
  ];

function normalizePath(pathname: string) {
  const value = pathname.trim();

  if (
    value.length > 1 &&
    value.endsWith("/")
  ) {
    return value.slice(0, -1);
  }

  return value;
}

function isValidStatus(
  value: unknown,
): value is ProductDirectoryStatusFilter {
  return (
    typeof value === "string" &&
    validStatuses.includes(
      value as ProductDirectoryStatusFilter,
    )
  );
}

function clearSnapshot() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      snapshotStorageKey,
    );

    window.sessionStorage.removeItem(
      restoreRequestStorageKey,
    );
  } catch {
    // Storage is optional. Navigation still works.
  }
}

function readSnapshot():
  | ProductDirectoryReturnSnapshot
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.sessionStorage.getItem(
        snapshotStorageKey,
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as Partial<
        ProductDirectoryReturnSnapshot
      >;

    if (
      typeof parsed.query !== "string" ||
      !isValidStatus(parsed.status) ||
      typeof parsed.scrollY !== "number" ||
      !Number.isFinite(parsed.scrollY) ||
      typeof parsed.productPath !== "string" ||
      typeof parsed.savedAt !== "number" ||
      !Number.isFinite(parsed.savedAt)
    ) {
      clearSnapshot();
      return null;
    }

    if (
      Date.now() - parsed.savedAt >
      maximumSnapshotAgeMs
    ) {
      clearSnapshot();
      return null;
    }

    return {
      query: parsed.query,
      status: parsed.status,
      scrollY: Math.max(
        0,
        parsed.scrollY,
      ),
      productPath: normalizePath(
        parsed.productPath,
      ),
      savedAt: parsed.savedAt,
    };
  } catch {
    clearSnapshot();
    return null;
  }
}

export function rememberProductDirectoryReturnState({
  query,
  status,
  scrollY,
  productPath,
}: {
  query: string;
  status: ProductDirectoryStatusFilter;
  scrollY: number;
  productPath: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const snapshot:
    ProductDirectoryReturnSnapshot = {
      query,
      status,
      scrollY: Math.max(
        0,
        Math.round(scrollY),
      ),
      productPath:
        normalizePath(productPath),
      savedAt: Date.now(),
    };

  try {
    window.sessionStorage.setItem(
      snapshotStorageKey,
      JSON.stringify(snapshot),
    );

    /*
     * A snapshot is not restored merely because it exists.
     * The Edit Product Products button must explicitly request it.
     */
    window.sessionStorage.removeItem(
      restoreRequestStorageKey,
    );
  } catch {
    // Product navigation still works without storage.
  }
}

export function requestProductDirectoryReturnRestore() {
  if (typeof window === "undefined") {
    return;
  }

  const snapshot = readSnapshot();

  if (
    !snapshot ||
    snapshot.productPath !==
      normalizePath(
        window.location.pathname,
      )
  ) {
    clearSnapshot();
    return;
  }

  try {
    window.sessionStorage.setItem(
      restoreRequestStorageKey,
      "1",
    );
  } catch {
    // The Products link remains a normal fallback.
  }
}

export function consumeProductDirectoryReturnState():
  | ProductDirectoryReturnSnapshot
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const requested =
      window.sessionStorage.getItem(
        restoreRequestStorageKey,
      ) === "1";

    if (!requested) {
      /*
       * The admin arrived at Products normally, for example
       * from the sidebar. Never resurrect an old search.
       */
      clearSnapshot();
      return null;
    }

    const snapshot = readSnapshot();

    /*
     * One-use snapshot. Once Products consumes it,
     * future normal visits start clean.
     */
    clearSnapshot();

    return snapshot;
  } catch {
    clearSnapshot();
    return null;
  }
}
