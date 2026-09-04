import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export type OrderReceiptCustomer = {
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

export type OrderReceiptItem = {
  name: string;
  sku?: string | null;
  configuration?: string | null;
  quantity: number;
  unitPrice: number;
};

export type OrderReceiptInput = {
  orderNumber: string;
  createdAt?: string | null;
  fulfillmentMethod: "delivery" | "pickup";
  paymentMethod?: "cash_on_delivery" | null;
  customer: OrderReceiptCustomer;
  items: OrderReceiptItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string | null;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const MUSTARD = rgb(253 / 255, 183 / 255, 62 / 255);
const TEXT = rgb(29 / 255, 29 / 255, 31 / 255);
const SECONDARY = rgb(110 / 255, 110 / 255, 115 / 255);
const BORDER = rgb(229 / 255, 229 / 255, 231 / 255);
const SOFT = rgb(247 / 255, 247 / 255, 248 / 255);
const WHITE = rgb(1, 1, 1);

function money(value: number) {
  return `$${Math.max(0, Number(value) || 0).toFixed(2)}`;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function receiptDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function paymentLabel(
  method: OrderReceiptInput["paymentMethod"],
  fulfillmentMethod: OrderReceiptInput["fulfillmentMethod"],
) {
  if (method === "cash_on_delivery") {
    return fulfillmentMethod === "pickup"
      ? "Cash at pickup"
      : "Cash on delivery";
  }

  return fulfillmentMethod === "pickup"
    ? "Payment at pickup"
    : "Payment on delivery";
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  let shortened = text;

  while (
    shortened.length > 1 &&
    font.widthOfTextAtSize(`${shortened}...`, size) > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }

  return `${shortened}...`;
}

function drawRoundedCard(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 1,
  });
}

async function loadLogoBytes() {
  try {
    return await readFile(
      path.join(
        process.cwd(),
        "public",
        "brand",
        "stereophonie-store-logo.png",
      ),
    );
  } catch {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.SITE_URL?.trim() ||
      "https://stereophoniestore.com";

    const response = await fetch(
      `${siteUrl.replace(/\/+$/, "")}/brand/stereophonie-store-logo.png`,
    );

    if (!response.ok) {
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  }
}

export async function buildOrderReceiptPdf(input: OrderReceiptInput) {
  const pdf = await PDFDocument.create();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const margin = 42;
  const contentWidth = PAGE_WIDTH - margin * 2;

  let cursorY = PAGE_HEIGHT - 44;

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cursorY = PAGE_HEIGHT - 44;
  };

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 48) {
      addPage();
    }
  };

  const logoBytes = await loadLogoBytes();

  if (logoBytes) {
    try {
      const logo = await pdf.embedPng(logoBytes);

      const logoWidth = 205;
      const logoHeight = logoWidth * (logo.height / logo.width);

      page.drawImage(logo, {
        x: (PAGE_WIDTH - logoWidth) / 2,
        y: cursorY - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });

      cursorY -= logoHeight + 30;
    } catch {
      cursorY -= 8;
    }
  }

  page.drawText("ORDER RECEIPT", {
    x: margin,
    y: cursorY,
    size: 9,
    font: bold,
    color: rgb(122 / 255, 75 / 255, 0),
  });

  page.drawText("Thank you for your order.", {
    x: margin,
    y: cursorY - 34,
    size: 28,
    font: bold,
    color: TEXT,
  });

  cursorY -= 68;

  drawRoundedCard(page, margin, cursorY - 92, contentWidth, 92);

  page.drawText("ORDER NUMBER", {
    x: margin + 18,
    y: cursorY - 22,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  page.drawText(clean(input.orderNumber), {
    x: margin + 18,
    y: cursorY - 43,
    size: 13,
    font: bold,
    color: TEXT,
  });

  page.drawText("ORDER DATE", {
    x: margin + 290,
    y: cursorY - 22,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  page.drawText(receiptDate(input.createdAt), {
    x: margin + 290,
    y: cursorY - 43,
    size: 11,
    font: regular,
    color: TEXT,
  });

  page.drawText("FULFILLMENT", {
    x: margin + 18,
    y: cursorY - 68,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  page.drawText(
    input.fulfillmentMethod === "pickup" ? "Store pickup" : "Delivery",
    {
      x: margin + 92,
      y: cursorY - 68,
      size: 10,
      font: bold,
      color: TEXT,
    },
  );

  page.drawText("PAYMENT", {
    x: margin + 290,
    y: cursorY - 68,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  page.drawText(paymentLabel(input.paymentMethod, input.fulfillmentMethod), {
    x: margin + 350,
    y: cursorY - 68,
    size: 10,
    font: bold,
    color: TEXT,
  });

  cursorY -= 116;

  page.drawText("CUSTOMER", {
    x: margin,
    y: cursorY,
    size: 9,
    font: bold,
    color: SECONDARY,
  });

  cursorY -= 20;

  const customerName = [
    clean(input.customer.firstName),
    clean(input.customer.lastName),
  ]
    .filter(Boolean)
    .join(" ");

  const customerLines = [
    customerName,
    clean(input.customer.email),
    clean(input.customer.phone),
  ].filter(Boolean);

  if (input.fulfillmentMethod === "delivery") {
    const addressLines = [
      clean(input.customer.address),
      [
        clean(input.customer.building),
        clean(input.customer.floor)
          ? `Floor ${clean(input.customer.floor)}`
          : "",
      ]
        .filter(Boolean)
        .join(", "),
      [
        clean(input.customer.area),
        clean(input.customer.city),
        clean(input.customer.country),
      ]
        .filter(Boolean)
        .join(", "),
    ].filter(Boolean);

    customerLines.push(...addressLines);
  } else {
    customerLines.push("Pickup location: Stereophonie Store, Mtaileb, Lebanon");
  }

  const customerCardHeight =
    28 +
    customerLines.length * 16 +
    (clean(input.customer.deliveryNotes) &&
    input.fulfillmentMethod === "delivery"
      ? 36
      : 0);

  drawRoundedCard(
    page,
    margin,
    cursorY - customerCardHeight,
    contentWidth,
    customerCardHeight,
  );

  let customerY = cursorY - 22;

  for (let index = 0; index < customerLines.length; index += 1) {
    page.drawText(
      fitText(customerLines[index], regular, index === 0 ? 11 : 9.5, 465),
      {
        x: margin + 18,
        y: customerY,
        size: index === 0 ? 11 : 9.5,
        font: index === 0 ? bold : regular,
        color: index === 0 ? TEXT : SECONDARY,
      },
    );

    customerY -= 16;
  }

  if (
    input.fulfillmentMethod === "delivery" &&
    clean(input.customer.deliveryNotes)
  ) {
    customerY -= 5;

    page.drawText("Delivery notes:", {
      x: margin + 18,
      y: customerY,
      size: 8.5,
      font: bold,
      color: SECONDARY,
    });

    customerY -= 14;

    page.drawText(
      fitText(clean(input.customer.deliveryNotes), regular, 9, 455),
      {
        x: margin + 18,
        y: customerY,
        size: 9,
        font: regular,
        color: TEXT,
      },
    );
  }

  cursorY -= customerCardHeight + 28;

  ensureSpace(120);

  page.drawText("ITEMS", {
    x: margin,
    y: cursorY,
    size: 9,
    font: bold,
    color: SECONDARY,
  });

  cursorY -= 24;

  page.drawRectangle({
    x: margin,
    y: cursorY - 27,
    width: contentWidth,
    height: 27,
    color: SOFT,
  });

  const columns = {
    item: margin + 12,
    sku: margin + 230,
    qty: margin + 352,
    unit: margin + 395,
    total: margin + 459,
  };

  page.drawText("ITEM", {
    x: columns.item,
    y: cursorY - 18,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  page.drawText("SKU", {
    x: columns.sku,
    y: cursorY - 18,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  page.drawText("QTY", {
    x: columns.qty,
    y: cursorY - 18,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  page.drawText("UNIT", {
    x: columns.unit,
    y: cursorY - 18,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  page.drawText("TOTAL", {
    x: columns.total,
    y: cursorY - 18,
    size: 8,
    font: bold,
    color: SECONDARY,
  });

  cursorY -= 27;

  for (const item of input.items) {
    ensureSpace(58);

    const rowHeight = item.configuration ? 50 : 39;
    const lineTotal =
      Math.max(0, Number(item.unitPrice) || 0) *
      Math.max(1, Math.trunc(Number(item.quantity) || 1));

    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: margin + contentWidth, y: cursorY },
      thickness: 0.6,
      color: BORDER,
    });

    page.drawText(fitText(clean(item.name) || "Product", bold, 9.5, 205), {
      x: columns.item,
      y: cursorY - 18,
      size: 9.5,
      font: bold,
      color: TEXT,
    });

    if (clean(item.configuration)) {
      page.drawText(fitText(clean(item.configuration), regular, 8.5, 205), {
        x: columns.item,
        y: cursorY - 34,
        size: 8.5,
        font: regular,
        color: SECONDARY,
      });
    }

    page.drawText(fitText(clean(item.sku) || "-", regular, 8.5, 106), {
      x: columns.sku,
      y: cursorY - 18,
      size: 8.5,
      font: regular,
      color: SECONDARY,
    });

    page.drawText(String(Math.max(1, item.quantity)), {
      x: columns.qty,
      y: cursorY - 18,
      size: 9,
      font: regular,
      color: TEXT,
    });

    page.drawText(money(item.unitPrice), {
      x: columns.unit,
      y: cursorY - 18,
      size: 9,
      font: regular,
      color: TEXT,
    });

    page.drawText(money(lineTotal), {
      x: columns.total,
      y: cursorY - 18,
      size: 9,
      font: bold,
      color: TEXT,
    });

    cursorY -= rowHeight;
  }

  cursorY -= 18;
  ensureSpace(175);

  const totalsX = margin + 300;
  const valuesX = margin + 440;

  const drawTotalRow = (label: string, value: string, boldRow = false) => {
    page.drawText(label, {
      x: totalsX,
      y: cursorY,
      size: boldRow ? 11 : 9.5,
      font: boldRow ? bold : regular,
      color: boldRow ? TEXT : SECONDARY,
    });

    page.drawText(value, {
      x: valuesX,
      y: cursorY,
      size: boldRow ? 12 : 9.5,
      font: boldRow ? bold : regular,
      color: TEXT,
    });

    cursorY -= boldRow ? 26 : 20;
  };

  drawTotalRow("Subtotal", money(input.subtotal));

  if (Math.max(0, Number(input.discountAmount) || 0) > 0) {
    const coupon = clean(input.couponCode);

    drawTotalRow(
      coupon ? `Discount (${coupon})` : "Discount",
      `-${money(input.discountAmount)}`,
    );
  }

  drawTotalRow(
    "Delivery",
    input.fulfillmentMethod === "pickup" ? "Free" : money(input.deliveryFee),
  );

  cursorY -= 2;

  page.drawLine({
    start: { x: totalsX, y: cursorY + 10 },
    end: { x: margin + contentWidth, y: cursorY + 10 },
    thickness: 1,
    color: BORDER,
  });

  drawTotalRow("Total", money(input.total), true);

  page.drawText("Taxes are included where applicable.", {
    x: totalsX,
    y: cursorY + 4,
    size: 8,
    font: regular,
    color: SECONDARY,
  });

  cursorY -= 36;
  ensureSpace(90);

  page.drawRectangle({
    x: margin,
    y: cursorY - 64,
    width: contentWidth,
    height: 64,
    color: rgb(1, 247 / 255, 232 / 255),
    borderColor: MUSTARD,
    borderWidth: 0.7,
  });

  page.drawText(
    input.fulfillmentMethod === "pickup"
      ? "Store pickup"
      : "Delivery information",
    {
      x: margin + 16,
      y: cursorY - 22,
      size: 9,
      font: bold,
      color: TEXT,
    },
  );

  page.drawText(
    input.fulfillmentMethod === "pickup"
      ? "Stereophonie Store - Mtaileb, Lebanon"
      : [
          clean(input.customer.area),
          clean(input.customer.city),
          clean(input.customer.country),
        ]
          .filter(Boolean)
          .join(", "),
    {
      x: margin + 16,
      y: cursorY - 42,
      size: 9,
      font: regular,
      color: SECONDARY,
    },
  );

  cursorY -= 94;
  ensureSpace(55);

  page.drawText("Stereophonie Store", {
    x: margin,
    y: cursorY,
    size: 9,
    font: bold,
    color: TEXT,
  });

  page.drawText("Selected consumer electronics & technology.", {
    x: margin,
    y: cursorY - 16,
    size: 8.5,
    font: regular,
    color: SECONDARY,
  });

  page.drawText(
    "This receipt confirms the order details recorded at checkout.",
    {
      x: margin,
      y: cursorY - 31,
      size: 8,
      font: regular,
      color: SECONDARY,
    },
  );

  const pages = pdf.getPages();

  pages.forEach((currentPage, index) => {
    currentPage.drawText(
      `Receipt ${clean(input.orderNumber)}  |  Page ${index + 1} of ${pages.length}`,
      {
        x: margin,
        y: 24,
        size: 7.5,
        font: regular,
        color: SECONDARY,
      },
    );
  });

  return Buffer.from(await pdf.save());
}
