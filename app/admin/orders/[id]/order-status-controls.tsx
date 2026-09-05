"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Loader2,
  Package,
  Save,
  Store,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  saveAdminNotes,
  updateOrderStatus,
  updatePaymentStatus,
} from "./actions";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

type PaymentStatus = "unpaid" | "paid" | "refunded";

type OrderStatusControlsProps = {
  orderId: string;
  currentStatus: OrderStatus;
  currentPaymentStatus: PaymentStatus;
  initialAdminNotes: string;
  fulfillmentMethod: "delivery" | "pickup";
};

type ConfirmationState =
  | {
      type: "order";
      value: OrderStatus;
      label: string;
    }
  | {
      type: "payment";
      value: PaymentStatus;
      label: string;
    }
  | null;

const deliveryOrderStatuses: {
  value: OrderStatus;
  label: string;
  description: string;
  icon: typeof Clock3;
}[] = [
  {
    value: "pending",
    label: "Pending",
    description: "Awaiting review",
    icon: Clock3,
  },
  {
    value: "confirmed",
    label: "Confirmed",
    description: "Order accepted",
    icon: CheckCircle2,
  },
  {
    value: "preparing",
    label: "Preparing",
    description: "Items being prepared",
    icon: Package,
  },
  {
    value: "out_for_delivery",
    label: "Out for delivery",
    description: "With the courier",
    icon: Truck,
  },
  {
    value: "completed",
    label: "Completed",
    description: "Delivery completed",
    icon: CheckCircle2,
  },
  {
    value: "cancelled",
    label: "Cancelled",
    description: "Order stopped",
    icon: XCircle,
  },
];

const pickupOrderStatuses: {
  value: OrderStatus;
  label: string;
  description: string;
  icon: typeof Clock3;
}[] = [
  {
    value: "pending",
    label: "Pending",
    description: "Awaiting review",
    icon: Clock3,
  },
  {
    value: "confirmed",
    label: "Confirmed",
    description: "Order accepted",
    icon: CheckCircle2,
  },
  {
    value: "preparing",
    label: "Preparing",
    description: "Items being prepared",
    icon: Package,
  },
  {
    value: "ready_for_pickup",
    label: "Ready for pickup",
    description: "Ready at the store",
    icon: Store,
  },
  {
    value: "completed",
    label: "Completed",
    description: "Order collected",
    icon: CheckCircle2,
  },
  {
    value: "cancelled",
    label: "Cancelled",
    description: "Order stopped",
    icon: XCircle,
  },
];

const paymentStatuses: {
  value: PaymentStatus;
  label: string;
}[] = [
  {
    value: "unpaid",
    label: "Unpaid",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
];

export default function OrderStatusControls({
  orderId,
  currentStatus,
  currentPaymentStatus,
  initialAdminNotes,
  fulfillmentMethod,
}: OrderStatusControlsProps) {
  const orderStatuses =
    fulfillmentMethod === "pickup"
      ? pickupOrderStatuses
      : deliveryOrderStatuses;

  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatus>(currentStatus);

  const [selectedPaymentStatus, setSelectedPaymentStatus] =
    useState<PaymentStatus>(currentPaymentStatus);

  const [adminNotes, setAdminNotes] = useState(initialAdminNotes);
  const [savedNotes, setSavedNotes] = useState(initialAdminNotes);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isPending, startTransition] = useTransition();

  const notesChanged = adminNotes.trim() !== savedNotes.trim();

  const selectedStatusMeta = orderStatuses.find(
    (status) => status.value === selectedStatus,
  );

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [message]);

  function requestOrderStatus(status: OrderStatus, label: string) {
    if (status === selectedStatus) {
      return;
    }

    if (status === "cancelled" || status === "completed") {
      setConfirmation({
        type: "order",
        value: status,
        label,
      });

      return;
    }

    applyOrderStatus(status);
  }

  function requestPaymentStatus(paymentStatus: PaymentStatus, label: string) {
    if (paymentStatus === selectedPaymentStatus) {
      return;
    }

    if (paymentStatus === "refunded") {
      setConfirmation({
        type: "payment",
        value: paymentStatus,
        label,
      });

      return;
    }

    applyPaymentStatus(paymentStatus);
  }

  function applyOrderStatus(status: OrderStatus) {
    const previousStatus = selectedStatus;

    setSelectedStatus(status);
    setMessage("");
    setConfirmation(null);

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);

      if (!result.success) {
        setSelectedStatus(previousStatus);
      }

      setMessage(result.message);
      setMessageType(result.success ? "success" : "error");
    });
  }

  function applyPaymentStatus(paymentStatus: PaymentStatus) {
    const previousStatus = selectedPaymentStatus;

    setSelectedPaymentStatus(paymentStatus);
    setMessage("");
    setConfirmation(null);

    startTransition(async () => {
      const result = await updatePaymentStatus(orderId, paymentStatus);

      if (!result.success) {
        setSelectedPaymentStatus(previousStatus);
      }

      setMessage(result.message);
      setMessageType(result.success ? "success" : "error");
    });
  }

  function confirmChange() {
    if (!confirmation) {
      return;
    }

    if (confirmation.type === "order") {
      applyOrderStatus(confirmation.value);
      return;
    }

    applyPaymentStatus(confirmation.value);
  }

  function saveNotes() {
    const previousNotes = savedNotes;

    setMessage("");

    startTransition(async () => {
      const result = await saveAdminNotes(orderId, adminNotes);

      if (result.success) {
        setSavedNotes(adminNotes.trim());
        setAdminNotes(adminNotes.trim());
      } else {
        setSavedNotes(previousNotes);
      }

      setMessage(result.message);
      setMessageType(result.success ? "success" : "error");
    });
  }

  return (
    <>
      <div className="st-admin-order-controls">
        <section className="st-admin-order-control-card">
          <header className="st-admin-order-control-card__header">
            <div>
              <p>Fulfilment status</p>
              <h2>Manage order progress</h2>
            </div>

            <span
              className={`st-admin-order-control-card__method ${
                fulfillmentMethod === "pickup" ? "is-pickup" : "is-delivery"
              }`}
            >
              {fulfillmentMethod === "pickup" ? (
                <Store aria-hidden="true" />
              ) : (
                <Truck aria-hidden="true" />
              )}

              {fulfillmentMethod === "pickup" ? "Pickup" : "Delivery"}
            </span>
          </header>

          <div
            className="st-admin-order-status-grid"
            aria-label="Order fulfilment status"
          >
            {orderStatuses.map((status) => {
              const Icon = status.icon;
              const selected = selectedStatus === status.value;

              return (
                <button
                  key={status.value}
                  type="button"
                  disabled={isPending}
                  onClick={() => requestOrderStatus(status.value, status.label)}
                  className={`st-admin-order-status-option ${
                    selected ? "is-selected" : ""
                  } ${
                    status.value === "cancelled"
                      ? "is-cancel"
                      : status.value === "completed"
                        ? "is-complete"
                        : ""
                  }`}
                  aria-pressed={selected}
                >
                  <span className="st-admin-order-status-option__icon">
                    {selected ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Icon aria-hidden="true" />
                    )}
                  </span>

                  <span>{status.label}</span>
                </button>
              );
            })}
          </div>

          {selectedStatusMeta && (
            <div className="st-admin-order-current-status">
              <span>Current</span>
              <strong>{selectedStatusMeta.label}</strong>
              <p>{selectedStatusMeta.description}</p>
            </div>
          )}
        </section>

        <section className="st-admin-order-control-card">
          <header className="st-admin-order-control-card__header">
            <div className="st-admin-order-control-card__title-with-icon">
              <CircleDollarSign aria-hidden="true" />

              <div>
                <p>Payment</p>
                <h2>Payment status</h2>
              </div>
            </div>
          </header>

          <div className="st-admin-payment-status" aria-label="Payment status">
            {paymentStatuses.map((status) => {
              const selected = selectedPaymentStatus === status.value;

              return (
                <button
                  key={status.value}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    requestPaymentStatus(status.value, status.label)
                  }
                  aria-pressed={selected}
                  className={`st-admin-payment-status__option is-${status.value} ${
                    selected ? "is-selected" : ""
                  }`}
                >
                  <span aria-hidden="true" />
                  {status.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="st-admin-order-control-card">
          <header className="st-admin-order-control-card__header">
            <div className="st-admin-order-control-card__title-with-icon">
              <FileText aria-hidden="true" />

              <div>
                <p>Private</p>
                <h2>Admin notes</h2>
              </div>
            </div>
          </header>

          <div className="st-admin-order-notes">
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              disabled={isPending}
              rows={5}
              maxLength={3000}
              placeholder="Private fulfilment notes, delivery instructions or customer follow-up."
            />

            <footer>
              <span>{adminNotes.length}/3000</span>

              <button
                type="button"
                disabled={isPending || !notesChanged}
                onClick={saveNotes}
              >
                <Save aria-hidden="true" />
                Save notes
              </button>
            </footer>
          </div>
        </section>

        {isPending && (
          <div className="st-admin-order-message is-loading">
            <Loader2 aria-hidden="true" />
            Saving changes
          </div>
        )}

        {message && !isPending && (
          <div
            role="status"
            className={`st-admin-order-message ${
              messageType === "success" ? "is-success" : "is-error"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <AlertTriangle aria-hidden="true" />
            )}

            {message}
          </div>
        )}
      </div>

      {confirmation && typeof document !== "undefined"
        ? createPortal(
            <div className="st3-admin st-admin-order-confirmation-portal">
              <div className="st-admin-order-confirmation">
                <button
                  type="button"
                  aria-label="Close confirmation"
                  onClick={() => setConfirmation(null)}
                  className="st-admin-order-confirmation__backdrop"
                />

                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="st-admin-order-confirmation-title"
                  className="st-admin-order-confirmation__dialog"
                >
                  <button
                    type="button"
                    onClick={() => setConfirmation(null)}
                    aria-label="Close"
                    className="st-admin-order-confirmation__close"
                  >
                    <X aria-hidden="true" />
                  </button>

                  <span className="st-admin-order-confirmation__icon">
                    <AlertTriangle aria-hidden="true" />
                  </span>

                  <p className="st-admin-order-confirmation__eyebrow">
                    Confirmation required
                  </p>

                  <h2 id="st-admin-order-confirmation-title">
                    Change to {confirmation.label}?
                  </h2>

                  <p className="st-admin-order-confirmation__copy">
                    This updates the order record and its operational status.
                    Confirm that this change is correct.
                  </p>

                  <div className="st-admin-order-confirmation__actions">
                    <button
                      type="button"
                      onClick={() => setConfirmation(null)}
                      className="is-secondary"
                    >
                      Go back
                    </button>

                    <button
                      type="button"
                      onClick={confirmChange}
                      className="is-primary"
                    >
                      Confirm change
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
