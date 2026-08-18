"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  CreditCard,
  Database,
  Gamepad2,
  LockKeyhole,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Radar,
  Radio,
  RotateCw,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import V2Footer from "@/components/stereophonie-v2/layout/v2-footer";
import V2Header from "@/components/stereophonie-v2/layout/v2-header";

import { trackOrder } from "./actions";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

type TrackedOrder = {
  id?: string;
  order_number?: string;
  status: OrderStatus;
  created_at?: string | null;
  status_updated_at?: string | null;

  customer_first_name: string;
  customer_last_name: string;

  delivery_city: string;
  delivery_area: string;
  delivery_address?: string | null;

  subtotal: number;
  discount_amount: number;
  coupon_code?: string | null;
  delivery_fee: number;
  total: number;

  items: Array<{
    id: string;
    product_name: string;
    size?: string | null;
    quantity: number;
    unit_price?: number;
    line_total: number;
  }>;
};

const missionSteps: Array<{
  value: Exclude<OrderStatus, "cancelled">;
  number: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Package;
}> = [
  {
    value: "pending",
    number: "01",
    label: "ORDER RECEIVED",
    shortLabel: "RECEIVED",
    description: "Your order has entered the Stereophonie order network.",
    icon: Radio,
  },
  {
    value: "confirmed",
    number: "02",
    label: "ORDER CONFIRMED",
    shortLabel: "CONFIRMED",
    description: "Your order has been verified and confirmed.",
    icon: ShieldCheck,
  },
  {
    value: "processing",
    number: "03",
    label: "LOADOUT PREPARATION",
    shortLabel: "PROCESSING",
    description: "Your equipment is being prepared for dispatch.",
    icon: Package,
  },
  {
    value: "out_for_delivery",
    number: "04",
    label: "COURIER DEPLOYED",
    shortLabel: "IN TRANSIT",
    description: "Your shipment has left Stereophonie and is on the road.",
    icon: Truck,
  },
  {
    value: "delivered",
    number: "05",
    label: "MISSION COMPLETE",
    shortLabel: "DELIVERED",
    description: "Your order has reached its destination.",
    icon: PackageCheck,
  },
];

function money(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);

  return `$${Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00"}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "AWAITING DATA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "AWAITING DATA";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "ORDER RECEIVED";
    case "confirmed":
      return "ORDER CONFIRMED";
    case "processing":
      return "PREPARING LOADOUT";
    case "out_for_delivery":
      return "COURIER DEPLOYED";
    case "delivered":
      return "MISSION COMPLETE";
    case "cancelled":
      return "MISSION CANCELLED";
  }
}

function statusIndex(status: OrderStatus) {
  if (status === "cancelled") {
    return -1;
  }

  return missionSteps.findIndex((step) => step.value === status);
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [scanPhase, setScanPhase] = useState<
    "idle" | "scanning" | "found" | "error"
  >("idle");
  const [isPending, startTransition] = useTransition();
  const [telemetryOnline, setTelemetryOnline] = useState(true);

  const resultRef = useRef<HTMLDivElement | null>(null);

  const currentStepIndex = useMemo(
    () => (order ? statusIndex(order.status) : -1),
    [order],
  );

  const normalizedOrderNumber = orderNumber.trim().toUpperCase();

  useEffect(() => {
    let offlineTimer: number | undefined;
    let reconnectTimer: number | undefined;
    let cycleTimer: number | undefined;

    function scheduleTelemetryCycle() {
      cycleTimer = window.setTimeout(() => {
        setTelemetryOnline(false);

        reconnectTimer = window.setTimeout(() => {
          setTelemetryOnline(true);
          scheduleTelemetryCycle();
        }, 1150);
      }, 11800);
    }

    scheduleTelemetryCycle();

    return () => {
      if (cycleTimer) {
        window.clearTimeout(cycleTimer);
      }

      if (offlineTimer) {
        window.clearTimeout(offlineTimer);
      }

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, []);

  function submitTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanOrder = orderNumber.trim();
    const cleanEmail = email.trim();

    if (!cleanOrder || !cleanEmail) {
      setError("Enter both your order number and checkout email.");
      setScanPhase("error");
      return;
    }

    setError("");
    setOrder(null);
    setSearched(true);
    setScanPhase("scanning");

    startTransition(async () => {
      const startedAt = Date.now();

      try {
        const result = await trackOrder(cleanOrder, cleanEmail);

        const elapsed = Date.now() - startedAt;

        if (elapsed < 700) {
          await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
        }

        if (!result.success) {
          setError(
            result.message ??
              "No order was found using this order number and email address.",
          );
          setOrder(null);
          setScanPhase("error");
          return;
        }

        setOrder(result.order as TrackedOrder);
        setError("");
        setScanPhase("found");

        window.setTimeout(() => {
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 180);
      } catch {
        setOrder(null);
        setError(
          "The secure tracking uplink could not be completed. Try again.",
        );
        setScanPhase("error");
      }
    });
  }

  function resetTracking() {
    setOrder(null);
    setError("");
    setSearched(false);
    setScanPhase("idle");
  }

  useEffect(() => {
    function keyboardShortcut(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() === "r" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const target = event.target as HTMLElement | null;

        if (
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable
        ) {
          return;
        }

        resetTracking();
      }
    }

    window.addEventListener("keydown", keyboardShortcut);

    return () => window.removeEventListener("keydown", keyboardShortcut);
  }, []);

  const isScanning = isPending || scanPhase === "scanning";

  return (
    <>
      <V2Header />

      <main className="st-track-z">
        <div className="st-track-z__ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <section className="st-track-z__hero">
          <div className="st-track-z__hero-grid" aria-hidden="true" />

          <div className="st-v2-container st-track-z__hero-inner">
            <div className="st-track-z__hero-copy">
              <div className="st-track-z__system-line">
                <span className="st-track-z__led" />
                DELIVERY NETWORK / PLAYER 01
              </div>

              <p className="st-track-z__eyebrow">
                STEREOPHONIE MISSION CONTROL
              </p>

              <h1>
                TRACK
                <br />
                YOUR
                <br />
                ORDER<span>.</span>
              </h1>

              <p className="st-track-z__hero-description">
                Connect to the Stereophonie delivery network and retrieve the
                current mission status of your order.
              </p>

              <div className="st-track-z__hero-codes">
                <span className="is-secure-channel">
                  <Wifi />
                  SECURE CHANNEL
                </span>

                <span className="is-order-database">
                  <Database />
                  ORDER DATABASE
                </span>

                <span
                  className={[
                    "is-lebanon-network",
                    telemetryOnline ? "is-online" : "is-offline",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <MapPin />
                  LEBANON NETWORK
                </span>
              </div>
            </div>

            <div
              className={[
                "st-track-z__radar-console",
                isScanning ? "is-scanning" : "",
                scanPhase === "found" ? "is-found" : "",
                scanPhase === "error" ? "is-error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="st-track-z__console-head">
                <span>
                  <span className="st-track-z__led" />
                  DELIVERY RADAR
                </span>

                <span>
                  {isScanning
                    ? "SCANNING"
                    : scanPhase === "found"
                      ? "LOCKED"
                      : scanPhase === "error"
                        ? "NO SIGNAL"
                        : "STANDBY"}
                </span>
              </div>

              <div className="st-track-z__radar">
                <div className="st-track-z__radar-ring is-one" />
                <div className="st-track-z__radar-ring is-two" />
                <div className="st-track-z__radar-ring is-three" />
                <div className="st-track-z__radar-cross is-x" />
                <div className="st-track-z__radar-cross is-y" />

                <div className="st-track-z__radar-sweep" />

                <div className="st-track-z__radar-contacts" aria-hidden="true">
                  <i className="st-track-z__radar-contact is-contact-1" />
                  <i className="st-track-z__radar-contact is-contact-2" />
                  <i className="st-track-z__radar-contact is-contact-3" />
                  <i className="st-track-z__radar-contact is-contact-4" />
                  <i className="st-track-z__radar-contact is-contact-5" />
                  <i className="st-track-z__radar-contact is-contact-6" />
                </div>

                <div className="st-track-z__radar-core">
                  {isScanning ? (
                    <ScanLine />
                  ) : scanPhase === "found" ? (
                    <PackageCheck />
                  ) : scanPhase === "error" ? (
                    <X />
                  ) : (
                    <Radar />
                  )}
                </div>
              </div>

              <div className="st-track-z__radar-readout">
                <span
                  className={
                    normalizedOrderNumber
                      ? "st-track-z__mission-readout has-mission"
                      : "st-track-z__mission-readout is-waiting"
                  }
                >
                  <small>MISSION ID</small>
                  <strong>
                    {normalizedOrderNumber || (
                      <>
                        WAITING
                        <i
                          className="st-track-z__waiting-dots"
                          aria-hidden="true"
                        >
                          <b />
                          <b />
                          <b />
                        </i>
                      </>
                    )}
                  </strong>
                </span>

                <span
                  className={[
                    "st-track-z__network-readout",
                    telemetryOnline ? "is-online" : "is-offline",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <small>NETWORK</small>
                  <strong>{telemetryOnline ? "ONLINE" : "OFFLINE"}</strong>
                </span>

                <span className="st-track-z__channel-readout">
                  <small>CHANNEL</small>
                  <strong>
                    14
                    <i className="st-track-z__channel-meter" aria-hidden="true">
                      <b />
                      <b />
                      <b />
                    </i>
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="st-track-z__uplink">
          <div className="st-v2-container st-track-z__uplink-grid">
            <div className="st-track-z__terminal">
              <div className="st-track-z__terminal-top">
                <span>
                  <LockKeyhole />
                  SECURE ORDER UPLINK
                </span>

                <span>PORT / 14</span>
              </div>

              <div className="st-track-z__terminal-body">
                <div className="st-track-z__terminal-intro">
                  <div className="st-track-z__terminal-icon">
                    <Gamepad2 />
                  </div>

                  <div>
                    <small>MISSION DATABASE</small>
                    <h2>
                      LOCATE ORDER<span>.</span>
                    </h2>
                  </div>
                </div>

                <p className="st-track-z__terminal-copy">
                  Enter the exact Stereophonie order number and the email
                  address used during checkout.
                </p>

                <form onSubmit={submitTracking} className="st-track-z__form">
                  <label>
                    <span>
                      <Package />
                      ORDER NUMBER
                    </span>

                    <div className="st-track-z__input">
                      <small>ID</small>

                      <input
                        value={orderNumber}
                        onChange={(event) => setOrderNumber(event.target.value)}
                        placeholder="Example: STEREO-000123"
                        autoComplete="off"
                        spellCheck={false}
                        required
                      />
                    </div>
                  </label>

                  <label>
                    <span>
                      <Mail />
                      CHECKOUT EMAIL
                    </span>

                    <div className="st-track-z__input">
                      <small>@</small>

                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="player@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="st-track-z__scan-command"
                    disabled={isScanning}
                  >
                    <span className="st-track-z__scan-icon">
                      {isScanning ? <RotateCw /> : <ScanLine />}
                    </span>

                    <span>
                      <small>COMMAND / A</small>
                      <strong>
                        {isScanning ? "SCANNING NETWORK..." : "SCAN ORDER"}
                      </strong>
                    </span>

                    <ArrowRight />
                  </button>
                </form>

                {error ? (
                  <div className="st-track-z__message is-error" role="alert">
                    <X />
                    <span>
                      <small>TRACKING ERROR</small>
                      <strong>{error}</strong>
                    </span>
                  </div>
                ) : null}

                <div className="st-track-z__terminal-foot">
                  <span>
                    <span className="st-track-z__led" />
                    ENCRYPTED CONNECTION
                  </span>

                  <span>PLAYER / 01</span>
                </div>
              </div>
            </div>

            <div className="st-track-z__stage">
              {!searched && !order ? (
                <div className="st-track-z__idle">
                  <div className="st-track-z__idle-display">
                    <div className="st-track-z__idle-rings">
                      <span />
                      <span />
                      <span />
                    </div>

                    <Package />
                  </div>

                  <small>MISSION CONTROL / STANDBY</small>

                  <h2>
                    AWAITING
                    <br />
                    MISSION ID<span>.</span>
                  </h2>

                  <p>
                    Your delivery telemetry, checkpoint progression and order
                    loadout will initialize here after a successful scan.
                  </p>

                  <div className="st-track-z__idle-diagnostics">
                    <span>
                      <i />
                      DATABASE / READY
                    </span>

                    <span>
                      <i />
                      COURIER NETWORK / READY
                    </span>

                    <span>
                      <i />
                      CUSTOMER CHANNEL / READY
                    </span>
                  </div>
                </div>
              ) : null}

              {isScanning ? (
                <div className="st-track-z__searching">
                  <div className="st-track-z__searching-radar">
                    <Radar />
                    <span />
                    <span />
                    <span />
                  </div>

                  <small>SEARCHING ORDER DATABASE</small>
                  <h2>
                    SCANNING NETWORK<span>.</span>
                  </h2>

                  <div className="st-track-z__search-meter">
                    {Array.from({ length: 8 }, (_, index) => (
                      <i
                        key={index}
                        style={{ animationDelay: `${index * 110}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {searched && !isScanning && !order && error ? (
                <div className="st-track-z__not-found">
                  <div className="st-track-z__failure-icon">
                    <X />
                  </div>

                  <small>MISSION LOOKUP / FAILED</small>
                  <h2>
                    ORDER NOT FOUND<span>.</span>
                  </h2>

                  <p>
                    Check the order number and checkout email, then retry the
                    secure scan.
                  </p>

                  <button type="button" onClick={resetTracking}>
                    <RotateCw />
                    RESET TERMINAL
                  </button>
                </div>
              ) : null}

              {order && !isScanning ? (
                <div
                  className={[
                    "st-track-z__found",
                    order.status === "cancelled" ? "is-cancelled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="st-track-z__found-head">
                    <div>
                      <span className="st-track-z__led" />
                      ORDER CONNECTION ESTABLISHED
                    </div>

                    <button type="button" onClick={resetTracking}>
                      <RotateCw />
                      NEW SCAN
                    </button>
                  </div>

                  <div className="st-track-z__found-summary">
                    <div>
                      <small>MISSION ID</small>
                      <strong>
                        {order.order_number ?? normalizedOrderNumber ?? "ORDER"}
                      </strong>
                    </div>

                    <div>
                      <small>CURRENT STATUS</small>
                      <strong>{statusLabel(order.status)}</strong>
                    </div>

                    <div>
                      <small>ORDER VALUE</small>
                      <strong>{money(order.total)}</strong>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {order && !isScanning ? (
          <div ref={resultRef}>
            <section className="st-track-z__mission">
              <div className="st-v2-container">
                <div className="st-track-z__section-head">
                  <div>
                    <p>DELIVERY MISSION / LIVE TELEMETRY</p>
                    <h2>
                      MISSION
                      <br />
                      PROGRESS<span>.</span>
                    </h2>
                  </div>

                  <div className="st-track-z__mission-status">
                    <span className="st-track-z__led" />
                    <span>
                      <small>STATUS</small>
                      <strong>{statusLabel(order.status)}</strong>
                    </span>
                  </div>
                </div>

                {order.status === "cancelled" ? (
                  <div className="st-track-z__cancelled">
                    <div className="st-track-z__cancelled-icon">
                      <X />
                    </div>

                    <div>
                      <small>MISSION CONTROL / TERMINATED</small>
                      <h3>
                        ORDER CANCELLED<span>.</span>
                      </h3>

                      <p>
                        This delivery mission has been cancelled. No future
                        checkpoints will be activated.
                      </p>
                    </div>

                    <div className="st-track-z__cancelled-code">
                      ERROR / CX-01
                    </div>
                  </div>
                ) : (
                  <div className="st-track-z__route">
                    <div className="st-track-z__route-line" />

                    {missionSteps.map((step, index) => {
                      const Icon = step.icon;
                      const completed = index < currentStepIndex;
                      const current = index === currentStepIndex;
                      const locked = index > currentStepIndex;

                      return (
                        <article
                          key={step.value}
                          className={[
                            "st-track-z__checkpoint",
                            completed ? "is-complete" : "",
                            current ? "is-current" : "",
                            locked ? "is-locked" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className="st-track-z__checkpoint-node">
                            {completed ? <Check /> : <Icon />}
                          </div>

                          <div className="st-track-z__checkpoint-copy">
                            <span>{step.number}</span>
                            <small>{step.shortLabel}</small>
                            <strong>{step.label}</strong>
                            <p>{step.description}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className="st-track-z__timestamp">
                  <Clock3 />

                  <span>
                    <small>MISSION TELEMETRY / LAST DATABASE UPDATE</small>
                    <strong>
                      {formatDate(order.status_updated_at ?? order.created_at)}
                    </strong>
                  </span>
                </div>
              </div>
            </section>

            <section className="st-track-z__data">
              <div className="st-v2-container">
                <div className="st-track-z__data-head">
                  <div>
                    <p>MISSION DATA / PLAYER 01</p>
                    <h2>
                      ORDER
                      <br />
                      LOADOUT<span>.</span>
                    </h2>
                  </div>

                  <div>
                    <ShoppingBag />
                    <span>
                      <small>TOTAL EQUIPMENT</small>
                      <strong>
                        {String(
                          order.items.reduce(
                            (sum, item) => sum + Number(item.quantity || 0),
                            0,
                          ),
                        ).padStart(2, "0")}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="st-track-z__data-grid">
                  <section className="st-track-z__loadout">
                    <header>
                      <span>
                        <Package />
                        EQUIPMENT MANIFEST
                      </span>

                      <span>
                        {String(order.items.length).padStart(2, "0")} LINES
                      </span>
                    </header>

                    <div className="st-track-z__items">
                      {order.items.map((item, index) => (
                        <article key={item.id}>
                          <div className="st-track-z__item-slot">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="st-track-z__item-copy">
                            <small>CARTRIDGE / LOADED</small>
                            <strong>{item.product_name}</strong>

                            <span>
                              {item.size
                                ? `CONFIG / ${item.size}`
                                : "CONFIG / STANDARD"}
                              {" · "}
                              QTY / {item.quantity}
                            </span>
                          </div>

                          <div className="st-track-z__item-price">
                            <small>LINE VALUE</small>
                            <strong>{money(item.line_total)}</strong>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <aside className="st-track-z__side-stack">
                    <section className="st-track-z__module is-dark">
                      <header>
                        <UserRound />
                        PLAYER IDENTITY
                      </header>

                      <div>
                        <small>CUSTOMER</small>
                        <strong>
                          {order.customer_first_name} {order.customer_last_name}
                        </strong>
                      </div>

                      <div>
                        <small>MISSION CHANNEL</small>
                        <strong>VERIFIED</strong>
                      </div>
                    </section>

                    <section className="st-track-z__module">
                      <header>
                        <MapPin />
                        DESTINATION COORDINATES
                      </header>

                      <div>
                        <small>AREA</small>
                        <strong>{order.delivery_area}</strong>
                      </div>

                      <div>
                        <small>CITY / REGION</small>
                        <strong>{order.delivery_city} / LEBANON</strong>
                      </div>

                      {order.delivery_address ? (
                        <div>
                          <small>DELIVERY ADDRESS</small>
                          <strong>{order.delivery_address}</strong>
                        </div>
                      ) : null}
                    </section>
                  </aside>
                </div>

                <section className="st-track-z__credits">
                  <div className="st-track-z__credits-display">
                    <div>
                      <CreditCard />
                      <span>
                        <small>CREDIT TERMINAL</small>
                        <strong>PAYMENT DIAGNOSTICS</strong>
                      </span>
                    </div>

                    <span className="st-track-z__credits-ready">
                      <span className="st-track-z__led" />
                      CALCULATED
                    </span>
                  </div>

                  <div className="st-track-z__credits-lines">
                    <div>
                      <span>SUBTOTAL</span>
                      <strong>{money(order.subtotal)}</strong>
                    </div>

                    {Number(order.discount_amount) > 0 ? (
                      <div className="is-discount">
                        <span>
                          DISCOUNT
                          {order.coupon_code ? ` / ${order.coupon_code}` : ""}
                        </span>

                        <strong>−{money(order.discount_amount)}</strong>
                      </div>
                    ) : null}

                    <div>
                      <span>DELIVERY FEE</span>
                      <strong>{money(order.delivery_fee)}</strong>
                    </div>

                    <div className="is-total">
                      <span>MISSION TOTAL</span>
                      <strong>{money(order.total)}</strong>
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </div>
        ) : null}

        <section className="st-track-z__help">
          <div className="st-v2-container st-track-z__help-inner">
            <div>
              <Zap />
              <span>
                <small>NEED ASSISTANCE?</small>
                <strong>ORDER SUPPORT CHANNEL</strong>
              </span>
            </div>

            <p>
              Keep your order number and checkout email available when
              contacting Stereophonie.
            </p>

            <Link href="/delivery">
              DELIVERY INFO
              <ChevronRight />
            </Link>
          </div>
        </section>

        <div className="st-track-z__bottom-hud" aria-hidden="true">
          <span>
            <CircleDot />
            STEREOPHONIE DELIVERY NETWORK / ONLINE
          </span>

          <span>MISSION CONTROL / REV 14B</span>

          <span>BEIRUT / LEBANON</span>
        </div>
      </main>

      <V2Footer />
    </>
  );
}
