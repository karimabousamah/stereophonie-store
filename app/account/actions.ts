"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  CUSTOMER_OTP_CHALLENGE_COOKIE,
  CUSTOMER_OTP_TTL_SECONDS,
  createCustomerOtpChallenge,
  readCustomerOtpChallenge,
  verifyCustomerOtpChallenge,
} from "@/lib/customer-security/otp";
import { sendCustomerVerificationOtp } from "@/lib/email/send-customer-verification-otp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AccountMode = "login" | "register";

export type DeleteAccountState = {
  status: "idle" | "error";
  message: string;
};

function readText(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function redirectToAccount(
  message: string,
  type: "message" | "error" = "message",
): never {
  redirect(`/account?${type}=${encodeURIComponent(message)}`);
}

function redirectToAuthentication(
  message: string,
  mode: AccountMode,
  type: "message" | "error" = "error",
): never {
  redirect(`/account?mode=${mode}&${type}=${encodeURIComponent(message)}`);
}

function redirectToVerification(
  email: string,
  message: string,
  type: "message" | "error" = "message",
): never {
  redirect(
    `/account/verify?email=${encodeURIComponent(
      email,
    )}&${type}=${encodeURIComponent(message)}`,
  );
}

async function getAuthenticatedCustomer() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirectToAuthentication(
      "Your session has expired. Please sign in again.",
      "login",
    );
  }

  return {
    supabase,
    user,
  };
}

/* =========================================================
   CUSTOMER LOGIN
========================================================= */

export async function loginCustomer(formData: FormData) {
  const email = cleanEmail(readText(formData, "email"));

  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirectToAuthentication("Enter your email address and password.", "login");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes("email not confirmed")) {
      redirectToVerification(
        email,
        "Enter the verification code sent to your email address.",
      );
    }

    redirectToAuthentication(
      "The email address or password is incorrect.",
      "login",
    );
  }

  redirect("/?account=logged-in");
}

/* =========================================================
   CUSTOMER REGISTRATION
========================================================= */

export async function registerCustomer(formData: FormData) {
  const firstName = readText(formData, "firstName");

  const lastName = readText(formData, "lastName");

  const email = cleanEmail(readText(formData, "email"));

  const phoneCountryCode = readText(formData, "phoneCountryCode") || "+961";

  const phoneNumber = cleanPhone(readText(formData, "phone"));

  const password = String(formData.get("password") ?? "");

  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phoneNumber ||
    !password ||
    !confirmPassword
  ) {
    redirectToAuthentication("Complete all required fields.", "register");
  }

  if (!/^\+\d{1,4}$/.test(phoneCountryCode)) {
    redirectToAuthentication(
      "Select a valid country calling code.",
      "register",
    );
  }

  if (phoneNumber.length < 6 || phoneNumber.length > 15) {
    redirectToAuthentication("Enter a valid phone number.", "register");
  }

  if (password.length < 8) {
    redirectToAuthentication(
      "Your password must contain at least 8 characters.",
      "register",
    );
  }

  if (password !== confirmPassword) {
    redirectToAuthentication("The passwords do not match.", "register");
  }

  /*
   * IMPORTANT:
   * We intentionally create the Supabase Auth user through
   * the server-side administrator API.
   *
   * This prevents Supabase from sending its own confirmation
   * / magic-link email. Stereophonie sends the six-digit OTP
   * through Resend instead.
   */
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      phone_country_code: phoneCountryCode,
      phone: phoneNumber,
    },
  });

  if (error || !data.user) {
    const message = error?.message?.toLowerCase().includes("already")
      ? "An account already exists with this email address."
      : "Your account could not be created. Please try again.";

    redirectToAuthentication(message, "register");
  }

  const { code, token } = createCustomerOtpChallenge(data.user.id, email);

  const delivery = await sendCustomerVerificationOtp(email, code);

  if (!delivery.success) {
    /*
     * Do not leave an inaccessible half-created account
     * behind when the verification email fails.
     */
    await admin.auth.admin.deleteUser(data.user.id);

    redirectToAuthentication(
      delivery.message || "The verification email could not be sent.",
      "register",
    );
  }

  const cookieStore = await cookies();

  cookieStore.set(CUSTOMER_OTP_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_OTP_TTL_SECONDS,
  });

  redirectToVerification(
    email,
    "A new 6-digit verification code was sent to your email.",
  );
}

/* =========================================================
   EMAIL CODE VERIFICATION
========================================================= */

export async function verifyCustomerCode(formData: FormData) {
  const email = cleanEmail(readText(formData, "email"));

  const code = cleanPhone(readText(formData, "code"));

  if (!email) {
    redirectToAuthentication(
      "Your email address is missing. Please create the account again.",
      "register",
    );
  }

  if (!/^\d{6}$/.test(code)) {
    redirectToVerification(
      email,
      "Enter the complete 6-digit verification code.",
      "error",
    );
  }

  const cookieStore = await cookies();

  const result = verifyCustomerOtpChallenge(
    cookieStore.get(CUSTOMER_OTP_CHALLENGE_COOKIE)?.value,
    code,
  );

  if (!result.ok) {
    if (result.reason === "incorrect" && result.token) {
      cookieStore.set(CUSTOMER_OTP_CHALLENGE_COOKIE, result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: CUSTOMER_OTP_TTL_SECONDS,
      });

      redirectToVerification(
        email,
        `Incorrect verification code. ${result.attemptsRemaining} attempt${
          result.attemptsRemaining === 1 ? "" : "s"
        } remaining.`,
        "error",
      );
    }

    cookieStore.delete(CUSTOMER_OTP_CHALLENGE_COOKIE);

    redirectToVerification(
      email,
      result.reason === "expired"
        ? "This verification code expired. Create the account again to receive a new code."
        : "The verification session is no longer valid. Please create the account again.",
      "error",
    );
  }

  if (result.challenge.email !== email) {
    cookieStore.delete(CUSTOMER_OTP_CHALLENGE_COOKIE);

    redirectToAuthentication(
      "The verification session does not match this email address.",
      "register",
    );
  }

  const admin = createAdminClient();

  const { error: confirmError } = await admin.auth.admin.updateUserById(
    result.challenge.userId,
    {
      email_confirm: true,
    },
  );

  if (confirmError) {
    redirectToVerification(
      email,
      "Your code was correct, but the account could not be activated. Please try again.",
      "error",
    );
  }

  cookieStore.delete(CUSTOMER_OTP_CHALLENGE_COOKIE);

  redirect(
    `/account?mode=login&message=${encodeURIComponent(
      "Your email has been verified. Sign in to continue.",
    )}`,
  );
}

export async function resendCustomerCode(formData: FormData) {
  const email = cleanEmail(readText(formData, "email"));

  if (!email) {
    redirectToAuthentication(
      "Enter your email address and create the account again.",
      "register",
    );
  }

  const cookieStore = await cookies();

  const current = readCustomerOtpChallenge(
    cookieStore.get(CUSTOMER_OTP_CHALLENGE_COOKIE)?.value,
  );

  if (!current || current.email !== email) {
    redirectToVerification(
      email,
      "Your verification session expired. Please create the account again.",
      "error",
    );
  }

  const { code, token } = createCustomerOtpChallenge(
    current.userId,
    current.email,
  );

  const delivery = await sendCustomerVerificationOtp(current.email, code);

  if (!delivery.success) {
    redirectToVerification(
      email,
      "A new verification code could not be sent. Please try again shortly.",
      "error",
    );
  }

  cookieStore.set(CUSTOMER_OTP_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_OTP_TTL_SECONDS,
  });

  redirectToVerification(
    email,
    "A new 6-digit verification code was sent to your email.",
  );
}

/* =========================================================
   CUSTOMER PROFILE
========================================================= */

export async function updateCustomerProfile(formData: FormData) {
  const { supabase, user } = await getAuthenticatedCustomer();

  const firstName = readText(formData, "firstName");

  const lastName = readText(formData, "lastName");

  const phoneCountryCode = readText(formData, "phoneCountryCode") || "+961";

  const phoneNumber = cleanPhone(readText(formData, "phoneNumber"));

  if (!firstName || !lastName) {
    redirectToAccount("Your first name and last name are required.", "error");
  }

  if (!/^\+\d{1,4}$/.test(phoneCountryCode)) {
    redirectToAccount("Select a valid country calling code.", "error");
  }

  if (phoneNumber.length < 6 || phoneNumber.length > 15) {
    redirectToAccount("Enter a valid phone number.", "error");
  }

  const { error: profileError } = await supabase
    .from("customer_profiles")
    .upsert(
      {
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone_country_code: phoneCountryCode,
        phone_number: phoneNumber,
      },
      {
        onConflict: "user_id",
      },
    );

  if (profileError) {
    redirectToAccount("Your profile could not be updated.", "error");
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      first_name: firstName,
      last_name: lastName,
      phone_country_code: phoneCountryCode,
      phone: phoneNumber,
    },
  });

  if (metadataError) {
    redirectToAccount(
      "Your profile was saved, but the account metadata could not be synchronized.",
      "error",
    );
  }

  revalidatePath("/account");

  redirectToAccount("Your personal information was updated successfully.");
}

/* =========================================================
   PASSWORD CHANGE
========================================================= */

export async function changeCustomerPassword(formData: FormData) {
  const { supabase, user } = await getAuthenticatedCustomer();

  const currentPassword = String(formData.get("currentPassword") ?? "");

  const newPassword = String(formData.get("newPassword") ?? "");

  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirectToAccount("Complete all password fields.", "error");
  }

  if (newPassword.length < 8) {
    redirectToAccount(
      "Your new password must contain at least 8 characters.",
      "error",
    );
  }

  if (newPassword !== confirmPassword) {
    redirectToAccount("The new passwords do not match.", "error");
  }

  if (currentPassword === newPassword) {
    redirectToAccount(
      "Choose a new password that is different from your current password.",
      "error",
    );
  }

  if (!user.email) {
    redirectToAccount("Your account email could not be verified.", "error");
  }

  const { error: passwordCheckError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (passwordCheckError) {
    redirectToAccount("Your current password is incorrect.", "error");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    redirectToAccount(
      updateError.message || "Your password could not be changed.",
      "error",
    );
  }

  redirectToAccount("Your password was changed successfully.");
}

/* =========================================================
   ADDRESS HELPERS
========================================================= */

function readAddress(formData: FormData) {
  return {
    label: readText(formData, "label") || "Home",

    country: readText(formData, "country") || "Lebanon",

    city: readText(formData, "city"),

    area: readText(formData, "area"),

    address_line: readText(formData, "addressLine"),

    building: readText(formData, "building"),

    floor: readText(formData, "floor"),

    apartment: readText(formData, "apartment"),

    landmark: readText(formData, "landmark"),

    delivery_instructions: readText(formData, "deliveryInstructions"),

    is_default:
      formData.get("isDefault") === "on" ||
      formData.get("isDefault") === "true",
  };
}

function validateAddress(address: ReturnType<typeof readAddress>) {
  if (
    !address.label ||
    !address.country ||
    !address.city ||
    !address.address_line
  ) {
    redirectToAccount(
      "Complete the address label, country, city, and full address.",
      "error",
    );
  }
}

/* =========================================================
   ADD ADDRESS
========================================================= */

export async function addCustomerAddress(formData: FormData) {
  const { supabase, user } = await getAuthenticatedCustomer();

  const address = readAddress(formData);

  validateAddress(address);

  const { error } = await supabase.from("customer_addresses").insert({
    user_id: user.id,
    ...address,
  });

  if (error) {
    redirectToAccount("The delivery address could not be saved.", "error");
  }

  revalidatePath("/account");
  revalidatePath("/checkout");

  redirectToAccount("Your delivery address was saved.");
}

/* =========================================================
   UPDATE ADDRESS
========================================================= */

export async function updateCustomerAddress(formData: FormData) {
  const { supabase, user } = await getAuthenticatedCustomer();

  const addressId = readText(formData, "addressId");

  if (!addressId) {
    redirectToAccount("The delivery address could not be identified.", "error");
  }

  const address = readAddress(formData);

  validateAddress(address);

  const { error } = await supabase
    .from("customer_addresses")
    .update(address)
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) {
    redirectToAccount("The delivery address could not be updated.", "error");
  }

  revalidatePath("/account");
  revalidatePath("/checkout");

  redirectToAccount("Your delivery address was updated.");
}

/* =========================================================
   SET DEFAULT ADDRESS
========================================================= */

export async function setDefaultCustomerAddress(formData: FormData) {
  const { supabase, user } = await getAuthenticatedCustomer();

  const addressId = readText(formData, "addressId");

  if (!addressId) {
    redirectToAccount("The delivery address could not be identified.", "error");
  }

  const { error } = await supabase
    .from("customer_addresses")
    .update({
      is_default: true,
    })
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) {
    redirectToAccount(
      "The default delivery address could not be changed.",
      "error",
    );
  }

  revalidatePath("/account");
  revalidatePath("/checkout");

  redirectToAccount("Your default delivery address was updated.");
}

/* =========================================================
   DELETE ADDRESS
========================================================= */

export async function deleteCustomerAddress(formData: FormData) {
  const { supabase, user } = await getAuthenticatedCustomer();

  const addressId = readText(formData, "addressId");

  if (!addressId) {
    redirectToAccount("The delivery address could not be identified.", "error");
  }

  const { data: selectedAddress } = await supabase
    .from("customer_addresses")
    .select("id, is_default")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!selectedAddress) {
    redirectToAccount("This delivery address no longer exists.", "error");
  }

  const { error: deleteError } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (deleteError) {
    redirectToAccount("The delivery address could not be deleted.", "error");
  }

  if (selectedAddress.is_default) {
    const { data: nextAddress } = await supabase
      .from("customer_addresses")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (nextAddress) {
      await supabase
        .from("customer_addresses")
        .update({
          is_default: true,
        })
        .eq("id", nextAddress.id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/account");
  revalidatePath("/checkout");

  redirectToAccount("The delivery address was deleted.");
}

/* =========================================================
   STOCK EMAIL PREFERENCES
========================================================= */

export async function updateStockNotificationPreference(formData: FormData) {
  const { supabase } = await getAuthenticatedCustomer();

  const notificationsEnabled = readText(formData, "enabled") === "true";

  const { error } = await supabase.rpc("set_my_stock_notification_preference", {
    requested_enabled: notificationsEnabled,
  });

  if (error) {
    console.error(
      "Stock notification preference update failed:",
      error.message,
    );

    redirectToAccount(
      "Your stock email preference could not be updated.",
      "error",
    );
  }

  revalidatePath("/account");

  redirectToAccount(
    notificationsEnabled
      ? "Stock email notifications were enabled."
      : "Stock email notifications were disabled.",
  );
}

/* =========================================================
   DELETE CUSTOMER ACCOUNT
========================================================= */

export async function deleteCustomerAccount(
  _previousState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const password = String(formData.get("accountPassword") ?? "");

  const confirmationText = readText(formData, "confirmationText");

  const acceptedPermanentDeletion =
    formData.get("acceptPermanentDeletion") === "on";

  if (!password) {
    return {
      status: "error",
      message: "Enter your current account password.",
    };
  }

  if (confirmationText !== "DELETE") {
    return {
      status: "error",
      message: "Type DELETE exactly as displayed to continue.",
    };
  }

  if (!acceptedPermanentDeletion) {
    return {
      status: "error",
      message: "Confirm that you understand this action is permanent.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "Your session has expired. Refresh the page and sign in again.",
    };
  }

  if (!user.email) {
    return {
      status: "error",
      message: "Your account email could not be verified.",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return {
      status: "error",
      message: "Account verification is temporarily unavailable.",
    };
  }

  const verificationClient = createSupabaseClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: verificationData, error: verificationError } =
    await verificationClient.auth.signInWithPassword({
      email: user.email,
      password,
    });

  if (
    verificationError ||
    !verificationData.user ||
    verificationData.user.id !== user.id
  ) {
    return {
      status: "error",
      message: "The password you entered is incorrect.",
    };
  }

  await verificationClient.auth.signOut();

  let adminClient;

  try {
    adminClient = createAdminClient();
  } catch {
    return {
      status: "error",
      message:
        "Secure account deletion is not configured yet. Check the private Supabase server key.",
    };
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
    false,
  );

  if (deleteError) {
    console.error("Customer account deletion failed:", deleteError.message);

    return {
      status: "error",
      message:
        "Your account could not be deleted. No changes were completed. Please try again.",
    };
  }

  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  redirect("/?account=deleted");
}

/* =========================================================
   CUSTOMER LOGOUT
========================================================= */

export async function logoutCustomer() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/?account=signed-out");
}
