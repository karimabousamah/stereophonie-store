"use client";

import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import AdminNotificationsButton from "@/components/admin/admin-notifications-button";
import {
  Bell,
  BellRing,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  Home,
  LayoutDashboard,
  PackageCheck,
  PanelsTopLeft,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  TicketPercent,
  TrendingUp,
  Users,
} from "lucide-react";

type AdminShellProps = {
  children: ReactNode;
  role: string;
  pageTitle: string;
  pageDescription?: string;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: ElementType;
};

type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

const navigation: NavigationGroup[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Catalog",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: ShoppingBag,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: Tags,
      },
      {
        label: "Brands",
        href: "/admin/brands",
        icon: Tags,
      },
      {
        label: "Homepage",
        href: "/admin/homepage",
        icon: PanelsTopLeft,
      },
    ],
  },
  {
    title: "Sales",
    items: [
      {
        label: "Orders",
        href: "/admin/orders",
        icon: PackageCheck,
      },
      {
        label: "Best Selling",
        href: "/admin/best-selling",
        icon: TrendingUp,
      },
      {
        label: "Stock alerts",
        href: "/admin/stock-alerts",
        icon: BellRing,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
      },
      {
        label: "Coupons",
        href: "/admin/coupons",
        icon: TicketPercent,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

function AdminNavigation({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 overflow-y-auto px-4 py-6">
      <div className="space-y-8">
        {navigation.map((group) => (
          <section key={group.title}>
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/35">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`st3-admin-nav-link group relative flex items-center justify-between overflow-hidden rounded-2xl px-3 py-3 text-sm transition duration-300 ${
                      isActive
                        ? "is-active bg-[#fff3da] text-[#7c4d00]"
                        : "text-black/55 hover:bg-[#f5f5f7] hover:text-black"
                    }`}
                  >
                    {isActive ? (
                      <motion.div
                        layoutId="active-admin-navigation"
                        className="absolute inset-0 rounded-2xl border border-[#f5b335]/35 bg-[#fff3da] shadow-[0_8px_24px_rgba(168,103,0,0.08)]"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 35,
                        }}
                      />
                    ) : null}

                    <span className="relative z-10 flex items-center gap-3">
                      <Icon className="h-[18px] w-[18px]" />

                      <span className="font-medium">{item.label}</span>
                    </span>

                    <ChevronRight
                      className={`relative z-10 h-4 w-4 transition duration-300 ${
                        isActive
                          ? "opacity-60"
                          : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}

export default function AdminShell({
  children,
  role,
  pageTitle,
  pageDescription,
}: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="st3-admin-shell min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="st3-admin-shell-grid relative min-h-screen">
        <aside className="st3-admin-sidebar fixed inset-y-0 left-0 z-40 flex h-screen w-[280px] flex-col border-r border-black/[0.08] bg-white">
          <div className="border-b border-black/[0.08] px-7 py-7">
            <Link
              href="/admin"
              className="st-admin-sidebar-brand"
              aria-label="Stereophonie administration"
            >
              <img
                src="/brand/stereophonie-store-logo.png"
                alt="Stereophonie"
                className="st-admin-sidebar-brand__logo"
              />

              <span className="st-admin-sidebar-brand__subtitle">
                Commerce administration
              </span>
            </Link>
          </div>

          <AdminNavigation pathname={pathname} />

          <div className="border-t border-black/[0.08] p-4">
            <Link
              href="/"
              target="_blank"
              className="group mb-3 flex items-center justify-between rounded-2xl border border-black/[0.09] bg-[#f7f7f8] px-4 py-3 text-sm text-black/55 transition hover:border-[#f5b335]/45 hover:bg-[#fff8e9] hover:text-black"
            >
              <span className="flex items-center gap-3">
                <Store className="h-[18px] w-[18px]" />
                View storefront
              </span>

              <ExternalLink className="h-4 w-4 opacity-40 transition group-hover:opacity-100" />
            </Link>

            <div className="flex items-center gap-3 px-2 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f5b335]/35 bg-[#fff3da]">
                <CircleUserRound className="h-5 w-5 text-[#8a5800]" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Administrator</p>

                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                  {role}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="st3-admin-content min-w-0">
          <header className="st3-admin-toolbar sticky top-0 z-30 border-b border-black/[0.08] bg-white/90 backdrop-blur-xl">
            <div className="flex min-h-[82px] items-center justify-between gap-5 px-8">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
                  <Home className="h-3 w-3" />

                  <span>Admin</span>

                  <ChevronRight className="h-3 w-3" />

                  <span className="truncate text-black/55">{pageTitle}</span>
                </div>

                <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.025em]">
                  {pageTitle}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-600/15 bg-emerald-50 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />

                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Store operational
                  </span>
                </div>

                <AdminNotificationsButton />
              </div>
            </div>

            {pageDescription ? (
              <div className="border-t border-black/[0.06] px-8 py-3 text-sm text-black/45">
                {pageDescription}
              </div>
            ) : null}
          </header>

          <main className="st3-admin-main min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
