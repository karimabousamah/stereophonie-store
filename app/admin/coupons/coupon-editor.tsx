"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { deleteCoupon, updateCoupon } from "./actions";

type CouponEditorProps = {
  coupon: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    minimum_subtotal: number;
    max_discount_amount: number | null;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
    first_order_only: boolean;
    max_redemptions: number | null;
    max_redemptions_per_customer: number | null;
  };
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
}

function inputClass() {
  return [
    "mt-2 min-h-11 w-full border border-white/10",
    "bg-[#111111] px-4 text-sm text-white outline-none",
    "transition placeholder:text-white/20",
    "focus:border-white/45",
  ].join(" ");
}

function labelClass() {
  return [
    "text-[9px] font-semibold uppercase",
    "tracking-[0.16em] text-white/40",
  ].join(" ");
}

export default function CouponEditor({ coupon }: CouponEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    coupon.discount_type,
  );

  function closeEditor() {
    setDiscountType(coupon.discount_type);

    setIsEditing(false);
  }

  function confirmDeletion(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Delete coupon ${coupon.code}? This cannot be undone. Coupons that have already been used cannot be permanently deleted.`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 border border-white/15 px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/55 transition hover:border-white/40 hover:bg-white/[0.05] hover:text-white"
      >
        <Pencil className="h-4 w-4" />
        Edit complete coupon
      </button>
    );
  }

  return (
    <div className="border border-white/15 bg-[#101010]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-5">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Coupon settings
          </p>

          <h4 className="mt-2 text-xl font-semibold">Edit {coupon.code}</h4>
        </div>

        <button
          type="button"
          onClick={closeEditor}
          aria-label="Close coupon editor"
          className="flex h-10 w-10 items-center justify-center border border-white/10 text-white/40 transition hover:border-red-400/25 hover:bg-red-400/[0.08] hover:text-red-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form action={updateCoupon} className="space-y-6 p-5">
        <input type="hidden" name="coupon_id" value={coupon.id} />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor={`coupon-name-${coupon.id}`}
              className={labelClass()}
            >
              Internal name
            </label>

            <input
              id={`coupon-name-${coupon.id}`}
              name="name"
              type="text"
              defaultValue={coupon.name}
              className={inputClass()}
            />
          </div>

          <div>
            <label
              htmlFor={`coupon-code-${coupon.id}`}
              className={labelClass()}
            >
              Coupon code
            </label>

            <input
              id={`coupon-code-${coupon.id}`}
              name="code"
              type="text"
              defaultValue={coupon.code}
              autoCapitalize="characters"
              autoComplete="off"
              onInput={(event) => {
                event.currentTarget.value =
                  event.currentTarget.value.toUpperCase();
              }}
              className={`${inputClass()} font-mono uppercase tracking-[0.1em]`}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`coupon-description-${coupon.id}`}
            className={labelClass()}
          >
            Description
          </label>

          <textarea
            id={`coupon-description-${coupon.id}`}
            name="description"
            defaultValue={coupon.description ?? ""}
            rows={4}
            placeholder="Optional internal campaign description"
            className={`${inputClass()} min-h-28 resize-y py-3 leading-6`}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor={`discount-type-${coupon.id}`}
              className={labelClass()}
            >
              Discount type
            </label>

            <select
              id={`discount-type-${coupon.id}`}
              name="discount_type"
              value={discountType}
              onChange={(event) =>
                setDiscountType(event.target.value as "percentage" | "fixed")
              }
              className={inputClass()}
            >
              <option value="percentage">Percentage</option>

              <option value="fixed">Fixed amount</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={`discount-value-${coupon.id}`}
              className={labelClass()}
            >
              {discountType === "percentage"
                ? "Discount percentage"
                : "Discount amount"}
            </label>

            <input
              id={`discount-value-${coupon.id}`}
              name="discount_value"
              type="number"
              min="0.01"
              max={discountType === "percentage" ? "100" : undefined}
              step="0.01"
              defaultValue={coupon.discount_value}
              className={inputClass()}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor={`minimum-subtotal-${coupon.id}`}
              className={labelClass()}
            >
              Minimum spend
            </label>

            <input
              id={`minimum-subtotal-${coupon.id}`}
              name="minimum_subtotal"
              type="number"
              min="0"
              step="0.01"
              defaultValue={coupon.minimum_subtotal}
              className={inputClass()}
            />
          </div>

          <div>
            <label
              htmlFor={`maximum-discount-${coupon.id}`}
              className={labelClass()}
            >
              Maximum discount amount
            </label>

            <input
              id={`maximum-discount-${coupon.id}`}
              name="max_discount_amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={coupon.max_discount_amount ?? ""}
              disabled={discountType === "fixed"}
              placeholder={
                discountType === "fixed" ? "Not applicable" : "No maximum"
              }
              className={`${inputClass()} disabled:cursor-not-allowed disabled:opacity-35`}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`starts-at-${coupon.id}`} className={labelClass()}>
              Start date
            </label>

            <input
              id={`starts-at-${coupon.id}`}
              name="starts_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(coupon.starts_at)}
              className={inputClass()}
            />
          </div>

          <div>
            <label htmlFor={`ends-at-${coupon.id}`} className={labelClass()}>
              Expiration date
            </label>

            <input
              id={`ends-at-${coupon.id}`}
              name="ends_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(coupon.ends_at)}
              className={inputClass()}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor={`max-redemptions-${coupon.id}`}
              className={labelClass()}
            >
              Total usage limit
            </label>

            <input
              id={`max-redemptions-${coupon.id}`}
              name="max_redemptions"
              type="number"
              min="1"
              step="1"
              defaultValue={coupon.max_redemptions ?? ""}
              placeholder="Unlimited"
              className={inputClass()}
            />
          </div>

          <div>
            <label
              htmlFor={`customer-limit-${coupon.id}`}
              className={labelClass()}
            >
              Uses per customer
            </label>

            <input
              id={`customer-limit-${coupon.id}`}
              name="max_redemptions_per_customer"
              type="number"
              min="1"
              step="1"
              defaultValue={coupon.max_redemptions_per_customer ?? ""}
              placeholder="Unlimited"
              className={inputClass()}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 border border-white/10 bg-white/[0.025] p-4">
            <input
              name="first_order_only"
              type="checkbox"
              defaultChecked={coupon.first_order_only}
              className="mt-0.5 h-4 w-4 accent-white"
            />

            <span>
              <span className="block text-sm font-medium">
                First order only
              </span>

              <span className="mt-1 block text-xs leading-5 text-white/35">
                Only customers without a previous active order may use this
                coupon.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 border border-white/10 bg-white/[0.025] p-4">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={coupon.is_active}
              className="mt-0.5 h-4 w-4 accent-white"
            />

            <span>
              <span className="block text-sm font-medium">Coupon active</span>

              <span className="mt-1 block text-xs leading-5 text-white/35">
                Customers may use it while its schedule and limits remain valid.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeEditor}
            className="flex min-h-11 items-center justify-center gap-2 border border-white/15 px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/50 transition hover:border-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          <button
            type="submit"
            className="flex min-h-11 items-center justify-center gap-2 bg-white px-6 text-[9px] font-semibold uppercase tracking-[0.15em] text-black transition hover:bg-white/85"
          >
            <Check className="h-4 w-4" />
            Save all changes
          </button>
        </div>
      </form>

      <div className="border-t border-red-400/15 bg-red-400/[0.035] p-5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-red-300">
          Danger zone
        </p>

        <p className="mt-2 text-xs leading-6 text-white/40">
          An unused coupon can be permanently deleted. A coupon with redemption
          history must be disabled instead.
        </p>

        <form action={deleteCoupon} onSubmit={confirmDeletion} className="mt-4">
          <input type="hidden" name="coupon_id" value={coupon.id} />

          <button
            type="submit"
            className="flex min-h-11 w-full items-center justify-center gap-2 border border-red-400/25 px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-red-300 transition hover:bg-red-400/[0.08]"
          >
            <Trash2 className="h-4 w-4" />
            Delete coupon permanently
          </button>
        </form>
      </div>
    </div>
  );
}
