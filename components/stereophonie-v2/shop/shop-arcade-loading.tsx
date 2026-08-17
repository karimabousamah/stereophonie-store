"use client";

import { Box, Cpu, Database, Gamepad2, Radio, Wifi, Zap } from "lucide-react";
import { useState } from "react";

export default function ShopArcadeLoading() {
  const [boostMode, setBoostMode] = useState(false);

  function moveGlow(event: React.PointerEvent<HTMLDivElement>) {
    const rectangle = event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rectangle.left;
    const y = event.clientY - rectangle.top;

    event.currentTarget.style.setProperty("--arcade-x", `${x}px`);
    event.currentTarget.style.setProperty("--arcade-y", `${y}px`);
  }

  return (
    <section
      className={`st-shop-boot ${boostMode ? "is-boosting" : ""}`}
      onPointerMove={moveGlow}
    >
      <div className="st-shop-boot__ambient" />

      <div className="st-shop-boot__console">
        <div className="st-shop-boot__scanline" />

        <header className="st-shop-boot__topbar">
          <div>
            <span className="st-shop-boot__online-led" />
            <span>STEREOPHONIE ARCADE OS</span>
          </div>

          <span>SYS / SHOP</span>
        </header>

        <div className="st-shop-boot__main">
          <section className="st-shop-boot__primary">
            <div className="st-shop-boot__kicker">
              <Gamepad2 />
              <span>CATALOG / BOOT SEQUENCE</span>
            </div>

            <h1>
              LOADING
              <br />
              <strong>HARDWARE.</strong>
            </h1>

            <p className="st-shop-boot__description">
              INITIALIZING PRODUCT DATABASE, INVENTORY CHANNELS AND STOREFRONT
              MODULES.
            </p>

            <div className="st-shop-boot__memory">
              <div className="st-shop-boot__memory-head">
                <span>BOOT MEMORY</span>

                <span className="st-shop-boot__loading-word">
                  {boostMode ? "BOOSTING" : "LOADING"}
                  <i>.</i>
                  <i>.</i>
                  <i>.</i>
                </span>
              </div>

              <div className="st-shop-boot__memory-cells">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span
                    key={index}
                    style={
                      {
                        "--boot-index": index,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            </div>

            <div className="st-shop-boot__progress">
              <span className="st-shop-boot__progress-fill" />
            </div>

            <div className="st-shop-boot__signals">
              <span>
                <Wifi />
                NETWORK ONLINE
              </span>

              <span>
                <Zap />
                LIVE INVENTORY
              </span>

              <span>
                <Box />
                PRODUCT DATABASE
              </span>
            </div>
          </section>

          <aside className="st-shop-boot__diagnostics">
            <div className="st-shop-boot__diagnostics-head">
              <div>
                <small>SYSTEM MONITOR</small>
                <strong>BOOT DIAGNOSTICS</strong>
              </div>

              <div className="st-shop-boot__chip">
                <Cpu />
              </div>
            </div>

            <div className="st-shop-boot__module">
              <span className="st-shop-boot__module-icon">
                <Database />
              </span>

              <div>
                <small>MODULE 01</small>
                <strong>CATALOG ROM</strong>
              </div>

              <span className="st-shop-boot__module-status">
                <i />
                READING
              </span>
            </div>

            <div className="st-shop-boot__module">
              <span className="st-shop-boot__module-icon">
                <Cpu />
              </span>

              <div>
                <small>MODULE 02</small>
                <strong>PRODUCT BUS</strong>
              </div>

              <span className="st-shop-boot__module-status">
                <i />
                ONLINE
              </span>
            </div>

            <div className="st-shop-boot__module">
              <span className="st-shop-boot__module-icon">
                <Radio />
              </span>

              <div>
                <small>MODULE 03</small>
                <strong>STOCK LINK</strong>
              </div>

              <span className="st-shop-boot__module-status">
                <i />
                SYNC
              </span>
            </div>

            <div className="st-shop-boot__terminal">
              <span>PLEASE STAND BY.</span>

              <span className="st-shop-boot__terminal-line">
                {boostMode
                  ? "HIGH-SPEED CATALOG LINK ENGAGED"
                  : "CATALOG DATA IS BEING PREPARED"}
                <i />
              </span>
            </div>
          </aside>
        </div>

        <footer className="st-shop-boot__footer">
          <span>STEREOPHONIE / HARDWARE DATABASE</span>

          <button
            type="button"
            onClick={() => setBoostMode((current) => !current)}
            aria-pressed={boostMode}
          >
            <Gamepad2 />

            {boostMode ? "BOOST MODE / ON" : "PRESS START / BOOST BOOT"}
          </button>
        </footer>
      </div>
    </section>
  );
}
