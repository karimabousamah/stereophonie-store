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
  paidOrders: Array<{
    id?: string;
    total: number | string | null;
    created_at: string;
  }>;
  role: string;
  statistics: Statistics;
  catalogueHealth: CatalogueHealth;
  performance: Performance;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function changeText(value: number) {
  const absolute = Math.abs(value);

  return `${value >= 0 ? "+" : "-"}${absolute.toFixed(1)}%`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone,
  href,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
  description: string;
  tone: "green" | "blue" | "orange" | "rose" | "violet";
  href?: string;
}) {
  const content = (
    <>
      <div className="st-dash-intel-metric__icon">
        <Icon />
      </div>

      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch
        className={`st-dash-intel-metric st-dash-intel-metric--link is-${tone}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className={`st-dash-intel-metric is-${tone}`}>
      {content}
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
  const positive = change >= 0;

  const ChangeIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="st-dash-performance-stat">
      <span>{label}</span>

      <strong>{value}</strong>

      <small className={positive ? "is-positive" : "is-negative"}>
        <ChangeIcon />
        {changeText(change)}
        <em>vs previous 30 days</em>
      </small>
    </div>
  );
}

function RevenueChart({ points }: { points: PerformancePoint[] }) {
  const width = 900;
  const height = 260;
  const paddingX = 8;
  const paddingY = 18;

  const maximum = Math.max(1, ...points.map((point) => point.revenue));

  const usableWidth = width - paddingX * 2;

  const usableHeight = height - paddingY * 2;

  const coordinates = points.map((point, index) => {
    const x =
      points.length <= 1
        ? paddingX
        : paddingX + (index / (points.length - 1)) * usableWidth;

    const y = height - paddingY - (point.revenue / maximum) * usableHeight;

    return {
      x,
      y,
      point,
    };
  });

  const linePoints = coordinates
    .map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const areaPoints = [
    `${paddingX},${height - paddingY}`,
    ...coordinates.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`),
    `${width - paddingX},${height - paddingY}`,
  ].join(" ");

  const hasRevenue = points.some((point) => point.revenue > 0);

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
        <div className="st-dash-chart__grid" aria-hidden="true" />

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
                <stop offset="0%" stopColor="#f5b335" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f5b335" stopOpacity="0" />
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

            {coordinates.map(({ x, y, point }) =>
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
                    {point.date}: {money(point.revenue)}
                  </title>
                </circle>
              ) : null,
            )}
          </svg>
        ) : (
          <div className="st-dash-chart__empty">
            <BarChart3 />

            <strong>No paid sales yet</strong>

            <span>
              Revenue history will appear here as soon as paid orders are
              recorded.
            </span>
          </div>
        )}
      </div>

      <div className="st-dash-chart__axis">
        <span>
          {points[0]?.date
            ? new Date(`${points[0].date}T12:00:00`).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
              })
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
      count: catalogueHealth.missingCategory,
      icon: Layers3,
      href: "/admin/products",
    },
    {
      title: "Missing brand",
      description:
        "Add a manufacturer where applicable so products are easier to find.",
      count: catalogueHealth.missingBrand,
      icon: Tag,
      href: "/admin/products",
    },
    {
      title: "Missing photographs",
      description:
        "Published products without imagery can look incomplete to customers.",
      count: catalogueHealth.productsWithoutImages,
      icon: ImageOff,
      href: "/admin/products",
    },
    {
      title: "Old drafts",
      description:
        "Drafts untouched for more than 14 days may need completion or cleanup.",
      count: catalogueHealth.oldDrafts,
      icon: Boxes,
      href: "/admin/products",
    },
  ];

  const attentionCount = attentionItems.reduce(
    (total, item) => total + item.count,
    0,
  );

  return (
    <AdminShell
      role={role}
      pageTitle="Dashboard"
      pageDescription="A concise view of store health, catalogue quality and business performance."
    >
      <main className="st-dash-intel st-admin-dashboard-v2">
        <section className="st-dash-intel-section st-dash-overview-section-v2">
          <h2 className="st-admin-dashboard-v2__overview-title">Overview</h2>

          <div className="st-dash-intel-metrics">
            <MetricCard
              icon={Eye}
              label="Live products"
              value={String(statistics.liveProducts)}
              description="Visible on the storefront"
              tone="green"
              href="/admin/products?filter=live"
            />

            <MetricCard
              icon={Package}
              label="Draft products"
              value={String(statistics.draftProducts)}
              description="Hidden from customers"
              tone="blue"
              href="/admin/products?filter=draft"
            />

            <MetricCard
              icon={ReceiptText}
              label="Orders"
              value={String(statistics.pendingOrders)}
              description="Awaiting admin action"
              tone="orange"
              href="/admin/orders"
            />

            <MetricCard
              icon={AlertTriangle}
              label="Stock alerts"
              value={String(statistics.pendingStockAlerts)}
              description="Customers waiting for stock"
              tone="rose"
              href="/admin/stock-alerts"
            />

            <MetricCard
              icon={CircleDollarSign}
              label="Revenue"
              value={money(statistics.revenue)}
              description="Recorded paid revenue"
              tone="violet"
            />
          </div>
        </section>


<section className="st-dash-intel-section st-dash-performance-section-v2">
  <DashboardLivePerformance orders={paidOrders} />
</section>
<section className="st-admin-action-center">
          <div className="st-admin-action-center__header">
            <div className="st-admin-action-center__heading">
              <span>Action center</span>

              <h2>Needs your attention</h2>

              <p>
                Review catalogue issues that may affect product quality or
                storefront organization.
              </p>
            </div>

            <div
              className={`st-admin-action-center__summary ${
                attentionCount === 0 ? "is-clear" : ""
              }`}
            >
              <strong>{attentionCount}</strong>

              <div>
                <span>
                  {attentionCount === 0
                    ? "Everything clear"
                    : attentionCount === 1
                      ? "Item to review"
                      : "Items to review"}
                </span>

                <small>
                  {attentionCount === 0
                    ? "No catalogue action needed"
                    : "Across catalogue checks"}
                </small>
              </div>
            </div>
          </div>

          <div className="st-admin-action-center__layout">
            <div className="st-admin-action-center__priority">
              <div className="st-admin-action-center__subheader">
                <div>
                  <span>Priority</span>
                  <strong>Open issues</strong>
                </div>

                <small>
                  {attentionItems.filter((item) => item.count > 0).length} active
                </small>
              </div>

              <div className="st-admin-action-center__issue-list">
                {attentionItems
                  .filter((item) => item.count > 0)
                  .map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        href={item.href}
                        key={item.title}
                        className="st-admin-action-center__issue"
                      >
                        <span className="st-admin-action-center__icon">
                          <Icon />
                        </span>

                        <div className="st-admin-action-center__issue-copy">
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                        </div>

                        <strong className="st-admin-action-center__count">
                          {item.count}
                        </strong>

                        <span className="st-admin-action-center__review">
                          Review
                          <ArrowRight />
                        </span>
                      </Link>
                    );
                  })}

                {attentionCount === 0 ? (
                  <div className="st-admin-action-center__empty">
                    <span className="st-admin-action-center__icon">
                      <CheckCircle2 />
                    </span>

                    <div>
                      <strong>Catalogue is in good shape</strong>

                      <span>
                        No catalogue issues currently require your attention.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="st-admin-action-center__checks">
              <div className="st-admin-action-center__subheader">
                <div>
                  <span>Status</span>
                  <strong>Catalogue checks</strong>
                </div>

                <small>
                  {attentionItems.filter((item) => item.count === 0).length}/
                  {attentionItems.length} clear
                </small>
              </div>

              <div className="st-admin-action-center__check-list">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  const clear = item.count === 0;

                  return (
                    <Link
                      href={item.href}
                      key={item.title}
                      className={`st-admin-action-center__check ${
                        clear ? "is-clear" : "needs-review"
                      }`}
                    >
                      <span className="st-admin-action-center__check-icon">
                        <Icon />
                      </span>

                      <span className="st-admin-action-center__check-name">
                        {item.title}
                      </span>

                      <strong>
                        {clear ? "Clear" : item.count}
                      </strong>

                      {clear ? <CheckCircle2 /> : <ArrowRight />}
                    </Link>
                  );
                })}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
