"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  LockKeyhole,
  MapPin,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CheckoutProgress from "@/components/checkout/checkout-progress";
import CouponBox, {
  type AppliedCoupon,
} from "@/components/checkout/coupon-box";
import { useCart } from "@/components/cart/cart-provider";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

type CheckoutForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  address: string;
  building: string;
  floor: string;
  landmark: string;
  deliveryNotes: string;
};

type RequiredField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "city"
  | "area"
  | "address"
  | "building"
  | "floor";

type FormErrors = Partial<Record<RequiredField, string>>;

type PhoneCountry = {
  country: string;
  code: string;
  flag: string;
  minDigits: number;
  maxDigits: number;
  example: string;
};

type CustomerProfileRow = {
  first_name: string | null;
  last_name: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
};

type SavedAddress = {
  id: string;
  label: string | null;
  country: string | null;
  city: string | null;
  area: string | null;
  address_line: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
};

type AddressEditorMode = "closed" | "new" | "edit";

type AddressDraft = {
  label: string;
  country: string;
  city: string;
  area: string;
  addressLine: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  deliveryInstructions: string;
  isDefault: boolean;
};

type AddressRequiredField =
  | "label"
  | "country"
  | "city"
  | "area"
  | "addressLine"
  | "building"
  | "floor"
  | "apartment";

type AddressErrors = Partial<Record<AddressRequiredField, string>>;

type CountryOption = {
  name: string;
  flag: string;
  enabled: boolean;
};

/* =========================================================
   COUNTRY CONFIGURATION
========================================================= */

const phoneCountries: PhoneCountry[] = [
  {
    country: "Lebanon",
    code: "+961",
    flag: "🇱🇧",
    minDigits: 8,
    maxDigits: 8,
    example: "71123456",
  },
  {
    country: "Saudi Arabia",
    code: "+966",
    flag: "🇸🇦",
    minDigits: 9,
    maxDigits: 9,
    example: "501234567",
  },
  {
    country: "United Arab Emirates",
    code: "+971",
    flag: "🇦🇪",
    minDigits: 9,
    maxDigits: 9,
    example: "501234567",
  },
  {
    country: "Qatar",
    code: "+974",
    flag: "🇶🇦",
    minDigits: 8,
    maxDigits: 8,
    example: "33123456",
  },
  {
    country: "Kuwait",
    code: "+965",
    flag: "🇰🇼",
    minDigits: 8,
    maxDigits: 8,
    example: "50123456",
  },
  {
    country: "Bahrain",
    code: "+973",
    flag: "🇧🇭",
    minDigits: 8,
    maxDigits: 8,
    example: "36123456",
  },
  {
    country: "Jordan",
    code: "+962",
    flag: "🇯🇴",
    minDigits: 9,
    maxDigits: 9,
    example: "791234567",
  },
  {
    country: "Egypt",
    code: "+20",
    flag: "🇪🇬",
    minDigits: 10,
    maxDigits: 10,
    example: "1012345678",
  },
  {
    country: "France",
    code: "+33",
    flag: "🇫🇷",
    minDigits: 9,
    maxDigits: 9,
    example: "612345678",
  },
  {
    country: "Italy",
    code: "+39",
    flag: "🇮🇹",
    minDigits: 6,
    maxDigits: 11,
    example: "3123456789",
  },
  {
    country: "United Kingdom",
    code: "+44",
    flag: "🇬🇧",
    minDigits: 10,
    maxDigits: 10,
    example: "7123456789",
  },
  {
    country: "Canada",
    code: "+1",
    flag: "🇨🇦",
    minDigits: 10,
    maxDigits: 10,
    example: "5141234567",
  },
  {
    country: "United States",
    code: "+1",
    flag: "🇺🇸",
    minDigits: 10,
    maxDigits: 10,
    example: "2121234567",
  },
];

const deliveryCountries: CountryOption[] = [
  {
    name: "Lebanon",
    flag: "🇱🇧",
    enabled: true,
  },
  {
    name: "Saudi Arabia",
    flag: "🇸🇦",
    enabled: false,
  },
  {
    name: "United Arab Emirates",
    flag: "🇦🇪",
    enabled: false,
  },
  {
    name: "Qatar",
    flag: "🇶🇦",
    enabled: false,
  },
  {
    name: "Kuwait",
    flag: "🇰🇼",
    enabled: false,
  },
  {
    name: "Bahrain",
    flag: "🇧🇭",
    enabled: false,
  },
  {
    name: "Jordan",
    flag: "🇯🇴",
    enabled: false,
  },
  {
    name: "Egypt",
    flag: "🇪🇬",
    enabled: false,
  },
  {
    name: "France",
    flag: "🇫🇷",
    enabled: false,
  },
  {
    name: "Italy",
    flag: "🇮🇹",
    enabled: false,
  },
  {
    name: "United Kingdom",
    flag: "🇬🇧",
    enabled: false,
  },
  {
    name: "Canada",
    flag: "🇨🇦",
    enabled: false,
  },
  {
    name: "United States",
    flag: "🇺🇸",
    enabled: false,
  },
];

/* =========================================================
   INITIAL VALUES
========================================================= */

const initialForm: CheckoutForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "Lebanon",
  city: "",
  area: "",
  address: "",
  building: "",
  floor: "",
  landmark: "",
  deliveryNotes: "",
};

const initialAddressDraft: AddressDraft = {
  label: "Home",
  country: "Lebanon",
  city: "",
  area: "",
  addressLine: "",
  building: "",
  floor: "",
  apartment: "",
  landmark: "",
  deliveryInstructions: "",
  isDefault: false,
};

/* =========================================================
   HELPERS
========================================================= */

function emailIsValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function fieldInputClass(hasError: boolean) {
  return [
    "mt-2.5 min-h-14 w-full rounded-none bg-white px-4",
    "text-[16px] text-black outline-none",
    "transition duration-200 placeholder:text-black/25",
    hasError
      ? "border border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600"
      : "border border-black/15 hover:border-black/35 focus:border-black focus:ring-1 focus:ring-black",
  ].join(" ");
}

function addressInputClass(hasError: boolean) {
  return [
    "mt-2 w-full border bg-white px-4 py-4 text-sm outline-none transition",
    hasError
      ? "border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10"
      : "border-neutral-300 hover:border-neutral-400 focus:border-black focus:ring-4 focus:ring-black/[0.035]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-600"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

      <span>{message}</span>
    </p>
  );
}

function buildFloorValue(address: SavedAddress) {
  return [
    address.floor ? `Floor ${address.floor}` : "",
    address.apartment ? `Apartment ${address.apartment}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function formatSavedAddress(address: SavedAddress) {
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

function createDraftFromAddress(address: SavedAddress): AddressDraft {
  return {
    label: address.label ?? "Home",
    country: "Lebanon",
    city: address.city ?? "",
    area: address.area ?? "",
    addressLine: address.address_line ?? "",
    building: address.building ?? "",
    floor: address.floor ?? "",
    apartment: address.apartment ?? "",
    landmark: address.landmark ?? "",
    deliveryInstructions: address.delivery_instructions ?? "",
    isDefault: address.is_default,
  };
}

/* =========================================================
   ADDRESS EDITOR
========================================================= */

function AddressEditor({
  mode,
  draft,
  errors,
  saving,
  errorMessage,
  onChange,
  onSave,
  onClose,
}: {
  mode: Exclude<AddressEditorMode, "closed">;
  draft: AddressDraft;
  errors: AddressErrors;
  saving: boolean;
  errorMessage: string;
  onChange: (field: keyof AddressDraft, value: string | boolean) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target;

    if (
      event.key === "Enter" &&
      target instanceof HTMLInputElement &&
      target.type !== "checkbox"
    ) {
      event.preventDefault();
      onSave();
    }
  }

  return (
    <div
      onKeyDown={handleEditorKeyDown}
      className="border-b border-black/10 bg-[#fafaf8] p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-5 border-b border-black/10 pb-5">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40">
            {mode === "new" ? "New saved address" : "Edit saved address"}
          </p>

          <h3 className="mt-2 text-xl font-semibold">
            {mode === "new"
              ? "Add a delivery location"
              : "Update your delivery location"}
          </h3>

          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-black/45">
            Required fields are marked with a red asterisk.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close address editor"
          className="st-checkout-module grid h-9 w-9 shrink-0 place-items-center border border-black/10 bg-white text-black/45 transition hover:border-black hover:bg-black hover:text-white disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="checkout-address-label"
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              errors.label ? "text-red-600" : "text-neutral-500"
            }`}
          >
            Address label
            <span className="ml-1 text-red-600">*</span>
          </label>

          <input
            id="checkout-address-label"
            type="text"
            value={draft.label}
            onChange={(event) => onChange("label", event.target.value)}
            placeholder="Home, Work, Parents..."
            aria-invalid={Boolean(errors.label)}
            className={addressInputClass(Boolean(errors.label))}
          />

          <FieldError message={errors.label} />
        </div>

        <div>
          <label
            htmlFor="checkout-address-country"
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              errors.country ? "text-red-600" : "text-neutral-500"
            }`}
          >
            Country
            <span className="ml-1 text-red-600">*</span>
          </label>

          <select
            id="checkout-address-country"
            value={draft.country}
            onChange={(event) => onChange("country", event.target.value)}
            aria-invalid={Boolean(errors.country)}
            className={addressInputClass(Boolean(errors.country))}
          >
            {deliveryCountries.map((country) => (
              <option
                key={country.name}
                value={country.name}
                disabled={!country.enabled}
              >
                {country.flag}{" "}
                {country.enabled
                  ? country.name
                  : `${country.name} — Coming soon`}
              </option>
            ))}
          </select>

          <FieldError message={errors.country} />

          {!errors.country ? (
            <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-neutral-400">
              Delivery is currently available in Lebanon only.
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="checkout-address-city"
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              errors.city ? "text-red-600" : "text-neutral-500"
            }`}
          >
            City
            <span className="ml-1 text-red-600">*</span>
          </label>

          <input
            id="checkout-address-city"
            type="text"
            value={draft.city}
            onChange={(event) => onChange("city", event.target.value)}
            placeholder="Beirut"
            aria-invalid={Boolean(errors.city)}
            className={addressInputClass(Boolean(errors.city))}
          />

          <FieldError message={errors.city} />
        </div>

        <div>
          <label
            htmlFor="checkout-address-area"
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              errors.area ? "text-red-600" : "text-neutral-500"
            }`}
          >
            Area
            <span className="ml-1 text-red-600">*</span>
          </label>

          <input
            id="checkout-address-area"
            type="text"
            value={draft.area}
            onChange={(event) => onChange("area", event.target.value)}
            placeholder="Antelias"
            aria-invalid={Boolean(errors.area)}
            className={addressInputClass(Boolean(errors.area))}
          />

          <FieldError message={errors.area} />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="checkout-address-line"
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              errors.addressLine ? "text-red-600" : "text-neutral-500"
            }`}
          >
            Full street address
            <span className="ml-1 text-red-600">*</span>
          </label>

          <input
            id="checkout-address-line"
            type="text"
            value={draft.addressLine}
            onChange={(event) => onChange("addressLine", event.target.value)}
            placeholder="Street, road, and neighborhood"
            aria-invalid={Boolean(errors.addressLine)}
            className={addressInputClass(Boolean(errors.addressLine))}
          />

          <FieldError message={errors.addressLine} />
        </div>

        <div>
          <label
            htmlFor="checkout-address-building"
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              errors.building ? "text-red-600" : "text-neutral-500"
            }`}
          >
            Building
            <span className="ml-1 text-red-600">*</span>
          </label>

          <input
            id="checkout-address-building"
            type="text"
            value={draft.building}
            onChange={(event) => onChange("building", event.target.value)}
            placeholder="Building name or number"
            aria-invalid={Boolean(errors.building)}
            className={addressInputClass(Boolean(errors.building))}
          />

          <FieldError message={errors.building} />
        </div>

        <div>
          <label
            htmlFor="checkout-address-floor"
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              errors.floor ? "text-red-600" : "text-neutral-500"
            }`}
          >
            Floor
            <span className="ml-1 text-red-600">*</span>
          </label>

          <input
            id="checkout-address-floor"
            type="text"
            value={draft.floor}
            onChange={(event) => onChange("floor", event.target.value)}
            placeholder="3"
            aria-invalid={Boolean(errors.floor)}
            className={addressInputClass(Boolean(errors.floor))}
          />

          <FieldError message={errors.floor} />
        </div>

        <div>
          <label
            htmlFor="checkout-address-apartment"
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              errors.apartment ? "text-red-600" : "text-neutral-500"
            }`}
          >
            Apartment
            <span className="ml-1 text-red-600">*</span>
          </label>

          <input
            id="checkout-address-apartment"
            type="text"
            value={draft.apartment}
            onChange={(event) => onChange("apartment", event.target.value)}
            placeholder="Apartment or door number"
            aria-invalid={Boolean(errors.apartment)}
            className={addressInputClass(Boolean(errors.apartment))}
          />

          <FieldError message={errors.apartment} />
        </div>

        <div>
          <label
            htmlFor="checkout-address-landmark"
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
          >
            Nearby landmark
            <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">
              Optional
            </span>
          </label>

          <input
            id="checkout-address-landmark"
            type="text"
            value={draft.landmark}
            onChange={(event) => onChange("landmark", event.target.value)}
            placeholder="Near a known location"
            className={addressInputClass(false)}
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="checkout-address-instructions"
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
          >
            Delivery instructions
            <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">
              Optional
            </span>
          </label>

          <textarea
            id="checkout-address-instructions"
            rows={4}
            value={draft.deliveryInstructions}
            onChange={(event) =>
              onChange("deliveryInstructions", event.target.value)
            }
            placeholder="Entrance details or courier instructions"
            className="mt-2 w-full resize-none border border-neutral-300 bg-white px-4 py-4 text-sm leading-6 outline-none transition hover:border-neutral-400 focus:border-black focus:ring-4 focus:ring-black/[0.035]"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 border border-neutral-200 bg-white px-4 py-4 sm:col-span-2">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(event) => onChange("isDefault", event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-black"
          />

          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.12em]">
              Use as default address
            </span>

            <span className="mt-1 block text-xs leading-5 text-neutral-500">
              This address will be selected automatically during future
              checkouts.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="border border-black bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-black disabled:cursor-wait disabled:border-neutral-300 disabled:bg-neutral-200 disabled:text-neutral-500"
        >
          {saving
            ? "Saving address..."
            : mode === "new"
              ? "Save address"
              : "Save changes"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="border border-neutral-300 bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-600 transition hover:border-black hover:text-black disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   CHECKOUT PAGE
========================================================= */

export default function CheckoutPage() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const {
    items,
    totalItems,
    subtotal,
    isCartReady,
    removeItem,
    updateQuantity,
  } = useCart();

  const [form, setForm] = useState<CheckoutForm>(initialForm);

  const [errors, setErrors] = useState<FormErrors>({});

  const [errorMessage, setErrorMessage] = useState("");

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );

  const [phoneCountryCode, setPhoneCountryCode] = useState("+961");

  const [phoneCountryName, setPhoneCountryName] = useState("Lebanon");

  const [phoneSelectorOpen, setPhoneSelectorOpen] = useState(false);

  const [accountLoading, setAccountLoading] = useState(true);

  const [signedIn, setSignedIn] = useState(false);

  const [accountUserId, setAccountUserId] = useState("");

  const [accountEmail, setAccountEmail] = useState("");

  const [accountError, setAccountError] = useState("");

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const [selectedAddressId, setSelectedAddressId] = useState("manual");

  const [addressEditorMode, setAddressEditorMode] =
    useState<AddressEditorMode>("closed");

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [addressDraft, setAddressDraft] =
    useState<AddressDraft>(initialAddressDraft);

  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});

  const [addressActionError, setAddressActionError] = useState("");

  const [addressActionMessage, setAddressActionMessage] = useState("");

  const [addressSaving, setAddressSaving] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);

  const addressEditorRef = useRef<HTMLDivElement | null>(null);

  const deliveryFee = 0;

  const discountAmount = appliedCoupon?.discountAmount ?? 0;

  const orderTotal = useMemo(
    () => Math.max(0, subtotal - discountAmount + deliveryFee),
    [subtotal, discountAmount, deliveryFee],
  );

  const selectedPhoneCountry =
    phoneCountries.find(
      (option) =>
        option.code === phoneCountryCode && option.country === phoneCountryName,
    ) ?? phoneCountries[0];

  /* =======================================================
     LOAD CUSTOMER PROFILE AND ADDRESSES
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadCustomerAccount() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (userError || !user) {
        setAccountLoading(false);
        return;
      }

      setSignedIn(true);
      setAccountUserId(user.id);
      setAccountEmail(user.email ?? "");

      const [profileResponse, addressResponse] = await Promise.all([
        supabase
          .from("customer_profiles")
          .select(
            `
              first_name,
              last_name,
              phone_country_code,
              phone_number
            `,
          )
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("customer_addresses")
          .select(
            `
              id,
              label,
              country,
              city,
              area,
              address_line,
              building,
              floor,
              apartment,
              landmark,
              delivery_instructions,
              is_default
            `,
          )
          .eq("user_id", user.id)
          .order("is_default", {
            ascending: false,
          })
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (cancelled) {
        return;
      }

      const profile = profileResponse.data as CustomerProfileRow | null;

      const addresses = (addressResponse.data ?? []) as SavedAddress[];

      const metadata = user.user_metadata ?? {};

      const firstName =
        profile?.first_name ?? String(metadata.first_name ?? "");

      const lastName = profile?.last_name ?? String(metadata.last_name ?? "");

      const phoneCode =
        profile?.phone_country_code ??
        String(metadata.phone_country_code ?? "+961");

      const phoneNumber = profile?.phone_number ?? String(metadata.phone ?? "");

      const matchingPhoneCountry =
        phoneCountries.find((country) => country.code === phoneCode) ??
        phoneCountries[0];

      const defaultAddress =
        addresses.find((address) => address.is_default) ?? addresses[0] ?? null;

      setPhoneCountryCode(matchingPhoneCountry.code);

      setPhoneCountryName(matchingPhoneCountry.country);

      setSavedAddresses(addresses);

      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }

      setForm((current) => ({
        ...current,

        firstName: current.firstName || firstName,

        lastName: current.lastName || lastName,

        email: current.email || user.email || "",

        phone:
          current.phone || phoneNumber.slice(0, matchingPhoneCountry.maxDigits),

        country: "Lebanon",

        city: defaultAddress?.city || current.city,

        area: defaultAddress?.area || current.area,

        address: defaultAddress?.address_line || current.address,

        building: defaultAddress?.building || current.building,

        floor: defaultAddress ? buildFloorValue(defaultAddress) : current.floor,

        landmark: defaultAddress?.landmark || current.landmark,

        deliveryNotes:
          defaultAddress?.delivery_instructions || current.deliveryNotes,
      }));

      if (profileResponse.error || addressResponse.error) {
        setAccountError(
          "Your account was detected, but some saved information could not be loaded.",
        );
      }

      setAccountLoading(false);
    }

    void loadCustomerAccount();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  /* =======================================================
     CHECKOUT FORM
  ======================================================= */

  function updateField(field: keyof CheckoutForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    startTransition(() => {
      if (
        field === "firstName" ||
        field === "lastName" ||
        field === "email" ||
        field === "phone" ||
        field === "city" ||
        field === "area" ||
        field === "address" ||
        field === "building" ||
        field === "floor"
      ) {
        setErrors((current) => {
          if (!current[field]) {
            return current;
          }

          return {
            ...current,
            [field]: undefined,
          };
        });
      }

      if (
        field === "country" ||
        field === "city" ||
        field === "area" ||
        field === "address" ||
        field === "building" ||
        field === "floor" ||
        field === "landmark" ||
        field === "deliveryNotes"
      ) {
        setSelectedAddressId((current) =>
          current === "manual" ? current : "manual",
        );
      }

      setErrorMessage((current) => (current ? "" : current));
    });
  }

  function updatePhone(value: string) {
    if (!/^\d*$/.test(value)) {
      return;
    }

    if (value.length > selectedPhoneCountry.maxDigits) {
      return;
    }

    updateField("phone", value);
  }

  function handlePhoneKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
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

  function selectPhoneCountry(option: PhoneCountry) {
    setPhoneCountryCode(option.code);
    setPhoneCountryName(option.country);
    setPhoneSelectorOpen(false);

    setForm((current) => ({
      ...current,
      phone: current.phone.length <= option.maxDigits ? current.phone : "",
    }));

    setErrors((current) => ({
      ...current,
      phone: undefined,
    }));
  }

  /* =======================================================
     SAVED ADDRESS SELECTION
  ======================================================= */

  function selectSavedAddress(address: SavedAddress) {
    setSelectedAddressId(address.id);

    setForm((current) => ({
      ...current,
      country: "Lebanon",
      city: address.city ?? "",
      area: address.area ?? "",
      address: address.address_line ?? "",
      building: address.building ?? "",
      floor: buildFloorValue(address),
      landmark: address.landmark ?? "",
      deliveryNotes: address.delivery_instructions ?? "",
    }));

    setErrors((current) => ({
      ...current,
      city: undefined,
      area: undefined,
      address: undefined,
      building: undefined,
      floor: undefined,
    }));

    setErrorMessage("");
  }

  function enterDifferentAddress() {
    setSelectedAddressId("manual");

    setForm((current) => ({
      ...current,
      country: "Lebanon",
      city: "",
      area: "",
      address: "",
      building: "",
      floor: "",
      landmark: "",
      deliveryNotes: "",
    }));

    setErrors((current) => ({
      ...current,
      city: undefined,
      area: undefined,
      address: undefined,
      building: undefined,
      floor: undefined,
    }));

    window.setTimeout(() => {
      document.getElementById("city")?.focus();
    }, 100);
  }

  /* =======================================================
     ADDRESS EDITOR
  ======================================================= */

  function openNewAddressEditor() {
    setAddressEditorMode("new");
    setEditingAddressId(null);

    setAddressDraft({
      ...initialAddressDraft,
      isDefault: savedAddresses.length === 0,
    });

    setAddressErrors({});
    setAddressActionError("");
    setAddressActionMessage("");

    window.setTimeout(() => {
      addressEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      document.getElementById("checkout-address-label")?.focus();
    }, 100);
  }

  function openEditAddressEditor(address: SavedAddress) {
    setAddressEditorMode("edit");
    setEditingAddressId(address.id);

    setAddressDraft(createDraftFromAddress(address));

    setAddressErrors({});
    setAddressActionError("");
    setAddressActionMessage("");

    window.setTimeout(() => {
      addressEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }

  function closeAddressEditor() {
    setAddressEditorMode("closed");
    setEditingAddressId(null);
    setAddressErrors({});
    setAddressActionError("");
    setAddressSaving(false);
  }

  function updateAddressDraft(
    field: keyof AddressDraft,
    value: string | boolean,
  ) {
    setAddressDraft((current) => ({
      ...current,
      [field]: value,
    }));

    startTransition(() => {
      if (
        field === "label" ||
        field === "country" ||
        field === "city" ||
        field === "area" ||
        field === "addressLine" ||
        field === "building" ||
        field === "floor" ||
        field === "apartment"
      ) {
        setAddressErrors((current) => {
          if (!current[field]) {
            return current;
          }

          return {
            ...current,
            [field]: undefined,
          };
        });
      }

      setAddressActionError((current) => (current ? "" : current));
    });
  }

  function validateAddressDraft() {
    const nextErrors: AddressErrors = {};

    if (!addressDraft.label.trim()) {
      nextErrors.label = "Address label is required.";
    }

    if (!addressDraft.country.trim()) {
      nextErrors.country = "Country is required.";
    }

    if (!addressDraft.city.trim()) {
      nextErrors.city = "City is required.";
    }

    if (!addressDraft.area.trim()) {
      nextErrors.area = "Area is required.";
    }

    if (!addressDraft.addressLine.trim()) {
      nextErrors.addressLine = "Full street address is required.";
    }

    if (!addressDraft.building.trim()) {
      nextErrors.building = "Building is required.";
    }

    if (!addressDraft.floor.trim()) {
      nextErrors.floor = "Floor is required.";
    }

    if (!addressDraft.apartment.trim()) {
      nextErrors.apartment = "Apartment is required.";
    }

    setAddressErrors(nextErrors);

    return nextErrors;
  }

  function focusFirstAddressError(nextErrors: AddressErrors) {
    const firstField = Object.keys(nextErrors)[0] as
      AddressRequiredField | undefined;

    if (!firstField) {
      return;
    }

    const fieldId =
      firstField === "addressLine"
        ? "checkout-address-line"
        : `checkout-address-${firstField}`;

    window.requestAnimationFrame(() => {
      const field = document.getElementById(fieldId);

      field?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      window.setTimeout(() => {
        field?.focus();
      }, 300);
    });
  }

  async function reloadSavedAddresses(preferredAddressId?: string) {
    if (!accountUserId) {
      return false;
    }

    const { data, error } = await supabase
      .from("customer_addresses")
      .select(
        `
            id,
            label,
            country,
            city,
            area,
            address_line,
            building,
            floor,
            apartment,
            landmark,
            delivery_instructions,
            is_default
          `,
      )
      .eq("user_id", accountUserId)
      .order("is_default", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setAddressActionError("The saved address list could not be refreshed.");

      return false;
    }

    const addresses = (data ?? []) as SavedAddress[];

    setSavedAddresses(addresses);

    const preferredAddress = addresses.find(
      (address) => address.id === preferredAddressId,
    );

    const nextAddress =
      preferredAddress ??
      addresses.find((address) => address.is_default) ??
      addresses[0] ??
      null;

    if (nextAddress) {
      selectSavedAddress(nextAddress);
    } else {
      setSelectedAddressId("manual");
    }

    return true;
  }

  async function saveAccountAddress() {
    if (addressSaving) {
      return;
    }

    const nextErrors = validateAddressDraft();

    if (Object.keys(nextErrors).length > 0) {
      focusFirstAddressError(nextErrors);
      return;
    }

    if (!signedIn || !accountUserId) {
      setAddressActionError(
        "You must be signed in to save an address to your account.",
      );

      return;
    }

    if (addressEditorMode === "closed") {
      return;
    }

    setAddressSaving(true);
    setAddressActionError("");
    setAddressActionMessage("");

    const shouldBeDefault =
      addressDraft.isDefault ||
      (addressEditorMode === "new" && savedAddresses.length === 0);

    const payload = {
      label: addressDraft.label.trim(),
      country: "Lebanon",
      city: addressDraft.city.trim(),
      area: addressDraft.area.trim(),
      address_line: addressDraft.addressLine.trim(),
      building: addressDraft.building.trim(),
      floor: addressDraft.floor.trim(),
      apartment: addressDraft.apartment.trim(),
      landmark: addressDraft.landmark.trim(),
      delivery_instructions: addressDraft.deliveryInstructions.trim(),
      is_default: shouldBeDefault,
    };

    if (addressEditorMode === "new") {
      const { data, error } = await supabase
        .from("customer_addresses")
        .insert({
          user_id: accountUserId,
          ...payload,
        })
        .select("id")
        .single();

      if (error || !data) {
        setAddressSaving(false);

        setAddressActionError(
          "The address could not be saved. Please try again.",
        );

        return;
      }

      const refreshed = await reloadSavedAddresses(data.id);

      if (!refreshed) {
        setAddressSaving(false);
        return;
      }

      setAddressActionMessage(
        "Your new address was saved and selected for this order.",
      );
    } else {
      if (!editingAddressId) {
        setAddressSaving(false);

        setAddressActionError("The address could not be identified.");

        return;
      }

      const { error } = await supabase
        .from("customer_addresses")
        .update(payload)
        .eq("id", editingAddressId)
        .eq("user_id", accountUserId);

      if (error) {
        setAddressSaving(false);

        setAddressActionError(
          "The address could not be updated. Please try again.",
        );

        return;
      }

      const refreshed = await reloadSavedAddresses(editingAddressId);

      if (!refreshed) {
        setAddressSaving(false);
        return;
      }

      setAddressActionMessage(
        "Your address was updated and selected for this order.",
      );
    }

    setAddressSaving(false);
    setAddressEditorMode("closed");
    setEditingAddressId(null);
    setAddressErrors({});
  }

  /* =======================================================
     CHECKOUT VALIDATION
  ======================================================= */

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.firstName.trim()) {
      nextErrors.firstName = "First name is required.";
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = "Last name is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!emailIsValid(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else if (
      form.phone.length < selectedPhoneCountry.minDigits ||
      form.phone.length > selectedPhoneCountry.maxDigits
    ) {
      const requiredLength =
        selectedPhoneCountry.minDigits === selectedPhoneCountry.maxDigits
          ? `${selectedPhoneCountry.maxDigits} digits`
          : `${selectedPhoneCountry.minDigits} to ${selectedPhoneCountry.maxDigits} digits`;

      nextErrors.phone = `Enter a valid ${selectedPhoneCountry.country} number containing ${requiredLength}.`;
    }

    if (!form.city.trim()) {
      nextErrors.city = "City is required.";
    }

    if (!form.area.trim()) {
      nextErrors.area = "Area is required.";
    }

    if (!form.address.trim()) {
      nextErrors.address = "Street address is required.";
    }

    if (!form.building.trim()) {
      nextErrors.building = "Building is required.";
    }

    if (!form.floor.trim()) {
      nextErrors.floor = "Floor or apartment is required.";
    }

    setErrors(nextErrors);

    return nextErrors;
  }

  function scrollToFirstError(nextErrors: FormErrors) {
    const firstField = Object.keys(nextErrors)[0] as RequiredField | undefined;

    if (!firstField) {
      return;
    }

    const element = document.querySelector(
      `[data-checkout-field="${firstField}"]`,
    );

    element?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    window.setTimeout(() => {
      const inputId =
        firstField === "firstName"
          ? "first-name"
          : firstField === "lastName"
            ? "last-name"
            : firstField;

      document.getElementById(inputId)?.focus();
    }, 400);
  }

  function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrorMessage(
        "Please correct the highlighted information before continuing.",
      );

      scrollToFirstError(nextErrors);
      return;
    }

    if (items.length === 0) {
      setErrorMessage("Your cart is empty. Add a product before continuing.");

      return;
    }

    const checkoutDetails = {
      customer: {
        ...form,
        country: "Lebanon",
        phone: `${selectedPhoneCountry.code}${form.phone}`,
        deliveryNotes: [
          form.landmark.trim() ? `Landmark: ${form.landmark.trim()}` : "",
          form.deliveryNotes.trim(),
        ]
          .filter(Boolean)
          .join("\n"),
      },

      customerAccount: {
        signedIn,
        email: accountEmail || form.email,
        savedAddressId:
          selectedAddressId === "manual" ? null : selectedAddressId,
      },

      phoneCountry: {
        country: selectedPhoneCountry.country,
        code: selectedPhoneCountry.code,
        flag: selectedPhoneCountry.flag,
      },

      coupon: appliedCoupon
        ? {
            code: appliedCoupon.code,

            name: appliedCoupon.name,

            description: appliedCoupon.description,

            discountType: appliedCoupon.discountType,

            discountValue: appliedCoupon.discountValue,

            discountAmount: appliedCoupon.discountAmount,
          }
        : null,

      discountAmount,
      cart: items,
      subtotal,
      deliveryFee,
      orderTotal,
    };

    window.sessionStorage.setItem(
      "stereophonie-checkout-details",
      JSON.stringify(checkoutDetails),
    );

    window.sessionStorage.removeItem("stereophonie-last-order");

    window.sessionStorage.setItem(
      "stereophonie-order-submission-status",
      "ready",
    );

    router.push("/checkout/review");
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (!isCartReady || accountLoading) {
    return (
      <>
        <V3Header />
        <main className="st-checkout-v2 st-checkout-loading flex min-h-[60vh] items-center justify-center bg-white text-black">
          <div className="rounded-[24px] border border-black/[0.08] bg-white px-10 py-9 text-center shadow-[0_18px_55px_rgba(29,29,31,0.06)]">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-black/15 border-t-[#b77700]" />

            <p className="mt-4 text-sm font-medium text-black/50">
              Preparing your checkout…
            </p>
          </div>
        </main>
      </>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <>
      <V3Header />
      <main className="st-checkout-v2 min-h-screen bg-[#f7f7f5] text-black">
        <section className="st-checkout-compact-head">
          <div>
            <p className="st-checkout-compact-head__eyebrow">Checkout</p>
            <h1>Delivery details</h1>
            <p>Enter the information needed to deliver your order.</p>
          </div>

          <div className="st-checkout-compact-head__trust">
            <LockKeyhole />
            <span>
              <strong>Secure checkout</strong>
              <small>Review everything before confirming</small>
            </span>
          </div>
        </section>

        <CheckoutProgress currentStep={1} />

        <section className="st-checkout-content mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
          {items.length === 0 ? (
            <div className="flex min-h-[440px] flex-col items-center justify-center border border-dashed border-black/15 bg-white px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center border border-black/10 bg-black/[0.025]">
                <ShoppingBag className="h-7 w-7 text-black/30" />
              </div>

              <h2 className="mt-6 text-2xl font-semibold">
                Your cart is empty
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-black/45">
                Select a product configuration before proceeding to checkout.
              </p>

              <Link
                href="/shop"
                className="mt-7 bg-black px-7 py-4 text-xs font-semibold uppercase tracking-[0.17em] !text-white transition hover:bg-[#242424]"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={submitCheckout}
              noValidate
              className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_430px] xl:gap-10"
            >
              <div className="min-w-0 space-y-6 sm:space-y-8">
                {errorMessage ? (
                  <div
                    role="alert"
                    className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700 sm:px-5"
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                {accountError ? (
                  <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800 sm:px-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                    <span>{accountError}</span>
                  </div>
                ) : null}

                {signedIn ? (
                  <section className="border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-start gap-4 px-4 py-5 sm:px-6">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
                        <UserRound className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                          Customer account detected
                        </p>

                        <h2 className="mt-2 text-lg font-semibold">
                          Your account information has been applied
                        </h2>

                        <p className="mt-2 break-all text-sm text-emerald-900/60">
                          {accountEmail}
                        </p>
                      </div>

                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                    </div>
                  </section>
                ) : (
                  <section className="st-checkout-module border border-black/10 bg-white">
                    <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40">
                          Guest checkout
                        </p>

                        <p className="mt-2 text-sm leading-6 text-black/55">
                          Sign in to use your customer profile and saved
                          delivery addresses.
                        </p>
                      </div>

                      <Link
                        href="/account?mode=login"
                        className="shrink-0 border border-black bg-black px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] !text-white transition hover:bg-white hover:!text-black"
                      >
                        Sign in
                      </Link>
                    </div>
                  </section>
                )}

                {/* CONTACT INFORMATION */}

                <section className="st-checkout-module border border-black/10 bg-white">
                  <div className="border-b border-black/10 px-4 py-5 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                      Step 01
                    </p>

                    <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.025em] sm:text-[24px]">
                      Contact information
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-black/45">
                      Select any international telephone code. Delivery is
                      currently available in Lebanon only.
                    </p>
                  </div>

                  <div className="grid gap-x-4 gap-y-4 p-4 sm:grid-cols-2 sm:px-5 sm:py-5">
                    <div data-checkout-field="firstName">
                      <label
                        htmlFor="first-name"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.firstName ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        First name
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="first-name"
                        type="text"
                        value={form.firstName}
                        onChange={(event) =>
                          updateField("firstName", event.target.value)
                        }
                        autoComplete="given-name"
                        aria-invalid={Boolean(errors.firstName)}
                        className={fieldInputClass(Boolean(errors.firstName))}
                      />

                      <FieldError message={errors.firstName} />
                    </div>

                    <div data-checkout-field="lastName">
                      <label
                        htmlFor="last-name"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.lastName ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        Last name
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="last-name"
                        type="text"
                        value={form.lastName}
                        onChange={(event) =>
                          updateField("lastName", event.target.value)
                        }
                        autoComplete="family-name"
                        aria-invalid={Boolean(errors.lastName)}
                        className={fieldInputClass(Boolean(errors.lastName))}
                      />

                      <FieldError message={errors.lastName} />
                    </div>

                    <div data-checkout-field="email">
                      <label
                        htmlFor="email"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.email ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        Email address
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        autoComplete="email"
                        inputMode="email"
                        aria-invalid={Boolean(errors.email)}
                        className={fieldInputClass(Boolean(errors.email))}
                      />

                      <FieldError message={errors.email} />
                    </div>

                    <div data-checkout-field="phone">
                      <label
                        htmlFor="phone"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.phone ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        Phone number
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <div className="relative mt-2.5">
                        <div
                          className={`flex min-h-14 ${
                            errors.phone
                              ? "border border-red-500 ring-1 ring-red-500"
                              : "border border-black/15 focus-within:border-black focus-within:ring-1 focus-within:ring-black"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setPhoneSelectorOpen((current) => !current)
                            }
                            aria-expanded={phoneSelectorOpen}
                            className="flex shrink-0 items-center gap-2 border-r border-black/10 bg-[#f7f7f5] px-3 text-sm text-black transition hover:bg-black/[0.06] sm:px-4 st-checkout-phone-country-trigger"
                          >
                            <span className="text-xl leading-none">
                              {selectedPhoneCountry.flag}
                            </span>

                            <span className="font-medium">
                              {selectedPhoneCountry.code}
                            </span>

                            <ChevronDown
                              className={`h-4 w-4 text-black/40 transition ${
                                phoneSelectorOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          <input
                            id="phone"
                            type="text"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            pattern="[0-9]*"
                            value={form.phone}
                            maxLength={selectedPhoneCountry.maxDigits}
                            onChange={(event) =>
                              updatePhone(event.target.value)
                            }
                            onBeforeInput={(event) => {
                              const inputEvent =
                                event.nativeEvent as InputEvent;

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
                                input.selectionStart ?? form.phone.length;

                              const selectionEnd =
                                input.selectionEnd ?? form.phone.length;

                              const nextValue =
                                form.phone.slice(0, selectionStart) +
                                pastedText +
                                form.phone.slice(selectionEnd);

                              if (
                                nextValue.length >
                                selectedPhoneCountry.maxDigits
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
                            placeholder={selectedPhoneCountry.example}
                            aria-invalid={Boolean(errors.phone)}
                            className="min-w-0 flex-1 bg-white px-4 text-[16px] text-black outline-none placeholder:text-black/25"
                          />
                        </div>

                        {phoneSelectorOpen ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-72 overflow-y-auto border border-black/15 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
                            {phoneCountries.map((option) => {
                              const selected =
                                option.country ===
                                  selectedPhoneCountry.country &&
                                option.code === selectedPhoneCountry.code;

                              return (
                                <button
                                  key={`${option.country}-${option.code}`}
                                  type="button"
                                  onClick={() => selectPhoneCountry(option)}
                                  className={`flex w-full items-center justify-between border-b border-black/[0.06] px-4 py-3 text-left transition last:border-b-0 ${
                                    selected
                                      ? "bg-black !text-white"
                                      : "bg-white text-black hover:bg-black/[0.04]"
                                  }`}
                                >
                                  <span className="flex min-w-0 items-center gap-3">
                                    <span className="text-xl">
                                      {option.flag}
                                    </span>

                                    <span className="truncate text-sm font-medium">
                                      {option.country}
                                    </span>
                                  </span>

                                  <span
                                    className={`shrink-0 text-sm ${
                                      selected
                                        ? "text-white/65"
                                        : "text-black/40"
                                    }`}
                                  >
                                    {option.code}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-start justify-between gap-3">
                        <FieldError message={errors.phone} />

                        {!errors.phone ? (
                          <p className="ml-auto text-right text-[11px] leading-5 text-black/35">
                            {form.phone.length}/{selectedPhoneCountry.maxDigits}{" "}
                            digits
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                {/* DELIVERY ADDRESS */}

                <section className="st-checkout-module border border-black/10 bg-white">
                  <div className="flex flex-col gap-5 border-b border-black/10 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                        Step 02
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                        Delivery address
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-black/45">
                        Delivery is currently available in Lebanon only.
                        Additional countries are coming soon.
                      </p>
                    </div>

                    {signedIn ? (
                      <button
                        type="button"
                        onClick={openNewAddressEditor}
                        className="st-checkout-polish__saved-address-button shrink-0 rounded-full border border-[#e4ad43] bg-[#fdb73e] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#1d1d1f] shadow-[0_3px_10px_rgba(189,116,0,0.07)] transition hover:bg-[#f8ad24]"
                      >
                        + Add saved address
                      </button>
                    ) : null}
                  </div>

                  {addressActionMessage ? (
                    <div className="flex items-start gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800 sm:px-6">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                      <span>{addressActionMessage}</span>
                    </div>
                  ) : null}

                  {addressActionError && addressEditorMode === "closed" ? (
                    <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700 sm:px-6">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                      <span>{addressActionError}</span>
                    </div>
                  ) : null}

                  {signedIn && addressEditorMode !== "closed" ? (
                    <div ref={addressEditorRef}>
                      <AddressEditor
                        mode={addressEditorMode}
                        draft={addressDraft}
                        errors={addressErrors}
                        saving={addressSaving}
                        errorMessage={addressActionError}
                        onChange={updateAddressDraft}
                        onSave={() => {
                          void saveAccountAddress();
                        }}
                        onClose={closeAddressEditor}
                      />
                    </div>
                  ) : null}

                  {signedIn ? (
                    <div className="border-b border-black/10 bg-[#fafaf8] p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-5">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40">
                            Saved addresses
                          </p>

                          <p className="mt-2 text-sm leading-6 text-black/55">
                            Select, add, or edit a delivery location without
                            leaving checkout.
                          </p>
                        </div>

                        <MapPin className="h-5 w-5 shrink-0 text-black/35" />
                      </div>

                      {savedAddresses.length > 0 ? (
                        <div className="mt-5 grid gap-3">
                          {savedAddresses.map((address) => {
                            const selected = selectedAddressId === address.id;

                            return (
                              <article
                                key={address.id}
                                className={`border transition ${
                                  selected
                                    ? "border-black bg-black text-white"
                                    : "border-black/10 bg-white text-black"
                                }`}
                              >
                                <div className="flex items-stretch">
                                  <button
                                    type="button"
                                    onClick={() => selectSavedAddress(address)}
                                    className="min-w-0 flex-1 p-4 text-left sm:p-5"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-semibold uppercase tracking-[0.08em]">
                                            {address.label || "Address"}
                                          </p>

                                          {address.is_default ? (
                                            <span
                                              className={`px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.13em] ${
                                                selected
                                                  ? "bg-white text-black"
                                                  : "bg-black text-white"
                                              }`}
                                            >
                                              Default
                                            </span>
                                          ) : null}
                                        </div>

                                        <p
                                          className={`mt-3 text-sm leading-6 ${
                                            selected
                                              ? "text-white/65"
                                              : "text-black/50"
                                          }`}
                                        >
                                          {formatSavedAddress(address)}
                                        </p>
                                      </div>

                                      <span
                                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                                          selected
                                            ? "border-white bg-white text-black"
                                            : "border-black/20 text-transparent"
                                        }`}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </span>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditAddressEditor(address)
                                    }
                                    aria-label={`Edit ${
                                      address.label ?? "address"
                                    }`}
                                    className={`grid w-14 shrink-0 place-items-center border-l transition ${
                                      selected
                                        ? "border-white/20 text-white/65 hover:bg-white hover:text-black"
                                        : "border-black/10 text-black/40 hover:bg-black hover:text-white"
                                    }`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </div>
                              </article>
                            );
                          })}

                          <button
                            type="button"
                            onClick={enterDifferentAddress}
                            className={`flex w-full items-center justify-between border p-4 text-left transition sm:p-5 ${
                              selectedAddressId === "manual"
                                ? "border-black bg-black !text-white"
                                : "border-black/10 bg-white text-black hover:border-black/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`grid h-8 w-8 place-items-center rounded-full ${
                                  selectedAddressId === "manual"
                                    ? "bg-white text-black"
                                    : "bg-black text-white"
                                }`}
                              >
                                <Plus className="h-4 w-4" />
                              </span>

                              <div>
                                <p className="text-sm font-semibold">
                                  Use a different address for this order
                                </p>

                                <p
                                  className={`mt-1 text-xs ${
                                    selectedAddressId === "manual"
                                      ? "text-white/55"
                                      : "text-black/40"
                                  }`}
                                >
                                  This address will not be saved automatically.
                                </p>
                              </div>
                            </div>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[16px] border border-dashed border-black/15 bg-white px-5 py-6 text-center">
                          <MapPin className="mx-auto h-5 w-5 text-black/22" />

                          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
                            No saved addresses
                          </p>

                          <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-5 text-black/42">
                            Add your first delivery location now, or complete
                            the manual address form below.
                          </p>

                          <button
                            type="button"
                            onClick={openNewAddressEditor}
                            className="st-checkout-polish__first-address-button mt-4 rounded-full border border-[#e4ad43] bg-[#fdb73e] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#1d1d1f] shadow-[0_3px_10px_rgba(189,116,0,0.07)] transition hover:bg-[#f8ad24]"
                          >
                            Add first saved address
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="grid gap-x-5 gap-y-6 p-4 sm:grid-cols-2 sm:p-6">
                    <div>
                      <label
                        htmlFor="country"
                        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/60"
                      >
                        Delivery country
                      </label>

                      <div className="relative">
                        <select
                          id="country"
                          value={form.country}
                          onChange={(event) =>
                            updateField("country", event.target.value)
                          }
                          className={`${fieldInputClass(
                            false,
                          )} appearance-none pr-12`}
                        >
                          {deliveryCountries.map((country) => (
                            <option
                              key={country.name}
                              value={country.name}
                              disabled={!country.enabled}
                            >
                              {country.flag}{" "}
                              {country.enabled
                                ? country.name
                                : `${country.name} — Coming soon`}
                            </option>
                          ))}
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-black/40" />
                      </div>

                      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-black/35">
                        Delivery is currently available in Lebanon only.
                      </p>
                    </div>

                    <div data-checkout-field="city">
                      <label
                        htmlFor="city"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.city ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        City
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="city"
                        type="text"
                        value={form.city}
                        onChange={(event) =>
                          updateField("city", event.target.value)
                        }
                        placeholder="Beirut"
                        autoComplete="address-level2"
                        aria-invalid={Boolean(errors.city)}
                        className={fieldInputClass(Boolean(errors.city))}
                      />

                      <FieldError message={errors.city} />
                    </div>

                    <div data-checkout-field="area">
                      <label
                        htmlFor="area"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.area ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        Area
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="area"
                        type="text"
                        value={form.area}
                        onChange={(event) =>
                          updateField("area", event.target.value)
                        }
                        placeholder="Antelias"
                        autoComplete="address-level3"
                        aria-invalid={Boolean(errors.area)}
                        className={fieldInputClass(Boolean(errors.area))}
                      />

                      <FieldError message={errors.area} />
                    </div>

                    <div data-checkout-field="address">
                      <label
                        htmlFor="address"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.address ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        Street address
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="address"
                        type="text"
                        value={form.address}
                        onChange={(event) =>
                          updateField("address", event.target.value)
                        }
                        autoComplete="street-address"
                        aria-invalid={Boolean(errors.address)}
                        className={fieldInputClass(Boolean(errors.address))}
                      />

                      <FieldError message={errors.address} />
                    </div>

                    <div data-checkout-field="building">
                      <label
                        htmlFor="building"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.building ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        Building
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="building"
                        type="text"
                        value={form.building}
                        onChange={(event) =>
                          updateField("building", event.target.value)
                        }
                        aria-invalid={Boolean(errors.building)}
                        className={fieldInputClass(Boolean(errors.building))}
                      />

                      <FieldError message={errors.building} />
                    </div>

                    <div data-checkout-field="floor">
                      <label
                        htmlFor="floor"
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          errors.floor ? "text-red-600" : "text-black/60"
                        }`}
                      >
                        Floor or apartment
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="floor"
                        type="text"
                        value={form.floor}
                        onChange={(event) =>
                          updateField("floor", event.target.value)
                        }
                        aria-invalid={Boolean(errors.floor)}
                        className={fieldInputClass(Boolean(errors.floor))}
                      />

                      <FieldError message={errors.floor} />
                    </div>

                    <div>
                      <label
                        htmlFor="landmark"
                        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/60"
                      >
                        Nearby landmark
                        <span className="ml-2 normal-case tracking-normal text-black/30">
                          Optional
                        </span>
                      </label>

                      <input
                        id="landmark"
                        type="text"
                        value={form.landmark}
                        onChange={(event) =>
                          updateField("landmark", event.target.value)
                        }
                        placeholder="Near a known location"
                        className={fieldInputClass(false)}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="delivery-notes"
                        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/60"
                      >
                        Delivery instructions
                        <span className="ml-2 normal-case tracking-normal text-black/30">
                          Optional
                        </span>
                      </label>

                      <textarea
                        id="delivery-notes"
                        rows={4}
                        value={form.deliveryNotes}
                        onChange={(event) =>
                          updateField("deliveryNotes", event.target.value)
                        }
                        placeholder="Entrance details, preferred delivery time, or special instructions."
                        className={`${fieldInputClass(
                          false,
                        )} min-h-24 resize-y py-3 leading-5`}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* ORDER SUMMARY */}

              <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
                <section className="st-checkout-module overflow-hidden rounded-[18px] border border-black/[0.09] bg-white shadow-[0_10px_34px_rgba(29,29,31,0.035)]">
                  <div className="border-b border-black/[0.08] px-4 py-4 sm:px-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                      Order terminal
                    </p>

                    <h2 className="mt-1.5 text-[21px] font-semibold">
                      {totalItems} {totalItems === 1 ? "item" : "items"}
                    </h2>
                  </div>

                  <div className="max-h-[380px] divide-y divide-black/[0.08] overflow-y-auto">
                    {items.map((item) => (
                      <article
                        key={item.cartItemId}
                        className="grid grid-cols-[68px_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[74px_minmax(0,1fr)] sm:p-4"
                      >
                        <Link
                          href={`/shop/${item.slug}`}
                          className="aspect-[4/5] overflow-hidden bg-neutral-100"
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ShoppingBag className="h-5 w-5 text-black/20" />
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {item.name}
                              </p>

                              <p className="mt-1 text-xs text-black/45">
                                Configuration {item.size}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.cartItemId)}
                              aria-label={`Remove ${item.name}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center text-black/30 transition hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex h-9 items-center overflow-hidden rounded-full border border-black/10">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.cartItemId,
                                    item.quantity - 1,
                                  )
                                }
                                disabled={item.quantity <= 1}
                                aria-label="Decrease quantity"
                                className="flex h-full w-9 items-center justify-center bg-white text-black transition hover:bg-black hover:text-white disabled:opacity-25"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>

                              <span className="flex h-full min-w-9 items-center justify-center border-x border-black/10 px-2 text-[13px] font-semibold">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.cartItemId,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={item.quantity >= item.maximumQuantity}
                                aria-label="Increase quantity"
                                className="flex h-full w-10 items-center justify-center bg-white text-black transition hover:bg-black hover:text-white disabled:opacity-25"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <p className="text-sm font-semibold">
                              ${(item.unitPrice * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="space-y-3.5 border-t border-black/[0.08] p-4 sm:p-4">
                    <CouponBox
                      subtotal={subtotal}
                      customerEmail={accountEmail || form.email}
                      value={appliedCoupon}
                      onChange={setAppliedCoupon}
                    />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black/50">Subtotal</span>

                      <span className="font-semibold">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>

                    {appliedCoupon && discountAmount > 0 ? (
                      <div className="flex items-center justify-between gap-4 text-sm text-emerald-700">
                        <span>Coupon {appliedCoupon.code}</span>

                        <span className="font-semibold">
                          −$
                          {discountAmount.toFixed(2)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-black/50">Delivery</span>

                      <span className="text-right text-black/45">
                        Confirmed later
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-black/[0.08] pt-3.5">
                      <span className="font-semibold">Current total</span>

                      <span className="text-[18px] font-semibold">
                        ${orderTotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="st-checkout-polish__continue-button flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full bg-[#fdb73e] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] !text-[#1d1d1f] shadow-[0_5px_16px_rgba(189,116,0,0.08)] transition hover:bg-[#f6ad29]"
                    >
                      Continue to review
                      <Check className="h-4 w-4" />
                    </button>

                    <div className="flex items-start justify-center gap-2 text-center text-[11px] leading-5 text-black/40">
                      <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                      <p>No payment will be collected during this step.</p>
                    </div>
                  </div>
                </section>
              </aside>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
