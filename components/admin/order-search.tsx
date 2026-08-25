"use client";

import AdminDirectorySearch from "@/components/admin/admin-directory-search";

type Props = {
  total: number;
};

export default function OrderSearch({
  total,
}: Props) {
  return (
    <AdminDirectorySearch
      total={total}
      type="order"
      selector='[data-admin-order-search-card="true"]'
      datasetKey="adminOrderSearch"
      eyebrow="Order directory"
      title="Find an order"
      placeholder="Search order number, customer, email, phone or city..."
      singular="order"
      plural="orders"
    />
  );
}
