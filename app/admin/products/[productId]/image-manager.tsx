"use client";

import { useRef, useState, type FormEvent, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImageOff,
  ImagePlus,
  Save,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import {
  deleteProductImage,
  moveProductImage,
  setPrimaryProductImage,
  updateProductImageAltText,
  updateProductImageVariantName,
  finalizeDirectProductImageUploads,
} from "./image-actions";

import {
  createTemporaryProductImagePath,
  removeDirectlyUploadedImages,
  uploadProductImageDirectly,
  validateProductImageFiles,
} from "@/lib/uploads/product-image-upload";

import { processImageBeforeUpload } from "@/lib/stereophonie-v3/images/process-upload-client";

type ProductImage = {
  id: string;
  image_url: string | null;
  storage_path: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
  variant_name: string | null;
  variant_id: string | null;
  variant_position: number;
  is_variant_primary: boolean;
};

type LiveImageConfiguration = {
  id: string;
  variant_name: string;
  fallbackLabel: string;
  persisted: boolean;
};

type ImageManagerProps = {
  productId: string;
  productName: string;
  images: ProductImage[];

  configurations: {
    id: string;
    variant_name: string;
  }[];

  successMessage?: string;
};

const maximumImages = 10;
const maximumFileSize = 10 * 1024 * 1024;

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

export default function ImageManager({
  productId,
  productName,
  images,
  configurations,
  successMessage,
}: ImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const directUploadedImagesInputRef = useRef<HTMLInputElement>(null);
  const allowServerSubmissionRef = useRef(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  /*
   * Initial values are the configurations already stored in the
   * database. The configuration editor can then update this list
   * live through the custom event below.
   */
  const [liveConfigurations, setLiveConfigurations] = useState<
    LiveImageConfiguration[]
  >(() =>
    configurations.map((configuration) => ({
      id: configuration.id,
      variant_name: String(configuration.variant_name ?? "").trim(),
      fallbackLabel:
        String(configuration.variant_name ?? "").trim() ||
        "Untitled configuration",
      persisted: true,
    })),
  );

  useEffect(() => {
    setLiveConfigurations(
      configurations.map((configuration) => ({
        id: configuration.id,
        variant_name: String(configuration.variant_name ?? "").trim(),
        fallbackLabel:
          String(configuration.variant_name ?? "").trim() ||
          "Untitled configuration",
        persisted: true,
      })),
    );
  }, [configurations]);

  useEffect(() => {
    function handleLiveConfigurations(event: Event) {
      const customEvent = event as CustomEvent<{
        configurations?: LiveImageConfiguration[];
      }>;

      const incoming = customEvent.detail?.configurations;

      if (!Array.isArray(incoming)) {
        return;
      }

      setLiveConfigurations(
        incoming.map((configuration, index) => ({
          id:
            String(configuration.id ?? "").trim() ||
            `configuration-${index + 1}`,
          variant_name: String(configuration.variant_name ?? "").trim(),
          fallbackLabel:
            String(configuration.fallbackLabel ?? "").trim() ||
            String(configuration.variant_name ?? "").trim() ||
            `Configuration ${index + 1}`,
          persisted: Boolean(configuration.persisted),
        })),
      );
    }

    window.addEventListener(
      "stereophonie:admin-product-configurations",
      handleLiveConfigurations,
    );

    return () => {
      window.removeEventListener(
        "stereophonie:admin-product-configurations",
        handleLiveConfigurations,
      );
    };
  }, []);

  /*
   * Empty string = photograph shared by every configuration.
   * Otherwise this contains the exact variant_name.
   */
  const [selectedVariantNames, setSelectedVariantNames] = useState<string[]>(
    [],
  );

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    currentFileName: string;
    percentage: number;
  } | null>(null);

  /*
   * Product media is grouped and ordered by configuration.
   *
   * `variant_position` is the real customer-facing photograph
   * order inside one configuration.
   *
   * The old global `position` remains only as a stable fallback.
   */
  function imageConfigurationKey(image: ProductImage) {
    if (image.variant_id) {
      return `id:${image.variant_id}`;
    }

    const legacyName = String(image.variant_name ?? "")
      .trim()
      .toLowerCase();

    return legacyName ? `name:${legacyName}` : "__shared__";
  }

  function sameImageConfiguration(first: ProductImage, second: ProductImage) {
    return imageConfigurationKey(first) === imageConfigurationKey(second);
  }

  const configurationPosition = new Map(
    configurations.map((configuration, index) => [configuration.id, index]),
  );

  const orderedImages = [...images].sort((first, second) => {
    const firstConfiguration = first.variant_id
      ? (configurationPosition.get(first.variant_id) ?? 9999)
      : -1;

    const secondConfiguration = second.variant_id
      ? (configurationPosition.get(second.variant_id) ?? 9999)
      : -1;

    if (firstConfiguration !== secondConfiguration) {
      return firstConfiguration - secondConfiguration;
    }

    const firstVariantPosition = Number(
      first.variant_position ?? first.position ?? 0,
    );

    const secondVariantPosition = Number(
      second.variant_position ?? second.position ?? 0,
    );

    if (firstVariantPosition !== secondVariantPosition) {
      return firstVariantPosition - secondVariantPosition;
    }

    return Number(first.position ?? 0) - Number(second.position ?? 0);
  });

  function clearSelectedFiles() {
    previewUrls.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });

    setSelectedFiles([]);
    setSelectedVariantNames([]);
    setPreviewUrls([]);
    setUploadError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDirectUploadSubmit(event: FormEvent<HTMLFormElement>) {
    if (allowServerSubmissionRef.current) {
      allowServerSubmissionRef.current = false;
      return;
    }

    event.preventDefault();
    setUploadError("");

    if (selectedFiles.length === 0) {
      setUploadError("Select at least one photograph.");
      return;
    }

    try {
      validateProductImageFiles(selectedFiles, orderedImages.length);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "The selected photographs could not be processed.",
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress({
      currentFileName: selectedFiles[0]?.name ?? "",
      percentage: 0,
    });

    const totalBytes = selectedFiles.reduce(
      (total, file) => total + file.size,
      0,
    );

    let completedBytes = 0;
    const uploadedPaths: string[] = [];
    const payload: {
      storage_path: string;
      original_name: string;
      content_type: string;
      size: number;
      position: number;
      alt_text: string;
      variant_name: string;
    }[] = [];

    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        const storagePath = createTemporaryProductImagePath(file);

        await uploadProductImageDirectly({
          file,
          storagePath,
          onProgress(progress) {
            const uploadedBytes = completedBytes + progress.bytesUploaded;

            const percentage =
              totalBytes > 0
                ? Math.round((uploadedBytes / totalBytes) * 100)
                : 0;

            setUploadProgress({
              currentFileName: file.name,
              percentage: Math.min(percentage, 100),
            });
          },
        });

        uploadedPaths.push(storagePath);
        completedBytes += file.size;

        payload.push({
          storage_path: storagePath,
          original_name: file.name,
          content_type: file.type,
          size: file.size,
          position: index,
          alt_text: "",
          variant_name: String(selectedVariantNames[index] ?? "").trim(),
        });
      }

      setUploadProgress({
        currentFileName: "",
        percentage: 100,
      });

      if (!directUploadedImagesInputRef.current) {
        throw new Error("The photograph upload form could not be prepared.");
      }

      directUploadedImagesInputRef.current.value = JSON.stringify(payload);

      const form = uploadFormRef.current;

      if (!form) {
        throw new Error("The photograph upload form could not be submitted.");
      }

      allowServerSubmissionRef.current = true;
      form.requestSubmit();
    } catch (error) {
      allowServerSubmissionRef.current = false;

      await removeDirectlyUploadedImages(uploadedPaths);

      if (directUploadedImagesInputRef.current) {
        directUploadedImagesInputRef.current.value = "[]";
      }

      setUploadError(
        error instanceof Error
          ? error.message
          : "The photographs could not be uploaded.",
      );

      setUploadProgress(null);
      setIsUploading(false);
    }
  }

  async function selectFiles(files: FileList | null) {
    setUploadError("");

    if (!files?.length) {
      return;
    }

    const selected = Array.from(files);

    if (orderedImages.length + selected.length > maximumImages) {
      setUploadError(
        `This product can have a maximum of ${maximumImages} photographs.`,
      );

      return;
    }

    const invalidType = selected.find(
      (file) => !acceptedTypes.includes(file.type),
    );

    if (invalidType) {
      setUploadError(
        `${invalidType.name} is not supported. Use JPEG, PNG or WebP.`,
      );

      return;
    }

    const oversizedFile = selected.find((file) => file.size > maximumFileSize);

    if (oversizedFile) {
      setUploadError(`${oversizedFile.name} is larger than 10 MB.`);

      return;
    }

    let processedFiles: File[];

    try {
      setUploadError(
        "Preparing photographs… removing background and standardizing layout.",
      );

      processedFiles = await Promise.all(
        selected.map((file) => processImageBeforeUpload(file, "product")),
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "The photographs could not be prepared.",
      );

      return;
    }

    previewUrls.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });

    setUploadError("");

    setSelectedFiles(processedFiles);

    /*
     * New photographs default to Shared with all configurations.
     * The admin can change each photograph independently before upload.
     */
    setSelectedVariantNames(processedFiles.map(() => ""));

    setPreviewUrls(processedFiles.map((file) => URL.createObjectURL(file)));
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div role="status" className="st-admin-notice st-admin-notice--success">
          <CheckCircle2 className="st-admin-notice__icon" aria-hidden="true" />

          <div>
            <strong>Photographs updated</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
        <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Product media
            </p>

            <h2 className="mt-2 text-xl font-semibold">Manage photographs</h2>

            <p className="mt-2 text-sm leading-6 text-white/35">
              Add, remove, reorder and connect photographs to the correct
              product configuration.
            </p>
          </div>

          <div className="border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
              Image usage
            </p>

            <p className="mt-1 text-sm font-semibold">
              {orderedImages.length} / {maximumImages}
            </p>
          </div>
        </div>

        <div className="p-5">
          <form
            ref={uploadFormRef}
            action={finalizeDirectProductImageUploads}
            onSubmit={handleDirectUploadSubmit}
            className="border border-white/10 bg-black/20 p-5"
          >
            <input type="hidden" name="product_id" value={productId} />

            <input
              ref={directUploadedImagesInputRef}
              type="hidden"
              name="direct_uploaded_images"
              defaultValue="[]"
            />

            <input
              ref={fileInputRef}
              id="new-product-images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                void selectFiles(event.target.files);

                event.currentTarget.value = "";
              }}
            />

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <ImagePlus className="h-5 w-5 text-white/55" />

                  <p className="font-semibold">Add new photographs</p>
                </div>

                <p className="mt-2 text-sm leading-6 text-white/35">
                  Upload JPEG, PNG, or WebP files. Each file can be up to 10 MB.
                </p>
              </div>

              <label
                htmlFor="new-product-images"
                aria-disabled={isUploading}
                className={`inline-flex items-center justify-center gap-3 border border-white/15 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  isUploading
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer text-white/65 hover:border-white hover:bg-white hover:text-black"
                }`}
              >
                <ImagePlus className="h-4 w-4" />
                Select photographs
              </label>
            </div>

            {uploadError && (
              <div className="mt-5 border border-red-400/25 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">
                {uploadError}
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="mt-6">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {selectedFiles.length}{" "}
                      {selectedFiles.length === 1
                        ? "photograph selected"
                        : "photographs selected"}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      These files have not been uploaded yet.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedFiles}
                    disabled={isUploading}
                    className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {selectedFiles.map((file, index) => (
                    <article
                      key={`${file.name}-${file.size}-${index}`}
                      className="overflow-hidden border border-white/10 bg-[#101010]"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
                        <img
                          src={previewUrls[index]}
                          alt={`New product photograph ${index + 1}`}
                          className="h-full w-full object-contain p-3"
                        />
                      </div>

                      <div className="p-3">
                        <p className="truncate text-sm font-semibold">
                          {file.name}
                        </p>

                        <p className="mt-1 text-xs text-white/35">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        <div className="mt-4">
                          <label
                            htmlFor={`new-image-configuration-${index}`}
                            className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35"
                          >
                            Photograph usage
                          </label>

                          <select
                            id={`new-image-configuration-${index}`}
                            value={selectedVariantNames[index] ?? ""}
                            onChange={(event) => {
                              const value = event.target.value;

                              setSelectedVariantNames((current) => {
                                const next = [...current];
                                next[index] = value;
                                return next;
                              });
                            }}
                            className="mt-2 min-h-11 w-full border border-white/10 bg-black/40 px-3 text-xs text-white outline-none transition focus:border-white/40"
                          >
                            <option value="">
                              Shared with all configurations
                            </option>

                            {liveConfigurations.map((configuration) => {
                              const selectable =
                                configuration.persisted &&
                                Boolean(configuration.variant_name);

                              return (
                                <option
                                  key={configuration.id}
                                  value={
                                    selectable ? configuration.variant_name : ""
                                  }
                                  disabled={!selectable}
                                >
                                  {selectable
                                    ? configuration.variant_name
                                    : `${configuration.fallbackLabel} — save changes first`}
                                </option>
                              );
                            })}
                          </select>

                          <p className="mt-2 text-[10px] leading-4 text-white/25">
                            Choose a saved configuration when this photograph
                            belongs specifically to that version. New
                            configurations appear immediately and become
                            selectable after Save changes.
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {uploadProgress && (
                  <div className="mt-5 border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <p className="min-w-0 truncate text-white/55">
                        {uploadProgress.currentFileName ||
                          "Finalizing photographs"}
                      </p>

                      <p className="shrink-0 font-semibold text-white">
                        {uploadProgress.percentage}%
                      </p>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden bg-white/10">
                      <div
                        className="h-full bg-white transition-[width] duration-200"
                        style={{
                          width: `${uploadProgress.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading}
                  className="mt-5 inline-flex items-center justify-center gap-3 border border-white bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.17em] text-black transition hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/10 disabled:text-white/30"
                >
                  <Upload className="h-4 w-4" />

                  {isUploading
                    ? `Uploading ${uploadProgress?.percentage ?? 0}%`
                    : "Upload selected photographs"}
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Existing media
          </p>

          <h2 className="mt-2 text-xl font-semibold">Current photographs</h2>

          <p className="mt-2 text-sm leading-6 text-white/35">
            The photograph marked Main appears first on product cards and
            product pages.
          </p>
        </div>

        <div className="p-5">
          {orderedImages.length === 0 ? (
            <div className="flex min-h-[190px] flex-col items-center justify-center border border-dashed border-white/15 bg-black/20 px-6 text-center">
              <ImageOff className="h-8 w-8 text-white/25" />

              <h3 className="mt-5 text-lg font-semibold">No photographs</h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/35">
                Upload at least one photograph so the product can be displayed
                correctly on the storefront.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {orderedImages.map((image, index) => {
                const configurationImages = orderedImages.filter((candidate) =>
                  sameImageConfiguration(candidate, image),
                );

                const configurationIndex = configurationImages.findIndex(
                  (candidate) => candidate.id === image.id,
                );

                const configurationCount = configurationImages.length;

                return (
                  <article
                    key={image.id}
                    className={`overflow-hidden border bg-[#101010] ${
                      image.is_primary
                        ? "border-emerald-400/45"
                        : "border-white/10"
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
                      {image.image_url ? (
                        <img
                          src={image.image_url}
                          alt={
                            image.alt_text ||
                            `${productName} photograph ${index + 1}`
                          }
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageOff className="h-8 w-8 text-white/25" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-3">
                        <span className="border border-white/15 bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                          Position {configurationIndex + 1}
                        </span>

                        {image.is_primary && (
                          <span className="inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
                            <Star className="h-3 w-3 fill-current" />
                            Main
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      <form
                        action={updateProductImageVariantName}
                        className="border border-white/10 bg-black/20 p-3"
                      >
                        <input
                          type="hidden"
                          name="product_id"
                          value={productId}
                        />

                        <input type="hidden" name="image_id" value={image.id} />

                        <label
                          htmlFor={`image-configuration-${image.id}`}
                          className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35"
                        >
                          Photograph usage
                        </label>

                        <select
                          id={`image-configuration-${image.id}`}
                          name="variant_name"
                          defaultValue={image.variant_name ?? ""}
                          className="mt-2 min-h-11 w-full border border-white/10 bg-black/40 px-3 text-xs text-white outline-none transition focus:border-white/40"
                        >
                          <option value="">
                            Shared with all configurations
                          </option>

                          {configurations.map((configuration) => (
                            <option
                              key={configuration.id}
                              value={configuration.variant_name}
                            >
                              {configuration.variant_name}
                            </option>
                          ))}
                        </select>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-[10px] text-white/30">
                            {image.variant_name
                              ? `Only ${image.variant_name}`
                              : "Used by every configuration"}
                          </span>

                          <button
                            type="submit"
                            className="shrink-0 border border-white/10 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/50 transition hover:border-white hover:bg-white hover:text-black"
                          >
                            Save usage
                          </button>
                        </div>
                      </form>

                      <form action={updateProductImageAltText}>
                        <input
                          type="hidden"
                          name="product_id"
                          value={productId}
                        />

                        <input type="hidden" name="image_id" value={image.id} />

                        <label
                          htmlFor={`alt-text-${image.id}`}
                          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                        >
                          Image description
                        </label>

                        <textarea
                          id={`alt-text-${image.id}`}
                          name="alt_text"
                          rows={2}
                          defaultValue={image.alt_text ?? ""}
                          placeholder="Example: Front view of the dress"
                          className="mt-2 w-full resize-none border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                        />

                        <button
                          type="submit"
                          className="mt-3 inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 transition hover:border-white hover:bg-white hover:text-black"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save description
                        </button>
                      </form>

                      <div className="grid grid-cols-4 gap-2">
                        <form action={moveProductImage}>
                          <input
                            type="hidden"
                            name="product_id"
                            value={productId}
                          />

                          <input
                            type="hidden"
                            name="image_id"
                            value={image.id}
                          />

                          <input type="hidden" name="direction" value="left" />

                          <button
                            type="submit"
                            disabled={configurationIndex <= 0}
                            aria-label="Move photograph left"
                            className="flex h-11 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                        </form>

                        <form action={moveProductImage}>
                          <input
                            type="hidden"
                            name="product_id"
                            value={productId}
                          />

                          <input
                            type="hidden"
                            name="image_id"
                            value={image.id}
                          />

                          <input type="hidden" name="direction" value="right" />

                          <button
                            type="submit"
                            disabled={
                              configurationIndex >= configurationCount - 1
                            }
                            aria-label="Move photograph right"
                            className="flex h-11 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </form>

                        <form action={setPrimaryProductImage}>
                          <input
                            type="hidden"
                            name="product_id"
                            value={productId}
                          />

                          <input
                            type="hidden"
                            name="image_id"
                            value={image.id}
                          />

                          <button
                            type="submit"
                            disabled={image.is_primary}
                            aria-label="Set as main photograph"
                            className="flex h-11 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-emerald-400/35 hover:text-emerald-300 disabled:cursor-default disabled:border-emerald-400/30 disabled:text-emerald-300"
                          >
                            <Star
                              className={`h-4 w-4 ${
                                image.is_primary ? "fill-current" : ""
                              }`}
                            />
                          </button>
                        </form>

                        <form
                          action={deleteProductImage}
                          onSubmit={(event) => {
                            const confirmed = window.confirm(
                              "Delete this photograph permanently?",
                            );

                            if (!confirmed) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input
                            type="hidden"
                            name="product_id"
                            value={productId}
                          />

                          <input
                            type="hidden"
                            name="image_id"
                            value={image.id}
                          />

                          <button
                            type="submit"
                            aria-label="Delete photograph"
                            className="flex h-11 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-red-400/35 hover:bg-red-400/[0.06] hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.13em] text-white/30">
                        <div className="border border-white/10 bg-black/20 px-3 py-2">
                          Position {configurationIndex + 1}
                        </div>

                        <div className="border border-white/10 bg-black/20 px-3 py-2 text-right">
                          {image.variant_id
                            ? image.is_variant_primary
                              ? "Main image"
                              : "Gallery image"
                            : image.is_primary
                              ? "Main image"
                              : "Gallery image"}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
