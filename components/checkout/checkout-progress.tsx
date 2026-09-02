type CheckoutProgressProps = {
  currentStep: 1 | 2 | 3;
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
}: CheckoutProgressProps) {
  return (
    <nav aria-label="Checkout progress" className="st-checkout-progress-three">
      <div className="st-checkout-progress-three__grid">
        {steps.map((item) => {
          const active = currentStep === item.step;
          const completed = item.step < currentStep;
          const upcoming = item.step > currentStep;

          return (
            <div
              key={item.step}
              aria-current={active ? "step" : undefined}
              className={[
                "st-checkout-progress-three__card",
                active ? "is-active" : "",
                completed ? "is-completed" : "",
                upcoming ? "is-upcoming" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="st-checkout-progress-three__copy">
                <span className="st-checkout-progress-three__title">
                  {item.title}
                </span>

                <span className="st-checkout-progress-three__description">
                  {item.description}
                </span>
              </div>

              <span
                aria-hidden="true"
                className="st-checkout-progress-three__indicator"
              >
                <span className="st-checkout-progress-three__dot" />
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
