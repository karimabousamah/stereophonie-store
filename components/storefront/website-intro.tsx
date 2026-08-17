"use client";

import ArcadeBootScreen from "@/components/stereophonie-v2/system/arcade-boot-screen";

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

      <ArcadeBootScreen mode="intro" label="INITIALIZING STORE" />

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
