"use client";

import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import AdminNotificationsButton from "@/components/admin/admin-notifications-button";
import {
  Bell,
  BellRing,
  Boxes,
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
    title: "Commerce",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: ShoppingBag,
      },
      {
        label: "Orders",
        href: "/admin/orders",
        icon: PackageCheck,
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
    ],
  },
  {
    title: "Merchandising",
    items: [
      {
        label: "Collections",
        href: "/admin/collections",
        icon: Boxes,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: Tags,
      },
      {
        label: "Coupons",
        href: "/admin/coupons",
        icon: TicketPercent,
      },
      {
        label: "Homepage",
        href: "/admin/homepage",
        icon: PanelsTopLeft,
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
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
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
                    className={`group relative flex items-center justify-between overflow-hidden px-3 py-3 text-sm transition duration-300 ${
                      isActive
                        ? "bg-white text-black"
                        : "text-white/55 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {isActive ? (
                      <motion.div
                        layoutId="active-admin-navigation"
                        className="absolute inset-0 bg-white"
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
    <div className="min-h-screen bg-[#080808] text-white">
      <div
        className="relative grid min-h-screen"
        style={{
          gridTemplateColumns: "280px minmax(0, 1fr)",
        }}
      >
        <aside className="sticky top-0 flex h-screen flex-col border-r border-white/10 bg-[#0b0b0b]">
          <div className="border-b border-white/10 px-7 py-7">
            <Link href="/admin" className="inline-flex">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.26em]">
                  Stereophonie
                </p>

                <p className="mt-1 text-xs text-white/35">
                  Commerce administration
                </p>
              </div>
            </Link>
          </div>

          <AdminNavigation pathname={pathname} />

          <div className="border-t border-white/10 p-4">
            <Link
              href="/"
              target="_blank"
              className="group mb-3 flex items-center justify-between border border-white/10 px-4 py-3 text-sm text-white/55 transition hover:border-white/25 hover:bg-white/[0.04] hover:text-white"
            >
              <span className="flex items-center gap-3">
                <Store className="h-[18px] w-[18px]" />
                View storefront
              </span>

              <ExternalLink className="h-4 w-4 opacity-40 transition group-hover:opacity-100" />
            </Link>

            <div className="flex items-center gap-3 px-2 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.05]">
                <CircleUserRound className="h-5 w-5 text-white/60" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Administrator</p>

                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {role}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080808]/95 backdrop-blur-xl">
            <div className="flex min-h-[82px] items-center justify-between gap-5 px-8">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                  <Home className="h-3 w-3" />

                  <span>Admin</span>

                  <ChevronRight className="h-3 w-3" />

                  <span className="truncate text-white/55">{pageTitle}</span>
                </div>

                <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.025em]">
                  {pageTitle}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />

                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    Store operational
                  </span>
                </div>

                <AdminNotificationsButton />
              </div>
            </div>

            {pageDescription ? (
              <div className="border-t border-white/[0.06] px-8 py-3 text-sm text-white/40">
                {pageDescription}
              </div>
            ) : null}
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
