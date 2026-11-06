import "server-only";

import { Resend } from "resend";

import {
  escapeEmailHtml,
  getEmailLogoUrl,
} from "@/lib/email/customer-email-ui";

export async function sendCustomerPasswordResetEmail(
  email: string,
  resetUrl: string,
) {
  const apiKey =
    process.env.RESEND_API_KEY?.trim();

  const fromAddress =
    process.env.ORDER_EMAIL_FROM?.trim();

  if (!apiKey || !fromAddress) {
    return {
      success: false,
      message:
        "Password reset email is not configured.",
    };
  }

  const resend = new Resend(apiKey);

  const logoUrl =
    escapeEmailHtml(getEmailLogoUrl());

  const safeResetUrl =
    escapeEmailHtml(resetUrl);

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [email],
    subject: "Reset your Stereophonie password",
    html: `
      <div style="
        margin:0;
        padding:34px 18px 40px;
        background:#f5f5f7;
        font-family:Arial,Helvetica,sans-serif;
        color:#1d1d1f;
      ">
        <div style="
          max-width:520px;
          margin:0 auto 24px;
          text-align:center;
        ">
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
        </div>

        <div style="
          max-width:520px;
          margin:auto;
          background:#ffffff;
          border:1px solid #e8e8ea;
          border-radius:24px;
          padding:36px;
        ">
          <div style="
            font-size:10px;
            font-weight:700;
            letter-spacing:.18em;
            text-transform:uppercase;
            color:#8a5b00;
          ">
            Stereophonie
          </div>

          <h1 style="
            margin:16px 0 0;
            font-size:28px;
            line-height:1.1;
            letter-spacing:-.03em;
          ">
            Reset your password
          </h1>

          <p style="
            margin:16px 0 0;
            color:#6e6e73;
            font-size:14px;
            line-height:1.7;
          ">
            We received a request to reset the
            password for your Stereophonie account.
          </p>

          <div style="
            margin:28px 0;
          ">
            <a
              href="${safeResetUrl}"
              style="
                display:block;
                box-sizing:border-box;
                width:100%;
                padding:16px 22px;
                background:#f5b335;
                color:#1d1d1f;
                border-radius:14px;
                text-align:center;
                text-decoration:none;
                font-size:13px;
                font-weight:700;
              "
            >
              Reset password
            </a>
          </div>

          <p style="
            margin:0;
            color:#86868b;
            font-size:12px;
            line-height:1.7;
          ">
            If you did not request a password reset,
            you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error(
      "Customer password reset email error:",
      error,
    );

    return {
      success: false,
      message:
        "The password reset email could not be sent.",
    };
  }

  return {
    success: true,
  };
}
