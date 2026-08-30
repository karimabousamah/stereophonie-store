"use client";

import { useEffect, useMemo } from "react";

export type AdminProductSubcategory = {
  id: string;
  category_id: string;
  name: string;
};

type ProductSubcategoryPickerProps = {
  subcategories: AdminProductSubcategory[];
  categoryId: string;
  value: string;
  onChange: (subcategoryId: string) => void;
};

export default function ProductSubcategoryPicker({
  subcategories,
  categoryId,
  value,
  onChange,
}: ProductSubcategoryPickerProps) {
  const availableSubcategories = useMemo(
    () =>
      subcategories
        .filter((subcategory) => subcategory.category_id === categoryId)
        .sort((first, second) => first.name.localeCompare(second.name)),
    [categoryId, subcategories],
  );

  useEffect(() => {
    if (!value) {
      return;
    }

    const stillValid = availableSubcategories.some(
      (subcategory) => subcategory.id === value,
    );

    if (!stillValid) {
      onChange("");
    }
  }, [availableSubcategories, onChange, value]);

  return (
    <select
      id="subcategory_id"
      name="subcategory_id"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={!categoryId || availableSubcategories.length === 0}
      className="mt-3 min-h-14 w-full border border-white/10 bg-black/30 px-4 text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-40 focus:border-white/55"
    >
      <option value="">
        {!categoryId
          ? "Choose a category first"
          : availableSubcategories.length === 0
            ? "No subcategories for this category"
            : "No subcategory"}
      </option>

      {availableSubcategories.map((subcategory) => (
        <option key={subcategory.id} value={subcategory.id}>
          {subcategory.name}
        </option>
      ))}
    </select>
  );
}
