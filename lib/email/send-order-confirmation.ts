import "server-only";

import { Resend } from "resend";

import { buildOrderReceiptPdf } from "@/lib/email/order-receipt-pdf";

import {
  buildCustomerEmailLayout,
  buildEmailButton,
  EMAIL_COLORS,
  getEmailSiteUrl,
} from "@/lib/email/customer-email-ui";

const STEREOPHONIE_STORE_LOCATION_URL =
  "https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic";

const STEREOPHONIE_STORE_LOCATION_LABEL =
  "Stereophonie Store · Mtaileb, Lebanon";

type FulfillmentMethod = "delivery" | "pickup";

type OrderConfirmationCustomer = {
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

type OrderConfirmationItem = {
  name: string;
  size: string;
  sku?: string | null;
  quantity: number;
  imageUrl: string | null;
  unitPrice: number;
};

type SendOrderConfirmationInput = {
  orderNumber: string;
  fulfillmentMethod: FulfillmentMethod;
  customer: OrderConfirmationCustomer;
  items: OrderConfirmationItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string | null;
  createdAt?: string | null;
  paymentMethod?: "cash_on_delivery" | null;
  receiptToken?: string | null;
};

export type SendOrderConfirmationResult =
  | {
      success: true;
      emailId: string | null;
    }
  | {
      success: false;
      message: string;
    };

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

function money(value: number) {
  const normalizedValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return `$${normalizedValue.toFixed(2)}`;
}

function buildAddress(customer: OrderConfirmationCustomer) {
  return [
    customer.address,

    customer.building ? `Building: ${customer.building}` : "",

    customer.floor ? `Floor or apartment: ${customer.floor}` : "",

    customer.area,
    customer.city,
    customer.country || "Lebanon",
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br />");
}

function buildProductRows(items: OrderConfirmationItem[]) {
  return items
    .map((item, index) => {
      const productName = escapeHtml(item.name.trim() || "Product");
      const productSize = item.size.trim() ? escapeHtml(item.size) : "";
      const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const lineTotal = unitPrice * quantity;
      const imageUrl = safeImageUrl(item.imageUrl);

      const imageContent = imageUrl
        ? `
          <img
            src="${imageUrl}"
            alt="${productName}"
            width="96"
            height="112"
            style="
              display:block;
              width:96px;
              height:112px;
              border:0;
              border-radius:16px;
              background:${EMAIL_COLORS.soft};
              object-fit:cover;
            "
          />
        `
        : `
          <table
            role="presentation"
            width="96"
            height="112"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width:96px;
              height:112px;
              border-radius:16px;
              background:${EMAIL_COLORS.soft};
            "
          >
            <tr>
              <td
                align="center"
                valign="middle"
                style="
                  padding:8px;
                  color:${EMAIL_COLORS.tertiaryText};
                  font-size:9px;
                  font-weight:700;
                  letter-spacing:0.8px;
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
          <td
            style="
              padding:${index === 0 ? "0" : "12px 0 0"};
            "
          >
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
                  width="96"
                  valign="middle"
                  style="
                    width:96px;
                    padding:12px;
                  "
                >
                  ${imageContent}
                </td>

                <td
                  valign="middle"
                  style="
                    padding:17px 18px 17px 4px;
                  "
                >
                  <p
                    style="
                      margin:0;
                      color:${EMAIL_COLORS.text};
                      font-size:15px;
                      line-height:1.4;
                      font-weight:700;
                    "
                  >
                    ${productName}
                  </p>

                  <p
                    style="
                      margin:7px 0 0;
                      color:${EMAIL_COLORS.secondaryText};
                      font-size:12px;
                      line-height:1.55;
                    "
                  >
                    ${productSize ? `Size ${productSize} · ` : ""}
                    Qty ${quantity}
                  </p>

                  <p
                    style="
                      margin:10px 0 0;
                      color:${EMAIL_COLORS.text};
                      font-size:14px;
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

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationInput,
): Promise<SendOrderConfirmationResult> {
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

  const customerEmail = input.customer.email.trim().toLowerCase();

  if (!customerEmail) {
    return {
      success: false,
      message: "The customer email address is missing.",
    };
  }

  const resend = new Resend(apiKey);

  const customerName = [input.customer.firstName, input.customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const safeCustomerName = escapeHtml(customerName || "Customer");

  const safeOrderNumber = escapeHtml(input.orderNumber);

  const productRows = buildProductRows(input.items);

  const normalizedDiscountAmount = Math.max(
    0,
    Number(input.discountAmount) || 0,
  );

  const normalizedCouponCode = input.couponCode?.trim().toUpperCase() ?? "";

  const discountRow =
    normalizedDiscountAmount > 0
      ? `
        <tr>
          <td
            style="
              padding:12px 0;
              color:#16794b;
              font-size:14px;
            "
          >
            Discount${
              normalizedCouponCode
                ? ` (${escapeHtml(normalizedCouponCode)})`
                : ""
            }
          </td>

          <td
            style="
              padding:12px 0;
              text-align:right;
              color:#16794b;
              font-size:14px;
              font-weight:700;
            "
          >
            −${money(normalizedDiscountAmount)}
          </td>
        </tr>
      `
      : "";

  const deliveryRow =
    input.fulfillmentMethod === "pickup"
      ? `
        <tr>
          <td
            style="
              padding:12px 0;
              color:#666666;
              font-size:14px;
            "
          >
            Store pickup
          </td>

          <td
            style="
              padding:12px 0;
              text-align:right;
              color:#111111;
              font-size:14px;
              font-weight:600;
            "
          >
            Free
          </td>
        </tr>
      `
      : `
        <tr>
          <td
            style="
              padding:12px 0;
              color:#666666;
              font-size:14px;
            "
          >
            Delivery
          </td>

          <td
            style="
              padding:12px 0;
              text-align:right;
              font-size:14px;
              font-weight:600;
            "
          >
            ${money(input.deliveryFee)}
          </td>
        </tr>
      `;

  const fulfillmentDetails =
    input.fulfillmentMethod === "pickup"
      ? `
        <div
          style="
            margin-top:24px;
            padding:20px;
            border:1px solid #ece7dd;
            border-radius:18px;
            background:#fffaf1;
          "
        >
          <p
            style="
              margin:0;
              font-size:10px;
              font-weight:700;
              letter-spacing:1.6px;
              text-transform:uppercase;
              color:#9a6508;
            "
          >
            Store pickup
          </p>

          <p
            style="
              margin:9px 0 0;
              font-size:17px;
              line-height:1.4;
              font-weight:700;
              color:#111111;
            "
          >
            Your order will be ready for collection
          </p>

          <p
            style="
              margin:7px 0 0;
              font-size:14px;
              line-height:1.7;
              color:#666666;
            "
          >
            We will contact you when your order is ready. You can then collect
            it directly from Stereophonie Store.
          </p>

          <p
            style="
              margin:14px 0 0;
              font-size:14px;
              line-height:1.6;
              color:#333333;
            "
          >
            ${escapeHtml(STEREOPHONIE_STORE_LOCATION_LABEL)}
          </p>

          <a
            href="${escapeHtml(STEREOPHONIE_STORE_LOCATION_URL)}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:inline-block;
              margin-top:16px;
              padding:11px 17px;
              border:1px solid #e4ad43;
              border-radius:999px;
              background:#fdb73e;
              color:#1d1d1f;
              font-size:11px;
              font-weight:700;
              letter-spacing:1px;
              text-decoration:none;
              text-transform:uppercase;
            "
          >
            View store location
          </a>
        </div>
      `
      : `
        <div
          style="
            margin-top:24px;
            padding:20px;
            border:1px solid #e8e8e8;
            border-radius:18px;
            background:#fafafa;
          "
        >
          <p
            style="
              margin:0 0 8px;
              font-size:10px;
              font-weight:700;
              letter-spacing:1.6px;
              text-transform:uppercase;
              color:#777777;
            "
          >
            Delivery address
          </p>

          <p
            style="
              margin:0;
              font-size:14px;
              line-height:1.7;
              color:#444444;
            "
          >
            ${buildAddress(input.customer)}
          </p>
        </div>
      `;

  const deliveryNotes =
    input.fulfillmentMethod === "delivery" &&
    input.customer.deliveryNotes.trim()
      ? `
        <div
          style="
            margin-top:24px;
            padding:20px 21px;
            border:1px solid ${EMAIL_COLORS.border};
            border-radius:20px;
            background:${EMAIL_COLORS.soft};
            overflow:hidden;
          "
        >
          <p
            style="
              margin:0 0 9px;
              font-size:10px;
              font-weight:700;
              letter-spacing:1.1px;
              text-transform:uppercase;
              color:${EMAIL_COLORS.secondaryText};
            "
          >
            Delivery instructions
          </p>

          <p
            style="
              margin:0;
              white-space:pre-line;
              font-size:14px;
              line-height:1.7;
              color:#555555;
            "
          >
            ${escapeHtml(input.customer.deliveryNotes)}
          </p>
        </div>
      `
      : "";

  const shopUrl = `${getEmailSiteUrl()}/shop`;
  const accountUrl = `${getEmailSiteUrl()}/account`;

  const receiptToken = input.receiptToken?.trim() ?? "";

  const receiptUrl = receiptToken
    ? `${getEmailSiteUrl()}/order-receipt/${encodeURIComponent(receiptToken)}`
    : "";

  const fulfillmentLabel =
    input.fulfillmentMethod === "pickup" ? "Store pickup" : "Delivery";

  const paymentLabel =
    input.fulfillmentMethod === "pickup"
      ? "Cash at pickup"
      : "Cash on delivery";

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
            padding:52px 34px 30px;
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
            Order confirmed
          </div>

          <h1
            style="
              margin:21px auto 0;
              max-width:470px;
              color:${EMAIL_COLORS.text};
              font-size:38px;
              line-height:1.08;
              font-weight:700;
              letter-spacing:-1.5px;
            "
          >
            Thanks, ${safeCustomerName}.
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
            We received your order and will keep you updated
            as it moves through the process.
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
                style="
                  padding:21px 22px;
                  border-bottom:1px solid ${EMAIL_COLORS.border};
                "
              >
                <p
                  style="
                    margin:0;
                    color:${EMAIL_COLORS.tertiaryText};
                    font-size:10px;
                    line-height:14px;
                    font-weight:700;
                    letter-spacing:1.3px;
                    text-transform:uppercase;
                  "
                >
                  Order number
                </p>

                <p
                  style="
                    margin:7px 0 0;
                    color:${EMAIL_COLORS.text};
                    font-size:20px;
                    line-height:26px;
                    font-weight:700;
                  "
                >
                  ${safeOrderNumber}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 22px;">
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  <tr>
                    <td
                      width="50%"
                      valign="top"
                      style="
                        width:50%;
                        padding-right:10px;
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
                        Fulfillment
                      </p>

                      <p
                        style="
                          margin:7px 0 0;
                          color:${EMAIL_COLORS.text};
                          font-size:13px;
                          line-height:19px;
                          font-weight:700;
                        "
                      >
                        ${fulfillmentLabel}
                      </p>
                    </td>

                    <td
                      width="50%"
                      valign="top"
                      style="
                        width:50%;
                        padding-left:10px;
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
                        Payment
                      </p>

                      <p
                        style="
                          margin:7px 0 0;
                          color:${EMAIL_COLORS.text};
                          font-size:13px;
                          line-height:19px;
                          font-weight:700;
                        "
                      >
                        ${paymentLabel}
                      </p>
                    </td>
                  </tr>
                </table>
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
            Your items
          </p>

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
          >
            ${productRows}
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
                      ${money(input.subtotal)}
                    </td>
                  </tr>

                  ${discountRow}
                  ${deliveryRow}

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
                      Total
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
        <td style="padding:0 34px;">
          ${fulfillmentDetails}
          ${deliveryNotes}
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
              <td style="padding:22px;">
                <p
                  style="
                    margin:0;
                    color:${EMAIL_COLORS.text};
                    font-size:15px;
                    line-height:20px;
                    font-weight:700;
                  "
                >
                  What happens next?
                </p>

                <p
                  style="
                    margin:10px 0 0;
                    color:${EMAIL_COLORS.secondaryText};
                    font-size:13px;
                    line-height:1.75;
                  "
                >
                  ${
                    input.fulfillmentMethod === "pickup"
                      ? "We’ll prepare your order and contact you when it is ready to collect from Stereophonie Store in Mtaileb. Payment is made when you pick it up."
                      : "We’ll prepare your order and contact you as it moves toward delivery. Payment is made in cash when your order arrives."
                  }
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${
        receiptUrl
          ? `
      <tr>
        <td style="padding:30px 34px 0;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              background:${EMAIL_COLORS.mustardSoft};
              border:1px solid #f2d38f;
              border-radius:20px;
            "
          >
            <tr>
              <td style="padding:24px 22px;">
                <p
                  style="
                    margin:0;
                    color:${EMAIL_COLORS.mustardText};
                    font-size:11px;
                    line-height:16px;
                    font-weight:700;
                    text-transform:uppercase;
                    letter-spacing:.08em;
                  "
                >
                  RECEIPT
                </p>

                <p
                  style="
                    margin:7px 0 0;
                    color:${EMAIL_COLORS.text};
                    font-size:17px;
                    line-height:22px;
                    font-weight:700;
                  "
                >
                  Your order receipt
                </p>

                <p
                  style="
                    margin:8px 0 0;
                    color:${EMAIL_COLORS.secondaryText};
                    font-size:13px;
                    line-height:20px;
                  "
                >
                  Your complete purchase document with products, SKUs,
                  quantities, pricing, payment and fulfillment details.
                </p>

                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="margin-top:20px;"
                >
                  <tr>
                    <td>
                      ${buildEmailButton({
                        href: receiptUrl,
                        label: "View your order receipt",
                      })}
                    </td>
                  </tr>
                </table>

                <p
                  style="
                    margin:13px 0 0;
                    color:${EMAIL_COLORS.tertiaryText};
                    font-size:10px;
                    line-height:16px;
                  "
                >
                  A PDF copy is also attached to this email for your records.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `
          : ""
      }

      <tr>
        <td style="padding:30px 34px 0;">
          ${buildEmailButton({
            href: accountUrl,
            label: "View my orders",
          })}
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

          <p
            style="
              margin:8px 0 0;
              color:${EMAIL_COLORS.tertiaryText};
              font-size:11px;
              line-height:18px;
            "
          >
            Want to keep browsing?
            <a
              href="${escapeHtml(shopUrl)}"
              style="
                color:${EMAIL_COLORS.text};
                font-weight:700;
                text-decoration:underline;
              "
            >
              Visit the store
            </a>
          </p>
        </td>
      </tr>
    </table>
  `;

  const html = buildCustomerEmailLayout({
    title: `Order ${input.orderNumber} confirmed — Stereophonie`,
    previewText: `We received order ${input.orderNumber}.`,
    content,
  });

  const receiptPdf = await buildOrderReceiptPdf({
    orderNumber: input.orderNumber,
    createdAt: input.createdAt,
    fulfillmentMethod: input.fulfillmentMethod,
    paymentMethod: input.paymentMethod,
    customer: input.customer,
    items: input.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      configuration: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    subtotal: input.subtotal,
    discountAmount: input.discountAmount,
    deliveryFee: input.deliveryFee,
    total: input.total,
    couponCode: input.couponCode,
  });

  const receiptFilename = `Stereophonie-Receipt-${input.orderNumber.replace(
    /[^a-zA-Z0-9_-]+/g,
    "-",
  )}.pdf`;

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [customerEmail],
    subject: `Order ${input.orderNumber} received — Stereophonie`,
    html,
    attachments: [
      {
        filename: receiptFilename,
        content: receiptPdf,
      },
    ],
  });

  if (error) {
    return {
      success: false,
      message: error.message || "The confirmation email could not be sent.",
    };
  }

  return {
    success: true,
    emailId: data?.id ?? null,
  };
}
