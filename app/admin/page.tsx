"use server";

import { redirect } from "next/navigation";

import DashboardClient from "@/components/admin/dashboard-client";
import { createClient } from "@/lib/supabase/server";

import DashboardLivePerformance from "@/components/admin/dashboard-live-performance";
type RevenueOrder = {
  id: string;
  total: number | null;
  created_at: string;
};

type ProductWithImages = {
  id: string;
  product_images:
    | {
        id: string;
      }[]
    | null;
};

type DraftProduct = {
  id: string;
  created_at: string;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isoDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default async function AdminDashboardPage() {
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

  const now = new Date();

  const currentPeriodStart = startOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
  );

  const previousPeriodStart = startOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59),
  );

  const forgottenDraftBoundary = new Date(
    now.getTime() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    liveProductsResult,
    draftProductsResult,
    pendingOrdersResult,
    completedOrdersResult,
    allPaidOrdersResult,
    lowStockVariantsResult,
    pendingStockAlertsResult,

    missingCategoryResult,
    missingBrandResult,
    publishedMediaResult,
    oldDraftsResult,

    recentPaidOrdersResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "published"),

    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "draft"),

    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "completed"),

    supabase
      .from("orders")
      .select("id, total, created_at")
      .eq("payment_status", "paid")
      .neq("status", "cancelled"),

    supabase
      .from("product_variants")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("availability_status", ["low_stock", "out_of_stock"]),

    supabase
      .from("stock_alerts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    // Catalogue health — not order/stock duplication.
    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "published")
      .is("category_id", null),

    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "published")
      .is("brand_id", null),

    supabase
      .from("products")
      .select(
        `
          id,
          product_images (
            id
          )
        `,
      )
      .eq("status", "published"),

    supabase
      .from("products")
      .select("id, created_at")
      .eq("status", "draft")
      .lt("created_at", forgottenDraftBoundary),

    supabase
      .from("orders")
      .select("id, total, created_at")
      .eq("payment_status", "paid")
      .neq("status", "cancelled")
      .gte("created_at", previousPeriodStart.toISOString())
      .order("created_at", {
        ascending: true,
      }),
  ]);

  const liveProducts = liveProductsResult.count ?? 0;

  const draftProducts = draftProductsResult.count ?? 0;

  const pendingOrders = pendingOrdersResult.count ?? 0;

  const completedOrders = completedOrdersResult.count ?? 0;

  const lowStockVariants = lowStockVariantsResult.count ?? 0;

  const pendingStockAlerts = pendingStockAlertsResult.count ?? 0;

  const revenue = (allPaidOrdersResult.data ?? []).reduce(
    (total, order) => total + Number(order.total ?? 0),
    0,
  );

  const missingCategory = missingCategoryResult.count ?? 0;

  const missingBrand = missingBrandResult.count ?? 0;

  const productsWithoutImages = (
    (publishedMediaResult.data ?? []) as ProductWithImages[]
  ).filter(
    (product) => !product.product_images || product.product_images.length === 0,
  ).length;

  const oldDrafts = ((oldDraftsResult.data ?? []) as DraftProduct[]).length;

  const paidOrders = (recentPaidOrdersResult.data ?? []) as RevenueOrder[];

  const currentOrders = paidOrders.filter(
    (order) => new Date(order.created_at) >= currentPeriodStart,
  );

  const previousOrders = paidOrders.filter((order) => {
    const createdAt = new Date(order.created_at);

    return createdAt >= previousPeriodStart && createdAt < currentPeriodStart;
  });

  const currentRevenue = currentOrders.reduce(
    (total, order) => total + Number(order.total ?? 0),
    0,
  );

  const previousRevenue = previousOrders.reduce(
    (total, order) => total + Number(order.total ?? 0),
    0,
  );

  const currentOrderCount = currentOrders.length;
  const previousOrderCount = previousOrders.length;

  const averageOrderValue =
    currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;

  const previousAverageOrderValue =
    previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

  const revenueChange =
    previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0
        ? 100
        : 0;

  const orderChange =
    previousOrderCount > 0
      ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100
      : currentOrderCount > 0
        ? 100
        : 0;

  const averageOrderChange =
    previousAverageOrderValue > 0
      ? ((averageOrderValue - previousAverageOrderValue) /
          previousAverageOrderValue) *
        100
      : averageOrderValue > 0
        ? 100
        : 0;

  const dailyRevenueMap = new Map<
    string,
    {
      revenue: number;
      orders: number;
    }
  >();

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - offset,
    );

    dailyRevenueMap.set(isoDateKey(date), {
      revenue: 0,
      orders: 0,
    });
  }

  for (const order of currentOrders) {
    const key = isoDateKey(order.created_at);
    const existing = dailyRevenueMap.get(key);

    if (!existing) {
      continue;
    }

    existing.revenue += Number(order.total ?? 0);

    existing.orders += 1;
  }

  const dailyPerformance = Array.from(dailyRevenueMap.entries()).map(
    ([date, values]) => ({
      date,
      revenue: Number(values.revenue.toFixed(2)),
      orders: values.orders,
    }),
  );

  return (
    <DashboardClient
      role={admin.role}
      paidOrders={allPaidOrdersResult.data ?? []}
      statistics={{
        liveProducts,
        draftProducts,
        pendingOrders,
        completedOrders,
        revenue,
        lowStockVariants,
        pendingStockAlerts,
      }}
      catalogueHealth={{
        missingCategory,
        missingBrand,
        productsWithoutImages,
        oldDrafts,
      }}
      performance={{
        currentRevenue,
        currentOrderCount,
        averageOrderValue,
        revenueChange,
        orderChange,
        averageOrderChange,
        daily: dailyPerformance,
      }}
    />
  );
}
