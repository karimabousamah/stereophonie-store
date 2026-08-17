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

import BrandLogo from "@/components/storefront/brand-logo";

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
  return (
    <main className="st-player-account">
      <header className="st-player-account__header">
        <Link href="/" className="st-player-account__return">
          <span className="st-player-account__led" />
          STORE
        </Link>

        <Link href="/" aria-label="Stereophonie home">
          <BrandLogo
            variant="dark"
            priority
            className="st-player-account__logo"
          />
        </Link>

        <span>PLAYER PROFILE / ONLINE</span>
      </header>

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

        <a href="#account-settings">
          <Terminal />
          <span>
            <small>03 / SYSTEM</small>
            PROFILE SETTINGS
          </span>
        </a>

        <a href="#customer-orders">
          <Gamepad2 />
          <span>
            <small>04 / HISTORY</small>
            ORDER LOG
          </span>
        </a>
      </section>

      <a
        href="#account-settings"
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
      </a>

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

      <footer className="st-player-account__footer">
        <span>
          <i />
          CUSTOMER NETWORK / ONLINE
        </span>

        <span>STEREOPHONIE / PLAYER 01</span>

        <span>SESSION ACTIVE</span>
      </footer>
    </main>
  );
}
