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
  deleteAllProductImages,
  deleteProductImage,
  moveProductImage,
  setPrimaryProductImage,
  updateProductImageVariantName,
  updateProductImageVariantUsageBulk,
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

function isAcceptedImageFile(file: File) {
  return file.type.startsWith("image/");
}

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
   * Each new image can belong to zero, one or many exact
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
   * `variant_position` is the real customer-facing image
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
   * Every physical image appears once in the Admin.
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
     * Shared images and the initial untouched gallery retain their
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
        ? "Saving image usage…"
        : operation === "move"
          ? "Updating image order…"
          : "Updating Main image…";

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
                    is_primary:
                      nextPositionByImageId.get(image.id) === 0,
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
                    is_primary:
                      nextPositionByImageId.get(image.id) === 0,
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
     * Selecting Main immediately promotes that image to position 1
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
          "The image changed, but the refreshed gallery could not be loaded.",
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
          : "The image could not be updated. Please try again.",
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
      return false;
    }

    const usageForms = Array.from(
      document.querySelectorAll<HTMLFormElement>(
        'form[data-photo-usage-form="true"]',
      ),
    );

    if (usageForms.length === 0) {
      return true;
    }

    setPendingImageOperation("Saving photo usage…");
    setImageOperationErrorMessage("");
    setPhotoUsageSavedMessage("");

    try {
      const usage = usageForms.map((form) => {
        const formData = new FormData(form);

        return {
          image_id: String(formData.get("image_id") ?? "").trim(),
          variant_ids: Array.from(
            new Set(
              formData
                .getAll("variant_ids")
                .map((value) => String(value ?? "").trim())
                .filter(Boolean),
            ),
          ),
        };
      });

      const formData = new FormData();
      formData.set("product_id", productId);
      formData.set("usage_json", JSON.stringify(usage));

      const result = await updateProductImageVariantUsageBulk(formData);

      if (!result?.success || !Array.isArray(result.images)) {
        throw new Error("The image usage could not be saved.");
      }

      setManagedImages(result.images as ProductImage[]);

      setPhotoUsageSavedMessage(
        usage.length === 1
          ? "Photo usage saved."
          : `Photo usage saved for ${usage.length} images.`,
      );

      return true;
    } catch (error) {
      setImageOperationErrorMessage(
        error instanceof Error
          ? error.message
          : "Photo usage could not be saved. Please try again.",
      );

      return false;
    } finally {
      setPendingImageOperation("");
    }
  }

  useEffect(() => {
    function handleMasterPhotoUsageSave(event: Event) {
      const customEvent = event as CustomEvent<{
        handled?: boolean;
        resolve?: (saved: boolean) => void;
      }>;

      if (customEvent.detail) {
        customEvent.detail.handled = true;
      }

      void handleSaveConfigurationPhotoUsage()
        .then((saved) => {
          customEvent.detail?.resolve?.(saved);
        })
        .catch(() => {
          customEvent.detail?.resolve?.(false);
        });
    }

    window.addEventListener(
      "stereophonie:admin-save-photo-usage",
      handleMasterPhotoUsageSave,
    );

    return () => {
      window.removeEventListener(
        "stereophonie:admin-save-photo-usage",
        handleMasterPhotoUsageSave,
      );
    };
  });

  async function handleClearAllPhotographs() {
    if (pendingImageOperation || managedImages.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete all ${managedImages.length} uploaded image${
        managedImages.length === 1 ? "" : "s"
      } from this product? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setPendingImageOperation("Clearing images…");
    setImageOperationErrorMessage("");
    setPhotoUsageSavedMessage("");

    try {
      const formData = new FormData();
      formData.set("product_id", productId);

      const result = await deleteAllProductImages(formData);

      if (!result?.success) {
        throw new Error("The images could not be cleared.");
      }

      setManagedImages([]);
      setPhotoUsageSavedMessage("All images cleared.");
    } catch (error) {
      setImageOperationErrorMessage(
        error instanceof Error
          ? error.message
          : "The images could not be cleared. Please try again.",
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
      setUploadError("Select at least one image.");
      return;
    }

    try {
      validateProductImageFiles(selectedFiles, orderedImages.length);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "The selected images could not be processed.",
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
        throw new Error("The image upload form could not be prepared.");
      }

      directUploadedImagesInputRef.current.value = JSON.stringify(payload);

      const form = uploadFormRef.current;

      if (!form) {
        throw new Error("The image upload form could not be submitted.");
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
          : "The images could not be uploaded.",
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

    const invalidType = selected.find((file) => !isAcceptedImageFile(file));

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
        "Preparing images… removing background and standardizing layout.",
      );

      processedFiles = await Promise.all(
        selected.map((file) => processImageBeforeUpload(file, "product")),
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "The images could not be prepared.",
      );

      return;
    }

    previewUrls.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });

    setUploadError("");

    setSelectedFiles(processedFiles);

    /*
     * New images default to Shared with all configurations.
     * The admin can change each image independently before upload.
     */
    setSelectedVariantIds(processedFiles.map(() => []));

    setPreviewUrls(processedFiles.map((file) => URL.createObjectURL(file)));
  }


  return (
    <div className="st-admin-existing-media-v2">
      <div className="st-admin-media-manager">
        {liveConfigurations.length > 0 ? (
          <div className="st-admin-media-manager__configuration-bar">
            <div className="st-admin-media-manager__configuration-label">
              <strong>Configuration gallery</strong>
              <span>
                Select the exact configuration whose customer gallery you want
                to manage.
              </span>
            </div>

            <div className="st-admin-media-manager__configuration-tabs">
              {liveConfigurations.map((configuration, index) => {
                const active =
                  configuration.id === selectedGalleryConfigurationId;

                const count = managedImages.filter((image) => {
                  const assignments = image.product_image_variants ?? [];

                  if (assignments.length === 0) {
                    return true;
                  }

                  return assignments.some(
                    (assignment) =>
                      assignment.variant_id === configuration.id,
                  );
                }).length;

                return (
                  <button
                    key={configuration.id}
                    type="button"
                    onClick={() => {
                      setSelectedGalleryConfigurationId(configuration.id);
                      setVisualConfigurationId(configuration.id);
                    }}
                    className={
                      active
                        ? "st-admin-media-manager__configuration-tab is-active"
                        : "st-admin-media-manager__configuration-tab"
                    }
                  >
                    <span>
                      {configuration.variant_name ||
                        configuration.fallbackLabel ||
                        `Configuration ${index + 1}`}
                    </span>
                    <small>{count}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <form
          onSubmit={handleDirectUploadSubmit}
          className="st-admin-existing-media-v2__upload"
        >
          <div className="st-admin-existing-media-v2__upload-head">
            <div>
              <strong>Add images</strong>
              <span>
                Upload product images, then assign them to one or more exact
                configurations.
              </span>
            </div>

            <label
              className={
                isUploading
                  ? "st-admin-existing-media-v2__select is-disabled"
                  : "st-admin-existing-media-v2__select"
              }
              aria-disabled={isUploading}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={isUploading}
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  setSelectedFiles(files);

                  previewUrls.forEach((previewUrl) => {
                    URL.revokeObjectURL(previewUrl);
                  });

                  setPreviewUrls(
                    files.map((file) => URL.createObjectURL(file)),
                  );

                  setSelectedVariantIds(files.map(() => []));
                  setUploadError("");
                }}
              />
              Add images
            </label>
          </div>

          {uploadError ? (
            <div className="st-admin-media-manager__error">{uploadError}</div>
          ) : null}

          {selectedFiles.length > 0 ? (
            <div className="st-admin-existing-media-v2__pending">
              <div className="st-admin-existing-media-v2__pending-head">
                <div>
                  <strong>
                    {selectedFiles.length}{" "}
                    {selectedFiles.length === 1 ? "image" : "images"} ready
                  </strong>
                  <span>
                    Leave configuration assignment empty to share an image with
                    every configuration.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedFiles}
                  disabled={isUploading}
                  className="st-admin-existing-media-v2__secondary"
                >
                  Clear
                </button>
              </div>

              <div className="st-admin-existing-media-v2__pending-grid">
                {selectedFiles.map((file, index) => (
                  <article
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="st-admin-media-item"
                  >
                    <div className="st-admin-media-item__preview">
                      {previewUrls[index] ? (
                        <img
                          src={previewUrls[index]}
                          alt={file.name}
                        />
                      ) : null}

                      <span className="st-admin-media-item__position">
                        {index + 1}
                      </span>
                    </div>

                    <div className="st-admin-media-item__body">
                      <strong className="st-admin-media-item__file">
                        {file.name}
                      </strong>

                      <details className="st-admin-media-item__usage">
                        <summary>
                          <span>Edit usage</span>
                          <small>
                            {(selectedVariantIds[index] ?? []).length === 0
                              ? "All configurations"
                              : `${(selectedVariantIds[index] ?? []).length} selected`}
                          </small>
                        </summary>

                        <div className="st-admin-media-item__usage-panel">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVariantIds((current) =>
                                current.map((value, candidateIndex) =>
                                  candidateIndex === index ? [] : value,
                                ),
                              );
                            }}
                            className="st-admin-existing-media-v2__shared"
                          >
                            Shared with all configurations
                          </button>

                          <div className="st-admin-media-item__configuration-list">
                            {liveConfigurations.map((configuration) => {
                              const selected = (
                                selectedVariantIds[index] ?? []
                              ).includes(configuration.id);

                              return (
                                <label key={configuration.id}>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => {
                                      setSelectedVariantIds((current) =>
                                        current.map((value, candidateIndex) => {
                                          if (candidateIndex !== index) {
                                            return value;
                                          }

                                          return selected
                                            ? value.filter(
                                                (variantId) =>
                                                  variantId !==
                                                  configuration.id,
                                              )
                                            : [...value, configuration.id];
                                        }),
                                      );
                                    }}
                                  />

                                  <span>
                                    {configuration.variant_name ||
                                      configuration.fallbackLabel}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </details>
                    </div>
                  </article>
                ))}
              </div>

              <div className="st-admin-existing-media-v2__upload-footer">
                {uploadProgress ? (
                  <div className="st-admin-existing-media-v2__progress">
                    <div>
                      <span>
                        {uploadProgress.currentFileName || "Finalizing images"}
                      </span>
                      <strong>{uploadProgress.percentage}%</strong>
                    </div>

                    <div>
                      <span
                        style={{
                          width: `${uploadProgress.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <span />
                )}

                <button
                  type="submit"
                  disabled={isUploading}
                  className="st-admin-existing-media-v2__primary"
                >
                  {isUploading
                    ? `Uploading ${uploadProgress?.percentage ?? 0}%`
                    : "Upload images"}
                </button>
              </div>
            </div>
          ) : null}
        </form>

        <div className="st-admin-existing-media-v2__toolbar">
          <div>
            <strong>
              {selectedGalleryConfigurationId
                ? liveConfigurations.find(
                    (configuration) =>
                      configuration.id === selectedGalleryConfigurationId,
                  )?.variant_name || "Selected configuration"
                : "Product images"}
            </strong>

            <span>
              {selectedGalleryConfigurationId
                ? `${selectedConfigurationImages.length} image${
                    selectedConfigurationImages.length === 1 ? "" : "s"
                  } in this gallery`
                : `${orderedImages.length} uploaded image${
                    orderedImages.length === 1 ? "" : "s"
                  }`}
            </span>
          </div>

          <div className="st-admin-existing-media-v2__toolbar-actions">
            {selectedGalleryConfigurationId &&
            managedImages.length > 0 ? (
              <button
                type="button"
                disabled={Boolean(pendingImageOperation)}
                onClick={() => {
                  void handleSaveConfigurationPhotoUsage();
                }}
                className="st-admin-existing-media-v2__secondary"
              >
                {pendingImageOperation === "Saving photo usage…"
                  ? "Saving..."
                  : "Save usage"}
              </button>
            ) : null}

            {managedImages.length > 0 ? (
              <button
                type="button"
                disabled={Boolean(pendingImageOperation)}
                onClick={() => {
                  void handleClearAllPhotographs();
                }}
                className="st-admin-existing-media-v2__danger"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        {photoUsageSavedMessage ? (
          <div className="st-admin-existing-media-v2__success">
            {photoUsageSavedMessage}
          </div>
        ) : null}

        {imageOperationErrorMessage ? (
          <div className="st-admin-media-manager__error">
            {imageOperationErrorMessage}
          </div>
        ) : null}

        {pendingImageOperation ? (
          <div className="st-admin-existing-media-v2__activity">
            {pendingImageOperation}
          </div>
        ) : null}

        {orderedImages.length === 0 ? (
          <div className="st-admin-media-manager__empty">
            <div className="st-admin-media-manager__empty-icon">
              <ImageOff />
            </div>

            <strong>No product images yet</strong>
            <span>
              Add images above. They can be shared or assigned to exact product
              configurations.
            </span>
          </div>
        ) : (
          <div className="st-admin-media-manager__grid st-admin-existing-media-v2__grid">
            {selectedConfigurationImages.map((image, index) => {
              const assignments = (image.product_image_variants ?? []).sort(
                (first, second) =>
                  Number(first.position ?? 0) -
                  Number(second.position ?? 0),
              );

              const isShared = assignments.length === 0;

              const sharedIndex = isShared
                ? sharedImages.findIndex(
                    (candidate) => candidate.id === image.id,
                  )
                : -1;

              const hasConfigurationMain = assignments.some(
                (assignment) => assignment.is_primary,
              );

              const activeAssignment =
                selectedGalleryConfigurationId
                  ? assignments.find(
                      (assignment) =>
                        assignment.variant_id ===
                        selectedGalleryConfigurationId,
                    )
                  : undefined;

              const activeConfigurationImages =
                selectedGalleryConfigurationId
                  ? orderedImages.filter((candidate) =>
                      candidate.product_image_variants?.some(
                        (assignment) =>
                          assignment.variant_id ===
                          selectedGalleryConfigurationId,
                      ),
                    )
                  : [];

              const activeConfigurationIndex =
                activeConfigurationImages.findIndex(
                  (candidate) => candidate.id === image.id,
                );

              const isActiveMain = index === 0;

              return (
                <article
                  key={image.id}
                  className={
                    isActiveMain
                      ? "st-admin-media-item is-main"
                      : "st-admin-media-item"
                  }
                  data-admin-product-image-card="true"
                >
                  <div className="st-admin-media-item__preview">
                    {image.image_url ? (
                      <img
                        src={image.image_url}
                        alt={
                          image.alt_text ||
                          `${productName} image ${index + 1}`
                        }
                      />
                    ) : (
                      <div className="st-admin-existing-media-v2__missing">
                        <ImageOff />
                      </div>
                    )}

                    <span className="st-admin-media-item__position">
                      {index + 1}
                    </span>

                    {isActiveMain ? (
<form
                      onSubmit={(event) =>
                        void handleImageOperation(
                          event,
                          "primary",
                        )
                      }
                      className="st-admin-media-item__main-form"
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

                      {!isShared && activeAssignment ? (
                        <input
                          type="hidden"
                          name="variant_id"
                          value={activeAssignment.variant_id}
                        />
                      ) : null}

                      <button
                        type="submit"
                        data-secondary-action="true"
                        className="st-admin-media-item__main"
                        disabled={
                          isActiveMain ||
                          (!isShared && !activeAssignment)
                        }
                        title={isActiveMain ? "Main image" : "Set as Main"}
                        aria-label={
                          "Main image"
                        }
                      >
                          <span className="st-admin-media-main-indicator-v2" aria-hidden="true" />
                          Main
                      </button>
                    </form>
) : null}
                  </div>

                  <div className="st-admin-media-item__body">
                    <details className="st-admin-media-item__usage">
                      <summary>
                        <span>Edit usage</span>
                        <small>
                          {isShared
                            ? "All configurations"
                            : `${assignments.length} selected`}
                        </small>
                      </summary>

                      <form
                        data-photo-usage-form="true"
                        onSubmit={(event) =>
                          void handleImageOperation(event, "usage")
                        }
                        className="st-admin-media-item__usage-panel"
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
                          type="button"
                          className="st-admin-existing-media-v2__shared"
                          onClick={(event) => {
                            const form = event.currentTarget.closest("form");

                            if (!form) {
                              return;
                            }

                            form
                              .querySelectorAll<HTMLInputElement>(
                                'input[name="variant_ids"]',
                              )
                              .forEach((input) => {
                                input.checked = false;
                              });
                          }}
                        >
                          Shared with all configurations
                        </button>

                        <div className="st-admin-media-item__configuration-list">
                          {configurations.map((configuration) => {
                            const checked = assignments.some(
                              (assignment) =>
                                assignment.variant_id === configuration.id,
                            );

                            return (
                              <label key={configuration.id}>
                                <input
                                  type="checkbox"
                                  name="variant_ids"
                                  value={configuration.id}
                                  defaultChecked={checked}
                                />

                                <span>{configuration.variant_name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </form>
                    </details>


                    <div className="st-admin-media-item__actions">
                      <form
                        onSubmit={(event) =>
                          void handleImageOperation(event, "move")
                        }
                      >
                        <input type="hidden" name="product_id" value={productId} />
                        <input type="hidden" name="image_id" value={image.id} />
                        {!isShared && activeAssignment ? (
                          <input
                            type="hidden"
                            name="variant_id"
                            value={activeAssignment.variant_id}
                          />
                        ) : null}
                        <input type="hidden" name="direction" value="left" />
                        <button
                          type="submit"
                          data-secondary-action="true"
                          disabled={
                            isShared
                              ? sharedIndex <= 0
                              : !activeAssignment ||
                                activeConfigurationIndex <= 0
                          }
                          title="Move image earlier"
                          aria-label="Move image earlier"
                        >
                          <ArrowLeft />
                        </button>
                      </form>

                      <form
                        onSubmit={(event) =>
                          void handleImageOperation(event, "move")
                        }
                      >
                        <input type="hidden" name="product_id" value={productId} />
                        <input type="hidden" name="image_id" value={image.id} />
                        {!isShared && activeAssignment ? (
                          <input
                            type="hidden"
                            name="variant_id"
                            value={activeAssignment.variant_id}
                          />
                        ) : null}
                        <input type="hidden" name="direction" value="right" />
                        <button
                          type="submit"
                          data-secondary-action="true"
                          disabled={
                            isShared
                              ? sharedIndex >= sharedImages.length - 1
                              : !activeAssignment ||
                                activeConfigurationIndex >=
                                  activeConfigurationImages.length - 1
                          }
                          title="Move image later"
                          aria-label="Move image later"
                        >
                          <ArrowRight />
                        </button>
                      </form>

                      <form
                        action={deleteProductImage}
                        onSubmit={(event) => {
                          const confirmed = window.confirm(
                            "Delete this image permanently?",
                          );
                          if (!confirmed) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="product_id" value={productId} />
                        <input type="hidden" name="image_id" value={image.id} />
                        <button
                          type="submit"
                          data-secondary-action="true"
                          className="is-danger"
                          title="Delete image"
                          aria-label="Delete image"
                        >
                          <Trash2 />
                        </button>
                      </form>
                    </div>

                    {isShared ? (
                      <div className="st-admin-existing-media-v2__controls">
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
                            aria-label="Move shared image earlier"
                          >
                            <ArrowLeft />
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
                            aria-label="Move shared image later"
                          >
                            <ArrowRight />
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
                            aria-label="Set shared image as Main"
                            className={
                              image.is_primary ? "is-main" : undefined
                            }
                          >
                            <Star />
                          </button>
                        </form>
                      </div>
                    ) : (
                      <details className="st-admin-existing-media-v2__galleries">
                        <summary>
                          Configuration galleries
                          <small>{assignments.length}</small>
                        </summary>

                        <div>
                          {assignments.map((assignment) => {
                            const label =
                              configurationName.get(
                                assignment.variant_id,
                              ) || "Unknown configuration";

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
                                (candidate) =>
                                  candidate.image.id === image.id,
                              );

                            return (
                              <section key={assignment.variant_id}>
                                <div>
                                  <strong>{label}</strong>
                                  <span>
                                    Position {configurationIndex + 1} of{" "}
                                    {configurationImages.length}
                                  </span>
                                </div>

                                <div className="st-admin-existing-media-v2__controls">
                                  <form
                                    onSubmit={(event) =>
                                      void handleImageOperation(
                                        event,
                                        "move",
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
                                    <input
                                      type="hidden"
                                      name="direction"
                                      value="left"
                                    />

                                    <button
                                      type="submit"
                                      disabled={configurationIndex <= 0}
                                      aria-label={`Move image earlier in ${label}`}
                                    >
                                      <ArrowLeft />
                                    </button>
                                  </form>

                                  <form
                                    onSubmit={(event) =>
                                      void handleImageOperation(
                                        event,
                                        "move",
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
                                      aria-label={`Move image later in ${label}`}
                                    >
                                      <ArrowRight />
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
                                      aria-label={`Set as Main for ${label}`}
                                      className={
                                        assignment.is_primary
                                          ? "is-main"
                                          : undefined
                                      }
                                    >
                                      <Star />
                                    </button>
                                  </form>
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </details>
                    )}

                    <form
                      action={deleteProductImage}
                      onSubmit={(event) => {
                        const confirmed = window.confirm(
                          "Delete this image permanently?",
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
                        aria-label="Delete image"
                        title="Delete image"
                        className="st-admin-existing-media-v2__delete"
                      >
                        <Trash2 />
                        <span>Delete image</span>
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

}
