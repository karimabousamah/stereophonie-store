"use client";

type CheckoutProgressProps = {
  currentStep: 1 | 2 | 3;
  onDetailsClick?: () => void;
  onReviewClick?: () => void;
};

const steps = [
  {
    step: 1 as const,
    title: "Details",
    description: "Contact and delivery",
  },
  {
    step: 2 as const,
    title: "Review",
    description: "Order and payment",
  },
  {
    step: 3 as const,
    title: "Confirmation",
    description: "Order complete",
  },
];

export default function CheckoutProgress({
  currentStep,
  onDetailsClick,
  onReviewClick,
}: CheckoutProgressProps) {
  return (
    <nav aria-label="Checkout progress" className="st-checkout-progress-three">
      <div className="st-checkout-progress-three__grid">
        {steps.map((item) => {
          const active = currentStep === item.step;
          const completed = item.step < currentStep;
          const upcoming = item.step > currentStep;

          const onClick =
            item.step === 1
              ? onDetailsClick
              : item.step === 2
                ? onReviewClick
                : undefined;

          /*
           * Confirmation is never manually reachable.
           *
           * Review on the Details page is clickable only through the
           * callback supplied by CheckoutPage, which runs the exact same
           * validation/save flow as Continue to review.
           *
           * Details on the Review page can safely return to /checkout.
           */
          const clickable =
            item.step !== 3 &&
            !active &&
            typeof onClick === "function";

          const className = [
            "st-checkout-progress-three__card",
            active ? "is-active" : "",
            completed ? "is-completed" : "",
            upcoming ? "is-upcoming" : "",
            clickable ? "is-clickable" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const content = (
            <>
              <div className="st-checkout-progress-three__copy">
                <span className="st-checkout-progress-three__title">
                  {item.title}
                </span>

                <span className="st-checkout-progress-three__description">
                  {item.description}
                </span>
              </div>

            </>
          );

          if (clickable) {
            return (
              <button
                key={item.step}
                type="button"
                onClick={onClick}
                className={className}
                aria-label={`Go to checkout ${item.title.toLowerCase()}`}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={item.step}
              aria-current={active ? "step" : undefined}
              aria-disabled={item.step === 3 && !active ? "true" : undefined}
              className={className}
            >
              {content}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
