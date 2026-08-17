"use client";

import {
  ChevronRight,
  Eye,
  EyeOff,
  Gamepad2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import BrandLogo from "@/components/storefront/brand-logo";

import { loginCustomer, registerCustomer } from "./actions";

type AccountAuthClientProps = {
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

function SubmitCommand({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="st-auth-command">
      <span>{pending ? "PROCESSING..." : children}</span>
      <ChevronRight />
    </button>
  );
}

export default function AccountAuthClient({
  mode,
  error,
  message,
}: AccountAuthClientProps) {
  const isRegister = mode === "register";

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phoneCountryCode, setPhoneCountryCode] = useState("+961");

  // STEREOPHONIE AUTH METER STATE
  const [authSignalLevel, setAuthSignalLevel] = useState(1);

  useEffect(() => {
    let level = 1;
    let direction: 1 | -1 = 1;

    const timer = window.setInterval(() => {
      if (level === 6) {
        direction = -1;
      } else if (level === 1) {
        direction = 1;
      }

      level += direction;

      setAuthSignalLevel(level);
    }, 360);

    return () => window.clearInterval(timer);
  }, []);

  const [phone, setPhone] = useState("");

  const phoneRule =
    phoneRules.find((rule) => rule.code === phoneCountryCode) ?? phoneRules[0];

  function updatePhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, phoneRule.digits);
    setPhone(digits);
  }

  return (
    <main className="st-auth">
      <header className="st-auth-header">
        <Link href="/" className="st-auth-header__return">
          <span className="st-auth-led" />
          STORE
        </Link>

        <Link
          href="/"
          className="st-auth-header__brand"
          aria-label="Stereophonie home"
        >
          <BrandLogo variant="dark" priority className="st-auth-logo" />
        </Link>

        <div className="st-auth-header__status">PLAYER 01 / ACCOUNT</div>
      </header>

      <section className="st-auth-stage">
        <div className="st-auth-stage__grid" />
        <div className="st-auth-stage__radar st-auth-stage__radar--one" />
        <div className="st-auth-stage__radar st-auth-stage__radar--two" />
        <div
          className="st-auth-stage__signal"
          data-signal-level={authSignalLevel}
          aria-hidden="true"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className={`st-auth-stage__signal-segment ${
                index < authSignalLevel ? "is-active" : "is-inactive"
              }`}
            />
          ))}
        </div>

        <div className="st-auth-console">
          <aside className="st-auth-cartridge">
            <div className="st-auth-cartridge__scanlines" />

            <div className="st-auth-cartridge__top">
              <span>
                <i />
                SYSTEM ONLINE
              </span>

              <span>CH / 01</span>
            </div>

            <div className="st-auth-cartridge__content">
              <div className="st-auth-cartridge__icon">
                {isRegister ? <UserRound /> : <Gamepad2 />}
              </div>

              <small>
                {isRegister
                  ? "NEW PLAYER REGISTRATION"
                  : "PLAYER AUTHENTICATION"}
              </small>

              <h1>
                {isRegister ? (
                  <>
                    CREATE
                    <br />
                    PLAYER
                    <br />
                    PROFILE<span>.</span>
                  </>
                ) : (
                  <>
                    PLAYER
                    <br />
                    LOGIN<span>.</span>
                  </>
                )}
              </h1>

              <p>
                {isRegister
                  ? "Register a secure Stereophonie player profile for orders, saved delivery coordinates and system preferences."
                  : "Load your Stereophonie customer profile and resume your saved store session."}
              </p>
            </div>

            <div className="st-auth-cartridge__diagnostics">
              <span>IDENTITY CHANNEL / SECURE</span>
              <span>DATABASE / LINKED</span>
              <span>REGION / LEBANON</span>
              <span>SESSION / PLAYER 01</span>
            </div>

            <div
              className="st-auth-cartridge__slot"
              data-signal-level={authSignalLevel}
              aria-hidden="true"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <span
                  key={index}
                  className={
                    index < authSignalLevel ? "is-active" : "is-inactive"
                  }
                />
              ))}
            </div>
          </aside>

          <section className="st-auth-terminal">
            <div className="st-auth-terminal__head">
              <div>
                <span className="st-auth-led" />
                CUSTOMER NETWORK
              </div>

              <div>
                <Wifi />
                CONNECTED
              </div>
            </div>

            <div className="st-auth-terminal__title">
              <small>ACCOUNT SYSTEM / INPUT TERMINAL</small>
              <strong>{isRegister ? "CREATE PLAYER" : "ACCESS PROFILE"}</strong>
            </div>

            <nav className="st-auth-mode">
              <Link
                href="/account?mode=login"
                className={!isRegister ? "is-active" : undefined}
              >
                <span>01</span>
                SIGN IN
              </Link>

              <Link
                href="/account?mode=register"
                className={isRegister ? "is-active" : undefined}
              >
                <span>02</span>
                CREATE ACCOUNT
              </Link>
            </nav>

            {error ? (
              <div className="st-auth-message st-auth-message--error">
                <span>ERR</span>
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="st-auth-message st-auth-message--success">
                <span>OK</span>
                {message}
              </div>
            ) : null}

            {!isRegister ? (
              <form action={loginCustomer} className="st-auth-form">
                <label>
                  <span>EMAIL ADDRESS</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="player@stereophonie.com"
                    required
                  />
                </label>

                <label>
                  <span className="st-auth-label-row">
                    PASSWORD
                    <button
                      type="button"
                      onClick={() =>
                        setShowLoginPassword((current) => !current)
                      }
                    >
                      {showLoginPassword ? <EyeOff /> : <Eye />}
                      {showLoginPassword ? "HIDE" : "SHOW"}
                    </button>
                  </span>

                  <div className="st-auth-password">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      placeholder="Enter password"
                      required
                    />

                    <LockKeyhole />
                  </div>
                </label>

                <SubmitCommand>LOAD PLAYER PROFILE</SubmitCommand>
              </form>
            ) : (
              <form action={registerCustomer} className="st-auth-form">
                <div className="st-auth-form__two">
                  <label>
                    <span>FIRST NAME</span>
                    <input
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      placeholder="First name"
                      required
                    />
                  </label>

                  <label>
                    <span>LAST NAME</span>
                    <input
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      placeholder="Last name"
                      required
                    />
                  </label>
                </div>

                <label>
                  <span>EMAIL ADDRESS</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="player@stereophonie.com"
                    required
                  />
                </label>

                <label>
                  <span>TELEPHONE LINK</span>

                  <div className="st-auth-phone">
                    <select
                      name="phoneCountryCode"
                      value={phoneCountryCode}
                      onChange={(event) => {
                        setPhoneCountryCode(event.target.value);
                        setPhone("");
                      }}
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
                      value={phone}
                      onChange={(event) => updatePhone(event.target.value)}
                      placeholder={phoneRule.placeholder}
                      inputMode="numeric"
                      required
                    />
                  </div>

                  <small className="st-auth-field-meta">
                    {phoneRule.country.toUpperCase()} / EXACTLY{" "}
                    {phoneRule.digits} DIGITS
                    <b>
                      {phone.length}/{phoneRule.digits}
                    </b>
                  </small>
                </label>

                <div className="st-auth-form__two">
                  <label>
                    <span className="st-auth-label-row">
                      CREATE PASSWORD
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPassword((current) => !current)
                        }
                      >
                        {showRegisterPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </span>

                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      minLength={8}
                      required
                    />
                  </label>

                  <label>
                    <span className="st-auth-label-row">
                      CONFIRM PASSWORD
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                      >
                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </span>

                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      minLength={8}
                      required
                    />
                  </label>
                </div>

                <div className="st-auth-verification">
                  <span>06</span>

                  <div>
                    <strong>EMAIL VERIFICATION</strong>
                    <p>
                      A six-digit security code will be transmitted to your
                      email after registration.
                    </p>
                  </div>
                </div>

                <SubmitCommand>CREATE PLAYER PROFILE</SubmitCommand>
              </form>
            )}

            <footer className="st-auth-terminal__footer">
              <div>
                <ShieldCheck />
                SECURE AUTHENTICATION
              </div>

              <span>ENTER / CONFIRM / CONTINUE</span>
            </footer>
          </section>
        </div>

        <div className="st-auth-stage__footer">
          <span>
            <i />
            STEREOPHONIE ARCADE NETWORK / ONLINE
          </span>

          <span>ACCOUNT MODULE / REV 02</span>

          <span>BEIRUT / LEBANON</span>
        </div>
      </section>
    </main>
  );
}
