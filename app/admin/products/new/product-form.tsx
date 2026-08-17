"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Package,
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

type Collection = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: Category[];
  brands: Brand[];
  collections: Collection[];
  errorMessage?: string;
};

function createInitialVariants(): AdminElectronicsVariant[] {
  return [
    {
      clientId: crypto.randomUUID(),
      variant_name: "",
      attributes: {},
      sku: "",
      stock_quantity: 0,
      low_stock_threshold: 2,
      availability_status: "in_stock",
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

export default function ProductForm({
  categories,
  brands,
  collections,
  errorMessage,
}: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const allowServerSubmissionRef = useRef(false);

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
      setSelectedImages(images);
    },
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (allowServerSubmissionRef.current) {
      allowServerSubmissionRef.current = false;
      return;
    }

    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter =
      nativeEvent.submitter instanceof HTMLButtonElement
        ? nativeEvent.submitter
        : null;

    const submissionIntent =
      submitter?.value === "publish" ? "publish" : "draft";

    setSubmissionError("");
    setUploadPercentage(0);
    setUploadFileName("");
    setIsSubmitting(true);

    try {
      const uploadedImages = await uploadImagesBeforeProductSubmission(form, {
        images: selectedImages,
        onProgress(progress) {
          setUploadPercentage(progress.percentage);
          setUploadFileName(progress.currentFileName);
        },
      });

      setDirectUploadedImagesJson(JSON.stringify(uploadedImages));

      const directUploadInput = form.elements.namedItem(
        "direct_uploaded_images",
      );

      if (directUploadInput instanceof HTMLInputElement) {
        directUploadInput.value = JSON.stringify(uploadedImages);
      }

      let intentInput = form.querySelector<HTMLInputElement>(
        'input[data-direct-upload-intent="true"]',
      );

      if (!intentInput) {
        intentInput = document.createElement("input");
        intentInput.type = "hidden";
        intentInput.name = "intent";
        intentInput.dataset.directUploadIntent = "true";
        form.appendChild(intentInput);
      }

      intentInput.value = submissionIntent;

      allowServerSubmissionRef.current = true;
      form.requestSubmit();
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "The product could not be submitted.",
      );

      setIsSubmitting(false);
      setUploadPercentage(0);
      setUploadFileName("");
    }
  }

  return (
    <form ref={formRef} action={createProduct} onSubmit={handleSubmit}>
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
            variant_name: variant.variant_name,
            attributes: variant.attributes,
            sku: variant.sku,
            stock_quantity: variant.stock_quantity,
            low_stock_threshold: variant.low_stock_threshold,
            availability_status: variant.availability_status,
          })),
        )}
        readOnly
      />

      {(errorMessage || submissionError) && (
        <div className="mb-7 flex items-start gap-4 border border-red-400/30 bg-red-400/[0.07] p-5">
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

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-7">
          <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
            <SectionHeader
              number="01"
              title="Product information"
              description="Enter the product name, description, category and collection."
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
                  placeholder="Milano Linen Dress"
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
                  placeholder="Describe the fabric, design, fit, styling and care details."
                  className="mt-3 w-full resize-y border border-white/10 bg-black/30 px-4 py-4 leading-7 text-white outline-none transition placeholder:text-white/20 focus:border-white/55"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
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
                    defaultValue=""
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
                    defaultValue=""
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
                    defaultValue=""
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
              title="Product photographs"
              description="Upload photographs, select the main image and control their order."
            />

            <div className="p-6">
              <ImageUploader
                disabled={isSubmitting}
                onImagesChange={handleImagesChange}
              />
            </div>
          </section>

          <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
            <SectionHeader
              number="03"
              title="Product pricing"
              description="Set the normal selling price and an optional discounted price."
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
                    placeholder="0.00"
                    className="w-full bg-transparent px-4 py-4 text-white outline-none placeholder:text-white/20"
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
              number="04"
              title="Product configurations"
              description="Create every sellable version of this product and define its technical specifications, SKU, stock and availability."
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
              number="05"
              title="Store placement"
              description="Choose optional promotional labels for this product."
            />

            <div className="grid gap-4 p-6 md:grid-cols-3">
              <label className="group cursor-pointer">
                <input
                  type="checkbox"
                  name="is_featured"
                  className="peer sr-only"
                />

                <div className="min-h-[145px] border border-white/10 bg-black/20 p-5 transition peer-checked:border-violet-400/50 peer-checked:bg-violet-400/[0.08]">
                  <Star className="h-5 w-5 text-violet-300" />

                  <p className="mt-6 font-semibold">Featured</p>

                  <p className="mt-2 text-xs leading-5 text-white/35">
                    Highlight in featured product sections.
                  </p>
                </div>
              </label>

              <label className="group cursor-pointer">
                <input
                  type="checkbox"
                  name="is_trending"
                  className="peer sr-only"
                />

                <div className="min-h-[145px] border border-white/10 bg-black/20 p-5 transition peer-checked:border-amber-400/50 peer-checked:bg-amber-400/[0.08]">
                  <TrendingUp className="h-5 w-5 text-amber-300" />

                  <p className="mt-6 font-semibold">Trending</p>

                  <p className="mt-2 text-xs leading-5 text-white/35">
                    Display in trending product selections.
                  </p>
                </div>
              </label>

              <label className="group cursor-pointer">
                <input
                  type="checkbox"
                  name="is_new_arrival"
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

            <h2 className="mt-2 text-2xl font-semibold">Save product</h2>

            <div className="mt-6 space-y-3">
              <div className="border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/30">
                  Product
                </p>

                <p className="mt-2 truncate font-semibold">
                  {productName || "Untitled product"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    Configurations
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {variants.length}
                  </p>
                </div>

                <div className="border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    Available
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {availableConfigurations}
                  </p>
                </div>

                <div className="border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
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
              <div className="mt-6 border border-sky-400/25 bg-sky-400/[0.06] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                      Uploading photographs
                    </p>

                    <p className="mt-2 truncate text-xs text-white/45">
                      {uploadFileName || "Preparing product submission"}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-sky-200">
                    {uploadPercentage}%
                  </p>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden bg-white/10">
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
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-between border border-white/15 bg-white/[0.025] px-5 py-4 text-xs font-semibold uppercase tracking-[0.17em] text-white transition hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
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
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-between border border-emerald-300 bg-emerald-300 px-5 py-4 text-xs font-semibold uppercase tracking-[0.17em] text-black transition hover:bg-transparent hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
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
