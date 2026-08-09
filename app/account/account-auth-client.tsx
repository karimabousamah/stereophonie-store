"use client";

import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { useFormStatus } from "react-dom";

import { loginCustomer, registerCustomer } from "./actions";

type AccountAuthClientProps = {
  mode: "login" | "register";
  error?: string;
  message?: string;
};

type FieldErrors = Record<string, string>;

type PhoneRule = {
  code: string;
  country: string;
  minLength: number;
  maxLength: number;
  placeholder: string;
};

const phoneRules: PhoneRule[] = [
  {
    code: "+961",
    country: "Lebanon",
    minLength: 8,
    maxLength: 8,
    placeholder: "71123456",
  },
  {
    code: "+966",
    country: "Saudi Arabia",
    minLength: 9,
    maxLength: 9,
    placeholder: "501234567",
  },
  {
    code: "+971",
    country: "United Arab Emirates",
    minLength: 9,
    maxLength: 9,
    placeholder: "501234567",
  },
  {
    code: "+974",
    country: "Qatar",
    minLength: 8,
    maxLength: 8,
    placeholder: "33123456",
  },
  {
    code: "+965",
    country: "Kuwait",
    minLength: 8,
    maxLength: 8,
    placeholder: "50123456",
  },
  {
    code: "+973",
    country: "Bahrain",
    minLength: 8,
    maxLength: 8,
    placeholder: "36123456",
  },
  {
    code: "+962",
    country: "Jordan",
    minLength: 9,
    maxLength: 9,
    placeholder: "791234567",
  },
  {
    code: "+20",
    country: "Egypt",
    minLength: 10,
    maxLength: 10,
    placeholder: "1012345678",
  },
  {
    code: "+33",
    country: "France",
    minLength: 9,
    maxLength: 9,
    placeholder: "612345678",
  },
  {
    code: "+39",
    country: "Italy",
    minLength: 6,
    maxLength: 11,
    placeholder: "3123456789",
  },
  {
    code: "+44",
    country: "United Kingdom",
    minLength: 10,
    maxLength: 10,
    placeholder: "7123456789",
  },
  {
    code: "+1",
    country: "United States / Canada",
    minLength: 10,
    maxLength: 10,
    placeholder: "2025550123",
  },
];

function getPhoneRule(code: string) {
  return phoneRules.find((rule) => rule.code === code) ?? phoneRules[0];
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function focusField(fieldId: string) {
  window.requestAnimationFrame(() => {
    const field = document.getElementById(fieldId);

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement
    ) {
      field.focus();
    }
  });
}

function inputClassName(error?: string) {
  return [
    "mt-2 w-full border bg-white px-4 py-4 text-sm text-black outline-none transition duration-200 placeholder:text-neutral-300",
    error
      ? "border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10"
      : "border-neutral-300 hover:border-neutral-400 focus:border-black focus:ring-4 focus:ring-black/[0.035]",
  ].join(" ");
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className="mt-2 flex items-start gap-2 text-xs leading-5 text-red-600"
    >
      <span className="mt-[1px] font-semibold">!</span>

      <span>{message}</span>
    </p>
  );
}

function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-center gap-4 border border-black bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.19em] text-white transition duration-300 hover:bg-white hover:text-black disabled:cursor-wait disabled:border-neutral-300 disabled:bg-neutral-200 disabled:text-neutral-500"
    >
      {pending ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-r-transparent" />

          {pendingLabel}
        </>
      ) : (
        <>
          {idleLabel}

          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </>
      )}
    </button>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  value,
  error,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label
          htmlFor={id}
          className={`text-[10px] font-semibold uppercase tracking-[0.17em] ${
            error ? "text-red-600" : "text-neutral-500"
          }`}
        >
          {label}
        </label>

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="bg-transparent text-[9px] font-semibold uppercase tracking-[0.15em] text-neutral-400 shadow-none transition hover:text-black"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          placeholder={placeholder}
          className={[
            "w-full border bg-white px-4 py-4 pr-16 text-sm text-black outline-none transition duration-200 placeholder:text-neutral-300",
            error
              ? "border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10"
              : "border-neutral-300 hover:border-neutral-400 focus:border-black focus:ring-4 focus:ring-black/[0.035]",
          ].join(" ")}
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold tracking-[0.12em] text-neutral-300">
          {visible ? "ABC" : "•••"}
        </span>
      </div>

      <FieldError id={errorId} message={error} />
    </div>
  );
}

function AccountMessage({
  type,
  children,
}: {
  type: "success" | "error";
  children: string;
}) {
  const isError = type === "error";

  return (
    <div
      className={`mt-6 flex items-start gap-4 border px-4 py-4 ${
        isError
          ? "border-red-200 bg-red-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${
          isError
            ? "border-red-300 text-red-700"
            : "border-emerald-300 text-emerald-700"
        }`}
      >
        {isError ? "!" : "✓"}
      </span>

      <p
        className={`text-sm leading-6 ${
          isError ? "text-red-700" : "text-emerald-800"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

export default function AccountAuthClient({
  mode,
  error,
  message,
}: AccountAuthClientProps) {
  const isRegister = mode === "register";

  const [loginEmail, setLoginEmail] = useState("");

  const [loginPassword, setLoginPassword] = useState("");

  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");

  const [phoneCountryCode, setPhoneCountryCode] = useState("+961");

  const [phone, setPhone] = useState("");

  const [registerPassword, setRegisterPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [registerErrors, setRegisterErrors] = useState<FieldErrors>({});

  const selectedPhoneRule = getPhoneRule(phoneCountryCode);

  function clearLoginError(field: string) {
    setLoginErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];

      return next;
    });
  }

  function clearRegisterError(field: string) {
    setRegisterErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];

      return next;
    });
  }

  function validateLogin(event: FormEvent<HTMLFormElement>) {
    const nextErrors: FieldErrors = {};

    if (!loginEmail.trim()) {
      nextErrors.loginEmail = "Email address is required.";
    } else if (!isValidEmail(loginEmail)) {
      nextErrors.loginEmail = "Enter a valid email address.";
    }

    if (!loginPassword) {
      nextErrors.loginPassword = "Password is required.";
    }

    setLoginErrors(nextErrors);

    if (nextErrors.loginEmail) {
      event.preventDefault();
      focusField("loginEmail");
      return;
    }

    if (nextErrors.loginPassword) {
      event.preventDefault();
      focusField("loginPassword");
    }
  }

  function validateRegistration(event: FormEvent<HTMLFormElement>) {
    const nextErrors: FieldErrors = {};

    if (!firstName.trim()) {
      nextErrors.firstName = "First name is required.";
    }

    if (!lastName.trim()) {
      nextErrors.lastName = "Last name is required.";
    }

    if (!registerEmail.trim()) {
      nextErrors.registerEmail = "Email address is required.";
    } else if (!isValidEmail(registerEmail)) {
      nextErrors.registerEmail = "Enter a valid email address.";
    }

    if (!phone) {
      nextErrors.phone = "Telephone number is required.";
    } else if (
      phone.length < selectedPhoneRule.minLength ||
      phone.length > selectedPhoneRule.maxLength
    ) {
      nextErrors.phone =
        selectedPhoneRule.minLength === selectedPhoneRule.maxLength
          ? `${selectedPhoneRule.country} telephone numbers must contain exactly ${selectedPhoneRule.maxLength} digits.`
          : `${selectedPhoneRule.country} telephone numbers must contain between ${selectedPhoneRule.minLength} and ${selectedPhoneRule.maxLength} digits.`;
    }

    if (!registerPassword) {
      nextErrors.registerPassword = "Password is required.";
    } else if (registerPassword.length < 8) {
      nextErrors.registerPassword =
        "Password must contain at least 8 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== registerPassword) {
      nextErrors.confirmPassword = "The passwords do not match.";
    }

    setRegisterErrors(nextErrors);

    if (nextErrors.firstName) {
      event.preventDefault();
      focusField("registerFirstName");
      return;
    }

    if (nextErrors.lastName) {
      event.preventDefault();
      focusField("registerLastName");
      return;
    }

    if (nextErrors.registerEmail) {
      event.preventDefault();
      focusField("registerEmail");
      return;
    }

    if (nextErrors.phone) {
      event.preventDefault();
      focusField("registerPhone");
      return;
    }

    if (nextErrors.registerPassword) {
      event.preventDefault();
      focusField("registerPassword");
      return;
    }

    if (nextErrors.confirmPassword) {
      event.preventDefault();
      focusField("confirmPassword");
    }
  }

  function handleCountryChange(code: string) {
    const nextRule = getPhoneRule(code);

    setPhoneCountryCode(code);

    if (phone.length > nextRule.maxLength) {
      setPhone("");
    }

    clearRegisterError("phone");
  }

  function handlePhoneChange(value: string) {
    if (!/^\d*$/.test(value)) {
      return;
    }

    if (value.length > selectedPhoneRule.maxLength) {
      return;
    }

    setPhone(value);
    clearRegisterError("phone");
  }

  function handlePhoneKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "Enter",
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  const phoneLengthText =
    selectedPhoneRule.minLength === selectedPhoneRule.maxLength
      ? `${selectedPhoneRule.country}: exactly ${selectedPhoneRule.maxLength} digits`
      : `${selectedPhoneRule.country}: ${selectedPhoneRule.minLength}–${selectedPhoneRule.maxLength} digits`;

  return (
    <main className="min-h-screen bg-[#f4f3f0] text-black">
      <header className="border-b border-black/10 bg-[#f4f3f0]">
        <div className="mx-auto grid max-w-[1500px] grid-cols-3 items-center px-5 py-6 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="justify-self-start text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 transition hover:text-black"
          >
            ← Store
          </Link>

          <Link href="/" className="justify-self-center text-center">
            <span className="block text-lg font-semibold uppercase tracking-[0.34em] sm:text-xl">
              Nita Style
            </span>

            <span className="mt-1 block text-[7px] uppercase tracking-[0.34em] text-neutral-400">
              Italian Apparel
            </span>
          </Link>

          <span className="justify-self-end text-[8px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Customer account
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-16 h-[520px] w-[520px] -translate-x-1/2 rounded-full border border-black/[0.035]" />

        <div className="pointer-events-none absolute left-1/2 top-36 h-[340px] w-[340px] -translate-x-1/2 rounded-full border border-black/[0.025]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-89px)] max-w-[1500px] items-center justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
          <div
            className={`w-full border border-black/10 bg-white shadow-[0_35px_100px_rgba(0,0,0,0.09)] ${
              isRegister ? "max-w-[860px]" : "max-w-[650px]"
            }`}
          >
            <div className="border-b border-neutral-200 px-6 py-7 text-center sm:px-10 sm:py-9">
              <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-neutral-400">
                Private customer access
              </p>

              <h1 className="mt-4 text-4xl font-medium uppercase leading-none tracking-[-0.05em] sm:text-5xl">
                {isRegister ? "Create your account" : "Welcome back"}
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-neutral-500">
                {isRegister
                  ? "Create a secure customer profile to manage your information, saved addresses, and order activity."
                  : "Sign in securely to view your personal information, saved delivery addresses, and order activity."}
              </p>
            </div>

            <div className="px-6 py-7 sm:px-10 sm:py-9">
              <div className="grid grid-cols-2 border border-neutral-200 bg-neutral-50 p-1">
                <Link
                  href="/account?mode=login"
                  className={`px-4 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                    !isRegister
                      ? "bg-black text-white"
                      : "text-neutral-400 hover:bg-white hover:text-black"
                  }`}
                >
                  Sign in
                </Link>

                <Link
                  href="/account?mode=register"
                  className={`px-4 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                    isRegister
                      ? "bg-black text-white"
                      : "text-neutral-400 hover:bg-white hover:text-black"
                  }`}
                >
                  Create account
                </Link>
              </div>

              {error ? (
                <AccountMessage type="error">{error}</AccountMessage>
              ) : null}

              {message ? (
                <AccountMessage type="success">{message}</AccountMessage>
              ) : null}

              {isRegister ? (
                <form
                  action={registerCustomer}
                  onSubmit={validateRegistration}
                  noValidate
                  className="mt-8"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="registerFirstName"
                        className={`text-[10px] font-semibold uppercase tracking-[0.17em] ${
                          registerErrors.firstName
                            ? "text-red-600"
                            : "text-neutral-500"
                        }`}
                      >
                        First name
                      </label>

                      <input
                        id="registerFirstName"
                        name="firstName"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(event) => {
                          setFirstName(event.target.value);

                          clearRegisterError("firstName");
                        }}
                        aria-invalid={Boolean(registerErrors.firstName)}
                        aria-describedby={
                          registerErrors.firstName
                            ? "registerFirstName-error"
                            : undefined
                        }
                        placeholder="First name"
                        className={inputClassName(registerErrors.firstName)}
                      />

                      <FieldError
                        id="registerFirstName-error"
                        message={registerErrors.firstName}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="registerLastName"
                        className={`text-[10px] font-semibold uppercase tracking-[0.17em] ${
                          registerErrors.lastName
                            ? "text-red-600"
                            : "text-neutral-500"
                        }`}
                      >
                        Last name
                      </label>

                      <input
                        id="registerLastName"
                        name="lastName"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(event) => {
                          setLastName(event.target.value);

                          clearRegisterError("lastName");
                        }}
                        aria-invalid={Boolean(registerErrors.lastName)}
                        aria-describedby={
                          registerErrors.lastName
                            ? "registerLastName-error"
                            : undefined
                        }
                        placeholder="Last name"
                        className={inputClassName(registerErrors.lastName)}
                      />

                      <FieldError
                        id="registerLastName-error"
                        message={registerErrors.lastName}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="registerEmail"
                        className={`text-[10px] font-semibold uppercase tracking-[0.17em] ${
                          registerErrors.registerEmail
                            ? "text-red-600"
                            : "text-neutral-500"
                        }`}
                      >
                        Email address
                      </label>

                      <input
                        id="registerEmail"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={registerEmail}
                        onChange={(event) => {
                          setRegisterEmail(event.target.value);

                          clearRegisterError("registerEmail");
                        }}
                        aria-invalid={Boolean(registerErrors.registerEmail)}
                        aria-describedby={
                          registerErrors.registerEmail
                            ? "registerEmail-error"
                            : undefined
                        }
                        placeholder="name@example.com"
                        className={inputClassName(registerErrors.registerEmail)}
                      />

                      <FieldError
                        id="registerEmail-error"
                        message={registerErrors.registerEmail}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="registerPhone"
                        className={`text-[10px] font-semibold uppercase tracking-[0.17em] ${
                          registerErrors.phone
                            ? "text-red-600"
                            : "text-neutral-500"
                        }`}
                      >
                        Telephone number
                      </label>

                      <div
                        className={`mt-2 grid grid-cols-[155px_minmax(0,1fr)] border bg-white transition focus-within:ring-4 ${
                          registerErrors.phone
                            ? "border-red-500 focus-within:border-red-600 focus-within:ring-red-500/10"
                            : "border-neutral-300 hover:border-neutral-400 focus-within:border-black focus-within:ring-black/[0.035]"
                        }`}
                      >
                        <select
                          name="phoneCountryCode"
                          value={phoneCountryCode}
                          onChange={(event) =>
                            handleCountryChange(event.target.value)
                          }
                          aria-label="Country calling code"
                          className="min-w-0 border-r border-neutral-300 bg-white px-3 py-4 text-xs outline-none sm:text-sm"
                        >
                          {phoneRules.map((rule) => (
                            <option
                              key={`${rule.code}-${rule.country}`}
                              value={rule.code}
                            >
                              {rule.code} {rule.country}
                            </option>
                          ))}
                        </select>

                        <input
                          id="registerPhone"
                          name="phone"
                          type="text"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          pattern="[0-9]*"
                          value={phone}
                          maxLength={selectedPhoneRule.maxLength}
                          onChange={(event) =>
                            handlePhoneChange(event.target.value)
                          }
                          onBeforeInput={(event) => {
                            const inputEvent = event.nativeEvent as InputEvent;

                            const enteredText = inputEvent.data ?? "";

                            if (enteredText && !/^\d+$/.test(enteredText)) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={handlePhoneKeyDown}
                          onPaste={(event) => {
                            const pastedText =
                              event.clipboardData.getData("text");

                            if (!/^\d+$/.test(pastedText)) {
                              event.preventDefault();
                              return;
                            }

                            const input = event.currentTarget;

                            const selectionStart =
                              input.selectionStart ?? phone.length;

                            const selectionEnd =
                              input.selectionEnd ?? phone.length;

                            const nextValue =
                              phone.slice(0, selectionStart) +
                              pastedText +
                              phone.slice(selectionEnd);

                            if (
                              nextValue.length > selectedPhoneRule.maxLength
                            ) {
                              event.preventDefault();
                            }
                          }}
                          onDrop={(event) => {
                            const droppedText =
                              event.dataTransfer.getData("text");

                            if (!/^\d+$/.test(droppedText)) {
                              event.preventDefault();
                            }
                          }}
                          aria-invalid={Boolean(registerErrors.phone)}
                          aria-describedby={
                            registerErrors.phone
                              ? "registerPhone-error"
                              : "registerPhone-hint"
                          }
                          placeholder={selectedPhoneRule.placeholder}
                          className="min-w-0 px-4 py-4 text-sm outline-none placeholder:text-neutral-300"
                        />
                      </div>

                      {registerErrors.phone ? (
                        <FieldError
                          id="registerPhone-error"
                          message={registerErrors.phone}
                        />
                      ) : (
                        <div
                          id="registerPhone-hint"
                          className="mt-2 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.12em] text-neutral-400"
                        >
                          <span>{phoneLengthText}</span>

                          <span>
                            {phone.length}/{selectedPhoneRule.maxLength}
                          </span>
                        </div>
                      )}
                    </div>

                    <PasswordField
                      id="registerPassword"
                      name="password"
                      label="Create password"
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      value={registerPassword}
                      error={registerErrors.registerPassword}
                      onChange={(value) => {
                        setRegisterPassword(value);

                        clearRegisterError("registerPassword");

                        if (registerErrors.confirmPassword) {
                          clearRegisterError("confirmPassword");
                        }
                      }}
                    />

                    <PasswordField
                      id="confirmPassword"
                      name="confirmPassword"
                      label="Confirm password"
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      error={registerErrors.confirmPassword}
                      onChange={(value) => {
                        setConfirmPassword(value);

                        clearRegisterError("confirmPassword");
                      }}
                    />
                  </div>

                  <div className="mt-6 border border-neutral-200 bg-neutral-50 px-5 py-4">
                    <div className="flex items-start gap-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-neutral-200 bg-white text-[10px] font-semibold">
                        06
                      </span>

                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-neutral-600">
                          Email verification
                        </p>

                        <p className="mt-2 text-xs leading-6 text-neutral-500">
                          A six-digit verification code will be sent to your
                          email address after registration.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <SubmitButton
                      idleLabel="Create and verify account"
                      pendingLabel="Creating account"
                    />
                  </div>
                </form>
              ) : (
                <form
                  action={loginCustomer}
                  onSubmit={validateLogin}
                  noValidate
                  className="mt-8 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="loginEmail"
                      className={`text-[10px] font-semibold uppercase tracking-[0.17em] ${
                        loginErrors.loginEmail
                          ? "text-red-600"
                          : "text-neutral-500"
                      }`}
                    >
                      Email address
                    </label>

                    <input
                      id="loginEmail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(event) => {
                        setLoginEmail(event.target.value);

                        clearLoginError("loginEmail");
                      }}
                      aria-invalid={Boolean(loginErrors.loginEmail)}
                      aria-describedby={
                        loginErrors.loginEmail ? "loginEmail-error" : undefined
                      }
                      placeholder="name@example.com"
                      className={inputClassName(loginErrors.loginEmail)}
                    />

                    <FieldError
                      id="loginEmail-error"
                      message={loginErrors.loginEmail}
                    />
                  </div>

                  <PasswordField
                    id="loginPassword"
                    name="password"
                    label="Password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    error={loginErrors.loginPassword}
                    onChange={(value) => {
                      setLoginPassword(value);

                      clearLoginError("loginPassword");
                    }}
                  />

                  <div className="pt-1">
                    <SubmitButton
                      idleLabel="Enter my account"
                      pendingLabel="Signing in"
                    />
                  </div>
                </form>
              )}

              <div className="mt-8 border-t border-neutral-200 pt-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-neutral-200 text-[9px] font-semibold">
                    ✓
                  </span>

                  <p className="text-xs leading-6 text-neutral-400">
                    Your personal information and account access are protected
                    through secure authentication.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid border-t border-neutral-200 sm:grid-cols-3">
              <div className="px-5 py-5 text-center sm:border-r sm:border-neutral-200">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  01
                </p>

                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em]">
                  Verified identity
                </p>
              </div>

              <div className="border-t border-neutral-200 px-5 py-5 text-center sm:border-r sm:border-t-0 sm:border-neutral-200">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  02
                </p>

                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em]">
                  Saved addresses
                </p>
              </div>

              <div className="border-t border-neutral-200 px-5 py-5 text-center sm:border-t-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  03
                </p>

                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em]">
                  Order tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
