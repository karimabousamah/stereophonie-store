import crypto from "node:crypto";

import "server-only";

import { Resend } from "resend";

import {
  escapeEmailHtml,
  getEmailLogoUrl,
} from "@/lib/email/customer-email-ui";

export async function sendCustomerVerificationOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  const fromAddress = process.env.ORDER_EMAIL_FROM?.trim();

  if (!apiKey || !fromAddress) {
    return {
      success: false,
      message: "Customer verification email is not configured.",
    };
  }

  const resend = new Resend(apiKey);

  const emailReference = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 4)
    .toUpperCase();

  const logoUrl = escapeEmailHtml(getEmailLogoUrl());

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [email],
    subject: `Verify your Stereophonie account · ${emailReference}`,
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
                outline:none;
                text-decoration:none;
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
              Verify your account
            </h1>

            <p style="
              margin:16px 0 0;
              color:#6e6e73;
              font-size:14px;
              line-height:1.7;
            ">
              Enter the six-digit verification code below
              to complete your Stereophonie account.
            </p>

            <div style="
              margin:28px 0;
              padding:22px;
              background:#fff8e8;
              border:1px solid #edd39a;
              border-radius:16px;
              text-align:center;
              font-size:30px;
              font-weight:700;
              letter-spacing:.22em;
            ">
              ${code}
            </div>

            <p style="
              margin:0;
              color:#86868b;
              font-size:12px;
              line-height:1.7;
            ">
              This code expires in 10 minutes.
              Never share this code with anyone.
              Stereophonie will never ask for it by
              phone, WhatsApp, Instagram or email.
            </p>
          </div>
        </div>
      `,
  });

  if (error) {
    console.error("Customer verification OTP email error:", error);

    return {
      success: false,
      message: "The verification email could not be sent.",
    };
  }

  return {
    success: true,
  };
}
