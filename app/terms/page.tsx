import type { Metadata } from "next";

import PolicyPage from "@/components/storefront/policy-page";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Read the terms governing use of the Stereophonie website and purchases made through the online store.",
};

const sections = [
  {
    title: "About Stereophonie",
    content: (
      <>
        <p>
          Stereophonie is a Lebanon-based electronics store offering a
          considered selection of consumer technology, including phones,
          computing, gaming, audio, smart devices, and accessories.
        </p>

        <p>
          These Terms and Conditions apply to use of the website and to orders
          placed through it. By using the website or confirming an order, you
          agree to these terms and the policies linked from the website.
        </p>
      </>
    ),
  },
  {
    title: "Products and availability",
    content: (
      <>
        <p>
          We aim to present product descriptions, photographs, prices, colours,
          specifications, and availability as accurately as reasonably possible. Minor
          differences may occur because of photography, lighting, screen
          settings, production variation, or manual error.
        </p>

        <p>
          Products and configurations are subject to availability. Adding an item to a
          cart does not reserve it. We may correct an error, update information,
          limit quantities, or cancel an unavailable item.
        </p>
      </>
    ),
  },
  {
    title: "Orders and acceptance",
    content: (
      <>
        <p>
          Submitting an order is a request to purchase the selected products. An
          order may require confirmation by Stereophonie before it is accepted.
        </p>

        <p>
          We may contact the customer to verify order details, delivery
          information, availability, or payment arrangements. We may refuse or
          cancel an order when information is incomplete, incorrect, suspicious,
          duplicated, unavailable, or otherwise cannot reasonably be fulfilled.
        </p>
      </>
    ),
  },
  {
    title: "Prices and payment",
    content: (
      <>
        <p>
          Product prices and applicable delivery fees are displayed during
          shopping and checkout. A flat delivery fee of $4 applies to orders
          below $150, while orders of $150 or more qualify for free delivery.
        </p>

        <p>
          Cash on Delivery is currently the only active payment method. Whish
          Money and card payment are not yet enabled and are marked as coming
          soon.
        </p>
      </>
    ),
  },
  {
    title: "Delivery",
    content: (
      <>
        <p>
          Stereophonie currently delivers across Lebanon. Estimated delivery is
          normally within 3–4 working days, but this period is not a guaranteed
          deadline.
        </p>

        <p>
          Customers must provide a correct address and active telephone number.
          Delays may occur because of location, accessibility, weekends, public
          holidays, weather, courier availability, or circumstances outside our
          reasonable control.
        </p>
      </>
    ),
  },
  {
    title: "Returns and order issues",
    content: (
      <>
        <p>
          Purchases are generally final and are subject to the separate No
          Returns Policy. Change-of-mind returns, refunds, and configuration exchanges
          are not normally accepted.
        </p>

        <p>
          Incorrect, materially damaged, or defective items should be reported
          promptly so the issue can be reviewed. Nothing in these terms excludes
          rights that cannot legally be excluded.
        </p>
      </>
    ),
  },
  {
    title: "Accounts and acceptable use",
    content: (
      <>
        <p>
          Customers are responsible for providing accurate information and
          protecting access to their accounts. You must not misuse the website,
          interfere with its operation, attempt unauthorised access, submit
          fraudulent orders, or use automated systems in a harmful or excessive
          manner.
        </p>

        <p>
          We may restrict or suspend access when reasonably necessary for
          security, fraud prevention, system protection, or enforcement of these
          terms.
        </p>
      </>
    ),
  },
  {
    title: "Intellectual property",
    content: (
      <p>
        The Stereophonie name, logo, website design, original text, graphics,
        and other store materials may not be copied, republished, distributed,
        or used commercially without permission, except where use is permitted
        by applicable law.
      </p>
    ),
  },
  {
    title: "Liability and applicable law",
    content: (
      <>
        <p>
          To the extent permitted by applicable law, Stereophonie is not
          responsible for indirect or consequential loss arising from use of the
          website, delivery delays outside our reasonable control, device
          problems, or temporary website unavailability.
        </p>

        <p>
          These terms are governed by the applicable laws of Lebanon, without
          limiting any mandatory consumer rights. Questions or disputes should
          first be raised directly with Stereophonie so that a reasonable
          resolution can be attempted.
        </p>
      </>
    ),
  },
  {
    title: "Changes and contact",
    content: (
      <>
        <p>
          We may update these Terms and Conditions when our services, payment
          methods, delivery arrangements, website features, or legal
          responsibilities change. The current version will remain available on
          this page.
        </p>

        <p>
          Contact us at thenitastyle@gmail.com or through WhatsApp at +961 3 161 285.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Legal information"
      title="Terms and Conditions"
      introduction="These terms govern use of the Stereophonie online store and orders placed through the website. Please review them before completing a purchase."
      updated="29 July 2026"
      sections={sections}
    />
  );
}
