import { NextResponse } from "next/server";

import { sendWelcomeDiscountEmail } from "@/lib/email/send-welcome-discount";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ClaimResult = {
  success?: boolean;
  existing?: boolean;
  already_customer?: boolean;
  code?: string;
  message?: string;
};

function cleanEmail(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

export async function POST(
  request: Request,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return NextResponse.json(
      {
        success: false,
        message:
          "This welcome offer is for new guest customers.",
      },
      {
        status: 403,
      },
    );
  }

  let body: {
    email?: unknown;
  };

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "The request could not be read.",
      },
      {
        status: 400,
      },
    );
  }

  const email =
    cleanEmail(body.email);

  if (!validEmail(email)) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Enter a valid email address.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !process.env.RESEND_API_KEY?.trim() ||
    !process.env.ORDER_EMAIL_FROM?.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Welcome email delivery is not configured yet.",
      },
      {
        status: 503,
      },
    );
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin.rpc(
    "claim_welcome_discount",
    {
      p_email: email,
    },
  );

  if (error) {
    console.error(
      "Welcome coupon claim error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Your welcome offer could not be created. Please try again.",
      },
      {
        status: 500,
      },
    );
  }

  const result =
    data as ClaimResult | null;

  if (
    !result?.success ||
    !result.code
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          result?.message ||
          "This welcome offer is not available.",
      },
      {
        status:
          result?.already_customer
            ? 409
            : 400,
      },
    );
  }

  const code =
    result.code
      .trim()
      .toUpperCase();

  const sent =
    await sendWelcomeDiscountEmail({
      email,
      code,
    });

  if (!sent.success) {
    /*
     * The same email will retrieve the same code
     * on retry rather than generating another one.
     */
    return NextResponse.json(
      {
        success: false,
        retryable: true,
        message:
          "Your code was created, but the email could not be delivered. Please try again.",
      },
      {
        status: 502,
      },
    );
  }

  await admin
    .from("welcome_discount_claims")
    .update({
      last_emailed_at:
        new Date().toISOString(),
    })
    .eq("email", email);

  return NextResponse.json({
    success: true,
    code,
    message:
      "Your 10% code has been sent to your email.",
  });
}
