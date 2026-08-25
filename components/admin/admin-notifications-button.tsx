"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Box,
  CheckCircle2,
  ChevronRight,
  Loader2,
  PackageCheck,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationCounts = {
  pendingOrders: number;
  draftProducts: number;
  lowStockVariants: number;
  pendingStockAlerts: number;
};

type NotificationsResponse =
  | {
      success: true;
      counts: NotificationCounts;
      itemIds: Record<keyof NotificationCounts, string[]>;
      total: number;
      generatedAt: string;
    }
  | {
      success: false;
      message?: string;
    };

const emptyCounts: NotificationCounts = {
  pendingOrders: 0,
  draftProducts: 0,
  lowStockVariants: 0,
  pendingStockAlerts: 0,
};

export default function AdminNotificationsButton() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [counts, setCounts] = useState<NotificationCounts>(emptyCounts);

  const [itemIds, setItemIds] = useState<
    Record<keyof NotificationCounts, string[]>
  >({
    pendingOrders: [],
    draftProducts: [],
    lowStockVariants: [],
    pendingStockAlerts: [],
  });

  const [seenIds, setSeenIds] = useState<
    Record<keyof NotificationCounts, string[]>
  >({
    pendingOrders: [],
    draftProducts: [],
    lowStockVariants: [],
    pendingStockAlerts: [],
  });

  const storageKey =
    "stereophonie-admin-seen-notifications-v1";

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(storageKey);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<
        Record<keyof NotificationCounts, string[]>
      >;

      setSeenIds({
        pendingOrders:
          parsed.pendingOrders ?? [],
        draftProducts:
          parsed.draftProducts ?? [],
        lowStockVariants:
          parsed.lowStockVariants ?? [],
        pendingStockAlerts:
          parsed.pendingStockAlerts ?? [],
      });
    } catch {
      // Ignore corrupt browser storage and start fresh.
    }
  }, []);

  function persistSeenIds(
    next: Record<
      keyof NotificationCounts,
      string[]
    >,
  ) {
    setSeenIds(next);

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(next),
      );
    } catch {
      // Browser privacy settings may block storage.
    }
  }

  function markCategorySeen(
    category: keyof NotificationCounts,
  ) {
    const next = {
      ...seenIds,
      [category]: Array.from(
        new Set([
          ...seenIds[category],
          ...itemIds[category],
        ]),
      ),
    };

    persistSeenIds(next);
  }

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/notifications", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = (await response.json()) as NotificationsResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.success
            ? "Notifications could not be loaded."
            : data.message || "Notifications could not be loaded.",
        );
      }

      setCounts(data.counts);
      setItemIds(data.itemIds);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Notifications could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);

      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function togglePanel() {
    setOpen((current) => {
      const next = !current;

      if (next) {
        void loadNotifications();
      }

      return next;
    });
  }


  const unseenCounts: NotificationCounts = {
    pendingOrders:
      itemIds.pendingOrders.filter(
        (id) => !seenIds.pendingOrders.includes(id),
      ).length,

    draftProducts:
      itemIds.draftProducts.filter(
        (id) => !seenIds.draftProducts.includes(id),
      ).length,

    lowStockVariants:
      itemIds.lowStockVariants.filter(
        (id) => !seenIds.lowStockVariants.includes(id),
      ).length,

    pendingStockAlerts:
      itemIds.pendingStockAlerts.filter(
        (id) => !seenIds.pendingStockAlerts.includes(id),
      ).length,
  };

  const total =
    unseenCounts.pendingOrders +
    unseenCounts.draftProducts +
    unseenCounts.lowStockVariants +
    unseenCounts.pendingStockAlerts;


  const notificationItems = [
    {
      key: "pendingOrders" as const,
      title: "Pending orders",
      description:
        unseenCounts.pendingOrders === 1
          ? "1 order is waiting for confirmation."
          : `${unseenCounts.pendingOrders} orders are waiting for confirmation.`,
      count: unseenCounts.pendingOrders,
      href: "/admin/orders",
      icon: PackageCheck,
      tone: "amber",
    },
    {
      key: "lowStockVariants" as const,
      title: "Inventory warnings",
      description:
        unseenCounts.lowStockVariants === 1
          ? "1 product variant requires stock attention."
          : `${unseenCounts.lowStockVariants} product variants require stock attention.`,
      count: unseenCounts.lowStockVariants,
      href: "/admin/products",
      icon: AlertTriangle,
      tone: "red",
    },
    {
      key: "pendingStockAlerts" as const,
      title: "Customer stock requests",
      description:
        unseenCounts.pendingStockAlerts === 1
          ? "1 customer is waiting for a restock notification."
          : `${unseenCounts.pendingStockAlerts} customers are waiting for restock notifications.`,
      count: unseenCounts.pendingStockAlerts,
      href: "/admin/stock-alerts",
      icon: BellRing,
      tone: "blue",
    },
    {
      key: "draftProducts" as const,
      title: "Draft products",
      description:
        unseenCounts.draftProducts === 1
          ? "1 product is currently hidden from the storefront."
          : `${unseenCounts.draftProducts} products are currently hidden from the storefront.`,
      count: unseenCounts.draftProducts,
      href: "/admin/products",
      icon: Box,
      tone: "neutral",
    },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-label={`Notifications${
          total > 0 ? `, ${total} requiring attention` : ""
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex h-11 w-11 items-center justify-center border transition ${
          open
            ? "border-white/35 bg-white text-black"
            : "border-white/10 text-white/55 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
        }`}
      >
        <Bell className="h-[18px] w-[18px]" />

        {!loading && total > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#080808] bg-amber-400 px-1 text-[9px] font-bold leading-none text-black">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>

      <div
        role="dialog"
        aria-label="Admin notifications"
        className={`absolute right-0 top-[calc(100%+14px)] z-50 w-[min(410px,calc(100vw-32px))] origin-top-right border border-white/10 bg-[#101010] shadow-[0_30px_100px_rgba(0,0,0,0.65)] transition duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/35">
              Activity centre
            </p>

            <h2 className="mt-2 text-lg font-semibold">Notifications</h2>

            <p className="mt-1 text-xs text-white/40">
              Live operational updates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadNotifications()}
              disabled={loading}
              aria-label="Refresh notifications"
              title="Refresh notifications"
              className="flex h-9 w-9 items-center justify-center border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white disabled:cursor-wait disabled:opacity-40"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="flex h-9 w-9 items-center justify-center border border-white/10 text-white/45 transition hover:border-white/25 hover:bg-white hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.17em] text-white/35">
              Loading notifications
            </p>
          </div>
        ) : error ? (
          <div className="p-5">
            <div className="border border-red-400/20 bg-red-400/[0.06] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />

                <div>
                  <p className="text-sm font-semibold text-red-200">
                    Unable to load notifications
                  </p>

                  <p className="mt-2 text-xs leading-5 text-red-200/55">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="mt-4 inline-flex min-h-10 items-center gap-2 border border-red-300/20 px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-red-200 transition hover:bg-red-200 hover:text-black"
              >
                Try again
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center border border-emerald-400/20 bg-emerald-400/[0.06]">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            </div>

            <h3 className="mt-5 text-base font-semibold">
              No new notifications
            </h3>

            <p className="mt-2 max-w-xs text-xs leading-5 text-white/40">
              There are no pending orders, inventory warnings, customer stock
              requests or draft products requiring attention.
            </p>
          </div>
        ) : (
          <div className="max-h-[470px] overflow-y-auto">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <p className="text-xs text-white/45">
                <span className="font-semibold text-white">{total}</span>{" "}
                {total === 1 ? "item requires" : "items require"} attention
              </p>
            </div>

            <div className="divide-y divide-white/[0.07]">
              {notificationItems
                .filter((item) => item.count > 0)
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => {
                        markCategorySeen(item.key);
                        setOpen(false);
                      }}
                      className="group flex items-start gap-4 px-5 py-5 transition hover:bg-white/[0.045]"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
                          item.tone === "amber"
                            ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-300"
                            : item.tone === "red"
                              ? "border-red-400/20 bg-red-400/[0.07] text-red-300"
                              : item.tone === "blue"
                                ? "border-sky-400/20 bg-sky-400/[0.07] text-sky-300"
                                : "border-white/10 bg-white/[0.04] text-white/55"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-semibold">{item.title}</p>

                          <span className="flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-white px-2 text-[10px] font-bold text-black">
                            {item.count}
                          </span>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-white/40">
                          {item.description}
                        </p>

                        <span className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35 transition group-hover:text-white">
                          Review
                          <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 bg-black/20 px-5 py-3">
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">
            Data refreshes whenever the panel opens
          </p>
        </div>
      </div>
    </div>
  );
}
