import { ArrowRight, Gamepad2, MessageCircle, Zap } from "lucide-react";

export default function StereophonieSupportCta() {
  return (
    <section
      className="st-global-support"
      aria-labelledby="st-global-support-title"
    >
      <div className="st-global-support__grid" aria-hidden="true" />

      <div className="st-v2-container st-global-support__inner">
        <div className="st-global-support__identity">
          <div className="st-global-support__eyebrow">
            <span className="st-global-support__led" />

            <span>03 / STEREOPHONIE SERVICE</span>
          </div>

          <h2 id="st-global-support-title">
            NEED HELP
            <br />
            CHOOSING?
          </h2>

          <div className="st-global-support__status">
            <Gamepad2 />

            <span>
              <small>PLAYER SUPPORT</small>
              PRODUCT GUIDANCE ONLINE
            </span>
          </div>
        </div>

        <div className="st-global-support__action">
          <div className="st-global-support__terminal">
            <div>
              <span>SUPPORT CHANNEL</span>

              <strong>
                <i />
                ONLINE
              </strong>
            </div>

            <p>
              Tell us what you need. We can help compare devices,
              specifications, compatibility and availability.
            </p>

            <div className="st-global-support__capabilities">
              <span>
                <Zap />
                COMPARE
              </span>

              <span>
                <Gamepad2 />
                COMPATIBILITY
              </span>

              <span>
                <MessageCircle />
                LIVE HELP
              </span>
            </div>

            <a
              href="https://wa.me/9613161285"
              target="_blank"
              rel="noreferrer"
              className="st-global-support__button"
            >
              <span>
                <small>PRESS A</small>
                ASK STEREOPHONIE
              </span>

              <ArrowRight />
            </a>
          </div>
        </div>
      </div>

      <div className="st-global-support__rail" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
