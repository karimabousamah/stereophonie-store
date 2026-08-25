"use client";

import { usePathname } from "next/navigation";

import V3ShoppingAssistant from "@/components/stereophonie-v3/assistant/v3-shopping-assistant";

export default function GlobalStorefrontAssistant() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return <V3ShoppingAssistant />;
}
