import { ArrowRight, CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";

type PolicySection = {
  title: string;
  content: ReactNode;
};

export default function PolicyPage({
  title,
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

      <main className="st-retail-page st-retail-compact-v1 st-support-page">


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
              <div className="st-support-page__help-heading">
                <CircleHelp aria-hidden="true" />
                <h2>Still have a question?</h2>
              </div>
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
            <div className="st-support-page__document-head">
              <h1>{title}</h1>
              <span>Updated {updated}</span>
            </div>

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


      </main>

      <V3Footer />
    </div>
  );
}
