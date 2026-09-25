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

import {
  ProductCard,
  ProductSidebarCard,
  ProductWorkspace,
} from "@/components/admin/products/v2/product-workspace";
import ProductSaveBar from "@/components/admin/products/v2/product-save-bar";

import { deleteProduct, updateProduct } from "./actions";
import { rememberProductSaveScrollPosition } from "@/components/admin/product-save-result-scroll";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type ExistingVariant = {
  id: string;
  size: string;
  variant_name: string;
  display_position: number | null;
  attributes: Record<string, string> | null;
  sku: string | null;
  barcode: string | null;
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
        barcode: "",
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

    barcode: variant.barcode ?? "",
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
  const [deletePending, startDeleteTransition] = useTransition();

  const [placementSelection, setPlacementSelection] = useState({
    featured: product.isFeatured,
    trending: product.isTrending,
    newArrival: product.isNewArrival,
  });

  const [productSaveState, setProductSaveState] = useState<
    "idle" | "draft" | "publish" | "setup"
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
   * Keep the image manager synchronized with the configuration
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

  const productEffectiveStatus = useMemo(() => {
    if (product.status !== "published") {
      return {
        tone: "draft",
        label: product.status === "archived" ? "Archived" : "Draft",
      };
    }

    const allComingSoon =
      variants.length > 0 &&
      variants.every(
        (variant) => variant.availability_status === "coming_soon",
      );

    if (allComingSoon) {
      return {
        tone: "coming-soon",
        label: "Coming soon",
      };
    }

    const allOutOfStock =
      variants.length > 0 &&
      variants.every(
        (variant) => Number(variant.stock_quantity ?? 0) <= 0,
      );

    if (allOutOfStock) {
      return {
        tone: "out-of-stock",
        label: "Out of stock",
      };
    }

    return {
      tone: "live",
      label: "Published",
    };
  }, [product.status, variants]);
  return (
    <div>
      <div className="st-admin-edit-composition-v2">
<form
        id="st-edit-product-form"
          className="st-admin-product-editor-form"
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
              submitter.value !== "setup" &&
              submitter.value !== "archive")
          ) {
            return;
          }

          event.preventDefault();

          const intent = submitter.value;

          const resolvedIntentInput = form.elements.namedItem(
            "resolved_intent",
          ) as HTMLInputElement | null;

          if (resolvedIntentInput) {
            resolvedIntentInput.value = intent;
          }

          if (
            intent === "draft" ||
            intent === "publish" ||
            intent === "setup"
          ) {
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
             * A product can legitimately have no mounted image manager.
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
              (intent === "draft" ||
                intent === "publish" ||
                intent === "setup") &&
              productSaveCancelledRef.current
            ) {
              productSaveCancelledRef.current = false;
              setProductSaveState("idle");
              return;
            }

            /*
             * The save flow performs asynchronous image/configuration work
             * before the real Server Action submission.
             *
             * Re-assert the original administrator intent immediately before
             * that final submission so a render/form update during the async
             * phase can never restore the hidden field to its Draft default.
             */
            const finalResolvedIntentInput = form.elements.namedItem(
              "resolved_intent",
            ) as HTMLInputElement | null;

            if (!finalResolvedIntentInput) {
              setProductSaveState("idle");
              throw new Error(
                "The product publishing intent field could not be found.",
              );
            }

            finalResolvedIntentInput.value = intent;

            const authoritativeIntentSubmitter =
              form.querySelector<HTMLButtonElement>(
                "#st-authoritative-product-intent-submit",
              );

            if (!authoritativeIntentSubmitter) {
              setProductSaveState("idle");
              throw new Error(
                "The authoritative product submission control could not be found.",
              );
            }

            authoritativeIntentSubmitter.value = intent;

              if (
                intent === "draft" ||
                intent === "publish" ||
                intent === "setup"
              ) {
                rememberProductSaveScrollPosition();
              }

            if (process.env.NODE_ENV === "development") {
              console.log("[EDIT PRODUCT] final client intent", {
                capturedIntent: intent,
                resolvedIntent: finalResolvedIntentInput.value,
                submittedIntent: authoritativeIntentSubmitter.value,
              });
            }

            form.dataset.photoUsageFlushed = "true";
            form.requestSubmit(authoritativeIntentSubmitter);
          });
        }}
      >
        <input
          type="hidden"
          name="resolved_intent"
          defaultValue={product.status === "published" ? "publish" : "draft"}
        />

        <button
          id="st-authoritative-product-intent-submit"
          type="submit"
          name="intent"
          value="draft"
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />

        {false && (
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
                    <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#1d1d1f]">
                      Stereophonie Product Manager
                    </p>

                    <h2 className="mt-2 text-[21px] font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                      {productSaveState === "publish"
                        ? "Saving and publishing"
                        : productSaveState === "setup"
                          ? "Saving product setup"
                          : "Saving product draft"}
                    </h2>

                    <p className="mt-2 text-[12px] leading-5 text-[#6e6e73]">
                      {productSaveState === "publish"
                        ? "Processing your latest changes before this product goes live."
                        : productSaveState === "setup"
                          ? "Saving product information, configurations and store placement. Publication status will stay unchanged."
                          : "Processing your latest changes before saving this draft."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[15px] border border-black/[0.055] bg-[#f7f7f8] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1d1d1f]" />

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
                background: #1d1d1f !important;
                transform: scaleX(0);
                transform-origin: left center;
                box-shadow:
                  0 0 7px rgba(29, 29, 31, 0.18),
                  0 0 14px rgba(29, 29, 31, 0.08);
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
              barcode: variant.barcode ?? "",
              regular_price: variant.regular_price,
              sale_price: variant.sale_price,
              stock_quantity: variant.stock_quantity,
              low_stock_threshold: variant.low_stock_threshold,
              availability_status: variant.availability_status,
            })),
          )}
        />

        <ProductWorkspace
            actionBar={
              <ProductSaveBar
                productName={productName}
                isSubmitting={productSaveState !== "idle"}
                progress={
                  productSaveState === "idle"
                    ? 0
                    : productSaveState === "publish"
                      ? 78
                      : 68
                }
                statusText={
                  productSaveState === "publish"
                    ? "Publishing changes..."
                    : productSaveState === "setup"
                      ? "Saving changes..."
                      : productSaveState === "draft"
                        ? "Saving draft..."
                        : product.status === "published"
                          ? "Published product"
                          : "Draft product"
                }
                onDraft={() => undefined}
                onPublish={() => undefined}
                onDelete={permanentlyDeleteProduct}
                deletePending={deletePending}
                formId="st-edit-product-form"
                editMode
                editIntent={
                  product.status === "published"
                    ? "publish"
                    : "draft"
                }
              />
            }
            sidebar={
              <>
                <ProductSidebarCard title="Status">
                  <div
                    className={`st-admin-product-status-summary-v2 is-${productEffectiveStatus.tone}`}
                    data-admin-product-effective-status={productEffectiveStatus.tone}
                  >
                    <div>
                      <strong>{productEffectiveStatus.label}</strong>

                      <small>
                        Use Save Changes in the fixed header to keep your edits.
                      </small>
                    </div>
                  </div>
                </ProductSidebarCard>

                <ProductSidebarCard title="Product organization">
                  <div className="st-admin-product-sidebar-stack-v2 st-admin-product-organization-v2">
                    <div>
                      <label className="st-admin-product-sidebar-label-v2">
                        Brand
                      </label>

                      <ProductBrandPicker
                        brands={brands}
                        defaultValue={product.brandId}
                        onBrandChange={(brand) => {
                          setSelectedBrandName(
                            brand?.name ?? "",
                          );
                        }}
                      />
                    </div>

                    <div>
                      <label className="st-admin-product-sidebar-label-v2">
                        Category
                      </label>

                      <ProductCategoryPicker
                        categories={categories}
                        defaultValue={product.categoryId}
                        onCategoryChange={(category) => {
                          const nextCategoryId =
                            category?.id ?? "";

                          setSelectedCategoryId(
                            nextCategoryId,
                          );

                          setSelectedCategoryName(
                            category?.name ?? "",
                          );

                          if (
                            nextCategoryId !==
                            selectedCategoryId
                          ) {
                            setSelectedSubcategoryId("");
                          }
                        }}
                      />
                    </div>
                  </div>
                </ProductSidebarCard>

                <ProductSidebarCard title="Store placement">
                  <div className="st-admin-placement-compact-v2 st-admin-product-placement-v2">
                    <label className="st-admin-placement-compact-v2__row">
                      <span>
                        <strong>Featured</strong>
                        <small>
                          Prioritize this product in featured storefront areas.
                        </small>
                      </span>

                      <input
                        type="checkbox"
                        name="is_featured"
                        disabled={productOutOfStock}
                        checked={
                          productOutOfStock
                            ? false
                            : placementSelection.featured
                        }
                        onChange={(event) =>
                          setPlacementSelection((current) => ({
                            ...current,
                            featured: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    <label className="st-admin-placement-compact-v2__row">
                      <span>
                        <strong>Trending</strong>
                        <small>
                          Include it in highlighted and trending selections.
                        </small>
                      </span>

                      <input
                        type="checkbox"
                        name="is_trending"
                        disabled={productOutOfStock}
                        checked={
                          productOutOfStock
                            ? false
                            : placementSelection.trending
                        }
                        onChange={(event) =>
                          setPlacementSelection((current) => ({
                            ...current,
                            trending: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    <label className="st-admin-placement-compact-v2__row">
                      <span>
                        <strong>New arrival</strong>
                        <small>
                          Present this product as recently added.
                        </small>
                      </span>

                      <input
                        type="checkbox"
                        name="is_new_arrival"
                        disabled={productOutOfStock}
                        checked={
                          productOutOfStock
                            ? false
                            : placementSelection.newArrival
                        }
                        onChange={(event) =>
                          setPlacementSelection((current) => ({
                            ...current,
                            newArrival: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    {productOutOfStock ? (
                      <p className="st-admin-placement-compact-v2__note">
                        Store placement is disabled while every sellable
                        configuration is unavailable.
                      </p>
                    ) : null}
                  </div>
                </ProductSidebarCard>

                <ProductSidebarCard title="Summary">
                  <dl className="st-admin-product-summary-v2">
                    <div>
                      <dt>Configurations</dt>
                      <dd>{variants.length}</dd>
                    </div>

                    <div>
                      <dt>Available</dt>
                      <dd>{availableConfigurations}</dd>
                    </div>

                    <div>
                      <dt>Total stock</dt>
                      <dd>{totalStock}</dd>
                    </div>
                  </dl>
                </ProductSidebarCard>
              </>
            }
          >
            <ProductCard
              title="Product information"
              description="Edit the customer-facing product information and specifications."
            >
              <div className="st-admin-product-information-v2">
                <label className="st-admin-product-field-v2">
                  <span>Title</span>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={productName}
                    onChange={(event) =>
                      setProductName(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="st-admin-product-field-v2">
                  <span>Description</span>

                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    defaultValue={product.description}
                    placeholder="Describe the product."
                  className="st-admin-product-description-focus-real"
                  onFocus={(event) => {
                    const field = event.currentTarget;

                    field.style.setProperty("border-color", "#202223", "important");
                    field.style.setProperty(
                      "box-shadow",
                      "0 0 0 1px #202223",
                      "important",
                    );
                    field.style.setProperty("outline", "none", "important");
                  }}
                  onBlur={(event) => {
                    const field = event.currentTarget;

                    field.style.removeProperty("border-color");
                    field.style.removeProperty("box-shadow");
                    field.style.removeProperty("outline");
                  }}
                  />
                </label>

                <div
                  id="st-product-information-specifications"
                  data-admin-product-specifications-target="true"
                />
              </div>
            </ProductCard>



            <ProductCard
              title="Configurations"
              description="Manage options, pricing, inventory, SKU, barcode and availability."
            >
              <div id="inventory" />

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
            </ProductCard>
          </ProductWorkspace>
        </form>

      {mediaManager ? (
        <div
          className="st-admin-edit-product-media-v2"
          data-admin-edit-product-media="true"
        >
        <ProductCard
                      title="Media"
                      description="Manage product images, order and configuration assignment."
                    >
                      {mediaManager ? (
                        <div
                          id="product-images"
                          data-admin-product-media-section="v2"
                        >
                          {mediaManager}
                        </div>
                      ) : (
                        <div className="st-admin-product-media-empty-v2">
                          No media manager is available for this product.
                        </div>
                      )}
                    </ProductCard>
        </div>
      ) : null}
      </div>


      <section
        data-admin-danger-zone="true"
        hidden
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
            image records and uploaded files.
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
              onClick={permanentlyDeleteProduct}
              className="mt-4 inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-[11px] border border-[#c9342f] bg-[#c9342f] px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[#ab2925]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete permanently
            </button>
          </div>
        </div>
      </section>


    </div>
  );
}
