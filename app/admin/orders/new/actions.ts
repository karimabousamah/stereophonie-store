"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { processStockNotificationsForVariants } from "@/lib/email/process-stock-notifications";
import { sendAdminOrderNotificationEmail } from "@/lib/email/send-admin-order-notification";
import { sendOrderConfirmationEmail } from "@/lib/email/send-order-confirmation";
import { getPublicStoreSettings } from "@/lib/store-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { storefrontPrimaryImageForVariant } from "@/lib/storefront-product-media";

type CustomerMode =
  | "existing"
  | "guest";

type FulfillmentMethod =
  | "pickup"
  | "delivery";

type PaymentStatus =
  | "unpaid"
  | "paid";

type ManualAddress = {
  city: string;
  area: string;
  addressLine: string;
  building: string;
  floor: string;
  apartment: string;
  notes: string;
};

type GuestCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type AdminCreateOrderItem = {
  variantId: string;
  quantity: number;
};

export type AdminCreateOrderInput = {
  customerMode: CustomerMode;

  customerUserId?: string | null;

  guestCustomer?: GuestCustomer;

  fulfillmentMethod: FulfillmentMethod;

  paymentStatus: PaymentStatus;

  giftWrappingRequested: boolean;

  couponCode?: string | null;

  savedAddressId?: string | null;

  manualAddress?: ManualAddress;

  items: AdminCreateOrderItem[];
};

export type AdminCreateOrderResult =
  | {
      success: true;
      order_id: string;
      order_number: string;
      confirmation_email_sent: boolean;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

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

type AdminOrderRpcResult = {
  success?: boolean;
  order_id?: string;
  order_number?: string;
  message?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RECEIPT_PATTERN =
  /^[a-f0-9]{64}$/i;

function clean(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function validEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim(),
  );
}

function metadataText(
  metadata: Record<
    string,
    unknown
  >,
  key: string,
) {
  return clean(
    metadata[key],
  );
}

function buildFloor(
  floor: string,
  apartment: string,
) {
  return [
    floor
      ? `Floor ${floor}`
      : "",
    apartment
      ? `Apartment ${apartment}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");
}

async function ensureReceiptToken(
  admin: ReturnType<
    typeof createAdminClient
  >,
  orderId: string,
  existingToken: unknown,
) {
  const existing =
    clean(existingToken);

  if (
    RECEIPT_PATTERN.test(
      existing,
    )
  ) {
    return existing;
  }

  const token =
    randomBytes(32).toString(
      "hex",
    );

  const update =
    existing
      ? admin
          .from("orders")
          .update({
            receipt_token:
              token,
          })
          .eq("id", orderId)
          .eq(
            "receipt_token",
            existing,
          )
      : admin
          .from("orders")
          .update({
            receipt_token:
              token,
          })
          .eq("id", orderId)
          .is(
            "receipt_token",
            null,
          );

  const {
    data,
    error,
  } = await update
    .select("receipt_token")
    .maybeSingle();

  if (error) {
    console.error(
      "Admin-created order receipt token could not be issued:",
      error.message,
    );
  }

  const issued =
    clean(
      data?.receipt_token,
    );

  if (
    RECEIPT_PATTERN.test(
      issued,
    )
  ) {
    return issued;
  }

  const {
    data: latest,
  } = await admin
    .from("orders")
    .select("receipt_token")
    .eq("id", orderId)
    .maybeSingle();

  const recovered =
    clean(
      latest?.receipt_token,
    );

  return RECEIPT_PATTERN.test(
    recovered,
  )
    ? recovered
    : null;
}

async function getAuthorizedAdministrator() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const {
    data: administrator,
    error,
  } = await supabase
    .from("admin_users")
    .select(
      "user_id, is_active",
    )
    .eq("user_id", userId)
    .single();

  if (
    error ||
    !administrator?.is_active
  ) {
    return null;
  }

  return {
    userId,
    admin:
      createAdminClient(),
  };
}

async function getExistingCustomer(
  admin: ReturnType<
    typeof createAdminClient
  >,
  userId: string,
): Promise<
  CustomerDetails | null
> {
  const {
    data: authResult,
    error: authError,
  } =
    await admin.auth.admin.getUserById(
      userId,
    );

  if (
    authError ||
    !authResult?.user
  ) {
    return null;
  }

  const user =
    authResult.user;

  const {
    data: profile,
  } = await admin
    .from(
      "customer_profiles",
    )
    .select(
      `
        first_name,
        last_name,
        phone_country_code,
        phone_number
      `,
    )
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle();

  const metadata =
    (user.user_metadata ??
      {}) as Record<
      string,
      unknown
    >;

  const firstName =
    clean(
      profile?.first_name,
    ) ||
    metadataText(
      metadata,
      "first_name",
    );

  const lastName =
    clean(
      profile?.last_name,
    ) ||
    metadataText(
      metadata,
      "last_name",
    );

  const email =
    clean(
      user.email,
    ).toLowerCase();

  const phone =
    [
      clean(
        profile?.phone_country_code,
      ),
      clean(
        profile?.phone_number,
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    metadataText(
      metadata,
      "phone",
    );

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone
  ) {
    return null;
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    country:
      "Lebanon",
    city: "",
    area: "",
    address: "",
    building: "",
    floor: "",
    deliveryNotes: "",
  };
}

function getGuestCustomer(
  input: AdminCreateOrderInput,
): CustomerDetails | null {
  const guest =
    input.guestCustomer;

  if (!guest) {
    return null;
  }

  const firstName =
    clean(
      guest.firstName,
    );

  const lastName =
    clean(
      guest.lastName,
    );

  const email =
    clean(
      guest.email,
    ).toLowerCase();

  const phone =
    clean(
      guest.phone,
    );

  if (
    !firstName ||
    !lastName ||
    !validEmail(email) ||
    !phone
  ) {
    return null;
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    country:
      "Lebanon",
    city: "",
    area: "",
    address: "",
    building: "",
    floor: "",
    deliveryNotes: "",
  };
}

async function applyDeliveryAddress(
  admin: ReturnType<
    typeof createAdminClient
  >,
  customer: CustomerDetails,
  input: AdminCreateOrderInput,
) {
  if (
    input.fulfillmentMethod ===
    "pickup"
  ) {
    return customer;
  }

  if (
    input.customerMode ===
      "existing" &&
    input.customerUserId &&
    input.savedAddressId
  ) {
    const {
      data: address,
      error,
    } = await admin
      .from(
        "customer_addresses",
      )
      .select(
        `
          id,
          user_id,
          country,
          city,
          area,
          address_line,
          building,
          floor,
          apartment,
          landmark,
          delivery_instructions
        `,
      )
      .eq(
        "id",
        input.savedAddressId,
      )
      .eq(
        "user_id",
        input.customerUserId,
      )
      .maybeSingle();

    if (
      !error &&
      address
    ) {
      return {
        ...customer,

        country:
          clean(
            address.country,
          ) ||
          "Lebanon",

        city:
          clean(
            address.city,
          ),

        area:
          clean(
            address.area,
          ),

        address:
          clean(
            address.address_line,
          ),

        building:
          clean(
            address.building,
          ),

        floor:
          buildFloor(
            clean(
              address.floor,
            ),
            clean(
              address.apartment,
            ),
          ),

        deliveryNotes:
          [
            clean(
              address.landmark,
            )
              ? `Landmark: ${clean(
                  address.landmark,
                )}`
              : "",

            clean(
              address.delivery_instructions,
            ),
          ]
            .filter(Boolean)
            .join("\n"),
      };
    }
  }

  const manual =
    input.manualAddress;

  if (!manual) {
    return null;
  }

  const city =
    clean(
      manual.city,
    );

  const area =
    clean(
      manual.area,
    );

  const addressLine =
    clean(
      manual.addressLine,
    );

  if (
    !city ||
    !area ||
    !addressLine
  ) {
    return null;
  }

  return {
    ...customer,

    country:
      "Lebanon",

    city,

    area,

    address:
      addressLine,

    building:
      clean(
        manual.building,
      ),

    floor:
      buildFloor(
        clean(
          manual.floor,
        ),
        clean(
          manual.apartment,
        ),
      ),

    deliveryNotes:
      clean(
        manual.notes,
      ),
  };
}

export async function createAdminOrder(
  input: AdminCreateOrderInput,
): Promise<AdminCreateOrderResult> {
  try {
    const authorization =
      await getAuthorizedAdministrator();

    if (!authorization) {
      return {
        success: false,
        message:
          "Your administrator session has expired. Sign in again and retry.",
      };
    }

    const {
      userId,
      admin,
    } = authorization;

    if (
      input.customerMode !==
        "existing" &&
      input.customerMode !==
        "guest"
    ) {
      return {
        success: false,
        message:
          "Choose a valid customer type.",
      };
    }

    if (
      input.fulfillmentMethod !==
        "pickup" &&
      input.fulfillmentMethod !==
        "delivery"
    ) {
      return {
        success: false,
        message:
          "Choose a valid fulfilment method.",
      };
    }

    if (
      input.paymentStatus !==
        "unpaid" &&
      input.paymentStatus !==
        "paid"
    ) {
      return {
        success: false,
        message:
          "Choose a valid payment status.",
      };
    }

    const items =
      Array.isArray(
        input.items,
      )
        ? input.items
            .map(
              (item) => ({
                variantId:
                  clean(
                    item.variantId,
                  ),

                quantity:
                  Number(
                    item.quantity,
                  ),
              }),
            )
            .filter(
              (item) =>
                UUID_PATTERN.test(
                  item.variantId,
                ) &&
                Number.isInteger(
                  item.quantity,
                ) &&
                item.quantity >
                  0 &&
                item.quantity <=
                  99,
            )
        : [];

    if (
      items.length === 0 ||
      items.length !==
        input.items.length
    ) {
      return {
        success: false,
        message:
          "Review the selected products and quantities before creating the order.",
      };
    }

    let customer:
      CustomerDetails | null =
      null;

    let targetCustomerUserId:
      string | null =
      null;

    if (
      input.customerMode ===
      "existing"
    ) {
      const customerUserId =
        clean(
          input.customerUserId,
        );

      if (
        !UUID_PATTERN.test(
          customerUserId,
        )
      ) {
        return {
          success: false,
          message:
            "Choose a registered customer before creating the order.",
        };
      }

      customer =
        await getExistingCustomer(
          admin,
          customerUserId,
        );

      if (!customer) {
        return {
          success: false,
          message:
            "The selected customer account is incomplete or no longer available.",
        };
      }

      targetCustomerUserId =
        customerUserId;
    } else {
      customer =
        getGuestCustomer(
          input,
        );

      if (!customer) {
        return {
          success: false,
          message:
            "Complete the guest customer's name, email and phone number.",
        };
      }
    }

    customer =
      await applyDeliveryAddress(
        admin,
        customer,
        input,
      );

    if (!customer) {
      return {
        success: false,
        message:
          "Complete the delivery address before creating the order.",
      };
    }

    if (
      input.fulfillmentMethod ===
        "delivery" &&
      (
        !customer.city ||
        !customer.area ||
        !customer.address
      )
    ) {
      return {
        success: false,
        message:
          "Complete the delivery city, area and street address.",
      };
    }

    const couponCode =
      clean(
        input.couponCode,
      ).toUpperCase();

    const {
      data: rpcData,
      error: rpcError,
    } = await admin.rpc(
      "admin_place_order",
      {
        p_creating_admin_user_id:
          userId,

        p_customer_data:
          customer,

        p_cart_items:
          items,

        p_coupon_code:
          couponCode ||
          null,

        p_target_customer_user_id:
          targetCustomerUserId,

        p_requested_fulfillment_method:
          input.fulfillmentMethod,

        p_requested_payment_status:
          input.paymentStatus,

        p_requested_gift_wrapping:
          input.giftWrappingRequested ===
          true,

        p_source_order_id:
          null,
      },
    );

    if (rpcError) {
      const lower =
        rpcError.message
          .toLowerCase();

      return {
        success: false,

        message:
          lower.includes(
            "admin_place_order",
          ) ||
          lower.includes(
            "function",
          )
            ? "The Create Order database update has not been applied yet."
            : rpcError.message ||
              "The order could not be created.",
      };
    }

    const result =
      rpcData as
        | AdminOrderRpcResult
        | null;

    if (
      !result?.success ||
      !result.order_id ||
      !result.order_number
    ) {
      return {
        success: false,
        message:
          result?.message ||
          "The order could not be created.",
      };
    }

    const orderId =
      result.order_id;

    const {
      data:
        authoritativeOrder,
      error:
        authoritativeOrderError,
    } = await admin
      .from("orders")
      .select(
        `
          order_number,
          subtotal,
          discount_amount,
          delivery_fee,
          total,
          coupon_code,
          created_at,
          receipt_token
        `,
      )
      .eq("id", orderId)
      .single();

    if (
      authoritativeOrderError ||
      !authoritativeOrder
    ) {
      return {
        success: false,
        message:
          `Order ${result.order_number} was created, but its final totals could not be verified. Do not create a duplicate order.`,
      };
    }

    const receiptToken =
      await ensureReceiptToken(
        admin,
        orderId,
        authoritativeOrder.receipt_token,
      );

    if (receiptToken) {
      authoritativeOrder.receipt_token =
        receiptToken;
    }

    const subtotal =
      Number(
        authoritativeOrder.subtotal ??
          0,
      );

    const discountAmount =
      Number(
        authoritativeOrder.discount_amount ??
          0,
      );

    let deliveryFee =
      Number(
        authoritativeOrder.delivery_fee ??
          0,
      );

    let total =
      Number(
        authoritativeOrder.total ??
          0,
      );

    const orderNumber =
      clean(
        authoritativeOrder.order_number,
      ) ||
      result.order_number;

    try {
      const storeSettings =
        await getPublicStoreSettings();

      const threshold =
        Number(
          storeSettings.freeDeliveryThreshold ??
            0,
        );

      const qualifies =
        input.fulfillmentMethod ===
          "delivery" &&
        Number.isFinite(
          threshold,
        ) &&
        threshold > 0 &&
        subtotal >= threshold;

      if (
        qualifies &&
        deliveryFee !== 0
      ) {
        const correctedTotal =
          Math.max(
            0,
            subtotal -
              discountAmount,
          );

        const {
          error:
            deliveryUpdateError,
        } = await admin
          .from("orders")
          .update({
            delivery_fee: 0,
            total:
              correctedTotal,
          })
          .eq("id", orderId);

        if (
          deliveryUpdateError
        ) {
          console.error(
            `Admin-created order free delivery correction failed for ${orderNumber}:`,
            deliveryUpdateError,
          );
        } else {
          deliveryFee = 0;
          total =
            correctedTotal;
        }
      }
    } catch (error) {
      console.error(
        `Store settings could not be checked for admin-created order ${orderNumber}:`,
        error,
      );
    }

    const {
      data: orderItems,
      error:
        orderItemsError,
    } = await admin
      .from("order_items")
      .select(
        `
          variant_id,
          product_name,
          product_image_url,
          size,
          quantity,
          unit_price,
          line_total
        `,
      )
      .eq(
        "order_id",
        orderId,
      );

    if (orderItemsError) {
      console.error(
        `Admin-created order items could not be reloaded for ${orderNumber}:`,
        orderItemsError,
      );
    }

    const variantIds =
      Array.from(
        new Set(
          (
            orderItems ??
            []
          )
            .map(
              (item) =>
                clean(
                  item.variant_id,
                ),
            )
            .filter(Boolean),
        ),
      );

    const skuByVariantId =
      new Map<
        string,
        string
      >();

    const imageByVariantId =
      new Map<
        string,
        string | null
      >();

    if (
      variantIds.length >
      0
    ) {
      const {
        data: variants,
        error:
          variantsError,
      } = await admin
        .from(
          "product_variants",
        )
        .select(
          `
            id,
            sku,
            product_id,
            products (
              product_images (
                id,
                image_url,
                position,
                is_primary,
                variant_id,
                variant_position,
                is_variant_primary,
                product_image_variants (
                  variant_id,
                  position,
                  is_primary
                )
              )
            )
          `,
        )
        .in(
          "id",
          variantIds,
        );

      if (
        variantsError
      ) {
        console.error(
          `Admin-created order configuration media lookup failed for ${orderNumber}:`,
          variantsError,
        );
      } else {
        for (
          const variant of
            variants ?? []
        ) {
          const variantId =
            clean(
              variant.id,
            );

          if (!variantId) {
            continue;
          }

          skuByVariantId.set(
            variantId,
            clean(
              variant.sku,
            ),
          );

          const relation =
            Array.isArray(
              variant.products,
            )
              ? variant
                  .products[0]
              : variant.products;

          const images =
            relation?.product_images ??
            [];

          const primary =
            storefrontPrimaryImageForVariant(
              images,
              variantId,
            );

          const imageUrl =
            clean(
              primary?.image_url,
            ) ||
            null;

          imageByVariantId.set(
            variantId,
            imageUrl,
          );

          if (imageUrl) {
            const {
              error:
                imageUpdateError,
            } = await admin
              .from(
                "order_items",
              )
              .update({
                product_image_url:
                  imageUrl,
              })
              .eq(
                "order_id",
                orderId,
              )
              .eq(
                "variant_id",
                variantId,
              );

            if (
              imageUpdateError
            ) {
              console.error(
                `Admin-created order image snapshot failed for ${variantId}:`,
                imageUpdateError,
              );
            }
          }
        }
      }
    }

    const emailItems =
      (
        orderItems ??
        []
      ).map(
        (item) => {
          const variantId =
            clean(
              item.variant_id,
            );

          return {
            name:
              clean(
                item.product_name,
              ) ||
              "Product",

            size:
              clean(
                item.size,
              ),

            sku:
              skuByVariantId.get(
                variantId,
              ) ||
              null,

            quantity:
              Number(
                item.quantity ??
                  0,
              ),

            imageUrl:
              imageByVariantId.get(
                variantId,
              ) ??
              (
                clean(
                  item.product_image_url,
                ) ||
                null
              ),

            unitPrice:
              Number(
                item.unit_price ??
                  0,
              ),
          };
        },
      );

    let confirmationEmailSent =
      false;

    try {
      const emailResult =
        await sendOrderConfirmationEmail(
          {
            orderNumber,

            fulfillmentMethod:
              input.fulfillmentMethod,

            customer,

            items:
              emailItems,

            subtotal,

            discountAmount,

            deliveryFee,

            total,

            couponCode:
              clean(
                authoritativeOrder.coupon_code,
              ) ||
              null,

            createdAt:
              clean(
                authoritativeOrder.created_at,
              ) ||
              null,

            paymentMethod:
              input.paymentStatus ===
              "unpaid"
                ? "cash_on_delivery"
                : null,

            receiptToken:
              clean(
                authoritativeOrder.receipt_token,
              ) ||
              null,
          },
        );

      confirmationEmailSent =
        emailResult.success;

      if (
        !emailResult.success
      ) {
        console.error(
          `Admin-created order confirmation email failed for ${orderNumber}:`,
          emailResult.message,
        );
      }
    } catch (error) {
      console.error(
        `Admin-created order confirmation email threw for ${orderNumber}:`,
        error,
      );
    }

    try {
      const adminEmailResult =
        await sendAdminOrderNotificationEmail(
          {
            orderId,

            orderNumber,

            fulfillmentMethod:
              input.fulfillmentMethod,

            customer,

            items:
              emailItems.map(
                (item) => ({
                  name:
                    item.name,

                  size:
                    item.size,

                  sku:
                    item.sku,

                  quantity:
                    item.quantity,

                  unitPrice:
                    item.unitPrice,
                }),
              ),

            subtotal,

            discountAmount,

            deliveryFee,

            total,

            couponCode:
              clean(
                authoritativeOrder.coupon_code,
              ) ||
              null,

            createdAt:
              clean(
                authoritativeOrder.created_at,
              ) ||
              null,

            paymentMethod:
              input.paymentStatus ===
              "unpaid"
                ? "cash_on_delivery"
                : null,
          },
        );

      if (
        !adminEmailResult.success
      ) {
        console.error(
          `Admin notification failed for admin-created order ${orderNumber}:`,
          adminEmailResult.message,
        );
      }
    } catch (error) {
      console.error(
        `Admin notification threw for admin-created order ${orderNumber}:`,
        error,
      );
    }

    try {
      await processStockNotificationsForVariants(
        variantIds,
      );
    } catch (error) {
      console.error(
        `Stock notifications could not be processed after admin-created order ${orderNumber}:`,
        error,
      );
    }

    revalidatePath(
      "/admin/orders",
    );

    revalidatePath(
      `/admin/orders/${orderId}`,
    );

    revalidatePath(
      "/admin/products",
    );

    revalidatePath(
      "/admin/best-selling",
    );

    revalidatePath(
      "/admin",
    );

    revalidatePath(
      "/account",
    );

    revalidatePath(
      "/track-order",
    );

    return {
      success: true,

      order_id:
        orderId,

      order_number:
        orderNumber,

      confirmation_email_sent:
        confirmationEmailSent,

      message:
        confirmationEmailSent
          ? `Order ${orderNumber} created successfully.`
          : `Order ${orderNumber} was created, but the confirmation email could not be sent.`,
    };
  } catch (error) {
    console.error(
      "Admin Create Order failed:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof
        Error
          ? error.message
          : "The order could not be created.",
    };
  }
}
