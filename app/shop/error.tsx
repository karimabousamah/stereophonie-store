"use client";

import { useEffect } from "react";

import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Stereophonie shop error:", error);
  }, [error]);

  return (
    <>
      <V3Header />

      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: "80px 24px",
          background: "#fff",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "720px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(32px, 5vw, 56px)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            Something went wrong.
          </h1>

          <p
            style={{
              margin: "22px auto 0",
              maxWidth: "520px",
              color: "#777",
              fontSize: "15px",
              lineHeight: 1.7,
            }}
          >
            We could not load the shop right now. Please try again.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "32px",
              border: 0,
              background: "#111",
              color: "#fff",
              padding: "14px 24px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </section>
      </main>

      <V3Footer />
    </>
  );
}
