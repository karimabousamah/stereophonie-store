"use client";

import { Check } from "lucide-react";

type CheckoutProgressProps = {
  currentStep: 1 | 2 | 3;
};

const steps = [
  {
    number: 1,
    title: "Information",
    description: "Contact and delivery",
  },
  {
    number: 2,
    title: "Review & Payment",
    description: "Confirm order and payment",
  },
  {
    number: 3,
    title: "Confirmation",
    description: "Order successfully placed",
  },
] as const;

export default function CheckoutProgress({
  currentStep,
}: CheckoutProgressProps) {
  const progress =
    currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%";

  const remaining = steps.length - currentStep;

  return (
    <section className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8 lg:px-12">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.23em] text-black/35">
              Secure checkout
            </p>

            <p className="mt-2 text-sm font-semibold">
              Step {currentStep} of {steps.length}
            </p>
          </div>

          <p className="text-right text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
            {remaining === 0
              ? "Final step"
              : `${remaining} ${remaining === 1 ? "step" : "steps"} remaining`}
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-[16.666%] right-[16.666%] top-5 h-px bg-black/15" />

          <div
            className="absolute left-[16.666%] top-5 h-px bg-black transition-all duration-700 ease-out"
            style={{
              width: `calc(${progress} * 0.66668)`,
            }}
          />

          <div className="relative grid grid-cols-3">
            {steps.map((step) => {
              const completed = step.number < currentStep;
              const active = step.number === currentStep;

              return (
                <div
                  key={step.number}
                  className="flex flex-col items-center px-1 text-center"
                >
                  <div
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-500 ${
                      completed
                        ? "border-black bg-black text-white"
                        : active
                          ? "border-black bg-white text-black shadow-[0_0_0_5px_rgba(0,0,0,0.06)]"
                          : "border-black/20 bg-white text-black/30"
                    }`}
                  >
                    {completed ? <Check className="h-4 w-4" /> : step.number}
                  </div>

                  <p
                    className={`mt-4 text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${
                      completed || active ? "text-black" : "text-black/30"
                    }`}
                  >
                    {step.title}
                  </p>

                  <p
                    className={`mt-1 hidden text-[10px] sm:block ${
                      active ? "text-black/50" : "text-black/30"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
