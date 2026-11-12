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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type NotificationCategory =
  | "pendingOrders"
  | "draftProducts"
  | "lowStockVariants"
  | "pendingStockAlerts";

type NotificationCounts = Record<
  NotificationCategory,
  number
>;

type AdminNotification = {
  id: string;
  category: NotificationCategory;
  sourceId: string;
  title: string;
  description: string;
  href: string;
  tone:
    | "amber"
    | "red"
    | "blue"
    | "neutral";
};

type NotificationsResponse =
  | {
      success: true;
      counts: NotificationCounts;

      itemIds: Record<
        NotificationCategory,
        string[]
      >;

      notifications: AdminNotification[];

      total: number;
      generatedAt: string;
    }
  | {
      success: false;
      message?: string;
    };

const emptySeenIds: Record<
  NotificationCategory,
  string[]
> = {
  pendingOrders: [],
  draftProducts: [],
  lowStockVariants: [],
  pendingStockAlerts: [],
};

const storageKey =
  "stereophonie-admin-seen-notifications-v1";

function getNotificationIcon(
  category: NotificationCategory,
) {
  if (category === "pendingOrders") {
    return PackageCheck;
  }

  if (category === "lowStockVariants") {
    return AlertTriangle;
  }

  if (category === "pendingStockAlerts") {
    return BellRing;
  }

  return Box;
}

export default function AdminNotificationsButton() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [notifications, setNotifications] =
    useState<AdminNotification[]>([]);

  const [seenIds, setSeenIds] =
    useState<
      Record<
        NotificationCategory,
        string[]
      >
    >(emptySeenIds);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          storageKey,
        );

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(
        stored,
      ) as Partial<
        Record<
          NotificationCategory,
          string[]
        >
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
      // Ignore corrupt local storage.
    }
  }, []);

  function persistSeenIds(
    next: Record<
      NotificationCategory,
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

  function markNotificationSeen(
    notification: AdminNotification,
  ) {
    const current =
      seenIds[notification.category];

    if (
      current.includes(
        notification.sourceId,
      )
    ) {
      return;
    }

    persistSeenIds({
      ...seenIds,

      [notification.category]:
        Array.from(
          new Set([
            ...current,
            notification.sourceId,
          ]),
        ),
    });
  }

  const loadNotifications =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/admin/notifications",
            {
              method: "GET",
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        const data =
          (await response.json()) as
            NotificationsResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.success
              ? "Notifications could not be loaded."
              : data.message ||
                  "Notifications could not be loaded.",
          );
        }

        setNotifications(
          data.notifications,
        );
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

    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
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

  const unseenNotifications =
    notifications.filter(
      (notification) =>
        !seenIds[
          notification.category
        ].includes(
          notification.sourceId,
        ),
    );

  const total =
    unseenNotifications.length;

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={togglePanel}
        aria-label={`Notifications${
          total > 0
            ? `, ${total} requiring attention`
            : ""
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`st-admin-v2-notifications-trigger relative flex h-11 w-11 items-center justify-center border transition ${
          open
            ? "border-white/35 bg-white text-black"
            : "border-white/10 text-white/55 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
        }`}
      >
        <Bell className="st-admin-v2-notifications-bell h-[18px] w-[18px]" />

        {!loading && total > 0 ? (
          <span className="st-admin-v2-notifications-badge absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#080808] bg-amber-400 px-1 text-[9px] font-bold leading-none text-black">
            {total > 99
              ? "99+"
              : total}
          </span>
        ) : null}
      </button>

      <div
        role="dialog"
        aria-label="Admin notifications"
        className={`st-admin-v2-notifications-panel absolute right-0 top-[calc(100%+14px)] z-50 w-[min(410px,calc(100vw-32px))] origin-top-right border border-white/10 bg-[#101010] shadow-[0_30px_100px_rgba(0,0,0,0.65)] transition duration-200 ${
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

            <h2 className="mt-2 text-lg font-semibold">
              Notifications
            </h2>

            <p className="mt-1 text-xs text-white/40">
              Live operational updates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadNotifications()
              }
              disabled={loading}
              aria-label="Refresh notifications"
              title="Refresh notifications"
              className="flex h-9 w-9 items-center justify-center border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white disabled:cursor-wait disabled:opacity-40"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              aria-label="Close notifications"
              className="flex h-9 w-9 items-center justify-center border border-white/10 text-white/45 transition hover:border-white/25 hover:bg-white hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <Loader2 className="st-admin-v2-notifications-loading-spinner h-6 w-6 animate-spin text-white/50" />

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
                onClick={() =>
                  void loadNotifications()
                }
                className="mt-4 inline-flex min-h-10 items-center gap-2 border border-red-300/20 px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-red-200 transition hover:bg-red-200 hover:text-black"
              >
                Try again

                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center border border-emerald-400/20 bg-emerald-400/[0.06]">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            </div>

            <h3 className="mt-5 text-base font-semibold">
              No new notifications
            </h3>

            <p className="mt-2 max-w-xs text-xs leading-5 text-white/40">
              There are no new orders,
              inventory warnings, customer
              stock requests or draft
              products requiring attention.
            </p>
          </div>
        ) : (
          <div className="max-h-[470px] overflow-y-auto">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <p className="text-xs text-white/45">
                <span className="font-semibold text-white">
                  {total}
                </span>{" "}
                {total === 1
                  ? "item requires"
                  : "items require"}{" "}
                attention
              </p>
            </div>

            <div className="divide-y divide-white/[0.07]">
              {unseenNotifications.map(
                (notification) => {
                  const Icon =
                    getNotificationIcon(
                      notification.category,
                    );

                  return (
                    <Link
                      key={notification.id}
                      href={
                        notification.href
                      }
                      onClick={() => {
                        markNotificationSeen(
                          notification,
                        );

                        setOpen(false);
                      }}
                      className="st-admin-v2-notification-item group flex items-start gap-4 px-5 py-5 transition"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
                          notification.tone ===
                          "amber"
                            ? "border-[#d9dbdd] bg-[#f6f6f7] text-[#6d7175]"
                            : notification.tone ===
                                "red"
                              ? "border-red-400/20 bg-red-400/[0.07] text-red-300"
                              : notification.tone ===
                                  "blue"
                                ? "border-sky-400/20 bg-sky-400/[0.07] text-sky-300"
                                : "border-white/10 bg-white/[0.04] text-white/55"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-semibold">
                            {
                              notification.title
                            }
                          </p>

                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/25 transition group-hover:text-white" />
                        </div>

                        <p className="mt-2 text-xs leading-5 text-white/40">
                          {
                            notification.description
                          }
                        </p>

                        <span className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35 transition group-hover:text-white">
                          Open exact item

                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          </div>
        )}

        <div className="st-admin-v2-notifications-footer border-t px-5 py-3">
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">
            Click a notification to open
            its exact admin record
          </p>
        </div>
      </div>
    </div>
  );
}
