const DEFAULT_SITE_URL = "https://stereophoniestore.com";

export const EMAIL_COLORS = {
  background: "#f5f5f3",
  surface: "#ffffff",
  text: "#1d1d1f",
  secondaryText: "#6e6e73",
  tertiaryText: "#8e8e93",
  border: "#e5e5e7",
  soft: "#f5f5f7",
  mustard: "#FDB73E",
  mustardSoft: "#fff7e8",
  mustardText: "#7a4b00",
  black: "#111111",
  white: "#ffffff",
} as const;

export function getEmailSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    DEFAULT_SITE_URL;

  return configuredUrl.replace(/\/+$/, "");
}

export function getEmailLogoUrl() {
  return `${getEmailSiteUrl()}/brand/stereophonie-store-logo.png`;
}

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type EmailButtonOptions = {
  href: string;
  label: string;
};

export function buildEmailButton({ href, label }: EmailButtonOptions) {
  const safeHref = escapeEmailHtml(href);
  const safeLabel = escapeEmailHtml(label);

  return `
    <table
      role="presentation"
      cellspacing="0"
      cellpadding="0"
      border="0"
      align="center"
      style="margin:0 auto;"
    >
      <tr>
        <td
          align="center"
          bgcolor="${EMAIL_COLORS.mustard}"
          style="
            border-radius:999px;
            background:${EMAIL_COLORS.mustard};
          "
        >
          <a
            href="${safeHref}"
            style="
              display:inline-block;
              padding:15px 28px;
              border-radius:999px;
              color:${EMAIL_COLORS.black};
              font-family:Arial,Helvetica,sans-serif;
              font-size:13px;
              line-height:18px;
              font-weight:700;
              text-decoration:none;
            "
          >
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `;
}

type CustomerEmailLayoutOptions = {
  title: string;
  previewText?: string;
  content: string;
  footerExtra?: string;
};

export function buildCustomerEmailLayout({
  title,
  previewText = "",
  content,
  footerExtra = "",
}: CustomerEmailLayoutOptions) {
  const logoUrl = escapeEmailHtml(getEmailLogoUrl());

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1"
        />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>${escapeEmailHtml(title)}</title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:${EMAIL_COLORS.background};
          font-family:Arial,Helvetica,sans-serif;
          color:${EMAIL_COLORS.text};
          -webkit-text-size-adjust:100%;
        "
      >
        <div
          style="
            display:none;
            max-height:0;
            overflow:hidden;
            opacity:0;
            color:transparent;
          "
        >
          ${escapeEmailHtml(previewText)}
        </div>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width:100%;
            background:${EMAIL_COLORS.background};
          "
        >
          <tr>
            <td
              align="center"
              style="
                padding:34px 14px 82px;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width:100%;
                  max-width:620px;
                "
              >
                <tr>
                  <td
                    align="center"
                    style="
                      padding:0 20px 24px;
                    "
                  >
                    <img
                      src="${logoUrl}"
                      alt="Stereophonie Store"
                      width="210"
                      style="
                        display:block;
                        width:210px;
                        max-width:70%;
                        height:auto;
                        margin:0 auto;
                        border:0;
                      "
                    />
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      background:${EMAIL_COLORS.surface};
                      border:1px solid ${EMAIL_COLORS.border};
                      border-radius:26px;
                      overflow:hidden;
                    "
                  >
                    ${content}
                  </td>
                </tr>

                <tr>
                  <td
                    align="center"
                    style="
                      padding:28px 22px 44px;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        color:${EMAIL_COLORS.tertiaryText};
                        font-size:11px;
                        line-height:18px;
                        text-align:center;
                      "
                    >
                      <span
                        style="
                          display:block;
                          color:${EMAIL_COLORS.secondaryText};
                          font-weight:700;
                        "
                      >
                        © Stereophonie Store.
                      </span>
                      <span
                        style="
                          display:block;
                          margin-top:4px;
                        "
                      >
                        Selected consumer electronics &amp; technology.
                      </span>
                    </p>

                    ${footerExtra}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
