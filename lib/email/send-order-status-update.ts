import "server-only";

import { Resend } from "resend";

import {
  buildCustomerEmailLayout,
  buildEmailButton,
  EMAIL_COLORS,
} from "@/lib/email/customer-email-ui";

export type OrderStatusUpdateStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

type OrderStatusUpdateItem = {
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
};

type SendOrderStatusUpdateInput = {
  orderNumber: string;
  status: OrderStatusUpdateStatus;
  fulfillmentMethod: "delivery" | "pickup";

  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;

  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  total: number;
  updatedAt?: string | null;

  items: OrderStatusUpdateItem[];
};

export type SendOrderStatusUpdateResult =
  | {
      success: true;
      emailId: string | null;
    }
  | {
      success: false;
      message: string;
    };

const deliveryFulfilmentSteps: {
  value: Exclude<OrderStatusUpdateStatus, "cancelled" | "ready_for_pickup">;
  label: string;
}[] = [
  { value: "pending", label: "Submitted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "completed", label: "Delivered" },
];

const pickupFulfilmentSteps: {
  value: Exclude<OrderStatusUpdateStatus, "cancelled" | "out_for_delivery">;
  label: string;
}[] = [
  { value: "pending", label: "Submitted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Collected" },
];

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImageUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return escapeHtml(url.toString());
  } catch {
    return "";
  }
}

function getAccountUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();

  if (!siteUrl) {
    return null;
  }

  try {
    const url = new URL("/account", siteUrl);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function money(value: number) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return `$${safeValue.toFixed(2)}`;
}

function formatStatusDate(value: string | null | undefined) {
  const fallbackDate = new Date();

  if (!value) {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(fallbackDate);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(fallbackDate);
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusContent(
  status: OrderStatusUpdateStatus,
  fulfillmentMethod: "delivery" | "pickup",
) {
  switch (status) {
    case "confirmed":
      return {
        label: "Order confirmed",
        headline: "Your order has been confirmed.",
        description:
          "Stereophonie has reviewed and confirmed your order. Your items will now move to preparation.",
        nextStep:
          fulfillmentMethod === "pickup"
            ? "Your items will be prepared for collection from Stereophonie."
            : "Your items will be prepared for delivery.",
        accent: "#93c5fd",
        accentBackground: "rgba(59,130,246,0.10)",
        subjectStatus: "confirmed",
      };

    case "preparing":
      return {
        label: "Order being prepared",
        headline: "We are preparing your items.",
        description:
          fulfillmentMethod === "pickup"
            ? "Your Stereophonie order is currently being prepared and checked before collection."
            : "Your Stereophonie order is currently being prepared and checked before delivery.",
        nextStep:
          fulfillmentMethod === "pickup"
            ? "You will be notified when your order is ready for pickup."
            : "You will be notified when your order leaves for delivery.",
        accent: "#fcd34d",
        accentBackground: "rgba(245,158,11,0.10)",
        subjectStatus: "is being prepared",
      };

    case "out_for_delivery":
      return {
        label: "Out for delivery",
        headline: "Your order is on its way.",
        description:
          "Your Stereophonie order has left for delivery. Please keep your phone available in case the delivery team needs to contact you.",
        nextStep: "Your order should arrive soon.",
        accent: "#c4b5fd",
        accentBackground: "rgba(139,92,246,0.10)",
        subjectStatus: "is out for delivery",
      };

    case "ready_for_pickup":
      return {
        label: "Ready for pickup",
        headline: "Your order is ready for pickup.",
        description:
          "Your Stereophonie order is ready. You can now collect it directly from Stereophonie Store in Mtaileb.",
        nextStep:
          "Bring your order number when collecting your order from the store.",
        accent: "#fdb73e",
        accentBackground: "rgba(253,183,62,0.10)",
        subjectStatus: "is ready for pickup",
      };

    case "completed":
      return {
        label:
          fulfillmentMethod === "pickup"
            ? "Order collected"
            : "Order delivered",
        headline:
          fulfillmentMethod === "pickup"
            ? "Your order has been collected."
            : "Your order has been delivered.",
        description:
          fulfillmentMethod === "pickup"
            ? "Your Stereophonie order has been marked as successfully collected. Thank you for shopping with us."
            : "Your Stereophonie order has been marked as successfully delivered. Thank you for shopping with us.",
        nextStep: "We hope you enjoy your new Stereophonie products.",
        accent: "#86efac",
        accentBackground: "rgba(34,197,94,0.10)",
        subjectStatus: "has been delivered",
      };

    case "cancelled":
      return {
        label: "Order cancelled",
        headline: "Your order has been cancelled.",
        description:
          "Your Stereophonie order has been marked as cancelled. Contact Stereophonie if you need more information about this update.",
        nextStep: "Please keep your order number when contacting us.",
        accent: "#fca5a5",
        accentBackground: "rgba(239,68,68,0.10)",
        subjectStatus: "has been cancelled",
      };

    default:
      return {
        label: "Order submitted",
        headline: "Your order is awaiting confirmation.",
        description:
          "Your order has been received and is currently waiting for review by Stereophonie.",
        nextStep: "You will be notified when your order is confirmed.",
        accent: "#d4d4d4",
        accentBackground: "rgba(255,255,255,0.06)",
        subjectStatus: "is awaiting confirmation",
      };
  }
}

function buildProgressHtml(
  status: OrderStatusUpdateStatus,
  fulfillmentMethod: "delivery" | "pickup",
) {
  if (status === "cancelled") {
    return `
      <div
        style="
          padding:20px 21px;
          border:1px solid ${EMAIL_COLORS.mustard};
          border-radius:20px;
          background:${EMAIL_COLORS.mustardSoft};
          overflow:hidden;
        "
      >
        <p
          style="
            margin:0;
            font-size:10px;
            font-weight:700;
            letter-spacing:1.1px;
            text-transform:uppercase;
            color:${EMAIL_COLORS.mustardText};
          "
        >
          Order progress stopped
        </p>

        <p
          style="
            margin:10px 0 0;
            font-size:14px;
            line-height:1.7;
            color:${EMAIL_COLORS.secondaryText};
          "
        >
          This order will not continue through
          preparation or fulfilment.
        </p>
      </div>
    `;
  }

  const fulfilmentSteps =
    fulfillmentMethod === "pickup"
      ? pickupFulfilmentSteps
      : deliveryFulfilmentSteps;

  const currentIndex = fulfilmentSteps.findIndex(
    (step) => step.value === status,
  );

  const steps = fulfilmentSteps
    .map((step, index) => {
      const isCompleted = currentIndex >= index && currentIndex !== -1;

      const isCurrent = index === currentIndex;

      const circleBackground = isCompleted
        ? EMAIL_COLORS.mustard
        : EMAIL_COLORS.white;

      const circleColor = isCompleted
        ? EMAIL_COLORS.text
        : EMAIL_COLORS.tertiaryText;

      const circleBorder = isCompleted ? "#e4a21f" : EMAIL_COLORS.border;

      const circleRing = isCurrent ? "0 0 0 4px #fff4dc" : "none";

      const labelColor = isCurrent
        ? EMAIL_COLORS.text
        : isCompleted
          ? EMAIL_COLORS.secondaryText
          : EMAIL_COLORS.tertiaryText;

      return `
        <tr>
          <td
            width="42"
            valign="top"
            style="
              width:42px;
              padding-bottom:${
                index === fulfilmentSteps.length - 1 ? "0" : "16px"
              };
            "
          >
            <div
              style="
                width:28px;
                height:28px;
                line-height:28px;
                border-radius:50%;
                border:1px solid ${circleBorder};
                background:${circleBackground};
                color:${circleColor};
                text-align:center;
                font-size:11px;
                font-weight:600;
                box-shadow:${circleRing};
              "
            >
              <table
                role="presentation"
                width="28"
                height="28"
                cellspacing="0"
                cellpadding="0"
                border="0"
                align="center"
                style="
                  width:28px;
                  height:28px;
                  border-collapse:collapse;
                  border-spacing:0;
                  margin:0 auto;
                "
              >
                <tr>
                  <td
                    width="28"
                    height="28"
                    align="center"
                    valign="middle"
                    style="
                      width:28px;
                      height:28px;
                      padding:0;
                      margin:0;
                      text-align:center;
                      vertical-align:middle;
                      font-family:Arial,Helvetica,sans-serif;
                      font-size:12px;
                      line-height:28px;
                      font-weight:700;
                      color:${circleColor};
                      mso-line-height-rule:exactly;
                    "
                  >
                    ${
                      isCompleted
                        ? `
                          <span
                            style="
                              display:inline-block;
                              margin:0;
                              padding:0;
                              color:${EMAIL_COLORS.text};
                              font-family:Arial,Helvetica,sans-serif;
                              font-size:11px;
                              line-height:28px;
                              font-weight:600;
                              text-align:center;
                              vertical-align:middle;
                            "
                          >&#10003;</span>
                        `
                        : index + 1
                    }
                  </td>
                </tr>
              </table>
            </div>
          </td>

          <td
            valign="top"
            style="
              padding:5px 0 ${
                index === fulfilmentSteps.length - 1 ? "0" : "16px"
              };
            "
          >
            <p
              style="
                margin:0;
                font-size:12px;
                font-weight:${isCurrent ? "700" : "600"};
                letter-spacing:0.4px;
                color:${labelColor};
              "
            >
              ${escapeHtml(step.label)}
            </p>

            ${
              isCurrent
                ? `
                  <p
                    style="
                      margin:5px 0 0;
                      font-size:11px;
                      line-height:1.5;
                      color:${EMAIL_COLORS.secondaryText};
                    "
                  >
                    Current order status
                  </p>
                `
                : ""
            }
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
    >
      ${steps}
    </table>
  `;
}

function buildProductRows(items: OrderStatusUpdateItem[]) {
  if (items.length === 0) {
    return `
      <tr>
        <td
          style="
            padding:20px;
            border-radius:18px;
            background:${EMAIL_COLORS.soft};
            color:${EMAIL_COLORS.secondaryText};
            font-size:13px;
            line-height:1.6;
            text-align:center;
          "
        >
          Product details are not available for this order.
        </td>
      </tr>
    `;
  }

  return items
    .map((item, index) => {
      const productName = escapeHtml(item.productName.trim() || "Product");
      const size = item.size.trim() ? escapeHtml(item.size) : "";
      const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const calculatedLineTotal = unitPrice * quantity;

      const lineTotal = Number.isFinite(Number(item.lineTotal))
        ? Number(item.lineTotal)
        : calculatedLineTotal;

      const imageUrl = safeImageUrl(item.imageUrl);

      const productImage = imageUrl
        ? `
          <img
            src="${imageUrl}"
            alt="${productName}"
            width="88"
            height="104"
            style="
              display:block;
              width:88px;
              height:104px;
              border:0;
              border-radius:15px;
              background:${EMAIL_COLORS.soft};
              object-fit:cover;
            "
          />
        `
        : `
          <table
            role="presentation"
            width="88"
            height="104"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width:88px;
              height:104px;
              border-radius:15px;
              background:#ebebed;
            "
          >
            <tr>
              <td
                align="center"
                valign="middle"
                style="
                  padding:7px;
                  color:${EMAIL_COLORS.tertiaryText};
                  font-size:8px;
                  font-weight:700;
                  letter-spacing:0.7px;
                  text-transform:uppercase;
                "
              >
                Stereophonie
              </td>
            </tr>
          </table>
        `;

      return `
        <tr>
          <td style="padding:${index === 0 ? "0" : "11px 0 0"};">
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
              style="
                background:${EMAIL_COLORS.soft};
                border-radius:19px;
              "
            >
              <tr>
                <td
                  width="88"
                  valign="middle"
                  style="
                    width:88px;
                    padding:11px;
                  "
                >
                  ${productImage}
                </td>

                <td
                  valign="middle"
                  style="
                    padding:15px 17px 15px 4px;
                  "
                >
                  <p
                    style="
                      margin:0;
                      color:${EMAIL_COLORS.text};
                      font-size:14px;
                      line-height:1.4;
                      font-weight:700;
                    "
                  >
                    ${productName}
                  </p>

                  <p
                    style="
                      margin:6px 0 0;
                      color:${EMAIL_COLORS.secondaryText};
                      font-size:11px;
                      line-height:1.55;
                    "
                  >
                    ${size ? `Size ${size} · ` : ""}
                    Qty ${quantity}
                  </p>

                  <p
                    style="
                      margin:9px 0 0;
                      color:${EMAIL_COLORS.text};
                      font-size:13px;
                      line-height:1.4;
                      font-weight:700;
                    "
                  >
                    ${money(lineTotal)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");
}

export async function sendOrderStatusUpdateEmail(
  input: SendOrderStatusUpdateInput,
): Promise<SendOrderStatusUpdateResult> {
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

  const customerEmail = input.customerEmail.trim().toLowerCase();

  if (!customerEmail) {
    return {
      success: false,
      message: "The customer email address is missing.",
    };
  }

  const statusContent = getStatusContent(input.status, input.fulfillmentMethod);

  const customerName = [input.customerFirstName, input.customerLastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const safeCustomerName = escapeHtml(customerName || "Customer");

  const safeOrderNumber = escapeHtml(input.orderNumber);

  const accountUrl = getAccountUrl();

  const accountButton = accountUrl
    ? `
      <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        border="0"
        style="margin-top:26px;"
      >
        <tr>
          <td align="center">
            <a
              href="${escapeHtml(accountUrl)}"
              style="
                display:inline-block;
                padding:16px 25px;
                background:#111111;
                border:1px solid #111111;
                color:#ffffff;
                text-decoration:none;
                font-size:10px;
                font-weight:700;
                letter-spacing:1.7px;
                text-transform:uppercase;
              "
            >
              View my orders
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  const safeSubtotal = Math.max(0, Number(input.subtotal) || 0);

  const safeDiscountAmount = Math.max(0, Number(input.discountAmount) || 0);

  const safeCouponCode = input.couponCode?.trim().toUpperCase() || "";

  const discountSummaryHtml =
    safeDiscountAmount > 0
      ? `
        <tr>
          <td
            style="
              padding:11px 0 0;
              font-size:13px;
              color:#15803d;
            "
          >
            Discount${safeCouponCode ? ` (${escapeHtml(safeCouponCode)})` : ""}
          </td>

          <td
            align="right"
            style="
              padding:11px 0 0;
              font-size:13px;
              font-weight:700;
              color:#15803d;
            "
          >
            −${money(safeDiscountAmount)}
          </td>
        </tr>
      `
      : "";

  const content = `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
    >
      <tr>
        <td
          align="center"
          style="
            padding:52px 34px 29px;
            text-align:center;
          "
        >
          <div
            style="
              display:inline-block;
              padding:7px 12px;
              border-radius:999px;
              background:${EMAIL_COLORS.mustardSoft};
              color:${EMAIL_COLORS.mustardText};
              font-size:10px;
              line-height:14px;
              font-weight:700;
              letter-spacing:1.3px;
              text-transform:uppercase;
            "
          >
            ${escapeHtml(statusContent.label)}
          </div>

          <h1
            style="
              margin:21px auto 0;
              max-width:475px;
              color:${EMAIL_COLORS.text};
              font-size:37px;
              line-height:1.08;
              font-weight:700;
              letter-spacing:-1.5px;
            "
          >
            ${escapeHtml(statusContent.headline)}
          </h1>

          <p
            style="
              margin:17px auto 0;
              max-width:440px;
              color:${EMAIL_COLORS.secondaryText};
              font-size:15px;
              line-height:1.7;
            "
          >
            Hello ${safeCustomerName},
            ${escapeHtml(statusContent.description)}
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:0 34px;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              background:${EMAIL_COLORS.soft};
              border-radius:20px;
            "
          >
            <tr>
              <td
                width="55%"
                valign="top"
                style="
                  width:55%;
                  padding:21px 12px 21px 22px;
                "
              >
                <p
                  style="
                    margin:0;
                    color:${EMAIL_COLORS.tertiaryText};
                    font-size:10px;
                    line-height:14px;
                    font-weight:700;
                    letter-spacing:1.2px;
                    text-transform:uppercase;
                  "
                >
                  Order number
                </p>

                <p
                  style="
                    margin:7px 0 0;
                    color:${EMAIL_COLORS.text};
                    font-size:17px;
                    line-height:23px;
                    font-weight:700;
                  "
                >
                  ${safeOrderNumber}
                </p>
              </td>

              <td
                width="45%"
                valign="top"
                align="right"
                style="
                  width:45%;
                  padding:21px 22px 21px 12px;
                "
              >
                <p
                  style="
                    margin:0;
                    color:${EMAIL_COLORS.tertiaryText};
                    font-size:10px;
                    line-height:14px;
                    font-weight:700;
                    letter-spacing:1.2px;
                    text-transform:uppercase;
                  "
                >
                  Updated
                </p>

                <p
                  style="
                    margin:7px 0 0;
                    color:${EMAIL_COLORS.secondaryText};
                    font-size:11px;
                    line-height:18px;
                  "
                >
                  ${escapeHtml(formatStatusDate(input.updatedAt))}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:34px 34px 0;">
          <p
            style="
              margin:0 0 15px;
              color:${EMAIL_COLORS.text};
              font-size:17px;
              line-height:22px;
              font-weight:700;
            "
          >
            ${
              input.fulfillmentMethod === "pickup"
                ? "Pickup progress"
                : "Delivery progress"
            }
          </p>

          <div
            style="
              padding:22px;
              border-radius:20px;
              background:${EMAIL_COLORS.soft};
            "
          >
            ${buildProgressHtml(input.status, input.fulfillmentMethod)}
          </div>
        </td>
      </tr>

      <tr>
        <td style="padding:20px 34px 0;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              background:${EMAIL_COLORS.mustardSoft};
              border:1px solid ${EMAIL_COLORS.mustard};
              border-radius:20px;
            "
          >
            <tr>
              <td style="padding:21px 22px;">
                <p
                  style="
                    margin:0;
                    color:${EMAIL_COLORS.mustardText};
                    font-size:10px;
                    line-height:14px;
                    font-weight:700;
                    letter-spacing:1.3px;
                    text-transform:uppercase;
                  "
                >
                  What happens next?
                </p>

                <p
                  style="
                    margin:9px 0 0;
                    color:${EMAIL_COLORS.text};
                    font-size:13px;
                    line-height:1.7;
                  "
                >
                  ${escapeHtml(statusContent.nextStep)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:34px 34px 0;">
          <p
            style="
              margin:0 0 14px;
              color:${EMAIL_COLORS.text};
              font-size:17px;
              line-height:22px;
              font-weight:700;
            "
          >
            Order items
          </p>

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
          >
            ${buildProductRows(input.items)}
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:34px 34px 0;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              background:${EMAIL_COLORS.soft};
              border-radius:20px;
            "
          >
            <tr>
              <td style="padding:21px 22px;">
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  <tr>
                    <td
                      style="
                        padding:0 0 11px;
                        color:${EMAIL_COLORS.secondaryText};
                        font-size:13px;
                      "
                    >
                      Subtotal
                    </td>

                    <td
                      align="right"
                      style="
                        padding:0 0 11px;
                        color:${EMAIL_COLORS.text};
                        font-size:13px;
                        font-weight:600;
                      "
                    >
                      ${money(safeSubtotal)}
                    </td>
                  </tr>

                  ${discountSummaryHtml}

                  <tr>
                    <td
                      style="
                        padding:17px 0 0;
                        border-top:1px solid ${EMAIL_COLORS.border};
                        color:${EMAIL_COLORS.text};
                        font-size:15px;
                        font-weight:700;
                      "
                    >
                      Order total
                    </td>

                    <td
                      align="right"
                      style="
                        padding:17px 0 0;
                        border-top:1px solid ${EMAIL_COLORS.border};
                        color:${EMAIL_COLORS.text};
                        font-size:20px;
                        font-weight:700;
                      "
                    >
                      ${money(input.total)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:30px 34px 0;">
          ${
            accountUrl
              ? buildEmailButton({
                  href: accountUrl,
                  label: "View my orders",
                })
              : ""
          }
        </td>
      </tr>

      <tr>
        <td
          align="center"
          style="
            padding:24px 34px 38px;
            text-align:center;
          "
        >
          <p
            style="
              margin:0;
              color:${EMAIL_COLORS.tertiaryText};
              font-size:11px;
              line-height:18px;
            "
          >
            Keep your order number for any communication
            about your purchase.
          </p>
        </td>
      </tr>
    </table>
  `;

  const html = buildCustomerEmailLayout({
    title: `Order ${input.orderNumber} ${statusContent.subjectStatus} — Stereophonie`,
    previewText: `${statusContent.headline} — order ${input.orderNumber}.`,
    content,
  });

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [customerEmail],
    subject: `Order ${input.orderNumber} ${statusContent.subjectStatus} — Stereophonie`,
    html,
  });

  if (error) {
    return {
      success: false,
      message: error.message || "The order status email could not be sent.",
    };
  }

  return {
    success: true,
    emailId: data?.id ?? null,
  };
}
