"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { useWishlist } from "@/components/wishlist/wishlist-provider";

type WishlistButtonProps = {
  showLabel?: boolean;
};

export default function WishlistButton({
  showLabel = false,
}: WishlistButtonProps) {
  const { productCount, hydrated } = useWishlist();

  const visibleCount = hydrated ? productCount : 0;

  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist with ${visibleCount} saved ${
        visibleCount === 1 ? "product" : "products"
      }`}
      className="group inline-flex shrink-0 items-center gap-2 bg-transparent text-[11px] font-semibold uppercase tracking-[0.15em] text-black/50 shadow-none transition duration-300 hover:text-black"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Heart
          className={`h-[18px] w-[18px] transition duration-300 group-hover:-translate-y-0.5 ${
            visibleCount > 0 ? "fill-current text-black" : ""
          }`}
        />
      </span>

      {showLabel ? <span>Wishlist</span> : null}
    </Link>
  );
}
