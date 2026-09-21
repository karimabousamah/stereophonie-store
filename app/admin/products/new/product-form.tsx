"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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

import ProductSaveBar from "@/components/admin/products/v2/product-save-bar";
import {
  ProductCard,
  ProductSidebarCard,
  ProductWorkspace,
} from "@/components/admin/products/v2/product-workspace";
import { smoothScrollProductResultToTop } from "@/components/admin/product-save-result-scroll";

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
      barcode: "",
      regular_price: "",
      sale_price: "",
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
  const directUploadedImagesInputRef = useRef<HTMLInputElement>(null);

  /*
   * Preserve exactly which publishing action the administrator
   * selected while images are prepared before the final
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

  const [submissionPhase, setSubmissionPhase] = useState<
    "idle" | "preparing" | "uploading" | "saving" | "stopping"
  >("idle");

  const [activeSubmissionIntent, setActiveSubmissionIntent] = useState<
    "draft" | "publish"
  >("draft");

  /*
   * Cancellation is cooperative until the final Server Action handoff.
   *
   * Once requestSubmit() hands the form to Next.js / the server,
   * cancellation is intentionally disabled because hiding the UI would
   * not reliably cancel a database write already in progress.
   */
  const cancelSubmissionRef = useRef(false);

  const [variants, setVariants] = useState<AdminElectronicsVariant[]>(
    createInitialVariants,
  );

  const [placementSelection, setPlacementSelection] = useState({
    featured: false,
    trending: false,
    newArrival: false,
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

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

  /*
   * Store-placement badges are irrelevant when the complete
   * product is unavailable.
   *
   * This mirrors the aggregate availability calculation used by
   * the server:
   *
   * - any in-stock / low-stock configuration -> available
   * - every configuration coming soon -> coming soon
   * - otherwise -> out of stock
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
            existing.configurationIds.length ===
              incoming.configurationIds.length &&
            existing.configurationIds.every(
              (configurationId, configurationIndex) =>
                configurationId ===
                incoming.configurationIds[configurationIndex],
            )
          );
        });

        return unchanged ? current : images;
      });
    },
    [],
  );

  async function waitForProcessingPaint(delay = 0) {
    /*
     * React state updates are asynchronous. Waiting for two animation
     * frames guarantees that the processing overlay has an opportunity
     * to reach the browser before expensive work or navigation begins.
     */
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (delay > 0) {
            window.setTimeout(resolve, delay);
          } else {
            resolve();
          }
        });
      });
    });
  }

  function resetSubmissionExperience() {
    setIsSubmitting(false);
    setSubmissionPhase("idle");
    setUploadPercentage(0);
    setUploadFileName("");
    cancelSubmissionRef.current = false;
  }

  function stopSubmission() {
    if (!isSubmitting || submissionPhase === "saving") {
      return;
    }

    cancelSubmissionRef.current = true;
    setSubmissionPhase("stopping");
  }


  function clearProductValidation() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    form
      .querySelectorAll<HTMLElement>(
        "[data-admin-validation-error]",
      )
      .forEach((element) => {
        element.removeAttribute(
          "data-admin-validation-error",
        );

        element.classList.remove(
          "st-admin-validation-invalid-v2",
        );
      });
  }

  function markProductValidation(
    selector: string,
    message: string,
  ) {
    const form = formRef.current;

    if (!form) {
      return null;
    }

    const target =
      form.querySelector<HTMLElement>(
        selector,
      );

    if (!target) {
      return null;
    }

    target.setAttribute(
      "data-admin-validation-error",
      message,
    );

    target.classList.add(
      "st-admin-validation-invalid-v2",
    );

    return target;
  }

  function focusValidationTarget(
    target: HTMLElement | null,
  ) {
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const focusable =
        target.matches(
          "input, textarea, select, button",
        )
          ? target
          : target.querySelector<HTMLElement>(
              "input, textarea, select, button",
            );

      focusable?.focus({
        preventScroll: true,
      });
    });
  }

  function validateProductBeforeSubmission(
    intent: "draft" | "publish",
  ) {
    clearProductValidation();

    let firstInvalid: HTMLElement | null =
      null;

    const register = (
      selector: string,
      message: string,
    ) => {
      const target =
        markProductValidation(
          selector,
          message,
        );

      if (!firstInvalid && target) {
        firstInvalid = target;
      }
    };

    if (!productName.trim()) {
      register(
        "#name",
        intent === "publish"
          ? "Enter a product title before publishing."
          : "Enter a product title before saving this draft.",
      );
    }

    if (!selectedCategoryId) {
      register(
        ".st-admin-category-picker",
        intent === "publish"
          ? "Select a category before publishing."
          : "Select a category before saving this draft.",
      );
    }

    if (variants.length === 0) {
      register(
        ".st-admin-config-table-section-v2",
        "Create at least one product configuration.",
      );
    }

    if (
      intent === "publish" &&
      variants.length > 0
    ) {
      const validAvailability = new Set([
        "in_stock",
        "low_stock",
        "out_of_stock",
        "coming_soon",
      ]);

      for (
        let index = 0;
        index < variants.length;
        index += 1
      ) {
        const variant = variants[index];

        const label =
          variant.variant_name.trim() ||
          `Configuration ${index + 1}`;

        if (
          !validAvailability.has(
            String(
              variant.availability_status,
            ),
          )
        ) {
          register(
            ".st-admin-config-table-section-v2",
            `Choose customer availability for ${label}.`,
          );
          break;
        }

        const regularPrice =
          Number(variant.regular_price);

        if (
          variant.availability_status !==
            "coming_soon" &&
          (!Number.isFinite(regularPrice) ||
            regularPrice <= 0)
        ) {
          register(
            ".st-admin-config-table-section-v2",
            `Enter a valid regular price for ${label}.`,
          );
          break;
        }

        const saleText =
          variant.sale_price === "" ||
          variant.sale_price === null ||
          variant.sale_price === undefined
            ? ""
            : String(
                variant.sale_price,
              ).trim();

        if (saleText) {
          const salePrice =
            Number(saleText);

          if (
            !Number.isFinite(salePrice) ||
            salePrice < 0
          ) {
            register(
              ".st-admin-config-table-section-v2",
              `Enter a valid sale price for ${label}.`,
            );
            break;
          }

          if (
            Number.isFinite(
              regularPrice,
            ) &&
            regularPrice > 0 &&
            salePrice >= regularPrice
          ) {
            register(
              ".st-admin-config-table-section-v2",
              `The sale price for ${label} must be lower than its regular price.`,
            );
            break;
          }
        }

        const stock =
          Number(
            variant.stock_quantity,
          );

        const lowStock =
          Number(
            variant.low_stock_threshold,
          );

        if (
          !Number.isFinite(stock) ||
          stock < 0
        ) {
          register(
            ".st-admin-config-table-section-v2",
            `Enter a valid stock quantity for ${label}.`,
          );
          break;
        }

        if (
          !Number.isFinite(lowStock) ||
          lowStock < 0
        ) {
          register(
            ".st-admin-config-table-section-v2",
            `Enter a valid low-stock threshold for ${label}.`,
          );
          break;
        }
      }

      if (
        !placementSelection.featured &&
        !placementSelection.trending &&
        !placementSelection.newArrival
      ) {
        register(
          ".st-admin-product-placement-v2",
          "Select at least one store placement before publishing.",
        );
      }
    }

    if (firstInvalid) {
      focusValidationTarget(
        firstInvalid,
      );

      return false;
    }

    return true;
  }

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

    if (
      !validateProductBeforeSubmission(
        submissionIntent,
      )
    ) {
      setSubmissionError("");
      return;
    }

    /*
     * Commit the processing interface synchronously before beginning any
     * asynchronous upload work or handing the form to the Server Action.
     *
     * This is intentionally owned by onSubmit rather than the button click,
     * so visual state and duplicate-submission protection cannot race each
     * other.
     */
    flushSync(() => {
      setSubmissionError("");
      setUploadPercentage(0);
      setUploadFileName("");
      setActiveSubmissionIntent(submissionIntent);
      setSubmissionPhase("preparing");
      setIsSubmitting(true);
    });

    cancelSubmissionRef.current = false;

    try {
      /*
       * Give React a moment to paint the processing state before any
       * heavy image work or navigation begins.
       *
       * This also gives the administrator a genuine opportunity to stop
       * an accidental submission before uploads/server persistence begin.
       */
      /*
       * Make the processing experience visibly render before continuing.
       * The short minimum display time also prevents a photo-less draft
       * from flashing too quickly to be perceived.
       */
      await waitForProcessingPaint();

      if (cancelSubmissionRef.current) {
        resetSubmissionExperience();
        return;
      }

      let uploadedImages: Awaited<
        ReturnType<typeof uploadImagesBeforeProductSubmission>
      > = [];

      /*
       * Only enter the upload pipeline when the administrator
       * has actually selected images.
       *
       * A photo-less draft therefore saves immediately instead
       * of sitting forever on "{pendingIntentRef.current === "draft"
                        ? "Saving safely to Draft products"
                        : "Preparing product submission"} 0%".
       */
      if (selectedImages.length > 0) {
        setSubmissionPhase("uploading");

        uploadedImages = await uploadImagesBeforeProductSubmission(form, {
          images: selectedImages,
          validateForm: submissionIntent === "publish",

          onProgress(progress) {
            setUploadPercentage(progress.percentage);
            setUploadFileName(progress.currentFileName);
          },
        });
      }

      /*
       * A Stop request made while image preparation was active prevents
       * the product from ever being handed to the Server Action.
       */
      if (cancelSubmissionRef.current) {
        resetSubmissionExperience();
        return;
      }

      const uploadedImagesJson = JSON.stringify(uploadedImages);

      setDirectUploadedImagesJson(uploadedImagesJson);

      if (directUploadedImagesInputRef.current) {
        directUploadedImagesInputRef.current.value = uploadedImagesJson;
      }

      if (resolvedIntentInputRef.current) {
        resolvedIntentInputRef.current.value = submissionIntent;
      }

      /*
       * The preparation phase is complete.
       *
       * Allow exactly one real browser/Next.js Server Action submission.
       * Reusing the original submitter preserves Draft's formNoValidate
       * behavior and Publish's normal browser validation.
       */
      setSubmissionPhase("saving");

      /*
       * Force the finalizing state to visibly reach the browser before
       * Next.js receives the Server Action submission. Without this paint
       * boundary, a fast submission can navigate before the administrator
       * ever sees the processing experience.
       */
      await waitForProcessingPaint();

      /*
       * After this point the browser is handing the completed form to the
       * existing Next.js Server Action. The Stop control is therefore
       * disabled rather than pretending a database request can be undone.
       */
      const serverFormData =
        new FormData(form);

      /*
       * FINAL AUTHORITATIVE PUBLICATION INTENT
       *
       * Do not rely on button serialization, portal behavior,
       * hidden-input timing or a previous React render.
       *
       * The exact intent chosen by the administrator is stamped
       * directly onto the exact FormData object handed to the
       * Server Action.
       *
       * Save draft  -> draft
       * Publish live -> publish
       */
      serverFormData.set(
        "intent",
        submissionIntent,
      );

      serverFormData.set(
        "resolved_intent",
        submissionIntent,
      );

      const result =
        await createProduct(
          serverFormData,
        );

      if (!result.ok) {
        setSubmissionError(
          result.error,
        );

        resetSubmissionExperience();

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            smoothScrollProductResultToTop();
          });
        });

        return;
      }

      resetSubmissionExperience();
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

      resetSubmissionExperience();

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          smoothScrollProductResultToTop();
        });
      });
    }
  }

  const processingPercentage = (() => {
    if (!isSubmitting) {
      return 0;
    }

    if (submissionPhase === "preparing") {
      return 8;
    }

    if (submissionPhase === "uploading") {
      /*
       * Keep the final portion of the progress track available for the
       * database save/publication phase.
       */
      return Math.min(84, Math.max(12, 12 + uploadPercentage * 0.72));
    }

    if (submissionPhase === "saving") {
      return 94;
    }

    if (submissionPhase === "stopping") {
      return Math.min(88, Math.max(8, 12 + uploadPercentage * 0.72));
    }

    return 0;
  })();

  const processingTitle =
    activeSubmissionIntent === "publish"
      ? "Publishing product"
      : "Saving product draft";

  const processingDescription = (() => {
    if (submissionPhase === "preparing") {
      return activeSubmissionIntent === "publish"
        ? "Preparing product information for publication."
        : "Preparing your product draft safely.";
    }

    if (submissionPhase === "uploading") {
      return uploadFileName
        ? `Processing ${uploadFileName}`
        : "Processing product images.";
    }

    if (submissionPhase === "saving") {
      return activeSubmissionIntent === "publish"
        ? "Finalizing product data and pushing it live."
        : "Finalizing product data and saving your draft.";
    }

    if (submissionPhase === "stopping") {
      return "Stopping before the product is submitted.";
    }

    return "";
  })();

  return (
    <form
      id="st-admin-new-product-form"
          className="st-admin-product-editor-form"
      ref={formRef}
      onSubmit={handleSubmit}
    >
      {false && (
        <div
          className="st-admin-product-submission-overlay fixed inset-0 z-[100] flex items-center justify-center bg-white/70 px-5 backdrop-blur-md"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-black/[0.08] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
            <div className="border-b border-black/[0.07] px-6 py-6 sm:px-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#fdb73e]">
                    Stereophonie Product Manager
                  </p>

                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    {processingTitle}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                    {processingDescription}
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-black/[0.08] bg-[#f7f7f8] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                  {submissionPhase === "saving"
                    ? "Finalizing"
                    : submissionPhase === "stopping"
                      ? "Stopping"
                      : "Processing"}
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">
                    Progress
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#515154]">
                    {submissionPhase === "preparing" && "Preparing submission"}

                    {submissionPhase === "uploading" &&
                      `${Math.round(uploadPercentage)}% of media processed`}

                    {submissionPhase === "saving" &&
                      (activeSubmissionIntent === "publish"
                        ? "Publishing to storefront"
                        : "Saving to Draft products")}

                    {submissionPhase === "stopping" && "Stopping process"}
                  </p>
                </div>

                <span className="font-mono text-sm tabular-nums text-[#86868b]">
                  {Math.round(processingPercentage)}%
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/[0.08]">
                <div
                  className="h-full rounded-full bg-[#fdb73e] transition-[width] duration-500 ease-out"
                  style={{
                    width: `${processingPercentage}%`,
                  }}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-black/[0.07] bg-[#f7f7f8] px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    {submissionPhase !== "stopping" && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#fdb73e] opacity-40" />
                    )}

                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#fdb73e]" />
                  </span>

                  <p className="text-xs leading-5 text-[#6e6e73]">
                    {submissionPhase === "saving"
                      ? "The final save is now being processed securely. Please keep this page open."
                      : submissionPhase === "stopping"
                        ? "Your product will not be submitted to the server."
                        : "You can stop the process before the final save begins."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="max-w-xs text-[10px] leading-5 text-[#86868b]">
                  Do not close or refresh this page while product information is
                  being processed.
                </p>

                {submissionPhase !== "saving" && (
                  <button
                    type="button"
                    onClick={stopSubmission}
                    disabled={submissionPhase === "stopping"}
                    className="shrink-0 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submissionPhase === "stopping"
                      ? "Stopping..."
                      : "Stop process"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={resolvedIntentInputRef}
        type="hidden"
        name="intent"
        defaultValue="draft"
      />

      <input
        ref={directUploadedImagesInputRef}
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
            barcode: variant.barcode ?? "",
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
        <div
          className="st-admin-product-error-v2"
          role="alert"
        >
          <AlertCircle
            aria-hidden="true"
          />

          <div>
            <strong>
              Product not saved
            </strong>

            <p>
              {submissionError ||
                errorMessage}
            </p>
          </div>
        </div>
      )}

      <ProductWorkspace
        actionBar={
          <ProductSaveBar
            productName={productName}
            isSubmitting={isSubmitting}
            progress={processingPercentage}
            statusText={
              submissionPhase === "uploading"
                ? uploadFileName
                  ? `Preparing ${uploadFileName}`
                  : "Preparing product media"
                : pendingIntentRef.current === "publish"
                  ? "Publishing product"
                  : "Saving draft"
            }
            onDraft={() => {
              pendingIntentRef.current = "draft";

              if (resolvedIntentInputRef.current) {
                resolvedIntentInputRef.current.value = "draft";
              }
            }}
            onPublish={() => {
              pendingIntentRef.current = "publish";

              if (resolvedIntentInputRef.current) {
                resolvedIntentInputRef.current.value = "publish";
              }
            }}
          />
        }
        sidebar={
          <>
            <ProductSidebarCard title="Status">
              <div
                className="st-admin-product-status-summary-v2 is-draft"
                data-admin-product-effective-status="draft"
              >
                <div>
                  <strong>Draft</strong>
                  <small>
                    Hidden from customers until this product is published
                    successfully.
                  </small>
                </div>
              </div>
            </ProductSidebarCard>

            <ProductSidebarCard title="Product organization">
              <div className="st-admin-product-organization-v2">
                <div>
                  <label>Brand</label>

                  <ProductBrandPicker
                    brands={brands}
                    onBrandChange={(brand) =>
                      setSelectedBrandName(brand?.name ?? "")
                    }
                  />
                </div>

                <div>
                  <label>Category</label>

                  <ProductCategoryPicker
                    categories={categories}
                    onCategoryChange={(category) => {
                      setSelectedCategoryId(category?.id ?? "");
                      setSelectedCategoryName(category?.name ?? "");
                      setSelectedSubcategoryId("");
                    }}
                  />
                </div>
              </div>
            </ProductSidebarCard>

            <ProductSidebarCard title="Store placement">
              <div className="st-admin-product-placement-v2">
                <label>
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

                  <span>
                    <strong>Featured</strong>
                    <small>
                      Priority placement in featured areas.
                    </small>
                  </span>
                </label>

                <label>
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

                  <span>
                    <strong>Trending</strong>
                    <small>
                      Include in highlighted selections.
                    </small>
                  </span>
                </label>

                <label>
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

                  <span>
                    <strong>New arrival</strong>
                    <small>
                      Mark the product as recently added.
                    </small>
                  </span>
                </label>
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
          description="Add the core information customers need to understand this product."
        >
          <div className="st-admin-product-information-v2">
            <div>
              <label htmlFor="name">Title</label>

              <input
                id="name"
                name="name"
                type="text"
                required
                value={productName}
                onChange={(event) =>
                  setProductName(event.target.value)
                }
                placeholder="Galaxy S26 Ultra"
              />
            </div>

            <div>
              <label htmlFor="description">Description</label>

              <textarea
                id="description"
                name="description"
                rows={5}
                placeholder="Describe the product, important specifications, compatibility, warranty and what is included."
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
            </div>

            <div
              id="st-product-information-specifications"
              data-admin-product-specifications-target="true"
            />
          </div>
        </ProductCard>

        <ProductCard
          title="Media"
          description="Upload product images and connect them to the correct configurations."
        >
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
        </ProductCard>

        <ProductCard
          title="Configurations"
          description="Manage options, pricing, inventory, SKU, availability and technical specifications."
        >
          <ElectronicsVariantEditor
            variants={variants}
            onChange={setVariants}
            categoryName={selectedCategoryName}
            brandName={selectedBrandName}
          />
        </ProductCard>
      </ProductWorkspace>
    </form>
  );
}
