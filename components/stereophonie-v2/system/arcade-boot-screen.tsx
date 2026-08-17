"use client";

import { Activity, Cpu, Database, Radio, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

import BrandLogo from "@/components/storefront/brand-logo";

type ArcadeBootScreenProps = {
  mode?: "intro" | "transition";
  label?: string;
};

const bootSteps = [
  "POWER BUS",
  "DISPLAY CORE",
  "CATALOG LINK",
  "INPUT SYSTEM",
  "STORE NETWORK",
  "USER INTERFACE",
];

export default function ArcadeBootScreen({
  mode = "transition",
  label = "LOADING MODULE",
}: ArcadeBootScreenProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const speed = mode === "intro" ? 285 : 120;

    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % bootSteps.length);
    }, speed);

    return () => window.clearInterval(timer);
  }, [mode]);

  const progress = Math.min(100, ((step + 1) / bootSteps.length) * 100);

  return (
    <div
      className={`st-boot-screen ${
        mode === "intro"
          ? "st-boot-screen--intro"
          : "st-boot-screen--transition"
      }`}
    >
      <div className="st-boot-screen__noise" />
      <div className="st-boot-screen__scanlines" />

      <div className="st-boot-screen__frame">
        <header className="st-boot-screen__topbar">
          <div>
            <span className="st-boot-screen__led" />
            SYSTEM ONLINE
          </div>

          <div>
            <Radio />
            STEREOPHONIE OS
          </div>
        </header>

        <main className="st-boot-screen__center">
          <div className="st-boot-screen__identity">
            <div className="st-boot-screen__power">
              <span />
            </div>

            <div>
              <BrandLogo
                variant="dark"
                className="st-boot-screen__real-logo"
                priority
              />

              <span>ARCADE RETAIL SYSTEM</span>
            </div>
          </div>

          <div className="st-boot-screen__screen">
            <div className="st-boot-screen__screen-header">
              <span>BOOT SEQUENCE</span>
              <span>REV 02.26</span>
            </div>

            <div className="st-boot-screen__screen-body">
              <Cpu className="st-boot-screen__cpu" />

              <p className="st-boot-screen__command">
                &gt; {label}
                <span className="st-boot-screen__cursor">_</span>
              </p>

              <div className="st-boot-screen__active-module">
                <small>ACTIVE MODULE</small>
                <strong>{bootSteps[step]}</strong>
              </div>

              <div className="st-boot-screen__progress">
                <span
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="st-boot-screen__diagnostics">
                <span>
                  <Cpu />
                  <small>CORE</small>
                  <strong>OK</strong>
                </span>

                <span>
                  <Database />
                  <small>STORE</small>
                  <strong>READY</strong>
                </span>

                <span>
                  <Wifi />
                  <small>NETWORK</small>
                  <strong>LIVE</strong>
                </span>

                <span>
                  <Activity />
                  <small>SIGNAL</small>
                  <strong>
                    {String(Math.round(progress)).padStart(3, "0")}%
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="st-boot-screen__hint">
            <span>{mode === "intro" ? "PRESS START" : "ROUTING..."}</span>

            <span>
              {bootSteps[step]} / {step + 1} OF {bootSteps.length}
            </span>
          </div>
        </main>

        <footer className="st-boot-screen__footer">
          <span>ST / 1987</span>
          <span>CONSUMER ELECTRONICS TERMINAL</span>
          <span>LEBANON</span>
        </footer>
      </div>
    </div>
  );
}
