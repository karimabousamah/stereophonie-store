"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { loginCustomer, registerCustomer } from "./actions";

type Props = {
  mode: "login" | "register";
  error?: string;
  message?: string;
};

type PhoneRule = {
  code: string;
  country: string;
  digits: number;
  placeholder: string;
};

const phoneRules: PhoneRule[] = [
  {
    code: "+961",
    country: "Lebanon",
    digits: 8,
    placeholder: "71123456",
  },
  {
    code: "+966",
    country: "Saudi Arabia",
    digits: 9,
    placeholder: "501234567",
  },
  {
    code: "+971",
    country: "United Arab Emirates",
    digits: 9,
    placeholder: "501234567",
  },
  {
    code: "+974",
    country: "Qatar",
    digits: 8,
    placeholder: "33123456",
  },
  {
    code: "+965",
    country: "Kuwait",
    digits: 8,
    placeholder: "50123456",
  },
  {
    code: "+973",
    country: "Bahrain",
    digits: 8,
    placeholder: "36123456",
  },
  {
    code: "+962",
    country: "Jordan",
    digits: 9,
    placeholder: "791234567",
  },
  {
    code: "+20",
    country: "Egypt",
    digits: 10,
    placeholder: "1012345678",
  },
  {
    code: "+33",
    country: "France",
    digits: 9,
    placeholder: "612345678",
  },
  {
    code: "+39",
    country: "Italy",
    digits: 10,
    placeholder: "3123456789",
  },
];

function SubmitButton({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();

  return (
    <button type="submit" disabled={isPending} className="st-auth-clean-submit">
      <span>{isPending ? pending : idle}</span>

      <ArrowRight aria-hidden="true" />
    </button>
  );
}

function AuthMessage({
  type,
  children,
}: {
  type: "error" | "success";
  children: string;
}) {
  return (
    <div
      className={`st-auth-clean-message ${
        type === "error" ? "is-error" : "is-success"
      }`}
      role={type === "error" ? "alert" : "status"}
    >
      <span>{type === "error" ? "!" : "✓"}</span>

      <p>{children}</p>
    </div>
  );
}

export default function AccountAuthClient({ mode, error, message }: Props) {
  const isRegister = mode === "register";

  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phoneCountryCode, setPhoneCountryCode] = useState("+961");

  const [phone, setPhone] = useState("");

  const phoneRule = useMemo(
    () =>
      phoneRules.find((rule) => rule.code === phoneCountryCode) ??
      phoneRules[0],
    [phoneCountryCode],
  );

  function updatePhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, phoneRule.digits);

    setPhone(digits);
  }

  function changeCountry(value: string) {
    setPhoneCountryCode(value);
    setPhone("");
  }

  return (
    <main className="st-auth-clean">
      <section className="st-auth-clean-stage">
        <div className="st-auth-clean-card">
          <div className="st-auth-clean-brand">
            <Link
              href="/"
              className="st-auth-clean-logo"
              aria-label="Stereophonie Store home"
            ></Link>

            <div className="st-auth-clean-security">
              <ShieldCheck />
              <span>Secure account</span>
            </div>
          </div>

          <div className="st-auth-clean-heading">
            <span>My account</span>

            <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>

            <p>
              {isRegister
                ? "Create an account to manage orders, addresses and your saved items."
                : "Sign in to manage your orders, addresses and account details."}
            </p>
          </div>

          <nav className="st-auth-clean-tabs" aria-label="Account access">
            <Link
              href="/account?mode=login"
              className={!isRegister ? "is-active" : undefined}
            >
              Sign in
            </Link>

            <Link
              href="/account?mode=register"
              className={isRegister ? "is-active" : undefined}
            >
              Create account
            </Link>
          </nav>

          {error ? <AuthMessage type="error">{error}</AuthMessage> : null}

          {message ? <AuthMessage type="success">{message}</AuthMessage> : null}

          {!isRegister ? (
            <form action={loginCustomer} className="st-auth-clean-form">
              <label className="st-auth-clean-field">
                <span>Email address</span>

                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label className="st-auth-clean-field">
                <span className="st-auth-clean-label-row">
                  <span>Password</span>

                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((current) => !current)}
                  >
                    {showLoginPassword ? <EyeOff /> : <Eye />}

                    {showLoginPassword ? "Hide" : "Show"}
                  </button>
                </span>

                <span className="st-auth-clean-password">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                  />

                  <LockKeyhole />
                </span>
              </label>

              <SubmitButton idle="Sign in" pending="Signing in..." />

              <div className="st-auth-clean-note">
                <Check />

                <span>Your account details are securely protected.</span>
              </div>
            </form>
          ) : (
            <form action={registerCustomer} className="st-auth-clean-form">
              <div className="st-auth-clean-two">
                <label className="st-auth-clean-field">
                  <span>First name</span>

                  <input
                    type="text"
                    name="firstName"
                    autoComplete="given-name"
                    placeholder="First name"
                    required
                  />
                </label>

                <label className="st-auth-clean-field">
                  <span>Last name</span>

                  <input
                    type="text"
                    name="lastName"
                    autoComplete="family-name"
                    placeholder="Last name"
                    required
                  />
                </label>
              </div>

              <label className="st-auth-clean-field">
                <span>Email address</span>

                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label className="st-auth-clean-field">
                <span>Telephone number</span>

                <div className="st-auth-clean-phone">
                  <select
                    name="phoneCountryCode"
                    value={phoneCountryCode}
                    onChange={(event) => changeCountry(event.target.value)}
                    aria-label="Country calling code"
                  >
                    {phoneRules.map((rule) => (
                      <option key={rule.code} value={rule.code}>
                        {rule.code} {rule.country}
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    name="phone"
                    inputMode="numeric"
                    value={phone}
                    maxLength={phoneRule.digits}
                    onChange={(event) => updatePhone(event.target.value)}
                    placeholder={phoneRule.placeholder}
                    required
                  />
                </div>

                <small className="st-auth-clean-phone-meta">
                  <span>
                    {phoneRule.country}
                    {" · "}
                    {phoneRule.digits}
                    {" digits"}
                  </span>

                  <strong>
                    {phone.length}/{phoneRule.digits}
                  </strong>
                </small>
              </label>

              <div className="st-auth-clean-two">
                <label className="st-auth-clean-field">
                  <span className="st-auth-clean-label-row">
                    <span>Create password</span>

                    <button
                      type="button"
                      onClick={() =>
                        setShowRegisterPassword((current) => !current)
                      }
                    >
                      {showRegisterPassword ? <EyeOff /> : <Eye />}

                      {showRegisterPassword ? "Hide" : "Show"}
                    </button>
                  </span>

                  <span className="st-auth-clean-password">
                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      minLength={8}
                      required
                    />

                    <LockKeyhole />
                  </span>
                </label>

                <label className="st-auth-clean-field">
                  <span className="st-auth-clean-label-row">
                    <span>Confirm password</span>

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                    >
                      {showConfirmPassword ? <EyeOff /> : <Eye />}

                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </span>

                  <span className="st-auth-clean-password">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      minLength={8}
                      required
                    />

                    <LockKeyhole />
                  </span>
                </label>
              </div>

              <div className="st-auth-clean-verification">
                <ShieldCheck />

                <div>
                  <strong>Email verification</strong>

                  <p>
                    A six-digit confirmation code will be sent after
                    registration.
                  </p>
                </div>
              </div>

              <SubmitButton
                idle="Create account"
                pending="Creating account..."
              />
            </form>
          )}

          <footer className="st-auth-clean-footer">
            <span>
              {isRegister ? "Already have an account?" : "New to Stereophonie?"}
            </span>

            <Link
              href={
                isRegister ? "/account?mode=login" : "/account?mode=register"
              }
            >
              {isRegister ? "Sign in" : "Create account"}

              <ArrowRight />
            </Link>
          </footer>
        </div>
      </section>
    </main>
  );
}
