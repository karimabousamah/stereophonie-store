"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ProductSaveBarProps = {
  productName: string;
  isSubmitting: boolean;
  progress: number;
  statusText: string;
  onDraft: () => void;
  onPublish: () => void;
  formId?: string;
};

export default function ProductSaveBar({
  productName,
  isSubmitting,
  progress,
  statusText,
  onDraft,
  onPublish,
  formId = "st-admin-new-product-form",
}: ProductSaveBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.body.classList.add(
      "st-admin-product-editor-active",
    );

    setMounted(true);

    return () => {
      document.body.classList.remove(
        "st-admin-product-editor-active",
      );
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const hasProductName =
    productName.trim().length > 0;

  return createPortal(
    <header
      className="st-admin-product-fixed-header"
      data-admin-product-fixed-header="true"
    >
      <div className="st-admin-product-fixed-header__inner">
        <div className="st-admin-product-fixed-header__context">
          <Link
            href="/admin/products"
            className="st-admin-product-fixed-header__back"
            aria-label="Back to products"
          >
            <ArrowLeft />
            <span>Products</span>
          </Link>

          <span
            className="st-admin-product-fixed-header__separator"
            aria-hidden="true"
          />

          <div className="st-admin-product-fixed-header__identity">
            <strong>
              {hasProductName
                ? productName.trim()
                : "Add product"}
            </strong>

            <small>
              {isSubmitting
                ? statusText
                : hasProductName
                  ? "Unsaved changes"
                  : "Unsaved product"}
            </small>
          </div>
        </div>

        <div className="st-admin-product-fixed-header__actions">
          <button
            type="submit"
            name="intent"
            value="draft"
            formNoValidate
            disabled={isSubmitting}
            onClick={onDraft}
            className="st-admin-product-fixed-header__draft"

            form={formId}
          >
            Save draft
          </button>

          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={isSubmitting}
            onClick={onPublish}
            className="st-admin-product-fixed-header__publish"

            form={formId}
          >
            Publish live
          </button>
        </div>
      </div>

      {isSubmitting ? (
        <div className="st-admin-product-fixed-header__progress">
          <span
            style={{
              width: `${Math.max(
                3,
                Math.min(
                  Number(progress) || 0,
                  100,
                ),
              )}%`,
            }}
          />
        </div>
      ) : null}
    </header>,
    document.body,
  );
}
