"use client";

import { ShoppingBag } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";

export default function CartButton() {
  const { totalItems, isCartReady, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open shopping cart with ${totalItems} items`}
      className="group relative flex h-8 w-8 shrink-0 items-center justify-center bg-transparent text-black/50 transition duration-300 hover:text-black"
    >
      <ShoppingBag className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-y-0.5" />

      {isCartReady && totalItems > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-black px-1 text-center text-[8px] font-semibold leading-none tracking-normal text-white">
          <span className="block leading-none">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        </span>
      ) : null}
    </button>
  );
}
