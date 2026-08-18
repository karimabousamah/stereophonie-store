"use client";

import {
  Gamepad2,
  Heart,
  MapPin,
  Package,
  Radio,
  ShieldCheck,
  Terminal,
  UserRound,
  Wifi,
} from "lucide-react";
import Link from "next/link";

import AccountClient, { type CustomerOrder } from "./account-client";
import AccountSettingsClient, {
  type CustomerAddress,
  type CustomerProfile,
} from "./account-settings-client";

type Props = {
  firstName: string;
  profile: CustomerProfile;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
  stockNotificationsEnabled: boolean;
  error?: string;
  message?: string;
  hasAccountDataError: boolean;
  hasOrderError: boolean;
  hasStockPreferenceError: boolean;
};

export default function AccountCommandCenter({
  firstName,
  profile,
  addresses,
  orders,
  stockNotificationsEnabled,
  error,
  message,
  hasAccountDataError,
  hasOrderError,
  hasStockPreferenceError,
}: Props) {
  const scrollToAccountModule = (
    event: React.MouseEvent<HTMLButtonElement>,
    targetId: string,
  ) => {
    event.preventDefault();

    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    const header =
      document.querySelector<HTMLElement>(".st-v2-header") ??
      document.querySelector<HTMLElement>("header");

    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const extraClearance = 24;

    const targetTop =
      target.getBoundingClientRect().top +
      window.scrollY -
      headerHeight -
      extraClearance;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  };

  return (
    <main className="st-player-account">
      <section className="st-player-account__hero">
        <div className="st-player-account__grid" />

        <div className="st-player-account__hero-copy">
          <small>
            <span className="st-player-account__led" />
            CUSTOMER SYSTEM / AUTHENTICATED
          </small>

          <h1>
            WELCOME,
            <br />
            <span>{firstName.toUpperCase()}.</span>
          </h1>

          <p>
            Your Stereophonie player profile is loaded. Manage account data,
            delivery coordinates, saved equipment and active orders below.
          </p>
        </div>

        <div className="st-player-account__hud">
          <div>
            <UserRound />
            <span>IDENTITY</span>
            <strong>VERIFIED</strong>
          </div>

          <div>
            <Package />
            <span>ORDERS</span>
            <strong>{String(orders.length).padStart(2, "0")}</strong>
          </div>

          <div>
            <MapPin />
            <span>ADDRESSES</span>
            <strong>{String(addresses.length).padStart(2, "0")}</strong>
          </div>

          <div>
            <Wifi />
            <span>CHANNEL</span>
            <strong>ONLINE</strong>
          </div>
        </div>
      </section>

      <section className="st-player-account__quickbar">
        <Link href="/wishlist">
          <Heart />
          <span>
            <small>01 / LIBRARY</small>
            WISHLIST
          </span>
        </Link>

        <Link href="/track-order">
          <Radio />
          <span>
            <small>02 / SIGNAL</small>
            TRACK ORDER
          </span>
        </Link>

        <button
          type="button"
          onClick={(event) => scrollToAccountModule(event, "account-settings")}
          aria-label="Go to profile settings"
        >
          <Terminal />
          <span>
            <small>03 / SYSTEM</small>
            PROFILE SETTINGS
          </span>
        </button>

        <button
          type="button"
          onClick={(event) => scrollToAccountModule(event, "customer-orders")}
          aria-label="Go to order log"
        >
          <Gamepad2 />
          <span>
            <small>04 / HISTORY</small>
            ORDER LOG
          </span>
        </button>
      </section>

      <button
        type="button"
        onClick={(event) => scrollToAccountModule(event, "account-settings")}
        className="st-player-account__scroll-cue"
        aria-label="Scroll to player profile modules"
      >
        <span className="st-player-account__scroll-cue-inner">
          <span className="st-player-account__scroll-cue-led" />

          <span className="st-player-account__scroll-cue-copy">
            <small>PLAYER SYSTEM / MODULES BELOW</small>
            <strong>SCROLL TO ACCESS PROFILE + ORDER MEMORY</strong>
          </span>

          <span className="st-player-account__scroll-arrow">↓</span>
        </span>
      </button>

      <section className="st-player-account__workspace">
        {(error ||
          message ||
          hasAccountDataError ||
          hasOrderError ||
          hasStockPreferenceError) && (
          <div className="st-player-account__messages">
            {error ? (
              <div className="is-error">
                <span>ERR</span>
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="is-success">
                <span>OK</span>
                {message}
              </div>
            ) : null}

            {hasAccountDataError ? (
              <div className="is-warning">
                <span>SYS</span>
                Some profile or saved-address data could not be synchronized.
              </div>
            ) : null}

            {hasOrderError ? (
              <div className="is-warning">
                <span>ORD</span>
                Your profile loaded, but order history could not be retrieved.
              </div>
            ) : null}

            {hasStockPreferenceError ? (
              <div className="is-warning">
                <span>NTF</span>
                Stock-notification preferences could not be loaded.
              </div>
            ) : null}
          </div>
        )}

        <div className="st-player-account__module-head" id="account-settings">
          <div>
            <small>MODULE 01 / PLAYER CONFIGURATION</small>
            <h2>PROFILE SYSTEM.</h2>
          </div>

          <span>
            <ShieldCheck />
            SECURE CHANNEL
          </span>
        </div>

        <div className="st-player-account__legacy-reset">
          <AccountSettingsClient
            profile={profile}
            addresses={addresses}
            stockNotificationsEnabled={stockNotificationsEnabled}
          />
        </div>

        <div
          className="st-player-account__module-head st-player-account__module-head--orders"
          id="customer-orders"
        >
          <div>
            <small>MODULE 02 / PURCHASE MEMORY</small>
            <h2>ORDER LOG.</h2>
          </div>

          <span>
            <Package />
            {orders.length} RECORD{orders.length === 1 ? "" : "S"}
          </span>
        </div>

        <div className="st-player-account__legacy-reset">
          <AccountClient orders={orders} />
        </div>
      </section>
    </main>
  );
}
