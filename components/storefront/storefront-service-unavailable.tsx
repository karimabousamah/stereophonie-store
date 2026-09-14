type StorefrontServiceUnavailableProps = {
  title?: string;
  description?: string;
  retryHref?: string;
};

const WHATSAPP_URL =
  "https://wa.me/9613161285?text=Hello%20Stereophonie%2C%20I%20need%20assistance%20with%20the%20store.";

export default function StorefrontServiceUnavailable({
  title = "We'll be right back.",
  description =
    "Stereophonie is temporarily unable to load the store. Please try again shortly or contact us directly if you need assistance.",
  retryHref = "/",
}: StorefrontServiceUnavailableProps) {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        background: "#ffffff",
        color: "#111111",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "620px",
          textAlign: "center",
        }}
      >
        <a
          href="/"
          aria-label="Stereophonie home"
          style={{
            display: "inline-block",
            marginBottom: "48px",
            color: "#111111",
            textDecoration: "none",
            fontSize: "22px",
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          Stereophonie
        </a>

        <div
          aria-hidden="true"
          style={{
            width: "40px",
            height: "3px",
            margin: "0 auto 26px",
            borderRadius: "999px",
            background: "#111111",
          }}
        />

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(38px, 7vw, 66px)",
            lineHeight: 0.98,
            letterSpacing: "-0.055em",
            fontWeight: 750,
          }}
        >
          {title}
        </h1>

        <p
          style={{
            maxWidth: "500px",
            margin: "24px auto 0",
            color: "#707070",
            fontSize: "15px",
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>

        <div
          style={{
            marginTop: "34px",
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <a
            href={retryHref}
            style={{
              minHeight: "46px",
              padding: "0 22px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "999px",
              background: "#111111",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Try again
          </a>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              minHeight: "46px",
              padding: "0 22px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #d8d8d8",
              borderRadius: "999px",
              background: "#ffffff",
              color: "#111111",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            WhatsApp support
          </a>
        </div>
      </section>
    </main>
  );
}
