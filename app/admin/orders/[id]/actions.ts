"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  sendOrderStatusUpdateEmail,
  type OrderStatusUpdateStatus,
} from "@/lib/email/send-order-status-update";
import { createClient } from "@/lib/supabase/server";

const orderStatuses = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

const paymentStatuses = ["unpaid", "paid", "refunded"] as const;

type OrderStatus = (typeof orderStatuses)[number];

type PaymentStatus = (typeof paymentStatuses)[number];

type ActionResult = {
  success: boolean;
  message: string;
};

type OrderItemRow = {
  product_name: string;
  product_image_url: string | null;
  size: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type OrderNotificationRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  fulfillment_method: "delivery" | "pickup";
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  subtotal: number;
  discount_amount: number;
  coupon_code: string | null;
  total: number;
  order_items: OrderItemRow[];
};

async function getAuthorizedAdmin() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (error || !admin?.is_active) {
    redirect("/admin/login");
  }

  return supabase;
}

function refreshOrderPages(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);

  revalidatePath("/admin/orders");
  revalidatePath("/admin/best-selling");
  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath("/track-order");
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult> {
  if (!orderStatuses.includes(status)) {
    return {
      success: false,
      message: "The selected order status is invalid.",
    };
  }

  const supabase = await getAuthorizedAdmin();

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      status,
      fulfillment_method,
      customer_first_name,
      customer_last_name,
      customer_email,
      subtotal,
      discount_amount,
      coupon_code,
      total,
      order_items (
        product_name,
        product_image_url,
        size,
        quantity,
        unit_price,
        line_total
      )
    `,
    )
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    return {
      success: false,
      message: orderError?.message || "The order could not be found.",
    };
  }

  const order = orderData as OrderNotificationRow;

  const fulfillmentMethod =
    order.fulfillment_method === "pickup" ? "pickup" : "delivery";

  if (fulfillmentMethod === "pickup" && status === "out_for_delivery") {
    return {
      success: false,
      message: "Store pickup orders cannot be marked out for delivery.",
    };
  }

  if (fulfillmentMethod === "delivery" && status === "ready_for_pickup") {
    return {
      success: false,
      message: "Delivery orders cannot be marked ready for pickup.",
    };
  }

  if (order.status === status) {
    refreshOrderPages(orderId);

    return {
      success: true,
      message: "The order already has this status.",
    };
  }

  const updatedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status,
      status_updated_at: updatedAt,
    })
    .eq("id", orderId);

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  refreshOrderPages(orderId);

  const emailResult = await sendOrderStatusUpdateEmail({
    orderNumber: order.order_number,

    status: status as OrderStatusUpdateStatus,

    fulfillmentMethod,

    customerFirstName: order.customer_first_name,

    customerLastName: order.customer_last_name,

    customerEmail: order.customer_email,

    subtotal: Number(order.subtotal ?? 0),

    discountAmount: Number(order.discount_amount ?? 0),

    couponCode: order.coupon_code,

    total: Number(order.total ?? 0),

    updatedAt,

    items: (order.order_items ?? []).map((item) => ({
      productName: item.product_name,

      imageUrl: item.product_image_url,

      size: item.size,

      quantity: Number(item.quantity ?? 1),

      unitPrice: Number(item.unit_price ?? 0),

      lineTotal: Number(item.line_total ?? 0),
    })),
  });

  if (!emailResult.success) {
    console.error(
      `Status email failed for order ${order.order_number}:`,
      emailResult.message,
    );

    return {
      success: true,
      message: `Order progress updated, but the customer email could not be sent: ${emailResult.message}`,
    };
  }

  return {
    success: true,
    message: "Order progress updated and the customer was notified by email.",
  };
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
): Promise<ActionResult> {
  if (!paymentStatuses.includes(paymentStatus)) {
    return {
      success: false,
      message: "The selected payment status is invalid.",
    };
  }

  const supabase = await getAuthorizedAdmin();

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus,
    })
    .eq("id", orderId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  refreshOrderPages(orderId);

  return {
    success: true,
    message: "Payment status updated successfully.",
  };
}

export async function saveAdminNotes(
  orderId: string,
  notes: string,
): Promise<ActionResult> {
  const supabase = await getAuthorizedAdmin();

  const cleanNotes = notes.trim().slice(0, 3000);

  const { error } = await supabase
    .from("orders")
    .update({
      admin_notes: cleanNotes.length > 0 ? cleanNotes : null,
    })
    .eq("id", orderId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  refreshOrderPages(orderId);

  return {
    success: true,
    message: "Private admin notes saved.",
  };
}

export async function deleteOrder(orderId: string): Promise<ActionResult> {
  const cleanOrderId = orderId.trim();

  if (!cleanOrderId) {
    return {
      success: false,
      message: "The order could not be identified.",
    };
  }

  const supabase = await getAuthorizedAdmin();

  const { data: order, error: orderLookupError } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("id", cleanOrderId)
    .maybeSingle();

  if (orderLookupError) {
    return {
      success: false,
      message: orderLookupError.message,
    };
  }

  if (!order) {
    return {
      success: false,
      message: "This order no longer exists.",
    };
  }

  const { data: deletedOrder, error: deleteError } = await supabase
    .from("orders")
    .delete()
    .eq("id", cleanOrderId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return {
      success: false,
      message: deleteError.message,
    };
  }

  if (!deletedOrder) {
    return {
      success: false,
      message: "The order was not deleted. Please try again.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${cleanOrderId}`);

  return {
    success: true,
    message: `Order ${order.order_number} was permanently deleted.`,
  };
}
