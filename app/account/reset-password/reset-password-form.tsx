"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  completeCustomerPasswordReset,
} from "../actions";

function ResetSubmitButton() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="st-auth-clean-submit"
    >
      <span>
        {pending
          ? "Updating password..."
          : "Update password"}
      </span>

      <ArrowRight aria-hidden="true" />
    </button>
  );
}

export default function ResetPasswordForm({
  tokenHash,
}: {
  tokenHash: string;
}) {
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  return (
    <form
      action={
        completeCustomerPasswordReset
      }
      className="st-auth-clean-form"
    >
      <input
        type="hidden"
        name="tokenHash"
        value={tokenHash}
      />

      <label className="st-auth-clean-field">
        <span className="st-auth-clean-label-row">
          <span>New password</span>

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (current) => !current,
              )
            }
          >
            {showPassword
              ? <EyeOff />
              : <Eye />}

            {showPassword
              ? "Hide"
              : "Show"}
          </button>
        </span>

        <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            name="newPassword"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />
      </label>

      <label className="st-auth-clean-field">
        <span className="st-auth-clean-label-row">
          <span>
            Confirm new password
          </span>

          <button
            type="button"
            onClick={() =>
              setShowConfirmation(
                (current) => !current,
              )
            }
          >
            {showConfirmation
              ? <EyeOff />
              : <Eye />}

            {showConfirmation
              ? "Hide"
              : "Show"}
          </button>
        </span>

        <input
            type={
              showConfirmation
                ? "text"
                : "password"
            }
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat new password"
            minLength={8}
            required
          />
      </label>

      <ResetSubmitButton />
    </form>
  );
}
