"use client";

import { useEffect, useState } from "react";

export default function WebsiteIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 2100);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="stereo-intro">
      <div className="stereo-intro__grid" />

      <div className="stereo-intro__content">
        <div className="stereo-intro__status">
          <span />
          SYSTEM INITIALIZED
        </div>

        <h1>STEREOPHONIE</h1>

        <p>TECHNOLOGY / RETAIL / LEBANON</p>

        <div className="stereo-intro__loader">
          <span />
        </div>
      </div>

      <button
        type="button"
        className="stereo-intro__skip"
        onClick={() => setVisible(false)}
      >
        SKIP INTRO
      </button>
    </div>
  );
}
