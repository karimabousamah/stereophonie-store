"use client";

import { useRef, useState, type FormEvent, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Grip,
  ImageOff,
  ImagePlus,
  Save,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import { processImageBeforeUpload } from "@/lib/stereophonie-v3/images/process-upload-client";
import { validateProductImageFiles } from "@/lib/uploads/product-image-upload";

import type { DirectUploadSelectedImage } from "./direct-upload-client";

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
  disabled?: boolean;

  configurations?: {
    clientId: string;
    variant_name: string;
    attributes: Record<string, string>;
    fallbackLabel: string;
  }[];

  onImagesChange?: (images: DirectUploadSelectedImage[]) => void;
};

const maximumImagesPerConfiguration = 15;
const maximumFileSize = 10 * 1024 * 1024;

function isAcceptedImageFile(file: File) {
  return file.type.startsWith("image/");
}

export default function ImageManager({
  disabled = false,
  configurations = [],
  onImagesChange,
}: ImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  /*
   * Lock one pending upload batch to the configuration gallery from
   * which Add images was started.
   *
   * This prevents an administrator from selecting files for one
   * configuration and accidentally assigning them elsewhere before
   * the upload finishes.
   */
  const [pendingUploadConfigurationId, setPendingUploadConfigurationId] =
    useState("");

  /*
   * Image operations have their own authoritative state.
   *
   * This keeps the surrounding product editor mounted so unsaved technical
   * specs, pricing, stock and configuration edits are never destroyed by a
   * Main/order/usage operation.
   */
  const [managedImages, setManagedImages] = useState<ProductImage[]>([]);
  useEffect(() => {
    if (!onImagesChange) {
      return;
    }

    const prepared: DirectUploadSelectedImage[] = managedImages
      .map((image, index) => {
        const localImage = image as ProductImage & {
          __createFile?: File;
        };

        if (!localImage.__createFile) {
          return null;
        }

        return {
          file: localImage.__createFile,
          configurationIds: (
            image.product_image_variants ?? []
          ).map((assignment) => assignment.variant_id),
          altText: image.alt_text ?? "",
          isPrimary: index === 0,
          position: index,
        };
      })
      .filter(
        (
          image,
        ): image is DirectUploadSelectedImage =>
          image !== null,
      );

    onImagesChange(prepared);
  }, [managedImages, onImagesChange]);

  const [pendingImageOperation, setPendingImageOperation] = useState("");
  const [pendingMovementImageId, setPendingMovementImageId] = useState("");
  const [pendingMovementDirection, setPendingMovementDirection] = useState("");
  const [imageOperationErrorMessage, setImageOperationErrorMessage] =
    useState("");

  const [photoUsageSavedMessage, setPhotoUsageSavedMessage] = useState("");

  /*
   * One exact configuration at a time keeps the media manager simple:
   * choose configuration → upload → arrange → choose Main.
   */
  const [selectedGalleryConfigurationId, setSelectedGalleryConfigurationId] =
    useState(() => configurations[0]?.clientId ?? "");

  /*
   * When an administrator is arranging one exact configuration, keep that
   * configuration authoritative for the visual card order.
   *
   * This fixes the old mismatch where the label changed from e.g. 3 of 6
   * to 2 of 6 but the physical card stayed in its global product position.
   */
  const [visualConfigurationId, setVisualConfigurationId] = useState("");

  const imageDragHoldTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageDragSourceIdRef = useRef("");
  const imageDragActivatedRef = useRef(false);
  const imageDragStartPointRef = useRef({ x: 0, y: 0 });
  const imageDragPointerIdRef = useRef<number | null>(null);
  const imageDragTargetIdRef = useRef("");
  const imageDragDropModeRef =
    useRef<"swap" | "insert-before" | "insert-after" | "">("");
  const imageDragPreviewRef = useRef<HTMLDivElement | null>(null);
  const imageDragSourceCardRef = useRef<HTMLElement | null>(null);
  const imageDragPreviewOffsetRef = useRef({ x: 0, y: 0 });
  const imageDragPreviewSizeRef = useRef({ width: 0, height: 0 });

  /*
   * V8 stable insertion geometry.
   *
   * Slot rectangles are captured once when dragging activates.
   * Pointer movement never measures already-transformed cards.
   */
  const imageDragStableSlotRectsRef =
    useRef<Map<string, DOMRect>>(new Map());

  const imageDragStableOrderRef =
    useRef<string[]>([]);

  const imageDragVisualOrderKeyRef =
    useRef("");
  const imageDragPointerPositionRef = useRef({ x: 0, y: 0 });
  const imageDragAnimationFrameRef = useRef<number | null>(null);

  const [draggingImageId, setDraggingImageId] = useState("");
  const [dragTargetImageId, setDragTargetImageId] = useState("");
  const [imageDragDropMode, setImageDragDropMode] =
    useState<"swap" | "insert-before" | "insert-after" | "">("");
  const [imageDragPreview, setImageDragPreview] = useState<{
    imageUrl: string;
    width: number;
    height: number;
  } | null>(null);


  /*
   * Initial values are the configurations already stored in the
   * database. The configuration editor can then update this list
   * live through the custom event below.
   */
  const [liveConfigurations, setLiveConfigurations] = useState<
    LiveImageConfiguration[]
  >(() =>
    configurations.map((configuration, index) => ({
      id: configuration.clientId,
      variant_name: String(configuration.variant_name ?? "").trim(),
      fallbackLabel:
        String(configuration.fallbackLabel ?? "").trim() ||
        String(configuration.variant_name ?? "").trim() ||
        `Configuration ${index + 1}`,
      persisted: false,
    })),
  );

  useEffect(() => {
    setLiveConfigurations(
      configurations.map((configuration, index) => ({
        id: configuration.clientId,
        variant_name: String(configuration.variant_name ?? "").trim(),
        fallbackLabel:
          String(configuration.fallbackLabel ?? "").trim() ||
          String(configuration.variant_name ?? "").trim() ||
          `Configuration ${index + 1}`,
        persisted: false,
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
  const [isPreparingSelectedImages, setIsPreparingSelectedImages] =
    useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    currentFileName: string;
    percentage: number;
    currentIndex?: number;
    totalFiles?: number;
    isFinalizing?: boolean;
  } | null>(null);

  const [inlineUploadCards, setInlineUploadCards] = useState<
    {
      id: string;
      previewUrl: string;
      fileName: string;
      percentage: number;
      targetPercentage: number;
      status: "waiting" | "uploading" | "finalizing";
      realStatus: "waiting" | "uploading" | "finalizing";
    }[]
  >([]);

  /*
   * Keep the percentage shown inside an inline upload card visually alive
   * without allowing it to run ahead of real upload progress.
   *
   * Network progress remains authoritative in targetPercentage.
   * The visible percentage catches up one point at a time.
   */
  useEffect(() => {
    if (inlineUploadCards.length === 0) {
      return;
    }

    const hasPendingVisualProgress = inlineUploadCards.some(
      (card) => card.percentage < card.targetPercentage,
    );

    if (!hasPendingVisualProgress) {
      return;
    }

    const timer = window.setTimeout(() => {
      setInlineUploadCards((current) =>
        current.map((card) => {
          if (card.percentage >= card.targetPercentage) {
            return card;
          }

          const nextPercentage = Math.min(
            card.percentage + 1,
            card.targetPercentage,
          );

          return {
            ...card,
            percentage: nextPercentage,
            status:
              nextPercentage >= 100 &&
              card.realStatus === "finalizing"
                ? "finalizing"
                : card.realStatus === "waiting"
                  ? "waiting"
                  : "uploading",
          };
        }),
      );
    }, 22);

    return () => {
      window.clearTimeout(timer);
    };
  }, [inlineUploadCards]);

  /*
   * Product media is grouped and ordered by configuration.
   *
   * `variant_position` is the real customer-facing image
   * order inside one configuration.
   *
   * The old global `position` remains only as a stable fallback.
   */
  const configurationPosition = new Map(
    configurations.map((configuration, index) => [
      configuration.clientId,
      index,
    ]),
  );

  const configurationName = new Map(
    configurations.map((configuration) => [
      configuration.clientId,
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
  function clearImageDragHoldTimer() {
    if (imageDragHoldTimerRef.current) {
      clearTimeout(imageDragHoldTimerRef.current);
      imageDragHoldTimerRef.current = null;
    }
  }

  function resetImageDrag() {
    clearImageDragHoldTimer();

    if (imageDragAnimationFrameRef.current !== null) {
      cancelAnimationFrame(imageDragAnimationFrameRef.current);
      imageDragAnimationFrameRef.current = null;
    }
    imageDragSourceIdRef.current = "";
    imageDragSourceCardRef.current = null;

    document
      .querySelectorAll<HTMLElement>(
        "[data-admin-edit-product-reorder-image]",
      )
      .forEach((card) => {
        card.style.removeProperty("--st-admin-drag-reflow-x");
        card.style.removeProperty("--st-admin-drag-reflow-y");
        card.classList.remove("is-drag-reflowing");
      });

    imageDragStableSlotRectsRef.current.clear();
    imageDragStableOrderRef.current = [];
    imageDragVisualOrderKeyRef.current = "";
    imageDragActivatedRef.current = false;
    imageDragPointerIdRef.current = null;
    imageDragTargetIdRef.current = "";
    imageDragDropModeRef.current = "";
    setDraggingImageId("");
    setDragTargetImageId("");
    setImageDragDropMode("");
    setImageDragPreview(null);
  }

  function imageReorderDomain(
    currentImages: ProductImage[],
    imageId: string,
  ) {
    const sourceImage = currentImages.find(
      (candidate) => candidate.id === imageId,
    );

    if (!sourceImage) {
      return null;
    }

    const selectedAssignment = selectedGalleryConfigurationId
      ? sourceImage.product_image_variants?.find(
          (assignment) =>
            assignment.variant_id === selectedGalleryConfigurationId,
        )
      : undefined;

    if (selectedAssignment && selectedGalleryConfigurationId) {
      const configurationImages = currentImages
        .map((image) => ({
          image,
          assignment: image.product_image_variants?.find(
            (assignment) =>
              assignment.variant_id === selectedGalleryConfigurationId,
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
        .sort((first, second) => {
          const difference =
            Number(first.assignment.position ?? 0) -
            Number(second.assignment.position ?? 0);

          if (difference !== 0) {
            return difference;
          }

          return first.image.id.localeCompare(second.image.id);
        })
        .map((item) => item.image);

      return {
        variantId: selectedGalleryConfigurationId,
        images: configurationImages,
      };
    }

    if ((sourceImage.product_image_variants ?? []).length !== 0) {
      return null;
    }

    const sharedImages = currentImages
      .filter(
        (image) =>
          (image.product_image_variants ?? []).length === 0,
      )
      .sort((first, second) => {
        const difference =
          Number(first.position ?? 0) -
          Number(second.position ?? 0);

        if (difference !== 0) {
          return difference;
        }

        return first.id.localeCompare(second.id);
      });

    return {
      variantId: "",
      images: sharedImages,
    };
  }

  async function commitSavedImageExactOrder(
    sourceImageId: string,
    nextOrderedImageIds: string[],
  ) {
    if (
      !sourceImageId ||
      nextOrderedImageIds.length === 0 ||
      pendingImageOperation
    ) {
      return;
    }

    const sourceDomain = imageReorderDomain(
      managedImages,
      sourceImageId,
    );

    if (!sourceDomain) {
      return;
    }

    const authoritativeImageIds =
      sourceDomain.images.map((image) => image.id);

    if (
      authoritativeImageIds.length !== nextOrderedImageIds.length ||
      authoritativeImageIds.some(
        (imageId) => !nextOrderedImageIds.includes(imageId),
      ) ||
      new Set(nextOrderedImageIds).size !== nextOrderedImageIds.length
    ) {
      return;
    }

    const nextPositionByImageId = new Map(
      nextOrderedImageIds.map(
        (imageId, index) => [imageId, index],
      ),
    );

    if (sourceDomain.variantId) {
      setVisualConfigurationId(sourceDomain.variantId);

      setManagedImages((currentImages) =>
        currentImages.map((image) => ({
          ...image,
          product_image_variants:
            image.product_image_variants?.map(
              (assignment) =>
                assignment.variant_id === sourceDomain.variantId &&
                nextPositionByImageId.has(image.id)
                  ? {
                      ...assignment,
                      position:
                        nextPositionByImageId.get(image.id) ??
                        assignment.position,
                      is_primary:
                        nextPositionByImageId.get(image.id) === 0,
                    }
                  : assignment,
            ),
        })),
      );
    } else {
      setManagedImages((currentImages) =>
        currentImages.map((image) =>
          nextPositionByImageId.has(image.id)
            ? {
                ...image,
                position:
                  nextPositionByImageId.get(image.id) ??
                  image.position,
                is_primary:
                  nextPositionByImageId.get(image.id) === 0,
              }
            : image,
        ),
      );
    }
  }

  function buildSavedImageDropOrder(
    sourceImageId: string,
    targetImageId: string,
    mode: "swap" | "insert-before" | "insert-after",
  ) {
    const sourceDomain = imageReorderDomain(
      managedImages,
      sourceImageId,
    );

    const targetDomain = imageReorderDomain(
      managedImages,
      targetImageId,
    );

    if (
      !sourceDomain ||
      !targetDomain ||
      sourceDomain.variantId !== targetDomain.variantId
    ) {
      return null;
    }

    const orderedImageIds =
      sourceDomain.images.map((image) => image.id);

    const sourceIndex = orderedImageIds.indexOf(sourceImageId);
    const targetIndex = orderedImageIds.indexOf(targetImageId);

    if (
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex === targetIndex
    ) {
      return null;
    }

    if (mode === "swap") {
      const nextOrderedImageIds = [...orderedImageIds];

      nextOrderedImageIds[sourceIndex] = targetImageId;
      nextOrderedImageIds[targetIndex] = sourceImageId;

      return nextOrderedImageIds;
    }

    const nextOrderedImageIds = [...orderedImageIds];

    nextOrderedImageIds.splice(sourceIndex, 1);

    const remainingTargetIndex =
      nextOrderedImageIds.indexOf(targetImageId);

    if (remainingTargetIndex < 0) {
      return null;
    }

    const insertionIndex =
      mode === "insert-after"
        ? remainingTargetIndex + 1
        : remainingTargetIndex;

    nextOrderedImageIds.splice(
      insertionIndex,
      0,
      sourceImageId,
    );

    return nextOrderedImageIds;
  }

  function setSavedImageDragPreviewNode(
    node: HTMLDivElement | null,
  ) {
    imageDragPreviewRef.current = node;

    if (!node) {
      return;
    }

    node.replaceChildren();

    const sourceCard = imageDragSourceCardRef.current;

    if (sourceCard) {
      const clone = sourceCard.cloneNode(true) as HTMLElement;

      clone.classList.remove(
        "is-dragging",
        "is-drag-target",
        "is-drag-swap",
        "is-drag-insert-before",
        "is-drag-insert-after",
      );

      clone.classList.add("st-admin-image-drag-preview__card");

      clone.removeAttribute(
        "data-admin-edit-product-reorder-image",
      );

      clone
        .querySelectorAll<HTMLElement>(
          "button, input, select, textarea, summary, a, label, form",
        )
        .forEach((element) => {
          element.style.pointerEvents = "none";
        });

      clone
        .querySelectorAll<HTMLDetailsElement>("details")
        .forEach((details) => {
          details.open = false;
        });

      node.appendChild(clone);
    }

    const pointer = imageDragPointerPositionRef.current;
    const offset = imageDragPreviewOffsetRef.current;

    const left = pointer.x - offset.x;
    const top = pointer.y - offset.y;

    node.style.transform =
      `translate3d(${left}px, ${top}px, 0) rotate(-0.18deg) scale(1.012)`;
  }

  function handleSavedImagePointerDown(
    event: React.PointerEvent<HTMLElement>,
    imageId: string,
  ) {
    const target = event.target;

    if (
      event.button !== 0 ||
      pendingImageOperation ||
      (target instanceof Element &&
        Boolean(
          target.closest(
            "button, a, input, select, textarea, summary, form, label",
          ),
        ))
    ) {
      return;
    }

    resetImageDrag();

    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    imageDragSourceIdRef.current = imageId;
    imageDragSourceCardRef.current = card;
    imageDragPointerIdRef.current = event.pointerId;

    imageDragStartPointRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    imageDragPointerPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    imageDragPreviewOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    imageDragPreviewSizeRef.current = {
      width: rect.width,
      height: rect.height,
    };

    imageDragActivatedRef.current = true;
    imageDragTargetIdRef.current = imageId;

    setDraggingImageId(imageId);
    setDragTargetImageId(imageId);

    /*
     * Capture the untouched physical grid exactly once.
     *
     * These rectangles remain authoritative for the entire drag.
     * This prevents animated transforms from feeding back into
     * pointer hit testing and eliminates V7 layout jitter.
     */
    const sourceDomain = imageReorderDomain(
      managedImages,
      imageId,
    );

    const stableRects = new Map<string, DOMRect>();
    const stableOrder: string[] = [];

    if (sourceDomain) {
      for (const domainImage of sourceDomain.images) {
        const domainCard =
          document.querySelector<HTMLElement>(
            `[data-admin-edit-product-reorder-image="${domainImage.id}"]`,
          );

        if (!domainCard) {
          continue;
        }

        stableRects.set(
          domainImage.id,
          domainCard.getBoundingClientRect(),
        );

        stableOrder.push(domainImage.id);
      }
    }

    imageDragStableSlotRectsRef.current = stableRects;
    imageDragStableOrderRef.current = stableOrder;
    imageDragVisualOrderKeyRef.current = "";

    imageDragPointerPositionRef.current = {
      x: imageDragStartPointRef.current.x,
      y: imageDragStartPointRef.current.y,
    };

    setImageDragPreview({
      imageUrl: "",
      width: rect.width,
      height: rect.height,
    });

    try {
      card.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
  }

  function handleSavedImagePointerMove(
    event: React.PointerEvent<HTMLElement>,
  ) {
    const sourceImageId =
      imageDragSourceIdRef.current;

    if (!sourceImageId) {
      return;
    }

    if (!imageDragActivatedRef.current) {
      const horizontalDistance = Math.abs(
        event.clientX -
          imageDragStartPointRef.current.x,
      );

      const verticalDistance = Math.abs(
        event.clientY -
          imageDragStartPointRef.current.y,
      );

      if (
        horizontalDistance > 8 ||
        verticalDistance > 8
      ) {
        resetImageDrag();
      }

      return;
    }

    event.preventDefault();

    /*
     * V10 FRAME-SYNCHRONIZED SORTABLE ENGINE
     * ----------------------------------------------------------
     * Pointer events never manipulate gallery cards directly.
     *
     * They only publish the newest pointer coordinates.
     * One requestAnimationFrame then:
     *
     * 1. moves the floating full-card preview,
     * 2. resolves the logical Swap / insertion destination,
     * 3. changes the gallery only when that destination changed.
     *
     * This guarantees at most one visual drag calculation per
     * rendered browser frame.
     */
    imageDragPointerPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    if (imageDragAnimationFrameRef.current !== null) {
      return;
    }

    imageDragAnimationFrameRef.current =
      requestAnimationFrame(() => {
        imageDragAnimationFrameRef.current = null;

        if (!imageDragActivatedRef.current) {
          return;
        }

        const activeSourceImageId =
          imageDragSourceIdRef.current;

        if (!activeSourceImageId) {
          return;
        }

        const pointer =
          imageDragPointerPositionRef.current;

        /*
         * Floating card movement.
         *
         * This remains completely independent from React and
         * from gallery-card movement.
         */
        const preview =
          imageDragPreviewRef.current;

        if (preview) {
          const offset =
            imageDragPreviewOffsetRef.current;

          const left =
            pointer.x - offset.x;

          const top =
            pointer.y - offset.y;

          preview.style.transform =
            `translate3d(${left}px, ${top}px, 0) rotate(-0.18deg) scale(1.012)`;
        }

        const sourceDomain = imageReorderDomain(
          managedImages,
          activeSourceImageId,
        );

        const stableRects =
          imageDragStableSlotRectsRef.current;

        const stableOrder =
          imageDragStableOrderRef.current;

        const cards = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-admin-edit-product-reorder-image]",
          ),
        );

        function clearVisualReflow() {
          for (const card of cards) {
            card.style.removeProperty(
              "--st-admin-drag-reflow-x",
            );

            card.style.removeProperty(
              "--st-admin-drag-reflow-y",
            );

            card.classList.remove(
              "is-drag-reflowing",
            );
          }
        }

        function clearLogicalTarget() {
          if (
            !imageDragTargetIdRef.current &&
            !imageDragDropModeRef.current &&
            !imageDragVisualOrderKeyRef.current
          ) {
            return;
          }

          imageDragTargetIdRef.current = "";
          imageDragDropModeRef.current = "";
          imageDragVisualOrderKeyRef.current = "";

          clearVisualReflow();

          setDragTargetImageId("");
          setImageDragDropMode("");
        }

        if (
          !sourceDomain ||
          stableOrder.length < 2 ||
          stableRects.size < 2
        ) {
          clearLogicalTarget();
          return;
        }

        /*
         * V11 EXACT DROP INTENT
         * ----------------------------------------------------------
         * Swap and insertion are now two different physical targets.
         *
         * SWAP:
         * The pointer must deliberately occupy the inner body of a
         * real photo card.
         *
         * INSERT:
         * Every boundary between ordered slots is its own destination.
         * The pointer therefore selects a gap directly instead of first
         * selecting a card and then guessing which side was intended.
         *
         * All geometry remains frozen from pickup, so animated cards
         * can never move the targets underneath the pointer.
         */

        type ExactDropDestination = {
          targetImageId: string;
          mode:
            | "swap"
            | "insert-before"
            | "insert-after";
          distance: number;
          priority: number;
        };

        const destinations: ExactDropDestination[] = [];

        const sourceIndex =
          stableOrder.indexOf(activeSourceImageId);

        const sourceRect =
          stableRects.get(activeSourceImageId);

        /*
         * SWAP DESTINATIONS
         * ----------------------------------------------------------
         * A generous but inset rectangle in the middle of every other
         * card is an explicit Swap destination.
         *
         * The inset leaves the physical edges available to the gap
         * engine, so Swap and Insert no longer fight over the same
         * pointer position.
         */
        for (const imageId of stableOrder) {
          if (imageId === activeSourceImageId) {
            continue;
          }

          const rect = stableRects.get(imageId);

          if (!rect) {
            continue;
          }

          const horizontalInset =
            Math.min(
              Math.max(rect.width * 0.18, 22),
              rect.width * 0.28,
            );

          const verticalInset =
            Math.min(
              Math.max(rect.height * 0.08, 12),
              rect.height * 0.16,
            );

          const swapLeft =
            rect.left + horizontalInset;

          const swapRight =
            rect.right - horizontalInset;

          const swapTop =
            rect.top + verticalInset;

          const swapBottom =
            rect.bottom - verticalInset;

          const insideSwap =
            pointer.x >= swapLeft &&
            pointer.x <= swapRight &&
            pointer.y >= swapTop &&
            pointer.y <= swapBottom;

          if (!insideSwap) {
            continue;
          }

          const centerX =
            rect.left + rect.width / 2;

          const centerY =
            rect.top + rect.height / 2;

          const normalizedX =
            Math.abs(pointer.x - centerX) /
            Math.max(rect.width / 2, 1);

          const normalizedY =
            Math.abs(pointer.y - centerY) /
            Math.max(rect.height / 2, 1);

          destinations.push({
            targetImageId: imageId,
            mode: "swap",
            distance:
              Math.hypot(normalizedX, normalizedY),
            priority: 0,
          });
        }

        /*
         * INSERT DESTINATIONS
         * ----------------------------------------------------------
         * Build a target for each exact boundary in the stable order.
         *
         * A boundary is represented by:
         * - after the card on its left, or
         * - before the card on its right.
         *
         * We choose the representation that remains valid after the
         * dragged source is removed from the order.
         */
        type GapDestination = {
          targetImageId: string;
          mode: "insert-before" | "insert-after";
          x: number;
          y: number;
          width: number;
          height: number;
        };

        const gaps: GapDestination[] = [];

        for (
          let boundaryIndex = 1;
          boundaryIndex < stableOrder.length;
          boundaryIndex += 1
        ) {
          const leftImageId =
            stableOrder[boundaryIndex - 1];

          const rightImageId =
            stableOrder[boundaryIndex];

          const leftRect =
            stableRects.get(leftImageId);

          const rightRect =
            stableRects.get(rightImageId);

          if (!leftRect || !rightRect) {
            continue;
          }

          const sameRow =
            Math.abs(
              (leftRect.top + leftRect.height / 2) -
              (rightRect.top + rightRect.height / 2),
            ) <
            Math.max(
              20,
              Math.min(
                leftRect.height,
                rightRect.height,
              ) * 0.45,
            );

          let gapX: number;
          let gapY: number;
          let gapWidth: number;
          let gapHeight: number;

          if (sameRow) {
            gapX =
              (leftRect.right + rightRect.left) / 2;

            gapY =
              (
                Math.max(leftRect.top, rightRect.top) +
                Math.min(leftRect.bottom, rightRect.bottom)
              ) / 2;

            gapWidth =
              Math.max(
                34,
                Math.min(
                  76,
                  Math.abs(
                    rightRect.left - leftRect.right,
                  ) + 42,
                ),
              );

            gapHeight =
              Math.max(
                70,
                Math.min(
                  leftRect.height,
                  rightRect.height,
                ) * 0.82,
              );
          } else {
            /*
             * Row wrap boundary.
             *
             * Treat the end of the previous row and beginning of the
             * next row as one logical insertion destination centered
             * between those two stable slots.
             */
            gapX =
              (leftRect.right + rightRect.left) / 2;

            gapY =
              (leftRect.bottom + rightRect.top) / 2;

            gapWidth =
              Math.max(
                80,
                Math.min(
                  leftRect.width,
                  rightRect.width,
                ) * 0.72,
              );

            gapHeight =
              Math.max(
                36,
                Math.abs(
                  rightRect.top - leftRect.bottom,
                ) + 30,
              );
          }

          /*
           * If the source itself borders this gap, target the card on
           * the opposite side. This keeps buildSavedImageDropOrder
           * semantically correct after the source is removed.
           */
          let targetImageId: string;
          let mode:
            | "insert-before"
            | "insert-after";

          if (
            leftImageId === activeSourceImageId &&
            rightImageId !== activeSourceImageId
          ) {
            targetImageId = rightImageId;
            mode = "insert-before";
          } else if (
            rightImageId === activeSourceImageId &&
            leftImageId !== activeSourceImageId
          ) {
            targetImageId = leftImageId;
            mode = "insert-after";
          } else {
            targetImageId = rightImageId;
            mode = "insert-before";
          }

          /*
           * Ignore the source's original boundary when dropping there
           * would produce no actual order change.
           */
          const previewOrder =
            buildSavedImageDropOrder(
              activeSourceImageId,
              targetImageId,
              mode,
            );

          if (
            !previewOrder ||
            previewOrder.every(
              (imageId, index) =>
                imageId === stableOrder[index],
            )
          ) {
            continue;
          }

          gaps.push({
            targetImageId,
            mode,
            x: gapX,
            y: gapY,
            width: gapWidth,
            height: gapHeight,
          });
        }

        /*
         * Also expose the outer beginning/end of the gallery as exact
         * insertion destinations.
         */
        const firstNonSourceImageId =
          stableOrder.find(
            (imageId) =>
              imageId !== activeSourceImageId,
          );

        const lastNonSourceImageId =
          [...stableOrder]
            .reverse()
            .find(
              (imageId) =>
                imageId !== activeSourceImageId,
            );

        if (firstNonSourceImageId) {
          const rect =
            stableRects.get(firstNonSourceImageId);

          if (rect) {
            const previewOrder =
              buildSavedImageDropOrder(
                activeSourceImageId,
                firstNonSourceImageId,
                "insert-before",
              );

            if (
              previewOrder &&
              !previewOrder.every(
                (imageId, index) =>
                  imageId === stableOrder[index],
              )
            ) {
              gaps.push({
                targetImageId:
                  firstNonSourceImageId,
                mode: "insert-before",
                x: rect.left - 18,
                y: rect.top + rect.height / 2,
                width: 52,
                height: rect.height * 0.78,
              });
            }
          }
        }

        if (lastNonSourceImageId) {
          const rect =
            stableRects.get(lastNonSourceImageId);

          if (rect) {
            const previewOrder =
              buildSavedImageDropOrder(
                activeSourceImageId,
                lastNonSourceImageId,
                "insert-after",
              );

            if (
              previewOrder &&
              !previewOrder.every(
                (imageId, index) =>
                  imageId === stableOrder[index],
              )
            ) {
              gaps.push({
                targetImageId:
                  lastNonSourceImageId,
                mode: "insert-after",
                x: rect.right + 18,
                y: rect.top + rect.height / 2,
                width: 52,
                height: rect.height * 0.78,
              });
            }
          }
        }

        /*
         * Gap hit testing uses normalized distance.
         *
         * A pointer inside an insertion corridor is an explicit insert
         * request. It does not need to pass through a card-edge mode.
         */
        for (const gap of gaps) {
          const normalizedX =
            Math.abs(pointer.x - gap.x) /
            Math.max(gap.width / 2, 1);

          const normalizedY =
            Math.abs(pointer.y - gap.y) /
            Math.max(gap.height / 2, 1);

          const insideGap =
            normalizedX <= 1 &&
            normalizedY <= 1;

          if (!insideGap) {
            continue;
          }

          destinations.push({
            targetImageId:
              gap.targetImageId,
            mode: gap.mode,
            distance:
              Math.hypot(
                normalizedX,
                normalizedY,
              ),
            priority: 1,
          });
        }

        /*
         * Explicit intent wins.
         *
         * - Deep inside a card: Swap.
         * - Inside a physical gap corridor: Insert.
         *
         * The two regions intentionally overlap as little as possible.
         * If they do overlap at a corner, the destination whose center
         * is closer in normalized space wins.
         */
        let destination:
          | ExactDropDestination
          | null = null;

        for (const candidate of destinations) {
          if (
            !destination ||
            candidate.distance <
              destination.distance - 0.04 ||
            (
              Math.abs(
                candidate.distance -
                destination.distance,
              ) <= 0.04 &&
              candidate.priority <
                destination.priority
            )
          ) {
            destination = candidate;
          }
        }

        /*
         * When the pointer is between all explicit targets, preserve
         * the current destination instead of guessing a new one.
         *
         * This is critical: tiny movements through neutral pixels do
         * not cause the system to flicker between Swap and Insert.
         */
        if (!destination) {
          return;
        }

        const targetImageId =
          destination.targetImageId;

        const mode =
          destination.mode;

        /*
         * A small destination lock removes last-pixel ambiguity.
         *
         * If the pointer is still inside the currently selected exact
         * destination, keep it. A different destination must become a
         * genuinely better geometric match before ownership changes.
         */
        const previousTarget =
          imageDragTargetIdRef.current;

        const previousMode =
          imageDragDropModeRef.current;

        if (
          previousTarget &&
          previousMode &&
          (
            previousTarget !== targetImageId ||
            previousMode !== mode
          )
        ) {
          let previousDistance =
            Number.POSITIVE_INFINITY;

          const previousDestination =
            destinations.find(
              (candidate) =>
                candidate.targetImageId ===
                  previousTarget &&
                candidate.mode === previousMode,
            );

          if (previousDestination) {
            previousDistance =
              previousDestination.distance;
          }

          if (
            Number.isFinite(previousDistance) &&
            destination.distance >
              previousDistance - 0.12
          ) {
            return;
          }
        }

        /*
         * Source index is intentionally read above while geometry is
         * immutable. Keep the variable live for debugging and future
         * row-boundary refinement without affecting runtime behavior.
         */
        void sourceIndex;
        void sourceRect;

        const visualOrderKey =
          `${targetImageId}:${mode}`;

        /*
         * This is the main V10 performance boundary.
         *
         * If the logical destination did not change, React and
         * every gallery card are left completely untouched.
         */
        if (
          imageDragVisualOrderKeyRef.current ===
          visualOrderKey
        ) {
          return;
        }

        imageDragTargetIdRef.current =
          targetImageId;

        imageDragDropModeRef.current =
          mode;

        imageDragVisualOrderKeyRef.current =
          visualOrderKey;

        /*
         * SWAP
         * ------------------------------------------------------
         * The physical grid stays absolutely stationary.
         */
        if (mode === "swap") {
          clearVisualReflow();

          setDragTargetImageId(targetImageId);
          setImageDragDropMode("swap");
          return;
        }

        /*
         * INSERT
         * ------------------------------------------------------
         * Calculate exactly where every non-source card would be
         * after drop.
         *
         * Only cards whose physical slot changes receive a GPU
         * transform. The dragged source remains represented by
         * the floating V6 card and its original placeholder.
         */
        const nextVisualOrder =
          buildSavedImageDropOrder(
            activeSourceImageId,
            targetImageId,
            mode,
          );

        if (
          !nextVisualOrder ||
          nextVisualOrder.length !==
            stableOrder.length
        ) {
          clearVisualReflow();

          setDragTargetImageId(targetImageId);
          setImageDragDropMode(mode);
          return;
        }

        const nextTransformByImageId =
          new Map<
            string,
            { x: number; y: number }
          >();

        for (
          let futureIndex = 0;
          futureIndex < nextVisualOrder.length;
          futureIndex += 1
        ) {
          const imageId =
            nextVisualOrder[futureIndex];

          if (
            imageId === activeSourceImageId
          ) {
            continue;
          }

          const currentRect =
            stableRects.get(imageId);

          const futureSlotImageId =
            stableOrder[futureIndex];

          const futureRect =
            stableRects.get(
              futureSlotImageId,
            );

          if (
            !currentRect ||
            !futureRect
          ) {
            continue;
          }

          const deltaX =
            futureRect.left -
            currentRect.left;

          const deltaY =
            futureRect.top -
            currentRect.top;

          if (
            Math.abs(deltaX) < 0.5 &&
            Math.abs(deltaY) < 0.5
          ) {
            continue;
          }

          nextTransformByImageId.set(
            imageId,
            {
              x: deltaX,
              y: deltaY,
            },
          );
        }

        /*
         * Apply the complete destination in one DOM write phase.
         *
         * Cards that are no longer displaced return smoothly to
         * their untouched slot. Cards entering the insertion flow
         * glide to the new slot.
         */
        for (const card of cards) {
          const imageId =
            card.dataset
              .adminEditProductReorderImage ?? "";

          const transform =
            nextTransformByImageId.get(imageId);

          if (!transform) {
            if (
              card.classList.contains(
                "is-drag-reflowing",
              )
            ) {
              card.style.setProperty(
                "--st-admin-drag-reflow-x",
                "0px",
              );

              card.style.setProperty(
                "--st-admin-drag-reflow-y",
                "0px",
              );

              card.classList.remove(
                "is-drag-reflowing",
              );
            }

            continue;
          }

          card.style.setProperty(
            "--st-admin-drag-reflow-x",
            `${transform.x}px`,
          );

          card.style.setProperty(
            "--st-admin-drag-reflow-y",
            `${transform.y}px`,
          );

          card.classList.add(
            "is-drag-reflowing",
          );
        }

        setDragTargetImageId(targetImageId);
        setImageDragDropMode(mode);
      });
  }

  function handleSavedImagePointerUp(
    event: React.PointerEvent<HTMLElement>,
  ) {
    const sourceImageId =
      imageDragSourceIdRef.current;

    const targetImageId =
      imageDragTargetIdRef.current;

    const dropMode =
      imageDragDropModeRef.current;

    const wasActivated =
      imageDragActivatedRef.current;

    try {
      if (
        event.currentTarget.hasPointerCapture(
          event.pointerId,
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      }
    } catch {
      // Pointer capture is optional.
    }

    let nextOrderedImageIds: string[] | null = null;

    if (
      wasActivated &&
      sourceImageId &&
      targetImageId &&
      sourceImageId !== targetImageId &&
      dropMode
    ) {
      nextOrderedImageIds =
        buildSavedImageDropOrder(
          sourceImageId,
          targetImageId,
          dropMode,
        );
    }

    resetImageDrag();

    if (nextOrderedImageIds) {
      void commitSavedImageExactOrder(
        sourceImageId,
        nextOrderedImageIds,
      );
    }
  }

  function handleSavedImagePointerCancel(
    event: React.PointerEvent<HTMLElement>,
  ) {
    try {
      if (
        event.currentTarget.hasPointerCapture(
          event.pointerId,
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      }
    } catch {
      // Pointer capture is optional.
    }

    resetImageDrag();
  }

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

  function deleteLocalImage(imageId: string) {
    if (disabled || pendingImageOperation) {
      return;
    }

    setManagedImages((current) =>
      current.filter((image) => image.id !== imageId),
    );
  }

  function setLocalPrimaryImage(
    imageId: string,
    variantId = "",
  ) {
    if (disabled || pendingImageOperation) {
      return;
    }

    setManagedImages((current) =>
      current.map((image) => ({
        ...image,
        is_primary: variantId
          ? image.is_primary
          : image.id === imageId,
        product_image_variants:
          image.product_image_variants?.map((assignment) =>
            assignment.variant_id === variantId
              ? {
                  ...assignment,
                  is_primary: image.id === imageId,
                }
              : assignment,
          ),
      })),
    );
  }

  useEffect(() => {
    const selector =
      '[data-admin-add-product-usage-details="true"]';
    const animationDuration = 240;

    function panelFor(details: HTMLDetailsElement) {
      return details.querySelector<HTMLElement>(
        ":scope > .st-admin-media-item__usage-panel",
      );
    }

    function finishOpen(details: HTMLDetailsElement) {
      details.classList.remove("is-usage-opening");
      details.classList.add("is-usage-open");
      details.dataset.usageOpen = "true";
    }

    function openDetailsSmoothly(details: HTMLDetailsElement) {
      if (
        details.classList.contains("is-usage-open") ||
        details.classList.contains("is-usage-opening")
      ) {
        return;
      }

      details.classList.remove("is-usage-closing");
      details.open = true;

      const panel = panelFor(details);

      if (!panel) {
        finishOpen(details);
        return;
      }

      details.classList.add("is-usage-opening");

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          panel.getBoundingClientRect();

          window.setTimeout(() => {
            if (!details.classList.contains("is-usage-opening")) {
              return;
            }

            finishOpen(details);
          }, animationDuration);
        });
      });
    }

    function closeDetailsSmoothly(details: HTMLDetailsElement) {
      if (
        !details.open ||
        details.classList.contains("is-usage-closing")
      ) {
        return;
      }

      details.classList.remove(
        "is-usage-opening",
        "is-usage-open",
      );
      details.classList.add("is-usage-closing");

      window.setTimeout(() => {
        if (!details.classList.contains("is-usage-closing")) {
          return;
        }

        details.open = false;
        details.classList.remove("is-usage-closing");
        delete details.dataset.usageOpen;
      }, animationDuration);
    }

    function handleUsageSummaryClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const summary = target.closest("summary");

      if (!summary) {
        return;
      }

      const details = summary.closest<HTMLDetailsElement>(selector);

      if (!details) {
        return;
      }

      event.preventDefault();

      if (
        details.open &&
        !details.classList.contains("is-usage-closing")
      ) {
        closeDetailsSmoothly(details);
        return;
      }

      document
        .querySelectorAll<HTMLDetailsElement>(`${selector}[open]`)
        .forEach((candidate) => {
          if (candidate !== details) {
            closeDetailsSmoothly(candidate);
          }
        });

      openDetailsSmoothly(details);
    }

    function handleUsageOutsidePointer(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      document
        .querySelectorAll<HTMLDetailsElement>(`${selector}[open]`)
        .forEach((details) => {
          if (!details.contains(target)) {
            closeDetailsSmoothly(details);
          }
        });
    }

    document.addEventListener(
      "click",
      handleUsageSummaryClick,
      true,
    );

    document.addEventListener(
      "pointerdown",
      handleUsageOutsidePointer,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        handleUsageSummaryClick,
        true,
      );

      document.removeEventListener(
        "pointerdown",
        handleUsageOutsidePointer,
        true,
      );
    };
  }, []);

  function updateLocalImageUsage(
    imageId: string,
    selectedIds: string[],
  ) {
    if (disabled || pendingImageOperation) {
      return;
    }

    const normalizedIds = Array.from(
      new Set(
        selectedIds
          .map((value) => String(value ?? "").trim())
          .filter(Boolean),
      ),
    );

    setManagedImages((current) =>
      current.map((image) => {
        if (image.id !== imageId) {
          return image;
        }

        if (normalizedIds.length === 0) {
          return {
            ...image,
            product_image_variants: [],
          };
        }

        return {
          ...image,
          product_image_variants: normalizedIds.map(
            (variantId, index) => ({
              variant_id: variantId,
              position: index,
              is_primary: index === 0,
            }),
          ),
        };
      }),
    );

    setPhotoUsageSavedMessage("Photo usage saved.");

    window.setTimeout(() => {
      setPhotoUsageSavedMessage("");
    }, 1800);
  }

  function moveLocalImage(
    imageId: string,
    direction: "left" | "right",
    variantId = "",
  ) {
    if (disabled || pendingImageOperation) {
      return;
    }

    const sourceDomain = imageReorderDomain(
      managedImages,
      imageId,
    );

    if (!sourceDomain) {
      return;
    }

    if (
      String(sourceDomain.variantId ?? "") !==
      String(variantId ?? "")
    ) {
      return;
    }

    const currentIndex = sourceDomain.images.findIndex(
      (image) => image.id === imageId,
    );

    if (currentIndex < 0) {
      return;
    }

    const targetIndex =
      direction === "left"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= sourceDomain.images.length
    ) {
      return;
    }

    const nextOrderedImageIds =
      sourceDomain.images.map((image) => image.id);

    const temporary =
      nextOrderedImageIds[currentIndex];

    nextOrderedImageIds[currentIndex] =
      nextOrderedImageIds[targetIndex];

    nextOrderedImageIds[targetIndex] =
      temporary;

    void commitSavedImageExactOrder(
      imageId,
      nextOrderedImageIds,
    );
  }

  function handleClearAllPhotographs() {
    if (disabled || pendingImageOperation) {
      return;
    }

    setManagedImages([]);
    setSelectedFiles([]);
    setSelectedVariantIds([]);
    setPreviewUrls([]);
    setInlineUploadCards([]);
    setUploadError("");
    setPhotoUsageSavedMessage("");
  }

  function clearSelectedFiles() {
    previewUrls.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });

    setSelectedFiles([]);
    setSelectedVariantIds([]);
    setPendingUploadConfigurationId("");
    setPreviewUrls([]);
    setUploadProgress(null);
    setUploadError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeSelectedFile(index: number) {
    if (isUploading || isPreparingSelectedImages) {
      return;
    }

    const previewUrl = previewUrls[index];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFiles((current) =>
      current.filter((_, candidateIndex) => candidateIndex !== index),
    );

    setSelectedVariantIds((current) =>
      current.filter((_, candidateIndex) => candidateIndex !== index),
    );

    setPreviewUrls((current) =>
      current.filter((_, candidateIndex) => candidateIndex !== index),
    );

    if (selectedFiles.length <= 1 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadPreparedImages(
    files: File[],
    variantIdsByFile: string[][],
    inlineBatch?: {
      ids: string[];
      previewUrls: string[];
    },
  ) {
    setUploadError("");

    if (files.length === 0) {
      setUploadError("Select at least one image.");
      return;
    }

    try {
      validateProductImageFiles(files, orderedImages.length);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "The selected images could not be processed.",
      );
      return;
    }

    const existingCount = managedImages.length;

    const nextImages: ProductImage[] = files.map((file, index) => {
      const configurationIds = Array.from(
        new Set(
          (variantIdsByFile[index] ?? [])
            .map((variantId) => String(variantId ?? "").trim())
            .filter(Boolean),
        ),
      );

      const previewUrl =
        inlineBatch?.previewUrls[index] ?? URL.createObjectURL(file);

      return {
        id: `create-image-${crypto.randomUUID()}`,
        image_url: previewUrl,
        storage_path: null,
        alt_text: "",
        position: existingCount + index,
        is_primary: existingCount === 0 && index === 0,
        variant_name: null,
        variant_id: null,
        variant_position: existingCount + index,
        is_variant_primary: existingCount === 0 && index === 0,
        product_image_variants: configurationIds.map(
          (variantId, assignmentIndex) => ({
            variant_id: variantId,
            position: existingCount + index,
            is_primary:
              existingCount === 0 &&
              index === 0 &&
              assignmentIndex === 0,
          }),
        ),
        __createFile: file,
      } as ProductImage & {
        __createFile: File;
      };
    });

    setManagedImages((current) => [
      ...current,
      ...nextImages,
    ]);

    if (inlineBatch) {
      setInlineUploadCards((current) =>
        current.filter(
          (card) => !inlineBatch.ids.includes(card.id),
        ),
      );
    }

    setSelectedFiles([]);
    setSelectedVariantIds([]);
    setPendingUploadConfigurationId("");
    setPreviewUrls([]);
    setUploadProgress(null);
    setUploadError("");
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDirectUploadSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isPreparingSelectedImages) {
      setUploadError(
        "Please wait while the selected images are prepared.",
      );
      return;
    }

    await uploadPreparedImages(
      selectedFiles,
      selectedVariantIds,
    );
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
      setIsPreparingSelectedImages(true);
      setUploadError("");

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
    } finally {
      setIsPreparingSelectedImages(false);
    }

    previewUrls.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });

    setUploadError("");

    /*
     * Capture the active configuration before any upload begins.
     * A later gallery-tab change cannot redirect this batch.
     */
    const uploadConfigurationId =
      selectedGalleryConfigurationId;

    const preparedVariantIds = processedFiles.map(() =>
      uploadConfigurationId ? [uploadConfigurationId] : [],
    );

    /*
     * Configuration gallery:
     * the native file picker is the final confirmation.
     * Upload immediately after preparation with local authoritative
     * file/configuration values, avoiding stale React state.
     */
    if (uploadConfigurationId) {
      setPendingUploadConfigurationId(
        uploadConfigurationId,
      );

      const inlinePreviewUrls = processedFiles.map(
        (file) => URL.createObjectURL(file),
      );

      const inlineIds = processedFiles.map(
        (_, index) =>
          `inline-upload-${Date.now()}-${index}`,
      );

      setInlineUploadCards(
        processedFiles.map((file, index) => ({
          id: inlineIds[index],
          previewUrl: inlinePreviewUrls[index],
          fileName: file.name,
          percentage: 0,
          targetPercentage: 0,
          status: "waiting" as const,
          realStatus: "waiting" as const,
        })),
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await uploadPreparedImages(
        processedFiles,
        preparedVariantIds,
        {
          ids: inlineIds,
          previewUrls: inlinePreviewUrls,
        },
      );

      return;
    }

    /*
     * Shared-image uploads preserve the existing staging workflow
     * so administrators can review and assign usage before upload.
     */
    setSelectedFiles(processedFiles);
    setPendingUploadConfigurationId("");
    setSelectedVariantIds(preparedVariantIds);
    setPreviewUrls(
      processedFiles.map((file) =>
        URL.createObjectURL(file),
      ),
    );
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

        <div
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
              aria-disabled={disabled || isUploading}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={disabled || isUploading}
                onChange={(event) => {
                  void selectFiles(event.currentTarget.files);
                }}
              />
              Add images
            </label>
          </div>

          {uploadError ? (
            <div className="st-admin-media-manager__error">{uploadError}</div>
          ) : null}

          {isPreparingSelectedImages ? (
            <div
              className="st-admin-existing-media-v2__preparing-status"
              aria-live="polite"
            >
              <span className="st-admin-existing-media-v2__activity-spinner" />
              <span>
                Preparing images… removing background and standardizing layout.
              </span>
            </div>
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
                    {pendingUploadConfigurationId
                      ? `Ready for ${
                          liveConfigurations.find(
                            (configuration) =>
                              configuration.id ===
                              pendingUploadConfigurationId,
                          )?.variant_name ||
                          liveConfigurations.find(
                            (configuration) =>
                              configuration.id ===
                              pendingUploadConfigurationId,
                          )?.fallbackLabel ||
                          "the selected configuration"
                        }. Upload to add them directly to this gallery.`
                      : "Ready to upload as shared product images."}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedFiles}
                  disabled={
                    isUploading ||
                    isPreparingSelectedImages
                  }
                  className="st-admin-existing-media-v2__secondary"
                >
                  Clear
                </button>
              </div>

              <div className="st-admin-existing-media-v2__pending-grid">
                {selectedFiles.map((file, index) => {
                  const assignedVariantIds =
                    selectedVariantIds[index] ?? [];

                  const uploadConfiguration =
                    pendingUploadConfigurationId
                      ? liveConfigurations.find(
                          (configuration) =>
                            configuration.id ===
                            pendingUploadConfigurationId,
                        )
                      : null;

                  const currentUsageLabel =
                    assignedVariantIds.length === 0
                      ? "All configurations"
                      : assignedVariantIds
                          .map((variantId) => {
                            const configuration =
                              liveConfigurations.find(
                                (candidate) =>
                                  candidate.id === variantId,
                              );

                            return (
                              configuration?.variant_name ||
                              configuration?.fallbackLabel ||
                              ""
                            );
                          })
                          .filter(Boolean)
                          .join(", ");

                  return (
                    <article
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="st-admin-media-item"
                      data-admin-product-image-card="true"
                    >
                      <div className="st-admin-media-item__preview">
                        {previewUrls[index] ? (
                          <img
                            src={previewUrls[index]}
                            alt={`Product image ${index + 1}`}
                          />
                        ) : null}

                      </div>

                      <div className="st-admin-media-item__body">
                        <div className="st-admin-media-item__file">
                          <strong>{file.name}</strong>
                          <span>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>

                        <div className="st-admin-media-item__usage">
                          <div className="st-admin-media-item__usage-direct">
                            <span>{currentUsageLabel}</span>
                            <small>
                              {uploadConfiguration
                                ? "Uploads directly to this configuration"
                                : "Shared product image"}
                            </small>
                          </div>
                        </div>

                        <div className="st-admin-media-item__actions">
                          <button
                            type="button"
                            disabled={
                              isUploading ||
                              isPreparingSelectedImages
                            }
                            onClick={() =>
                              removeSelectedFile(index)
                            }
                            title="Remove image"
                            className="is-danger"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="st-admin-existing-media-v2__upload-footer">
                {uploadProgress ? (
                  <div className="st-admin-existing-media-v2__progress">
                    <div>
                      <span>
                        {uploadProgress.isFinalizing
                          ? "Finalizing images…"
                          : `Uploading ${
                              uploadProgress.currentIndex ?? 1
                            } of ${
                              uploadProgress.totalFiles ??
                              selectedFiles.length
                            } images`}
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
                  type="button"
                  onClick={() => {
                    void uploadPreparedImages(
                      selectedFiles,
                      selectedVariantIds,
                    );
                  }}
                  disabled={
                    isUploading ||
                    isPreparingSelectedImages
                  }
                  className="st-admin-existing-media-v2__primary"
                >
                  {isUploading
                    ? uploadProgress?.isFinalizing
                      ? "Finalizing…"
                      : "Uploading…"
                    : "Upload images"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

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
            {managedImages.length > 0 ? (
              <button
                type="button"
                disabled={disabled || Boolean(pendingImageOperation)}
                onClick={() => {
                  void handleClearAllPhotographs();
                }}
                className="st-admin-existing-media-v2__danger st-admin-image-destructive-v32"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        {orderedImages.length > 1 ? (
          <div
            className="st-admin-existing-media-v2__reorder-note"
            role="note"
          >
            <span
              className="st-admin-existing-media-v2__reorder-note-icon"
              aria-hidden="true"
            >
              <Grip />
            </span>

            <span className="st-admin-existing-media-v2__reorder-note-copy">
              <strong>Reorder photos</strong>
              <span>
                Hold and drag any photo to reposition it in the gallery.
              </span>
            </span>
          </div>
        ) : null}

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

        {pendingImageOperation !== "Deleting image…" ? (
          <div
            className="st-admin-existing-media-v2__activity-slot"
            aria-live="polite"
            aria-atomic="true"
          >
            <div
              className={`st-admin-existing-media-v2__activity${
                pendingImageOperation ? " is-visible" : ""
              }`}
            >
              {pendingImageOperation ? (
                <>
                  <span
                    className="st-admin-existing-media-v2__activity-spinner"
                    aria-hidden="true"
                  />
                  <span>{pendingImageOperation}</span>
                </>
              ) : null}
            </div>
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
          <div
            className={[
              "st-admin-media-manager__grid st-admin-existing-media-v2__grid",
              draggingImageId ? "is-drag-focus" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
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
                    className={[
                      isActiveMain
                        ? "st-admin-media-item is-main"
                        : "st-admin-media-item",
                      draggingImageId === image.id
                        ? "is-dragging"
                        : "",
                      dragTargetImageId === image.id &&
                      draggingImageId !== image.id &&
                      imageDragDropMode === "swap"
                        ? "is-drag-target is-drag-swap"
                        : "",
                      dragTargetImageId === image.id &&
                      draggingImageId !== image.id &&
                      imageDragDropMode === "insert-before"
                        ? "is-drag-target is-drag-insert-before"
                        : "",
                      dragTargetImageId === image.id &&
                      draggingImageId !== image.id &&
                      imageDragDropMode === "insert-after"
                        ? "is-drag-target is-drag-insert-after"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-admin-product-image-card="true"
                    data-admin-edit-product-reorder-image={image.id}
                    onPointerDown={(event) =>
                      handleSavedImagePointerDown(event, image.id)
                    }
                    onPointerMove={handleSavedImagePointerMove}
                    onPointerUp={handleSavedImagePointerUp}
                    onPointerCancel={handleSavedImagePointerCancel}
                  >
                    <div className="st-admin-media-item__preview">
                    {image.image_url ? (
                      <img
                        src={image.image_url}
                        alt={
                          image.alt_text ||
                          `${"New product"} image ${index + 1}`
                        }
                      draggable={false}
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
                      <span className="st-admin-media-item__main">
                        Main
                      </span>
                    ) : null}
                  </div>

                  <div className="st-admin-media-item__body">
                    <details
                      className="st-admin-media-item__usage st-admin-add-product-usage-disclosure"
                      data-admin-add-product-usage-details="true"
                    >
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
                        onSubmit={(event) => {
                          event.preventDefault();

                          const formData = new FormData(event.currentTarget);

                          updateLocalImageUsage(
                            image.id,
                            formData
                              .getAll("variant_ids")
                              .map((value) => String(value)),
                          );
                        }}
                        onChange={(event) => {
                          if (
                            !(event.target instanceof HTMLInputElement) ||
                            event.target.name !== "variant_ids"
                          ) {
                            return;
                          }

                          const usageForm = event.currentTarget;

                          window.requestAnimationFrame(() => {
                            usageForm.requestSubmit();
                          });
                        }}
                        className="st-admin-media-item__usage-panel"
                      >
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

                            form.requestSubmit();
                          }}
                        >
                          Shared with all configurations
                        </button>

                        <div className="st-admin-media-item__configuration-list">
                          {configurations.map((configuration) => {
                            const checked = assignments.some(
                              (assignment) =>
                                assignment.variant_id ===
                                configuration.clientId,
                            );

                            return (
                              <label key={configuration.clientId}>
                                <input
                                  type="checkbox"
                                  name="variant_ids"
                                  value={configuration.clientId}
                                  defaultChecked={checked}
                                  key={`${image.id}-${configuration.clientId}-${checked}`}
                                />

                                <span>
                                  {String(configuration.variant_name ?? "").trim() ||
                                    configuration.fallbackLabel ||
                                    "Configuration"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </form>
                    </details>


                    <div className="st-admin-media-item__actions st-admin-media-item__actions--delete-only">
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();

                          const confirmed = window.confirm(
                            "Delete this image permanently?",
                          );

                          if (!confirmed) {
                            return;
                          }

                          deleteLocalImage(image.id);
                        }}
                      >
                        <input
                          type="hidden"
                          name="image_id"
                          value={image.id}
                        />

                        <button
                          type="submit"
                          data-secondary-action="true"
                          className="is-danger st-admin-image-destructive-v32"
                          title="Delete photo"
                          aria-label="Delete photo"
                        >
                          <span>Delete photo</span>
                          <Trash2 />
                        </button>
                      </form>
                    </div>

                    {isShared ? (
                      <div className="st-admin-existing-media-v2__controls">
                        <button
                          type="button"
                          disabled={sharedIndex <= 0}
                          aria-label="Move shared image earlier"
                          onClick={() =>
                            moveLocalImage(
                              image.id,
                              "left",
                            )
                          }
                        >
                          <ArrowLeft />
                        </button>

                        <button
                          type="button"
                          disabled={
                            sharedIndex >= sharedImages.length - 1
                          }
                          aria-label="Move shared image later"
                          onClick={() =>
                            moveLocalImage(
                              image.id,
                              "right",
                            )
                          }
                        >
                          <ArrowRight />
                        </button>

                        <button
                          type="button"
                          disabled={image.is_primary}
                          aria-label="Set shared image as Main"
                          className={
                            image.is_primary ? "is-main" : undefined
                          }
                          onClick={() =>
                            setLocalPrimaryImage(image.id)
                          }
                        >
                          <Star />
                        </button>
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
                                  <button
                                    type="button"
                                    disabled={configurationIndex <= 0}
                                    aria-label={`Move image earlier in ${label}`}
                                    onClick={() =>
                                      moveLocalImage(
                                        image.id,
                                        "left",
                                        assignment.variant_id,
                                      )
                                    }
                                  >
                                    <ArrowLeft />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      configurationIndex >=
                                      configurationImages.length - 1
                                    }
                                    aria-label={`Move image later in ${label}`}
                                    onClick={() =>
                                      moveLocalImage(
                                        image.id,
                                        "right",
                                        assignment.variant_id,
                                      )
                                    }
                                  >
                                    <ArrowRight />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={assignment.is_primary}
                                    aria-label={`Set as Main for ${label}`}
                                    className={
                                      assignment.is_primary
                                        ? "is-main"
                                        : undefined
                                    }
                                    onClick={() =>
                                      setLocalPrimaryImage(
                                        image.id,
                                        assignment.variant_id,
                                      )
                                    }
                                  >
                                    <Star />
                                  </button>
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                </article>
              );
            })}

            {inlineUploadCards.map((card, inlineIndex) => (
              <article
                key={card.id}
                className="st-admin-media-item st-admin-inline-upload-v33"
                aria-label={`${card.fileName} uploading`}
              >
                <div className="st-admin-media-item__preview">
                  <img
                    src={card.previewUrl}
                    alt=""
                    draggable={false}
                  />

                  <span className="st-admin-media-item__position">
                    {selectedConfigurationImages.length +
                      inlineIndex +
                      1}
                  </span>

                  <div
                    className="st-admin-inline-upload-v33__veil"
                    aria-hidden="true"
                  />

                  <div
                    className="st-admin-inline-upload-v33__progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={card.percentage}
                    aria-label={`Uploading ${card.fileName}`}
                    style={{
                      "--st-admin-inline-upload-progress": `${card.percentage * 3.6}deg`,
                    } as React.CSSProperties}
                  >
                    <div className="st-admin-inline-upload-v33__ring">
                      <div className="st-admin-inline-upload-v33__ring-core">
                        <strong>{card.percentage}%</strong>
                        <span>
                          {card.status === "waiting"
                            ? "Waiting"
                            : card.status === "finalizing"
                              ? "Saving"
                              : "Uploading"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>


              </article>
            ))}
          </div>
        )}
      </div>

      {imageDragPreview ? (
        <div
          ref={setSavedImageDragPreviewNode}
          className="st-admin-image-drag-preview"
          style={{
            width: imageDragPreview.width,
            height: imageDragPreview.height,
          }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );

}
