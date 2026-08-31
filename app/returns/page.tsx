import type { Metadata } from "next";

import PolicyPage from "@/components/storefront/policy-page";

export const metadata: Metadata = {
  title: "No Returns Policy",
  description:
    "Read the Stereophonie returns, exchanges, damaged-item, and order-issue policy.",
};

const sections = [
  {
    title: "No change-of-mind returns",
    content: (
      <>
        <p>
          All purchases from Stereophonie are considered final. We do not accept
          returns, refunds, or exchanges because a customer changes their mind,
          no longer wants the item, or prefers another product.
        </p>

        <p>
          Customers are responsible for reviewing the product description,
          photographs, price, compatibility, specifications, and selected
          options carefully before confirming an order.
        </p>
      </>
    ),
  },
  {
    title: "Compatibility and product details",
    content: (
      <>
        <p>
          A product cannot normally be returned because it is incompatible with
          another device or does not match a customer&apos;s preferred
          configuration. Please review the available specifications or contact
          us before ordering when assistance is needed.
        </p>

        <p>
          Product colours and finishes may appear slightly different depending
          on lighting, photography, and screen settings. Minor visual variation
          alone does not normally qualify an item for return.
        </p>
      </>
    ),
  },
  {
    title: "Incorrect, damaged, or defective items",
    content: (
      <>
        <p>
          Please contact Stereophonie promptly when an item received is
          incorrect, materially damaged, or appears to contain a defect. Include
          the order details and clear photographs showing the issue.
        </p>

        <p>
          After reviewing the request, we may arrange an appropriate remedy,
          such as replacement, repair, exchange, store credit, or refund,
          depending on the circumstances, product availability, and any rights
          required by applicable law.
        </p>
      </>
    ),
  },
  {
    title: "Reporting an issue",
    content: (
      <>
        <p>
          Order issues should be reported as soon as reasonably possible after
          delivery. The product should remain unused and in its original
          condition with all packaging, accessories, manuals, seals, and labels
          whenever possible.
        </p>

        <p>
          Contact us through WhatsApp at +961 3 161 285 or email
          thenitastyle@gmail.com. Please do not send an item back before
          receiving instructions from our team.
        </p>
      </>
    ),
  },
  {
    title: "Non-returnable condition",
    content: (
      <>
        <p>
          We may refuse a request when a product has been opened where a seal is
          required, activated, altered, damaged after delivery, used improperly,
          or returned without its original packaging or included accessories.
        </p>

        <p>
          This policy does not exclude or limit any consumer rights that cannot
          legally be excluded or limited.
        </p>
      </>
    ),
  },
];

export default function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Customer care"
      title="No Returns Policy"
      introduction="Please read this policy carefully before placing an order. Stereophonie purchases are generally final, subject to the limited exceptions and mandatory rights explained below."
      updated="29 July 2026"
      sections={sections}
    />
  );
}
