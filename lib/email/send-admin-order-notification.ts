import "server-only";

import { Resend } from "resend";

import {
  buildCustomerEmailLayout,
  buildEmailButton,
  EMAIL_COLORS,
  escapeEmailHtml,
  getEmailSiteUrl,
} from "@/lib/email/customer-email-ui";

type FulfillmentMethod = "delivery" | "pickup";

type AdminOrderCustomer = {
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

type AdminOrderItem = {
  name: string;
  size: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
};

type SendAdminOrderNotificationInput = {
  orderId: string;
  orderNumber: string;
  fulfillmentMethod: FulfillmentMethod;
  customer: AdminOrderCustomer;
  items: AdminOrderItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string | null;
  createdAt?: string | null;
  paymentMethod?: "cash_on_delivery" | null;
};

export type SendAdminOrderNotificationResult =
  | {
      success: true;
      emailId: string | null;
    }
  | {
      success: false;
      message: string;
    };

function money(value: number) {
  const normalized = Number.isFinite(Number(value)) ? Number(value) : 0;

  return `$${normalized.toFixed(2)}`;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function parseAdminRecipients() {
  return (process.env.ADMIN_ORDER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function detailRow(label: string, value: string, emphasized = false) {
  if (!value) {
    return "";
  }

  return `
    <tr>
      <td
        style="
          padding:10px 0;
          border-bottom:1px solid ${EMAIL_COLORS.border};
          color:${EMAIL_COLORS.secondaryText};
          font-size:12px;
          line-height:18px;
          vertical-align:top;
        "
      >
        ${escapeEmailHtml(label)}
      </td>

      <td
        align="right"
        style="
          padding:10px 0 10px 18px;
          border-bottom:1px solid ${EMAIL_COLORS.border};
          color:${EMAIL_COLORS.text};
          font-size:${emphasized ? "15px" : "12px"};
          line-height:18px;
          font-weight:${emphasized ? "800" : "700"};
          vertical-align:top;
        "
      >
        ${escapeEmailHtml(value)}
      </td>
    </tr>
  `;
}

export async function sendAdminOrderNotificationEmail(
  input: SendAdminOrderNotificationInput,
): Promise<SendAdminOrderNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.ORDER_EMAIL_FROM?.trim();
  const recipients = parseAdminRecipients();

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

  if (recipients.length === 0) {
    return {
      success: false,
      message: "ADMIN_ORDER_EMAILS is not configured.",
    };
  }

  const resend = new Resend(apiKey);

  const fulfillmentLabel =
    input.fulfillmentMethod === "pickup" ? "STORE PICKUP" : "DELIVERY";

  const paymentLabel =
    input.fulfillmentMethod === "pickup"
      ? "Cash at pickup"
      : "Cash on delivery";

  const customerName = [
    clean(input.customer.firstName),
    clean(input.customer.lastName),
  ]
    .filter(Boolean)
    .join(" ");

  const deliveryAddress = [
    clean(input.customer.address),
    clean(input.customer.building),
    clean(input.customer.floor),
    clean(input.customer.area),
    clean(input.customer.city),
    clean(input.customer.country),
  ]
    .filter(Boolean)
    .join(", ");

  const orderUrl = `${getEmailSiteUrl()}/admin/orders/${encodeURIComponent(
    input.orderId,
  )}`;

  const itemRows = input.items
    .map((item) => {
      const configuration = clean(item.size);
      const sku = clean(item.sku);

      return `
        <tr>
          <td
            style="
              padding:14px 0;
              border-bottom:1px solid ${EMAIL_COLORS.border};
              vertical-align:top;
            "
          >
            <div
              style="
                color:${EMAIL_COLORS.text};
                font-size:13px;
                line-height:19px;
                font-weight:800;
              "
            >
              ${escapeEmailHtml(item.name)}
            </div>

            ${
              configuration
                ? `
                  <div
                    style="
                      margin-top:3px;
                      color:${EMAIL_COLORS.secondaryText};
                      font-size:11px;
                      line-height:17px;
                    "
                  >
                    ${escapeEmailHtml(configuration)}
                  </div>
                `
                : ""
            }

            ${
              sku
                ? `
                  <div
                    style="
                      margin-top:2px;
                      color:${EMAIL_COLORS.tertiaryText};
                      font-size:10px;
                      line-height:16px;
                    "
                  >
                    SKU ${escapeEmailHtml(sku)}
                  </div>
                `
                : ""
            }
          </td>

          <td
            align="center"
            style="
              padding:14px 12px;
              border-bottom:1px solid ${EMAIL_COLORS.border};
              color:${EMAIL_COLORS.secondaryText};
              font-size:12px;
              font-weight:700;
              vertical-align:top;
            "
          >
            ×${Math.max(1, Number(item.quantity) || 1)}
          </td>

          <td
            align="right"
            style="
              padding:14px 0;
              border-bottom:1px solid ${EMAIL_COLORS.border};
              color:${EMAIL_COLORS.text};
              font-size:12px;
              font-weight:800;
              vertical-align:top;
            "
          >
            ${escapeEmailHtml(
              money(
                Math.max(1, Number(item.quantity) || 1) *
                  Math.max(0, Number(item.unitPrice) || 0),
              ),
            )}
          </td>
        </tr>
      `;
    })
    .join("");

  const fulfillmentBadgeBackground =
    input.fulfillmentMethod === "pickup" ? EMAIL_COLORS.mustardSoft : "#eef6ff";

  const fulfillmentBadgeText =
    input.fulfillmentMethod === "pickup" ? EMAIL_COLORS.mustardText : "#175b9c";

  const content = `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
    >
      <tr>
        <td>
          <div
            style="
              display:inline-block;
              margin-bottom:14px;
              padding:7px 11px;
              border-radius:999px;
              background:${fulfillmentBadgeBackground};
              color:${fulfillmentBadgeText};
              font-size:10px;
              line-height:14px;
              font-weight:800;
              letter-spacing:0.08em;
            "
          >
            ${input.fulfillmentMethod === "pickup" ? "🏬" : "🚚"}
            ${fulfillmentLabel}
          </div>

          <h1
            style="
              margin:0;
              color:${EMAIL_COLORS.text};
              font-size:27px;
              line-height:34px;
              font-weight:800;
              letter-spacing:-0.03em;
            "
          >
            New order received
          </h1>

          <p
            style="
              margin:8px 0 0;
              color:${EMAIL_COLORS.secondaryText};
              font-size:13px;
              line-height:20px;
            "
          >
            Order
            <strong style="color:${EMAIL_COLORS.text};">
              ${escapeEmailHtml(input.orderNumber)}
            </strong>
            has been successfully placed on Stereophonie Store.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding-top:28px;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
          >
            ${detailRow("Order number", input.orderNumber, true)}
            ${detailRow("Fulfillment", fulfillmentLabel)}
            ${detailRow("Customer", customerName)}
            ${detailRow("Phone", clean(input.customer.phone))}
            ${detailRow("Email", clean(input.customer.email))}
            ${detailRow("Payment", paymentLabel)}
          </table>
        </td>
      </tr>

      ${
        input.fulfillmentMethod === "delivery"
          ? `
            <tr>
              <td style="padding-top:28px;">
                <div
                  style="
                    margin-bottom:10px;
                    color:${EMAIL_COLORS.text};
                    font-size:12px;
                    line-height:18px;
                    font-weight:800;
                    letter-spacing:0.05em;
                    text-transform:uppercase;
                  "
                >
                  Delivery information
                </div>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  ${detailRow("Address", deliveryAddress)}
                  ${detailRow(
                    "Delivery notes",
                    clean(input.customer.deliveryNotes),
                  )}
                </table>
              </td>
            </tr>
          `
          : `
            <tr>
              <td style="padding-top:24px;">
                <div
                  style="
                    padding:14px 16px;
                    border:1px solid ${EMAIL_COLORS.border};
                    border-radius:12px;
                    background:${EMAIL_COLORS.soft};
                    color:${EMAIL_COLORS.secondaryText};
                    font-size:12px;
                    line-height:19px;
                  "
                >
                  This customer selected
                  <strong style="color:${EMAIL_COLORS.text};">
                    Store Pickup
                  </strong>.
                  No delivery address or delivery fee is required.
                </div>
              </td>
            </tr>
          `
      }

      <tr>
        <td style="padding-top:30px;">
          <div
            style="
              margin-bottom:10px;
              color:${EMAIL_COLORS.text};
              font-size:12px;
              line-height:18px;
              font-weight:800;
              letter-spacing:0.05em;
              text-transform:uppercase;
            "
          >
            Products
          </div>

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
          >
            ${itemRows}
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding-top:24px;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
          >
            ${detailRow("Subtotal", money(input.subtotal))}
            ${
              input.discountAmount > 0
                ? detailRow("Discount", `-${money(input.discountAmount)}`)
                : ""
            }
            ${
              input.couponCode
                ? detailRow("Coupon", clean(input.couponCode))
                : ""
            }
            ${detailRow(
              "Delivery fee",
              input.fulfillmentMethod === "pickup"
                ? "Free"
                : money(input.deliveryFee),
            )}
            ${detailRow("Order total", money(input.total), true)}
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding-top:30px;">
          ${buildEmailButton({
            href: orderUrl,
            label: "Open order in admin",
          })}
        </td>
      </tr>
    </table>
  `;

  const html = buildCustomerEmailLayout({
    title: `New ${fulfillmentLabel.toLowerCase()} order ${input.orderNumber} — Stereophonie`,
    previewText: `${input.orderNumber} · ${fulfillmentLabel} · ${money(
      input.total,
    )}`,
    content,
  });

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: recipients,
    subject: `${
      input.fulfillmentMethod === "pickup" ? "🏬 PICKUP" : "🚚 DELIVERY"
    } · New order ${input.orderNumber} · ${money(input.total)}`,
    html,
  });

  if (error) {
    return {
      success: false,
      message: error.message || "The admin order email could not be sent.",
    };
  }

  return {
    success: true,
    emailId: data?.id ?? null,
  };
}
