"use client";

import { useMemo, useRef, useState } from "react";

import { verifyAdminOtp } from "./actions";

const LENGTH = 6;

export default function AdminOtpForm() {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));

  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => digits.join(""), [digits]);

  function update(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);

    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });

    if (value && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function keyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function paste(event: React.ClipboardEvent) {
    event.preventDefault();

    const value = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, LENGTH);

    if (!value) {
      return;
    }

    const next = Array(LENGTH).fill("");

    value.split("").forEach((digit, index) => {
      next[index] = digit;
    });

    setDigits(next);

    refs.current[Math.min(value.length, LENGTH - 1)]?.focus();
  }

  return (
    <form action={verifyAdminOtp} className="mt-8 space-y-5">
      <input type="hidden" name="code" value={code} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          Six-digit code
        </p>

        <div className="mt-3 grid grid-cols-6 gap-2.5" onPaste={paste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              autoFocus={index === 0}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Security code digit ${index + 1}`}
              onChange={(event) => update(index, event.target.value)}
              onKeyDown={(event) => keyDown(index, event)}
              onFocus={(event) => event.currentTarget.select()}
              className="h-[58px] min-w-0 rounded-[14px] border border-[#c58b22]/35 bg-white text-center text-xl font-semibold text-[#1d1d1f] outline-none transition-all duration-200 focus:border-[#c58b22]/80 focus:bg-[#fffaf0] focus:shadow-[0_0_0_4px_rgba(245,179,53,0.11)]"
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={code.length !== LENGTH}
        className="st3-admin-login-submit w-full rounded-[14px] border border-[#c58b22]/55 !bg-white px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] !text-[#1d1d1f] shadow-[0_2px_8px_rgba(29,29,31,0.035)] transition-all duration-300 hover:!border-[#c58b22]/80 hover:!bg-[#fffaf0] hover:shadow-[0_0_0_4px_rgba(245,179,53,0.11),0_10px_30px_rgba(196,135,27,0.13)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f5b335]/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Verify and continue
      </button>

      <a
        href="/admin/login"
        className="block text-center text-xs font-medium text-black/45 transition hover:text-[#9a6200]"
      >
        Back to sign in
      </a>
    </form>
  );
}
