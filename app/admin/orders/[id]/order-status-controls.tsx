"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Loader2,
  PackageCheck,
  Save,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

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
  | "completed"
  | "cancelled";

type PaymentStatus = "unpaid" | "paid" | "refunded";

type OrderStatusControlsProps = {
  orderId: string;
  currentStatus: OrderStatus;
  currentPaymentStatus: PaymentStatus;
  initialAdminNotes: string;
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

const orderStatuses: {
  value: OrderStatus;
  label: string;
  description: string;
  icon: typeof Clock3;
}[] = [
  {
    value: "pending",
    label: "Pending",
    description: "Waiting for admin review",
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
    description: "Products are being prepared",
    icon: PackageCheck,
  },
  {
    value: "out_for_delivery",
    label: "Out for delivery",
    description: "Order is with the courier",
    icon: Truck,
  },
  {
    value: "completed",
    label: "Completed",
    description: "Delivered successfully",
    icon: CheckCircle2,
  },
  {
    value: "cancelled",
    label: "Cancelled",
    description: "Order will not be fulfilled",
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
}: OrderStatusControlsProps) {
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
      <div className="space-y-6">
        <section className="border border-white/10 bg-[#0d0d0d]">
          <div className="border-b border-white/10 px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Fulfilment status
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Manage order progress
            </h2>
          </div>

          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {orderStatuses.map((status) => {
              const Icon = status.icon;

              const selected = selectedStatus === status.value;

              return (
                <button
                  key={status.value}
                  type="button"
                  disabled={isPending}
                  onClick={() => requestOrderStatus(status.value, status.label)}
                  className={`group flex min-h-[92px] items-start gap-4 border p-4 text-left transition duration-300 ${
                    selected
                      ? "border-white/45 bg-white/[0.09]"
                      : "border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]"
                  } disabled:cursor-wait disabled:opacity-55`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center border transition ${
                      selected
                        ? "border-white/35 bg-white/[0.1]"
                        : "border-white/10 bg-white/[0.035] group-hover:border-white/25"
                    }`}
                  >
                    {selected ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{status.label}</p>

                    <p className="mt-1 text-xs leading-5 text-white/35">
                      {status.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border border-white/10 bg-[#0d0d0d]">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <CircleDollarSign className="h-5 w-5 text-emerald-300" />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Payment
                </p>

                <h2 className="mt-1 text-xl font-semibold">Payment status</h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-4">
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
                  className={`min-h-11 border px-2 py-3 text-[9px] font-semibold uppercase tracking-[0.11em] transition sm:px-3 sm:text-[10px] ${
                    selected
                      ? "border-emerald-300/50 bg-emerald-300/[0.1] text-emerald-200"
                      : "border-white/10 bg-white/[0.025] text-white/45 hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
                  } disabled:cursor-wait disabled:opacity-55`}
                >
                  {status.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="border border-white/10 bg-[#0d0d0d]">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-sky-300" />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Private
                </p>

                <h2 className="mt-1 text-xl font-semibold">Admin notes</h2>
              </div>
            </div>
          </div>

          <div className="p-4">
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              disabled={isPending}
              rows={6}
              maxLength={3000}
              placeholder="Add private fulfilment notes, delivery instructions or customer follow-up details."
              className="w-full resize-y border border-white/10 bg-white/[0.025] px-4 py-4 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-white/35 disabled:opacity-55"
            />

            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-[10px] text-white/25">
                {adminNotes.length}/3000
              </p>

              <button
                type="button"
                disabled={isPending || !notesChanged}
                onClick={saveNotes}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 bg-white/[0.04] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition hover:border-white/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Save className="h-4 w-4" />
                Save notes
              </button>
            </div>
          </div>
        </section>

        {isPending && (
          <div className="flex items-center gap-3 border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving changes
          </div>
        )}

        {message && !isPending && (
          <div
            role="status"
            className={`flex items-start gap-3 border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200"
                : "border-red-400/25 bg-red-400/[0.07] text-red-200"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}

            {message}
          </div>
        )}
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close confirmation"
            onClick={() => setConfirmation(null)}
            className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md border border-white/15 bg-[#101010] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.6)] sm:p-7"
          >
            <button
              type="button"
              onClick={() => setConfirmation(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center border border-amber-400/25 bg-amber-400/[0.08]">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
            </div>

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Confirmation required
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Change to {confirmation.label}?
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/45">
              This change affects the order record, dashboard totals and
              fulfilment status. Confirm that this action is correct.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="min-h-11 border border-white/15 bg-transparent px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55 transition hover:border-white/30 hover:text-white"
              >
                Go back
              </button>

              <button
                type="button"
                onClick={confirmChange}
                className="min-h-11 border border-white/20 bg-white/[0.1] px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition hover:border-white/35 hover:bg-white/[0.16]"
              >
                Confirm change
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
