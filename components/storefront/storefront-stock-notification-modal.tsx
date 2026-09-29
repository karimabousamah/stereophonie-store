"use client";

import { LoaderCircle, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  email: string;
  error: string;
  loading: boolean;
  description: string;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function StorefrontStockNotificationModal({
  open,
  email,
  error,
  loading,
  description,
  onClose,
  onEmailChange,
  onSubmit,
}: Props) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="st-purchase-v6-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Availability notification"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        className="st-purchase-v6-modal__window"
        onSubmit={onSubmit}
      >
        <header>
          <div>
            <Mail />
            <strong>Stock notification</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close confirmation"
            className="st-stock-notification-modal__close"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="st-purchase-v6-modal__body">
          <span>Restock alert</span>

          <h2>Notify me when available.</h2>

          <p>{description}</p>

          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />

          {error ? (
            <span className="st-purchase-v6-modal__error">
              {error}
            </span>
          ) : null}

          <button type="submit" disabled={loading}>
            {loading ? (
              <LoaderCircle className="is-spin" />
            ) : (
              <Mail />
            )}

            <span>Notify me</span>
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
