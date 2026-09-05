"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
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

import ProductBrandPicker from "@/components/admin/product-brand-picker";
import ProductCategoryPicker from "@/components/admin/product-category-picker";
import ElectronicsVariantEditor, {
  type AdminElectronicsVariant,
} from "@/components/admin/products/electronics-variant-editor";

import { deleteProduct, updateProduct } from "./actions";

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
    display_position: Number(variant.display_position ?? 0),
    attributes: variant.attributes ?? {},
    sku: variant.sku ?? "",

    regular_price:
      variant.regular_price === null || variant.regular_price === undefined
        ? ""
        : Number(variant.regular_price),

    sale_price:
      variant.sale_price === null || variant.sale_price === undefined
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
    <div className="flex gap-3 border-b border-white/10 px-5 py-4">
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
    subcategoryId: string;
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
  mediaManager?: ReactNode;
};

export default function EditProductForm({
  product,
  categories,
  brands,
  errorMessage,
  mediaManager,
}: EditProductFormProps) {
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const [deletePending, startDeleteTransition] = useTransition();

  const [productSaveState, setProductSaveState] = useState<
    "idle" | "draft" | "publish"
  >("idle");

  const productSaveCancelledRef = useRef(false);

  function cancelProductSave() {
    productSaveCancelledRef.current = true;
    setProductSaveState("idle");
  }

  function permanentlyDeleteProduct() {
    if (deletePending) {
      return;
    }

    const formData = new FormData();

    formData.set("product_id", product.id);

    startDeleteTransition(async () => {
      await deleteProduct(formData);
    });
  }

  const [productName, setProductName] = useState(product.name);

  const initialCategoryName =
    categories.find((category) => category.id === product.categoryId)?.name ??
    "";

  const initialBrandName =
    brands.find((brand) => brand.id === product.brandId)?.name ?? "";

  const [selectedCategoryId, setSelectedCategoryId] = useState(
    product.categoryId,
  );

  const [selectedCategoryName, setSelectedCategoryName] =
    useState(initialCategoryName);

  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(
    product.subcategoryId,
  );

  const [selectedBrandName, setSelectedBrandName] = useState(initialBrandName);

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
      new CustomEvent("stereophonie:admin-product-configurations", {
        detail: {
          configurations: variants.map((variant, index) => ({
            id: variant.id ?? variant.clientId,
            persisted: Boolean(variant.id),
            variant_name: String(variant.variant_name ?? "").trim(),
            fallbackLabel:
              String(variant.variant_name ?? "").trim() ||
              `Configuration ${index + 1}`,
          })),
        },
      }),
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

  /*
   * Store placement cannot be selected for an aggregate
   * Out-of-Stock product.
   */
  const productOutOfStock = useMemo(() => {
    if (variants.length === 0) {
      return false;
    }

    const allComingSoon = variants.every(
      (variant) => variant.availability_status === "coming_soon",
    );

    const hasAvailableConfiguration = variants.some(
      (variant) =>
        variant.availability_status === "in_stock" ||
        variant.availability_status === "low_stock",
    );

    return !allComingSoon && !hasAvailableConfiguration;
  }, [variants]);
  return (
    <div>
      <form
        id="st-edit-product-form"
        action={updateProduct}
        onSubmit={(event) => {
          const form = event.currentTarget;
          const nativeEvent = event.nativeEvent as SubmitEvent;
          const submitter = nativeEvent.submitter as HTMLButtonElement | null;

          if (form.dataset.photoUsageFlushed === "true") {
            delete form.dataset.photoUsageFlushed;
            return;
          }

          if (
            !submitter ||
            (submitter.value !== "publish" &&
              submitter.value !== "draft" &&
              submitter.value !== "archive")
          ) {
            return;
          }

          event.preventDefault();

          const intent = submitter.value;

          if (intent === "draft" || intent === "publish") {
            productSaveCancelledRef.current = false;
            setProductSaveState(intent);
          }

          void new Promise<boolean>((resolve) => {
            const detail = {
              handled: false,
              resolve,
            };

            window.dispatchEvent(
              new CustomEvent("stereophonie:admin-save-photo-usage", {
                detail,
              }),
            );

            /*
             * A product can legitimately have no mounted photograph manager.
             * In that case there is nothing to flush and the product save
             * must continue immediately instead of hanging forever.
             */
            if (!detail.handled) {
              resolve(true);
            }
          }).then((saved) => {
            if (!saved) {
              setProductSaveState("idle");
              return;
            }

            if (
              (intent === "draft" || intent === "publish") &&
              productSaveCancelledRef.current
            ) {
              productSaveCancelledRef.current = false;
              setProductSaveState("idle");
              return;
            }

            form.dataset.photoUsageFlushed = "true";

            const authoritativeSubmitter =
              document.querySelector<HTMLButtonElement>(
                intent === "publish"
                  ? "#st-save-existing-product-publish"
                  : intent === "archive"
                    ? "#st-archive-existing-product"
                    : "#st-save-existing-product-draft",
              );

            if (authoritativeSubmitter) {
              form.requestSubmit(authoritativeSubmitter);
            }
          });
        }}
      >
        {productSaveState !== "idle" && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center px-5"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.24)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
            aria-live="assertive"
            aria-busy="true"
          >
            <div className="w-full max-w-[420px] overflow-hidden rounded-[22px] border border-white/70 bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
              <div className="p-6">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#c97d00]">
                      Stereophonie Product Manager
                    </p>

                    <h2 className="mt-2 text-[21px] font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                      {productSaveState === "publish"
                        ? "Saving and publishing"
                        : "Saving product draft"}
                    </h2>

                    <p className="mt-2 text-[12px] leading-5 text-[#6e6e73]">
                      {productSaveState === "publish"
                        ? "Processing your latest changes before this product goes live."
                        : "Processing your latest changes before saving this draft."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[15px] border border-black/[0.055] bg-[#f7f7f8] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#fdb73e]" />

                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#515154]">
                        Processing
                      </span>
                    </div>

                    <span className="text-[9px] text-[#86868b]">
                      Please wait
                    </span>
                  </div>

                  <div className="st-product-save-track relative mt-3 h-[7px] w-full overflow-hidden rounded-full bg-black/[0.08]">
                    <div
                      className="st-product-save-loader absolute inset-y-0 left-0 rounded-full"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-black/[0.07] pt-4">
                  <p className="max-w-[210px] text-[10px] leading-[16px] text-[#86868b]">
                    You can cancel before the final save is submitted.
                  </p>

                  <button
                    type="button"
                    onClick={cancelProductSave}
                    className="shrink-0 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-red-600 transition hover:border-red-300 hover:bg-red-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            <style>{`
              .st-product-save-track {
                position: relative;
                isolation: isolate;
              }

              .st-product-save-loader {
                display: block !important;
                width: 100%;
                opacity: 1 !important;
                visibility: visible !important;
                background: #fdb73e !important;
                transform: scaleX(0);
                transform-origin: left center;
                box-shadow:
                  0 0 7px rgba(253, 183, 62, 0.32),
                  0 0 14px rgba(253, 183, 62, 0.12);
                animation: stProductSaveFill 7.5s
                  cubic-bezier(0.22, 0.61, 0.36, 1)
                  1 forwards !important;
                will-change: transform;
                z-index: 2;
              }

              @keyframes stProductSaveFill {
                0% {
                  transform: scaleX(0);
                }

                15% {
                  transform: scaleX(0.12);
                }

                38% {
                  transform: scaleX(0.34);
                }

                62% {
                  transform: scaleX(0.61);
                }

                82% {
                  transform: scaleX(0.82);
                }

                96% {
                  transform: scaleX(1);
                }

                100% {
                  transform: scaleX(1);
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .st-product-save-loader {
                  animation: stProductSaveFill 7.5s
                    linear 1 forwards !important;
                }
              }
            `}</style>
          </div>
        )}

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
              display_position: Number(variant.display_position ?? 0),

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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-7">
            <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0d]">
              <SectionHeader
                number="01"
                title="Product information"
                description="Update the product name, description, category and brand."
              />

              <div className="space-y-5 p-5">
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

                <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 md:items-start">
                  <div className="min-w-0">
                    <label
                      htmlFor="category"
                      className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                    >
                      Category
                    </label>

                    <ProductCategoryPicker
                      categories={categories}
                      defaultValue={product.categoryId}
                      onCategoryChange={(category) => {
                        const nextCategoryId = category?.id ?? "";

                        setSelectedCategoryId(nextCategoryId);
                        setSelectedCategoryName(category?.name ?? "");

                        if (nextCategoryId !== selectedCategoryId) {
                          setSelectedSubcategoryId("");
                        }
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor="brand"
                      className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                    >
                      Brand
                    </label>

                    <ProductBrandPicker
                      brands={brands}
                      defaultValue={product.brandId}
                      onBrandChange={(brand) =>
                        setSelectedBrandName(brand?.name ?? "")
                      }
                    />
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

              <div className="p-5">
                <div id="inventory" className="scroll-mt-[110px]" />

                <ElectronicsVariantEditor
                  variants={variants}
                  onChange={setVariants}
                  categoryName={selectedCategoryName}
                  brandName={selectedBrandName}
                  saveExistingConfigurationIntent={
                    product.status === "published" ? "publish" : "draft"
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
                    key={`featured-${productOutOfStock}`}
                    name="is_featured"
                    disabled={productOutOfStock}
                    defaultChecked={
                      productOutOfStock ? false : product.isFeatured
                    }
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
                    key={`trending-${productOutOfStock}`}
                    name="is_trending"
                    disabled={productOutOfStock}
                    defaultChecked={
                      productOutOfStock ? false : product.isTrending
                    }
                    className="sr-only"
                  />

                  <span className="st-admin-placement-card__surface">
                    <span className="st-admin-placement-card__icon">
                      <TrendingUp className="h-5 w-5" />
                    </span>

                    <span className="st-admin-placement-card__copy">
                      <strong>Trending</strong>
                      <small>
                        Include this product in highlighted and trending
                        selections.
                      </small>
                    </span>
                  </span>
                </label>

                <label className="st-admin-placement-card">
                  <input
                    type="checkbox"
                    key={`new-arrival-${productOutOfStock}`}
                    name="is_new_arrival"
                    disabled={productOutOfStock}
                    defaultChecked={
                      productOutOfStock ? false : product.isNewArrival
                    }
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

            <section className="overflow-hidden rounded-[24px] border border-[#fdb73e]/25 bg-[#0d0d0d]">
              <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#fdb73e]">
                    Setup checkpoint
                  </p>

                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white">
                    Save product setup
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/40">
                    Save product information, configurations and store placement
                    before managing photographs. The current Live or Draft
                    status will stay exactly as it is.
                  </p>
                </div>

                <button
                  id="st-save-product-setup"
                  type="submit"
                  name="intent"
                  value="setup"
                  disabled={productSaveState !== "idle"}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e2a128] bg-[#fdb73e] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Save className="h-4 w-4" />
                  Save product setup
                </button>
              </div>
            </section>
          </div>

          <aside>
            <section className="rounded-[18px] border border-white/10 bg-[#101010] p-5 xl:sticky xl:top-[92px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                Product summary
              </p>

              <h2 className="mt-2 text-xl font-semibold">Save changes</h2>

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
                    disabled={productSaveState !== "idle"}
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
                    disabled={productSaveState !== "idle"}
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

      {mediaManager ? (
        <div className="mt-7" data-admin-product-media-section="04">
          {mediaManager}
        </div>
      ) : null}

      <section
        data-admin-danger-zone="true"
        className="mt-7 overflow-hidden rounded-[20px] border border-red-200 bg-[#fffafa]"
      >
        <div className="border-b border-red-100 px-5 py-5 sm:px-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#b42318]">
            Danger zone
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[#1d1d1f]">
            Archive or permanently delete
          </h2>

          <p className="mt-2 max-w-3xl text-[13px] leading-5 text-[#6e6e73]">
            Archive a product when you only want to remove it from the
            storefront. Permanent deletion removes the product, configurations,
            photograph records and uploaded files.
          </p>
        </div>

        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
          <div className="flex min-h-[132px] flex-col justify-between rounded-[16px] border border-black/[0.08] bg-white p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6e6e73]">
                Reversible
              </p>

              <h3 className="mt-2 text-base font-semibold text-[#1d1d1f]">
                Archive product
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#86868b]">
                Hide this product from customers while preserving its
                information in the administration system.
              </p>
            </div>

            <div className="mt-4">
              <button
                id="st-archive-existing-product"
                type="submit"
                form="st-edit-product-form"
                name="intent"
                value="archive"
                data-secondary-action="true"
                data-admin-archive-action="true"
                onClick={(event) => {
                  const confirmed = window.confirm(
                    "Archive this product? Your current edits will be saved first, then the product will be hidden from customers.",
                  );

                  if (!confirmed) {
                    event.preventDefault();
                  }
                }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] border border-[#dca02d] bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#1d1d1f] transition-all duration-200 hover:-translate-y-px hover:border-[#e0a126] hover:bg-[#fffdf8] hover:shadow-[0_0_0_4px_rgba(245,179,53,0.12),0_8px_24px_rgba(190,127,12,0.13)] focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_rgba(245,179,53,0.14)]"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive product
              </button>
            </div>
          </div>

          <div className="flex min-h-[132px] flex-col justify-between rounded-[16px] border border-red-200 bg-[#fff7f7] p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#b42318]">
                Irreversible
              </p>

              <h3 className="mt-2 text-base font-semibold text-[#1d1d1f]">
                Permanently delete
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#7a5656]">
                Completely remove this product and its associated records. This
                operation cannot be undone.
              </p>
            </div>

            <button
              type="button"
              data-destructive-trigger="true"
              onClick={() => setDeleteConfirmationOpen(true)}
              className="mt-4 inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-[11px] border border-[#c9342f] bg-[#c9342f] px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[#ab2925]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete permanently
            </button>
          </div>
        </div>

        {deleteConfirmationOpen ? (
          <div
            className="st-admin-product-delete-confirmation"
            aria-live="polite"
          >
            <button
              type="button"
              aria-label="Cancel product deletion"
              disabled={deletePending}
              onClick={() => setDeleteConfirmationOpen(false)}
              className="st-admin-product-delete-confirmation__backdrop"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-product-dialog-title"
              aria-describedby="delete-product-dialog-description"
              className="relative z-10 w-full max-w-[470px] overflow-hidden rounded-[22px] border border-black/10 bg-white text-[#1d1d1f] shadow-[0_30px_100px_rgba(0,0,0,0.22)]"
            >
              <div className="border-b border-black/[0.07] px-6 py-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#b42318]">
                  Permanent action
                </p>

                <h2
                  id="delete-product-dialog-title"
                  className="mt-2 pr-5 text-[22px] font-semibold tracking-[-0.035em]"
                >
                  Delete this product permanently?
                </h2>
              </div>

              <div className="px-6 py-5">
                <p
                  id="delete-product-dialog-description"
                  className="text-[13px] leading-6 text-[#6e6e73]"
                >
                  You are about to permanently delete{" "}
                  <strong className="font-semibold text-[#1d1d1f]">
                    {product.name}
                  </strong>
                  . Its configurations, image records and uploaded product files
                  will also be removed.
                </p>

                <div className="mt-4 rounded-[14px] border border-red-100 bg-[#fff6f6] px-4 py-3">
                  <strong className="block text-xs font-semibold text-[#a42620]">
                    This cannot be undone.
                  </strong>

                  <p className="mt-1 text-[11px] leading-5 text-[#8c5a57]">
                    If you may need this product again later, cancel and use
                    Archive instead.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-black/[0.07] bg-[#fafafa] px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={deletePending}
                  onClick={() => setDeleteConfirmationOpen(false)}
                  className="inline-flex min-h-10 items-center justify-center rounded-[11px] border border-black/10 bg-white px-5 text-[11px] font-semibold text-[#1d1d1f] transition hover:bg-[#f2f2f3] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  data-destructive="true"
                  disabled={deletePending}
                  onClick={permanentlyDeleteProduct}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] border border-[#c9342f] bg-[#c9342f] px-5 text-[11px] font-semibold text-white transition hover:bg-[#ab2925] disabled:cursor-wait disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />

                  {deletePending ? "Deleting product..." : "Delete permanently"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
