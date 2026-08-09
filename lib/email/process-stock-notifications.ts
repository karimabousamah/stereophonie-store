import "server-only";

import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";

type StockState = "available" | "low_stock" | "out_of_stock" | "coming_soon";

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
};

type ProductImageRow = {
  image_url: string | null;
};

type ProductVariantRow = {
  id: string;
  size: string;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";
};

type WishlistItemRow = {
  id: string;
  email: string;
  last_low_stock_notified_version: number | string;
  last_out_of_stock_notified_version: number | string;
};

type StockAlertRow = {
  id: string;
  email: string;
  variant_id: string | null;
};

type StateRefreshResult = {
  success?: boolean;
  initialized?: boolean;
  changed?: boolean;
  previous_state?: StockState | null;
  current_state?: StockState;
  state_version?: number | string;
};

type NotificationEmailInput = {
  to: string;
  subject: string;
  eyebrow: string;
  title: string;
  message: string;
  productName: string;
  productImageUrl: string | null;
  priceLabel: string | null;
  optionLabel?: string | null;
  buttonLabel: string;
  buttonUrl: string;
  unsubscribeUrl?: string | null;
  accent: "warning" | "danger" | "success";
};

export type StockNotificationResult = {
  success: boolean;
  productId: string;
  previousState: StockState | null;
  currentState: StockState | null;
  stateChanged: boolean;
  stateVersion: number;
  wishlistEmailsSent: number;
  stockAlertEmailsSent: number;
  errors: string[];
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function emailIsValid(value: string) {
  return (
    value.length >= 5 &&
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    "http://localhost:3000";

  return configuredUrl.trim().replace(/\/+$/, "");
}

function getProductUrl(product: ProductRow, search = "") {
  const siteUrl = getSiteUrl();

  const slug = cleanText(product.slug);

  const path = slug ? `/shop/${encodeURIComponent(slug)}` : "/shop";

  return `${siteUrl}${path}${search}`;
}

function variantIsPurchasable(variant: ProductVariantRow) {
  return (
    variant.stock_quantity > 0 &&
    (variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock")
  );
}

function getVariantPrice(variant: ProductVariantRow) {
  const salePrice = Number(variant.sale_price);

  if (Number.isFinite(salePrice) && salePrice > 0) {
    return salePrice;
  }

  const regularPrice = Number(variant.regular_price);

  if (Number.isFinite(regularPrice) && regularPrice > 0) {
    return regularPrice;
  }

  return null;
}

function getProductPriceLabel(variants: ProductVariantRow[]) {
  const prices = variants
    .map(getVariantPrice)
    .filter((value): value is number => typeof value === "number");

  if (prices.length === 0) {
    return null;
  }

  const minimumPrice = Math.min(...prices);

  const uniquePrices = new Set(prices.map((price) => price.toFixed(2)));

  return uniquePrices.size > 1
    ? `From ${money(minimumPrice)}`
    : money(minimumPrice);
}

function getAccentStyles(accent: "warning" | "danger" | "success") {
  if (accent === "danger") {
    return {
      background: "#fff4f4",
      border: "#f0c5c5",
      text: "#9f1d1d",
    };
  }

  if (accent === "success") {
    return {
      background: "#f1fbf5",
      border: "#bde5c9",
      text: "#176536",
    };
  }

  return {
    background: "#fff9e9",
    border: "#ead69c",
    text: "#8a5d00",
  };
}

function buildNotificationEmailHtml(input: NotificationEmailInput) {
  const accent = getAccentStyles(input.accent);

  const safeProductName = escapeHtml(input.productName);

  const safeTitle = escapeHtml(input.title);

  const safeMessage = escapeHtml(input.message);

  const safeEyebrow = escapeHtml(input.eyebrow);

  const safeButtonLabel = escapeHtml(input.buttonLabel);

  const safeButtonUrl = escapeHtml(input.buttonUrl);

  const safeUnsubscribeUrl = input.unsubscribeUrl
    ? escapeHtml(input.unsubscribeUrl)
    : null;

  const safeImageUrl = input.productImageUrl
    ? escapeHtml(input.productImageUrl)
    : null;

  const safePriceLabel = input.priceLabel ? escapeHtml(input.priceLabel) : null;

  const safeOptionLabel = input.optionLabel
    ? escapeHtml(input.optionLabel)
    : null;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>${safeTitle}</title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f3f3f1;
          color:#111111;
          font-family:Arial,Helvetica,sans-serif;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width:100%;
            background:#f3f3f1;
          "
        >
          <tr>
            <td
              align="center"
              style="padding:32px 14px;"
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width:100%;
                  max-width:620px;
                  background:#ffffff;
                  border:1px solid #deded9;
                "
              >
                <tr>
                  <td
                    style="
                      padding:24px 28px;
                      background:#090909;
                      color:#ffffff;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        font-size:16px;
                        font-weight:700;
                        letter-spacing:4px;
                        text-transform:uppercase;
                      "
                    >
                      Nita Style
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:34px 28px 12px;
                    "
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          style="
                            padding:9px 12px;
                            border:1px solid ${accent.border};
                            background:${accent.background};
                            color:${accent.text};
                            font-size:10px;
                            font-weight:700;
                            letter-spacing:2px;
                            text-transform:uppercase;
                          "
                        >
                          ${safeEyebrow}
                        </td>
                      </tr>
                    </table>

                    <h1
                      style="
                        margin:24px 0 0;
                        font-size:38px;
                        line-height:1.05;
                        letter-spacing:-1.5px;
                      "
                    >
                      ${safeTitle}
                    </h1>

                    <p
                      style="
                        margin:18px 0 0;
                        color:#626262;
                        font-size:15px;
                        line-height:1.7;
                      "
                    >
                      ${safeMessage}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:22px 28px;
                    "
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        width:100%;
                        border:1px solid #e2e2dd;
                        background:#fafaf8;
                      "
                    >
                      <tr>
                        ${
                          safeImageUrl
                            ? `
                              <td
                                width="150"
                                valign="top"
                                style="
                                  width:150px;
                                  padding:0;
                                "
                              >
                                <img
                                  src="${safeImageUrl}"
                                  alt="${safeProductName}"
                                  width="150"
                                  style="
                                    display:block;
                                    width:150px;
                                    height:190px;
                                    object-fit:cover;
                                  "
                                />
                              </td>
                            `
                            : ""
                        }

                        <td
                          valign="middle"
                          style="
                            padding:22px;
                          "
                        >
                          <p
                            style="
                              margin:0;
                              color:#8a8a8a;
                              font-size:10px;
                              font-weight:700;
                              letter-spacing:2px;
                              text-transform:uppercase;
                            "
                          >
                            Saved product
                          </p>

                          <h2
                            style="
                              margin:10px 0 0;
                              font-size:21px;
                              line-height:1.25;
                            "
                          >
                            ${safeProductName}
                          </h2>

                          ${
                            safeOptionLabel
                              ? `
                                <p
                                  style="
                                    margin:11px 0 0;
                                    color:#666666;
                                    font-size:13px;
                                  "
                                >
                                  ${safeOptionLabel}
                                </p>
                              `
                              : ""
                          }

                          ${
                            safePriceLabel
                              ? `
                                <p
                                  style="
                                    margin:12px 0 0;
                                    font-size:17px;
                                    font-weight:700;
                                  "
                                >
                                  ${safePriceLabel}
                                </p>
                              `
                              : ""
                          }
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:8px 28px 38px;
                    "
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          bgcolor="#111111"
                          style="background:#111111;"
                        >
                          <a
                            href="${safeButtonUrl}"
                            style="
                              display:inline-block;
                              padding:17px 26px;
                              color:#ffffff;
                              font-size:11px;
                              font-weight:700;
                              letter-spacing:2px;
                              text-decoration:none;
                              text-transform:uppercase;
                            "
                          >
                            ${safeButtonLabel}
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p
                      style="
                        margin:22px 0 0;
                        color:#999999;
                        font-size:11px;
                        line-height:1.6;
                      "
                    >
                      Availability may change quickly and
                      products are not reserved until an
                      order is completed.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:22px 28px;
                      border-top:1px solid #e5e5e0;
                      background:#fafaf8;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        color:#999999;
                        font-size:11px;
                        line-height:1.6;
                      "
                    >
                      © Nita Style. Selected Italian women’s
                      apparel.
                    </p>

                    ${
                      safeUnsubscribeUrl
                        ? `
                          <p
                            style="
                              margin:12px 0 0;
                              color:#999999;
                              font-size:11px;
                              line-height:1.6;
                            "
                          >
                            You are receiving this email because you
                            saved a product or requested a stock update.
                            <a
                              href="${safeUnsubscribeUrl}"
                              style="
                                color:#555555;
                                text-decoration:underline;
                              "
                            >
                              Unsubscribe from stock emails
                            </a>
                          </p>
                        `
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendNotificationEmail(input: NotificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  const fromAddress = process.env.ORDER_EMAIL_FROM?.trim();

  if (!apiKey) {
    return {
      success: false,
      message: "RESEND_API_KEY is not configured.",
    };
  }

  if (!fromAddress) {
    return {
      success: false,
      message: "ORDER_EMAIL_FROM is not configured.",
    };
  }

  const recipient = normalizeEmail(input.to);

  if (!emailIsValid(recipient)) {
    return {
      success: false,
      message: "The recipient email address is invalid.",
    };
  }

  let unsubscribeUrl: string;

  try {
    const admin = createAdminClient();

    const { data: preferenceData, error: preferenceError } = await admin.rpc(
      "ensure_stock_notification_preference",
      {
        requested_email: recipient,
      },
    );

    if (preferenceError) {
      return {
        success: false,
        message:
          preferenceError.message ||
          "The notification preference could not be loaded.",
      };
    }

    const preference =
      typeof preferenceData === "object" &&
      preferenceData !== null &&
      !Array.isArray(preferenceData)
        ? preferenceData
        : null;

    const notificationsEnabled =
      preference && "notifications_enabled" in preference
        ? preference.notifications_enabled !== false
        : true;

    if (!notificationsEnabled) {
      return {
        success: true,
        skipped: true,
        message: "The recipient has unsubscribed from stock notifications.",
      };
    }

    const unsubscribeToken =
      preference &&
      "unsubscribe_token" in preference &&
      typeof preference.unsubscribe_token === "string"
        ? preference.unsubscribe_token
        : "";

    if (!unsubscribeToken) {
      return {
        success: false,
        message: "The unsubscribe link could not be generated.",
      };
    }

    unsubscribeUrl = `${getSiteUrl()}/stock-notifications/unsubscribe?token=${encodeURIComponent(
      unsubscribeToken,
    )}`;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "The notification preference could not be loaded.",
    };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [recipient],
      subject: input.subject,
      html: buildNotificationEmailHtml({
        ...input,
        unsubscribeUrl,
      }),
    });

    if (error) {
      return {
        success: false,
        message: error.message || "The email could not be sent.",
      };
    }

    return {
      success: true,
      emailId: data?.id ?? null,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "The email could not be sent.",
    };
  }
}

function groupWishlistItemsByEmail(rows: WishlistItemRow[]) {
  const grouped = new Map<string, WishlistItemRow[]>();

  for (const row of rows) {
    const email = normalizeEmail(row.email);

    if (!emailIsValid(email)) {
      continue;
    }

    const existing = grouped.get(email) ?? [];

    existing.push(row);
    grouped.set(email, existing);
  }

  return grouped;
}

function groupStockAlertsByEmail(rows: StockAlertRow[]) {
  const grouped = new Map<string, StockAlertRow[]>();

  for (const row of rows) {
    const email = normalizeEmail(row.email);

    if (!emailIsValid(email)) {
      continue;
    }

    const existing = grouped.get(email) ?? [];

    existing.push(row);
    grouped.set(email, existing);
  }

  return grouped;
}

export async function processStockNotificationsForProduct(
  productId: string,
): Promise<StockNotificationResult> {
  const errors: string[] = [];

  const admin = createAdminClient();

  const [productResult, variantsResult, imageResult] = await Promise.all([
    admin
      .from("products")
      .select("id, name, slug, status")
      .eq("id", productId)
      .maybeSingle(),

    admin
      .from("product_variants")
      .select(
        `
          id,
          size,
          regular_price,
          sale_price,
          stock_quantity,
          low_stock_threshold,
          availability_status
        `,
      )
      .eq("product_id", productId),

    admin
      .from("product_images")
      .select("image_url")
      .eq("product_id", productId)
      .order("is_primary", {
        ascending: false,
      })
      .order("position", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  if (productResult.error || !productResult.data) {
    throw new Error(
      productResult.error?.message || "The product could not be loaded.",
    );
  }

  if (variantsResult.error) {
    throw new Error(variantsResult.error.message);
  }

  const product = productResult.data as ProductRow;

  const variants = (variantsResult.data ?? []) as ProductVariantRow[];

  /*
   * Never contact customers about products that are
   * currently hidden, drafted, or archived.
   */
  if (product.status !== "published") {
    return {
      success: true,
      productId,
      previousState: null,
      currentState: null,
      stateChanged: false,
      stateVersion: 0,
      wishlistEmailsSent: 0,
      stockAlertEmailsSent: 0,
      errors: [],
    };
  }

  const image = imageResult.data as ProductImageRow | null;

  const productImageUrl = cleanText(image?.image_url) || null;

  const { data: stateData, error: stateError } = await admin.rpc(
    "refresh_product_stock_notification_state",
    {
      requested_product_id: productId,
    },
  );

  if (stateError) {
    throw new Error(stateError.message);
  }

  const state = (stateData ?? {}) as StateRefreshResult;

  const currentState = state.current_state ?? "out_of_stock";

  const previousState = state.previous_state ?? null;

  const stateChanged = state.changed === true;

  const stateVersion = Math.max(1, Number(state.state_version ?? 1));

  const productPriceLabel = getProductPriceLabel(variants);

  const productUrl = getProductUrl(product);

  let wishlistEmailsSent = 0;
  let stockAlertEmailsSent = 0;

  /*
   * Wishlist low-stock and out-of-stock emails.
   * Notification-version checks prevent duplicates and allow
   * unsuccessful email attempts to retry on the next stock update.
   */
  if (currentState === "low_stock" || currentState === "out_of_stock") {
    let wishlistQuery = admin
      .from("wishlist_items")
      .select(
        `
            id,
            email,
            last_low_stock_notified_version,
            last_out_of_stock_notified_version
          `,
      )
      .eq("product_id", productId)
      .eq("notifications_enabled", true);

    if (currentState === "low_stock") {
      wishlistQuery = wishlistQuery.lt(
        "last_low_stock_notified_version",
        stateVersion,
      );
    } else {
      wishlistQuery = wishlistQuery.lt(
        "last_out_of_stock_notified_version",
        stateVersion,
      );
    }

    const { data: wishlistData, error: wishlistError } = await wishlistQuery;

    if (wishlistError) {
      errors.push(wishlistError.message);
    } else {
      const wishlistRows = (wishlistData ?? []) as WishlistItemRow[];

      const groupedWishlist = groupWishlistItemsByEmail(wishlistRows);

      for (const [email, rows] of groupedWishlist) {
        const isLowStock = currentState === "low_stock";

        const emailResult = await sendNotificationEmail({
          to: email,

          subject: isLowStock
            ? `${product.name} is running low — Nita Style`
            : `${product.name} is now out of stock — Nita Style`,

          eyebrow: isLowStock ? "Low stock warning" : "Availability update",

          title: isLowStock
            ? "Your saved item is running low"
            : "Your saved item is now out of stock",

          message: isLowStock
            ? "A product in your wishlist is selling quickly. Shop soon before the remaining pieces are gone."
            : "A product in your wishlist has sold out. Request a restock notification and we will email you as soon as it becomes available again.",

          productName: product.name,

          productImageUrl,

          priceLabel: productPriceLabel,

          buttonLabel: isLowStock
            ? "Shop before it sells out"
            : "Notify me when available",

          buttonUrl: isLowStock
            ? productUrl
            : getProductUrl(product, "?notify=1"),

          accent: isLowStock ? "warning" : "danger",
        });

        const rowIds = rows.map((row) => row.id);

        const now = new Date().toISOString();

        if (emailResult.success) {
          const updateValues = isLowStock
            ? {
                last_low_stock_notified_version: stateVersion,
                last_notification_attempt_at: now,
                last_notification_error: null,
                updated_at: now,
              }
            : {
                last_out_of_stock_notified_version: stateVersion,
                last_notification_attempt_at: now,
                last_notification_error: null,
                updated_at: now,
              };

          const { error: updateError } = await admin
            .from("wishlist_items")
            .update(updateValues)
            .in("id", rowIds);

          if (updateError) {
            errors.push(updateError.message);
          }

          if (!emailResult.skipped) {
            wishlistEmailsSent += 1;
          }
        } else {
          const errorMessage =
            emailResult.message ?? "The wishlist email could not be sent.";

          errors.push(`${email}: ${errorMessage}`);

          await admin
            .from("wishlist_items")
            .update({
              last_notification_attempt_at: now,
              last_notification_error: errorMessage,
              updated_at: now,
            })
            .in("id", rowIds);
        }
      }
    }
  }

  /*
   * Pending restock requests.
   * This always runs because an individual size can become
   * available while the overall product state stays available.
   */
  const purchasableVariants = variants.filter(variantIsPurchasable);

  const purchasableVariantMap = new Map(
    purchasableVariants.map((variant) => [variant.id, variant]),
  );

  const { data: stockAlertData, error: stockAlertError } = await admin
    .from("stock_alerts")
    .select(
      `
        id,
        email,
        variant_id
      `,
    )
    .eq("product_id", productId)
    .eq("status", "pending");

  if (stockAlertError) {
    errors.push(stockAlertError.message);
  } else {
    const eligibleAlerts = (stockAlertData ?? []).filter((alert) => {
      const typedAlert = alert as StockAlertRow;

      if (typedAlert.variant_id === null) {
        return purchasableVariants.length > 0;
      }

      return purchasableVariantMap.has(typedAlert.variant_id);
    }) as StockAlertRow[];

    const groupedAlerts = groupStockAlertsByEmail(eligibleAlerts);

    for (const [email, alerts] of groupedAlerts) {
      const requestedVariants = alerts
        .map((alert) =>
          alert.variant_id
            ? (purchasableVariantMap.get(alert.variant_id) ?? null)
            : null,
        )
        .filter((variant): variant is ProductVariantRow => variant !== null);

      const uniqueSizes = Array.from(
        new Set(requestedVariants.map((variant) => variant.size)),
      );

      const singleVariant =
        requestedVariants.length === 1 && uniqueSizes.length === 1
          ? requestedVariants[0]
          : null;

      const priceLabel = singleVariant
        ? getVariantPrice(singleVariant) !== null
          ? money(getVariantPrice(singleVariant) as number)
          : productPriceLabel
        : productPriceLabel;

      const optionLabel = singleVariant
        ? `Requested size: ${singleVariant.size}`
        : uniqueSizes.length > 1
          ? `Requested sizes: ${uniqueSizes.join(", ")}`
          : null;

      const emailResult = await sendNotificationEmail({
        to: email,

        subject: singleVariant
          ? `${product.name} in size ${singleVariant.size} is back — Nita Style`
          : `${product.name} is back in stock — Nita Style`,

        eyebrow: "Restock notification",

        title: "It is back in stock",

        message: singleVariant
          ? `The size you requested is available again. Shop soon before size ${singleVariant.size} sells out.`
          : "The product you requested is available again. Shop soon while stock lasts.",

        productName: product.name,

        productImageUrl,

        priceLabel,

        optionLabel,

        buttonLabel: "Shop now",

        buttonUrl: productUrl,

        accent: "success",
      });

      const alertIds = alerts.map((alert) => alert.id);

      const now = new Date().toISOString();

      if (emailResult.success && emailResult.skipped) {
        const { error: updateError } = await admin
          .from("stock_alerts")
          .update({
            status: "cancelled",
            notified_at: null,
            last_attempt_at: now,
            last_error: null,
            updated_at: now,
          })
          .in("id", alertIds);

        if (updateError) {
          errors.push(updateError.message);
        }
      } else if (emailResult.success) {
        const { error: updateError } = await admin
          .from("stock_alerts")
          .update({
            status: "notified",
            notified_at: now,
            last_attempt_at: now,
            last_error: null,
            updated_at: now,
          })
          .in("id", alertIds);

        if (updateError) {
          errors.push(updateError.message);
        }

        stockAlertEmailsSent += 1;
      } else {
        const errorMessage =
          emailResult.message ?? "The restock email could not be sent.";

        errors.push(`${email}: ${errorMessage}`);

        await admin
          .from("stock_alerts")
          .update({
            last_attempt_at: now,
            last_error: errorMessage,
            updated_at: now,
          })
          .in("id", alertIds);
      }
    }
  }

  return {
    success: errors.length === 0,

    productId,

    previousState,

    currentState,

    stateChanged,

    stateVersion,

    wishlistEmailsSent,

    stockAlertEmailsSent,

    errors,
  };
}

export async function processStockNotificationsForVariants(
  variantIds: string[],
) {
  const uniqueVariantIds = Array.from(
    new Set(variantIds.map(cleanText).filter(Boolean)),
  );

  if (uniqueVariantIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("product_variants")
    .select("id, product_id")
    .in("id", uniqueVariantIds);

  if (error) {
    throw new Error(error.message);
  }

  const productIds = Array.from(
    new Set((data ?? []).map((row) => row.product_id)),
  );

  const results: StockNotificationResult[] = [];

  for (const productId of productIds) {
    results.push(await processStockNotificationsForProduct(productId));
  }

  return results;
}
