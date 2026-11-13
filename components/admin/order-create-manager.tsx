"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Gift,
  Loader2,
  Mail,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  Store,
  Truck,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createAdminOrder } from "@/app/admin/orders/new/actions";
import {
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

export type AdminCreateOrderAddress = {
  id: string;
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

export type AdminCreateOrderCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: AdminCreateOrderAddress[];
};

export type AdminCreateOrderVariant = {
  id: string;
  name: string;
  size: string;
  sku: string;
  barcode: string;
  regularPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  availabilityStatus: string;
};

export type AdminCreateOrderProduct = {
  id: string;
  name: string;
  slug: string;
  variants: AdminCreateOrderVariant[];
};

type Props = {
  customers: AdminCreateOrderCustomer[];
  products: AdminCreateOrderProduct[];
  loadingWarnings: string[];
};

type Step = 1 | 2 | 3 | 4;

type CustomerMode =
  | "existing"
  | "guest";

type FulfillmentMethod =
  | "pickup"
  | "delivery";

type PaymentStatus =
  | "unpaid"
  | "paid";

type CartLine = {
  productId: string;
  productName: string;
  variant: AdminCreateOrderVariant;
  quantity: number;
};

type GuestCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type ManualAddress = {
  city: string;
  area: string;
  addressLine: string;
  building: string;
  floor: string;
  apartment: string;
  notes: string;
};

const STEP_LABELS: {
  value: Step;
  label: string;
}[] = [
  {
    value: 1,
    label: "Customer",
  },
  {
    value: 2,
    label: "Products",
  },
  {
    value: 3,
    label: "Order details",
  },
  {
    value: 4,
    label: "Review",
  },
];

function normalize(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

function money(
  value: number,
) {
  return `$${value.toFixed(2)}`;
}

function customerName(
  customer: AdminCreateOrderCustomer,
) {
  return (
    `${customer.firstName} ${customer.lastName}`.trim() ||
    customer.email
  );
}

function variantPrice(
  variant: AdminCreateOrderVariant,
) {
  return (
    variant.salePrice ??
    variant.regularPrice
  );
}

function emailLooksValid(
  value: string,
) {
  const email =
    value.trim();

  return (
    email.includes("@") &&
    email.includes(".")
  );
}

export default function OrderCreateManager({
  customers,
  products,
  loadingWarnings,
}: Props) {
  const rootRef =
    useRef<HTMLElement | null>(
      null,
    );

  const router =
    useRouter();

  const [
    isSubmitting,
    startSubmitTransition,
  ] =
    useTransition();

  const [
    step,
    setStep,
  ] =
    useState<Step>(1);

  const [
    maxStep,
    setMaxStep,
  ] =
    useState<number>(1);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    customerMode,
    setCustomerMode,
  ] =
    useState<CustomerMode>(
      "existing",
    );

  const [
    customerQuery,
    setCustomerQuery,
  ] = useState<string>("");

  const [
    selectedCustomerId,
    setSelectedCustomerId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    guestCustomer,
    setGuestCustomer,
  ] =
    useState<GuestCustomer>({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    });

  const [
    productQuery,
    setProductQuery,
  ] = useState<string>("");

  const [
    cartLines,
    setCartLines,
  ] =
    useState<CartLine[]>(
      [],
    );

  const [
    fulfillment,
    setFulfillment,
  ] =
    useState<FulfillmentMethod>(
      "pickup",
    );

  const [
    paymentStatus,
    setPaymentStatus,
  ] =
    useState<PaymentStatus>(
      "unpaid",
    );

  const [
    giftWrapping,
    setGiftWrapping,
  ] =
    useState(false);

  const [
    couponCode,
    setCouponCode,
  ] = useState<string>("");

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    useManualAddress,
    setUseManualAddress,
  ] =
    useState(false);

  const [
    manualAddress,
    setManualAddress,
  ] =
    useState<ManualAddress>({
      city: "",
      area: "",
      addressLine: "",
      building: "",
      floor: "",
      apartment: "",
      notes: "",
    });

  const selectedCustomer =
    useMemo(
      () =>
        customers.find(
          (customer) =>
            customer.id ===
            selectedCustomerId,
        ) ?? null,
      [
        customers,
        selectedCustomerId,
      ],
    );

  const selectedAddress =
    useMemo(
      () =>
        selectedCustomer?.addresses.find(
          (address) =>
            address.id ===
            selectedAddressId,
        ) ?? null,
      [
        selectedCustomer,
        selectedAddressId,
      ],
    );

  const customerMatches =
    useMemo(() => {
      const query =
        normalize(
          customerQuery ?? "",
        );

      if (!query) {
        return customers.slice(
          0,
          8,
        );
      }

      return customers
        .filter(
          (customer) =>
            normalize(
              [
                customer.firstName,
                customer.lastName,
                customer.email,
                customer.phone,
              ].join(" "),
            ).includes(query),
        )
        .slice(0, 12);
    }, [
      customers,
      customerQuery,
    ]);

  const productMatches =
    useMemo(() => {
      const query =
        normalize(
          productQuery ?? "",
        );

      const rows =
        products.flatMap(
          (product) =>
            product.variants.map(
              (variant) => ({
                product,
                variant,
              }),
            ),
        );

      if (!query) {
        return rows.slice(
          0,
          12,
        );
      }

      return rows
        .filter(
          ({
            product,
            variant,
          }) =>
            normalize(
              [
                product.name,
                variant.name,
                variant.size,
                variant.sku,
                variant.barcode,
              ].join(" "),
            ).includes(query),
        )
        .slice(0, 24);
    }, [
      products,
      productQuery,
    ]);

  const itemCount =
    cartLines.reduce(
      (
        total,
        line,
      ) =>
        total +
        line.quantity,
      0,
    );

  const subtotal =
    cartLines.reduce(
      (
        total,
        line,
      ) =>
        total +
        variantPrice(
          line.variant,
        ) *
          line.quantity,
      0,
    );

  function scrollToWizard() {
    window.setTimeout(
      () => {
        rootRef.current?.scrollIntoView(
          {
            behavior:
              "smooth",
            block: "start",
          },
        );
      },
      20,
    );
  }

  function moveToStep(
    target: Step,
  ) {
    setFormError("");
    setStep(target);

    setMaxStep(
      (current) =>
        Math.max(
          current,
          target,
        ),
    );

    scrollToWizard();
  }

  function clearSelectedCustomer() {
    setSelectedCustomerId(
      null,
    );

    setSelectedAddressId(
      null,
    );

    setUseManualAddress(
      false,
    );

    setCustomerQuery("");
  }

  function chooseCustomer(
    customer: AdminCreateOrderCustomer,
  ) {
    const defaultAddress =
      customer.addresses.find(
        (address) =>
          address.isDefault,
      ) ??
      customer.addresses[0] ??
      null;

    setSelectedCustomerId(
      customer.id,
    );

    setSelectedAddressId(
      defaultAddress?.id ??
        null,
    );

    setUseManualAddress(
      customer.addresses.length ===
        0,
    );

    setCustomerQuery(
      customerName(
        customer,
      ),
    );

    setFormError("");
  }

  function switchCustomerMode(
    mode: CustomerMode,
  ) {
    setCustomerMode(mode);
    setFormError("");

    if (
      mode === "guest"
    ) {
      clearSelectedCustomer();
    }
  }

  function updateGuest(
    field: keyof GuestCustomer,
    value: string,
  ) {
    setGuestCustomer(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setFormError("");
  }

  function updateAddress(
    field: keyof ManualAddress,
    value: string,
  ) {
    setManualAddress(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setFormError("");
  }

  function addVariant(
    product: AdminCreateOrderProduct,
    variant: AdminCreateOrderVariant,
  ) {
    setCartLines(
      (current) => {
        const existing =
          current.find(
            (line) =>
              line.variant.id ===
              variant.id,
          );

        if (existing) {
          return current.map(
            (line) =>
              line.variant.id ===
              variant.id
                ? {
                    ...line,
                    quantity:
                      Math.min(
                        line.quantity +
                          1,
                        variant.stockQuantity,
                      ),
                  }
                : line,
          );
        }

        return [
          ...current,
          {
            productId:
              product.id,
            productName:
              product.name,
            variant,
            quantity: 1,
          },
        ];
      },
    );

    setFormError("");
  }

  function setQuantity(
    variantId: string,
    nextQuantity: number,
  ) {
    setCartLines(
      (current) =>
        current.flatMap(
          (line) => {
            if (
              line.variant.id !==
              variantId
            ) {
              return [line];
            }

            if (
              nextQuantity <= 0
            ) {
              return [];
            }

            return [
              {
                ...line,
                quantity:
                  Math.min(
                    nextQuantity,
                    line.variant
                      .stockQuantity,
                  ),
              },
            ];
          },
        ),
    );
  }

  function validateCustomer() {
    if (
      customerMode ===
      "existing"
    ) {
      if (
        !selectedCustomer
      ) {
        setFormError(
          "Choose a registered customer before continuing.",
        );

        return false;
      }

      return true;
    }

    if (
      !guestCustomer.firstName.trim() ||
      !guestCustomer.lastName.trim()
    ) {
      setFormError(
        "Enter the guest customer's first and last name.",
      );

      return false;
    }

    if (
      !emailLooksValid(
        guestCustomer.email,
      )
    ) {
      setFormError(
        "Enter a valid customer email address.",
      );

      return false;
    }

    if (
      !guestCustomer.phone.trim()
    ) {
      setFormError(
        "Enter the customer's phone number.",
      );

      return false;
    }

    return true;
  }

  function validateProducts() {
    if (
      cartLines.length === 0
    ) {
      setFormError(
        "Add at least one product before continuing.",
      );

      return false;
    }

    return true;
  }

  function deliveryAddressReady() {
    if (
      fulfillment ===
      "pickup"
    ) {
      return true;
    }

    if (
      customerMode ===
        "existing" &&
      !useManualAddress &&
      selectedAddress
    ) {
      return true;
    }

    return Boolean(
      manualAddress.city.trim() &&
        manualAddress.area.trim() &&
        manualAddress.addressLine.trim(),
    );
  }

  function validateDetails() {
    if (
      !deliveryAddressReady()
    ) {
      setFormError(
        "Complete the delivery city, area and street address before continuing.",
      );

      return false;
    }

    return true;
  }

  function nextStep() {
    setFormError("");

    if (
      step === 1 &&
      !validateCustomer()
    ) {
      return;
    }

    if (
      step === 2 &&
      !validateProducts()
    ) {
      return;
    }

    if (
      step === 3 &&
      !validateDetails()
    ) {
      return;
    }

    if (step < 4) {
      moveToStep(
        (step + 1) as Step,
      );
    }
  }

  function previousStep() {
    if (step > 1) {
      moveToStep(
        (step - 1) as Step,
      );
    }
  }

  function submitOrder() {
    setFormError("");

    startSubmitTransition(
      async () => {
        const result =
          await createAdminOrder({
            customerMode,

            customerUserId:
              customerMode ===
              "existing"
                ? selectedCustomer?.id ??
                  null
                : null,

            guestCustomer:
              customerMode ===
              "guest"
                ? {
                    firstName:
                      guestCustomer.firstName,

                    lastName:
                      guestCustomer.lastName,

                    email:
                      guestCustomer.email,

                    phone:
                      guestCustomer.phone,
                  }
                : undefined,

            fulfillmentMethod:
              fulfillment,

            paymentStatus,

            giftWrappingRequested:
              giftWrapping,

            couponCode:
              couponCode.trim() ||
              null,

            savedAddressId:
              fulfillment ===
                "delivery" &&
              customerMode ===
                "existing" &&
              !useManualAddress
                ? selectedAddress?.id ??
                  null
                : null,

            manualAddress:
              fulfillment ===
              "delivery"
                ? {
                    city:
                      manualAddress.city,

                    area:
                      manualAddress.area,

                    addressLine:
                      manualAddress.addressLine,

                    building:
                      manualAddress.building,

                    floor:
                      manualAddress.floor,

                    apartment:
                      manualAddress.apartment,

                    notes:
                      manualAddress.notes,
                  }
                : undefined,

            items:
              cartLines.map(
                (line) => ({
                  variantId:
                    line.variant.id,

                  quantity:
                    line.quantity,
                }),
              ),
          });

        if (
          !result.success
        ) {
          setFormError(
            result.message,
          );

          return;
        }

        router.push(
          `/admin/orders/${result.order_id}?created=1`,
        );

        router.refresh();
      },
    );
  }

  const contextHasCustomer =
    customerMode === "existing"
      ? Boolean(
          selectedCustomerId,
        )
      : Boolean(
          guestCustomer.firstName.trim() &&
          guestCustomer.lastName.trim() &&
          guestCustomer.email.trim() &&
          guestCustomer.phone.trim()
        );

  const reviewCustomerName =
    customerMode ===
    "existing"
      ? selectedCustomer
        ? customerName(
            selectedCustomer,
          )
        : ""
      : `${guestCustomer.firstName} ${guestCustomer.lastName}`.trim();

  const reviewEmail =
    customerMode ===
    "existing"
      ? selectedCustomer?.email ??
        ""
      : guestCustomer.email;

  const reviewPhone =
    customerMode ===
    "existing"
      ? selectedCustomer?.phone ??
        ""
      : guestCustomer.phone;

  const reviewAddress =
    fulfillment ===
    "pickup"
      ? "Stereophonie Store · Pickup"
      : customerMode ===
          "existing" &&
        !useManualAddress &&
        selectedAddress
        ? [
            selectedAddress.city,
            selectedAddress.area,
            selectedAddress.addressLine,
            selectedAddress.building,
          ]
            .filter(Boolean)
            .join(", ")
        : [
            manualAddress.city,
            manualAddress.area,
            manualAddress.addressLine,
            manualAddress.building,
          ]
            .filter(Boolean)
            .join(", ");

  return (
    <section
      ref={rootRef}
      id="st-admin-order-create-v3"
      className="st-admin-order-create-v2"
      aria-label="Create customer order"
    >
      {loadingWarnings.length >
      0 ? (
        <div className="st-admin-order-create-v2__warning">
          {loadingWarnings.map(
            (warning) => (
              <span key={warning}>
                {warning}
              </span>
            ),
          )}
        </div>
      ) : null}

      <header className="st-admin-order-create-v2__progress">
        <div className="st-admin-order-create-v2__progress-track">
          {STEP_LABELS.map(
            (
              item,
              index,
            ) => {
              const completed =
                item.value <
                step;

              const active =
                item.value ===
                step;

              const accessible =
                item.value <=
                maxStep;

              return (
                <div
                  className="st-admin-order-create-v2__progress-unit"
                  key={
                    item.value
                  }
                >
                  <button
                    type="button"
                    className={[
                      active
                        ? "is-active"
                        : "",
                      completed
                        ? "is-complete"
                        : "",
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(" ")}
                    disabled={
                      !accessible
                    }
                    onClick={() => {
                      if (
                        accessible
                      ) {
                        moveToStep(
                          item.value,
                        );
                      }
                    }}
                  >
                    <small>
                      {completed ? (
                        <Check
                          aria-hidden="true"
                        />
                      ) : (
                        item.value
                      )}
                    </small>

                    <span>
                      {
                        item.label
                      }
                    </span>
                  </button>

                  {index <
                  STEP_LABELS.length -
                    1 ? (
                    <ChevronRight
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              );
            },
          )}
        </div>

        <span className="st-admin-order-create-v2__progress-count">
          <small>Step</small>
          <strong>{step}</strong>
          <em>/ 4</em>
        </span>
      </header>

      <div
        key={step}
        className="st-admin-order-create-v2__stage"
      >
        {step === 1 ? (
          <div className="st-admin-order-create-v2__step">
            <div className="st-admin-order-create-v2__step-head">
              <div>
                <strong>
                  Customer
                </strong>

                <span>
                  Choose a registered
                  customer or enter a
                  guest customer
                  manually.
                </span>
              </div>

              <UserRound
                aria-hidden="true"
              />
            </div>

            <div className="st-admin-order-create-v2__customer-tabs">
              <button
                type="button"
                className={
                  customerMode ===
                  "existing"
                    ? "is-active"
                    : undefined
                }
                onClick={() =>
                  switchCustomerMode(
                    "existing",
                  )
                }
              >
                <UserRound
                  aria-hidden="true"
                />
                <span>
                  Existing customer
                </span>
              </button>

              <button
                type="button"
                className={
                  customerMode ===
                  "guest"
                    ? "is-active"
                    : undefined
                }
                onClick={() =>
                  switchCustomerMode(
                    "guest",
                  )
                }
              >
                <UserRoundPlus
                  aria-hidden="true"
                />
                <span>
                  Guest customer
                </span>
              </button>
            </div>

            {customerMode ===
            "existing" ? (
              <div className="st-admin-order-create-v2__customer-picker">
                <label className="st-admin-order-create-v2__search-control">
                  <Search
                    aria-hidden="true"
                  />

                  <input
                    id="st-admin-create-order-customer-search-input"
                    type="text"
                    value={
                      customerQuery ??
                      ""
                    }
                    onChange={(
                      event,
                    ) => {
                      const value =
                        event.currentTarget
                          .value ??
                        "";

                      setCustomerQuery(
                        value,
                      );

                      if (
                        selectedCustomerId
                      ) {
                        setSelectedCustomerId(
                          null,
                        );

                        setSelectedAddressId(
                          null,
                        );
                      }

                      setFormError(
                        "",
                      );
                    }}
                    placeholder="Search customer by name, email or phone"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  {customerQuery ? (
                    <button
                      type="button"
                      onClick={
                        clearSelectedCustomer
                      }
                      aria-label="Clear customer search"
                    >
                      <X
                        aria-hidden="true"
                      />
                    </button>
                  ) : null}
                </label>

                {selectedCustomer ? (
                  <div className="st-admin-order-create-v2__chosen-customer">
                    <span className="st-admin-order-create-v2__customer-mark">
                      <CheckCircle2
                        aria-hidden="true"
                      />
                    </span>

                    <div>
                      <strong>
                        {customerName(
                          selectedCustomer,
                        )}
                      </strong>

                      <span>
                        {
                          selectedCustomer.email
                        }
                      </span>

                      {selectedCustomer.phone ? (
                        <small>
                          {
                            selectedCustomer.phone
                          }
                        </small>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={
                        clearSelectedCustomer
                      }
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="st-admin-order-create-v2__customer-results">
                    {customerMatches.length >
                    0 ? (
                      customerMatches.map(
                        (
                          customer,
                        ) => (
                          <button
                            type="button"
                            key={
                              customer.id
                            }
                            onClick={() =>
                              chooseCustomer(
                                customer,
                              )
                            }
                          >
                            <span className="st-admin-order-create-v2__customer-avatar">
                              <UserRound
                                aria-hidden="true"
                              />
                            </span>

                            <span className="st-admin-order-create-v2__customer-identity">
                              <strong>
                                {customerName(
                                  customer,
                                )}
                              </strong>

                              <small>
                                {
                                  customer.email
                                }
                              </small>
                            </span>

                            <span className="st-admin-order-create-v2__customer-phone">
                              {customer.phone ||
                                "No phone"}
                            </span>

                            <ChevronRight
                              aria-hidden="true"
                            />
                          </button>
                        ),
                      )
                    ) : (
                      <div className="st-admin-order-create-v2__empty">
                        No registered
                        customer matches
                        this search.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="st-admin-order-create-v2__guest-form">
                <label>
                  <span>
                    First name
                  </span>

                  <div className="st-admin-order-create-v2__field">
                    <input
                      type="text"
                      value={
                        guestCustomer.firstName ??
                        ""
                      }
                      onChange={(
                        event,
                      ) =>
                        updateGuest(
                          "firstName",
                          event
                            .currentTarget
                            .value ??
                            "",
                        )
                      }
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </div>
                </label>

                <label>
                  <span>
                    Last name
                  </span>

                  <div className="st-admin-order-create-v2__field">
                    <input
                      type="text"
                      value={
                        guestCustomer.lastName ??
                        ""
                      }
                      onChange={(
                        event,
                      ) =>
                        updateGuest(
                          "lastName",
                          event
                            .currentTarget
                            .value ??
                            "",
                        )
                      }
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </div>
                </label>

                <label>
                  <span>
                    Email address
                  </span>

                  <div className="st-admin-order-create-v2__field has-icon">
                    <Mail
                      aria-hidden="true"
                    />

                    <input
                      type="email"
                      value={
                        guestCustomer.email ??
                        ""
                      }
                      onChange={(
                        event,
                      ) =>
                        updateGuest(
                          "email",
                          event
                            .currentTarget
                            .value ??
                            "",
                        )
                      }
                      placeholder="customer@example.com"
                      autoComplete="email"
                    />
                  </div>
                </label>

                <label>
                  <span>
                    Phone number
                  </span>

                  <div className="st-admin-order-create-v2__field has-icon">
                    <Phone
                      aria-hidden="true"
                    />

                    <input
                      type="tel"
                      value={
                        guestCustomer.phone ??
                        ""
                      }
                      onChange={(
                        event,
                      ) =>
                        updateGuest(
                          "phone",
                          event
                            .currentTarget
                            .value ??
                            "",
                        )
                      }
                      placeholder="+961"
                      autoComplete="tel"
                    />
                  </div>
                </label>
              </div>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="st-admin-order-create-v2__step">
            <div className="st-admin-order-create-v2__step-head">
              <div>
                <strong>
                  Products
                </strong>

                <span>
                  Search the live
                  catalogue and add the
                  exact configurations
                  the customer wants.
                </span>
              </div>

              <Package
                aria-hidden="true"
              />
            </div>

            <div className="st-admin-order-create-v2__products-layout">
              <div className="st-admin-order-create-v2__product-picker">
                <label className="st-admin-order-create-v2__search-control">
                  <Search
                    aria-hidden="true"
                  />

                  <input
                    id="st-admin-create-order-product-search-input"
                    type="text"
                    value={
                      productQuery ??
                      ""
                    }
                    onChange={(
                      event,
                    ) => {
                      setProductQuery(
                        event
                          .currentTarget
                          .value ??
                          "",
                      );

                      setFormError(
                        "",
                      );
                    }}
                    placeholder="Search product, configuration, SKU or barcode"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  {productQuery ? (
                    <button
                      type="button"
                      onClick={() =>
                        setProductQuery(
                          "",
                        )
                      }
                      aria-label="Clear product search"
                    >
                      <X
                        aria-hidden="true"
                      />
                    </button>
                  ) : null}
                </label>

                <div className="st-admin-order-create-v2__product-results">
                  {productMatches.length >
                  0 ? (
                    productMatches.map(
                      ({
                        product,
                        variant,
                      }) => {
                        const inCart =
                          cartLines.find(
                            (
                              line,
                            ) =>
                              line
                                .variant
                                .id ===
                              variant.id,
                          );

                        return (
                          <div
                            key={
                              variant.id
                            }
                            className="st-admin-order-create-v2__product-row"
                          >
                            <span className="st-admin-order-create-v2__product-mark">
                              <Package
                                aria-hidden="true"
                              />
                            </span>

                            <div className="st-admin-order-create-v2__product-identity">
                              <strong>
                                {
                                  product.name
                                }
                              </strong>

                              <span>
                                {
                                  variant.name
                                }
                              </span>

                              {variant.sku ? (
                                <small>
                                  SKU{" "}
                                  {
                                    variant.sku
                                  }
                                </small>
                              ) : null}
                            </div>

                            <div className="st-admin-order-create-v2__product-stock">
                              <strong>
                                {
                                  variant.stockQuantity
                                }
                              </strong>

                              <span>
                                in stock
                              </span>
                            </div>

                            <div className="st-admin-order-create-v2__product-price">
                              <strong>
                                {money(
                                  variantPrice(
                                    variant,
                                  ),
                                )}
                              </strong>

                              {variant.salePrice !==
                                null &&
                              variant.salePrice <
                                variant.regularPrice ? (
                                <small>
                                  {money(
                                    variant.regularPrice,
                                  )}
                                </small>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              className={
                                inCart
                                  ? "st-admin-order-create-v2__add is-added"
                                  : "st-admin-order-create-v2__add"
                              }
                              onClick={() =>
                                addVariant(
                                  product,
                                  variant,
                                )
                              }
                            >
                              {inCart ? (
                                <Check
                                  aria-hidden="true"
                                />
                              ) : (
                                <Plus
                                  aria-hidden="true"
                                />
                              )}

                              <span>
                                {inCart
                                  ? "Added"
                                  : "Add"}
                              </span>
                            </button>
                          </div>
                        );
                      },
                    )
                  ) : (
                    <div className="st-admin-order-create-v2__empty">
                      No sellable
                      configuration
                      matches this
                      search.
                    </div>
                  )}
                </div>
              </div>

                            <section className="st-admin-order-create-v3__product-context">
                <header>
                  <div>
                    <small>
                      Customer
                    </small>

                    <strong>
                      {
                        reviewCustomerName
                      }
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      moveToStep(1)
                    }
                  >
                    Edit
                  </button>
                </header>

                <div className="st-admin-order-create-v3__product-context-contact">
                  <span>
                    {reviewEmail}
                  </span>

                  <span>
                    {reviewPhone}
                  </span>
                </div>

                <div className="st-admin-order-create-v3__product-context-meta">
                  <span>
                    {
                      fulfillment ===
                      "pickup"
                        ? "Pick up in store"
                        : "Delivery"
                    }
                  </span>

                  <span
                    className={
                      paymentStatus ===
                      "paid"
                        ? "is-paid"
                        : undefined
                    }
                  >
                    {
                      paymentStatus ===
                      "paid"
                        ? "Paid"
                        : "Unpaid"
                    }
                  </span>

                  <span
                    className={
                      giftWrapping
                        ? "is-gift"
                        : undefined
                    }
                  >
                    {
                      giftWrapping
                        ? "Gift wrap"
                        : "No gift wrap"
                    }
                  </span>
                </div>
              </section>

<aside className="st-admin-order-create-v2__cart-panel">
                <header>
                  <div>
                    <strong>
                      Selected items
                    </strong>

                    <span>
                      {itemCount}{" "}
                      {itemCount ===
                      1
                        ? "item"
                        : "items"}
                    </span>
                  </div>
                </header>

                {cartLines.length >
                0 ? (
                  <div className="st-admin-order-create-v2__cart-lines">
                    {cartLines.map(
                      (line) => (
                        <div
                          key={
                            line.variant
                              .id
                          }
                          className="st-admin-order-create-v2__cart-line"
                        >
                          <div className="st-admin-order-create-v2__cart-line-main">
                            <strong>
                              {
                                line.productName
                              }
                            </strong>

                            <span>
                              {
                                line.variant
                                  .name
                              }
                            </span>

                            <small>
                              {money(
                                variantPrice(
                                  line.variant,
                                ),
                              )}{" "}
                              each
                            </small>
                          </div>

                          <div className="st-admin-order-create-v2__quantity">
                            <button
                              type="button"
                              onClick={() =>
                                setQuantity(
                                  line
                                    .variant
                                    .id,
                                  line.quantity -
                                    1,
                                )
                              }
                              aria-label={`Decrease ${line.productName}`}
                            >
                              <Minus
                                aria-hidden="true"
                              />
                            </button>

                            <span>
                              {
                                line.quantity
                              }
                            </span>

                            <button
                              type="button"
                              disabled={
                                line.quantity >=
                                line
                                  .variant
                                  .stockQuantity
                              }
                              onClick={() =>
                                setQuantity(
                                  line
                                    .variant
                                    .id,
                                  line.quantity +
                                    1,
                                )
                              }
                              aria-label={`Increase ${line.productName}`}
                            >
                              <Plus
                                aria-hidden="true"
                              />
                            </button>
                          </div>

                          <strong className="st-admin-order-create-v2__cart-line-total">
                            {money(
                              variantPrice(
                                line.variant,
                              ) *
                                line.quantity,
                            )}
                          </strong>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="st-admin-order-create-v2__cart-empty">
                    <Package
                      aria-hidden="true"
                    />

                    <strong>
                      No products yet
                    </strong>

                    <span>
                      Add products from
                      the catalogue to
                      build this order.
                    </span>
                  </div>
                )}

                <footer>
                  <span>
                    Products subtotal
                  </span>

                  <strong>
                    {money(
                      subtotal,
                    )}
                  </strong>
                </footer>
              </aside>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="st-admin-order-create-v2__step">
            <div className="st-admin-order-create-v2__step-head">
              <div>
                <strong>
                  Order details
                </strong>

                <span>
                  Choose fulfilment,
                  payment status,
                  delivery information
                  and optional services.
                </span>
              </div>

              <Truck
                aria-hidden="true"
              />
            </div>

            <div className="st-admin-order-create-v2__details-grid">
              <section className="st-admin-order-create-v2__detail-card">
                <header>
                  <strong>
                    Fulfilment
                  </strong>

                  <span>
                    How will the customer
                    receive this order?
                  </span>
                </header>

                <div className="st-admin-order-create-v2__choice-row">
                  <button
                    type="button"
                    className={
                      fulfillment ===
                      "pickup"
                        ? "is-active"
                        : undefined
                    }
                    onClick={() => {
                      setFulfillment(
                        "pickup",
                      );

                      setFormError(
                        "",
                      );
                    }}
                  >
                    <Store
                      aria-hidden="true"
                    />

                    <span>
                      Pick up in store
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      fulfillment ===
                      "delivery"
                        ? "is-active"
                        : undefined
                    }
                    onClick={() => {
                      setFulfillment(
                        "delivery",
                      );

                      setFormError(
                        "",
                      );
                    }}
                  >
                    <Truck
                      aria-hidden="true"
                    />

                    <span>
                      Delivery
                    </span>
                  </button>
                </div>
              </section>

              <section className="st-admin-order-create-v2__detail-card">
                <header>
                  <strong>
                    Payment
                  </strong>

                  <span>
                    Record the customer's
                    current payment
                    status.
                  </span>
                </header>

                <div className="st-admin-order-create-v2__choice-row">
                  <button
                    type="button"
                    className={
                      paymentStatus ===
                      "unpaid"
                        ? "is-active"
                        : undefined
                    }
                    onClick={() =>
                      setPaymentStatus(
                        "unpaid",
                      )
                    }
                  >
                    <span>
                      Unpaid
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      paymentStatus ===
                      "paid"
                        ? "st-admin-order-create-v3__paid-choice is-active"
                        : "st-admin-order-create-v3__paid-choice"
                    }
                    onClick={() =>
                      setPaymentStatus(
                        "paid",
                      )
                    }
                  >
                    <CheckCircle2
                      aria-hidden="true"
                    />

                    <span>
                      Paid
                    </span>
                  </button>
                </div>
              </section>

              <section className="st-admin-order-create-v2__detail-card">
                <header>
                  <strong>
                    Gift wrap
                  </strong>

                  <span>
                    Optional wrapping
                    request for the
                    complete order.
                  </span>
                </header>

                <div
                  className={
                    giftWrapping
                      ? "st-admin-order-create-v3__gift-toggle is-active"
                      : "st-admin-order-create-v3__gift-toggle"
                  }
                >
                  <div className="st-admin-order-create-v3__gift-copy">
                    <span>
                      <Gift aria-hidden="true" />
                    </span>

                    <div>
                      <strong>
                        Gift wrapping
                      </strong>

                      <small>
                        {giftWrapping
                          ? "Gift wrap requested"
                          : "No gift wrap"}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={giftWrapping}
                    className="st-admin-order-create-v3__switch"
                    onClick={() =>
                      setGiftWrapping(
                        (current) =>
                          !current,
                      )
                    }
                    aria-label="Toggle gift wrapping"
                  >
                    <span className="st-admin-order-create-v3__switch-track">
                      <span />
                    </span>

                    <small>
                      {giftWrapping
                        ? "On"
                        : "Off"}
                    </small>
                  </button>
                </div>
              </section>

              <section className="st-admin-order-create-v2__detail-card">
                <header>
                  <strong>
                    Coupon
                  </strong>

                  <span>
                    Apply an optional
                    valid customer
                    coupon.
                  </span>
                </header>

                <div className="st-admin-order-create-v2__field">
                  <input
                    type="text"
                    value={
                      couponCode ??
                      ""
                    }
                    onChange={(
                      event,
                    ) =>
                      setCouponCode(
                        (
                          event
                            .currentTarget
                            .value ??
                          ""
                        ).toUpperCase(),
                      )
                    }
                    placeholder="Optional coupon code"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </section>
            </div>

            {fulfillment ===
            "delivery" ? (
              <section className="st-admin-order-create-v2__delivery">
                <div className="st-admin-order-create-v2__subhead">
                  <div>
                    <strong>
                      Delivery address
                    </strong>

                    <span>
                      Choose a saved
                      customer address
                      or enter a new
                      delivery location.
                    </span>
                  </div>

                  <MapPin
                    aria-hidden="true"
                  />
                </div>

                {customerMode ===
                  "existing" &&
                selectedCustomer &&
                selectedCustomer
                  .addresses.length >
                  0 ? (
                  <>
                    <div className="st-admin-order-create-v2__address-list">
                      {selectedCustomer.addresses.map(
                        (
                          address,
                        ) => (
                          <button
                            type="button"
                            key={
                              address.id
                            }
                            className={
                              !useManualAddress &&
                              selectedAddressId ===
                                address.id
                                ? "is-active"
                                : undefined
                            }
                            onClick={() => {
                              setSelectedAddressId(
                                address.id,
                              );

                              setUseManualAddress(
                                false,
                              );

                              setFormError(
                                "",
                              );
                            }}
                          >
                            <span>
                              <strong>
                                {
                                  address.label
                                }
                              </strong>

                              {address.isDefault ? (
                                <small>
                                  Default
                                </small>
                              ) : null}
                            </span>

                            <p>
                              {[
                                address.city,
                                address.area,
                                address.addressLine,
                                address.building,
                              ]
                                .filter(
                                  Boolean,
                                )
                                .join(
                                  ", ",
                                )}
                            </p>
                          </button>
                        ),
                      )}

                      <button
                        type="button"
                        className={
                          useManualAddress
                            ? "is-active is-manual"
                            : "is-manual"
                        }
                        onClick={() => {
                          setUseManualAddress(
                            true,
                          );

                          setFormError(
                            "",
                          );
                        }}
                      >
                        <Plus
                          aria-hidden="true"
                        />

                        <strong>
                          Enter another
                          address
                        </strong>
                      </button>
                    </div>
                  </>
                ) : null}

                {customerMode ===
                  "guest" ||
                useManualAddress ||
                !selectedCustomer ||
                selectedCustomer
                  .addresses.length ===
                  0 ? (
                  <div className="st-admin-order-create-v2__address-form">
                    <label>
                      <span>
                        City
                      </span>

                      <div className="st-admin-order-create-v2__field">
                        <input
                          type="text"
                          value={
                            manualAddress.city ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAddress(
                              "city",
                              event
                                .currentTarget
                                .value ??
                                "",
                            )
                          }
                          placeholder="City"
                          autoComplete="address-level2"
                        />
                      </div>
                    </label>

                    <label>
                      <span>
                        Area
                      </span>

                      <div className="st-admin-order-create-v2__field">
                        <input
                          type="text"
                          value={
                            manualAddress.area ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAddress(
                              "area",
                              event
                                .currentTarget
                                .value ??
                                "",
                            )
                          }
                          placeholder="Area"
                          autoComplete="address-level3"
                        />
                      </div>
                    </label>

                    <label className="is-wide">
                      <span>
                        Street address
                      </span>

                      <div className="st-admin-order-create-v2__field">
                        <input
                          type="text"
                          value={
                            manualAddress.addressLine ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAddress(
                              "addressLine",
                              event
                                .currentTarget
                                .value ??
                                "",
                            )
                          }
                          placeholder="Street, building or delivery location"
                          autoComplete="street-address"
                        />
                      </div>
                    </label>

                    <label>
                      <span>
                        Building
                      </span>

                      <div className="st-admin-order-create-v2__field">
                        <input
                          type="text"
                          value={
                            manualAddress.building ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAddress(
                              "building",
                              event
                                .currentTarget
                                .value ??
                                "",
                            )
                          }
                          placeholder="Optional"
                        />
                      </div>
                    </label>

                    <label>
                      <span>
                        Floor
                      </span>

                      <div className="st-admin-order-create-v2__field">
                        <input
                          type="text"
                          value={
                            manualAddress.floor ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAddress(
                              "floor",
                              event
                                .currentTarget
                                .value ??
                                "",
                            )
                          }
                          placeholder="Optional"
                        />
                      </div>
                    </label>

                    <label>
                      <span>
                        Apartment
                      </span>

                      <div className="st-admin-order-create-v2__field">
                        <input
                          type="text"
                          value={
                            manualAddress.apartment ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAddress(
                              "apartment",
                              event
                                .currentTarget
                                .value ??
                                "",
                            )
                          }
                          placeholder="Optional"
                        />
                      </div>
                    </label>

                    <label className="is-wide">
                      <span>
                        Delivery notes
                      </span>

                      <div className="st-admin-order-create-v2__field">
                        <input
                          type="text"
                          value={
                            manualAddress.notes ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAddress(
                              "notes",
                              event
                                .currentTarget
                                .value ??
                                "",
                            )
                          }
                          placeholder="Optional delivery instructions"
                        />
                      </div>
                    </label>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="st-admin-order-create-v2__step">
            <div className="st-admin-order-create-v2__step-head">
              <div>
                <strong>
                  Review order
                </strong>

                <span>
                  Confirm the customer,
                  products and order
                  details before the
                  order is created.
                </span>
              </div>

              <CheckCircle2
                aria-hidden="true"
              />
            </div>

            <div className="st-admin-order-create-v2__review-grid">
              <section>
                <header>
                  <strong>
                    Customer
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      moveToStep(1)
                    }
                  >
                    Edit
                  </button>
                </header>

                <div className="st-admin-order-create-v2__review-customer">
                  <span className="st-admin-order-create-v2__customer-avatar">
                    <UserRound
                      aria-hidden="true"
                    />
                  </span>

                  <div className="st-admin-order-create-v3__review-customer-copy">
                    <strong>
                      {
                        reviewCustomerName
                      }
                    </strong>

                    <span className="st-admin-order-create-v3__review-customer-email">
                      {reviewEmail}
                    </span>

                    <span className="st-admin-order-create-v3__review-customer-phone">
                      {reviewPhone}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <header>
                  <strong>
                    Order details
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      moveToStep(3)
                    }
                  >
                    Edit
                  </button>
                </header>

                <dl className="st-admin-order-create-v2__review-list">
                  <div>
                    <dt>
                      Fulfilment
                    </dt>

                    <dd>
                      {fulfillment ===
                      "pickup"
                        ? "Pick up in store"
                        : "Delivery"}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Payment
                    </dt>

                    <dd>
                      {paymentStatus ===
                      "paid"
                        ? "Paid"
                        : "Unpaid"}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Gift wrap
                    </dt>

                    <dd>
                      {giftWrapping
                        ? "Yes"
                        : "No"}
                    </dd>
                  </div>

                  {couponCode.trim() ? (
                    <div>
                      <dt>
                        Coupon
                      </dt>

                      <dd>
                        {
                          couponCode
                        }
                      </dd>
                    </div>
                  ) : null}

                  <div className="is-address">
                    <dt>
                      {fulfillment ===
                      "pickup"
                        ? "Collection"
                        : "Address"}
                    </dt>

                    <dd>
                      {
                        reviewAddress
                      }
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="is-products">
                <header>
                  <strong>
                    Products
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      moveToStep(2)
                    }
                  >
                    Edit
                  </button>
                </header>

                <div className="st-admin-order-create-v2__review-products">
                  {cartLines.map(
                    (line) => (
                      <div
                        key={
                          line.variant
                            .id
                        }
                      >
                        <span className="st-admin-order-create-v2__product-mark">
                          <Package
                            aria-hidden="true"
                          />
                        </span>

                        <div>
                          <strong>
                            {
                              line.productName
                            }
                          </strong>

                          <span>
                            {
                              line.variant
                                .name
                            }
                          </span>

                          <small>
                            Qty{" "}
                            {
                              line.quantity
                            }
                          </small>
                        </div>

                        <strong>
                          {money(
                            variantPrice(
                              line.variant,
                            ) *
                              line.quantity,
                          )}
                        </strong>
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section className="is-total">
                <header>
                  <strong>
                    Summary
                  </strong>
                </header>

                <dl className="st-admin-order-create-v2__review-list">
                  <div>
                    <dt>
                      Items
                    </dt>

                    <dd>
                      {itemCount}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Products subtotal
                    </dt>

                    <dd>
                      {money(
                        subtotal,
                      )}
                    </dd>
                  </div>

                  <div className="is-final">
                    <dt>
                      Current total
                    </dt>

                    <dd>
                      {money(
                        subtotal,
                      )}
                    </dd>
                  </div>
                </dl>

                <p>
                  Delivery fees and
                  coupon discounts will
                  be calculated
                  authoritatively when
                  the order is created.
                </p>
              </section>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="st-admin-order-create-v2__footer">
        <div>
          {step === 1 ? (
            <Link
              href="/admin/orders"
              className="st-admin-order-create-v2__cancel"
            >
              Cancel
            </Link>
          ) : (
            <button
              type="button"
              className="st-admin-order-create-v2__back-button"
              onClick={
                previousStep
              }
            >
              <ArrowLeft
                aria-hidden="true"
              />

              <span>
                Back
              </span>
            </button>
          )}

          {formError ? (
            <div
              className="st-admin-order-create-v2__error"
              role="alert"
            >
              <span aria-hidden="true" />

              <strong>
                {formError}
              </strong>
            </div>
          ) : null}
        </div>

        {step < 4 ? (
          <button
            type="button"
            className="st-admin-order-create-v2__next"
            onClick={nextStep}
          >
            <span>
              {step === 3
                ? "Review order"
                : "Next"}
            </span>

            <ArrowRight
              aria-hidden="true"
            />
          </button>
        ) : (
          <button
            type="button"
            className="st-admin-order-create-v2__create"
            disabled={isSubmitting}
            onClick={submitOrder}
          >
            {isSubmitting ? (
              <Loader2
                aria-hidden="true"
                className="is-loading"
              />
            ) : (
              <Check
                aria-hidden="true"
              />
            )}

            <span>
              {isSubmitting
                ? "Creating order"
                : "Create order"}
            </span>
          </button>
        )}
      </footer>
    </section>
  );
}
