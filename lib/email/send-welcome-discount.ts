import "server-only";

import { Resend } from "resend";

type Input = {
  email: string;
  code: string;
};

export async function sendWelcomeDiscountEmail(
  input: Input,
) {
  const apiKey =
    process.env.RESEND_API_KEY?.trim();

  const fromAddress =
    process.env.ORDER_EMAIL_FROM?.trim();

  if (!apiKey) {
    return {
      success: false,
      message:
        "RESEND_API_KEY is not configured.",
    };
  }

  if (!fromAddress) {
    return {
      success: false,
      message:
        "ORDER_EMAIL_FROM is not configured.",
    };
  }

  const email =
    input.email.trim().toLowerCase();

  const code =
    input.code.trim().toUpperCase();

  const resend =
    new Resend(apiKey);

  const html = `
    <div style="
      margin:0;
      padding:36px 18px;
      background:#f5f5f3;
      font-family:Arial,Helvetica,sans-serif;
      color:#1d1d1f;
    ">
      <div style="
        max-width:560px;
        margin:0 auto;
        padding:34px;
        background:#ffffff;
        border:1px solid #e8e8e5;
        border-radius:22px;
      ">
        <div style="
          font-size:10px;
          font-weight:700;
          letter-spacing:.18em;
          text-transform:uppercase;
          color:#8a5b00;
        ">
          Stereophonie Store
        </div>

        <h1 style="
          margin:16px 0 10px;
          font-size:31px;
          line-height:1.05;
          letter-spacing:-1.2px;
        ">
          10% off your first order.
        </h1>

        <p style="
          margin:0;
          color:#777;
          font-size:15px;
          line-height:1.65;
        ">
          Welcome to Stereophonie. Your private first-order discount code is below.
        </p>

        <div style="
          margin-top:25px;
          padding:22px;
          text-align:center;
          background:#fff8e8;
          border:1px solid #f5b335;
          border-radius:16px;
        ">
          <div style="
            font-size:9px;
            font-weight:700;
            letter-spacing:.18em;
            text-transform:uppercase;
            color:#8a5b00;
          ">
            Your personal code
          </div>

          <div style="
            margin-top:8px;
            font-size:24px;
            font-weight:800;
            letter-spacing:.08em;
          ">
            ${code}
          </div>
        </div>

        <p style="
          margin:22px 0 0;
          color:#888;
          font-size:11px;
          line-height:1.6;
        ">
          This code is valid only for ${email}, only on the first order, and can be successfully used once.
        </p>
      </div>
    </div>
  `;

  const { error } =
    await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject:
        "Your 10% Stereophonie welcome code",
      html,
    });

  if (error) {
    console.error(
      "Welcome discount email error:",
      error,
    );

    return {
      success: false,
      message:
        "The discount email could not be sent.",
    };
  }

  return {
    success: true,
  };
}
