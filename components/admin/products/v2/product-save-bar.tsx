"use client";

import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ProductSaveBarProps = {
  productName: string;
  isSubmitting: boolean;
  progress: number;
  statusText: string;
  onDraft: () => void;
  onPublish: () => void;
  onDelete?: () => void;
  deletePending?: boolean;
  formId?: string;
};

export default function ProductSaveBar({
  productName,
  isSubmitting,
  progress,
  statusText,
  onDraft,
  onPublish,
  onDelete,
  deletePending = false,
  formId = "st-admin-new-product-form",
}: ProductSaveBarProps) {
  const [mounted, setMounted] = useState(false);
  const [deleteConfirmationOpen,
    setDeleteConfirmationOpen,
  ] = useState(false);

  useEffect(() => {
    const body = document.body;

    body.classList.add(
      "st-admin-product-editor-active",
    );

    const syncSidebarEdge = () => {
      const sidebar =
        document.querySelector<HTMLElement>(
          ".st3-admin-sidebar",
        );

      if (!sidebar) {
        return;
      }

      const sidebarEdge =
        sidebar.getBoundingClientRect().right;

      body.style.setProperty(
        "--st-admin-product-sidebar-edge",
        `${Math.round(sidebarEdge)}px`,
      );
    };

    syncSidebarEdge();

    window.addEventListener(
      "resize",
      syncSidebarEdge,
    );

    setMounted(true);

    return () => {
      window.removeEventListener(
        "resize",
        syncSidebarEdge,
      );

      body.classList.remove(
        "st-admin-product-editor-active",
      );

      body.style.removeProperty(
        "--st-admin-product-sidebar-edge",
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
            {onDelete ? (
              <div
                className={[
                  "st-admin-product-fixed-header__delete-shell",
                  deleteConfirmationOpen
                    ? "is-confirming"
                    : "is-idle",
                ].join(" ")}
                data-delete-confirmation={
                  deleteConfirmationOpen ? "open" : "closed"
                }
              >
                <button
                  type="button"
                  data-destructive-trigger="true"
                  disabled={
                    isSubmitting ||
                    deletePending ||
                    deleteConfirmationOpen
                  }
                  onClick={() =>
                    setDeleteConfirmationOpen(true)
                  }
                  className="st-admin-product-fixed-header__delete"
                  aria-label="Delete product"
                  aria-hidden={deleteConfirmationOpen}
                  tabIndex={deleteConfirmationOpen ? -1 : 0}
                >
                  <Trash2 aria-hidden="true" />
                  <span>Delete product</span>
                </button>

                <div
                  className="st-admin-product-fixed-header__delete-confirm"
                  role="group"
                  aria-label="Confirm product deletion"
                  aria-hidden={!deleteConfirmationOpen}
                >
                  <span
                    className="st-admin-product-fixed-header__delete-question"
                  >
                    Delete permanently?
                  </span>

                  <button
                    type="button"
                    disabled={
                      deletePending ||
                      !deleteConfirmationOpen
                    }
                    onClick={() =>
                      setDeleteConfirmationOpen(false)
                    }
                    className="st-admin-product-fixed-header__delete-cancel"
                    tabIndex={deleteConfirmationOpen ? 0 : -1}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    data-destructive="true"
                    disabled={
                      deletePending ||
                      !deleteConfirmationOpen
                    }
                    onClick={onDelete}
                    className="st-admin-product-fixed-header__delete-confirm-button"
                    tabIndex={deleteConfirmationOpen ? 0 : -1}
                  >
                    <Trash2 aria-hidden="true" />

                    <span>
                      {deletePending
                        ? "Deleting..."
                        : "Delete"}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

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
