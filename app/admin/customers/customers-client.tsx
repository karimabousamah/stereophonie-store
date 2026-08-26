"use client";

import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Search,
  ShoppingBag,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import AdminAccessControl from "./admin-access-control";

export type AdminCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  orderCount: number;
  activeOrderCount: number;
  totalOrderValue: number;
  lastOrderAt: string | null;
  addressCount: number;
  defaultAddress: string | null;
  stockNotificationsEnabled: boolean;

  /*
   * Administrative access.
   */
  isAdmin: boolean;
  adminRole: string | null;
  isCurrentUser: boolean;
};

type CustomersClientProps = {
  customers: AdminCustomer[];
  dataError?: string | null;
};

type CustomerFilter =
  "all" | "ordered" | "recent" | "unconfirmed" | "stock-disabled";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date);
}

function getInitials(firstName: string, lastName: string, email: string) {
  const firstInitial = firstName.trim().charAt(0);

  const lastInitial = lastName.trim().charAt(0);

  const combined = `${firstInitial}${lastInitial}`.trim().toUpperCase();

  if (combined) {
    return combined;
  }

  return email.trim().charAt(0).toUpperCase();
}

function signedInRecently(value: string | null) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  return Date.now() - timestamp <= thirtyDays;
}

export default function CustomersClient({
  customers,
  dataError,
}: CustomersClientProps) {
  const [query, setQuery] = useState("");

  const [filter, setFilter] = useState<CustomerFilter>("all");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const searchableText = [
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phone,
        customer.defaultAddress ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !normalizedQuery || searchableText.includes(normalizedQuery);

      if (!matchesQuery) {
        return false;
      }

      if (filter === "ordered") {
        return customer.orderCount > 0;
      }

      if (filter === "recent") {
        return signedInRecently(customer.lastSignInAt);
      }

      if (filter === "unconfirmed") {
        return !customer.emailConfirmed;
      }

      if (filter === "stock-disabled") {
        return !customer.stockNotificationsEnabled;
      }

      return true;
    });
  }, [customers, filter, normalizedQuery]);

  const totalOrderValue = customers.reduce(
    (total, customer) => total + customer.totalOrderValue,
    0,
  );

  const customersWithOrders = customers.filter(
    (customer) => customer.orderCount > 0,
  ).length;

  const recentCustomers = customers.filter((customer) =>
    signedInRecently(customer.lastSignInAt),
  ).length;

  const confirmedCustomers = customers.filter(
    (customer) => customer.emailConfirmed,
  ).length;

  return (
    <div className="px-5 py-5 sm:px-7 sm:py-7">
      <div className="mx-auto max-w-[1540px]">
        <header className="border-b border-white/10 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
            Customer management
          </p>

          <h1 className="mt-3 text-2xl font-semibold uppercase tracking-[-0.045em] sm:text-4xl">
            Customers
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">
            Review registered customer accounts, contact information, saved
            addresses, order activity, and stock-email preferences.
          </p>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-white/10 bg-[#0d0d0d] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Registered
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  {customers.length}
                </p>

                <p className="mt-2 text-sm text-white/35">Customer accounts</p>
              </div>

              <Users className="h-5 w-5 text-white/30" />
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#0d0d0d] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Confirmed
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  {confirmedCustomers}
                </p>

                <p className="mt-2 text-sm text-white/35">Verified emails</p>
              </div>

              <UserCheck className="h-5 w-5 text-white/30" />
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#0d0d0d] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Purchased
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  {customersWithOrders}
                </p>

                <p className="mt-2 text-sm text-white/35">
                  Customers with orders
                </p>
              </div>

              <ShoppingBag className="h-5 w-5 text-white/30" />
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#0d0d0d] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Order value
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  {formatCurrency(totalOrderValue)}
                </p>

                <p className="mt-2 text-sm text-white/35">
                  Non-cancelled orders
                </p>
              </div>

              <CheckCircle2 className="h-5 w-5 text-white/30" />
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
          <div className="grid gap-4 border-b border-white/10 p-5 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email, phone or address"
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/35"
              />
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as CustomerFilter)
              }
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none transition focus:border-white/35"
            >
              <option value="all">All customers</option>

              <option value="ordered">Customers with orders</option>

              <option value="recent">Active in last 30 days</option>

              <option value="unconfirmed">Unconfirmed emails</option>

              <option value="stock-disabled">Stock emails disabled</option>
            </select>

            <div className="flex min-h-11 items-center justify-center border border-white/10 px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {filteredCustomers.length} shown
            </div>
          </div>

          {dataError ? (
            <div className="border-b border-red-400/20 bg-red-400/[0.07] px-5 py-4 text-sm text-red-200">
              {dataError}
            </div>
          ) : null}

          {filteredCustomers.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center border border-white/15 bg-white/[0.04]">
                <Users className="h-7 w-7 text-white/40" />
              </div>

              <h2 className="mt-5 text-2xl font-semibold">
                No customers found
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
                No registered customer matches the current search and filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1430px] w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    {[
                      "Customer",
                      "Contact",
                      "Account activity",
                      "Orders",
                      "Delivery",
                      "Stock emails",
                      "Access",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {filteredCustomers.map((customer) => {
                    const displayName =
                      [customer.firstName, customer.lastName]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || "Customer";

                    return (
                      <tr
                        key={customer.id}
                        className="align-top transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-5">
                          <div className="flex gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/[0.04] text-xs font-semibold uppercase tracking-[0.12em]">
                              {getInitials(
                                customer.firstName,
                                customer.lastName,
                                customer.email,
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-white">
                                {displayName}
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <span
                                  className={`inline-flex border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.13em] ${
                                    customer.emailConfirmed
                                      ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                                      : "border-amber-400/25 bg-amber-400/[0.08] text-amber-300"
                                  }`}
                                >
                                  {customer.emailConfirmed
                                    ? "Verified"
                                    : "Unconfirmed"}
                                </span>
                              </div>

                              <p className="mt-3 text-xs text-white/30">
                                Joined {formatDate(customer.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <a
                            href={`mailto:${customer.email}`}
                            className="flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
                          >
                            <Mail className="h-4 w-4 shrink-0 text-white/30" />

                            <span className="max-w-[240px] truncate">
                              {customer.email}
                            </span>
                          </a>

                          {customer.phone ? (
                            <a
                              href={`tel:${customer.phone.replace(/\s/g, "")}`}
                              className="mt-3 block text-sm text-white/40 transition hover:text-white"
                            >
                              {customer.phone}
                            </a>
                          ) : (
                            <p className="mt-3 text-sm text-white/25">
                              No phone number
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2 text-sm text-white/65">
                            <Clock3 className="h-4 w-4 text-white/30" />

                            {formatDate(customer.lastSignInAt)}
                          </div>

                          <p className="mt-3 text-xs leading-5 text-white/30">
                            {signedInRecently(customer.lastSignInAt)
                              ? "Active within 30 days"
                              : "No recent sign-in"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="text-sm font-semibold text-white">
                            {customer.orderCount}{" "}
                            {customer.orderCount === 1 ? "order" : "orders"}
                          </p>

                          <p className="mt-2 text-sm text-white/50">
                            {formatCurrency(customer.totalOrderValue)}
                          </p>

                          <p className="mt-2 text-xs text-white/30">
                            {customer.activeOrderCount > 0
                              ? `${customer.activeOrderCount} active`
                              : customer.lastOrderAt
                                ? `Last ${formatDate(customer.lastOrderAt)}`
                                : "No purchases yet"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />

                            <div>
                              <p className="text-sm text-white/65">
                                {customer.addressCount}{" "}
                                {customer.addressCount === 1
                                  ? "address"
                                  : "addresses"}
                              </p>

                              <p className="mt-2 max-w-[220px] text-xs leading-5 text-white/30">
                                {customer.defaultAddress ??
                                  "No saved delivery address"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                              customer.stockNotificationsEnabled
                                ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                                : "border-white/10 bg-white/[0.04] text-white/35"
                            }`}
                          >
                            {customer.stockNotificationsEnabled ? (
                              <Bell className="h-3.5 w-3.5" />
                            ) : (
                              <BellOff className="h-3.5 w-3.5" />
                            )}

                            {customer.stockNotificationsEnabled
                              ? "Enabled"
                              : "Disabled"}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <AdminAccessControl
                            userId={customer.id}
                            initialIsAdmin={customer.isAdmin}
                            adminRole={customer.adminRole}
                            isCurrentUser={customer.isCurrentUser}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs text-white/25">
          {recentCustomers} customer
          {recentCustomers === 1 ? "" : "s"} signed in during the last 30 days.
        </p>
      </div>
    </div>
  );
}
