"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

type CheckoutActionNoticeProps = {
  title?: string;
  message: string;
  onDismiss?: () => void;
};

type NoticePhase = "enter" | "shown" | "exit";

export default function CheckoutActionNotice({
  title = "Checkout information required",
  message,
  onDismiss,
}: CheckoutActionNoticeProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<NoticePhase>("enter");

  useEffect(() => {
    setVisible(true);
    setPhase("enter");

    let secondFrame = 0;

    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setPhase("shown");
      });
    });

    const exitTimer = window.setTimeout(() => {
      setPhase("exit");
    }, 5000);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 5450);

    return () => {
      window.cancelAnimationFrame(firstFrame);

      if (secondFrame) {
        window.cancelAnimationFrame(secondFrame);
      }

      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [message, title, onDismiss]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`st-checkout-action-notice-v1 is-${phase}`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle
        className="st-checkout-action-notice-v1__icon"
        aria-hidden="true"
      />

      <div className="st-checkout-action-notice-v1__copy">
        <p className="st-checkout-action-notice-v1__title">{title}</p>

        <p className="st-checkout-action-notice-v1__message">{message}</p>
      </div>
    </div>
  );
}
