"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  useEffect,
  useState,
} from "react";

import { useWishlist } from "@/components/wishlist/wishlist-provider";

// ST_WISHLIST_READY_AND_VALID_CART_PRICE_V1
type Props = ComponentProps<typeof Link>;

export default function WishlistReadyLink({
  onClick,
  ...props
}: Props) {
  const { hydrated } = useWishlist();
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (waiting && hydrated) {
      setWaiting(false);
      router.push("/wishlist");
    }
  }, [waiting, hydrated, router]);

  return (
    <Link
      {...props}
      aria-busy={waiting || undefined}
      onClick={(event) => {
        onClick?.(event);

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        if (!hydrated) {
          event.preventDefault();
          setWaiting(true);
        }
      }}
    />
  );
}
