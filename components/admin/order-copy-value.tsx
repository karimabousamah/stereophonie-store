"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type OrderCopyValueProps = {
  value:
    | string
    | null
    | undefined;
  label: string;
};

async function writeClipboard(
  value: string,
) {
  if (
    typeof navigator !==
      "undefined" &&
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(
      value,
    );

    return;
  }

  const textarea =
    document.createElement(
      "textarea",
    );

  textarea.value = value;
  textarea.setAttribute(
    "readonly",
    "",
  );

  textarea.style.position =
    "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(
    textarea,
  );

  textarea.select();

  document.execCommand("copy");

  document.body.removeChild(
    textarea,
  );
}

export default function OrderCopyValue({
  value,
  label,
}: OrderCopyValueProps) {
  const cleanValue =
    value?.trim() ?? "";

  const [copied, setCopied] =
    useState(false);

  const timeoutRef =
    useRef<
      ReturnType<typeof setTimeout>
      | null
    >(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current,
        );
      }
    };
  }, []);

  async function handleCopy() {
    if (!cleanValue) {
      return;
    }

    try {
      await writeClipboard(
        cleanValue,
      );

      setCopied(true);

      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current,
        );
      }

      timeoutRef.current =
        setTimeout(() => {
          setCopied(false);
        }, 1100);
    } catch {
      setCopied(false);
    }
  }

  if (!cleanValue) {
    return (
      <span className="st-admin-order-copy__empty">
        —
      </span>
    );
  }

  return (
    <span className="st-admin-order-copy">
      <button
        type="button"
        className="st-admin-order-copy__button"
        onClick={handleCopy}
        title={`Copy ${label}`}
        aria-label={`Copy ${label}: ${cleanValue}`}
      >
        {cleanValue}
      </button>

      {copied ? (
        <span
          className="st-admin-order-copy__notice"
          role="status"
        >
          Copied
        </span>
      ) : null}
    </span>
  );
}
