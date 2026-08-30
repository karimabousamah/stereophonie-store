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
  product_image_variants?: {
    variant_id: string;
    position: number;
    is_primary: boolean;
  }[];
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

const maximumImagesPerConfiguration = 10;
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
   * Image operations have their own authoritative state.
   *
   * This keeps the surrounding product editor mounted so unsaved technical
   * specs, pricing, stock and configuration edits are never destroyed by a
   * Main/order/usage operation.
   */
  const [managedImages, setManagedImages] = useState<ProductImage[]>(images);
  const [pendingImageOperation, setPendingImageOperation] = useState("");
  const [imageOperationErrorMessage, setImageOperationErrorMessage] =
    useState("");

  const [photoUsageSavedMessage, setPhotoUsageSavedMessage] = useState("");

  /*
   * One exact configuration at a time keeps the media manager simple:
   * choose configuration → upload → arrange → choose Main.
   */
  const [selectedGalleryConfigurationId, setSelectedGalleryConfigurationId] =
    useState(() => configurations[0]?.id ?? "");

  /*
   * When an administrator is arranging one exact configuration, keep that
   * configuration authoritative for the visual card order.
   *
   * This fixes the old mismatch where the label changed from e.g. 3 of 6
   * to 2 of 6 but the physical card stayed in its global product position.
   */
  const [visualConfigurationId, setVisualConfigurationId] = useState("");

  useEffect(() => {
    setManagedImages(images);
  }, [images]);

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

  useEffect(() => {
    if (liveConfigurations.length === 0) {
      if (selectedGalleryConfigurationId) {
        setSelectedGalleryConfigurationId("");
      }

      return;
    }

    const stillExists = liveConfigurations.some(
      (configuration) => configuration.id === selectedGalleryConfigurationId,
    );

    if (!stillExists) {
      setSelectedGalleryConfigurationId(liveConfigurations[0].id);
    }
  }, [liveConfigurations, selectedGalleryConfigurationId]);

  /*
   * Each new photograph can belong to zero, one or many exact
   * saved product configurations.
   *
   * [] = Shared with all configurations.
   */
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[][]>([]);

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
  const configurationPosition = new Map(
    configurations.map((configuration, index) => [configuration.id, index]),
  );

  const configurationName = new Map(
    configurations.map((configuration) => [
      configuration.id,
      configuration.variant_name,
    ]),
  );

  /*
   * Every physical photograph appears once in the Admin.
   *
   * Its exact-configuration order is displayed below the image
   * from product_image_variants rather than pretending that the
   * product_images row itself belongs to one configuration.
   */
  const orderedImages = [...managedImages].sort((first, second) => {
    /*
     * If the administrator just interacted with one exact configuration,
     * its product_image_variants.position becomes the visual card order.
     */
    if (visualConfigurationId) {
      const firstAssignment = first.product_image_variants?.find(
        (assignment) => assignment.variant_id === visualConfigurationId,
      );

      const secondAssignment = second.product_image_variants?.find(
        (assignment) => assignment.variant_id === visualConfigurationId,
      );

      if (firstAssignment && secondAssignment) {
        const positionDifference =
          Number(firstAssignment.position ?? 0) -
          Number(secondAssignment.position ?? 0);

        if (positionDifference !== 0) {
          return positionDifference;
        }
      } else if (firstAssignment) {
        return -1;
      } else if (secondAssignment) {
        return 1;
      }
    }

    /*
     * Shared photographs and the initial untouched gallery retain their
     * stable product-level fallback ordering.
     */
    const firstPosition = Number(first.position ?? 0);
    const secondPosition = Number(second.position ?? 0);

    if (firstPosition !== secondPosition) {
      return firstPosition - secondPosition;
    }

    return first.id.localeCompare(second.id);
  });

  const selectedConfigurationImages = selectedGalleryConfigurationId
    ? [...orderedImages]
        .filter((image) => {
          const assignments = image.product_image_variants ?? [];

          return (
            assignments.length === 0 ||
            assignments.some(
              (assignment) =>
                assignment.variant_id === selectedGalleryConfigurationId,
            )
          );
        })
        .sort((first, second) => {
          const firstAssignment = first.product_image_variants?.find(
            (assignment) =>
              assignment.variant_id === selectedGalleryConfigurationId,
          );

          const secondAssignment = second.product_image_variants?.find(
            (assignment) =>
              assignment.variant_id === selectedGalleryConfigurationId,
          );

          if (firstAssignment && secondAssignment) {
            if (firstAssignment.is_primary !== secondAssignment.is_primary) {
              return firstAssignment.is_primary ? -1 : 1;
            }

            const difference =
              Number(firstAssignment.position ?? 0) -
              Number(secondAssignment.position ?? 0);

            if (difference !== 0) {
              return difference;
            }
          } else if (firstAssignment) {
            return -1;
          } else if (secondAssignment) {
            return 1;
          }

          return Number(first.position ?? 0) - Number(second.position ?? 0);
        })
    : orderedImages;

  const sharedImages = orderedImages.filter(
    (image) => (image.product_image_variants ?? []).length === 0,
  );

  async function handleImageOperation(
    event: FormEvent<HTMLFormElement>,
    operation: "usage" | "move" | "primary",
  ) {
    event.preventDefault();

    if (pendingImageOperation) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    formData.set("_client_image_operation", "1");

    const imageId = String(formData.get("image_id") ?? "").trim();
    const variantId = String(formData.get("variant_id") ?? "").trim();
    const direction = String(formData.get("direction") ?? "").trim();

    if (variantId) {
      setVisualConfigurationId(variantId);
    }

    const operationLabel =
      operation === "usage"
        ? "Saving photograph usage…"
        : operation === "move"
          ? "Updating photograph order…"
          : "Updating Main photograph…";

    setPendingImageOperation(operationLabel);
    setImageOperationErrorMessage("");

    /*
     * Snapshot current image-manager state so a failed server mutation can
     * roll back instantly without disturbing the surrounding product editor.
     */
    const previousImages = managedImages;

    /*
     * ========================================================
     * OPTIMISTIC EXACT-CONFIGURATION MOVEMENT
     * ========================================================
     *
     * The card swaps immediately in the browser. The server/database then
     * confirms the same order in the background.
     */
    if (operation === "move" && imageId) {
      if (variantId) {
        setManagedImages((currentImages) => {
          const configurationImages = currentImages
            .map((image) => ({
              image,
              assignment: image.product_image_variants?.find(
                (assignment) => assignment.variant_id === variantId,
              ),
            }))
            .filter(
              (
                item,
              ): item is {
                image: ProductImage;
                assignment: {
                  variant_id: string;
                  position: number;
                  is_primary: boolean;
                };
              } => Boolean(item.assignment),
            )
            .sort(
              (first, second) =>
                Number(first.assignment.position ?? 0) -
                Number(second.assignment.position ?? 0),
            );

          const currentIndex = configurationImages.findIndex(
            (item) => item.image.id === imageId,
          );

          if (currentIndex < 0) {
            return currentImages;
          }

          const targetIndex =
            direction === "left" ? currentIndex - 1 : currentIndex + 1;

          if (targetIndex < 0 || targetIndex >= configurationImages.length) {
            return currentImages;
          }

          const reordered = [...configurationImages];
          const [moving] = reordered.splice(currentIndex, 1);

          reordered.splice(targetIndex, 0, moving);

          const nextPositionByImageId = new Map(
            reordered.map((item, index) => [item.image.id, index]),
          );

          return currentImages.map((image) => ({
            ...image,
            product_image_variants: image.product_image_variants?.map(
              (assignment) =>
                assignment.variant_id === variantId &&
                nextPositionByImageId.has(image.id)
                  ? {
                      ...assignment,
                      position: nextPositionByImageId.get(image.id) ?? 0,
                    }
                  : assignment,
            ),
          }));
        });
      } else {
        /*
         * Shared gallery movement uses product_images.position.
         */
        setManagedImages((currentImages) => {
          const shared = currentImages
            .filter(
              (image) =>
                !image.product_image_variants ||
                image.product_image_variants.length === 0,
            )
            .sort(
              (first, second) =>
                Number(first.position ?? 0) - Number(second.position ?? 0),
            );

          const currentIndex = shared.findIndex(
            (image) => image.id === imageId,
          );

          if (currentIndex < 0) {
            return currentImages;
          }

          const targetIndex =
            direction === "left" ? currentIndex - 1 : currentIndex + 1;

          if (targetIndex < 0 || targetIndex >= shared.length) {
            return currentImages;
          }

          const reordered = [...shared];
          const [moving] = reordered.splice(currentIndex, 1);

          reordered.splice(targetIndex, 0, moving);

          const nextPositionByImageId = new Map(
            reordered.map((image, index) => [image.id, index]),
          );

          return currentImages.map((image) =>
            nextPositionByImageId.has(image.id)
              ? {
                  ...image,
                  position: nextPositionByImageId.get(image.id) ?? 0,
                }
              : image,
          );
        });
      }
    }

    /*
     * ========================================================
     * OPTIMISTIC MAIN
     * ========================================================
     *
     * Selecting Main immediately promotes that photograph to position 1
     * in the exact configuration gallery.
     */
    if (operation === "primary" && imageId) {
      if (variantId) {
        setManagedImages((currentImages) => {
          const configurationImages = currentImages
            .map((image) => ({
              image,
              assignment: image.product_image_variants?.find(
                (assignment) => assignment.variant_id === variantId,
              ),
            }))
            .filter(
              (
                item,
              ): item is {
                image: ProductImage;
                assignment: {
                  variant_id: string;
                  position: number;
                  is_primary: boolean;
                };
              } => Boolean(item.assignment),
            )
            .sort(
              (first, second) =>
                Number(first.assignment.position ?? 0) -
                Number(second.assignment.position ?? 0),
            );

          const selected = configurationImages.find(
            (item) => item.image.id === imageId,
          );

          if (!selected) {
            return currentImages;
          }

          const reordered = [
            selected,
            ...configurationImages.filter((item) => item.image.id !== imageId),
          ];

          const nextPositionByImageId = new Map(
            reordered.map((item, index) => [item.image.id, index]),
          );

          return currentImages.map((image) => ({
            ...image,
            product_image_variants: image.product_image_variants?.map(
              (assignment) =>
                assignment.variant_id === variantId
                  ? {
                      ...assignment,
                      position:
                        nextPositionByImageId.get(image.id) ??
                        assignment.position,
                      is_primary: image.id === imageId,
                    }
                  : assignment,
            ),
          }));
        });
      } else {
        setManagedImages((currentImages) => {
          const shared = currentImages
            .filter(
              (image) =>
                !image.product_image_variants ||
                image.product_image_variants.length === 0,
            )
            .sort(
              (first, second) =>
                Number(first.position ?? 0) - Number(second.position ?? 0),
            );

          const selected = shared.find((image) => image.id === imageId);

          if (!selected) {
            return currentImages;
          }

          const reordered = [
            selected,
            ...shared.filter((image) => image.id !== imageId),
          ];

          const nextPositionByImageId = new Map(
            reordered.map((image, index) => [image.id, index]),
          );

          return currentImages.map((image) =>
            nextPositionByImageId.has(image.id)
              ? {
                  ...image,
                  position: nextPositionByImageId.get(image.id) ?? 0,
                  is_primary: image.id === imageId,
                }
              : {
                  ...image,
                  is_primary: false,
                },
          );
        });
      }
    }

    const controls = Array.from(form.elements).filter(
      (
        element,
      ): element is
        | HTMLButtonElement
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement =>
        element instanceof HTMLButtonElement ||
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement,
    );

    const previousDisabledState = controls.map((control) => control.disabled);

    controls.forEach((control) => {
      control.disabled = true;
    });

    try {
      const result =
        operation === "usage"
          ? await updateProductImageVariantName(formData)
          : operation === "move"
            ? await moveProductImage(formData)
            : await setPrimaryProductImage(formData);

      if (
        !result ||
        typeof result !== "object" ||
        !("images" in result) ||
        !Array.isArray(result.images)
      ) {
        throw new Error(
          "The photograph changed, but the refreshed gallery could not be loaded.",
        );
      }

      /*
       * Database remains authoritative.
       *
       * Once the mutation finishes, reconcile the optimistic image state with
       * the exact rows returned by the server.
       */
      setManagedImages(result.images as ProductImage[]);
    } catch (error) {
      /*
       * Server failed: put the image manager exactly back where it was.
       */
      setManagedImages(previousImages);

      setImageOperationErrorMessage(
        error instanceof Error
          ? error.message
          : "The photograph could not be updated. Please try again.",
      );
    } finally {
      controls.forEach((control, index) => {
        control.disabled = previousDisabledState[index];
      });

      setPendingImageOperation("");
    }
  }

  async function handleSaveConfigurationPhotoUsage() {
    if (pendingImageOperation) {
      return;
    }

    /*
     * selectedConfigurationImages is the gallery currently rendered.
     * Therefore these are exactly the usage forms belonging to the
     * configuration the administrator is currently managing.
     */
    const usageForms = Array.from(
      document.querySelectorAll<HTMLFormElement>(
        'form[data-photo-usage-form="true"]',
      ),
    );

    if (usageForms.length === 0) {
      setImageOperationErrorMessage(
        "There are no photograph usage settings to save.",
      );
      return;
    }

    setPendingImageOperation("Saving photo usage…");
    setImageOperationErrorMessage("");
    setPhotoUsageSavedMessage("");

    const previousImages = managedImages;

    let latestAuthoritativeImages: ProductImage[] | null = null;

    try {
      /*
       * Reuse the existing authoritative per-photo server action.
       *
       * The administrator still makes individual usage choices per photo,
       * but only needs to press Save once for the complete gallery.
       */
      for (const form of usageForms) {
        const formData = new FormData(form);

        formData.set("_client_image_operation", "1");

        const result = await updateProductImageVariantName(formData);

        if (
          !result ||
          typeof result !== "object" ||
          !("images" in result) ||
          !Array.isArray(result.images)
        ) {
          throw new Error(
            "Photo usage changed, but the refreshed gallery could not be loaded.",
          );
        }

        latestAuthoritativeImages = result.images as ProductImage[];
      }

      if (latestAuthoritativeImages) {
        setManagedImages(latestAuthoritativeImages);
      }

      setPhotoUsageSavedMessage(
        usageForms.length === 1
          ? "Photo usage saved."
          : `Photo usage saved for ${usageForms.length} photographs.`,
      );
    } catch (error) {
      /*
       * If an earlier image was already successfully persisted, keep the
       * latest authoritative response rather than pretending it was undone.
       */
      setManagedImages(latestAuthoritativeImages ?? previousImages);

      setImageOperationErrorMessage(
        error instanceof Error
          ? error.message
          : "Photo usage could not be saved. Please try again.",
      );
    } finally {
      setPendingImageOperation("");
    }
  }

  function clearSelectedFiles() {
    previewUrls.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });

    setSelectedFiles([]);
    setSelectedVariantIds([]);
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
      variant_ids: string[];
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
          variant_ids: Array.from(
            new Set(
              (selectedVariantIds[index] ?? [])
                .map((variantId) => String(variantId ?? "").trim())
                .filter(Boolean),
            ),
          ),
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
    setSelectedVariantIds(processedFiles.map(() => []));

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
              {maximumImagesPerConfiguration} max / configuration
            </p>
          </div>
        </div>

        <div className="p-5">
          {liveConfigurations.length > 0 ? (
            <section className="mb-5 border border-white/10 bg-black/20 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                    Photograph configuration
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    Choose the configuration gallery you want to manage.
                  </p>
                </div>

                {liveConfigurations.length > 1 ? (
                  <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                    {liveConfigurations.map((configuration, index) => {
                      const active =
                        configuration.id === selectedGalleryConfigurationId;

                      const count = managedImages.filter((image) =>
                        image.product_image_variants?.some(
                          (assignment) =>
                            assignment.variant_id === configuration.id,
                        ),
                      ).length;

                      return (
                        <button
                          key={configuration.id}
                          type="button"
                          onClick={() => {
                            setSelectedGalleryConfigurationId(configuration.id);
                            setVisualConfigurationId(configuration.id);
                            setImageOperationErrorMessage("");
                          }}
                          className={`shrink-0 border px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.11em] transition ${
                            active
                              ? "border-[#e2a128] bg-[#fdb73e] text-black"
                              : "border-white/10 bg-black/30 text-white/45 hover:border-white/30 hover:text-white"
                          }`}
                        >
                          {configuration.variant_name ||
                            configuration.fallbackLabel ||
                            `Configuration ${index + 1}`}
                          <span className="ml-2 opacity-55">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {selectedGalleryConfigurationId ? (
                <p className="mt-4 border border-[#fdb73e]/25 bg-[#fdb73e]/[0.05] px-4 py-3 text-xs leading-5 text-white/50">
                  Uploads and ordering below are focused on{" "}
                  <strong className="text-white">
                    {liveConfigurations.find(
                      (configuration) =>
                        configuration.id === selectedGalleryConfigurationId,
                    )?.variant_name || "this configuration"}
                  </strong>
                  .
                </p>
              ) : null}
            </section>
          ) : null}

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
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">
                              Photograph usage
                            </span>

                            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                              {(selectedVariantIds[index] ?? []).length === 0
                                ? "Shared"
                                : `${(selectedVariantIds[index] ?? []).length} selected`}
                            </span>
                          </div>

                          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto border border-white/10 bg-black/40 p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVariantIds((current) => {
                                  const next = current.map((ids) => [...ids]);

                                  while (next.length <= index) {
                                    next.push([]);
                                  }

                                  next[index] = [];
                                  return next;
                                });
                              }}
                              className={`flex min-h-10 w-full items-center justify-between gap-3 border px-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                                (selectedVariantIds[index] ?? []).length === 0
                                  ? "border-white bg-white text-black"
                                  : "border-white/10 bg-black/20 text-white/45 hover:border-white/30 hover:text-white"
                              }`}
                            >
                              <span>Shared with all configurations</span>

                              {(selectedVariantIds[index] ?? []).length ===
                              0 ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              ) : null}
                            </button>

                            {liveConfigurations.map((configuration) => {
                              const selectable =
                                configuration.persisted &&
                                Boolean(configuration.id) &&
                                Boolean(configuration.variant_name);

                              const checked = (
                                selectedVariantIds[index] ?? []
                              ).includes(configuration.id);

                              return (
                                <label
                                  key={configuration.id}
                                  className={`flex min-h-10 items-center gap-3 border px-3 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                                    !selectable
                                      ? "cursor-not-allowed border-white/5 bg-black/10 text-white/20"
                                      : checked
                                        ? "cursor-pointer border-white/45 bg-white/10 text-white"
                                        : "cursor-pointer border-white/10 bg-black/20 text-white/45 hover:border-white/30 hover:text-white"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!selectable}
                                    onChange={(event) => {
                                      setSelectedVariantIds((current) => {
                                        const next = current.map((ids) => [
                                          ...ids,
                                        ]);

                                        while (next.length <= index) {
                                          next.push([]);
                                        }

                                        const ids = new Set(next[index] ?? []);

                                        if (event.target.checked) {
                                          ids.add(configuration.id);
                                        } else {
                                          ids.delete(configuration.id);
                                        }

                                        next[index] = Array.from(ids);
                                        return next;
                                      });
                                    }}
                                    className="h-3.5 w-3.5 shrink-0 accent-white"
                                  />

                                  <span className="min-w-0 flex-1">
                                    {selectable
                                      ? configuration.variant_name
                                      : `${configuration.fallbackLabel} — save changes first`}
                                  </span>
                                </label>
                              );
                            })}
                          </div>

                          <p className="mt-2 text-[10px] leading-4 text-white/25">
                            Leave this photograph Shared for every
                            configuration, or select every exact configuration
                            that should use it.
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

      {selectedGalleryConfigurationId &&
      selectedConfigurationImages.length > 0 ? (
        <section className="mb-5 overflow-hidden border border-white/10 bg-[#0d0d0d]">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                Photo usage
              </p>

              <h3 className="mt-2 text-lg font-semibold text-white">
                Save photo usage for this gallery
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/40">
                Choose which configurations can use each photograph below. You
                can make changes to several photographs first, then save every
                photo usage setting together with this one button.
              </p>

              <p className="mt-2 text-xs leading-5 text-white/30">
                Selected gallery:{" "}
                <strong className="font-semibold text-white/60">
                  {liveConfigurations.find(
                    (configuration) =>
                      configuration.id === selectedGalleryConfigurationId,
                  )?.variant_name || "Current configuration"}
                </strong>
                {" · "}
                {selectedConfigurationImages.length}{" "}
                {selectedConfigurationImages.length === 1
                  ? "photograph"
                  : "photographs"}
              </p>

              {photoUsageSavedMessage ? (
                <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {photoUsageSavedMessage}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={Boolean(pendingImageOperation)}
              onClick={() => {
                void handleSaveConfigurationPhotoUsage();
              }}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-[#e2a128] bg-[#fdb73e] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Save className="h-4 w-4" />

              {pendingImageOperation === "Saving photo usage…"
                ? "Saving photo usage…"
                : "Save photo usage"}
            </button>
          </div>
        </section>
      ) : null}

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
              {pendingImageOperation ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="pointer-events-none fixed bottom-6 right-6 z-[100] inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-[10px] font-semibold text-black shadow-lg"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#fdb73e]" />
                  {pendingImageOperation}
                </div>
              ) : null}

              {imageOperationErrorMessage ? (
                <div
                  role="alert"
                  className="fixed bottom-6 right-6 z-[101] max-w-sm rounded-xl border border-red-500/20 bg-white px-4 py-3 text-xs font-medium text-red-600 shadow-lg"
                >
                  {imageOperationErrorMessage}
                </div>
              ) : null}

              {selectedConfigurationImages.map((image, index) => {
                const assignments = [
                  ...(image.product_image_variants ?? []),
                ].sort((first, second) => {
                  const firstConfiguration =
                    configurationPosition.get(first.variant_id) ?? 9999;

                  const secondConfiguration =
                    configurationPosition.get(second.variant_id) ?? 9999;

                  if (firstConfiguration !== secondConfiguration) {
                    return firstConfiguration - secondConfiguration;
                  }

                  return first.position - second.position;
                });

                const isShared = assignments.length === 0;

                const sharedIndex = isShared
                  ? sharedImages.findIndex(
                      (candidate) => candidate.id === image.id,
                    )
                  : -1;

                const hasConfigurationMain = assignments.some(
                  (assignment) => assignment.is_primary,
                );

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
                          {isShared
                            ? `Shared · Position ${sharedIndex + 1}`
                            : `${assignments.length} configuration${
                                assignments.length === 1 ? "" : "s"
                              }`}
                        </span>

                        {(isShared
                          ? image.is_primary
                          : hasConfigurationMain) && (
                          <span className="inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
                            <Star className="h-3 w-3 fill-current" />
                            Main
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      <form
                        data-photo-usage-form="true"
                        onSubmit={(event) =>
                          void handleImageOperation(event, "usage")
                        }
                        className="border border-white/10 bg-black/20 p-3"
                      >
                        <input
                          type="hidden"
                          name="product_id"
                          value={productId}
                        />
                        <input type="hidden" name="image_id" value={image.id} />

                        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">
                          Photograph usage
                        </p>

                        {(() => {
                          const assignedVariantIds = new Set(
                            (image.product_image_variants ?? []).map(
                              (assignment) => assignment.variant_id,
                            ),
                          );

                          const isShared = assignedVariantIds.size === 0;

                          return (
                            <>
                              <div
                                className={`mt-3 border p-3 ${
                                  isShared
                                    ? "border-emerald-300/30 bg-emerald-300/[0.05]"
                                    : "border-white/10 bg-black/20"
                                }`}
                              >
                                <p className="text-xs font-semibold text-white/75">
                                  {isShared
                                    ? "Shared with all configurations"
                                    : "Configuration-specific photograph"}
                                </p>

                                <p className="mt-1 text-[10px] leading-4 text-white/30">
                                  Leave every option unchecked to share this
                                  photograph with every configuration.
                                </p>
                              </div>

                              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                                {configurations.map((configuration) => {
                                  const checked = assignedVariantIds.has(
                                    configuration.id,
                                  );

                                  return (
                                    <label
                                      key={configuration.id}
                                      className={`flex cursor-pointer items-center gap-3 border px-3 py-2.5 transition ${
                                        checked
                                          ? "border-white/35 bg-white/[0.07]"
                                          : "border-white/10 bg-black/20 hover:border-white/25"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        name="variant_ids"
                                        value={configuration.id}
                                        defaultChecked={checked}
                                        className="h-4 w-4 accent-white"
                                      />

                                      <span className="min-w-0 flex-1 text-xs text-white/70">
                                        {configuration.variant_name}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-[10px] text-white/30">
                                  {isShared
                                    ? "Used by every configuration"
                                    : `${assignedVariantIds.size} selected`}
                                </span>
                              </div>
                            </>
                          );
                        })()}
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

                      {isShared ? (
                        <div className="space-y-3 border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">
                                Shared gallery
                              </p>

                              <p className="mt-1 text-xs text-white/65">
                                Position {sharedIndex + 1} of{" "}
                                {sharedImages.length}
                              </p>
                            </div>

                            {image.is_primary && (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                                <Star className="h-3 w-3 fill-current" />
                                Main
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <form
                              onSubmit={(event) =>
                                void handleImageOperation(event, "move")
                              }
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

                              <input
                                type="hidden"
                                name="direction"
                                value="left"
                              />

                              <button
                                type="submit"
                                disabled={sharedIndex <= 0}
                                aria-label="Move shared photograph earlier"
                                className="flex h-11 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </button>
                            </form>

                            <form
                              onSubmit={(event) =>
                                void handleImageOperation(event, "move")
                              }
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

                              <input
                                type="hidden"
                                name="direction"
                                value="right"
                              />

                              <button
                                type="submit"
                                disabled={
                                  sharedIndex >= sharedImages.length - 1
                                }
                                aria-label="Move shared photograph later"
                                className="flex h-11 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </form>

                            <form
                              onSubmit={(event) =>
                                void handleImageOperation(event, "primary")
                              }
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
                                disabled={image.is_primary}
                                aria-label="Set shared photograph as Main"
                                className="flex h-11 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-emerald-400/35 hover:text-emerald-300 disabled:cursor-default disabled:border-emerald-400/30 disabled:text-emerald-300"
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    image.is_primary ? "fill-current" : ""
                                  }`}
                                />
                              </button>
                            </form>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">
                              Exact configuration galleries
                            </p>

                            <p className="mt-1 text-[10px] leading-4 text-white/30">
                              The same photograph can have a different position
                              and Main state in every configuration.
                            </p>
                          </div>

                          {assignments.map((assignment) => {
                            const configurationLabel =
                              configurationName.get(assignment.variant_id) ||
                              "Unknown configuration";

                            const configurationImages = orderedImages
                              .map((candidate) => ({
                                image: candidate,
                                assignment:
                                  candidate.product_image_variants?.find(
                                    (candidateAssignment) =>
                                      candidateAssignment.variant_id ===
                                      assignment.variant_id,
                                  ),
                              }))
                              .filter(
                                (
                                  candidate,
                                ): candidate is {
                                  image: ProductImage;
                                  assignment: {
                                    variant_id: string;
                                    position: number;
                                    is_primary: boolean;
                                  };
                                } => Boolean(candidate.assignment),
                              )
                              .sort(
                                (first, second) =>
                                  first.assignment.position -
                                  second.assignment.position,
                              );

                            const configurationIndex =
                              configurationImages.findIndex(
                                (candidate) => candidate.image.id === image.id,
                              );

                            return (
                              <div
                                key={assignment.variant_id}
                                className="border border-white/10 bg-black/20 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-white/75">
                                      {configurationLabel}
                                    </p>

                                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/30">
                                      Position {configurationIndex + 1} of{" "}
                                      {configurationImages.length}
                                    </p>
                                  </div>

                                  {assignment.is_primary && (
                                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                                      <Star className="h-3 w-3 fill-current" />
                                      Main
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <form
                                    onSubmit={(event) =>
                                      void handleImageOperation(event, "move")
                                    }
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

                                    <input
                                      type="hidden"
                                      name="variant_id"
                                      value={assignment.variant_id}
                                    />

                                    <input
                                      type="hidden"
                                      name="direction"
                                      value="left"
                                    />

                                    <button
                                      type="submit"
                                      disabled={configurationIndex <= 0}
                                      aria-label={`Move photograph earlier in ${configurationLabel}`}
                                      className="flex h-10 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                                    >
                                      <ArrowLeft className="h-4 w-4" />
                                    </button>
                                  </form>

                                  <form
                                    onSubmit={(event) =>
                                      void handleImageOperation(event, "move")
                                    }
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

                                    <input
                                      type="hidden"
                                      name="variant_id"
                                      value={assignment.variant_id}
                                    />

                                    <input
                                      type="hidden"
                                      name="direction"
                                      value="right"
                                    />

                                    <button
                                      type="submit"
                                      disabled={
                                        configurationIndex >=
                                        configurationImages.length - 1
                                      }
                                      aria-label={`Move photograph later in ${configurationLabel}`}
                                      className="flex h-10 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                                    >
                                      <ArrowRight className="h-4 w-4" />
                                    </button>
                                  </form>

                                  <form
                                    onSubmit={(event) =>
                                      void handleImageOperation(
                                        event,
                                        "primary",
                                      )
                                    }
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

                                    <input
                                      type="hidden"
                                      name="variant_id"
                                      value={assignment.variant_id}
                                    />

                                    <button
                                      type="submit"
                                      disabled={assignment.is_primary}
                                      aria-label={`Set as Main for ${configurationLabel}`}
                                      className="flex h-10 w-full items-center justify-center border border-white/10 text-white/50 transition hover:border-emerald-400/35 hover:text-emerald-300 disabled:cursor-default disabled:border-emerald-400/30 disabled:text-emerald-300"
                                    >
                                      <Star
                                        className={`h-4 w-4 ${
                                          assignment.is_primary
                                            ? "fill-current"
                                            : ""
                                        }`}
                                      />
                                    </button>
                                  </form>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

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

                        <input type="hidden" name="image_id" value={image.id} />

                        <button
                          type="submit"
                          aria-label="Delete photograph"
                          className="flex h-11 w-full items-center justify-center gap-2 border border-red-400/20 text-[10px] font-semibold uppercase tracking-[0.13em] text-red-300/70 transition hover:border-red-400/40 hover:bg-red-400/[0.06] hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete photograph
                        </button>
                      </form>
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
