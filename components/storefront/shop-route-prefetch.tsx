"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SHOP_ROUTES = [
  "/shop",
  "/shop?sort=newest",
  "/shop?offers=true",
] as const;

export default function ShopRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    for (const route of SHOP_ROUTES) {
      router.prefetch(route);
    }
  }, [router]);

  return null;
}
