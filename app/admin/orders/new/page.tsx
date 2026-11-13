import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import OrderCreateManager, {
  type AdminCreateOrderCustomer,
  type AdminCreateOrderProduct,
} from "@/components/admin/order-create-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  phone_country_code: string;
  phone_number: string;
};

type AddressRow = {
  id: string;
  user_id: string;
  label: string;
  country: string;
  city: string;
  area: string;
  address_line: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
};

type AdminUserRow = {
  user_id: string;
  is_active: boolean;
};

function clean(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase();
}

function metadataText(
  metadata: Record<string, unknown>,
  key: string,
) {
  return clean(metadata[key]);
}

export default async function AdminCreateOrderPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const administratorUserId =
    claimsData?.claims?.sub;

  if (!administratorUserId) {
    redirect("/admin/login");
  }

  const {
    data: administrator,
    error: administratorError,
  } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", administratorUserId)
    .single();

  if (
    administratorError ||
    !administrator?.is_active
  ) {
    redirect("/admin/login");
  }

  const admin = createAdminClient();

  const [
    usersResult,
    adminUsersResult,
    profilesResult,
    addressesResult,
    productsResult,
  ] = await Promise.all([
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),

    admin
      .from("admin_users")
      .select("user_id, is_active"),

    admin
      .from("customer_profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        phone_country_code,
        phone_number
      `),

    admin
      .from("customer_addresses")
      .select(`
        id,
        user_id,
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
        is_default,
        created_at
      `)
      .order("is_default", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      }),

    admin
      .from("products")
      .select(`
        id,
        name,
        slug,
        status,
        availability,
        product_variants (
          id,
          variant_name,
          size,
          display_position,
          sku,
          barcode,
          regular_price,
          sale_price,
          stock_quantity,
          availability_status
        )
      `)
      .eq("status", "published")
      .order("name", {
        ascending: true,
      }),
  ]);

  const adminUserIds =
    new Set(
      (
        (adminUsersResult.data ??
          []) as AdminUserRow[]
      )
        .filter(
          (row) =>
            row.is_active === true,
        )
        .map((row) => row.user_id),
    );

  const profiles =
    (profilesResult.data ??
      []) as ProfileRow[];

  const profileByUserId =
    new Map(
      profiles.map((profile) => [
        profile.user_id,
        profile,
      ]),
    );

  const addresses =
    (addressesResult.data ??
      []) as AddressRow[];

  const addressesByUserId =
    new Map<string, AddressRow[]>();

  for (const address of addresses) {
    const existing =
      addressesByUserId.get(
        address.user_id,
      ) ?? [];

    existing.push(address);

    addressesByUserId.set(
      address.user_id,
      existing,
    );
  }

  const customers:
    AdminCreateOrderCustomer[] =
    (
      usersResult.data?.users ?? []
    )
      .filter((user) => {
        const email =
          normalizeEmail(user.email);

        if (!email) {
          return false;
        }

        /*
         * Do not offer active administrator
         * accounts as normal order customers.
         */
        return !adminUserIds.has(user.id);
      })
      .map((user) => {
        const profile =
          profileByUserId.get(
            user.id,
          );

        const metadata =
          (user.user_metadata ??
            {}) as Record<
            string,
            unknown
          >;

        const firstName =
          clean(
            profile?.first_name,
          ) ||
          metadataText(
            metadata,
            "first_name",
          );

        const lastName =
          clean(
            profile?.last_name,
          ) ||
          metadataText(
            metadata,
            "last_name",
          );

        const countryCode =
          clean(
            profile?.phone_country_code,
          ) ||
          metadataText(
            metadata,
            "phone_country_code",
          );

        const phoneNumber =
          clean(
            profile?.phone_number,
          ) ||
          metadataText(
            metadata,
            "phone",
          );

        const phone = [
          countryCode,
          phoneNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        const customerAddresses =
          addressesByUserId.get(
            user.id,
          ) ?? [];

        return {
          id: user.id,
          firstName,
          lastName,
          email:
            normalizeEmail(
              user.email,
            ),
          phone,
          addresses:
            customerAddresses.map(
              (address) => ({
                id: address.id,
                label:
                  clean(
                    address.label,
                  ) ||
                  "Address",
                country:
                  clean(
                    address.country,
                  ) ||
                  "Lebanon",
                city:
                  clean(
                    address.city,
                  ),
                area:
                  clean(
                    address.area,
                  ),
                addressLine:
                  clean(
                    address.address_line,
                  ),
                building:
                  clean(
                    address.building,
                  ),
                floor:
                  clean(
                    address.floor,
                  ),
                apartment:
                  clean(
                    address.apartment,
                  ),
                landmark:
                  clean(
                    address.landmark,
                  ),
                deliveryInstructions:
                  clean(
                    address.delivery_instructions,
                  ),
                isDefault:
                  Boolean(
                    address.is_default,
                  ),
              }),
            ),
        };
      })
      .sort((first, second) =>
        `${first.firstName} ${first.lastName}`
          .trim()
          .localeCompare(
            `${second.firstName} ${second.lastName}`.trim(),
          ),
      );

  const products:
    AdminCreateOrderProduct[] =
    (
      productsResult.data ?? []
    )
      .map((product) => {
        const variants =
          [
            ...(
              product.product_variants ??
              []
            ),
          ]
            .sort(
              (
                first,
                second,
              ) => {
                const position =
                  Number(
                    first.display_position ??
                      0,
                  ) -
                  Number(
                    second.display_position ??
                      0,
                  );

                if (position !== 0) {
                  return position;
                }

                return String(
                  first.variant_name ??
                    first.size ??
                    "",
                ).localeCompare(
                  String(
                    second.variant_name ??
                      second.size ??
                      "",
                  ),
                  undefined,
                  {
                    numeric: true,
                  },
                );
              },
            )
            .filter(
              (variant) =>
                (
                  variant.availability_status ===
                    "in_stock" ||
                  variant.availability_status ===
                    "low_stock"
                ) &&
                Number(
                  variant.stock_quantity ??
                    0,
                ) > 0,
            )
            .map(
              (
                variant,
                index,
              ) => ({
                id:
                  String(
                    variant.id,
                  ),
                name:
                  clean(
                    variant.variant_name,
                  ) ||
                  clean(
                    variant.size,
                  ) ||
                  `Configuration ${index + 1}`,
                size:
                  clean(
                    variant.size,
                  ),
                sku:
                  clean(
                    variant.sku,
                  ),
                barcode:
                  clean(
                    variant.barcode,
                  ),
                regularPrice:
                  Number(
                    variant.regular_price ??
                      0,
                  ),
                salePrice:
                  variant.sale_price ===
                    null ||
                  variant.sale_price ===
                    undefined
                    ? null
                    : Number(
                        variant.sale_price,
                      ),
                stockQuantity:
                  Number(
                    variant.stock_quantity ??
                      0,
                  ),
                availabilityStatus:
                  String(
                    variant.availability_status ??
                      "",
                  ),
              }),
            );

        return {
          id:
            String(
              product.id,
            ),
          name:
            clean(
              product.name,
            ),
          slug:
            clean(
              product.slug,
            ),
          variants,
        };
      })
      .filter(
        (product) =>
          product.variants.length > 0,
      );

  const loadingWarnings = [
    usersResult.error
      ? "Registered customers could not be loaded completely."
      : "",
    profilesResult.error
      ? "Customer profiles could not be loaded completely."
      : "",
    addressesResult.error
      ? "Customer addresses could not be loaded completely."
      : "",
    productsResult.error
      ? "Products could not be loaded completely."
      : "",
  ].filter(Boolean);

  return (
    <AdminShell
      role={administrator.role}
      pageTitle="Create order"
      pageDescription="Create an order on behalf of an existing customer or enter a guest customer manually."
    >
      <main className="st-admin-order-create-page">
        <div className="st-admin-order-create-page__inner">
          <div className="st-admin-order-create-page__back">
            <Link href="/admin/orders">
              <ArrowLeft aria-hidden="true" />
              <span>Orders</span>
            </Link>
          </div>

          <OrderCreateManager
            customers={customers}
            products={products}
            loadingWarnings={
              loadingWarnings
            }
          />
        </div>
      </main>
    </AdminShell>
  );
}
