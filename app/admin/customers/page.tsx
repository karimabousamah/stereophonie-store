import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import CustomersClient, { type AdminCustomer } from "./customers-client";

type ProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  phone_country_code: string;
  phone_number: string;
};

type AddressRow = {
  user_id: string;
  label: string;
  city: string;
  area: string;
  address_line: string;
  is_default: boolean;
  created_at: string;
};

type OrderRow = {
  customer_user_id: string | null;
  customer_email: string;
  status: string;
  total: number | string | null;
  created_at: string;
};

type PreferenceRow = {
  email: string;
  notifications_enabled: boolean;
};

type AdminRow = {
  user_id: string;
  role: string;
  is_active: boolean;
};

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function readMetadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  return typeof value === "string" ? value.trim() : "";
}

export default async function AdminCustomersPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login");
  }

  let customers: AdminCustomer[] = [];

  let dataError: string | null = null;

  try {
    const adminClient = createAdminClient();

    const [
      usersResponse,
      adminUsersResponse,
      profilesResponse,
      addressesResponse,
      ordersResponse,
      preferencesResponse,
    ] = await Promise.all([
      adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),

      adminClient.from("admin_users").select("user_id, role, is_active"),

      adminClient.from("customer_profiles").select(`
          user_id,
          first_name,
          last_name,
          phone_country_code,
          phone_number
        `),

      adminClient
        .from("customer_addresses")
        .select(
          `
          user_id,
          label,
          city,
          area,
          address_line,
          is_default,
          created_at
        `,
        )
        .order("is_default", {
          ascending: false,
        })
        .order("created_at", {
          ascending: true,
        }),

      adminClient
        .from("orders")
        .select(
          `
          customer_user_id,
          customer_email,
          status,
          total,
          created_at
        `,
        )
        .order("created_at", {
          ascending: false,
        }),

      adminClient.from("stock_notification_preferences").select(`
          email,
          notifications_enabled
        `),
    ]);

    const errors = [
      usersResponse.error?.message,
      adminUsersResponse.error?.message,
      profilesResponse.error?.message,
      addressesResponse.error?.message,
      ordersResponse.error?.message,
      preferencesResponse.error?.message,
    ].filter(Boolean);

    if (errors.length > 0) {
      dataError = "Some customer information could not be loaded completely.";
    }

    const adminByUserId = new Map(
      ((adminUsersResponse.data ?? []) as AdminRow[]).map((row) => [
        row.user_id,
        row,
      ]),
    );

    const profiles = (profilesResponse.data ?? []) as ProfileRow[];

    const addresses = (addressesResponse.data ?? []) as AddressRow[];

    const orders = (ordersResponse.data ?? []) as OrderRow[];

    const preferences = (preferencesResponse.data ?? []) as PreferenceRow[];

    const profileByUserId = new Map(
      profiles.map((profile) => [profile.user_id, profile]),
    );

    const addressesByUserId = new Map<string, AddressRow[]>();

    for (const address of addresses) {
      const existing = addressesByUserId.get(address.user_id) ?? [];

      existing.push(address);

      addressesByUserId.set(address.user_id, existing);
    }

    const preferenceByEmail = new Map(
      preferences.map((preference) => [
        normalizeEmail(preference.email),
        preference.notifications_enabled,
      ]),
    );

    const authUsers = usersResponse.data?.users ?? [];

    customers = authUsers
      .filter((user) => Boolean(normalizeEmail(user.email)))
      .map((user) => {
        const email = normalizeEmail(user.email);

        const adminRecord = adminByUserId.get(user.id);

        const isAdmin = Boolean(adminRecord?.is_active);

        const profile = profileByUserId.get(user.id);

        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

        const firstName =
          profile?.first_name.trim() ||
          readMetadataText(metadata, "first_name");

        const lastName =
          profile?.last_name.trim() || readMetadataText(metadata, "last_name");

        const countryCode =
          profile?.phone_country_code.trim() ||
          readMetadataText(metadata, "phone_country_code");

        const phoneNumber =
          profile?.phone_number.trim() || readMetadataText(metadata, "phone");

        const phone = [countryCode, phoneNumber]
          .filter(Boolean)
          .join(" ")
          .trim();

        const customerAddresses = addressesByUserId.get(user.id) ?? [];

        const defaultAddress =
          customerAddresses.find((address) => address.is_default) ??
          customerAddresses[0] ??
          null;

        const customerOrders = orders.filter((order) => {
          if (order.customer_user_id === user.id) {
            return true;
          }

          return normalizeEmail(order.customer_email) === email;
        });

        const activeStatuses = new Set([
          "pending",
          "confirmed",
          "preparing",
          "out_for_delivery",
        ]);

        const activeOrderCount = customerOrders.filter((order) =>
          activeStatuses.has(order.status),
        ).length;

        const totalOrderValue = customerOrders
          .filter((order) => order.status !== "cancelled")
          .reduce((total, order) => total + Number(order.total ?? 0), 0);

        return {
          id: user.id,
          email,

          /*
           * Administrative access information.
           *
           * The customer remains visible even when promoted.
           */
          isAdmin,
          adminRole: isAdmin ? (adminRecord?.role ?? "admin") : null,
          isCurrentUser: user.id === userId,
          firstName,
          lastName,
          phone,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
          emailConfirmed: Boolean(user.email_confirmed_at),
          orderCount: customerOrders.length,
          activeOrderCount,
          totalOrderValue,
          lastOrderAt: customerOrders[0]?.created_at ?? null,
          addressCount: customerAddresses.length,
          defaultAddress: defaultAddress
            ? [
                defaultAddress.city,
                defaultAddress.area,
                defaultAddress.address_line,
              ]
                .filter(Boolean)
                .join(", ")
            : null,
          stockNotificationsEnabled: preferenceByEmail.get(email) !== false,
        };
      })
      .sort((first, second) => {
        const firstActivity = new Date(
          first.lastSignInAt ?? first.createdAt,
        ).getTime();

        const secondActivity = new Date(
          second.lastSignInAt ?? second.createdAt,
        ).getTime();

        return secondActivity - firstActivity;
      });
  } catch (error) {
    console.error("Admin customers could not be loaded:", error);

    dataError =
      "Customer information could not be loaded. Check the secure Supabase server key.";
  }

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Customers"
      pageDescription="Review registered customer accounts, contact details, delivery addresses and order activity."
    >
      <CustomersClient customers={customers} dataError={dataError} />
    </AdminShell>
  );
}
