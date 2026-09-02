import "server-only";

import { Resend } from "resend";

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
          padding:20px;
          border:1px solid #fecaca;
          background:#fff7f7;
        "
      >
        <p
          style="
            margin:0;
            font-size:10px;
            font-weight:700;
            letter-spacing:1.7px;
            text-transform:uppercase;
            color:#dc2626;
          "
        >
          Order progress stopped
        </p>

        <p
          style="
            margin:10px 0 0;
            font-size:14px;
            line-height:1.7;
            color:#555555;
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
      const isCompleted = index < currentIndex;

      const isCurrent = index === currentIndex;

      const circleBackground = isCompleted || isCurrent ? "#111111" : "#ffffff";

      const circleColor = isCompleted || isCurrent ? "#ffffff" : "#999999";

      const circleBorder = isCompleted || isCurrent ? "#111111" : "#d8d8d8";

      const labelColor = isCurrent
        ? "#111111"
        : isCompleted
          ? "#444444"
          : "#999999";

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
                font-weight:700;
              "
            >
              ${isCompleted ? "✓" : index + 1}
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
                      color:#777777;
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
            padding:18px;
            border:1px solid #e5e5e5;
            background:#fafafa;
            font-size:13px;
            color:#777777;
          "
        >
          Product details are not available for
          this order.
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
            width="92"
            height="115"
            style="
              display:block;
              width:92px;
              height:115px;
              border:0;
              background:#f2f2f2;
              object-fit:cover;
            "
          />
        `
        : `
          <div
            style="
              display:table;
              width:92px;
              height:115px;
              background:#f1f1ef;
              text-align:center;
              color:#999999;
            "
          >
            <div
              style="
                display:table-cell;
                vertical-align:middle;
                font-size:9px;
                font-weight:700;
                letter-spacing:1px;
                text-transform:uppercase;
              "
            >
              Stereophonie
            </div>
          </div>
        `;

      return `
        <tr>
          <td
            style="
              padding:${index === 0 ? "0 0 18px" : "18px 0"};
              ${
                index < items.length - 1
                  ? "border-bottom:1px solid #e8e8e8;"
                  : ""
              }
            "
          >
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
            >
              <tr>
                <td
                  width="92"
                  valign="top"
                  style="width:92px;"
                >
                  ${productImage}
                </td>

                <td
                  valign="top"
                  style="
                    padding-left:17px;
                    vertical-align:top;
                  "
                >
                  <p
                    style="
                      margin:0;
                      font-size:15px;
                      line-height:1.4;
                      font-weight:700;
                      color:#111111;
                    "
                  >
                    ${productName}
                  </p>

                  <p
                    style="
                      margin:9px 0 0;
                      font-size:12px;
                      line-height:1.6;
                      color:#777777;
                    "
                  >
                    ${size ? `Size ${size}<br />` : ""}
                    Quantity ${quantity}
                  </p>

                  <p
                    style="
                      margin:13px 0 0;
                      font-size:14px;
                      font-weight:700;
                      color:#111111;
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

  const html = `
    <!doctype html>

    <html lang="en">
      <head>
        <meta charset="utf-8" />

        <meta
          name="viewport"
          content="width=device-width,initial-scale=1"
        />

        <title>
          Order status update
        </title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f5f5f3;
          font-family:Arial,Helvetica,sans-serif;
          color:#111111;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="background:#f5f5f3;"
        >
          <tr>
            <td
              align="center"
              style="padding:32px 16px;"
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width:640px;
                  background:#ffffff;
                  border:1px solid #e5e5e5;
                "
              >
                <tr>
                  <td
                    style="
                      padding:27px 32px;
                      border-bottom:1px solid #e5e5e5;
                      text-align:center;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        font-size:20px;
                        font-weight:700;
                        letter-spacing:4px;
                        text-transform:uppercase;
                      "
                    >
                      Stereophonie
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:39px 32px;
                      background:#0a0a0a;
                      color:#ffffff;
                    "
                  >
                    <div
                      style="
                        display:inline-block;
                        padding:8px 11px;
                        border:1px solid ${statusContent.accent};
                        background:${statusContent.accentBackground};
                      "
                    >
                      <p
                        style="
                          margin:0;
                          font-size:9px;
                          font-weight:700;
                          letter-spacing:1.7px;
                          text-transform:uppercase;
                          color:${statusContent.accent};
                        "
                      >
                        ${escapeHtml(statusContent.label)}
                      </p>
                    </div>

                    <h1
                      style="
                        margin:18px 0 0;
                        font-size:34px;
                        line-height:1.08;
                        letter-spacing:-1.4px;
                      "
                    >
                      ${escapeHtml(statusContent.headline)}
                    </h1>

                    <p
                      style="
                        margin:20px 0 0;
                        font-size:14px;
                        line-height:1.8;
                        color:#bdbdbd;
                      "
                    >
                      Hello ${safeCustomerName},
                      ${escapeHtml(statusContent.description)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    <div
                      style="
                        padding:20px;
                        border:1px solid #dddddd;
                      "
                    >
                      <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                      >
                        <tr>
                          <td valign="top">
                            <p
                              style="
                                margin:0;
                                font-size:10px;
                                font-weight:700;
                                letter-spacing:1.7px;
                                text-transform:uppercase;
                                color:#777777;
                              "
                            >
                              Order number
                            </p>

                            <p
                              style="
                                margin:9px 0 0;
                                font-size:21px;
                                line-height:1.3;
                                font-weight:700;
                                color:#111111;
                              "
                            >
                              ${safeOrderNumber}
                            </p>
                          </td>

                          <td
                            valign="top"
                            align="right"
                          >
                            <p
                              style="
                                margin:0;
                                font-size:10px;
                                font-weight:700;
                                letter-spacing:1.7px;
                                text-transform:uppercase;
                                color:#777777;
                              "
                            >
                              Updated
                            </p>

                            <p
                              style="
                                margin:9px 0 0;
                                font-size:12px;
                                line-height:1.5;
                                color:#555555;
                              "
                            >
                              ${escapeHtml(formatStatusDate(input.updatedAt))}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin-top:30px;">
                      <p
                        style="
                          margin:0 0 18px;
                          font-size:10px;
                          font-weight:700;
                          letter-spacing:1.8px;
                          text-transform:uppercase;
                          color:#777777;
                        "
                      >
                        ${input.fulfillmentMethod === "pickup" ? "Pickup progress" : "Delivery progress"}
                      </p>

                      ${buildProgressHtml(input.status, input.fulfillmentMethod)}
                    </div>

                    <div
                      style="
                        margin-top:30px;
                        padding:19px;
                        background:#f7f7f5;
                      "
                    >
                      <p
                        style="
                          margin:0;
                          font-size:10px;
                          font-weight:700;
                          letter-spacing:1.7px;
                          text-transform:uppercase;
                          color:#777777;
                        "
                      >
                        What happens next?
                      </p>

                      <p
                        style="
                          margin:11px 0 0;
                          font-size:13px;
                          line-height:1.75;
                          color:#555555;
                        "
                      >
                        ${escapeHtml(statusContent.nextStep)}
                      </p>
                    </div>

                    <div style="margin-top:31px;">
                      <p
                        style="
                          margin:0 0 18px;
                          font-size:10px;
                          font-weight:700;
                          letter-spacing:1.8px;
                          text-transform:uppercase;
                          color:#777777;
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
                    </div>

                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        margin-top:29px;
                        border-top:1px solid #e5e5e5;
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding:19px 0 0;
                            font-size:13px;
                            color:#777777;
                          "
                        >
                          Subtotal
                        </td>

                        <td
                          align="right"
                          style="
                            padding:19px 0 0;
                            font-size:13px;
                            font-weight:700;
                            color:#444444;
                          "
                        >
                          ${money(safeSubtotal)}
                        </td>
                      </tr>

                      ${discountSummaryHtml}

                      <tr>
                        <td
                          style="
                            padding:18px 0 0;
                            font-size:15px;
                            font-weight:700;
                            color:#111111;
                          "
                        >
                          Order total
                        </td>

                        <td
                          align="right"
                          style="
                            padding:18px 0 0;
                            font-size:20px;
                            font-weight:700;
                            color:#111111;
                          "
                        >
                          ${money(input.total)}
                        </td>
                      </tr>
                    </table>

                    ${accountButton}

                    <p
                      style="
                        margin:28px 0 0;
                        font-size:12px;
                        line-height:1.7;
                        color:#888888;
                        text-align:center;
                      "
                    >
                      Keep your order number for
                      any communication about
                      your purchase.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:22px 32px;
                      border-top:1px solid #e5e5e5;
                      text-align:center;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        font-size:11px;
                        line-height:1.6;
                        color:#999999;
                      "
                    >
                      © Stereophonie. Selected
                      consumer electronics and technology.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

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
