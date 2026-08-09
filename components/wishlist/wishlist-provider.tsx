"use client";

import {
  createContext,
  type FormEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Heart, LoaderCircle, Mail, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export type WishlistProductImage = {
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

export type WishlistProductVariant = {
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | null;
};

export type WishlistProduct = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categoryName: string;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  images: WishlistProductImage[];
  variants: WishlistProductVariant[];
};

type GuestTokenMap = Record<string, string>;

type WishlistApiResponse = {
  success?: boolean;
  authenticated?: boolean;
  requiresEmail?: boolean;
  source?: "account" | "guest";
  email?: string | null;
  guestAccessToken?: string | null;
  message?: string;
  products?: WishlistProduct[];
};

type WishlistContextValue = {
  products: WishlistProduct[];
  productCount: number;
  hydrated: boolean;
  isWishlisted: (productId: string) => boolean;
  addProduct: (product: WishlistProduct) => void;
  removeProduct: (productId: string) => void;
  toggleProduct: (product: WishlistProduct) => void;
  clearWishlist: () => void;
};

const STORAGE_KEY = "stereophonie-wishlist-v1";

const GUEST_EMAIL_KEY = "stereophonie-wishlist-email-v1";

const GUEST_TOKENS_KEY = "stereophonie-wishlist-tokens-v1";

const WishlistContext = createContext<WishlistContextValue | null>(null);

function isWishlistProduct(value: unknown): value is WishlistProduct {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const product = value as Partial<WishlistProduct>;

  return (
    typeof product.id === "string" &&
    typeof product.name === "string" &&
    Array.isArray(product.images) &&
    Array.isArray(product.variants)
  );
}

function readStoredProducts() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isWishlistProduct);
  } catch {
    return [];
  }
}

function readGuestTokens(): GuestTokenMap {
  try {
    const storedValue = window.localStorage.getItem(GUEST_TOKENS_KEY);

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        ([productId, token]) =>
          typeof productId === "string" && typeof token === "string",
      ),
    );
  } catch {
    return {};
  }
}

function readGuestEmail() {
  try {
    return window.localStorage.getItem(GUEST_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function isValidEmail(value: string) {
  return (
    value.length >= 5 &&
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

async function readApiResponse(response: Response) {
  try {
    return (await response.json()) as WishlistApiResponse;
  } catch {
    return {
      success: false,
      message: "The wishlist request could not be completed.",
    } satisfies WishlistApiResponse;
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<WishlistProduct[]>([]);

  const [guestTokens, setGuestTokens] = useState<GuestTokenMap>({});

  const [guestEmail, setGuestEmail] = useState("");

  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const [hydrated, setHydrated] = useState(false);

  const [pendingProduct, setPendingProduct] = useState<WishlistProduct | null>(
    null,
  );

  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [emailModalLoading, setEmailModalLoading] = useState(false);

  const [emailModalError, setEmailModalError] = useState("");

  const [notice, setNotice] = useState("");

  const [noticeType, setNoticeType] = useState<"success" | "error" | "">("");

  const productsRef = useRef<WishlistProduct[]>([]);

  const guestTokensRef = useRef<GuestTokenMap>({});

  const guestEmailRef = useRef("");

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    guestTokensRef.current = guestTokens;
  }, [guestTokens]);

  useEffect(() => {
    guestEmailRef.current = guestEmail;
  }, [guestEmail]);

  const synchronizeWishlist = useCallback(
    async ({
      localProducts = productsRef.current,
      localTokens = guestTokensRef.current,
      allowLegacyMigration = false,
    }: {
      localProducts?: WishlistProduct[];
      localTokens?: GuestTokenMap;
      allowLegacyMigration?: boolean;
    } = {}) => {
      try {
        let response = await fetch("/api/wishlist", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        let data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(data.message ?? "Your wishlist could not be loaded.");
        }

        if (!data.authenticated) {
          setAuthenticated(false);

          return;
        }

        const guestItems = Object.entries(localTokens).map(
          ([productId, guestAccessToken]) => ({
            productId,
            guestAccessToken,
          }),
        );

        if (guestItems.length > 0) {
          const syncResponse = await fetch("/api/wishlist", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              action: "sync",
              guestItems,
            }),
          });

          const syncData = await readApiResponse(syncResponse);

          if (!syncResponse.ok || !syncData.success) {
            console.error(
              syncData.message ?? "Guest wishlist synchronization failed.",
            );
          }
        }

        if (allowLegacyMigration) {
          const serverProductIds = new Set(
            (data.products ?? []).map((product) => product.id),
          );

          const legacyProducts = localProducts.filter(
            (product) =>
              !serverProductIds.has(product.id) && !localTokens[product.id],
          );

          await Promise.allSettled(
            legacyProducts.map(async (product) => {
              const addResponse = await fetch("/api/wishlist", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  productId: product.id,
                }),
              });

              if (!addResponse.ok) {
                throw new Error(
                  "A legacy wishlist item could not be synchronized.",
                );
              }
            }),
          );
        }

        if (guestItems.length > 0 || allowLegacyMigration) {
          response = await fetch("/api/wishlist", {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          });

          data = await readApiResponse(response);

          if (!response.ok || !data.success) {
            throw new Error(
              data.message ?? "Your synchronized wishlist could not be loaded.",
            );
          }
        }

        const accountProducts = (data.products ?? []).filter(isWishlistProduct);

        productsRef.current = accountProducts;

        guestTokensRef.current = {};

        setProducts(accountProducts);

        setGuestTokens({});

        setAuthenticated(true);

        try {
          window.localStorage.removeItem(STORAGE_KEY);

          window.localStorage.removeItem(GUEST_TOKENS_KEY);
        } catch {
          // The account wishlist
          // remains available in memory.
        }
      } catch (error) {
        console.error("Wishlist synchronization failed:", error);
      }
    },
    [],
  );

  useEffect(() => {
    const storedProducts = readStoredProducts();

    const storedTokens = readGuestTokens();

    const storedEmail = readGuestEmail();

    productsRef.current = storedProducts;

    guestTokensRef.current = storedTokens;

    guestEmailRef.current = storedEmail;

    setProducts(storedProducts);
    setGuestTokens(storedTokens);
    setGuestEmail(storedEmail);

    void synchronizeWishlist({
      localProducts: storedProducts,
      localTokens: storedTokens,
      allowLegacyMigration: true,
    }).finally(() => {
      setHydrated(true);
    });
  }, [synchronizeWishlist]);

  useEffect(() => {
    if (!hydrated || authenticated !== false) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch {
      // Wishlist remains available
      // during the current page visit.
    }
  }, [authenticated, hydrated, products]);

  useEffect(() => {
    if (!hydrated || authenticated !== false) {
      return;
    }

    try {
      window.localStorage.setItem(
        GUEST_TOKENS_KEY,
        JSON.stringify(guestTokens),
      );
    } catch {
      // Guest tokens remain available
      // during this page visit.
    }
  }, [authenticated, hydrated, guestTokens]);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        window.setTimeout(() => {
          void synchronizeWishlist({
            localProducts: productsRef.current,
            localTokens: guestTokensRef.current,
            allowLegacyMigration: true,
          });
        }, 0);
      }

      if (event === "SIGNED_OUT") {
        const storedProducts = readStoredProducts();

        const storedTokens = readGuestTokens();

        productsRef.current = storedProducts;

        guestTokensRef.current = storedTokens;

        setAuthenticated(false);

        setProducts(storedProducts);

        setGuestTokens(storedTokens);
      }
    });

    function refreshOnFocus() {
      void synchronizeWishlist();
    }

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      subscription.unsubscribe();

      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [synchronizeWishlist]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice("");
      setNoticeType("");
    }, 4500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [notice]);

  useEffect(() => {
    if (!emailModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !emailModalLoading) {
        setEmailModalOpen(false);
        setEmailModalError("");
        setPendingProduct(null);
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [emailModalOpen, emailModalLoading]);

  const isWishlisted = useCallback(
    (productId: string) => products.some((product) => product.id === productId),
    [products],
  );

  const addProductLocally = useCallback((product: WishlistProduct) => {
    setProducts((currentProducts) => {
      const alreadySaved = currentProducts.some(
        (currentProduct) => currentProduct.id === product.id,
      );

      if (alreadySaved) {
        return currentProducts;
      }

      const nextProducts = [product, ...currentProducts];

      productsRef.current = nextProducts;

      return nextProducts;
    });
  }, []);

  const saveGuestDetails = useCallback(
    (productId: string, email: string, token: string | null | undefined) => {
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail) {
        guestEmailRef.current = normalizedEmail;

        setGuestEmail(normalizedEmail);

        try {
          window.localStorage.setItem(GUEST_EMAIL_KEY, normalizedEmail);
        } catch {
          // Email remains available
          // during this page visit.
        }
      }

      if (token) {
        setGuestTokens((currentTokens) => {
          const nextTokens = {
            ...currentTokens,
            [productId]: token,
          };

          guestTokensRef.current = nextTokens;

          return nextTokens;
        });
      }
    },
    [],
  );

  const addProduct = useCallback(
    (product: WishlistProduct) => {
      if (
        productsRef.current.some(
          (savedProduct) => savedProduct.id === product.id,
        )
      ) {
        return;
      }

      void (async () => {
        try {
          const normalizedEmail = guestEmailRef.current.trim().toLowerCase();

          const response = await fetch("/api/wishlist", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              productId: product.id,
              email: isValidEmail(normalizedEmail)
                ? normalizedEmail
                : undefined,
            }),
          });

          const data = await readApiResponse(response);

          if (data.requiresEmail) {
            setPendingProduct(product);

            setEmailModalError("");

            setEmailModalOpen(true);

            return;
          }

          if (!response.ok || !data.success) {
            throw new Error(
              data.message ??
                "The product could not be added to your wishlist.",
            );
          }

          addProductLocally(product);

          if (data.source === "guest") {
            setAuthenticated(false);

            saveGuestDetails(
              product.id,
              data.email ?? "",
              data.guestAccessToken,
            );
          } else {
            setAuthenticated(true);
          }

          setNotice(data.message ?? "The product was added to your wishlist.");

          setNoticeType("success");
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : "The product could not be added to your wishlist.",
          );

          setNoticeType("error");
        }
      })();
    },
    [addProductLocally, saveGuestDetails],
  );

  const removeProduct = useCallback((productId: string) => {
    const currentProducts = productsRef.current;

    const removedProduct = currentProducts.find(
      (product) => product.id === productId,
    );

    if (!removedProduct) {
      return;
    }

    const nextProducts = currentProducts.filter(
      (product) => product.id !== productId,
    );

    productsRef.current = nextProducts;

    setProducts(nextProducts);

    void (async () => {
      try {
        const token = guestTokensRef.current[productId] ?? "";

        const response = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            productId,
            email: guestEmailRef.current || undefined,
            guestAccessToken: token || undefined,
          }),
        });

        const data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          const isLegacyLocalItem = !token && Boolean(guestEmailRef.current);

          if (!isLegacyLocalItem) {
            throw new Error(
              data.message ??
                "The product could not be removed from your wishlist.",
            );
          }
        }

        setGuestTokens((currentTokens) => {
          const nextTokens = {
            ...currentTokens,
          };

          delete nextTokens[productId];

          guestTokensRef.current = nextTokens;

          return nextTokens;
        });
      } catch (error) {
        setProducts((currentProducts) => {
          const alreadyRestored = currentProducts.some(
            (product) => product.id === removedProduct.id,
          );

          if (alreadyRestored) {
            return currentProducts;
          }

          const restoredProducts = [removedProduct, ...currentProducts];

          productsRef.current = restoredProducts;

          return restoredProducts;
        });

        setNotice(
          error instanceof Error
            ? error.message
            : "The product could not be removed from your wishlist.",
        );

        setNoticeType("error");
      }
    })();
  }, []);

  const toggleProduct = useCallback(
    (product: WishlistProduct) => {
      const alreadySaved = productsRef.current.some(
        (savedProduct) => savedProduct.id === product.id,
      );

      if (alreadySaved) {
        removeProduct(product.id);

        return;
      }

      addProduct(product);
    },
    [addProduct, removeProduct],
  );

  const clearWishlist = useCallback(() => {
    const productsToRemove = [...productsRef.current];

    productsRef.current = [];

    setProducts([]);

    void Promise.allSettled(
      productsToRemove.map(async (product) => {
        const token = guestTokensRef.current[product.id] ?? "";

        const response = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            productId: product.id,
            email: guestEmailRef.current || undefined,
            guestAccessToken: token || undefined,
          }),
        });

        if (!response.ok && token) {
          throw new Error("A wishlist item could not be removed.");
        }
      }),
    ).then((results) => {
      const hasFailure = results.some((result) => result.status === "rejected");

      if (hasFailure) {
        setNotice(
          "Some wishlist items could not be removed from the database.",
        );

        setNoticeType("error");

        void synchronizeWishlist();
      }
    });

    guestTokensRef.current = {};

    setGuestTokens({});
  }, [synchronizeWishlist]);

  async function submitGuestEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingProduct) {
      return;
    }

    const normalizedEmail = guestEmail.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setEmailModalError("Please enter a valid email address.");

      return;
    }

    setEmailModalLoading(true);
    setEmailModalError("");

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          productId: pendingProduct.id,
          email: normalizedEmail,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ?? "The product could not be added to your wishlist.",
        );
      }

      addProductLocally(pendingProduct);

      setAuthenticated(false);

      saveGuestDetails(
        pendingProduct.id,
        data.email ?? normalizedEmail,
        data.guestAccessToken,
      );

      setEmailModalOpen(false);
      setPendingProduct(null);
      setEmailModalError("");

      setNotice(data.message ?? "The product was added to your wishlist.");

      setNoticeType("success");
    } catch (error) {
      setEmailModalError(
        error instanceof Error
          ? error.message
          : "The product could not be added to your wishlist.",
      );
    } finally {
      setEmailModalLoading(false);
    }
  }

  function closeEmailModal() {
    if (emailModalLoading) {
      return;
    }

    setEmailModalOpen(false);
    setEmailModalError("");
    setPendingProduct(null);
  }

  const contextValue = useMemo<WishlistContextValue>(
    () => ({
      products,
      productCount: products.length,
      hydrated,
      isWishlisted,
      addProduct,
      removeProduct,
      toggleProduct,
      clearWishlist,
    }),
    [
      products,
      hydrated,
      isWishlisted,
      addProduct,
      removeProduct,
      toggleProduct,
      clearWishlist,
    ],
  );

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}

      {hydrated && emailModalOpen && pendingProduct
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeEmailModal();
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="wishlist-email-title"
                className="relative w-full max-w-md border border-black/10 bg-white p-6 text-black shadow-2xl sm:p-8"
              >
                <button
                  type="button"
                  onClick={closeEmailModal}
                  disabled={emailModalLoading}
                  aria-label="Close"
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center border border-black/10 text-black/50 transition hover:border-black hover:text-black disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex h-12 w-12 items-center justify-center bg-black text-white">
                  <Heart className="h-5 w-5" />
                </div>

                <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                  Save your favourite
                </p>

                <h2
                  id="wishlist-email-title"
                  className="mt-3 pr-10 text-3xl font-semibold tracking-[-0.04em]"
                >
                  Enter your email
                </h2>

                <p className="mt-4 text-sm leading-6 text-black/50">
                  Save{" "}
                  <span className="font-semibold text-black">
                    {pendingProduct.name}
                  </span>{" "}
                  and receive important availability updates.
                </p>

                <form onSubmit={submitGuestEmail} className="mt-7">
                  <label
                    htmlFor="wishlist-email"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50"
                  >
                    Email address
                  </label>

                  <input
                    id="wishlist-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={guestEmail}
                    onChange={(event) => {
                      const value = event.target.value;

                      guestEmailRef.current = value;

                      setGuestEmail(value);

                      setEmailModalError("");
                    }}
                    placeholder="you@example.com"
                    className="mt-3 min-h-14 w-full border border-black/15 bg-white px-4 text-sm outline-none transition placeholder:text-black/25 focus:border-black"
                  />

                  {emailModalError ? (
                    <p className="mt-3 text-sm text-red-600">
                      {emailModalError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={emailModalLoading}
                    className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#242424] disabled:cursor-wait disabled:opacity-60"
                  >
                    {emailModalLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}

                    {emailModalLoading ? "Saving..." : "Save to wishlist"}
                  </button>
                </form>

                <p className="mt-4 text-center text-xs leading-5 text-black/35">
                  No account is required. Your email will be used for wishlist
                  and stock availability updates.
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}

      {hydrated && notice
        ? createPortal(
            <div
              role="status"
              className={`fixed bottom-5 right-5 z-[220] flex max-w-sm items-start gap-3 border px-5 py-4 text-sm shadow-xl ${
                noticeType === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {noticeType === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : null}

              <span>{notice}</span>
            </div>,
            document.body,
          )
        : null}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider.");
  }

  return context;
}
