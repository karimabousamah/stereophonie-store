"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type CartItem = {
  cartItemId: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  size: string;
  variantId: string;
  unitPrice: number;
  regularPrice: number | null;
  quantity: number;
  maximumQuantity: number;
};

type AddCartItemInput = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  size: string;
  variantId: string;
  unitPrice: number;
  regularPrice: number | null;
  maximumQuantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  isCartReady: boolean;

  addItem: (item: AddCartItemInput) => {
    success: boolean;
    message: string;
  };

  removeItem: (cartItemId: string) => void;

  updateQuantity: (cartItemId: string, quantity: number) => void;

  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const cartStorageKey = "stereophonie-cart";

function createCartItemId(productId: string, variantId: string) {
  return `${productId}:${variantId}`;
}

function safelyReadStoredCart(): CartItem[] {
  try {
    const storedCart = window.localStorage.getItem(cartStorageKey);

    if (!storedCart) {
      return [];
    }

    const parsedCart = JSON.parse(storedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .filter((item) => {
        return (
          typeof item?.cartItemId === "string" &&
          typeof item?.productId === "string" &&
          typeof item?.variantId === "string" &&
          typeof item?.name === "string" &&
          typeof item?.size === "string" &&
          typeof item?.unitPrice === "number" &&
          typeof item?.quantity === "number" &&
          typeof item?.maximumQuantity === "number"
        );
      })
      .map((item) => ({
        cartItemId: item.cartItemId,

        productId: item.productId,

        slug: typeof item.slug === "string" ? item.slug : "",

        name: item.name,

        imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,

        size: item.size,

        variantId: item.variantId,

        unitPrice: Math.max(0, Number(item.unitPrice) || 0),

        regularPrice:
          typeof item.regularPrice === "number" ? item.regularPrice : null,

        quantity: Math.max(1, Number(item.quantity) || 1),

        maximumQuantity: Math.max(1, Number(item.maximumQuantity) || 1),
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const itemsRef = useRef<CartItem[]>([]);

  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isCartReady, setIsCartReady] = useState(false);

  useEffect(() => {
    const storedItems = safelyReadStoredCart();

    itemsRef.current = storedItems;

    setItems(storedItems);
    setIsCartReady(true);
  }, []);

  useEffect(() => {
    if (!isCartReady) {
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
  }, [items, isCartReady]);

  const addItem = useCallback((input: AddCartItemInput) => {
    if (input.maximumQuantity < 1) {
      return {
        success: false,
        message: "This size is currently unavailable.",
      };
    }

    const cartItemId = createCartItemId(input.productId, input.variantId);

    const currentItems = itemsRef.current;

    const existingItem = currentItems.find(
      (item) => item.cartItemId === cartItemId,
    );

    if (existingItem && existingItem.quantity >= input.maximumQuantity) {
      setIsCartOpen(true);

      return {
        success: false,
        message: "The maximum available quantity is already in your cart.",
      };
    }

    let nextItems: CartItem[];

    if (!existingItem) {
      nextItems = [
        ...currentItems,
        {
          ...input,
          cartItemId,
          quantity: 1,
        },
      ];
    } else {
      nextItems = currentItems.map((item) =>
        item.cartItemId === cartItemId
          ? {
              ...item,

              quantity: Math.min(item.quantity + 1, input.maximumQuantity),

              maximumQuantity: input.maximumQuantity,

              unitPrice: input.unitPrice,

              regularPrice: input.regularPrice,

              imageUrl: input.imageUrl,

              slug: input.slug,
            }
          : item,
      );
    }

    itemsRef.current = nextItems;

    setItems(nextItems);

    setIsCartOpen(true);

    return {
      success: true,
      message: existingItem ? "Cart quantity updated." : "Added to cart.",
    };
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    const nextItems = itemsRef.current.filter(
      (item) => item.cartItemId !== cartItemId,
    );

    itemsRef.current = nextItems;

    setItems(nextItems);
  }, []);

  const updateQuantity = useCallback(
    (cartItemId: string, requestedQuantity: number) => {
      const nextItems = itemsRef.current.map((item) => {
        if (item.cartItemId !== cartItemId) {
          return item;
        }

        const nextQuantity = Math.min(
          Math.max(1, Math.floor(requestedQuantity)),
          item.maximumQuantity,
        );

        return {
          ...item,
          quantity: nextQuantity,
        };
      });

      itemsRef.current = nextItems;

      setItems(nextItems);
    },
    [],
  );

  const clearCart = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
  }, []);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const toggleCart = useCallback(() => {
    setIsCartOpen((current) => !current);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    [items],
  );

  const contextValue = useMemo(
    () => ({
      items,
      totalItems,
      subtotal,
      isCartOpen,
      isCartReady,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    }),
    [
      items,
      totalItems,
      subtotal,
      isCartOpen,
      isCartReady,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    ],
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }

  return context;
}
