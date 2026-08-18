import { ArrowRight } from "lucide-react";

export default function NeedHelpChoosing() {
  return (
    <section
      className="st-v2-home-banner st-v2-grid"
      aria-labelledby="stereophonie-need-help-title"
    >
      <div className="st-v2-container st-v2-home-banner__inner">
        <div>
          <span>03 / STEREOPHONIE SERVICE</span>

          <h2 id="stereophonie-need-help-title">
            NEED HELP
            <br />
            CHOOSING?
          </h2>
        </div>

        <div>
          <p>
            Tell us what you need. We can help compare devices, specifications,
            compatibility and availability.
          </p>

          <a
            href="https://wa.me/9613161285"
            target="_blank"
            rel="noreferrer"
            className="st-v2-button st-v2-button--signal"
          >
            ASK STEREOPHONIE
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
