"use client";

import { LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { useState, useTransition } from "react";

import { setCustomerAdminAccess } from "./actions";

type AdminAccessControlProps = {
  userId: string;
  initialIsAdmin: boolean;
  adminRole?: string | null;
  isCurrentUser?: boolean;
};

export default function AdminAccessControl({
  userId,
  initialIsAdmin,
  adminRole,
  isCurrentUser = false,
}: AdminAccessControlProps) {
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const [pending, startTransition] = useTransition();

  function changeAccess() {
    if (pending || isCurrentUser) {
      return;
    }

    const makeAdmin = !isAdmin;

    if (
      !makeAdmin &&
      !window.confirm("Remove administrator access from this account?")
    ) {
      return;
    }

    setMessage("");
    setMessageType("");

    startTransition(async () => {
      const result = await setCustomerAdminAccess(userId, makeAdmin);

      if (!result.ok) {
        setMessage(result.message);

        setMessageType("error");

        return;
      }

      setIsAdmin(Boolean(result.isAdmin));

      setMessage(result.message);

      setMessageType("success");
    });
  }

  return (
    <div className="min-w-[185px]">
      <div className="flex flex-col items-start gap-2">
        <span
          className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[9px] font-semibold uppercase tracking-[0.13em] ${
            isAdmin
              ? "border-emerald-500/20 bg-emerald-500/[0.09] text-emerald-300"
              : "border-white/10 bg-white/[0.045] text-white/45"
          }`}
        >
          {isAdmin ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <UserRound className="h-3.5 w-3.5" />
          )}

          {isAdmin ? adminRole?.trim() || "Administrator" : "Customer"}
        </span>

        {isCurrentUser ? (
          <>
            <span className="inline-flex min-h-8 items-center rounded-full border border-sky-400/15 bg-sky-400/[0.07] px-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-sky-300">
              Your account
            </span>

            <p className="max-w-[180px] text-[10px] leading-4 text-white/25">
              Your own administrator access is protected.
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={changeAccess}
            disabled={pending}
            className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full border px-3.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition disabled:cursor-wait disabled:opacity-50 ${
              isAdmin
                ? "border-red-400/20 bg-red-400/[0.055] text-red-300 hover:bg-red-400/[0.10]"
                : "border-white/15 bg-white/[0.045] text-white/65 hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {pending ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : isAdmin ? (
              <UserRound className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}

            {pending ? "Updating" : isAdmin ? "Remove admin" : "Make admin"}
          </button>
        )}

        {message ? (
          <p
            className={`max-w-[190px] text-[10px] leading-4 ${
              messageType === "error" ? "text-red-300" : "text-emerald-300"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
