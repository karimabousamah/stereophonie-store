"use client";

import { useSearchParams } from "next/navigation";

import AccountSigninSuccessToast from "@/components/storefront/account-signin-success-toast";
import AccountSignoutSuccessToast from "@/components/storefront/account-signout-success-toast";

export default function HomepageAccountSuccessToasts() {
  const searchParams = useSearchParams();
  const accountState = searchParams.get("account");

  return (
    <>
      <AccountSigninSuccessToast
        show={accountState === "logged-in"}
      />

      <AccountSignoutSuccessToast
        show={accountState === "signed-out"}
      />
    </>
  );
}
