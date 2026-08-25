"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  Eye,
  EyeOff,
  Save,
  Send,
  Diamond,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";

import ElectronicsVariantEditor, {
  type AdminElectronicsVariant,
} from "@/components/admin/products/electronics-variant-editor";

import { archiveProduct, deleteProduct, updateProduct } from "./actions";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type ExistingVariant = {
  id: string;
  size: string;
  variant_name: string;
  display_position: number | null;
  attributes: Record<string, string> | null;
  sku: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";
};

function createInitialVariants(
  existingVariants: ExistingVariant[],
): AdminElectronicsVariant[] {
  if (existingVariants.length === 0) {
    return [
      {
        clientId: crypto.randomUUID(),
        id: null,
        variant_name: "",
        display_position: 0,
        attributes: {},
        sku: "",
        regular_price: "",
        sale_price: "",
        stock_quantity: 0,
        low_stock_threshold: 2,
        availability_status: "in_stock",
      },
    ];
  }

  return existingVariants.map((variant) => ({
    clientId: variant.id,
    id: variant.id,
    variant_name: variant.variant_name || variant.size,
    display_position:
      Number(
        variant.display_position ??
        0,
      ),
    attributes: variant.attributes ?? {},
    sku: variant.sku ?? "",

    regular_price:
      variant.regular_price === null ||
      variant.regular_price === undefined
        ? ""
        : Number(variant.regular_price),

    sale_price:
      variant.sale_price === null ||
      variant.sale_price === undefined
        ? ""
        : Number(variant.sale_price),

    stock_quantity: variant.stock_quantity ?? 0,
    low_stock_threshold: variant.low_stock_threshold ?? 2,
    availability_status: variant.availability_status,
  }));
}

function SectionHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 border-b border-white/10 px-6 py-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-[10px] font-semibold text-white/40">
        {number}
      </span>

      <div>
        <h2 className="text-xl font-semibold tracking-[-0.02em]">{title}</h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
          {description}
        </p>
      </div>
    </div>
  );
}

type EditProductFormProps = {
  product: {
    id: string;
    name: string;
    description: string;
    categoryId: string;
    brandId: string;
    status: string;
    availability: string | null;
    isFeatured: boolean;
    isTrending: boolean;
    isNewArrival: boolean;
    regularPrice: number;
    salePrice: number | null;
    variants: ExistingVariant[];
  };
  categories: {
    id: string;
    name: string;
  }[];
  brands: {
    id: string;
    name: string;
  }[];
  errorMessage?: string;
};

export default function EditProductForm({
  product,
  categories,
  brands,
  errorMessage,
}: EditProductFormProps) {
  const [productName, setProductName] = useState(product.name);

  const initialCategoryName =
    categories.find(
      (category) => category.id === product.categoryId,
    )?.name ?? "";

  const initialBrandName =
    brands.find(
      (brand) => brand.id === product.brandId,
    )?.name ?? "";

  const [selectedCategoryName, setSelectedCategoryName] =
    useState(initialCategoryName);

  const [selectedBrandName, setSelectedBrandName] =
    useState(initialBrandName);

  const [variants, setVariants] = useState<AdminElectronicsVariant[]>(() =>
    createInitialVariants(product.variants),
  );


  /*
   * Keep the photograph manager synchronized with the configuration
   * editor without waiting for a page refresh.
   *
   * Newly-created configurations are visible immediately. They are
   * marked as unsaved until Save changes creates them in the database.
   */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        "stereophonie:admin-product-configurations",
        {
          detail: {
            configurations: variants.map((variant, index) => ({
              id:
                variant.id ??
                variant.clientId,
              persisted:
                Boolean(variant.id),
              variant_name:
                String(
                  variant.variant_name ?? "",
                ).trim(),
              fallbackLabel:
                String(
                  variant.variant_name ?? "",
                ).trim() ||
                `Configuration ${index + 1}`,
            })),
          },
        },
      ),
    );
  }, [variants]);

  const totalStock = useMemo(
    () =>
      variants.reduce((total, variant) => {
        if (
          variant.availability_status === "out_of_stock" ||
          variant.availability_status === "coming_soon"
        ) {
          return total;
        }

        return total + Math.max(0, Number(variant.stock_quantity) || 0);
      }, 0),
    [variants],
  );

  const availableConfigurations = useMemo(
    () =>
      variants.filter(
        (variant) =>
          (variant.availability_status === "in_stock" ||
            variant.availability_status === "low_stock") &&
          Number(variant.stock_quantity) > 0,
      ).length,
    [variants],
  );

  return (
    <div>
      <form action={updateProduct}>
        <input type="hidden" name="product_id" value={product.id} />

        <input
          type="hidden"
          name="variants_json"
          value={JSON.stringify(
            variants.map((variant) => ({
              id: variant.id ?? null,
              variant_name: variant.variant_name,

              /*
               * Persist the administrator-controlled storefront order.
               *
               * The configuration editor updates display_position when
               * Earlier / Later is pressed. This value MUST be included
               * in variants_json or the server cannot save the new order.
               */
              display_position: Number(
                variant.display_position ?? 0,
              ),

              attributes: variant.attributes,
              sku: variant.sku,
              regular_price: variant.regular_price,
              sale_price: variant.sale_price,
              stock_quantity: variant.stock_quantity,
              low_stock_threshold: variant.low_stock_threshold,
              availability_status: variant.availability_status,
            })),
          )}
        />

        {errorMessage && (
          <div className="mb-7 flex items-start gap-4 rounded-[20px] border border-red-400/30 bg-red-400/[0.07] p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                Product not saved
              </p>

              <p className="mt-2 text-sm leading-6 text-white/65">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-7">
            <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="01"
                title="Product information"
                description="Update the product name, description, category and brand."
              />

              <div className="space-y-7 p-6">
                <div>
                  <label
                    htmlFor="name"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                  >
                    Product name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    className="mt-3 w-full border border-white/10 bg-black/30 px-4 py-4 text-white outline-none transition focus:border-white/55"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                  >
                    Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    rows={7}
                    defaultValue={product.description}
                    placeholder="Describe the product."
                    className="mt-3 w-full resize-y border border-white/10 bg-black/30 px-4 py-4 leading-7 text-white outline-none transition placeholder:text-white/20 focus:border-white/55"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="category"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                    >
                      Category
                    </label>

                    <select
                      id="category"
                      name="category_id"
                      required
                      defaultValue={product.categoryId}
                      onChange={(event) => {
                        const option =
                          event.currentTarget.selectedOptions[0];

                        setSelectedCategoryName(
                          option?.textContent?.trim() ?? "",
                        );
                      }}
                      className="mt-3 w-full border border-white/10 bg-[#111111] px-4 py-4 text-white outline-none focus:border-white/55"
                    >
                      <option value="" disabled>
                        Select category
                      </option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="brand"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                    >
                      Brand
                    </label>

                    <select
                      id="brand"
                      name="brand_id"
                      defaultValue={product.brandId}
                      onChange={(event) => {
                        const option =
                          event.currentTarget.selectedOptions[0];

                        setSelectedBrandName(
                          option?.textContent?.trim() ?? "",
                        );
                      }}
                      className="mt-3 w-full border border-white/10 bg-[#111111] px-4 py-4 text-white outline-none focus:border-white/55"
                    >
                      <option value="">No brand</option>

                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="02"
                title="Product configurations"
                description="Manage every sellable electronics configuration, its technical attributes, SKU, stock and availability."
              />

              <div className="p-6">
                <ElectronicsVariantEditor
                  variants={variants}
                  onChange={setVariants}
                  categoryName={selectedCategoryName}
                  brandName={selectedBrandName}
                  saveExistingConfigurationIntent={
                    product.status === "published"
                      ? "publish"
                      : "draft"
                  }
                />
              </div>
            </section>

            <section className="st-admin-store-placement overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="03"
                title="Store placement"
                description="Choose where this product should receive extra visibility in the storefront."
              />

              <div className="st-admin-placement-grid">
                <label className="st-admin-placement-card">
                  <input
                    type="checkbox"
                    name="is_featured" defaultChecked={product.isFeatured}
                    className="sr-only"
                  />

                  <span className="st-admin-placement-card__surface">
                    <span className="st-admin-placement-card__icon">
                      <Star className="h-5 w-5" />
                    </span>

                    <span className="st-admin-placement-card__copy">
                      <strong>Featured</strong>
                      <small>
                        Give this product priority in featured storefront areas.
                      </small>
                    </span>
                  </span>
                </label>

                <label className="st-admin-placement-card">
                  <input
                    type="checkbox"
                    name="is_trending" defaultChecked={product.isTrending}
                    className="sr-only"
                  />

                  <span className="st-admin-placement-card__surface">
                    <span className="st-admin-placement-card__icon">
                      <TrendingUp className="h-5 w-5" />
                    </span>

                    <span className="st-admin-placement-card__copy">
                      <strong>Trending</strong>
                      <small>
                        Include this product in highlighted and trending selections.
                      </small>
                    </span>
                  </span>
                </label>

                <label className="st-admin-placement-card">
                  <input
                    type="checkbox"
                    name="is_new_arrival" defaultChecked={product.isNewArrival}
                    className="sr-only"
                  />

                  <span className="st-admin-placement-card__surface">
                    <span className="st-admin-placement-card__icon">
                      <Diamond className="h-5 w-5" />
                    </span>

                    <span className="st-admin-placement-card__copy">
                      <strong>New arrival</strong>
                      <small>
                        Present this item as recently added to the catalogue.
                      </small>
                    </span>
                  </span>
                </label>
              </div>
            </section>
          </div>

          <aside>
            <section className="rounded-[24px] border border-white/10 bg-[#101010] p-6 xl:sticky xl:top-[120px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                Product summary
              </p>

              <h2 className="mt-2 text-2xl font-semibold">Save changes</h2>

              <div className="mt-6 space-y-3">
                <div className="rounded-[16px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">
                    Product
                  </p>

                  <p className="mt-2 truncate font-semibold">
                    {productName || "Untitled product"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[16px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
                      Configurations
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {variants.length}
                    </p>
                  </div>

                  <div className="rounded-[16px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
                      Available
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {availableConfigurations}
                    </p>
                  </div>

                  <div className="rounded-[16px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
                      Stock
                    </p>

                    <p className="mt-2 text-xl font-semibold">{totalStock}</p>
                  </div>
                </div>
              </div>

              {variants.length > 0 && (
                <div className="mt-5 overflow-hidden rounded-[16px] border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/30">
                      Configuration overview
                    </p>
                  </div>

                  <div className="divide-y divide-white/10">
                    {variants.map((variant, index) => (
                      <div
                        key={variant.clientId}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {variant.variant_name.trim() ||
                              `Configuration ${index + 1}`}
                          </p>

                          {variant.sku ? (
                            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-white/30">
                              SKU {variant.sku}
                            </p>
                          ) : null}
                        </div>

                        <p className="shrink-0 text-xs text-white/45">
                          {variant.stock_quantity} in stock
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-7 border-t border-white/10 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                  Publishing
                </p>

                <div className="mt-4 space-y-3">
                  <button
                    id="st-save-existing-product-draft"
                    type="submit"
                    name="intent"
                    value="draft"
                    className="flex w-full items-center justify-between rounded-full border border-white/15 bg-white/[0.025] px-5 py-4 text-xs font-semibold uppercase tracking-[0.17em] text-white transition hover:border-white hover:bg-white hover:text-black"
                  >
                    <span className="flex items-center gap-3">
                      <EyeOff className="h-4 w-4" />
                      Save as draft
                    </span>

                    <Save className="h-4 w-4" />
                  </button>

                  <button
                    id="st-save-existing-product-publish"
                    type="submit"
                    name="intent"
                    value="publish"
                    className="flex w-full items-center justify-between rounded-full border border-emerald-300 bg-emerald-300 px-5 py-4 text-xs font-semibold uppercase tracking-[0.17em] text-black transition hover:bg-transparent hover:text-emerald-300"
                  >
                    <span className="flex items-center gap-3">
                      <Eye className="h-4 w-4" />
                      Save and publish
                    </span>

                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </form>

      <section className="mt-8 rounded-[24px] border border-red-400/20 bg-red-400/[0.035] p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">
          Danger zone
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Archive or delete product
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
          Archiving hides the product while keeping its information. Permanent
          deletion removes the product, configurations, image records, and
          uploaded files.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <form
            action={archiveProduct}
            onSubmit={(event) => {
              const confirmed = window.confirm(
                "Archive this product? It will become hidden from customers.",
              );

              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="product_id" value={product.id} />

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-amber-400/30 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300 transition hover:bg-amber-400/[0.08] sm:w-auto"
            >
              <Archive className="h-4 w-4" />
              Archive product
            </button>
          </form>

          <form
            action={deleteProduct}
            onSubmit={(event) => {
              const confirmed = window.confirm(
                "Permanently delete this product? This action cannot be undone.",
              );

              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="product_id" value={product.id} />

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-red-400/30 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-red-300 transition hover:bg-red-400/[0.08] sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              Delete permanently
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
