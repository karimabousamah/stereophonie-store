"use client";

import {
  type ReactNode,
  useActionState,
  useEffect,
  useId,
  useOptimistic,
  useState,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { createPortal, useFormStatus } from "react-dom";

import {
  addCustomerAddress,
  changeCustomerPassword,
  deleteCustomerAccount,
  deleteCustomerAddress,
  type DeleteAccountState,
  logoutCustomer,
  setDefaultCustomerAddress,
  updateCustomerAddress,
  updateCustomerProfile,
  updateStockNotificationPreference,
} from "./actions";

export type CustomerProfile = {
  email: string;
  firstName: string;
  lastName: string;
  phoneCountryCode: string;
  phoneNumber: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  country: string;
  city: string;
  area: string;
  address_line: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  delivery_instructions: string;
  is_default: boolean;
};

type AccountSettingsClientProps = {
  profile: CustomerProfile;
  addresses: CustomerAddress[];
  stockNotificationsEnabled: boolean;
};

type SettingsSection = "profile" | "security" | "notifications" | "addresses";

type DeleteAccountStep = "closed" | "warning" | "verification";

type CountryOption = {
  name: string;
  enabled: boolean;
};

const countryCodes = [
  ["+961", "Lebanon"],
  ["+966", "Saudi Arabia"],
  ["+971", "United Arab Emirates"],
  ["+974", "Qatar"],
  ["+965", "Kuwait"],
  ["+973", "Bahrain"],
  ["+962", "Jordan"],
  ["+20", "Egypt"],
  ["+33", "France"],
  ["+39", "Italy"],
  ["+44", "United Kingdom"],
  ["+1", "United States / Canada"],
];

const countryOptions: CountryOption[] = [
  {
    name: "Lebanon",
    enabled: true,
  },
  {
    name: "Saudi Arabia",
    enabled: false,
  },
  {
    name: "United Arab Emirates",
    enabled: false,
  },
  {
    name: "Qatar",
    enabled: false,
  },
  {
    name: "Kuwait",
    enabled: false,
  },
  {
    name: "Bahrain",
    enabled: false,
  },
  {
    name: "Jordan",
    enabled: false,
  },
  {
    name: "Egypt",
    enabled: false,
  },
  {
    name: "France",
    enabled: false,
  },
  {
    name: "Italy",
    enabled: false,
  },
  {
    name: "United Kingdom",
    enabled: false,
  },
  {
    name: "United States",
    enabled: false,
  },
  {
    name: "Canada",
    enabled: false,
  },
];

function StableModal({
  open,
  title,
  eyebrow,
  icon,
  children,
  onClose,
  modalClassName = "",
}: {
  open: boolean;
  title: string;
  eyebrow: string;
  icon?: string;
  children: ReactNode;
  onClose: () => void;
  modalClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);

  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;

    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";

    document.documentElement.style.overflow = "hidden";

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;

      document.documentElement.style.overflow = previousHtmlOverflow;

      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[500px] overflow-y-auto border border-neutral-200 bg-white p-7 shadow-[0_35px_120px_rgba(0,0,0,0.42)] sm:p-9 ${modalClassName}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close confirmation"
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center border border-neutral-200 bg-white text-lg text-neutral-500 transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-[#d9a43d] hover:bg-[#fffaf0] hover:text-[#9a680b] hover:shadow-[0_0_0_4px_rgba(245,179,53,0.12),0_0_18px_rgba(245,179,53,0.18)] focus-visible:border-[#d9a43d] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(245,179,53,0.16)] active:transform-none"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none inline-block leading-none [transform:translateY(-1px)]"
          >
            ×
          </span>
        </button>

        {icon ? (
          <div className="grid h-12 w-12 place-items-center rounded-full border border-red-200 bg-red-50 text-lg font-semibold text-red-700">
            {icon}
          </div>
        ) : null}

        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
          {eyebrow}
        </p>

        <h2
          id={titleId}
          className="mt-3 pr-8 text-3xl font-semibold uppercase leading-[0.95] tracking-[-0.045em]"
        >
          {title}
        </h2>

        {children}
      </section>
    </div>,
    document.body,
  );
}

function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="st-account-password-field">
      <span className="st-account-password-label-row">
        <span>{label}</span>

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff /> : <Eye />}

          <span>{visible ? "Hide" : "Show"}</span>
        </button>
      </span>

      <span className="st-account-password-control">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={8}
          required
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 st-account-settings-retail-v2"
    >
      {children}
    </label>
  );
}

function OptionalText() {
  return (
    <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">
      Optional
    </span>
  );
}

function AddressFields({ address }: { address?: CustomerAddress }) {
  const suffix = address?.id ?? "new";

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <FieldLabel htmlFor={`label-${suffix}`}>Address label</FieldLabel>

        <input
          id={`label-${suffix}`}
          name="label"
          defaultValue={address?.label ?? "Home"}
          required
          placeholder="Home, Work, Parents..."
          className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div>
        <FieldLabel htmlFor={`country-${suffix}`}>Country</FieldLabel>

        <select
          id={`country-${suffix}`}
          name="country"
          defaultValue="Lebanon"
          required
          className="st-account-focus-control mt-2 w-full border border-neutral-300 bg-white px-4 py-4 text-sm outline-none transition"
        >
          {countryOptions.map((country) => (
            <option
              key={country.name}
              value={country.name}
              disabled={!country.enabled}
            >
              {country.enabled ? country.name : `${country.name} — Coming soon`}
            </option>
          ))}
        </select>

        <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-neutral-400">
          Delivery is currently available in Lebanon only.
        </p>
      </div>

      <div>
        <FieldLabel htmlFor={`city-${suffix}`}>City</FieldLabel>

        <input
          id={`city-${suffix}`}
          name="city"
          defaultValue={address?.city ?? ""}
          required
          placeholder="Beirut"
          className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div>
        <FieldLabel htmlFor={`area-${suffix}`}>Area</FieldLabel>

        <input
          id={`area-${suffix}`}
          name="area"
          defaultValue={address?.area ?? ""}
          placeholder="Antelias"
          className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel htmlFor={`address-${suffix}`}>
          Full street address
        </FieldLabel>

        <input
          id={`address-${suffix}`}
          name="addressLine"
          defaultValue={address?.address_line ?? ""}
          required
          placeholder="Street, road, and neighborhood"
          className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div>
        <FieldLabel htmlFor={`building-${suffix}`}>Building</FieldLabel>

        <input
          id={`building-${suffix}`}
          name="building"
          defaultValue={address?.building ?? ""}
          placeholder="Building name or number"
          className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div>
        <FieldLabel htmlFor={`floor-${suffix}`}>Floor</FieldLabel>

        <input
          id={`floor-${suffix}`}
          name="floor"
          defaultValue={address?.floor ?? ""}
          placeholder="3"
          className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div>
        <FieldLabel htmlFor={`apartment-${suffix}`}>Apartment</FieldLabel>

        <input
          id={`apartment-${suffix}`}
          name="apartment"
          defaultValue={address?.apartment ?? ""}
          placeholder="Apartment or door number"
          className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div>
        <FieldLabel htmlFor={`landmark-${suffix}`}>
          Nearby landmark
          <OptionalText />
        </FieldLabel>

        <input
          id={`landmark-${suffix}`}
          name="landmark"
          defaultValue={address?.landmark ?? ""}
          placeholder="Near a known location"
          className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel htmlFor={`instructions-${suffix}`}>
          Delivery instructions
          <OptionalText />
        </FieldLabel>

        <textarea
          id={`instructions-${suffix}`}
          name="deliveryInstructions"
          defaultValue={address?.delivery_instructions ?? ""}
          rows={4}
          placeholder="Entrance details or courier instructions"
          className="st-account-focus-control mt-2 w-full resize-none border border-neutral-300 px-4 py-4 text-sm leading-6 outline-none transition"
        />
      </div>

      <label className="st-account-default-toggle-row sm:col-span-2">
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em]">
            Use as default address
          </span>

          <span className="mt-1 block text-xs leading-5 text-neutral-500">
            This address will be selected automatically during checkout.
          </span>
        </span>

        <span className="st-account-default-switch-wrap">
          <input
            name="isDefault"
            type="checkbox"
            defaultChecked={address?.is_default ?? false}
            className="st-account-default-switch-input"
          />
          <span
            aria-hidden="true"
            className="st-account-default-switch"
          >
            <span className="st-account-default-switch__thumb" />
          </span>
        </span>
      </label>
    </div>
  );
}

function formatAddress(address: CustomerAddress) {
  return [
    address.address_line,
    address.building,
    address.floor ? `Floor ${address.floor}` : "",
    address.apartment ? `Apartment ${address.apartment}` : "",
    address.area,
    address.city,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function DeleteAccountSubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className="st-account-delete-submit w-full border border-red-700 bg-red-700 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition disabled:cursor-not-allowed"
    >
      {pending ? "Deleting account..." : "Permanently delete account"}
    </button>
  );
}

function DeleteAccountVerificationForm({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const initialState: DeleteAccountState = {
    status: "idle",
    message: "",
  };

  const [state, formAction] = useActionState(
    deleteCustomerAccount,
    initialState,
  );

  const [passwordVisible, setPasswordVisible] = useState(false);

  const [confirmationText, setConfirmationText] = useState("");

  const [acceptedPermanentDeletion, setAcceptedPermanentDeletion] =
    useState(false);

  const isReady = confirmationText === "DELETE" && acceptedPermanentDeletion;

  return (
    <form action={formAction} className="st-account-delete-verification mt-7">
      <div className="st-account-delete-identity border border-neutral-200 bg-neutral-50 px-4 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-neutral-400">
          Account being deleted
        </p>

        <p className="mt-2 break-all text-sm font-semibold text-black">
          {email}
        </p>
      </div>

      {state.status === "error" ? (
        <div
          role="alert"
          className="st-account-delete-error mt-5 flex gap-3 border border-red-200 bg-red-50 px-4 py-4"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-red-300 text-[10px] font-semibold text-red-700">
            !
          </span>

          <p className="text-sm leading-6 text-red-700">{state.message}</p>
        </div>
      ) : null}

      <div className="st-account-delete-field mt-6">
        <div className="st-account-delete-label-row flex items-center justify-between gap-4">
          <label
            htmlFor="accountPassword"
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
          >
            Current account password
          </label>

          <button
            type="button"
            onClick={() => setPasswordVisible((current) => !current)}
            aria-label={
              passwordVisible
                ? "Hide current account password"
                : "Show current account password"
            }
            aria-pressed={passwordVisible}
            className="st-account-delete-show bg-transparent text-[9px] font-semibold uppercase tracking-[0.14em] shadow-none transition"
          >
            {passwordVisible ? <EyeOff /> : <Eye />}
            <span>{passwordVisible ? "Hide" : "Show"}</span>
          </button>
        </div>

        <input
          id="accountPassword"
          name="accountPassword"
          type={passwordVisible ? "text" : "password"}
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          className="st-account-delete-input st-account-focus-control mt-2 w-full border border-neutral-300 bg-white px-4 py-4 text-sm outline-none transition"
        />
      </div>

      <div className="st-account-delete-field mt-5">
        <label
          htmlFor="confirmationText"
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
        >
          Type DELETE to confirm
        </label>

        <input
          id="confirmationText"
          name="confirmationText"
          value={confirmationText}
          onChange={(event) =>
            setConfirmationText(event.target.value.toUpperCase())
          }
          autoComplete="off"
          spellCheck={false}
          required
          placeholder="DELETE"
          className={`st-account-delete-input st-account-delete-confirm mt-2 w-full border bg-white px-4 py-4 text-sm font-semibold uppercase tracking-[0.12em] outline-none transition ${
            confirmationText === "DELETE"
              ? "border-red-700"
              : "border-neutral-300 focus:border-black"
          }`}
        />
      </div>

      <label className="st-account-delete-consent mt-5 flex cursor-pointer items-center gap-3 border border-red-200 bg-red-50 px-4 py-4">
        <input
          name="acceptPermanentDeletion"
          type="checkbox"
          checked={acceptedPermanentDeletion}
          onChange={(event) =>
            setAcceptedPermanentDeletion(event.target.checked)
          }
          className="st-account-delete-consent-checkbox h-4 w-4 shrink-0 accent-red-700"
        />

        <span className="text-xs leading-6 text-red-800">
          I understand that my login, customer profile, saved addresses, and
          account access will be permanently deleted and cannot be recovered.
        </span>
      </label>

      <div className="st-account-delete-actions mt-7 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onBack}
          className="st-account-delete-back border border-neutral-300 bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-600 transition"
        >
          Go back
        </button>

        <DeleteAccountSubmitButton enabled={isReady} />
      </div>
    </form>
  );
}

export default function AccountSettingsClient({
  profile,
  addresses,
  stockNotificationsEnabled,
}: AccountSettingsClientProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("section") === "addresses"
    ) {
      return "addresses";
    }

    return "profile";
  });

  const [
    optimisticStockNotificationsEnabled,
    setOptimisticStockNotificationsEnabled,
  ] = useOptimistic(stockNotificationsEnabled);

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const [deleteAccountStep, setDeleteAccountStep] =
    useState<DeleteAccountStep>("closed");

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [showNewAddress, setShowNewAddress] = useState(false);

  const [addressToDelete, setAddressToDelete] =
    useState<CustomerAddress | null>(null);

  function closeAccountDeletion() {
    setDeleteAccountStep("closed");
  }

  async function saveStockNotificationPreference(formData: FormData) {
    setOptimisticStockNotificationsEnabled(formData.get("enabled") === "true");

    await updateStockNotificationPreference(formData);
  }

  return (
    <>
      <section className="border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-6 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
            Account settings
          </p>

          <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[-0.035em]">
            Personal account
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
            Manage your personal information, account security, stock email
            preferences, and saved delivery addresses.
          </p>
        </div>

        <div className="grid lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav
            className="st-account-settings-nav border-b border-neutral-200 p-4 lg:border-b-0 lg:border-r"
            aria-label="Profile and delivery settings"
          >
            <div className="st-account-settings-tabs" role="tablist">
              {[
                ["profile", "Personal details", "01"],
                ["security", "Security", "02"],
                ["notifications", "Stock emails", "03"],
                ["addresses", "Addresses", "04"],
              ].map(([value, label, number]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === value}
                  aria-controls={`account-panel-${value}`}
                  onClick={() => setActiveSection(value as SettingsSection)}
                  className={`st-account-settings-tab ${
                    activeSection === value ? "is-active" : ""
                  }`}
                >
                  <span>{label}</span>
                  <small>{number}</small>
                </button>
              ))}
            </div>

            <div className="st-account-settings-signout mt-5 border-t border-neutral-200 pt-5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmation(true)}
                className="w-full border border-red-200 bg-white px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.13em] text-red-700 transition hover:border-red-700 hover:bg-red-700 hover:text-white"
              >
                Sign out securely
              </button>
            </div>
          </nav>

          <div
            id={`account-panel-${activeSection}`}
            className="p-6 sm:p-8 lg:p-10"
            role="tabpanel"
          >
            {activeSection === "profile" ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Customer identity
                </p>

                <h3 className="mt-2 text-2xl font-semibold uppercase tracking-[-0.03em]">
                  Personal information
                </h3>

                <form action={updateCustomerProfile} className="mt-7">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="firstName">First name</FieldLabel>

                      <input
                        id="firstName"
                        name="firstName"
                        defaultValue={profile.firstName}
                        required
                        className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="lastName">Last name</FieldLabel>

                      <input
                        id="lastName"
                        name="lastName"
                        defaultValue={profile.lastName}
                        required
                        className="st-account-focus-control mt-2 w-full border border-neutral-300 px-4 py-4 text-sm outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="email">
                        Verified email address
                      </FieldLabel>

                      <div className="st-account-field-shell st-account-field-shell--email mt-2 flex border border-neutral-200 bg-neutral-50">
                        <input
                          id="email"
                          value={profile.email}
                          disabled
                          className="min-w-0 flex-1 bg-transparent px-4 py-4 text-sm text-neutral-500 outline-none"
                        />

                        <span className="flex items-center border-l border-neutral-200 px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                          Locked
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="phoneNumber">
                        Telephone number
                      </FieldLabel>

                      <div className="st-account-field-shell st-account-field-shell--phone mt-2 grid grid-cols-[160px_minmax(0,1fr)] border border-neutral-300">
                        <select
                          name="phoneCountryCode"
                          defaultValue={profile.phoneCountryCode}
                          className="border-r border-neutral-300 bg-white px-3 py-4 text-sm outline-none"
                        >
                          {countryCodes.map(([code, country]) => (
                            <option key={`${code}-${country}`} value={code}>
                              {code} {country}
                            </option>
                          ))}
                        </select>

                        <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          inputMode="numeric"
                          defaultValue={profile.phoneNumber}
                          required
                          className="min-w-0 px-4 py-4 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="st-player-command-button st-player-command-button--primary mt-7"
                  >
                    Save personal details
                  </button>
                </form>
              </div>
            ) : null}

            {activeSection === "security" ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Account security
                </p>

                <h3 className="mt-2 text-2xl font-semibold uppercase tracking-[-0.03em]">
                  Change password
                </h3>

                <p className="mt-3 text-sm leading-7 text-neutral-500">
                  Your current password is encrypted and cannot be displayed.
                  Enter it below to replace it securely.
                </p>

                <form
                  action={changeCustomerPassword}
                  className="mt-7 space-y-5"
                >
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    label="Current password"
                    autoComplete="current-password"
                    placeholder="Current password"
                  />

                  <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    label="New password"
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                  />

                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm new password"
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                  />

                  <button
                    type="submit"
                    className="border border-black bg-black px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-white hover:text-black"
                  >
                    Change password
                  </button>
                </form>

                <section className="mt-12 border border-red-200 bg-red-50/40">
                  <div className="border-b border-red-200 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-red-200 bg-white text-sm font-semibold text-red-700">
                        !
                      </div>

                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-red-700">
                          Danger zone
                        </p>

                        <h4 className="mt-2 text-xl font-semibold uppercase tracking-[-0.025em]">
                          Delete account permanently
                        </h4>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-5 sm:px-6">
                    <p className="max-w-2xl text-sm leading-7 text-neutral-600">
                      Permanently remove your customer login, profile, saved
                      addresses, and access to your account. This action cannot
                      be undone.
                    </p>

                    <button
                      type="button"
                      onClick={() => setDeleteAccountStep("warning")}
                      className="mt-5 border border-red-700 bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-700 hover:text-white"
                    >
                      Delete my account
                    </button>
                  </div>
                </section>
              </div>
            ) : null}

            {activeSection === "notifications" ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Communication preferences
                </p>

                <h3 className="mt-2 text-2xl font-semibold uppercase tracking-[-0.03em]">
                  Stock email notifications
                </h3>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
                  Control emails about products saved to your wishlist, low
                  stock, out-of-stock products, and items that become available
                  again.
                </p>

                <section className="st-account-stock-card mt-8 border border-neutral-200">
                  <div className="st-account-stock-card__status flex items-center justify-between gap-6 border-b border-neutral-200 px-5 py-5 sm:px-6">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                        Current status
                      </p>

                      <p className="mt-3 text-sm font-semibold uppercase tracking-[0.1em]">
                        {optimisticStockNotificationsEnabled
                          ? "Stock emails enabled"
                          : "Stock emails disabled"}
                      </p>
                    </div>

                    <form
                      action={saveStockNotificationPreference}
                      className="st-account-stock-switch-form"
                    >
                      <input
                        type="hidden"
                        name="enabled"
                        value={
                          optimisticStockNotificationsEnabled ? "false" : "true"
                        }
                      />

                      <button
                        type="submit"
                        role="switch"
                        aria-checked={optimisticStockNotificationsEnabled}
                        aria-label={
                          optimisticStockNotificationsEnabled
                            ? "Disable stock emails"
                            : "Enable stock emails"
                        }
                        title={
                          optimisticStockNotificationsEnabled
                            ? "Disable stock emails"
                            : "Enable stock emails"
                        }
                        className="st-account-stock-switch"
                      >
                        <span
                          aria-hidden="true"
                          className="st-account-stock-switch__thumb"
                        />
                      </button>
                    </form>
                  </div>

                  <div className="px-5 py-6 sm:px-6">
                    <p className="max-w-2xl text-sm leading-7 text-neutral-600">
                      {optimisticStockNotificationsEnabled
                        ? "You may receive relevant stock updates for products connected to this email address."
                        : "Stereophonie will not send stock notification emails to this email address."}
                    </p>

                    <p className="mt-4 text-xs leading-6 text-neutral-400">
                      Disabling these emails cancels pending restock alerts. You
                      can enable future stock updates again at any time.
                    </p>
                  </div>
                </section>
              </div>
            ) : null}

            {activeSection === "addresses" ? (
              <div>
                <div className="flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                      Delivery preferences
                    </p>

                    <h3 className="mt-2 text-2xl font-semibold uppercase tracking-[-0.03em]">
                      Saved addresses
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-neutral-500">
                      Delivery is currently available in Lebanon only.
                      Additional countries are coming soon.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAddress(true);

                      setEditingAddressId(null);
                    }}
                    className="st-account-address-add border border-black bg-black px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-black"
                  >
                    + Add address
                  </button>
                </div>

                {showNewAddress ? (
                  <form
                    action={addCustomerAddress}
                    className="st-account-address-form mt-7 border border-black p-5 sm:p-7"
                  >
                    <AddressFields />

                    <div className="mt-6 flex gap-3">
                      <button
                        type="submit"
                        className="border border-black bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white"
                      >
                        Save address
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowNewAddress(false)}
                        className="border border-neutral-300 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="mt-7 space-y-4">
                  {addresses.length ? (
                    addresses.map((address) => (
                      <article
                        key={address.id}
                        className={`st-account-address-card border p-5 sm:p-6 ${
                          address.is_default
                            ? "border-black"
                            : "border-neutral-200"
                        }`}
                      >
                        <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h4 className="text-lg font-semibold uppercase">
                                {address.label}
                              </h4>

                              {address.is_default ? (
                                <span className="st-account-address-badge">
                                  Default
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-3 text-sm leading-7 text-neutral-600">
                              {formatAddress(address)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {!address.is_default ? (
                              <form action={setDefaultCustomerAddress}>
                                <input
                                  type="hidden"
                                  name="addressId"
                                  value={address.id}
                                />

                                <input
                                  type="hidden"
                                  name="returnSection"
                                  value="addresses"
                                />

                                <button className="st-account-address-action st-account-address-action--default">
                                  Make default
                                </button>
                              </form>
                            ) : null}

                            <button
                              type="button"
                              onClick={() =>
                                setEditingAddressId(
                                  editingAddressId === address.id
                                    ? null
                                    : address.id,
                                )
                              }
                              className="st-account-address-action st-account-address-action--edit"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => setAddressToDelete(address)}
                              className="st-account-address-action st-account-address-action--delete"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div
                          className="st-account-address-edit-reveal"
                          data-open={
                            editingAddressId === address.id ? "true" : "false"
                          }
                          aria-hidden={
                            editingAddressId === address.id ? undefined : true
                          }
                        >
                          <div className="st-account-address-edit-reveal__inner">
                            <form
                              action={updateCustomerAddress}
                              className="st-account-address-edit-form mt-7 border-t border-neutral-200 pt-7"
                            >
                              <input
                                type="hidden"
                                name="addressId"
                                value={address.id}
                              />

                              <AddressFields address={address} />

                              <button
                                type="submit"
                                className="st-account-address-save mt-6 border border-black bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white"
                              >
                                Save changes
                              </button>
                            </form>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="st-account-address-empty border border-dashed border-neutral-300 px-6 py-14 text-center">
                      <p className="text-sm font-semibold uppercase tracking-[0.13em]">
                        No saved addresses
                      </p>

                      <button
                        type="button"
                        onClick={() => setShowNewAddress(true)}
                        className="mt-6 border border-black bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white"
                      >
                        Add first address
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <StableModal
        open={showLogoutConfirmation}
        eyebrow="Account security"
        title="Sign out?"
        onClose={() => setShowLogoutConfirmation(false)}
      >
        <div className="st-retail-signout">
          <p>
            You are about to leave your Stereophonie account. Your saved
            information, addresses and order history will remain safely stored.
          </p>

          <div className="st-retail-signout__note">
            You can sign back in at any time using your email address and
            password.
          </div>

          <div className="st-retail-signout__actions">
            <button
              type="button"
              onClick={() => setShowLogoutConfirmation(false)}
              className="st-retail-signout__cancel"
            >
              Stay signed in
            </button>

            <form action={logoutCustomer}>
              <button type="submit" className="st-retail-signout__confirm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </StableModal>

      <StableModal
        open={deleteAccountStep === "warning"}
        eyebrow="Permanent account deletion"
        title="Delete your Stereophonie account?"
        modalClassName="st-account-delete-modal"
        onClose={closeAccountDeletion}
      >
        <div className="st-retail-signout st-account-delete-signout">
          <p>
            This is different from signing out. Your customer account will be
            removed permanently and cannot be restored.
          </p>

          <div className="st-account-delete-signout__note">
            {[
              "Your customer login will be deleted.",
              "Your personal profile will be removed.",
              "Your saved delivery addresses will be removed.",
              "You will lose access to your account and order history.",
            ].map((item, index) => (
              <div
                key={item}
                className="st-account-delete-signout__row"
              >
                <span className="st-account-delete-signout__number">
                  0{index + 1}
                </span>

                <span className="st-account-delete-signout__text">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="st-retail-signout__note st-account-delete-signout__legal">
            Store transaction records may remain available to Stereophonie for
            order, payment, delivery, accounting, and support purposes.
          </div>

          <div className="st-retail-signout__actions">
            <button
              type="button"
              onClick={closeAccountDeletion}
              className="st-retail-signout__cancel"
            >
              Keep my account
            </button>

            <button
              type="button"
              onClick={() => setDeleteAccountStep("verification")}
              className="st-account-delete-signout__continue"
            >
              Continue
            </button>
          </div>
        </div>
      </StableModal>

      <StableModal
        open={deleteAccountStep === "verification"}
        eyebrow="Final identity verification"
        title="Confirm permanent deletion"
        modalClassName="st-account-delete-modal"
        onClose={closeAccountDeletion}
      >
        <div className="st-account-delete-final">
          <p className="mt-5 text-sm leading-7 text-neutral-600">
          For your security, verify your current password and complete the final
          confirmation below.
        </p>

        {deleteAccountStep === "verification" ? (
          <DeleteAccountVerificationForm
            email={profile.email}
            onBack={() => setDeleteAccountStep("warning")}
          />
        ) : null}
        </div>
      </StableModal>

      <StableModal
        open={Boolean(addressToDelete)}
        eyebrow="Delete address"
        title={`Remove ${addressToDelete?.label ?? "address"}?`}
        icon="!"
        onClose={() => setAddressToDelete(null)}
      >
        <p className="mt-5 text-sm leading-7 text-neutral-500">
          This address will no longer be available during checkout.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAddressToDelete(null)}
            className="border border-neutral-300 bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-600"
          >
            Keep address
          </button>

          {addressToDelete ? (
            <form action={deleteCustomerAddress}>
              <input
                type="hidden"
                name="addressId"
                value={addressToDelete.id}
              />

              <button
                type="submit"
                className="w-full border border-red-700 bg-red-700 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white"
              >
                Delete address
              </button>
            </form>
          ) : null}
        </div>
      </StableModal>
    </>
  );
}
