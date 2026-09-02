"use server";

import { processStockNotificationsForVariants } from "@/lib/email/process-stock-notifications";
import { sendOrderConfirmationEmail } from "@/lib/email/send-order-confirmation";
import { getPublicStoreSettings } from "@/lib/store-settings";
import { createClient } from "@/lib/supabase/server";

type CustomerDetails = {
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
  deliveryNotes: string;
};

type CustomerAccountDetails = {
  signedIn?: boolean;
  email?: string;
  savedAddressId?: string | null;
};

type PlaceOrderItem = {
  variantId: string;
  quantity: number;
  name?: string;
  size?: string;
  imageUrl?: string | null;
  unitPrice?: number;
};

type FulfillmentMethod = "delivery" | "pickup";
type PaymentMethod = "cash_on_delivery";

type PlaceOrderInput = {
  customer: CustomerDetails;
  fulfillmentMethod?: FulfillmentMethod;
  customerAccount?: CustomerAccountDetails;
  couponCode?: string | null;
  paymentMethod?: PaymentMethod;
  items: PlaceOrderItem[];
};

type PlaceOrderResult = {
  success: boolean;
  order_id?: string;
  order_number?: string;
  subtotal?: number;
  discount_amount?: number;
  delivery_fee?: number;
  total?: number;
  coupon_code?: string | null;
  confirmation_email_sent?: boolean;
  confirmation_email_message?: string;
  message?: string;
};

type SavedAddressRow = {
  id: string;
  user_id: string;
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

function textIsPresent(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function emailIsValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function customerIsValid(
  customer: CustomerDetails,
  fulfillmentMethod: FulfillmentMethod,
) {
  const required = [
    customer.firstName,
    customer.lastName,
    customer.email,
    customer.phone,
  ];

  if (fulfillmentMethod === "delivery") {
    required.push(customer.city, customer.address);
  }

  return required.every(textIsPresent);
}

function buildFloorValue(address: SavedAddressRow) {
  return [
    address.floor ? `Floor ${address.floor}` : "",
    address.apartment ? `Apartment ${address.apartment}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function buildDeliveryNotes(address: SavedAddressRow) {
  return [
    address.landmark ? `Landmark: ${address.landmark}` : "",
    address.delivery_instructions ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeCustomer(customer: CustomerDetails): CustomerDetails {
  return {
    firstName: cleanText(customer.firstName),

    lastName: cleanText(customer.lastName),

    email: cleanText(customer.email).toLowerCase(),

    phone: cleanText(customer.phone),

    country: "Lebanon",

    city: cleanText(customer.city),

    area: cleanText(customer.area),

    address: cleanText(customer.address),

    building: cleanText(customer.building),

    floor: cleanText(customer.floor),

    deliveryNotes: cleanText(customer.deliveryNotes),
  };
}

function applySavedAddress(
  customer: CustomerDetails,
  savedAddress: SavedAddressRow,
): CustomerDetails {
  return {
    ...customer,

    country: "Lebanon",

    city: cleanText(savedAddress.city),

    area: cleanText(savedAddress.area),

    address: cleanText(savedAddress.address_line),

    building: cleanText(savedAddress.building),

    floor: buildFloorValue(savedAddress),

    deliveryNotes: buildDeliveryNotes(savedAddress),
  };
}

export async function submitOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const storeSettings = await getPublicStoreSettings();

  if (!input?.customer) {
    return {
      success: false,
      message: "Customer information is missing.",
    };
  }

  if (!storeSettings.codEnabled) {
    return {
      success: false,
      message: "Cash on Delivery is currently unavailable.",
    };
  }

  const fulfillmentMethod: FulfillmentMethod =
    input.fulfillmentMethod === "pickup" ? "pickup" : "delivery";

  if (input.paymentMethod !== "cash_on_delivery") {
    return {
      success: false,
      message:
        fulfillmentMethod === "pickup"
          ? "Please select Cash at Pickup before submitting your order."
          : "Please select Cash on Delivery before submitting your order.",
    };
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return {
      success: false,
      message: "Your cart is empty.",
    };
  }

  const invalidItem = input.items.some(
    (item) =>
      !textIsPresent(item.variantId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1,
  );

  if (invalidItem) {
    return {
      success: false,
      message: "One or more cart items are invalid.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const claimedSignedIn = input.customerAccount?.signedIn === true;

  const savedAddressId = textIsPresent(input.customerAccount?.savedAddressId)
    ? String(input.customerAccount?.savedAddressId).trim()
    : null;

  if (claimedSignedIn && (userError || !user)) {
    return {
      success: false,
      message:
        "Your customer session has expired. Please sign in again before placing the order.",
    };
  }

  if (savedAddressId && !user) {
    return {
      success: false,
      message: "Please sign in again to use this saved address.",
    };
  }

  let verifiedCustomer = {
    ...normalizeCustomer(input.customer),
    country: storeSettings.deliveryCountry,
  };

  if (user) {
    if (!user.email) {
      return {
        success: false,
        message:
          "The signed-in customer account does not have a valid email address.",
      };
    }

    verifiedCustomer = {
      ...verifiedCustomer,

      email: user.email.trim().toLowerCase(),
    };

    if (savedAddressId) {
      const { data: savedAddressData, error: savedAddressError } =
        await supabase
          .from("customer_addresses")
          .select(
            `
            id,
            user_id,
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
          .eq("id", savedAddressId)
          .eq("user_id", user.id)
          .maybeSingle();

      if (savedAddressError) {
        return {
          success: false,
          message: "The selected saved address could not be verified.",
        };
      }

      if (!savedAddressData) {
        return {
          success: false,
          message:
            "The selected saved address does not exist or does not belong to your account.",
        };
      }

      verifiedCustomer = {
        ...applySavedAddress(
          verifiedCustomer,
          savedAddressData as SavedAddressRow,
        ),
        country: storeSettings.deliveryCountry,
      };
    }
  }

  if (fulfillmentMethod === "pickup") {
    verifiedCustomer = {
      ...verifiedCustomer,
      country: storeSettings.deliveryCountry,
      city: verifiedCustomer.city || "Store pickup",
      area: verifiedCustomer.area || "Stereophonie Store",
      address: verifiedCustomer.address || "Pick up in store",
      building: "",
      floor: "",
      deliveryNotes: verifiedCustomer.deliveryNotes,
    };
  }

  if (!emailIsValid(verifiedCustomer.email)) {
    return {
      success: false,
      message: "A valid customer email address is required.",
    };
  }

  if (!customerIsValid(verifiedCustomer, fulfillmentMethod)) {
    return {
      success: false,
      message: "Some required customer or delivery information is missing.",
    };
  }

  const { data, error } = await supabase.rpc("place_order", {
    coupon_code: cleanText(input.couponCode) || null,

    customer_data: verifiedCustomer,

    cart_items: input.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  });

  if (error) {
    return {
      success: false,
      message: error.message || "The order could not be submitted.",
    };
  }

  const result = data as PlaceOrderResult | null;

  if (!result?.success || !result.order_id || !result.order_number) {
    return {
      success: false,
      message: result?.message || "The order could not be confirmed.",
    };
  }

  const { error: fulfillmentError } = await supabase.rpc(
    "set_order_fulfillment",
    {
      target_order_id: result.order_id,
      requested_fulfillment_method: fulfillmentMethod,
    },
  );

  if (fulfillmentError) {
    console.error(
      `Order fulfillment could not be finalized for ${result.order_number}:`,
      fulfillmentError,
    );

    return {
      success: false,
      message:
        "Your order was created, but its fulfillment method could not be confirmed.",
    };
  }

  const { data: authoritativeOrder, error: authoritativeOrderError } =
    await supabase
      .from("orders")
      .select(
        "order_number, subtotal, discount_amount, delivery_fee, total, coupon_code",
      )
      .eq("id", result.order_id)
      .single();

  if (authoritativeOrderError || !authoritativeOrder) {
    console.error(
      "Authoritative order totals could not be reloaded:",
      authoritativeOrderError,
    );

    return {
      success: false,
      message:
        "Your order was created, but its final totals could not be verified.",
    };
  }

  const subtotal = Number(authoritativeOrder.subtotal ?? 0);

  const discountAmount = Number(authoritativeOrder.discount_amount ?? 0);

  const deliveryFee = Number(authoritativeOrder.delivery_fee ?? 0);

  const total = Number(authoritativeOrder.total ?? 0);

  const authoritativeOrderNumber = String(
    authoritativeOrder.order_number ?? result.order_number,
  ).trim();

  const emailResult = await sendOrderConfirmationEmail({
    orderNumber: authoritativeOrderNumber,

    fulfillmentMethod,

    customer: verifiedCustomer,

    subtotal,

    discountAmount,

    deliveryFee,

    total,

    couponCode: cleanText(authoritativeOrder.coupon_code) || null,

    items: input.items.map((item) => ({
      name: cleanText(item.name) || "Product",

      size: cleanText(item.size),

      quantity: item.quantity,

      imageUrl: cleanText(item.imageUrl) || null,

      unitPrice:
        typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice)
          ? Math.max(0, item.unitPrice)
          : 0,
    })),
  });

  if (!emailResult.success) {
    console.error(
      `Order confirmation email failed for order ${authoritativeOrderNumber}:`,
      emailResult.message,
    );
  }

  try {
    const stockNotificationResults = await processStockNotificationsForVariants(
      input.items.map((item) => item.variantId),
    );

    const stockNotificationErrors = stockNotificationResults.flatMap(
      (notificationResult) => notificationResult.errors,
    );

    if (stockNotificationErrors.length > 0) {
      console.error(
        `Some stock notifications failed after order ${authoritativeOrderNumber}:`,
        stockNotificationErrors,
      );
    }
  } catch (error) {
    console.error(
      `Stock notifications could not be processed after order ${authoritativeOrderNumber}:`,
      error,
    );
  }
  return {
    success: true,

    order_id: result.order_id,

    order_number: authoritativeOrderNumber,

    subtotal,

    discount_amount: discountAmount,

    delivery_fee: deliveryFee,

    total,

    coupon_code: cleanText(authoritativeOrder.coupon_code) || null,

    confirmation_email_sent: emailResult.success,

    confirmation_email_message: emailResult.success
      ? undefined
      : emailResult.message,
  };
}
