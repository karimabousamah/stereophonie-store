"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { HeaderNavigationCategory } from "@/lib/storefront-header-navigation-types";

type HeaderNavigationContextValue = {
  categories: HeaderNavigationCategory[];
};

const HeaderNavigationContext =
  createContext<HeaderNavigationContextValue | null>(
    null,
  );

export function HeaderNavigationProvider({
  categories,
  children,
}: {
  categories: HeaderNavigationCategory[];
  children: ReactNode;
}) {
  return (
    <HeaderNavigationContext.Provider
      value={{
        categories,
      }}
    >
      {children}
    </HeaderNavigationContext.Provider>
  );
}

export function useHeaderNavigation() {
  const context =
    useContext(HeaderNavigationContext);

  if (!context) {
    throw new Error(
      "useHeaderNavigation must be used inside HeaderNavigationProvider.",
    );
  }

  return context;
}
