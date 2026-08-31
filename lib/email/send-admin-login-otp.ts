import "server-only";

import { Resend } from "resend";

export async function sendAdminLoginOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  const fromAddress = process.env.ORDER_EMAIL_FROM?.trim();

  if (!apiKey || !fromAddress) {
    return {
      success: false,
      message: "Administrator security email is not configured.",
    };
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [email],
    subject: "Your Stereophonie administrator verification code",
    html: `
        <div style="margin:0;padding:40px 18px;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
          <div style="max-width:520px;margin:auto;background:white;border:1px solid #e8e8ea;border-radius:24px;padding:36px">
            <div style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#8a5b00">
              Stereophonie Security
            </div>

            <h1 style="font-size:28px;line-height:1.1;margin:16px 0 0">
              Administrator verification
            </h1>

            <p style="font-size:14px;color:#6e6e73;line-height:1.7;margin:16px 0 0">
              A login attempt was made for your Stereophonie administrator account.
              Enter the six-digit verification code below to continue.
            </p>

            <div style="margin:28px 0;padding:22px;background:#fff8e8;border:1px solid #edd39a;border-radius:16px;text-align:center;font-size:30px;font-weight:700;letter-spacing:.22em">
              ${code}
            </div>

            <p style="font-size:12px;color:#86868b;line-height:1.7;margin:0">
              This code expires in 10 minutes. If you did not attempt to sign in,
              do not share this code and change your administrator password.
            </p>
          </div>
        </div>
      `,
  });

  if (error) {
    console.error("Admin OTP email error:", error);

    return {
      success: false,
      message: "The verification email could not be sent.",
    };
  }

  return {
    success: true,
  };
}
