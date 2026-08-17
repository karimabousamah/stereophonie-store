"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  Check,
  Eye,
  EyeOff,
  Package,
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
        attributes: {},
        sku: "",
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
    attributes: variant.attributes ?? {},
    sku: variant.sku ?? "",
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-white/[0.035] text-[10px] font-semibold text-white/40">
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
    collectionId: string;
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
  collections: {
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
  collections,
  brands,
  errorMessage,
}: EditProductFormProps) {
  const [productName, setProductName] = useState(product.name);

  const [variants, setVariants] = useState<AdminElectronicsVariant[]>(() =>
    createInitialVariants(product.variants),
  );

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
              attributes: variant.attributes,
              sku: variant.sku,
              stock_quantity: variant.stock_quantity,
              low_stock_threshold: variant.low_stock_threshold,
              availability_status: variant.availability_status,
            })),
          )}
        />

        {errorMessage && (
          <div className="mb-7 flex items-start gap-4 border border-red-400/30 bg-red-400/[0.07] p-5">
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
            <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="01"
                title="Product information"
                description="Update the product name, description, category and collection."
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

                <div className="grid gap-5 md:grid-cols-3">
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

                  <div>
                    <label
                      htmlFor="collection"
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                    >
                      Collection
                    </label>

                    <select
                      id="collection"
                      name="collection_id"
                      defaultValue={product.collectionId}
                      className="mt-3 w-full border border-white/10 bg-[#111111] px-4 py-4 text-white outline-none focus:border-white/55"
                    >
                      <option value="">No collection</option>

                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="02"
                title="Product pricing"
                description="Update the regular price and optional sale price."
              />

              <div className="grid gap-6 p-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="regular-price"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                  >
                    Regular price
                  </label>

                  <div className="mt-3 flex border border-white/10 bg-black/30 focus-within:border-white/55">
                    <span className="flex items-center border-r border-white/10 px-4 text-white/40">
                      $
                    </span>

                    <input
                      id="regular-price"
                      name="regular_price"
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      defaultValue={product.regularPrice}
                      className="w-full bg-transparent px-4 py-4 text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="sale-price"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                  >
                    Sale price
                  </label>

                  <div className="mt-3 flex border border-white/10 bg-black/30 focus-within:border-white/55">
                    <span className="flex items-center border-r border-white/10 px-4 text-white/40">
                      $
                    </span>

                    <input
                      id="sale-price"
                      name="sale_price"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={product.salePrice ?? ""}
                      placeholder="Optional"
                      className="w-full bg-transparent px-4 py-4 text-white outline-none placeholder:text-white/20"
                    />
                  </div>

                  <p className="mt-2 text-xs text-white/30">
                    The sale price must be lower than the regular price.
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="03"
                title="Product configurations"
                description="Manage every sellable electronics configuration, its technical attributes, SKU, stock and availability."
              />

              <div className="p-6">
                <ElectronicsVariantEditor
                  variants={variants}
                  onChange={setVariants}
                />
              </div>
            </section>

            <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="04"
                title="Store placement"
                description="Control optional merchandising labels."
              />

              <div className="grid gap-4 p-6 md:grid-cols-3">
                <label className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={product.isFeatured}
                    className="peer sr-only"
                  />

                  <div className="min-h-[145px] border border-white/10 bg-black/20 p-5 transition peer-checked:border-violet-400/50 peer-checked:bg-violet-400/[0.08]">
                    <Star className="h-5 w-5 text-violet-300" />

                    <p className="mt-6 font-semibold">Featured</p>

                    <p className="mt-2 text-xs leading-5 text-white/35">
                      Highlight in featured product areas.
                    </p>
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_trending"
                    defaultChecked={product.isTrending}
                    className="peer sr-only"
                  />

                  <div className="min-h-[145px] border border-white/10 bg-black/20 p-5 transition peer-checked:border-amber-400/50 peer-checked:bg-amber-400/[0.08]">
                    <TrendingUp className="h-5 w-5 text-amber-300" />

                    <p className="mt-6 font-semibold">Trending</p>

                    <p className="mt-2 text-xs leading-5 text-white/35">
                      Display in trending product areas.
                    </p>
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_new_arrival"
                    defaultChecked={product.isNewArrival}
                    className="peer sr-only"
                  />

                  <div className="min-h-[145px] border border-white/10 bg-black/20 p-5 transition peer-checked:border-sky-400/50 peer-checked:bg-sky-400/[0.08]">
                    <Diamond className="h-5 w-5 text-sky-300" />

                    <p className="mt-6 font-semibold">New arrival</p>

                    <p className="mt-2 text-xs leading-5 text-white/35">
                      Mark as newly added to the catalogue.
                    </p>
                  </div>
                </label>
              </div>
            </section>
          </div>

          <aside>
            <section className="border border-white/10 bg-[#101010] p-6 xl:sticky xl:top-[120px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                Product summary
              </p>

              <h2 className="mt-2 text-2xl font-semibold">Save changes</h2>

              <div className="mt-6 space-y-3">
                <div className="border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">
                    Product
                  </p>

                  <p className="mt-2 truncate font-semibold">
                    {productName || "Untitled product"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
                      Configurations
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {variants.length}
                    </p>
                  </div>

                  <div className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
                      Available
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {availableConfigurations}
                    </p>
                  </div>

                  <div className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
                      Stock
                    </p>

                    <p className="mt-2 text-xl font-semibold">{totalStock}</p>
                  </div>
                </div>
              </div>

              {variants.length > 0 && (
                <div className="mt-5 overflow-hidden border border-white/10 bg-black/20">
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
                    type="submit"
                    name="intent"
                    value="draft"
                    className="flex w-full items-center justify-between border border-white/15 bg-white/[0.025] px-5 py-4 text-xs font-semibold uppercase tracking-[0.17em] text-white transition hover:border-white hover:bg-white hover:text-black"
                  >
                    <span className="flex items-center gap-3">
                      <EyeOff className="h-4 w-4" />
                      Save as draft
                    </span>

                    <Save className="h-4 w-4" />
                  </button>

                  <button
                    type="submit"
                    name="intent"
                    value="publish"
                    className="flex w-full items-center justify-between border border-emerald-300 bg-emerald-300 px-5 py-4 text-xs font-semibold uppercase tracking-[0.17em] text-black transition hover:bg-transparent hover:text-emerald-300"
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

      <section className="mt-8 border border-red-400/20 bg-red-400/[0.035] p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">
          Danger zone
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Archive or delete product
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
          Archiving hides the product while keeping its information. Permanent
          deletion removes the product, variants, image records, and uploaded
          photographs.
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
              className="inline-flex w-full items-center justify-center gap-3 border border-amber-400/30 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300 transition hover:bg-amber-400/[0.08] sm:w-auto"
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
              className="inline-flex w-full items-center justify-center gap-3 border border-red-400/30 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-red-300 transition hover:bg-red-400/[0.08] sm:w-auto"
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
