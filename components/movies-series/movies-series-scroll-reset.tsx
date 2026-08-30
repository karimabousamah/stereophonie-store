"use client";

import { useEffect } from "react";

export default function MoviesSeriesScrollReset() {
  useEffect(() => {
    /*
     * Mobile browsers can restore the previous document scroll
     * position during client-side navigation.
     *
     * Movies & Series is a destination page, so every fresh entry
     * should begin at the top where the introduction and request
     * form start.
     */
    const resetToTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    };

    resetToTop();

    const frame = window.requestAnimationFrame(resetToTop);

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return null;
}
