import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Percent,
  TicketPercent,
  ToggleLeft,
  Users,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

import { createCoupon } from "./actions";
import CouponEditor from "./coupon-editor";

type CouponsPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type CouponRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_subtotal: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  first_order_only: boolean;
  max_redemptions: number | null;
  max_redemptions_per_customer: number | null;
  created_at: string;
  updated_at: string;
};

type RedemptionRow = {
  coupon_id: string;
  released_at: string | null;
};

type CouponState = "active" | "scheduled" | "expired" | "disabled";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getCouponState(coupon: CouponRow): CouponState {
  if (!coupon.is_active) {
    return "disabled";
  }

  const now = Date.now();

  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return "scheduled";
  }

  if (coupon.ends_at && new Date(coupon.ends_at).getTime() <= now) {
    return "expired";
  }

  return "active";
}

function getStateDetails(state: CouponState) {
  switch (state) {
    case "active":
      return {
        label: "Active",
        icon: CheckCircle2,
        className:
          "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
      };

    case "scheduled":
      return {
        label: "Scheduled",
        icon: Clock3,
        className: "border-blue-400/25 bg-blue-400/[0.08] text-blue-300",
      };

    case "expired":
      return {
        label: "Expired",
        icon: XCircle,
        className: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
      };

    default:
      return {
        label: "Disabled",
        icon: ToggleLeft,
        className: "border-white/10 bg-white/[0.04] text-white/40",
      };
  }
}

function getDiscountLabel(coupon: CouponRow) {
  if (coupon.discount_type === "percentage") {
    return `${Number(coupon.discount_value)}% off`;
  }

  return `${money(coupon.discount_value)} off`;
}

export default async function CouponsPage({ searchParams }: CouponsPageProps) {
  const params = (await searchParams) ?? {};

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login");
  }

  const [couponsResponse, redemptionsResponse] = await Promise.all([
    supabase
      .from("coupons")
      .select(
        `
        id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        minimum_subtotal,
        max_discount_amount,
        starts_at,
        ends_at,
        is_active,
        first_order_only,
        max_redemptions,
        max_redemptions_per_customer,
        created_at,
        updated_at
      `,
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase.from("coupon_redemptions").select(`
        coupon_id,
        released_at
      `),
  ]);

  if (couponsResponse.error) {
    console.error("Coupons query error:", couponsResponse.error);
  }

  if (redemptionsResponse.error) {
    console.error("Coupon redemptions query error:", redemptionsResponse.error);
  }

  const coupons = (couponsResponse.data ?? []) as CouponRow[];

  const redemptions = (redemptionsResponse.data ?? []) as RedemptionRow[];

  const redemptionCounts = redemptions.reduce<Record<string, number>>(
    (counts, redemption) => {
      if (redemption.released_at) {
        return counts;
      }

      counts[redemption.coupon_id] = (counts[redemption.coupon_id] ?? 0) + 1;

      return counts;
    },
    {},
  );

  const activeCoupons = coupons.filter(
    (coupon) => getCouponState(coupon) === "active",
  ).length;

  const scheduledCoupons = coupons.filter(
    (coupon) => getCouponState(coupon) === "scheduled",
  ).length;

  const totalRedemptions = Object.values(redemptionCounts).reduce(
    (total, count) => total + count,
    0,
  );

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Coupons"
      pageDescription="Create promotional codes, schedule campaigns and control discount usage."
    >
      <div className="px-4 py-7 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1540px]">
          {params.success ? (
            <div className="mb-6 border border-emerald-400/25 bg-emerald-400/[0.08] px-5 py-4 text-sm text-emerald-200">
              {params.success}
            </div>
          ) : null}

          {params.error ? (
            <div className="mb-6 border border-red-400/25 bg-red-400/[0.08] px-5 py-4 text-sm text-red-200">
              {params.error}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-3">
            <div className="border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Active coupons
                </p>

                <TicketPercent className="h-5 w-5 text-emerald-300" />
              </div>

              <p className="mt-6 text-4xl font-semibold tracking-[-0.04em]">
                {activeCoupons}
              </p>
            </div>

            <div className="border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Scheduled
                </p>

                <CalendarDays className="h-5 w-5 text-blue-300" />
              </div>

              <p className="mt-6 text-4xl font-semibold tracking-[-0.04em]">
                {scheduledCoupons}
              </p>
            </div>

            <div className="border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Total uses
                </p>

                <Users className="h-5 w-5 text-violet-300" />
              </div>

              <p className="mt-6 text-4xl font-semibold tracking-[-0.04em]">
                {totalRedemptions}
              </p>
            </div>
          </section>

          <section className="mt-7 grid gap-7 xl:grid-cols-[430px_minmax(0,1fr)]">
            <div className="border border-white/10 bg-[#0d0d0d]">
              <div className="border-b border-white/10 px-5 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  New promotion
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  Create coupon
                </h2>
              </div>

              <form action={createCoupon} className="space-y-5 p-5">
                <div>
                  <label
                    htmlFor="coupon-name"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                  >
                    Internal name
                  </label>

                  <input
                    id="coupon-name"
                    name="name"
                    type="text"
                    placeholder="Summer promotion"
                    className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="coupon-code"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                  >
                    Coupon code
                  </label>

                  <input
                    id="coupon-code"
                    name="code"
                    type="text"
                    placeholder="SUMMER20"
                    autoCapitalize="characters"
                    className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm uppercase tracking-[0.12em] text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="coupon-description"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                  >
                    Description
                  </label>

                  <textarea
                    id="coupon-description"
                    name="description"
                    placeholder="Optional internal campaign description"
                    className="mt-2 min-h-24 w-full resize-y border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="discount-type"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                    >
                      Discount type
                    </label>

                    <select
                      id="discount-type"
                      name="discount_type"
                      defaultValue="percentage"
                      className="mt-2 min-h-12 w-full border border-white/10 bg-[#111111] px-4 text-sm text-white outline-none transition focus:border-white/40"
                    >
                      <option value="percentage">Percentage</option>

                      <option value="fixed">Fixed amount</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="discount-value"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                    >
                      Discount value
                    </label>

                    <input
                      id="discount-value"
                      name="discount_value"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="20"
                      className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="minimum-subtotal"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                    >
                      Minimum subtotal
                    </label>

                    <input
                      id="minimum-subtotal"
                      name="minimum_subtotal"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                      className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-white/40"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="maximum-discount"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                    >
                      Maximum discount
                    </label>

                    <input
                      id="maximum-discount"
                      name="max_discount_amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Optional"
                      className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="starts-at"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                    >
                      Starts
                    </label>

                    <input
                      id="starts-at"
                      name="starts_at"
                      type="datetime-local"
                      className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-white/40"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ends-at"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                    >
                      Expires
                    </label>

                    <input
                      id="ends-at"
                      name="ends_at"
                      type="datetime-local"
                      className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-white/40"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="max-redemptions"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                    >
                      Total usage limit
                    </label>

                    <input
                      id="max-redemptions"
                      name="max_redemptions"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Unlimited"
                      className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-limit"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45"
                    >
                      Uses per customer
                    </label>

                    <input
                      id="customer-limit"
                      name="max_redemptions_per_customer"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Unlimited"
                      className="mt-2 min-h-12 w-full border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 border border-white/10 bg-white/[0.025] p-4">
                  <input
                    name="first_order_only"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-white"
                  />

                  <span>
                    <span className="block text-sm font-medium">
                      First order only
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-white/35">
                      Restrict this coupon to customers without a previous
                      non-cancelled order.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 border border-white/10 bg-white/[0.025] p-4">
                  <input
                    name="is_active"
                    type="checkbox"
                    defaultChecked
                    className="mt-0.5 h-4 w-4 accent-white"
                  />

                  <span>
                    <span className="block text-sm font-medium">
                      Active after creation
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-white/35">
                      Schedule dates still determine when customers may apply
                      it.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  className="flex min-h-14 w-full items-center justify-center gap-3 bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/85"
                >
                  <TicketPercent className="h-4 w-4" />
                  Create coupon
                </button>
              </form>
            </div>

            <div className="min-w-0 border border-white/10 bg-[#0d0d0d]">
              <div className="flex items-center justify-between gap-5 border-b border-white/10 px-5 py-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                    Promotion library
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    Existing coupons
                  </h2>
                </div>

                <span className="border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  {coupons.length} total
                </span>
              </div>

              {coupons.length === 0 ? (
                <div className="flex min-h-[500px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center border border-white/10 bg-white/[0.035]">
                    <TicketPercent className="h-7 w-7 text-white/35" />
                  </div>

                  <h3 className="mt-6 text-2xl font-semibold">
                    No coupons yet
                  </h3>

                  <p className="mt-3 max-w-md text-sm leading-7 text-white/35">
                    Create your first promotional code using the form.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {coupons.map((coupon) => {
                    const state = getCouponState(coupon);

                    const stateDetails = getStateDetails(state);

                    const StateIcon = stateDetails.icon;

                    const usedCount = redemptionCounts[coupon.id] ?? 0;

                    return (
                      <article key={coupon.id} className="p-5 sm:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="border border-white/20 bg-white/[0.05] px-3 py-2 font-mono text-sm font-semibold uppercase tracking-[0.12em]">
                                {coupon.code}
                              </span>

                              <span
                                className={`inline-flex items-center gap-2 border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] ${stateDetails.className}`}
                              >
                                <StateIcon className="h-3.5 w-3.5" />
                                {stateDetails.label}
                              </span>
                            </div>

                            <h3 className="mt-5 text-xl font-semibold">
                              {coupon.name}
                            </h3>

                            {coupon.description ? (
                              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                                {coupon.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-left lg:text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                              Discount
                            </p>

                            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                              {getDiscountLabel(coupon)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="border border-white/10 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-2 text-white/35">
                              <BadgeDollarSign className="h-4 w-4" />

                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                                Minimum
                              </p>
                            </div>

                            <p className="mt-3 text-sm font-semibold">
                              {money(coupon.minimum_subtotal)}
                            </p>
                          </div>

                          <div className="border border-white/10 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-2 text-white/35">
                              {coupon.discount_type === "percentage" ? (
                                <Percent className="h-4 w-4" />
                              ) : (
                                <BadgeDollarSign className="h-4 w-4" />
                              )}

                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                                Maximum
                              </p>
                            </div>

                            <p className="mt-3 text-sm font-semibold">
                              {coupon.max_discount_amount === null
                                ? "No cap"
                                : money(coupon.max_discount_amount)}
                            </p>
                          </div>

                          <div className="border border-white/10 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-2 text-white/35">
                              <Users className="h-4 w-4" />

                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                                Usage
                              </p>
                            </div>

                            <p className="mt-3 text-sm font-semibold">
                              {usedCount}
                              {coupon.max_redemptions
                                ? ` / ${coupon.max_redemptions}`
                                : " uses"}
                            </p>
                          </div>

                          <div className="border border-white/10 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-2 text-white/35">
                              <CalendarDays className="h-4 w-4" />

                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                                Customer limit
                              </p>
                            </div>

                            <p className="mt-3 text-sm font-semibold">
                              {coupon.max_redemptions_per_customer ??
                                "Unlimited"}
                            </p>
                          </div>
                        </div>

                        {coupon.first_order_only ? (
                          <div className="mt-4 border border-violet-400/20 bg-violet-400/[0.06] px-4 py-3 text-xs text-violet-200">
                            Restricted to first-time customers.
                          </div>
                        ) : null}

                        <div className="mt-6">
                          <CouponEditor coupon={coupon} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
