"use client";

import AdminDirectorySearch from "@/components/admin/admin-directory-search";

type Props = {
  total: number;
};

export default function CategorySearch({
  total,
}: Props) {
  return (
    <AdminDirectorySearch
      total={total}
      type="category"
      selector='[data-admin-category-card="true"]'
      datasetKey="adminCategorySearch"
      eyebrow="Category directory"
      title="Find a category"
      placeholder="Search phones, gaming, audio, accessories..."
      singular="category"
      plural="categories"
    />
  );
}
