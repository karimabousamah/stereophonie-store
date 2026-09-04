import "server-only";

import { Resend } from "resend";

import {
  buildCustomerEmailLayout,
  buildEmailButton,
  EMAIL_COLORS,
  escapeEmailHtml,
  getEmailSiteUrl,
} from "@/lib/email/customer-email-ui";

type Input = {
  email: string;
  code: string;
  discountPercentage: number;
};

export async function sendWelcomeDiscountEmail(input: Input) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  const fromAddress = process.env.ORDER_EMAIL_FROM?.trim();

  if (!apiKey) {
    return {
      success: false,
      message: "RESEND_API_KEY is not configured.",
    };
  }

  if (!fromAddress) {
    return {
      success: false,
      message: "ORDER_EMAIL_FROM is not configured.",
    };
  }

  const email = input.email.trim().toLowerCase();
  const code = input.code.trim().toUpperCase();

  const discountPercentage = Math.max(
    1,
    Math.min(100, Math.trunc(input.discountPercentage)),
  );

  const safeEmail = escapeEmailHtml(email);
  const safeCode = escapeEmailHtml(code);

  const shopUrl = `${getEmailSiteUrl()}/shop`;

  const content = `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
    >
      <tr>
        <td
          align="center"
          style="
            padding:54px 34px 22px;
            text-align:center;
          "
        >
          <div
            style="
              display:inline-block;
              padding:7px 12px;
              border-radius:999px;
              background:${EMAIL_COLORS.mustardSoft};
              color:${EMAIL_COLORS.mustardText};
              font-size:10px;
              line-height:14px;
              font-weight:700;
              letter-spacing:1.3px;
              text-transform:uppercase;
            "
          >
            Welcome to Stereophonie
          </div>

          <h1
            style="
              margin:22px auto 0;
              max-width:470px;
              color:${EMAIL_COLORS.text};
              font-size:38px;
              line-height:1.08;
              font-weight:700;
              letter-spacing:-1.5px;
            "
          >
            Your first order
            just got better.
          </h1>

          <p
            style="
              margin:18px auto 0;
              max-width:430px;
              color:${EMAIL_COLORS.secondaryText};
              font-size:15px;
              line-height:1.7;
            "
          >
            Thanks for joining Stereophonie Store.
            Enjoy ${discountPercentage}% off your first order
            with your personal welcome code.
          </p>
        </td>
      </tr>

      <tr>
        <td
          style="
            padding:18px 34px 0;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              background:${EMAIL_COLORS.mustardSoft};
              border:1px solid ${EMAIL_COLORS.mustard};
              border-radius:22px;
            "
          >
            <tr>
              <td
                align="center"
                style="
                  padding:30px 24px;
                  text-align:center;
                "
              >
                <p
                  style="
                    margin:0;
                    color:${EMAIL_COLORS.mustardText};
                    font-size:10px;
                    line-height:14px;
                    font-weight:700;
                    letter-spacing:1.5px;
                    text-transform:uppercase;
                  "
                >
                  Your personal code
                </p>

                <p
                  style="
                    margin:11px 0 0;
                    color:${EMAIL_COLORS.text};
                    font-size:29px;
                    line-height:34px;
                    font-weight:800;
                    letter-spacing:1.1px;
                  "
                >
                  ${safeCode}
                </p>

                <p
                  style="
                    margin:7px 0 0;
                    color:${EMAIL_COLORS.mustardText};
                    font-size:13px;
                    line-height:19px;
                    font-weight:600;
                  "
                >
                  ${discountPercentage}% OFF
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td
          style="
            padding:28px 34px 0;
          "
        >
          ${buildEmailButton({
            href: shopUrl,
            label: "Shop now",
          })}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding:34px;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              background:${EMAIL_COLORS.soft};
              border-radius:18px;
            "
          >
            <tr>
              <td
                style="
                  padding:20px 22px;
                "
              >
                <p
                  style="
                    margin:0;
                    color:${EMAIL_COLORS.text};
                    font-size:12px;
                    line-height:18px;
                    font-weight:700;
                  "
                >
                  A few details
                </p>

                <p
                  style="
                    margin:8px 0 0;
                    color:${EMAIL_COLORS.secondaryText};
                    font-size:12px;
                    line-height:19px;
                  "
                >
                  This code is reserved for ${safeEmail},
                  applies to your first order, and can be used once.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const html = buildCustomerEmailLayout({
    title: `Your ${discountPercentage}% Stereophonie welcome code`,
    previewText: `${discountPercentage}% off your first Stereophonie order.`,
    content,
  });

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [email],
    subject: `Your ${discountPercentage}% Stereophonie welcome code`,
    html,
  });

  if (error) {
    console.error("Welcome discount email error:", error);

    return {
      success: false,
      message: "The discount email could not be sent.",
    };
  }

  return {
    success: true,
  };
}
