"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  ImageOff,
  Layers3,
  Package,
  ReceiptText,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";

import DashboardLivePerformance from "@/components/admin/dashboard-live-performance";
type Statistics = {
  liveProducts: number;
  draftProducts: number;
  pendingOrders: number;
  completedOrders: number;
  revenue: number;
  lowStockVariants: number;
  pendingStockAlerts: number;
};

type CatalogueHealth = {
  missingCategory: number;
  missingBrand: number;
  productsWithoutImages: number;
  oldDrafts: number;
};

type PerformancePoint = {
  date: string;
  revenue: number;
  orders: number;
};

type Performance = {
  currentRevenue: number;
  currentOrderCount: number;
  averageOrderValue: number;
  revenueChange: number;
  orderChange: number;
  averageOrderChange: number;
  daily: PerformancePoint[];
};

type Props = {
  paidOrders: Array<{ id?: string; total: number | string | null; created_at: string }>;
  role: string;
  statistics: Statistics;
  catalogueHealth: CatalogueHealth;
  performance: Performance;
};

function money(value: number) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function changeText(value: number) {
  const absolute =
    Math.abs(value);

  return `${value >= 0 ? "+" : "-"}${absolute.toFixed(1)}%`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
  description: string;
  tone:
    | "green"
    | "blue"
    | "orange"
    | "rose"
    | "violet";
}) {
  return (
    <article
      className={`st-dash-intel-metric is-${tone}`}
    >
      <div className="st-dash-intel-metric__icon">
        <Icon />
      </div>

      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>
    </article>
  );
}

function PerformanceStat({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: number;
}) {
  const positive =
    change >= 0;

  const ChangeIcon =
    positive
      ? TrendingUp
      : TrendingDown;

  return (
    <div className="st-dash-performance-stat">
      <span>{label}</span>

      <strong>{value}</strong>

      <small
        className={
          positive
            ? "is-positive"
            : "is-negative"
        }
      >
        <ChangeIcon />
        {changeText(change)}
        <em>vs previous 30 days</em>
      </small>
    </div>
  );
}

function RevenueChart({
  points,
}: {
  points: PerformancePoint[];
}) {
  const width = 900;
  const height = 260;
  const paddingX = 8;
  const paddingY = 18;

  const maximum = Math.max(
    1,
    ...points.map(
      (point) =>
        point.revenue,
    ),
  );

  const usableWidth =
    width - paddingX * 2;

  const usableHeight =
    height - paddingY * 2;

  const coordinates =
    points.map(
      (point, index) => {
        const x =
          points.length <= 1
            ? paddingX
            : paddingX +
              (index /
                (points.length - 1)) *
                usableWidth;

        const y =
          height -
          paddingY -
          (point.revenue / maximum) *
            usableHeight;

        return {
          x,
          y,
          point,
        };
      },
    );

  const linePoints =
    coordinates
      .map(
        ({ x, y }) =>
          `${x.toFixed(2)},${y.toFixed(2)}`,
      )
      .join(" ");

  const areaPoints = [
    `${paddingX},${height - paddingY}`,
    ...coordinates.map(
      ({ x, y }) =>
        `${x.toFixed(2)},${y.toFixed(2)}`,
    ),
    `${width - paddingX},${height - paddingY}`,
  ].join(" ");

  const hasRevenue =
    points.some(
      (point) =>
        point.revenue > 0,
    );

  return (
    <div className="st-dash-chart">
      <div className="st-dash-chart__top">
        <div>
          <span>Revenue movement</span>
          <strong>Last 30 days</strong>
        </div>

        <div className="st-dash-chart__legend">
          <i />
          Paid revenue
        </div>
      </div>

      <div className="st-dash-chart__canvas">
        <div
          className="st-dash-chart__grid"
          aria-hidden="true"
        />

        {hasRevenue ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Paid revenue over the last 30 days"
          >
            <defs>
              <linearGradient
                id="st-dashboard-revenue-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#f5b335"
                  stopOpacity="0.22"
                />
                <stop
                  offset="100%"
                  stopColor="#f5b335"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            <polygon
              points={areaPoints}
              fill="url(#st-dashboard-revenue-fill)"
            />

            <polyline
              points={linePoints}
              fill="none"
              stroke="#d88d00"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {coordinates.map(
              ({
                x,
                y,
                point,
              }) =>
                point.revenue > 0 ? (
                  <circle
                    key={point.date}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#ffffff"
                    stroke="#d88d00"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>
                      {point.date}:{" "}
                      {money(
                        point.revenue,
                      )}
                    </title>
                  </circle>
                ) : null,
            )}
          </svg>
        ) : (
          <div className="st-dash-chart__empty">
            <BarChart3 />

            <strong>
              No paid sales yet
            </strong>

            <span>
              Revenue history will appear here as soon
              as paid orders are recorded.
            </span>
          </div>
        )}
      </div>

      <div className="st-dash-chart__axis">
        <span>
          {points[0]?.date
            ? new Date(
                `${points[0].date}T12:00:00`,
              ).toLocaleDateString(
                "en",
                {
                  month: "short",
                  day: "numeric",
                },
              )
            : ""}
        </span>

        <span>Today</span>
      </div>
    </div>
  );
}

export default function DashboardClient({
  paidOrders,
  role,
  statistics,
  catalogueHealth,
  performance,
}: Props) {
  const attentionItems = [
    {
      title: "Missing category",
      description:
        "Published products should belong to a clear storefront category.",
      count:
        catalogueHealth.missingCategory,
      icon: Layers3,
      href: "/admin/products",
    },
    {
      title: "Missing brand",
      description:
        "Add a manufacturer where applicable so products are easier to find.",
      count:
        catalogueHealth.missingBrand,
      icon: Tag,
      href: "/admin/products",
    },
    {
      title: "Missing photographs",
      description:
        "Published products without imagery can look incomplete to customers.",
      count:
        catalogueHealth.productsWithoutImages,
      icon: ImageOff,
      href: "/admin/products",
    },
    {
      title: "Old drafts",
      description:
        "Drafts untouched for more than 14 days may need completion or cleanup.",
      count:
        catalogueHealth.oldDrafts,
      icon: Boxes,
      href: "/admin/products",
    },
  ];

  const attentionCount =
    attentionItems.reduce(
      (total, item) =>
        total + item.count,
      0,
    );

  return (
    <AdminShell
      role={role}
      pageTitle="Dashboard"
      pageDescription="A concise view of store health, catalogue quality and business performance."
    >
      <main className="st-dash-intel">
        <section className="st-dash-intel-hero">
          <div>
            <span>
              Commerce overview
            </span>

            <h1>
              Store dashboard
            </h1>

            <p>
              A focused overview of your catalogue
              quality and recent commercial performance.
            </p>
          </div>

          <div className="st-dash-intel-hero__status">
            <i />
            Store operational
          </div>
        </section>

        <section className="st-dash-intel-section">
          <div className="st-dash-intel-section__heading">
            <div>
              <span>Key metrics</span>
              <h2>Today at a glance</h2>
            </div>
          </div>

          <div className="st-dash-intel-metrics">
            <MetricCard
              icon={Eye}
              label="Live products"
              value={String(
                statistics.liveProducts,
              )}
              description="Visible on the storefront"
              tone="green"
            />

            <MetricCard
              icon={Package}
              label="Draft products"
              value={String(
                statistics.draftProducts,
              )}
              description="Hidden from customers"
              tone="blue"
            />

            <MetricCard
              icon={ReceiptText}
              label="Orders"
              value={String(
                statistics.pendingOrders,
              )}
              description="Awaiting admin action"
              tone="orange"
            />

            <MetricCard
              icon={AlertTriangle}
              label="Stock alerts"
              value={String(
                statistics.pendingStockAlerts,
              )}
              description="Customers waiting for stock"
              tone="rose"
            />

            <MetricCard
              icon={CircleDollarSign}
              label="Revenue"
              value={money(
                statistics.revenue,
              )}
              description="Recorded paid revenue"
              tone="violet"
            />
          </div>
        </section>

        <section className="st-dash-intel-section">
          <div className="st-dash-intel-section__heading st-dash-intel-section__heading--split">
            <div>
              <span>
                Catalogue intelligence
              </span>

              <h2>
                What needs attention
              </h2>

              <p>
                Only catalogue-quality issues are shown
                here. Orders, stock alerts, customers and
                coupons remain in their dedicated sections.
              </p>
            </div>

            <div
              className={`st-dash-health-score ${
                attentionCount === 0
                  ? "is-clear"
                  : ""
              }`}
            >
              {attentionCount === 0 ? (
                <CheckCircle2 />
              ) : (
                <Sparkles />
              )}

              <div>
                <strong>
                  {attentionCount === 0
                    ? "Catalogue clear"
                    : `${attentionCount} ${
                        attentionCount === 1
                          ? "item"
                          : "items"
                      }`}
                </strong>

                <span>
                  {attentionCount === 0
                    ? "No catalogue issues detected"
                    : "Worth reviewing"}
                </span>
              </div>
            </div>
          </div>

          {attentionCount === 0 ? (
            <div className="st-dash-attention-clear">
              <div>
                <CheckCircle2 />
              </div>

              <strong>
                Everything looks organised.
              </strong>

              <p>
                Published products have the essential
                catalogue information we currently check.
              </p>
            </div>
          ) : (
            <div className="st-dash-attention-grid">
              {attentionItems.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <Link
                      href={item.href}
                      key={item.title}
                      className={`st-dash-attention-card ${
                        item.count === 0
                          ? "is-clear"
                          : ""
                      }`}
                    >
                      <div className="st-dash-attention-card__top">
                        <div className="st-dash-attention-card__icon">
                          <Icon />
                        </div>

                        <strong>
                          {item.count}
                        </strong>
                      </div>

                      <h3>
                        {item.title}
                      </h3>

                      <p>
                        {item.count === 0
                          ? "No issue detected."
                          : item.description}
                      </p>

                      <span>
                        {item.count === 0
                          ? "All clear"
                          : "Review products"}

                        {item.count > 0 ? (
                          <ArrowRight />
                        ) : (
                          <CheckCircle2 />
                        )}
                      </span>
                    </Link>
                  );
                },
              )}
            </div>
          )}
        </section>

        <DashboardLivePerformance orders={paidOrders} />
      </main>
    </AdminShell>
  );
}
