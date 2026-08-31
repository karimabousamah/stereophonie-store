import Link from "next/link";
import {
  ArrowRight,
  CircleHelp,
  PackageSearch,
  RotateCcw,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";

import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";

type PolicySection = {
  title: string;
  content: ReactNode;
};

export default function PolicyPage({
  eyebrow,
  title,
  introduction,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  updated: string;
  sections: PolicySection[];
}) {
  return (
    <div className="st-retail-shell">
      <V3Header />

      <main className="st-retail-page st-support-page">
        <section className="st-retail-hero st-support-page__hero">
          <div className="st-retail-hero__copy">
            <p className="st-retail-eyebrow">{eyebrow}</p>
            <h1>{title}.</h1>
            <p>{introduction}</p>
          </div>

          <div className="st-support-page__updated">
            <CircleHelp />
            <div>
              <span>Current version</span>
              <strong>Updated {updated}</strong>
              <p>Clear information for confident shopping.</p>
            </div>
          </div>
        </section>

        <div className="st-support-page__layout">
          <aside className="st-support-page__navigation">
            <p className="st-retail-eyebrow">On this page</p>
            <nav aria-label={`${title} sections`}>
              {sections.map((section, index) => (
                <a key={section.title} href={`#policy-section-${index + 1}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </a>
              ))}
            </nav>

            <div className="st-support-page__help">
              <CircleHelp />
              <h2>Still have a question?</h2>
              <p>Our team can help clarify an order or store policy.</p>
              <a
                href="https://wa.me/9613161285"
                target="_blank"
                rel="noreferrer"
                className="st-retail-text-link"
              >
                Contact support
                <ArrowRight />
              </a>
            </div>
          </aside>

          <div className="st-support-page__sections">
            {sections.map((section, index) => (
              <section key={section.title} id={`policy-section-${index + 1}`}>
                <span className="st-support-page__number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{section.title}</h2>
                  <div className="st-support-page__content">
                    {section.content}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>

        <section className="st-support-page__related">
          <div className="st-retail-section__heading">
            <div>
              <p className="st-retail-eyebrow">Customer care</p>
              <h2>Useful next steps.</h2>
            </div>
          </div>

          <div>
            <Link href="/delivery">
              <Truck />
              <span>
                <small>Shipping information</small>
                Delivery
              </span>
              <ArrowRight />
            </Link>
            <Link href="/returns">
              <RotateCcw />
              <span>
                <small>Order issues</small>
                Returns policy
              </span>
              <ArrowRight />
            </Link>
            <Link href="/track-order">
              <PackageSearch />
              <span>
                <small>Delivery status</small>
                Track your order
              </span>
              <ArrowRight />
            </Link>
          </div>
        </section>
      </main>

      <V3Footer />
    </div>
  );
}
