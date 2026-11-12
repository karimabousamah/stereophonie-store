"use client";

import {
  type PointerEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
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


function niceChartMaximum(value: number) {
  if (value <= 0) {
    return 100;
  }

  const target = value * 1.12;
  const roughStep = target / 4;

  const magnitude =
    10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));

  const normalized = roughStep / magnitude;

  const niceNormalized =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 4
            ? 4
            : normalized <= 5
              ? 5
              : normalized <= 8
                ? 8
                : 10;

  return niceNormalized * magnitude * 4;
}


/*
 * Smooth cubic curve.
 *
 * The control points use the actual endpoint Y values, so the
 * curve passes through every exact revenue point without
 * inventing extra peaks or dropping below the real baseline.
 */
function buildRevenuePath(
  points: Array<{
    x: number;
    y: number;
  }>,
) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x},${points[0].y}`;
  }

  let path = `M ${points[0].x},${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    const distance = current.x - previous.x;
    const control = distance * 0.38;

    path +=
      ` C ${previous.x + control},${previous.y}` +
      ` ${current.x - control},${current.y}` +
      ` ${current.x},${current.y}`;
  }

  return path;
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

      const dailyOrders = current.filter(
        (order) => dayKey(order.date) === key,
      );

      const revenue = dailyOrders.reduce(
        (sum, order) => sum + order.numericTotal,
        0,
      );

      return {
        date,
        key,
        revenue,
        orders: dailyOrders.length,
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

    /*
     * Keep the first and last day safely inside the plot.
     *
     * The padding is expressed in the SAME SVG coordinate system
     * used by columns, crosshair and date labels.
     */
    const horizontalPadding =
      period === 7
        ? 34
        : period === 30
          ? 28
          : period === 60
            ? 24
            : 22;

    const values = analysis.daily.map((entry) => entry.revenue);

    const actualMax = Math.max(...values, 0);

    /*
     * Even with $0 sales we intentionally keep a real chart.
     * A visual range of $0–$100 prevents the chart from
     * collapsing into an empty canvas.
     */
    const scaleMax = niceChartMaximum(actualMax);

    const points = analysis.daily.map((entry, index) => {
      const x =
        analysis.daily.length <= 1
          ? width / 2
          : horizontalPadding +
            (index / (analysis.daily.length - 1)) *
              (width - horizontalPadding * 2);

      const y = height - (entry.revenue / scaleMax) * (height - 18);

      return {
        ...entry,
        x,
        y,
      };
    });

    const linePath = buildRevenuePath(points);

    const areaPath =
      linePath
        ? `${linePath} L ${width},${height} L 0,${height} Z`
        : "";

    return {
      width,
      height,
      actualMax,
      scaleMax,
      horizontalPadding,
      points,
      linePath,
      areaPath,
    };
  }, [analysis.daily]);

  const axisIndexes = useMemo(() => {
    const length = analysis.daily.length;

    if (length <= 0) {
      return [];
    }

    /*
     * Exact requested label cadence:
     *
     *  7D  -> every 1 day
     * 30D  -> every 5 days
     * 60D  -> every 10 days
     * 90D  -> every 20 days
     *
     * The current/final date is ALWAYS included even when it does
     * not fall exactly on the cadence.
     */
    const labelStep =
      period === 7
        ? 1
        : period === 30
          ? 5
          : period === 60
            ? 10
            : 20;

    const indexes: number[] = [];

    for (
      let index = 0;
      index < length;
      index += labelStep
    ) {
      indexes.push(index);
    }

    const lastIndex = length - 1;

    if (
      indexes[indexes.length - 1] !==
      lastIndex
    ) {
      indexes.push(lastIndex);
    }

    return indexes;
  }, [analysis.daily.length, period]);

  const hoveredPoint =
    hoveredIndex === null ? null : chart.points[hoveredIndex] ?? null;

  const hoveredXPercent = hoveredPoint
    ? (hoveredPoint.x / chart.width) * 100
    : 0;

  const hoveredYPercent = hoveredPoint
    ? (hoveredPoint.y / chart.height) * 100
    : 0;

  /*
   * Keep DOM labels inside a safe visual region while the
   * analytical crosshair itself remains at the exact data point.
   */
  const safeHoveredValueYPercent = hoveredPoint
    ? Math.max(5, Math.min(94, hoveredYPercent))
    : 0;

  const safeHoveredLabelXPercent = hoveredPoint
    ? Math.max(2.5, Math.min(97.5, hoveredXPercent))
    : 0;

  const safeTooltipXPercent = hoveredPoint
    ? Math.max(4, Math.min(96, hoveredXPercent))
    : 0;

  const hoveredMarkerY = hoveredPoint
    ? Math.min(
        chart.height - 7,
        Math.max(7, hoveredPoint.y),
      )
    : 0;

  const tooltipTopPercent = hoveredPoint
    ? Math.max(15, Math.min(72, hoveredYPercent))
    : 0;

  function handleChartPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || chart.points.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();

    if (bounds.width <= 0) {
      return;
    }

    const ratio = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    );

    const index = Math.round(ratio * (chart.points.length - 1));

    setHoveredIndex(index);
  }

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
            <div className="st-dash-performance-stat__content">
              <span>Revenue</span>
              <strong>{money(analysis.currentRevenue)}</strong>

              <Trend value={analysis.revenueChange} period={period} />
            </div>
          </div>

          <div className="st-dash-performance-stat">
            <div className="st-dash-performance-stat__content">
              <span>Paid orders</span>
              <strong>{analysis.currentPaidOrders}</strong>

              <Trend value={analysis.paidOrdersChange} period={period} />
            </div>
          </div>

          <div className="st-dash-performance-stat">
            <div className="st-dash-performance-stat__content">
              <span>Average order</span>
              <strong>{money(analysis.currentAverage)}</strong>

              <Trend value={analysis.averageChange} period={period} />
            </div>
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
                const value =
                  chart.scaleMax *
                  (percentage / 100);

                const top =
                  100 - percentage;

                return (
                  <span
                    key={percentage}
                    style={{
                      top: `${top}%`,
                    }}
                  >
                    {money(value)}
                  </span>
                );
              })}
            </div>

            <div
              className="st-dash-chart__canvas"
              onPointerMove={handleChartPointerMove}
              onPointerLeave={() => setHoveredIndex(null)}
            >
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
                    <stop offset="0%" stopColor="#202223" stopOpacity=".22" />
                    <stop
                      offset="100%"
                      stopColor="#202223"
                      stopOpacity=".015"
                    />
                  </linearGradient>

                  <linearGradient
                    id="stRevenueColumns"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#202223"
                      stopOpacity=".92"
                    />
                    <stop
                      offset="100%"
                      stopColor="#5f6368"
                      stopOpacity=".7"
                    />
                  </linearGradient>
                </defs>

                <g
                  className="st-dash-chart-reference-grid"
                  aria-hidden="true"
                >
                  {[0, 1, 2, 3, 4].map((step) => {
                    const y =
                      (step / 4) * chart.height;

                    return (
                      <line
                        key={`revenue-grid-${step}`}
                        x1="0"
                        y1={y}
                        x2={chart.width}
                        y2={y}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </g>

                <g
                  className="st-dash-chart-day-ticks"
                  aria-hidden="true"
                >
                  {chart.points.map((point) => (
                    <line
                      key={`day-tick-${point.key}`}
                      x1={point.x}
                      y1={chart.height}
                      x2={point.x}
                      y2={chart.height + 4}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>

                {chart.points
                  .filter((point) => point.revenue > 0)
                  .map((point) => {
                    const barWidth =
                      period <= 7
                        ? 28
                        : period <= 30
                          ? 17
                          : period <= 60
                            ? 11
                            : 8;

                    const isHovered =
                      hoveredIndex !== null &&
                      chart.points[hoveredIndex]?.key === point.key;

                    return (
                      <rect
                        key={`revenue-column-${point.key}`}
                        className={`st-dash-revenue-column ${
                          isHovered ? "is-hovered" : ""
                        }`}
                        x={Math.max(0, point.x - barWidth / 2)}
                        y={point.y}
                        width={barWidth}
                        height={Math.max(1, chart.height - point.y)}
                        rx="3"
                        ry="3"
                        fill="url(#stRevenueColumns)"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}

                {chart.points
                  .filter((point) => point.revenue > 0)
                  .map((point) => (
                    <circle
                      key={point.key}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#ffffff"
                      stroke="#202223"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                {hoveredPoint ? (
                  <g
                    className="st-dash-chart-crosshair"
                    aria-hidden="true"
                  >
                    <line
                      x1={hoveredPoint.x}
                      y1="0"
                      x2={hoveredPoint.x}
                      y2={chart.height}
                      vectorEffect="non-scaling-stroke"
                    />

                    <line
                      x1="0"
                      y1={hoveredPoint.y}
                      x2={chart.width}
                      y2={hoveredPoint.y}
                      vectorEffect="non-scaling-stroke"
                    />

                    <path
                      className="st-dash-chart-crosshair__diamond"
                      d={`M ${hoveredPoint.x} ${hoveredMarkerY - 5}
                          L ${hoveredPoint.x + 5} ${hoveredMarkerY}
                          L ${hoveredPoint.x} ${hoveredMarkerY + 5}
                          L ${hoveredPoint.x - 5} ${hoveredMarkerY}
                          Z`}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ) : null}
              </svg>

              {hoveredPoint ? (
                <>
                  <span
                    className="st-dash-chart-hover-value"
                    style={{
                      top: `${safeHoveredValueYPercent}%`,
                    }}
                  >
                    {money(hoveredPoint.revenue)}
                  </span>

                  <span
                    className="st-dash-chart-hover-date"
                    style={{
                      left: `${safeHoveredLabelXPercent}%`,
                    }}
                  >
                    {shortDate(hoveredPoint.date)}
                  </span>

                  <div
                    className={`st-dash-chart-tooltip ${
                      hoveredXPercent > 72 ? "is-left" : ""
                    }`}
                    style={{
                      left: `${hoveredXPercent}%`,
                      top: `${tooltipTopPercent}%`,
                    }}
                  >
                    <span>{fullDate(hoveredPoint.date)}</span>

                    <strong>{money(hoveredPoint.revenue)}</strong>

                    <small>
                      {hoveredPoint.orders} paid{" "}
                      {hoveredPoint.orders === 1 ? "order" : "orders"}
                    </small>
                  </div>
                </>
              ) : null}

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
              const entry =
                analysis.daily[index];

              const point =
                chart.points[index];

              if (!entry || !point) {
                return null;
              }

              const left =
                (point.x / chart.width) * 100;

              return (
                <span
                  key={entry.key}
                  style={{
                    left: `${left}%`,
                  }}
                >
                  {shortDate(entry.date)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
