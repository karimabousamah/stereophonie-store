"use client";

import { FolderPlus } from "lucide-react";

export default function CategoryAddButton() {
  return (
    <button
      type="button"
      className="st-category-admin__add-root-button"
      onClick={() => {
        window.dispatchEvent(
          new Event("st-admin:add-category"),
        );
      }}
    >
      <FolderPlus aria-hidden="true" />
      <span>Add category</span>
    </button>
  );
}
