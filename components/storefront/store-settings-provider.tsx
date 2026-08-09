"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PublicStoreSettings } from "@/lib/store-settings";

const StoreSettingsContext = createContext<PublicStoreSettings | null>(null);

export function StoreSettingsProvider({
  settings,
  children,
}: {
  settings: PublicStoreSettings;
  children: ReactNode;
}) {
  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const settings = useContext(StoreSettingsContext);

  if (!settings) {
    throw new Error(
      "useStoreSettings must be used inside StoreSettingsProvider.",
    );
  }

  return settings;
}
