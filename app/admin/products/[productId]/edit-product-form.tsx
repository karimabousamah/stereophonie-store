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

import { archiveProduct, deleteProduct, updateProduct } from "./actions";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type SizeName = "XXS" | "XS" | "S" | "M" | "L" | "XL" | "XXL" | "One Size";

type ExistingVariant = {
  id: string;
  size: string;
  sku: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus;
};

type ProductData = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  collectionId: string;
  status: string;
  availability: string | null;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  regularPrice: number;
  salePrice: number | null;
  variants: ExistingVariant[];
};

type Category = {
  id: string;
  name: string;
};

type Collection = {
  id: string;
  name: string;
};

type EditProductFormProps = {
  product: ProductData;
  categories: Category[];
  collections: Collection[];
  errorMessage?: string;
};

type SizeVariant = {
  id: string | null;
  size: SizeName;
  enabled: boolean;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus;
};

const sizeNames: SizeName[] = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "One Size",
];

const availabilityOptions: {
  value: AvailabilityStatus;
  label: string;
  description: string;
  dotClass: string;
  activeClass: string;
}[] = [
  {
    value: "in_stock",
    label: "In stock",
    description: "Customers can order this size.",
    dotClass: "bg-emerald-400",
    activeClass: "border-emerald-400/50 bg-emerald-400/[0.08] text-emerald-200",
  },
  {
    value: "low_stock",
    label: "Low stock",
    description: "Available with limited quantity.",
    dotClass: "bg-amber-400",
    activeClass: "border-amber-400/50 bg-amber-400/[0.08] text-amber-200",
  },
  {
    value: "out_of_stock",
    label: "Out of stock",
    description: "Customers cannot order this size.",
    dotClass: "bg-red-400",
    activeClass: "border-red-400/50 bg-red-400/[0.08] text-red-200",
  },
  {
    value: "coming_soon",
    label: "Coming soon",
    description: "This size will become available later.",
    dotClass: "bg-sky-400",
    activeClass: "border-sky-400/50 bg-sky-400/[0.08] text-sky-200",
  },
];

function createInitialVariants(
  existingVariants: ExistingVariant[],
): SizeVariant[] {
  return sizeNames.map((size) => {
    const existingVariant = existingVariants.find(
      (variant) => variant.size === size,
    );

    return {
      id: existingVariant?.id ?? null,
      size,
      enabled: Boolean(existingVariant),
      sku: existingVariant?.sku ?? "",
      stock_quantity: existingVariant?.stock_quantity ?? 0,
      low_stock_threshold: existingVariant?.low_stock_threshold ?? 2,
      availability_status: existingVariant?.availability_status ?? "in_stock",
    };
  });
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

export default function EditProductForm({
  product,
  categories,
  collections,
  errorMessage,
}: EditProductFormProps) {
  const [productName, setProductName] = useState(product.name);

  const [variants, setVariants] = useState<SizeVariant[]>(() =>
    createInitialVariants(product.variants),
  );

  const initiallyEnabledSize =
    variants.find((variant) => variant.enabled)?.size ?? null;

  const [activeSize, setActiveSize] = useState<SizeName | null>(
    initiallyEnabledSize,
  );

  const selectedVariants = useMemo(
    () => variants.filter((variant) => variant.enabled),
    [variants],
  );

  const activeVariant =
    selectedVariants.find((variant) => variant.size === activeSize) ??
    selectedVariants[0] ??
    null;

  const totalStock = useMemo(() => {
    return selectedVariants.reduce((total, variant) => {
      const unavailable =
        variant.availability_status === "out_of_stock" ||
        variant.availability_status === "coming_soon";

      return total + (unavailable ? 0 : Number(variant.stock_quantity) || 0);
    }, 0);
  }, [selectedVariants]);

  const orderableSizes = selectedVariants.filter(
    (variant) =>
      variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock",
  ).length;

  function updateSize(size: SizeName, updates: Partial<SizeVariant>) {
    setVariants((current) =>
      current.map((variant) =>
        variant.size === size
          ? {
              ...variant,
              ...updates,
            }
          : variant,
      ),
    );
  }

  function toggleSize(size: SizeName) {
    setVariants((current) => {
      const updated = current.map((variant) =>
        variant.size === size
          ? {
              ...variant,
              enabled: !variant.enabled,
            }
          : variant,
      );

      const changedVariant = updated.find((variant) => variant.size === size);

      if (changedVariant?.enabled) {
        setActiveSize(size);
      } else if (activeSize === size) {
        const nextSelectedVariant = updated.find((variant) => variant.enabled);

        setActiveSize(nextSelectedVariant?.size ?? null);
      }

      return updated;
    });
  }

  return (
    <div>
      <form action={updateProduct}>
        <input type="hidden" name="product_id" value={product.id} />

        <input
          type="hidden"
          name="variants_json"
          value={JSON.stringify(
            selectedVariants.map(
              ({
                id,
                size,
                sku,
                stock_quantity,
                low_stock_threshold,
                availability_status,
              }) => ({
                id,
                size,
                sku,
                stock_quantity,
                low_stock_threshold,
                availability_status,
              }),
            ),
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
                title="Product sizes"
                description="Select every size offered for this product."
              />

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {variants.map((variant) => (
                    <button
                      key={variant.size}
                      type="button"
                      onClick={() => toggleSize(variant.size)}
                      className={`relative min-h-[84px] border px-4 py-4 text-left transition ${
                        variant.enabled
                          ? "border-white bg-white text-black"
                          : "border-white/10 bg-black/20 text-white/55 hover:border-white/35 hover:text-white"
                      }`}
                    >
                      <span className="text-base font-semibold">
                        {variant.size}
                      </span>

                      <span
                        className={`mt-2 block text-xs ${
                          variant.enabled ? "text-black/50" : "text-white/30"
                        }`}
                      >
                        {variant.enabled ? "Selected" : "Not selected"}
                      </span>

                      {variant.enabled && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="04"
                title="Inventory by size"
                description="Every selected size has separate stock and availability."
              />

              {selectedVariants.length === 0 ? (
                <div className="p-6">
                  <div className="border border-dashed border-white/15 bg-black/20 px-6 py-14 text-center">
                    <Package className="mx-auto h-7 w-7 text-white/30" />

                    <p className="mt-4 font-semibold">No sizes selected</p>

                    <p className="mt-2 text-sm text-white/35">
                      Select at least one size above.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 border-b border-white/10 px-6 py-4">
                    {selectedVariants.map((variant) => {
                      const status = availabilityOptions.find(
                        (option) =>
                          option.value === variant.availability_status,
                      );

                      const isActive = activeVariant?.size === variant.size;

                      return (
                        <button
                          key={variant.size}
                          type="button"
                          onClick={() => setActiveSize(variant.size)}
                          className={`flex items-center gap-3 border px-4 py-3 text-sm font-semibold transition ${
                            isActive
                              ? "border-white bg-white text-black"
                              : "border-white/10 bg-black/20 text-white/55 hover:border-white/35 hover:text-white"
                          }`}
                        >
                          <span>{variant.size}</span>

                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              status?.dotClass ?? "bg-white/30"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {activeVariant && (
                    <div className="p-6">
                      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                            Editing
                          </p>

                          <h3 className="mt-2 text-2xl font-semibold">
                            Size {activeVariant.size}
                          </h3>

                          <p className="mt-1 text-sm text-white/35">
                            These settings affect only size {activeVariant.size}
                            .
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSize(activeVariant.size)}
                          className="border border-red-400/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-red-300 transition hover:bg-red-400/[0.08]"
                        >
                          Remove size
                        </button>
                      </div>

                      <div className="mt-6 grid gap-5 md:grid-cols-3">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                            SKU
                          </label>

                          <input
                            type="text"
                            value={activeVariant.sku}
                            onChange={(event) =>
                              updateSize(activeVariant.size, {
                                sku: event.target.value,
                              })
                            }
                            placeholder="Optional"
                            className="mt-3 w-full border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-white/20 focus:border-white/50"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                            Quantity
                          </label>

                          <input
                            type="number"
                            min="0"
                            disabled={
                              activeVariant.availability_status ===
                                "out_of_stock" ||
                              activeVariant.availability_status ===
                                "coming_soon"
                            }
                            value={
                              activeVariant.availability_status ===
                                "out_of_stock" ||
                              activeVariant.availability_status ===
                                "coming_soon"
                                ? 0
                                : activeVariant.stock_quantity
                            }
                            onChange={(event) =>
                              updateSize(activeVariant.size, {
                                stock_quantity: Math.max(
                                  0,
                                  Number(event.target.value),
                                ),
                              })
                            }
                            className="mt-3 w-full border border-white/10 bg-black/30 px-4 py-4 text-white outline-none focus:border-white/50 disabled:cursor-not-allowed disabled:opacity-35"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                            Low-stock warning
                          </label>

                          <input
                            type="number"
                            min="0"
                            value={activeVariant.low_stock_threshold}
                            onChange={(event) =>
                              updateSize(activeVariant.size, {
                                low_stock_threshold: Math.max(
                                  0,
                                  Number(event.target.value),
                                ),
                              })
                            }
                            className="mt-3 w-full border border-white/10 bg-black/30 px-4 py-4 text-white outline-none focus:border-white/50"
                          />
                        </div>
                      </div>

                      <div className="mt-7">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                          Availability for size {activeVariant.size}
                        </p>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {availabilityOptions.map((option) => {
                            const isActive =
                              activeVariant.availability_status ===
                              option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  updateSize(activeVariant.size, {
                                    availability_status: option.value,
                                    stock_quantity:
                                      option.value === "out_of_stock" ||
                                      option.value === "coming_soon"
                                        ? 0
                                        : activeVariant.stock_quantity,
                                  })
                                }
                                className={`relative min-h-[105px] border p-4 text-left transition ${
                                  isActive
                                    ? option.activeClass
                                    : "border-white/10 bg-black/20 text-white/55 hover:border-white/30 hover:text-white"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-3">
                                      <span
                                        className={`h-2.5 w-2.5 rounded-full ${option.dotClass}`}
                                      />

                                      <p className="text-sm font-semibold">
                                        {option.label}
                                      </p>
                                    </div>

                                    <p className="mt-3 text-xs leading-5 opacity-70">
                                      {option.description}
                                    </p>
                                  </div>

                                  <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                      isActive
                                        ? "border-current"
                                        : "border-white/15"
                                    }`}
                                  >
                                    {isActive && (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="05"
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
                      Sizes
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {selectedVariants.length}
                    </p>
                  </div>

                  <div className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
                      Available
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {orderableSizes}
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

              {selectedVariants.length > 0 && (
                <div className="mt-5 overflow-hidden border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/30">
                      Size overview
                    </p>
                  </div>

                  <div className="divide-y divide-white/10">
                    {selectedVariants.map((variant) => {
                      const status = availabilityOptions.find(
                        (option) =>
                          option.value === variant.availability_status,
                      );

                      return (
                        <button
                          key={variant.size}
                          type="button"
                          onClick={() => setActiveSize(variant.size)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]"
                        >
                          <p className="text-sm font-semibold">
                            {variant.size}
                          </p>

                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                status?.dotClass ?? "bg-white/30"
                              }`}
                            />

                            <p className="text-xs text-white/45">
                              {status?.label}
                            </p>
                          </div>
                        </button>
                      );
                    })}
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
