"use client";

import {
  Bookmark,
  ChevronRight,
  MapPin,
  Package,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

import AccountClient, {
  type CustomerOrder,
} from "./account-client";
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
  function scrollToSection(
    event: MouseEvent<HTMLButtonElement>,
    targetId: string,
  ) {
    event.preventDefault();

    document
      .getElementById(targetId)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  const addressLabel =
    addresses.length === 1
      ? "1 saved address"
      : `${addresses.length} saved addresses`;

  const orderLabel =
    orders.length === 1
      ? "1 order"
      : `${orders.length} orders`;

  return (
    <main className="st-account-retail">
      <div className="st-account-retail__shell">

        <section className="st-account-retail__intro">
          <div className="st-account-retail__identity">
            <div className="st-account-retail__avatar">
              <UserRound aria-hidden="true" />
            </div>

            <div>
              <span className="st-account-retail__eyebrow">
                My account
              </span>

              <h1>
                Hello, {firstName}.
              </h1>

              <p>
                Everything related to your Stereophonie account,
                saved products, deliveries and purchases.
              </p>
            </div>
          </div>

          <div className="st-account-retail__summary">
            <div>
              <span>
                <Package aria-hidden="true" />
                Orders
              </span>

              <strong>{orders.length}</strong>
              <small>{orderLabel}</small>
            </div>

            <div>
              <span>
                <MapPin aria-hidden="true" />
                Addresses
              </span>

              <strong>{addresses.length}</strong>
              <small>{addressLabel}</small>
            </div>

            <div>
              <span>
                <ShieldCheck aria-hidden="true" />
                Account
              </span>

              <strong>Secure</strong>
              <small>Protected profile</small>
            </div>
          </div>
        </section>


        {(error ||
          message ||
          hasAccountDataError ||
          hasOrderError ||
          hasStockPreferenceError) ? (
          <section
            className="st-account-retail__messages"
            aria-live="polite"
          >
            {error ? (
              <div className="is-error">
                <strong>Something needs attention</strong>
                <span>{error}</span>
              </div>
            ) : null}

            {message ? (
              <div className="is-success">
                <strong>Updated successfully</strong>
                <span>{message}</span>
              </div>
            ) : null}

            {hasAccountDataError ? (
              <div className="is-warning">
                <strong>Profile synchronization</strong>
                <span>
                  Some profile or saved-address information
                  could not be synchronized.
                </span>
              </div>
            ) : null}

            {hasOrderError ? (
              <div className="is-warning">
                <strong>Orders unavailable</strong>
                <span>
                  Your profile loaded, but your order history
                  could not be retrieved.
                </span>
              </div>
            ) : null}

            {hasStockPreferenceError ? (
              <div className="is-warning">
                <strong>Notification preference</strong>
                <span>
                  Stock-notification preferences could not
                  be loaded.
                </span>
              </div>
            ) : null}
          </section>
        ) : null}


        <section
          className="st-account-retail__quick"
          aria-label="Account shortcuts"
        >
          <Link
            href="/wishlist"
            className="st-account-retail__quick-card"
          >
            <span className="st-account-retail__quick-icon">
              <Bookmark aria-hidden="true" />
            </span>

            <span>
              <small>Saved products</small>
              <strong>Wishlist</strong>
            </span>

            <ChevronRight aria-hidden="true" />
          </Link>

          <Link
            href="/track-order"
            className="st-account-retail__quick-card"
          >
            <span className="st-account-retail__quick-icon">
              <Package aria-hidden="true" />
            </span>

            <span>
              <small>Delivery status</small>
              <strong>Track an order</strong>
            </span>

            <ChevronRight aria-hidden="true" />
          </Link>

          <button
            type="button"
            className="st-account-retail__quick-card"
            onClick={(event) =>
              scrollToSection(event, "account-settings")
            }
          >
            <span className="st-account-retail__quick-icon">
              <Settings2 aria-hidden="true" />
            </span>

            <span>
              <small>Personal information</small>
              <strong>Profile settings</strong>
            </span>

            <ChevronRight aria-hidden="true" />
          </button>

          <button
            type="button"
            className="st-account-retail__quick-card"
            onClick={(event) =>
              scrollToSection(event, "customer-orders")
            }
          >
            <span className="st-account-retail__quick-icon">
              <Package aria-hidden="true" />
            </span>

            <span>
              <small>Purchase history</small>
              <strong>My orders</strong>
            </span>

            <ChevronRight aria-hidden="true" />
          </button>
        </section>


        <section
          id="account-settings"
          className="st-account-retail__module"
        >
          <header className="st-account-retail__module-head">
            <div>
              <span>Account details</span>
              <h2>Profile & delivery.</h2>
              <p>
                Keep your personal details, saved addresses
                and notification preferences up to date.
              </p>
            </div>

            <div className="st-account-retail__module-mark">
              <UserRound aria-hidden="true" />
            </div>
          </header>

          <div className="st-account-retail__module-content">
            <AccountSettingsClient
              profile={profile}
              addresses={addresses}
              stockNotificationsEnabled={
                stockNotificationsEnabled
              }
            />
          </div>
        </section>


        <section
          id="customer-orders"
          className="st-account-retail__module"
        >
          <header className="st-account-retail__module-head">
            <div>
              <span>Purchase history</span>
              <h2>Your orders.</h2>
              <p>
                Review your current and previous purchases
                from Stereophonie.
              </p>
            </div>

            <div className="st-account-retail__module-mark">
              <Package aria-hidden="true" />
            </div>
          </header>

          <div className="st-account-retail__module-content">
            <AccountClient orders={orders} />
          </div>
        </section>

      </div>
    </main>
  );
}
