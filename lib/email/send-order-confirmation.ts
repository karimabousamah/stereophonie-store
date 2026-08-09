import "server-only";

import { Resend } from "resend";

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
  quantity: number;
  imageUrl: string | null;
  unitPrice: number;
};

type SendOrderConfirmationInput = {
  orderNumber: string;
  customer: OrderConfirmationCustomer;
  items: OrderConfirmationItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string | null;
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
            width="104"
            height="130"
            style="
              display:block;
              width:104px;
              height:130px;
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
              width:104px;
              height:130px;
              background:#f1f1ef;
              color:#999999;
              text-align:center;
            "
          >
            <div
              style="
                display:table-cell;
                vertical-align:middle;
                font-size:10px;
                font-weight:700;
                letter-spacing:1px;
                text-transform:uppercase;
              "
            >
              Nita Style
            </div>
          </div>
        `;

      return `
        <tr>
          <td
            style="
              padding:${index === 0 ? "0 0 20px" : "20px 0"};
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
                  width="104"
                  valign="top"
                  style="width:104px;"
                >
                  ${imageContent}
                </td>

                <td
                  valign="top"
                  style="
                    padding-left:18px;
                    vertical-align:top;
                  "
                >
                  <p
                    style="
                      margin:0;
                      font-size:16px;
                      line-height:1.4;
                      font-weight:700;
                      color:#111111;
                    "
                  >
                    ${productName}
                  </p>

                  <p
                    style="
                      margin:10px 0 0;
                      font-size:12px;
                      line-height:1.6;
                      color:#777777;
                    "
                  >
                    ${productSize ? `Size ${productSize}<br />` : ""}
                    Quantity ${quantity}
                  </p>

                  <p
                    style="
                      margin:14px 0 0;
                      font-size:15px;
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
    input.deliveryFee > 0
      ? `
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
              color:#777777;
              font-size:14px;
            "
          >
            Confirmed later
          </td>
        </tr>
      `;

  const deliveryNotes = input.customer.deliveryNotes.trim()
    ? `
        <div
          style="
            margin-top:24px;
            padding:18px;
            border:1px solid #e5e5e5;
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
          Order confirmation
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
                      padding:28px 32px;
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
                      Nita Style
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:40px 32px;
                      background:#0a0a0a;
                      color:#ffffff;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        font-size:10px;
                        font-weight:700;
                        letter-spacing:2px;
                        text-transform:uppercase;
                        color:#8ee4b0;
                      "
                    >
                      Order received
                    </p>

                    <h1
                      style="
                        margin:14px 0 0;
                        font-size:36px;
                        line-height:1.05;
                        letter-spacing:-1.5px;
                      "
                    >
                      Thank you,
                      <br />
                      ${safeCustomerName}
                    </h1>

                    <p
                      style="
                        margin:22px 0 0;
                        font-size:14px;
                        line-height:1.8;
                        color:#bdbdbd;
                      "
                    >
                      Your order was submitted successfully.
                      Nita Style will review it and contact you
                      to confirm delivery and payment.
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
                      <p
                        style="
                          margin:0;
                          font-size:10px;
                          font-weight:700;
                          letter-spacing:1.8px;
                          text-transform:uppercase;
                          color:#777777;
                        "
                      >
                        Order number
                      </p>

                      <p
                        style="
                          margin:10px 0 0;
                          font-size:24px;
                          font-weight:700;
                        "
                      >
                        ${safeOrderNumber}
                      </p>
                    </div>

                    <div style="margin-top:32px;">
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
                        Your order
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
                    </div>

                    <div
                      style="
                        margin-top:30px;
                        padding-top:28px;
                        border-top:1px solid #e5e5e5;
                      "
                    >
                      <p
                        style="
                          margin:0 0 14px;
                          font-size:10px;
                          font-weight:700;
                          letter-spacing:1.8px;
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
                          line-height:1.8;
                          color:#444444;
                        "
                      >
                        ${buildAddress(input.customer)}
                      </p>
                    </div>

                    ${deliveryNotes}

                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        margin-top:28px;
                        border-top:1px solid #e5e5e5;
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding:18px 0 12px;
                            color:#666666;
                            font-size:14px;
                          "
                        >
                          Subtotal
                        </td>

                        <td
                          style="
                            padding:18px 0 12px;
                            text-align:right;
                            font-size:14px;
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
                            padding:18px 0 0;
                            border-top:1px solid #e5e5e5;
                            font-size:16px;
                            font-weight:700;
                          "
                        >
                          Current total
                        </td>

                        <td
                          style="
                            padding:18px 0 0;
                            border-top:1px solid #e5e5e5;
                            text-align:right;
                            font-size:20px;
                            font-weight:700;
                          "
                        >
                          ${money(input.total)}
                        </td>
                      </tr>
                    </table>

                    <div
                      style="
                        margin-top:32px;
                        padding:20px;
                        background:#f7f7f5;
                      "
                    >
                      <p
                        style="
                          margin:0;
                          font-size:10px;
                          font-weight:700;
                          letter-spacing:1.6px;
                          text-transform:uppercase;
                          color:#777777;
                        "
                      >
                        What happens next?
                      </p>

                      <p
                        style="
                          margin:14px 0 0;
                          font-size:13px;
                          line-height:1.8;
                          color:#555555;
                        "
                      >
                        1. Nita Style reviews your order.<br />
                        2. You are contacted to confirm delivery.<br />
                        3. Payment arrangements are confirmed.
                      </p>
                    </div>

                    <p
                      style="
                        margin:32px 0 0;
                        font-size:12px;
                        line-height:1.7;
                        color:#888888;
                        text-align:center;
                      "
                    >
                      Keep your order number for any
                      communication about your purchase.
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
                        color:#999999;
                      "
                    >
                      © Nita Style. Selected Italian
                      women’s apparel.
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

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [customerEmail],
    subject: `Order ${input.orderNumber} received — Nita Style`,
    html,
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
