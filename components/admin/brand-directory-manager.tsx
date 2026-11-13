"use client";

import {
  Edit3,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

import {
  createBrand,
  deleteBrand,
  updateBrand,
} from "@/app/admin/brands/actions";

export type BrandDirectoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
};

type Props = {
  brands: BrandDirectoryItem[];
  totalAssignedProducts: number;
};

type StatusFilter =
  | "all"
  | "active"
  | "inactive";

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function FormSubmitButton({
  className,
  pendingLabel,
  children,
  disabled = false,
  title,
}: {
  className: string;
  pendingLabel: string;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
      title={title}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

function FormActiveToggle({
  defaultChecked,
}: {
  defaultChecked: boolean;
}) {
  const [checked, setChecked] =
    useState(defaultChecked);

  useEffect(() => {
    setChecked(defaultChecked);
  }, [defaultChecked]);

  return (
    <label className="st-admin-brand-v6__form-toggle">
      <input
        type="checkbox"
        name="is_active"
        checked={checked}
        onChange={(event) =>
          setChecked(
            event.target.checked,
          )
        }
      />

      <span
        className="st-admin-brand-v6__form-toggle-track"
        aria-hidden="true"
      >
        <span />
      </span>

      <span className="st-admin-brand-v6__form-toggle-copy">
        {checked
          ? "Active"
          : "Inactive"}
      </span>
    </label>
  );
}

function AnimatedBrandCreatePanel({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] =
    useState(open);

  const [visible, setVisible] =
    useState(open);

  useEffect(() => {
    let frameOne = 0;
    let frameTwo = 0;

    let closeTimer:
      | number
      | undefined;

    if (open) {
      setMounted(true);

      frameOne =
        window.requestAnimationFrame(() => {
          frameTwo =
            window.requestAnimationFrame(() => {
              setVisible(true);
            });
        });
    } else {
      setVisible(false);

      closeTimer =
        window.setTimeout(() => {
          setMounted(false);
        }, 230);
    }

    return () => {
      if (frameOne) {
        window.cancelAnimationFrame(
          frameOne,
        );
      }

      if (frameTwo) {
        window.cancelAnimationFrame(
          frameTwo,
        );
      }

      if (closeTimer) {
        window.clearTimeout(
          closeTimer,
        );
      }
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return (
    <section
      className={`st-admin-brand-v6__create-panel ${
        visible
          ? "is-open"
          : "is-closing"
      }`}
      aria-hidden={!visible}
    >
      <div className="st-admin-brand-v6__create-panel-inner">
        <div className="st-admin-brand-v6__create-panel-content">
          {children}
        </div>
      </div>
    </section>
  );
}

function AnimatedBrandEditPanel({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] =
    useState(open);

  const [visible, setVisible] =
    useState(open);

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    let closeTimer:
      | number
      | undefined;

    if (open) {
      setMounted(true);

      firstFrame =
        window.requestAnimationFrame(() => {
          secondFrame =
            window.requestAnimationFrame(() => {
              setVisible(true);
            });
        });
    } else {
      setVisible(false);

      closeTimer =
        window.setTimeout(() => {
          setMounted(false);
        }, 220);
    }

    return () => {
      if (firstFrame) {
        window.cancelAnimationFrame(
          firstFrame,
        );
      }

      if (secondFrame) {
        window.cancelAnimationFrame(
          secondFrame,
        );
      }

      if (closeTimer) {
        window.clearTimeout(
          closeTimer,
        );
      }
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return (
    <section
      className={`st-admin-brand-v6__edit-panel ${
        visible
          ? "is-open"
          : "is-closing"
      }`}
      aria-hidden={!visible}
    >
      <div className="st-admin-brand-v6__edit-panel-inner">
        {children}
      </div>
    </section>
  );
}


export default function BrandDirectoryManager({
  brands,
  totalAssignedProducts,
}: Props) {
  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const [query, setQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [showCreate, setShowCreate] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const activeCount =
    useMemo(
      () =>
        brands.filter(
          (brand) => brand.isActive,
        ).length,
      [brands],
    );

  const inactiveCount =
    brands.length - activeCount;

  const visibleBrands =
    useMemo(() => {
      const search = normalized(query);

      return brands.filter((brand) => {
        if (
          statusFilter === "active" &&
          !brand.isActive
        ) {
          return false;
        }

        if (
          statusFilter === "inactive" &&
          brand.isActive
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        return [
          brand.name,
          brand.slug,
          brand.description ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search);
      });
    }, [
      brands,
      query,
      statusFilter,
    ]);

  function openCreate() {
    setEditingId(null);
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
  }

  function toggleEdit(
    brandId: string,
  ) {
    setShowCreate(false);

    setEditingId((current) =>
      current === brandId
        ? null
        : brandId,
    );
  }

  return (
    <section
      id="st-admin-brands-v6-root"
      className="st-admin-brand-v6"
      aria-label="Brand management"
    >
      <div className="st-admin-brand-v6__actions">
        <button
          type="button"
          className={
            showCreate
              ? "st-admin-brand-v6__add is-cancel"
              : "st-admin-brand-v6__add"
          }
          onClick={
            showCreate
              ? closeCreate
              : openCreate
          }
          aria-expanded={showCreate}
        >
          {showCreate ? (
            <>
              <span>Cancel</span>

              <X
                className="st-admin-brand-v6__cancel-icon"
                aria-hidden="true"
              />
            </>
          ) : (
            <>
              <Plus aria-hidden="true" />

              <span>Add brand</span>
            </>
          )}
        </button>
      </div>

      <AnimatedBrandCreatePanel open={showCreate}>
          <div className="st-admin-brand-v6__panel-title">
            <strong>
              Add brand
            </strong>

            <span>
              Brands are sorted automatically from A to Z.
            </span>
          </div>

          <form
            action={createBrand}
            className="st-admin-brand-v6__form"
          >
            <label className="st-admin-brand-v6__field">
              <span>
                Brand name
              </span>

              <input
                type="text"
                name="name"
                placeholder="Example: Apple"
                required
                autoFocus
              />
            </label>

            <label className="st-admin-brand-v6__field st-admin-brand-v6__field--description">
              <span>
                Description
              </span>

              <textarea
                name="description"
                placeholder="Optional description"
                rows={3}
              />
            </label>

            <div className="st-admin-brand-v6__active-field">
              <span className="st-admin-brand-v6__active-label">
                Status
              </span>

              <FormActiveToggle
                defaultChecked
              />
            </div>

            <div className="st-admin-brand-v6__form-actions">
              <button
                type="button"
                className="st-admin-brand-v6__button st-admin-brand-v6__button--secondary"
                onClick={closeCreate}
              >
                <span>Cancel</span>
              </button>

              <FormSubmitButton
                className="st-admin-brand-v6__button st-admin-brand-v6__button--primary"
                pendingLabel="Creating…"
              >
                <span>Create brand</span>
              </FormSubmitButton>
            </div>
          </form>
      </AnimatedBrandCreatePanel>

      <section className="st-admin-brand-v6__directory">
        <div className="st-admin-brand-v6__toolbar">
          <label className="st-admin-brand-v6__search-field">
            <span
              className="st-admin-brand-v6__search-icon"
              aria-hidden="true"
            >
              <Search />
            </span>

            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search brands"
              aria-label="Search brands"
              autoComplete="off"
              spellCheck={false}
            />

            {query ? (
              <button
                type="button"
                className="st-admin-brand-v6__search-clear"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear brand search"
              >
                <X aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <div
            className="st-admin-brand-v6__filters"
            aria-label="Brand status"
          >
            <button
              type="button"
              className={
                statusFilter === "all"
                  ? "is-active"
                  : undefined
              }
              aria-pressed={
                statusFilter === "all"
              }
              onClick={() =>
                setStatusFilter("all")
              }
            >
              <span>All</span>
              <small>
                {brands.length}
              </small>
            </button>

            <button
              type="button"
              className={
                statusFilter === "active"
                  ? "is-active"
                  : undefined
              }
              aria-pressed={
                statusFilter === "active"
              }
              onClick={() =>
                setStatusFilter(
                  "active",
                )
              }
            >
              <span>Active</span>
              <small>
                {activeCount}
              </small>
            </button>

            <button
              type="button"
              className={
                statusFilter === "inactive"
                  ? "is-active"
                  : undefined
              }
              aria-pressed={
                statusFilter === "inactive"
              }
              onClick={() =>
                setStatusFilter(
                  "inactive",
                )
              }
            >
              <span>Inactive</span>
              <small>
                {inactiveCount}
              </small>
            </button>
          </div>
        </div>

        <div className="st-admin-brand-v6__columns">
          <span>Brand</span>
          <span>Products</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <div className="st-admin-brand-v6__rows">
          {visibleBrands.length ? (
            visibleBrands.map(
              (brand) => {
                const editing =
                  editingId ===
                  brand.id;

                return (
                  <article
                    key={brand.id}
                    className={[
                      "st-admin-brand-v6__row",
                      editing
                        ? "is-editing"
                        : "",
                      !brand.isActive
                        ? "is-inactive"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="st-admin-brand-v6__row-main">
                      <div className="st-admin-brand-v6__identity">
                        <span className="st-admin-brand-v6__brand-icon">
                          <Tag
                            aria-hidden="true"
                          />
                        </span>

                        <div>
                          <strong>
                            {brand.name}
                          </strong>

                          <span>
                            /
                            {brand.slug}
                          </span>
                        </div>
                      </div>

                      <div className="st-admin-brand-v6__products">
                        <strong>
                          {
                            brand.productCount
                          }
                        </strong>

                        <span>
                          {brand.productCount ===
                          1
                            ? "product"
                            : "products"}
                        </span>
                      </div>

                      <div className="st-admin-brand-v6__status-cell">
                        <span
                          className={`st-admin-brand-v6__status ${
                            brand.isActive
                              ? "is-active"
                              : "is-inactive"
                          }`}
                        >
                          <span>
                            {brand.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </span>
                      </div>

                      <div className="st-admin-brand-v6__row-actions">
                        <button
                          type="button"
                          className="st-admin-brand-v6__button st-admin-brand-v6__button--row"
                          onClick={() =>
                            toggleEdit(
                              brand.id,
                            )
                          }
                          aria-expanded={
                            editing
                          }
                        >
                          <span>
                            {editing
                              ? "Close"
                              : "Edit"}
                          </span>

                          {editing ? (
                            <X
                              aria-hidden="true"
                            />
                          ) : (
                            <Edit3
                              aria-hidden="true"
                            />
                          )}
                        </button>

                        <form
                          action={deleteBrand}
                          onSubmit={(
                            event,
                          ) => {
                            if (
                              brand.productCount >
                              0
                            ) {
                              event.preventDefault();
                              return;
                            }

                            if (
                              !window.confirm(
                                `Delete ${brand.name}?`,
                              )
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input
                            type="hidden"
                            name="brand_id"
                            value={
                              brand.id
                            }
                          />

                          <FormSubmitButton
                            className="st-admin-brand-v6__button st-admin-brand-v6__button--delete"
                            pendingLabel="Deleting…"
                            disabled={
                              brand.productCount >
                              0
                            }
                            title={
                              brand.productCount >
                              0
                                ? "Reassign products before deleting this brand."
                                : `Delete ${brand.name}`
                            }
                          >
                            <span>
                              Delete
                            </span>

                            <Trash2
                              aria-hidden="true"
                            />
                          </FormSubmitButton>
                        </form>
                      </div>
                    </div>

                    <AnimatedBrandEditPanel open={editing}>
                        <form
                          action={updateBrand}
                          className="st-admin-brand-v6__form st-admin-brand-v6__form--editor"
                        >
                          <input
                            type="hidden"
                            name="brand_id"
                            value={
                              brand.id
                            }
                          />

                          <div className="st-admin-brand-v6__editor-fields">
                            <label className="st-admin-brand-v6__field">
                              <span>
                                Brand name
                              </span>

                              <input
                                type="text"
                                name="name"
                                defaultValue={
                                  brand.name
                                }
                                required
                                autoFocus
                              />
                            </label>

                            <label className="st-admin-brand-v6__field st-admin-brand-v6__field--description">
                              <span>
                                Description
                              </span>

                              <textarea
                                name="description"
                                defaultValue={
                                  brand.description ??
                                  ""
                                }
                                placeholder="Optional description"
                                rows={3}
                              />
                            </label>
                          </div>

                          <div className="st-admin-brand-v6__active-field">
                            <span className="st-admin-brand-v6__active-label">
                              Status
                            </span>

                            <FormActiveToggle
                              defaultChecked={
                                brand.isActive
                              }
                            />
                          </div>

                          <div className="st-admin-brand-v6__form-actions">
                            <button
                              type="button"
                              className="st-admin-brand-v6__button st-admin-brand-v6__button--secondary"
                              onClick={() =>
                                setEditingId(
                                  null,
                                )
                              }
                            >
                              <span>
                                Cancel
                              </span>
                            </button>

                            <FormSubmitButton
                              className="st-admin-brand-v6__button st-admin-brand-v6__button--primary"
                              pendingLabel="Saving…"
                            >
                              <span>
                                Save changes
                              </span>
                            </FormSubmitButton>
                          </div>
                        </form>


                    </AnimatedBrandEditPanel>
                  </article>
                );
              },
            )
          ) : (
            <div className="st-admin-brand-v6__empty">
              <Tag aria-hidden="true" />

              <strong>
                No brands found
              </strong>

              <span>
                Try another search or status filter.
              </span>
            </div>
          )}
        </div>

        <footer className="st-admin-brand-v6__footer">
          <span>
            Showing{" "}
            <strong>
              {visibleBrands.length}
            </strong>{" "}
            of{" "}
            <strong>
              {brands.length}
            </strong>{" "}
            brands
          </span>

          <span>
            {totalAssignedProducts} assigned{" "}
            {totalAssignedProducts === 1
              ? "product"
              : "products"}
          </span>
        </footer>
      </section>
    </section>
  );
}
