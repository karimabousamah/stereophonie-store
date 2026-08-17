"use client";

import { Check, Cpu, Radio } from "lucide-react";

type CheckoutProgressProps = {
  currentStep: 1 | 2 | 3;
};

const steps = [
  {
    number: 1,
    code: "01",
    title: "INPUT",
    description: "Customer / delivery",
  },
  {
    number: 2,
    code: "02",
    title: "VERIFY",
    description: "Review / payment",
  },
  {
    number: 3,
    code: "03",
    title: "COMPLETE",
    description: "Order transmission",
  },
] as const;

export default function CheckoutProgress({
  currentStep,
}: CheckoutProgressProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <section className="st-checkout-progress">
      <div className="st-checkout-progress__top">
        <span>
          <i />
          SECURE ORDER BUS
        </span>

        <span>
          <Radio />
          CHANNEL {String(currentStep).padStart(2, "0")} / 03
        </span>
      </div>

      <div className="st-checkout-progress__track">
        <span
          className="st-checkout-progress__fill"
          style={{
            width: `${progress}%`,
          }}
        />

        {steps.map((step) => {
          const complete = step.number < currentStep;
          const active = step.number === currentStep;

          return (
            <div
              key={step.number}
              className={`st-checkout-progress__node ${
                active ? "is-active" : ""
              } ${complete ? "is-complete" : ""}`}
            >
              <div className="st-checkout-progress__key">
                {complete ? <Check /> : step.code}
              </div>

              <div>
                <small>{step.title}</small>
                <strong>{step.description}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <div className="st-checkout-progress__diagnostic">
        <Cpu />
        <span>
          STEP {currentStep} / SYSTEM {currentStep === 3 ? "LOCKED" : "READY"}
        </span>
      </div>
    </section>
  );
}
