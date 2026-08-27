import "server-only";

import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export const CUSTOMER_OTP_CHALLENGE_COOKIE = "st_customer_signup_otp";

export const CUSTOMER_OTP_TTL_SECONDS = 10 * 60;
export const CUSTOMER_OTP_MAX_ATTEMPTS = 5;

export type CustomerOtpChallenge = {
  userId: string;
  email: string;
  nonce: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
};

function secret() {
  const value = process.env.ADMIN_OTP_SECRET?.trim();

  if (!value || value.length < 32) {
    throw new Error("ADMIN_OTP_SECRET is missing or too short.");
  }

  return value;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string) {
  return createHmac("sha256", secret())
    .update(`stereophonie-customer-signup:${payload}`)
    .digest("base64url");
}

function secureCompare(left: string, right: string) {
  try {
    const a = Buffer.from(left);
    const b = Buffer.from(right);

    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function signObject(value: unknown) {
  const payload = encode(JSON.stringify(value));

  return `${payload}.${signature(payload)}`;
}

export function readCustomerOtpChallenge(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [payload, sig, ...extra] = token.split(".");

  if (
    !payload ||
    !sig ||
    extra.length ||
    !secureCompare(signature(payload), sig)
  ) {
    return null;
  }

  try {
    return JSON.parse(decode(payload)) as CustomerOtpChallenge;
  } catch {
    return null;
  }
}

function hashCode(code: string, userId: string, nonce: string) {
  return createHmac("sha256", secret())
    .update(`customer:${userId}:${nonce}:${code}`)
    .digest("hex");
}

export function createCustomerOtpChallenge(userId: string, email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  const nonce = randomBytes(24).toString("hex");

  const challenge: CustomerOtpChallenge = {
    userId,
    email: email.trim().toLowerCase(),
    nonce,
    codeHash: hashCode(code, userId, nonce),
    expiresAt: Date.now() + CUSTOMER_OTP_TTL_SECONDS * 1000,
    attempts: 0,
  };

  return {
    code,
    token: signObject(challenge),
  };
}

export function verifyCustomerOtpChallenge(
  token: string | undefined,
  code: string,
) {
  const challenge = readCustomerOtpChallenge(token);

  if (!challenge) {
    return {
      ok: false as const,
      reason: "invalid" as const,
    };
  }

  if (Date.now() > challenge.expiresAt) {
    return {
      ok: false as const,
      reason: "expired" as const,
    };
  }

  if (challenge.attempts >= CUSTOMER_OTP_MAX_ATTEMPTS) {
    return {
      ok: false as const,
      reason: "attempts" as const,
    };
  }

  const incomingHash = hashCode(code, challenge.userId, challenge.nonce);

  if (!secureCompare(incomingHash, challenge.codeHash)) {
    const nextChallenge = {
      ...challenge,
      attempts: challenge.attempts + 1,
    };

    return {
      ok: false as const,
      reason: "incorrect" as const,
      token: signObject(nextChallenge),
      attemptsRemaining: Math.max(
        0,
        CUSTOMER_OTP_MAX_ATTEMPTS - nextChallenge.attempts,
      ),
    };
  }

  return {
    ok: true as const,
    challenge,
  };
}
