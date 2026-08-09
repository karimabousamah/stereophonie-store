"use server";

import { createClient } from "@/lib/supabase/server";

type TrackOrderResult =
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      order: {
        order_number: string;
        status:
          | "pending"
          | "confirmed"
          | "preparing"
          | "out_for_delivery"
          | "completed"
          | "cancelled";
        payment_status: "unpaid" | "paid" | "refunded";
        customer_first_name: string;
        customer_last_name: string;
        delivery_city: string;
        delivery_area: string;
        coupon_code: string | null;
        subtotal: number;
        discount_amount: number;
        delivery_fee: number;
        total: number;
        created_at: string;
        status_updated_at: string | null;
        items: {
          id: string;
          product_name: string;
          size: string;
          quantity: number;
          unit_price: number;
          line_total: number;
        }[];
      };
    };

export async function trackOrder(
  orderNumber: string,
  email: string,
): Promise<TrackOrderResult> {
  const cleanOrderNumber = orderNumber.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanOrderNumber || !cleanEmail) {
    return {
      success: false,
      message: "Enter both your order number and email address.",
    };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(cleanEmail)) {
    return {
      success: false,
      message: "Enter a valid email address.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("track_customer_order", {
    p_order_number: cleanOrderNumber,
    p_customer_email: cleanEmail,
  });

  if (error) {
    return {
      success: false,
      message: "The order could not be retrieved. Please try again.",
    };
  }

  if (!data?.success || !data?.order) {
    return {
      success: false,
      message: data?.message || "No order was found with these details.",
    };
  }

  return {
    success: true,
    order: data.order,
  };
}
