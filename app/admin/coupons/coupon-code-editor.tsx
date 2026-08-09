"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";

import { updateCouponCode } from "./actions";

type CouponCodeEditorProps = {
  couponId: string;
  currentCode: string;
};

export default function CouponCodeEditor({
  couponId,
  currentCode,
}: CouponCodeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [code, setCode] = useState(currentCode);

  function cancelEditing() {
    setCode(currentCode);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="border border-white/20 bg-white/[0.05] px-3 py-2 font-mono text-sm font-semibold uppercase tracking-[0.12em]">
          {currentCode}
        </span>

        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex h-9 items-center gap-2 border border-white/10 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45 transition hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit code
        </button>
      </div>
    );
  }

  return (
    <form
      action={updateCouponCode}
      className="flex max-w-md flex-wrap items-stretch gap-2"
    >
      <input type="hidden" name="coupon_id" value={couponId} />

      <input
        name="code"
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        autoCapitalize="characters"
        autoComplete="off"
        aria-label="Coupon code"
        className="min-h-11 min-w-0 flex-1 border border-white/20 bg-white/[0.05] px-3 font-mono text-sm font-semibold uppercase tracking-[0.12em] text-white outline-none transition focus:border-white/60"
      />

      <button
        type="submit"
        aria-label="Save coupon code"
        className="flex h-11 w-11 items-center justify-center border border-emerald-400/25 text-emerald-300 transition hover:bg-emerald-400/[0.08]"
      >
        <Check className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={cancelEditing}
        aria-label="Cancel editing coupon code"
        className="flex h-11 w-11 items-center justify-center border border-white/10 text-white/40 transition hover:border-red-400/25 hover:bg-red-400/[0.08] hover:text-red-300"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}
