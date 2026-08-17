import { createClient } from "@/lib/supabase/server";

import AccountAuthClient from "./account-auth-client";
import AccountCommandCenter from "./account-command-center";
import AccountClient, { type CustomerOrder } from "./account-client";
import AccountSettingsClient, {
  type CustomerAddress,
  type CustomerProfile,
} from "./account-settings-client";

type AccountPageProps = {
  searchParams: Promise<{
    mode?: string;
    error?: string;
    message?: string;
  }>;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  delivery_city: string | null;
  delivery_area: string | null;
  coupon_code: string | null;
  subtotal: number | string | null;
  discount_amount: number | string | null;
  delivery_fee: number | string | null;
  total: number | string | null;
  created_at: string;
  status_updated_at: string | null;
};

type OrderItemRow = {
  id: string | number;
  order_id: string;
  product_name: string;
  size: string | null;
  quantity: number;
  unit_price: number | string | null;
  line_total: number | string | null;
};

type ProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  phone_country_code: string;
  phone_number: string;
};

type AddressRow = {
  id: string;
  label: string;
  country: string;
  city: string;
  area: string;
  address_line: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  delivery_instructions: string;
  is_default: boolean;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;

  const mode = params.mode === "register" ? "register" : "login";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AccountAuthClient
        mode={mode}
        error={params.error}
        message={params.message}
      />
    );
  }

  const email = user.email?.trim().toLowerCase() ?? "";

  const metadata = user.user_metadata ?? {};

  const [profileResponse, addressResponse, orderResponse] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select(
        `
          user_id,
          first_name,
          last_name,
          phone_country_code,
          phone_number
        `,
      )
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("customer_addresses")
      .select(
        `
          id,
          label,
          country,
          city,
          area,
          address_line,
          building,
          floor,
          apartment,
          landmark,
          delivery_instructions,
          is_default
        `,
      )
      .eq("user_id", user.id)
      .order("is_default", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("orders")
      .select(
        `
          id,
          order_number,
          status,
          payment_status,
          customer_first_name,
          customer_last_name,
          delivery_city,
          delivery_area,
          coupon_code,
          subtotal,
          discount_amount,
          delivery_fee,
          total,
          created_at,
          status_updated_at
        `,
      )
      .ilike("customer_email", email)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const { data: stockPreferenceData, error: stockPreferenceError } =
    await supabase.rpc("get_my_stock_notification_preference");

  const stockNotificationsEnabled =
    typeof stockPreferenceData === "object" &&
    stockPreferenceData !== null &&
    !Array.isArray(stockPreferenceData) &&
    "notifications_enabled" in stockPreferenceData
      ? stockPreferenceData.notifications_enabled !== false
      : true;

  const profileRow = profileResponse.data as ProfileRow | null;

  const addressRows = (addressResponse.data ?? []) as AddressRow[];

  const orderRows = (orderResponse.data ?? []) as OrderRow[];

  const orderIds = orderRows.map((order) => order.id);

  let itemRows: OrderItemRow[] = [];

  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("order_items")
      .select(
        `
          id,
          order_id,
          product_name,
          size,
          quantity,
          unit_price,
          line_total
        `,
      )
      .in("order_id", orderIds);

    itemRows = (data ?? []) as OrderItemRow[];
  }

  const profile: CustomerProfile = {
    email,
    firstName: profileRow?.first_name ?? String(metadata.first_name ?? ""),
    lastName: profileRow?.last_name ?? String(metadata.last_name ?? ""),
    phoneCountryCode:
      profileRow?.phone_country_code ??
      String(metadata.phone_country_code ?? "+961"),
    phoneNumber: profileRow?.phone_number ?? String(metadata.phone ?? ""),
  };

  const addresses: CustomerAddress[] = addressRows.map((address) => ({
    id: address.id,
    label: address.label,
    country: address.country,
    city: address.city,
    area: address.area,
    address_line: address.address_line,
    building: address.building,
    floor: address.floor,
    apartment: address.apartment,
    landmark: address.landmark,
    delivery_instructions: address.delivery_instructions,
    is_default: address.is_default,
  }));

  const customerOrders: CustomerOrder[] = orderRows.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    customer_first_name: order.customer_first_name,
    customer_last_name: order.customer_last_name,
    delivery_city: order.delivery_city,
    delivery_area: order.delivery_area,
    coupon_code: order.coupon_code,
    subtotal: Number(order.subtotal ?? 0),
    discount_amount: Number(order.discount_amount ?? 0),
    delivery_fee: Number(order.delivery_fee ?? 0),
    total: Number(order.total ?? 0),
    created_at: order.created_at,
    status_updated_at: order.status_updated_at,
    items: itemRows
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        id: item.id,
        product_name: item.product_name,
        size: item.size,
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
        line_total: Number(item.line_total ?? 0),
      })),
  }));

  const firstName = profile.firstName || "Customer";

  const hasAccountDataError =
    Boolean(profileResponse.error) || Boolean(addressResponse.error);

  return (
    <AccountCommandCenter
      firstName={firstName}
      profile={profile}
      addresses={addresses}
      orders={customerOrders}
      stockNotificationsEnabled={stockNotificationsEnabled}
      error={params.error}
      message={params.message}
      hasAccountDataError={hasAccountDataError}
      hasOrderError={Boolean(orderResponse.error)}
      hasStockPreferenceError={Boolean(stockPreferenceError)}
    />
  );
}
