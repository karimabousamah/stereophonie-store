"use client";

import { Check, LockKeyhole } from "lucide-react";

type CheckoutProgressProps = {
  currentStep: 1 | 2 | 3;
};

const steps = [
  {
    number: 1,
    title: "Details",
    description: "Contact and delivery",
  },
  {
    number: 2,
    title: "Review",
    description: "Order and payment",
  },
  {
    number: 3,
    title: "Confirmation",
    description: "Order complete",
  },
] as const;

export default function CheckoutProgress({
  currentStep,
}: CheckoutProgressProps) {
  return (
    <section className="st-checkout-progress" aria-label="Checkout progress">
      <div className="st-checkout-progress__steps">
        {steps.map((step) => {
          const complete = step.number < currentStep;
          const active = step.number === currentStep;

          return (
            <div
              key={step.number}
              className={`st-checkout-progress__step ${
                active ? "is-active" : ""
              } ${complete ? "is-complete" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <div className="st-checkout-progress__number">
                {complete ? <Check /> : step.number}
              </div>

              <div className="st-checkout-progress__copy">
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="st-checkout-progress__trust">
        <LockKeyhole />
        <span>Secure checkout</span>
      </div>
    </section>
  );
}
