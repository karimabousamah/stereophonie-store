"use client";

import {
  ChevronDown,
  Cpu,
  Gamepad2,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  description: string | null;
  categoryName: string;
};

type Panel = "overview" | "delivery" | "returns" | "technical" | "secure";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export default function ProductInformationAccordions({
  description,
  categoryName,
}: Props) {
  const [openPanel, setOpenPanel] = useState<Panel>("overview");
  const [secretMode, setSecretMode] = useState(false);

  useEffect(() => {
    let position = 0;

    function onKeyDown(event: KeyboardEvent) {
      const expected = KONAMI[position];

      if (event.key.toLowerCase() === expected.toLowerCase()) {
        position += 1;

        if (position === KONAMI.length) {
          setSecretMode(true);
          position = 0;
        }

        return;
      }

      position = 0;
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function panel(
    id: Panel,
    icon: React.ReactNode,
    number: string,
    title: string,
    subtitle: string,
    children: React.ReactNode,
  ) {
    const open = openPanel === id;

    return (
      <section className={`st-pdb-v1__module ${open ? "is-open" : ""}`}>
        <button
          type="button"
          onClick={() => setOpenPanel(open ? "overview" : id)}
          aria-expanded={open}
        >
          <span className="st-pdb-v1__number">{number}</span>

          <span className="st-pdb-v1__module-icon">{icon}</span>

          <span className="st-pdb-v1__module-copy">
            <small>{subtitle}</small>
            <strong>{title}</strong>
          </span>

          <span className={`st-pdb-v1__state ${open ? "is-active" : ""}`}>
            {open ? "OPEN" : "READY"}
          </span>

          <ChevronDown />
        </button>

        {open ? <div className="st-pdb-v1__content">{children}</div> : null}
      </section>
    );
  }

  return (
    <section className="st-pdb-v1">
      <div className="st-pdb-v1__scanline" />

      <div className="st-pdb-v1__inner">
        <aside className="st-pdb-v1__terminal">
          <div className="st-pdb-v1__terminal-top">
            <span className="st-pdb-v1__terminal-led" />

            <span>STEREOPHONIE / PRODUCT DATABASE</span>
          </div>

          <div className="st-pdb-v1__terminal-screen">
            <Gamepad2 />

            <small>PLAYER INFORMATION SYSTEM</small>

            <h2>
              KNOW YOUR
              <br />
              HARDWARE.
            </h2>

            <p>
              Product information, ordering policies and technical guidance in
              one place.
            </p>

            <div className="st-pdb-v1__terminal-data">
              <div>
                <span>DATABASE</span>
                <strong>ONLINE</strong>
              </div>

              <div>
                <span>MODULES</span>
                <strong>05</strong>
              </div>

              <div>
                <span>CATEGORY</span>
                <strong>{categoryName || "TECH"}</strong>
              </div>
            </div>

            <button
              type="button"
              className="st-pdb-v1__secret"
              onClick={() => setSecretMode((current) => !current)}
            >
              <span>●</span>
              SYS / DIAGNOSTIC
            </button>

            {secretMode ? (
              <div className="st-pdb-v1__easter-egg">
                <span>★ SECRET MODE UNLOCKED</span>
                <strong>PLAYER 1 READY</strong>
                <small>↑ ↑ ↓ ↓ ← → ← → B A</small>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="st-pdb-v1__modules">
          <header className="st-pdb-v1__modules-header">
            <div>
              <span className="st-pdb-v1__online-dot" />

              <span>
                PRODUCT DATA
                <strong>SELECT A MODULE</strong>
              </span>
            </div>

            <small>SYS / PDP / 05</small>
          </header>

          {panel(
            "overview",
            <Gamepad2 />,
            "01",
            "PRODUCT OVERVIEW",
            "WHAT IT IS",
            <div className="st-pdb-v1__text">
              <span>PRODUCT PROFILE</span>

              <p>
                {description?.trim()
                  ? description
                  : "No additional product description has been added yet."}
              </p>
            </div>,
          )}

          {panel(
            "delivery",
            <Truck />,
            "02",
            "DELIVERY",
            "HOW YOU RECEIVE IT",
            <div className="st-pdb-v1__grid">
              <div>
                <span>DELIVERY AREA</span>
                <strong>LEBANON</strong>
              </div>

              <div>
                <span>DELIVERY FEE</span>
                <strong>CONFIRMED AT ORDER</strong>
              </div>

              <div>
                <span>STORE PICKUP</span>
                <strong>WHEN AVAILABLE</strong>
              </div>

              <div>
                <span>ORDER STATUS</span>
                <strong>TRACKABLE</strong>
              </div>
            </div>,
          )}

          {panel(
            "returns",
            <RotateCcw />,
            "03",
            "RETURNS POLICY",
            "BEFORE YOU ORDER",
            <div className="st-pdb-v1__text">
              <span>FINAL CHECK</span>

              <p>
                Please verify the product, configuration and quantity carefully
                before completing your order. Refer to the store Returns Policy
                for the current ordering conditions.
              </p>
            </div>,
          )}

          {panel(
            "technical",
            <Cpu />,
            "04",
            "TECHNICAL DETAILS",
            "PRODUCT DATA",
            <div className="st-pdb-v1__grid">
              <div>
                <span>PRODUCT CATEGORY</span>
                <strong>{categoryName || "TECHNOLOGY"}</strong>
              </div>

              <div>
                <span>CONFIGURATION</span>
                <strong>SELECT ABOVE</strong>
              </div>

              <div>
                <span>LIVE STOCK</span>
                <strong>SYNCHRONIZED</strong>
              </div>

              <div>
                <span>ASSISTANCE</span>
                <strong>AI / STORE SUPPORT</strong>
              </div>
            </div>,
          )}

          {panel(
            "secure",
            <ShieldCheck />,
            "05",
            "SECURE ORDER",
            "CHECKOUT SYSTEM",
            <div className="st-pdb-v1__text">
              <span>ORDER PROTOCOL</span>

              <p>
                Your selected configuration, quantity and customer information
                are reviewed through the Stereophonie checkout flow before the
                order is processed.
              </p>
            </div>,
          )}

          <footer className="st-pdb-v1__modules-footer">
            <span>
              <i />
              SYSTEM ONLINE
            </span>

            <span>STEREOPHONIE STORE / LEBANON</span>
          </footer>
        </div>
      </div>
    </section>
  );
}
