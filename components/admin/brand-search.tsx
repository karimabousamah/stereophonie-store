"use client";

import AdminDirectorySearch from "@/components/admin/admin-directory-search";

type Props = {
  total: number;
};

export default function BrandSearch({
  total,
}: Props) {
  return (
    <AdminDirectorySearch
      total={total}
      type="brand"
      selector='[data-admin-brand-card="true"]'
      datasetKey="adminBrandSearch"
      eyebrow="Brand directory"
      title="Find a brand"
      placeholder="Search Apple, Samsung, Sony, Logitech..."
      singular="brand"
      plural="brands"
    />
  );
}
