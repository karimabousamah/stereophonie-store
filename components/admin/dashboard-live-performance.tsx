"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
} from "lucide-react";

type PaidOrder = {
  id?: string;
  total: number | string | null;
  created_at: string;
};

type Props = {
  orders: PaidOrder[];
};

const PERIODS = [7, 30, 60, 90] as const;

type Period = (typeof PERIODS)[number];

function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
}

function formatPercent(value: number) {
  const absolute = Math.abs(value);

  return `${value >= 0 ? "+" : "-"}${absolute.toFixed(1)}%`;
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function fullDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function liveTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function Trend({ value, period }: { value: number; period: number }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <small className={positive ? "is-positive" : "is-negative"}>
      <Icon />
      {formatPercent(value)}
      <em>vs previous {period} days</em>
    </small>
  );
}

export default function DashboardLivePerformance({ orders }: Props) {
  const [period, setPeriod] = useState<Period>(30);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());

    update();

    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const effectiveNow = now ?? new Date();

  const analysis = useMemo(() => {
    const today = startOfLocalDay(effectiveNow);

    const currentStart = addDays(today, -(period - 1));
    const currentEnd = addDays(today, 1);

    const previousStart = addDays(currentStart, -period);
    const previousEnd = currentStart;

    const paidOrders = orders
      .map((order) => ({
        ...order,
        numericTotal: Number(order.total ?? 0),
        date: new Date(order.created_at),
      }))
      .filter((order) => !Number.isNaN(order.date.getTime()));

    const current = paidOrders.filter(
      (order) => order.date >= currentStart && order.date < currentEnd,
    );

    const previous = paidOrders.filter(
      (order) => order.date >= previousStart && order.date < previousEnd,
    );

    const currentRevenue = current.reduce(
      (sum, order) => sum + order.numericTotal,
      0,
    );

    const previousRevenue = previous.reduce(
      (sum, order) => sum + order.numericTotal,
      0,
    );

    const currentPaidOrders = current.length;
    const previousPaidOrders = previous.length;

    const currentAverage =
      currentPaidOrders > 0 ? currentRevenue / currentPaidOrders : 0;

    const previousAverage =
      previousPaidOrders > 0 ? previousRevenue / previousPaidOrders : 0;

    const daily = Array.from({ length: period }, (_, index) => {
      const date = addDays(currentStart, index);
      const key = dayKey(date);

      const revenue = current
        .filter((order) => dayKey(order.date) === key)
        .reduce((sum, order) => sum + order.numericTotal, 0);

      return {
        date,
        key,
        revenue,
      };
    });

    return {
      currentRevenue,
      currentPaidOrders,
      currentAverage,

      revenueChange: percentChange(currentRevenue, previousRevenue),

      paidOrdersChange: percentChange(currentPaidOrders, previousPaidOrders),

      averageChange: percentChange(currentAverage, previousAverage),

      daily,
    };
  }, [orders, period, effectiveNow.toDateString()]);

  const chart = useMemo(() => {
    const width = 1000;
    const height = 250;

    const values = analysis.daily.map((entry) => entry.revenue);

    const actualMax = Math.max(...values, 0);

    /*
     * Even with $0 sales we intentionally keep a real chart.
     * A visual range of $0–$100 prevents the chart from
     * collapsing into an empty canvas.
     */
    const scaleMax = actualMax <= 0 ? 100 : actualMax * 1.12;

    const points = analysis.daily.map((entry, index) => {
      const x =
        analysis.daily.length <= 1
          ? 0
          : (index / (analysis.daily.length - 1)) * width;

      const y = height - (entry.revenue / scaleMax) * (height - 18);

      return {
        ...entry,
        x,
        y,
      };
    });

    const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

    const area =
      points.length > 0 ? `0,${height} ${polyline} ${width},${height}` : "";

    return {
      width,
      height,
      actualMax,
      scaleMax,
      points,
      polyline,
      area,
    };
  }, [analysis.daily]);

  const axisIndexes = useMemo(() => {
    const last = Math.max(analysis.daily.length - 1, 0);

    return Array.from(
      new Set([
        0,
        Math.round(last * 0.25),
        Math.round(last * 0.5),
        Math.round(last * 0.75),
        last,
      ]),
    );
  }, [analysis.daily.length]);

  return (
    <section className="st-dash-live-performance">
      <div className="st-dash-live-performance__header">
        <div>
          <span>Store performance</span>

          <h2>Last {period} days</h2>

          <p>
            Paid, non-cancelled orders only. Changes are compared with the
            previous {period}-day period.
          </p>
        </div>

        <div className="st-dash-live-performance__right">
          <div className="st-dash-live-clock" suppressHydrationWarning>
            <CalendarDays />

            <div>
              <strong>{now ? fullDate(now) : "Loading current date…"}</strong>

              <span>
                <Clock3 />
                {now ? liveTime(now) : "--:--:--"}
              </span>
            </div>
          </div>

          <div
            className="st-dash-period-selector"
            aria-label="Performance period"
          >
            {PERIODS.map((days) => (
              <button
                key={days}
                type="button"
                className={period === days ? "is-active" : ""}
                onClick={() => setPeriod(days)}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="st-dash-performance">
        <div className="st-dash-performance__stats">
          <div className="st-dash-performance-stat">
            <span>Revenue</span>
            <strong>{money(analysis.currentRevenue)}</strong>

            <Trend value={analysis.revenueChange} period={period} />
          </div>

          <div className="st-dash-performance-stat">
            <span>Paid orders</span>
            <strong>{analysis.currentPaidOrders}</strong>

            <Trend value={analysis.paidOrdersChange} period={period} />
          </div>

          <div className="st-dash-performance-stat">
            <span>Average order</span>
            <strong>{money(analysis.currentAverage)}</strong>

            <Trend value={analysis.averageChange} period={period} />
          </div>
        </div>

        <div className="st-dash-chart">
          <div className="st-dash-chart__top">
            <div>
              <span>Revenue movement</span>
              <strong>Last {period} days</strong>
            </div>

            <div className="st-dash-chart__legend">
              <i />
              Paid revenue
            </div>
          </div>

          <div className="st-dash-chart-shell">
            <div className="st-dash-chart-y-axis">
              {[100, 75, 50, 25, 0].map((percentage) => {
                const value = chart.scaleMax * (percentage / 100);

                return <span key={percentage}>{money(value)}</span>;
              })}
            </div>

            <div className="st-dash-chart__canvas">
              <div className="st-dash-chart__grid" />

              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={`Revenue graph for the last ${period} days`}
              >
                <defs>
                  <linearGradient
                    id="stRevenueArea"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#f5b335" stopOpacity=".22" />
                    <stop
                      offset="100%"
                      stopColor="#f5b335"
                      stopOpacity=".015"
                    />
                  </linearGradient>
                </defs>

                {chart.area && (
                  <polygon points={chart.area} fill="url(#stRevenueArea)" />
                )}

                <polyline
                  points={chart.polyline}
                  fill="none"
                  stroke="#e89a12"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {chart.points
                  .filter(
                    (_, index) =>
                      period <= 7 ||
                      index % Math.ceil(period / 15) === 0 ||
                      index === chart.points.length - 1,
                  )
                  .map((point) => (
                    <circle
                      key={point.key}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#ffffff"
                      stroke="#e89a12"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
              </svg>

              {chart.actualMax === 0 && (
                <div className="st-dash-chart-zero-note">
                  <BarChart3 />

                  <span>No paid revenue in this period yet</span>
                </div>
              )}
            </div>
          </div>

          <div className="st-dash-chart__axis st-dash-chart__axis--live">
            {axisIndexes.map((index) => {
              const entry = analysis.daily[index];

              if (!entry) return null;

              return <span key={entry.key}>{shortDate(entry.date)}</span>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
