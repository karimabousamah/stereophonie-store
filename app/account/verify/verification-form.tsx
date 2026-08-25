"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import {
  resendCustomerCode,
  verifyCustomerCode,
} from "../actions";

type VerificationFormProps = {
  email: string;
  error?: string;
  message?: string;
};

const CODE_LENGTH = 6;
const RESEND_DELAY = 60;

function maskEmail(email: string) {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return email;
  }

  const visibleStart =
    name.length > 1
      ? name.slice(0, 2)
      : name[0];

  const hiddenLength = Math.max(
    3,
    name.length - visibleStart.length,
  );

  return `${visibleStart}${"•".repeat(hiddenLength)}@${domain}`;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(
    2,
    "0",
  )}:${String(remainingSeconds).padStart(2, "0")}`;
}

function VerifyButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="st-account-verification__primary"
    >
      <span>
        {pending
          ? "Verifying..."
          : "Verify account"}
      </span>

      <ArrowRight aria-hidden="true" />
    </button>
  );
}

function ResendButton({
  countdown,
}: {
  countdown: number;
}) {
  const { pending } = useFormStatus();

  const disabled =
    countdown > 0 || pending;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="st-account-verification__resend-button"
    >
      <RotateCcw aria-hidden="true" />

      <span>
        {pending
          ? "Sending..."
          : countdown > 0
            ? `Resend in ${formatCountdown(countdown)}`
            : "Resend code"}
      </span>
    </button>
  );
}

export default function VerificationForm({
  email,
  error,
  message,
}: VerificationFormProps) {
  const [digits, setDigits] = useState<string[]>(
    Array(CODE_LENGTH).fill(""),
  );

  const [countdown, setCountdown] =
    useState(RESEND_DELAY);

  const inputRefs =
    useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(
    () => digits.join(""),
    [digits],
  );

  const isComplete =
    code.length === CODE_LENGTH;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) =>
        Math.max(0, current - 1),
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [countdown]);

  function updateDigit(
    index: number,
    value: string,
  ) {
    const number = value
      .replace(/\D/g, "")
      .slice(-1);

    setDigits((current) => {
      const next = [...current];

      next[index] = number;

      return next;
    });

    if (
      number &&
      index < CODE_LENGTH - 1
    ) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      event.preventDefault();

      inputRefs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < CODE_LENGTH - 1
    ) {
      event.preventDefault();

      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(
    event: React.ClipboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();

    const pastedCode =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, CODE_LENGTH);

    if (!pastedCode) {
      return;
    }

    const nextDigits =
      Array(CODE_LENGTH).fill("");

    pastedCode
      .split("")
      .forEach((digit, index) => {
        nextDigits[index] = digit;
      });

    setDigits(nextDigits);

    const nextFocusIndex =
      Math.min(
        pastedCode.length,
        CODE_LENGTH - 1,
      );

    inputRefs.current[
      nextFocusIndex
    ]?.focus();
  }

  return (
    <div className="st-account-verification__card">
      <div className="st-account-verification__top">
        <Link
          href="/account?mode=register"
          className="st-account-verification__back"
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Link>

        <div className="st-account-verification__secure">
          <ShieldCheck aria-hidden="true" />
          Secure verification
        </div>
      </div>

      <div className="st-account-verification__intro">
        <div className="st-account-verification__mail">
          <Mail aria-hidden="true" />
        </div>

        <p className="st-account-verification__eyebrow">
          Email verification
        </p>

        <h1>
          Check your email
        </h1>

        <p className="st-account-verification__description">
          Enter the six-digit code we sent to
          your email address.
        </p>

        <div className="st-account-verification__email">
          <strong>{maskEmail(email)}</strong>

          <Link href="/account?mode=register">
            Change email
          </Link>
        </div>
      </div>

      {error ? (
        <div
          className="st-account-verification__message st-account-verification__message--error"
          role="alert"
        >
          <span>!</span>
          <p>{error}</p>
        </div>
      ) : null}

      {message ? (
        <div
          className="st-account-verification__message st-account-verification__message--success"
          role="status"
        >
          <CheckCircle2 aria-hidden="true" />
          <p>{message}</p>
        </div>
      ) : null}

      <form
        action={verifyCustomerCode}
        className="st-account-verification__form"
        onSubmit={(event) => {
          if (!isComplete) {
            event.preventDefault();

            const firstEmpty =
              digits.findIndex(
                (digit) => !digit,
              );

            if (firstEmpty >= 0) {
              inputRefs.current[
                firstEmpty
              ]?.focus();
            }
          }
        }}
      >
        <input
          type="hidden"
          name="email"
          value={email}
        />

        <input
          type="hidden"
          name="code"
          value={code}
        />

        <fieldset>
          <legend>
            Verification code
          </legend>

          <div
            className="st-account-verification__digits"
            onPaste={handlePaste}
          >
            {digits.map(
              (digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] =
                      element;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  autoComplete={
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                  aria-label={`Verification digit ${
                    index + 1
                  }`}
                  onChange={(event) =>
                    updateDigit(
                      index,
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) =>
                    handleKeyDown(
                      index,
                      event,
                    )
                  }
                  onFocus={(event) =>
                    event.currentTarget.select()
                  }
                  className={
                    digit
                      ? "is-filled"
                      : ""
                  }
                />
              ),
            )}
          </div>
        </fieldset>

        <VerifyButton
          disabled={!isComplete}
        />
      </form>

      <div className="st-account-verification__resend">
        <div>
          <strong>
            Didn&apos;t receive the code?
          </strong>

          <span>
            Check your spam folder or request
            another code.
          </span>
        </div>

        <form
          action={resendCustomerCode}
        >
          <input
            type="hidden"
            name="email"
            value={email}
          />

          <ResendButton
            countdown={countdown}
          />
        </form>
      </div>

      <div className="st-account-verification__note">
        <ShieldCheck aria-hidden="true" />

        <p>
          Never share this verification code.
          Stereophonie will not ask you for it
          by phone, WhatsApp, Instagram or email.
        </p>
      </div>
    </div>
  );
}


<style jsx global>{`
/* === ST VERIFICATION LEGACY LOGO KILL === */

/*
 * The storefront header already provides the official
 * Stereophonie identity. Never display a second legacy
 * logo inside the verification card.
 */

.st-verify-card img[alt*="Stereophonie" i],
.st-verification-card img[alt*="Stereophonie" i],
.st-account-verify-card img[alt*="Stereophonie" i],
[class*="verify"][class*="card"] img[alt*="Stereophonie" i],
[class*="verification"][class*="card"] img[alt*="Stereophonie" i],

.st-verify-card [class*="logo"],
.st-verification-card [class*="logo"],
.st-account-verify-card [class*="logo"],
[class*="verify"][class*="card"] [class*="logo"],
[class*="verification"][class*="card"] [class*="logo"] {
  display: none !important;
}

/* === ST VERIFICATION LEGACY LOGO KILL END === */
`}</style>
