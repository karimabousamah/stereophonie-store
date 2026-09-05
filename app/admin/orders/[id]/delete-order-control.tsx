"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

import { deleteOrder } from "./actions";

type DeleteOrderControlProps = {
  orderId: string;
  orderNumber: string;
};

export default function DeleteOrderControl({
  orderId,
  orderNumber,
}: DeleteOrderControlProps) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!confirmationOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        setErrorMessage(null);
        setConfirmationOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmationOpen, isPending]);

  function openConfirmation() {
    setErrorMessage(null);
    setConfirmationOpen(true);
  }

  function closeConfirmation() {
    if (isPending) {
      return;
    }

    setErrorMessage(null);
    setConfirmationOpen(false);
  }

  function permanentlyDeleteOrder() {
    if (isPending) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await deleteOrder(orderId);

        if (!result.success) {
          setErrorMessage(result.message);
          return;
        }

        setConfirmationOpen(false);

        router.replace("/admin/orders");
        router.refresh();
      } catch {
        setErrorMessage("The order could not be deleted. Please try again.");
      }
    });
  }

  const confirmationModal =
    mounted && confirmationOpen
      ? createPortal(
          <div
            className="st-admin-order-delete-confirmation"
            aria-live="polite"
          >
            <button
              type="button"
              aria-label="Cancel order deletion"
              disabled={isPending}
              onClick={closeConfirmation}
              className="st-admin-order-delete-confirmation__backdrop"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-order-dialog-title"
              aria-describedby="delete-order-dialog-description"
              className="st-admin-order-delete-confirmation__dialog"
            >
              <button
                type="button"
                aria-label="Close"
                disabled={isPending}
                onClick={closeConfirmation}
                className="st-admin-order-delete-confirmation__close"
              >
                <X aria-hidden="true" />
              </button>

              <span className="st-admin-order-delete-confirmation__icon">
                <AlertTriangle aria-hidden="true" />
              </span>

              <p className="st-admin-order-delete-confirmation__eyebrow">
                Permanent action
              </p>

              <h2 id="delete-order-dialog-title">
                Are you sure you want to delete this order?
              </h2>

              <p
                id="delete-order-dialog-description"
                className="st-admin-order-delete-confirmation__copy"
              >
                You are about to permanently delete{" "}
                <strong>{orderNumber}</strong>. The order and its associated
                records will be permanently removed.
              </p>

              <div className="st-admin-order-delete-confirmation__warning">
                <strong>This cannot be undone.</strong>

                <span>
                  Only continue if you are certain this order should be
                  permanently removed.
                </span>
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="st-admin-order-delete-confirmation__error"
                >
                  <AlertTriangle aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              <div className="st-admin-order-delete-confirmation__actions">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  disabled={isPending}
                  onClick={closeConfirmation}
                  className="is-secondary"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  data-destructive="true"
                  disabled={isPending}
                  onClick={permanentlyDeleteOrder}
                  className="is-destructive"
                >
                  {isPending ? (
                    <>
                      <Loader2
                        className="st-admin-order-delete-confirmation__spinner"
                        aria-hidden="true"
                      />
                      Deleting
                    </>
                  ) : (
                    <>
                      <Trash2 aria-hidden="true" />
                      Delete order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="st-admin-order-delete-minimal">
        <button
          type="button"
          data-destructive-trigger="true"
          onClick={openConfirmation}
          className="st-admin-order-delete-minimal__button"
        >
          <Trash2 aria-hidden="true" />
          Delete order
        </button>
      </div>

      {confirmationModal}
    </>
  );
}
