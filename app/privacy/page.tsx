import type { Metadata } from "next";

import PolicyPage from "@/components/storefront/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Nita Style collects, uses, stores, and protects customer information.",
};

const sections = [
  {
    title: "Information we collect",
    content: (
      <>
        <p>
          We may collect information you provide when creating an account,
          placing an order, contacting us, joining a notification list, or
          otherwise using the website.
        </p>

        <p>
          This information may include your name, email address, telephone
          number, delivery address, order details, account information, and
          messages sent to Nita Style.
        </p>
      </>
    ),
  },
  {
    title: "How we use information",
    content: (
      <>
        <p>
          We use customer information to process and deliver orders, provide
          account features, communicate about purchases, answer enquiries,
          prevent misuse, manage stock notifications, and improve the website
          and customer experience.
        </p>

        <p>
          We may also use contact information to send service-related messages
          that are necessary for an order or account.
        </p>
      </>
    ),
  },
  {
    title: "Payments and service providers",
    content: (
      <>
        <p>
          Cash on Delivery is currently the only active payment method. Whish
          Money and card payment are displayed as coming-soon options and are
          not currently enabled.
        </p>

        <p>
          We may share information with service providers only when reasonably
          necessary to operate the store, host the website, manage customer
          accounts, send communications, process orders, or deliver packages.
        </p>
      </>
    ),
  },
  {
    title: "Cookies and technical data",
    content: (
      <>
        <p>
          The website may use cookies, local storage, logs, and similar
          technologies required for features such as the shopping cart, account
          sessions, wishlist, preferences, security, and website performance.
        </p>

        <p>
          Technical information may include browser type, device type, pages
          visited, approximate location derived from an internet connection, and
          diagnostic information.
        </p>
      </>
    ),
  },
  {
    title: "Data storage and security",
    content: (
      <>
        <p>
          We take reasonable administrative and technical measures intended to
          protect personal information. However, no online service, transmission
          method, or storage system can be guaranteed to be completely secure.
        </p>

        <p>
          Information may be retained for as long as reasonably necessary for
          orders, customer support, security, accounting, dispute handling, and
          legal obligations.
        </p>
      </>
    ),
  },
  {
    title: "Your choices and requests",
    content: (
      <>
        <p>
          You may contact us to request reasonable access to, correction of, or
          deletion of personal information associated with you. Some information
          may need to be retained when required for legitimate business,
          security, accounting, dispute-resolution, or legal purposes.
        </p>

        <p>Privacy enquiries can be sent to thenitastyle@gmail.com.</p>
      </>
    ),
  },
  {
    title: "Policy updates",
    content: (
      <p>
        We may update this Privacy Policy when our website, services, payment
        options, or legal responsibilities change. The latest version will be
        published on this page with an updated date.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Legal information"
      title="Privacy Policy"
      introduction="This policy explains how Nita Style handles information connected with customers, orders, accounts, communications, and use of the website."
      updated="29 July 2026"
      sections={sections}
    />
  );
}
