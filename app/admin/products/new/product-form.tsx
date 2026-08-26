"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Save,
  Send,
  Diamond,
  Star,
  TrendingUp,
} from "lucide-react";

import { createProduct } from "./actions";
import {
  uploadImagesBeforeProductSubmission,
  type DirectUploadSelectedImage,
} from "./direct-upload-client";
import ImageUploader from "./image-uploader";

import ProductBrandPicker from "@/components/admin/product-brand-picker";
import ProductCategoryPicker from "@/components/admin/product-category-picker";
import ElectronicsVariantEditor, {
  type AdminElectronicsVariant,
} from "@/components/admin/products/electronics-variant-editor";

type Category = {
  id: string;
  name: string;
};

type Brand = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: Category[];
  brands: Brand[];
  errorMessage?: string;
};

function createInitialVariants(): AdminElectronicsVariant[] {
  return [
    {
      clientId: crypto.randomUUID(),
      variant_name: "",
      display_position: 0,
      attributes: {},
      sku: "",
      regular_price: "",
      sale_price: "",
      stock_quantity: 0,
      low_stock_threshold: 2,
      availability_status: "",
    },
  ];
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-[10px] font-semibold text-white/40">
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

export default function ProductForm({
  categories,
  brands,
  errorMessage,
}: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  /*
   * Preserve exactly which publishing action the administrator
   * selected while photographs are prepared before the final
   * server submission.
   */
  const pendingIntentRef = useRef<"draft" | "publish">("draft");

  /*
   * Hidden form field is updated imperatively because changing
   * a React ref does not itself trigger a re-render.
   */
  const resolvedIntentInputRef = useRef<HTMLInputElement>(null);
  const [productName, setProductName] = useState("");
  const [selectedImages, setSelectedImages] = useState<
    DirectUploadSelectedImage[]
  >([]);
  const [directUploadedImagesJson, setDirectUploadedImagesJson] =
    useState("[]");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  const [variants, setVariants] = useState<AdminElectronicsVariant[]>(
    createInitialVariants,
  );

  const [placementSelection, setPlacementSelection] = useState({
    featured: false,
    trending: false,
    newArrival: false,
  });

  const [selectedCategoryName, setSelectedCategoryName] = useState("");

  const [selectedBrandName, setSelectedBrandName] = useState("");

  const totalStock = useMemo(() => {
    return variants.reduce((total, variant) => {
      const unavailable =
        variant.availability_status === "out_of_stock" ||
        variant.availability_status === "coming_soon";

      return total + (unavailable ? 0 : Number(variant.stock_quantity) || 0);
    }, 0);
  }, [variants]);

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

  const handleImagesChange = useCallback(
    (images: DirectUploadSelectedImage[]) => {
      /*
       * ImageUploader creates a derived array for the parent.
       *
       * Never commit a React state update when that derived payload is
       * identical to what ProductForm already has. Without this guard,
       * an ImageUploader effect can cause:
       *
       * effect -> setSelectedImages -> parent render -> effect -> ...
       *
       * resulting in "Maximum update depth exceeded".
       */
      setSelectedImages((current) => {
        if (current.length !== images.length) {
          return images;
        }

        const unchanged = current.every((existing, index) => {
          const incoming = images[index];

          if (!incoming) {
            return false;
          }

          return (
            existing.file === incoming.file &&
            existing.altText === incoming.altText &&
            existing.isPrimary === incoming.isPrimary &&
            existing.position === incoming.position &&
            existing.variantName === incoming.variantName
          );
        });

        return unchanged ? current : images;
      });
    },
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;

    const nativeEvent = event.nativeEvent as SubmitEvent;

    const submitter =
      nativeEvent.submitter instanceof HTMLButtonElement
        ? nativeEvent.submitter
        : null;

    const submissionIntent: "draft" | "publish" =
      submitter?.value === "publish"
        ? "publish"
        : pendingIntentRef.current === "publish"
          ? "publish"
          : "draft";

    pendingIntentRef.current = submissionIntent;

    if (resolvedIntentInputRef.current) {
      resolvedIntentInputRef.current.value = submissionIntent;
    }

    /*
     * IMPORTANT:
     *
     * We always take ownership of this submission.
     * There is NO recursive requestSubmit().
     */
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmissionError("");
    setUploadPercentage(0);
    setUploadFileName("");
    setIsSubmitting(true);

    try {
      let uploadedImages: Awaited<
        ReturnType<typeof uploadImagesBeforeProductSubmission>
      > = [];

      /*
       * Only enter the upload pipeline when the administrator
       * has actually selected photographs.
       *
       * A photo-less draft therefore saves immediately instead
       * of sitting forever on "{pendingIntentRef.current === "draft"
                        ? "Saving safely to Draft products"
                        : "Preparing product submission"} 0%".
       */
      if (selectedImages.length > 0) {
        uploadedImages = await uploadImagesBeforeProductSubmission(form, {
          images: selectedImages,
          validateForm: submissionIntent === "publish",

          onProgress(progress) {
            setUploadPercentage(progress.percentage);

            setUploadFileName(progress.currentFileName);
          },
        });
      }

      const uploadedImagesJson = JSON.stringify(uploadedImages);

      setDirectUploadedImagesJson(uploadedImagesJson);

      /*
       * Build the exact FormData ourselves.
       *
       * This avoids requestSubmit(), browser revalidation,
       * duplicate submit events and submitter-loss entirely.
       */
      const formData = new FormData(form);

      formData.set("resolved_intent", submissionIntent);

      formData.set("intent", submissionIntent);

      formData.set("direct_uploaded_images", uploadedImagesJson);

      /*
       * Call the Server Action directly.
       *
       * createProduct performs the database insert and redirects
       * after success.
       */
      await createProduct(formData);
    } catch (error) {
      /*
       * Next.js Server Actions implement redirect() by throwing
       * a special NEXT_REDIRECT control-flow error.
       *
       * That is SUCCESSFUL navigation, not a product failure.
       * It must be re-thrown so Next.js can complete the redirect.
       */
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof (error as { digest?: unknown }).digest === "string" &&
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }

      console.error("Product submission failed:", error);

      setSubmissionError(
        error instanceof Error
          ? error.message
          : "The product could not be saved.",
      );

      setIsSubmitting(false);
      setUploadPercentage(0);
      setUploadFileName("");
    }
  }

  return (
    <form ref={formRef} action={createProduct} onSubmit={handleSubmit}>
      <input
        ref={resolvedIntentInputRef}
        type="hidden"
        name="resolved_intent"
        defaultValue="draft"
      />

      <input
        type="hidden"
        name="direct_uploaded_images"
        value={directUploadedImagesJson}
        readOnly
      />

      <input
        type="hidden"
        name="variants_json"
        value={JSON.stringify(
          variants.map((variant) => ({
            client_id: variant.clientId,
            variant_name: variant.variant_name,
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
        readOnly
      />

      {(errorMessage || submissionError) && (
        <div className="mb-7 flex items-start gap-4 rounded-2xl border border-red-400/30 bg-red-400/[0.07] p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
              Product not saved
            </p>

            <p className="mt-2 text-sm leading-6 text-white/65">
              {submissionError || errorMessage}
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
              description="Add the essential product details, category and manufacturer."
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
                  placeholder="Galaxy S26 Ultra"
                  className="mt-3 w-full border border-white/10 bg-black/30 px-4 py-4 text-white outline-none transition placeholder:text-white/20 focus:border-white/55"
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
                  placeholder="Describe the key specifications, compatibility, warranty and what is included."
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

                  <ProductCategoryPicker
                    categories={categories}
                    onCategoryChange={(category) => {
                      setSelectedCategoryName(category?.name ?? "");
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                    Brand
                  </label>

                  <div className="mt-3">
                    <ProductBrandPicker
                      brands={brands}
                      onBrandChange={(brand) =>
                        setSelectedBrandName(brand?.name ?? "")
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0d]">
            <SectionHeader
              number="02"
              title="Product images"
              description="Upload clear product images, choose the main image and arrange their order."
            />

            <div className="p-5">
              <ImageUploader
                disabled={isSubmitting}
                configurations={variants.map((variant, index) => ({
                  clientId: variant.clientId,
                  variant_name: variant.variant_name,
                  attributes: variant.attributes,
                  fallbackLabel: `Configuration ${index + 1}`,
                }))}
                onImagesChange={handleImagesChange}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0d]">
            <SectionHeader
              number="03"
              title="Product configurations"
              description="Create every sellable version of this product and define its technical specifications, SKU, stock and availability."
            />

            <div className="p-5">
              <ElectronicsVariantEditor
                variants={variants}
                onChange={setVariants}
                categoryName={selectedCategoryName}
                brandName={selectedBrandName}
              />
            </div>
          </section>

          <section className="st-admin-store-placement overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0d]">
            <SectionHeader
              number="04"
              title="Store placement"
              description="Choose where this product should receive extra visibility in the storefront."
            />

            <div className="st-admin-placement-grid">
              <label className="st-admin-placement-card">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={placementSelection.featured}
                  onChange={(event) =>
                    setPlacementSelection((current) => ({
                      ...current,
                      featured: event.target.checked,
                    }))
                  }
                  className="sr-only"
                />

                <span
                  className={`st-admin-placement-card__surface ${placementSelection.featured ? "is-selected" : ""}`}
                >
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
                  name="is_trending"
                  checked={placementSelection.trending}
                  onChange={(event) =>
                    setPlacementSelection((current) => ({
                      ...current,
                      trending: event.target.checked,
                    }))
                  }
                  className="sr-only"
                />

                <span
                  className={`st-admin-placement-card__surface ${placementSelection.trending ? "is-selected" : ""}`}
                >
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
                  name="is_new_arrival"
                  checked={placementSelection.newArrival}
                  onChange={(event) =>
                    setPlacementSelection((current) => ({
                      ...current,
                      newArrival: event.target.checked,
                    }))
                  }
                  className="sr-only"
                />

                <span
                  className={`st-admin-placement-card__surface ${placementSelection.newArrival ? "is-selected" : ""}`}
                >
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
          <section className="rounded-[18px] border border-white/10 bg-[#101010] p-5 xl:sticky xl:top-[92px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Product summary
            </p>

            <h2 className="mt-2 text-xl font-semibold">Save product</h2>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/30">
                  Product
                </p>

                <p className="mt-2 truncate font-semibold">
                  {productName || "Untitled product"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    Configurations
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {variants.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    Available
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {availableConfigurations}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    Stock
                  </p>

                  <p className="mt-2 text-xl font-semibold">{totalStock}</p>
                </div>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
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

                      <div className="shrink-0 text-right">
                        <p className="text-xs text-white/45">
                          {variant.availability_status
                            .replaceAll("_", " ")
                            .replace(/\b\w/g, (character) =>
                              character.toUpperCase(),
                            )}
                        </p>

                        <p className="mt-1 text-[10px] text-white/25">
                          Stock {variant.stock_quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isSubmitting && (
              <div className="mt-6 rounded-2xl border border-sky-400/25 bg-sky-400/[0.06] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                      {pendingIntentRef.current === "draft"
                        ? "Saving draft"
                        : selectedImages.length > 0
                          ? "Preparing photographs"
                          : "Publishing product"}
                    </p>

                    <p className="mt-2 truncate text-xs text-white/45">
                      {uploadFileName ||
                        (pendingIntentRef.current === "draft"
                          ? "Saving safely to Draft products"
                          : selectedImages.length > 0
                            ? "Preparing product photographs"
                            : "Preparing product submission")}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-sky-200">
                    {uploadPercentage}%
                  </p>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-sky-300 transition-[width] duration-200"
                    style={{
                      width: `${uploadPercentage}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                Customer visibility
              </p>

              <div className="mt-4 space-y-3">
                <button
                  type="submit"
                  name="intent"
                  value="draft"
                  formNoValidate
                  onClick={() => {
                    pendingIntentRef.current = "draft";

                    if (resolvedIntentInputRef.current) {
                      resolvedIntentInputRef.current.value = "draft";
                    }
                  }}
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-between rounded-full border border-white/15 bg-white/[0.025] px-5 py-4 text-xs font-semibold uppercase tracking-[0.17em] text-white transition hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
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
                  onClick={() => {
                    pendingIntentRef.current = "publish";

                    if (resolvedIntentInputRef.current) {
                      resolvedIntentInputRef.current.value = "publish";
                    }
                  }}
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-between rounded-full border border-emerald-300 bg-emerald-300 px-5 py-4 text-xs font-semibold uppercase tracking-[0.17em] text-black transition hover:bg-transparent hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="flex items-center gap-3">
                    <Eye className="h-4 w-4" />
                    Publish live
                  </span>

                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex gap-3 text-xs leading-5 text-white/35">
                  <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>Draft keeps the product hidden from customers.</p>
                </div>

                <div className="flex gap-3 text-xs leading-5 text-white/35">
                  <Send className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>Publish Live makes it visible on the storefront.</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
