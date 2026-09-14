"use client";

import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DirectUploadSelectedImage } from "./direct-upload-client";

import { processImageBeforeUpload } from "@/lib/stereophonie-v3/images/process-upload-client";

type SelectedImage = {
  id: string;

  /*
   * `file` becomes the fully prepared storefront upload file.
   *
   * The card itself is inserted immediately using previewUrl,
   * before this preparation work finishes.
   */
  file: File;

  previewUrl: string;

  /*
   * Instant-preview pipeline state.
   *
   * true  = local preview is already visible while the expensive
   *         product-image preparation continues in the background.
   *
   * false = file is ready for the direct upload pipeline.
   */
  isPreparing: boolean;

  /*
   * Empty array = Shared with all configurations.
   *
   * Otherwise this contains every exact configuration clientId
   * using this same physical image.
   */
  configurationIds: string[];
};

type ImageUploaderConfiguration = {
  clientId: string;
  variant_name: string;
  attributes: Record<string, string>;
  fallbackLabel: string;
};

type ImageUploaderProps = {
  disabled?: boolean;
  configurations?: ImageUploaderConfiguration[];
  onImagesChange?: (images: DirectUploadSelectedImage[]) => void;
};

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

const maximumImagesPerConfiguration = 10;
const maximumFileSize = 10 * 1024 * 1024;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function configurationLabel(configuration: ImageUploaderConfiguration) {
  const explicitName = clean(configuration.variant_name);

  if (explicitName) {
    return explicitName;
  }

  const preferredKeys = [
    "color",
    "colour",
    "storage",
    "capacity",
    "memory",
    "ram",
    "model",
    "edition",
    "case_type",
  ];

  const values: string[] = [];
  const seen = new Set<string>();

  for (const key of preferredKeys) {
    const value = clean(configuration.attributes?.[key]);

    if (!value) {
      continue;
    }

    const identity = value.toLowerCase();

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    values.push(value);
  }

  if (values.length > 0) {
    return values.slice(0, 4).join(" · ");
  }

  return clean(configuration.fallbackLabel) || "Configuration";
}

export default function ImageUploader({
  disabled = false,
  configurations = [],
  onImagesChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const imagesRef = useRef<SelectedImage[]>([]);

  const [images, setImages] = useState<SelectedImage[]>([]);

  const [errorMessage, setErrorMessage] = useState("");

  /*
   * ========================================================
   * CONFIGURATION-FIRST IMAGE WORKSPACE
   * ========================================================
   *
   * The administrator selects one configuration, then uploads and
   * arranges only that configuration's gallery.
   */
  const [activeConfigurationId, setActiveConfigurationId] = useState(
    () => configurations[0]?.clientId ?? "",
  );

  const configurationById = useMemo(
    () =>
      new Map(
        configurations.map((configuration) => [
          configuration.clientId,
          configuration,
        ]),
      ),
    [configurations],
  );

  useEffect(() => {
    if (configurations.length === 0) {
      if (activeConfigurationId) {
        setActiveConfigurationId("");
      }

      return;
    }

    const activeStillExists = configurations.some(
      (configuration) => configuration.clientId === activeConfigurationId,
    );

    if (!activeStillExists) {
      setActiveConfigurationId(configurations[0].clientId);
    }
  }, [activeConfigurationId, configurations]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    };
  }, []);

  /*
   * A physical image has one order while creating the
   * product. Each exact configuration derives its initial
   * gallery by filtering that physical order.
   *
   * After creation, the existing-product image manager provides
   * fully independent order/Main controls per configuration.
   */
  useEffect(() => {
    if (!onImagesChange) {
      return;
    }

    /*
     * Never expose half-prepared files to the product submission
     * pipeline.
     *
     * Save / Publish is also guarded by native form validation below,
     * so pending local previews can never accidentally be persisted as
     * their unprocessed originals.
     */
    const readyImages = images.filter((image) => !image.isPreparing);

    const prepared: DirectUploadSelectedImage[] = readyImages.map(
      (image) => {
        const absoluteIndex = images.findIndex(
          (candidate) => candidate.id === image.id,
        );

        return {
          file: image.file,
          configurationIds: Array.from(
            new Set(
              image.configurationIds
                .map((configurationId) => clean(configurationId))
                .filter(Boolean),
            ),
          ),
          altText: "",
          isPrimary: absoluteIndex === 0,
          position: absoluteIndex,
        };
      },
    );

    onImagesChange(prepared);
  }, [images, onImagesChange]);

  async function addFiles(selectedFiles: FileList | null) {
    setErrorMessage("");

    if (!selectedFiles?.length) {
      return;
    }

    const files = Array.from(selectedFiles);

    const invalidType = files.find(
      (file) => !allowedTypes.includes(file.type),
    );

    if (invalidType) {
      setErrorMessage(
        `${invalidType.name} is not supported. Use JPEG, PNG or WebP.`,
      );

      return;
    }

    const oversizedFile = files.find(
      (file) => file.size > maximumFileSize,
    );

    if (oversizedFile) {
      setErrorMessage(
        `${oversizedFile.name} is larger than 10 MB.`,
      );

      return;
    }

    /*
     * ========================================================
     * INSTANT LOCAL PREVIEW
     * ========================================================
     *
     * Do NOT wait for image processing before rendering cards.
     *
     * URL.createObjectURL() is effectively immediate because the
     * browser displays the selected local file directly.
     */
    const pendingImages: SelectedImage[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      isPreparing: true,
      configurationIds: activeConfigurationId
        ? [activeConfigurationId]
        : [],
    }));

    setImages((current) => [
      ...current,
      ...pendingImages,
    ]);

    /*
     * Allow the same physical file to be selected again later.
     */
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    /*
     * ========================================================
     * BACKGROUND PREPARATION
     * ========================================================
     *
     * All selected images are processed concurrently.
     *
     * Their existing local preview URLs stay mounted, so there is
     * no visual flash or blank state when the prepared File replaces
     * the original File in application state.
     */
    /*
     * Keep image processing intentionally bounded.
     *
     * Processing many high-resolution images at exactly the same
     * moment can temporarily exhaust the image-processing route.
     * Two concurrent jobs keeps the uploader quick without creating
     * an avoidable CPU / memory spike.
     *
     * Most importantly: a preparation failure must NEVER remove an
     * administrator-selected product image. If optimization fails,
     * preserve the original file and continue the upload normally.
     */
    const preparedById = new Map<string, File>();
    const fallbackIds = new Set<string>();

    const preparationConcurrency = 2;

    for (
      let start = 0;
      start < pendingImages.length;
      start += preparationConcurrency
    ) {
      const batch = pendingImages.slice(
        start,
        start + preparationConcurrency,
      );

      const results = await Promise.allSettled(
        batch.map(async (pendingImage) => ({
          id: pendingImage.id,
          file: await processImageBeforeUpload(
            pendingImage.file,
            "product",
          ),
        })),
      );

      results.forEach((result, index) => {
        const pendingImage = batch[index];

        if (!pendingImage) {
          return;
        }

        if (result.status === "fulfilled") {
          preparedById.set(
            result.value.id,
            result.value.file,
          );
          return;
        }

        /*
         * The original JPEG / PNG / WebP is already validated above.
         * Keep it instead of silently deleting the administrator's
         * selected media.
         */
        fallbackIds.add(pendingImage.id);

        console.warn(
          "[ADMIN PRODUCT MEDIA] Image preparation failed; using original file.",
          {
            fileName: pendingImage.file.name,
            reason:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason ?? "Unknown image preparation error"),
          },
        );
      });
    }

    setImages((current) =>
      current.map((image) => {
        const preparedFile = preparedById.get(image.id);

        if (preparedFile) {
          return {
            ...image,
            file: preparedFile,
            isPreparing: false,
          };
        }

        if (fallbackIds.has(image.id)) {
          return {
            ...image,
            isPreparing: false,
          };
        }

        return image;
      }),
    );

    /*
     * A failed optimization is now a transparent fallback rather
     * than destructive user-facing failure. Every selected valid
     * image remains in the product gallery.
     */
    setErrorMessage("");
  }

  function clearAllImages() {
    setImages((current) => {
      current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });

      return [];
    });

    setErrorMessage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removeImage(imageId: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === imageId);

      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((image) => image.id !== imageId);
    });
  }

  function toggleConfiguration(imageId: string, configurationId: string) {
    setImages((current) =>
      current.map((image) => {
        if (image.id !== imageId) {
          return image;
        }

        const alreadySelected =
          image.configurationIds.includes(configurationId);

        return {
          ...image,
          configurationIds: alreadySelected
            ? image.configurationIds.filter(
                (candidateId) => candidateId !== configurationId,
              )
            : [...image.configurationIds, configurationId],
        };
      }),
    );
  }

  function makeShared(imageId: string) {
    setImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? {
              ...image,
              configurationIds: [],
            }
          : image,
      ),
    );
  }

  function moveImage(imageId: string, direction: "left" | "right") {
    setImages((current) => {
      /*
       * Configuration-first ordering:
       *
       * Moving Midnight image 2 only changes Midnight's relative order.
       * Starlight/Blue/etc. keep their own relative sequence.
       */
      const visibleImages = activeConfigurationId
        ? current.filter(
            (image) =>
              image.configurationIds.length === 0 ||
              image.configurationIds.includes(activeConfigurationId),
          )
        : current;

      const currentVisibleIndex = visibleImages.findIndex(
        (image) => image.id === imageId,
      );

      if (currentVisibleIndex < 0) {
        return current;
      }

      const destinationVisibleIndex =
        direction === "left"
          ? currentVisibleIndex - 1
          : currentVisibleIndex + 1;

      if (
        destinationVisibleIndex < 0 ||
        destinationVisibleIndex >= visibleImages.length
      ) {
        return current;
      }

      const targetImage = visibleImages[destinationVisibleIndex];

      const sourceAbsoluteIndex = current.findIndex(
        (image) => image.id === imageId,
      );

      const targetAbsoluteIndex = current.findIndex(
        (image) => image.id === targetImage.id,
      );

      if (sourceAbsoluteIndex < 0 || targetAbsoluteIndex < 0) {
        return current;
      }

      const next = [...current];

      [next[sourceAbsoluteIndex], next[targetAbsoluteIndex]] = [
        next[targetAbsoluteIndex],
        next[sourceAbsoluteIndex],
      ];

      return next;
    });
  }

  const activeConfiguration = configurations.find(
    (configuration) => configuration.clientId === activeConfigurationId,
  );

  const visibleImages = activeConfigurationId
    ? images.filter(
        (image) =>
          image.configurationIds.length === 0 ||
          image.configurationIds.includes(activeConfigurationId),
      )
    : images;

  /*
   * Save / Publish must never submit while a visible local preview is
   * still being converted into its authoritative storefront image.
   */
  const preparingImageCount = images.filter(
    (image) => image.isPreparing,
  ).length;

  function visiblePosition(imageId: string) {
    return visibleImages.findIndex((image) => image.id === imageId);
  }

  function configurationImageCount(configurationId: string) {
    return images.filter(
      (image) =>
        image.configurationIds.length === 0 ||
        image.configurationIds.includes(configurationId),
    ).length;
  }

  return (
    <div
      className="st-admin-media-manager"
      data-admin-media-manager="true"
      data-media-preparing={
        preparingImageCount > 0 ? "true" : "false"
      }
    >
      {/*
       * Native form-validation guard.
       *
       * The field is valid whenever all images are ready.
       * While image preparation is running it becomes required + empty,
       * preventing Save/Publish from racing the preparation pipeline.
       */}
      <input
        type="text"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        readOnly
        required
        name="_product_media_ready"
        value={
          preparingImageCount === 0
            ? "ready"
            : ""
        }
      />

      <input
        ref={inputRef}
        id="product-image-files"
        type="file"
        accept="image/*"
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          void addFiles(event.currentTarget.files);
        }}
      />

      {configurations.length > 0 ? (
        <div className="st-admin-media-manager__configuration-bar">
          <div className="st-admin-media-manager__configuration-label">
            <strong>Media for</strong>

            <span>
              Select a configuration before adding images.
            </span>
          </div>

          <div className="st-admin-media-manager__configuration-tabs">
            {configurations.map((configuration, index) => {
              const active =
                configuration.clientId ===
                activeConfigurationId;

              return (
                <button
                  key={configuration.clientId}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setActiveConfigurationId(
                      configuration.clientId,
                    );
                    setErrorMessage("");
                  }}
                  className={
                    active
                      ? "st-admin-media-manager__configuration-tab is-active"
                      : "st-admin-media-manager__configuration-tab"
                  }
                >
                  <span>
                    {configurationLabel({
                      ...configuration,
                      fallbackLabel:
                        configuration.fallbackLabel ||
                        `Configuration ${index + 1}`,
                    })}
                  </span>

                  <small>
                    {configurationImageCount(
                      configuration.clientId,
                    )}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="st-admin-media-manager__error">
          {errorMessage}
        </div>
      ) : null}

      {images.length === 0 ? (
        <label
          htmlFor="product-image-files"
          className="st-admin-media-manager__empty"
        >
          <div className="st-admin-media-manager__empty-icon">
            <ImagePlus />
          </div>

          <div>
            <strong>Add media</strong>

            <p>
              {activeConfiguration
                ? `Images will be assigned to ${configurationLabel(
                    activeConfiguration,
                  )}.`
                : "Upload the product images customers should see."}
            </p>
          </div>

          <span>
            <Upload />
            Add files
          </span>
        </label>
      ) : (
        <>
          <div className="st-admin-media-manager__toolbar">
            <div>
              <strong>
                {visibleImages.length}{" "}
                {visibleImages.length === 1
                  ? "image"
                  : "images"}
              </strong>

              <span>
                {activeConfiguration
                  ? configurationLabel(
                      activeConfiguration,
                    )
                  : "Product media"}
              </span>
            </div>

            <div className="st-admin-media-manager__toolbar-actions">
              <button
                type="button"
                disabled={
                  disabled ||
                  images.length === 0
                }
                onClick={() => {
                  if (
                    window.confirm(
                      `Clear all ${images.length} selected image${
                        images.length === 1
                          ? ""
                          : "s"
                      }?`,
                    )
                  ) {
                    clearAllImages();
                  }
                }}
                className="st-admin-media-manager__clear"
              >
                <Trash2 />
                Clear
              </button>

              <label
                htmlFor="product-image-files"
                className="st-admin-media-manager__add"
              >
                <ImagePlus />
                Add media
              </label>
            </div>
          </div>

          <div className="st-admin-media-manager__grid">
            {visibleImages.map(
              (image, visibleIndex) => {
                const absoluteIndex =
                  images.findIndex(
                    (candidate) =>
                      candidate.id === image.id,
                  );

                const isShared =
                  image.configurationIds.length ===
                  0;

                const selectedConfigurations =
                  image.configurationIds
                    .map((configurationId) =>
                      configurationById.get(
                        configurationId,
                      ),
                    )
                    .filter(
                      (
                        configuration,
                      ): configuration is ImageUploaderConfiguration =>
                        Boolean(configuration),
                    );

                const currentLabel = isShared
                  ? "All configurations"
                  : selectedConfigurations
                      .map((configuration) =>
                        configurationLabel(
                          configuration,
                        ),
                      )
                      .join(", ");

                return (
                  <article
                    key={image.id}
                    className={
                      visibleIndex === 0
                        ? "st-admin-media-item is-main"
                        : "st-admin-media-item"
                    }
                    data-admin-product-image-card="true"
                  >
                    <div className="st-admin-media-item__preview">
                      <img
                        src={image.previewUrl}
                        alt={`Product image ${
                          visibleIndex + 1
                        }`}
                      />

                      <span className="st-admin-media-item__position">
                        {visibleIndex + 1}
                      </span>

                      {visibleIndex === 0 ? (
                        <span className="st-admin-media-item__main">
                          <Star />
                          Main
                        </span>
                      ) : null}

                      {image.isPreparing ? (
                        <span
                          className="st-admin-media-item__preparing"
                          aria-live="polite"
                        >
                          Preparing…
                        </span>
                      ) : null}
                    </div>

                    <div className="st-admin-media-item__body">
                      <div className="st-admin-media-item__file">
                        <strong>
                          {image.file.name}
                        </strong>

                        <span>
                          {(
                            image.file.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </span>
                      </div>

                      <details className="st-admin-media-item__usage">
                        <summary>
                          <span>
                            {currentLabel}
                          </span>

                          <small>
                            Edit usage
                          </small>
                        </summary>

                        <div className="st-admin-media-item__usage-panel">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              makeShared(image.id)
                            }
                            className={
                              isShared
                                ? "st-admin-media-item__shared is-active"
                                : "st-admin-media-item__shared"
                            }
                          >
                            Shared with all configurations
                          </button>

                          {configurations.length >
                          0 ? (
                            <div className="st-admin-media-item__configuration-list">
                              {configurations.map(
                                (
                                  configuration,
                                  index,
                                ) => {
                                  const checked =
                                    image.configurationIds.includes(
                                      configuration.clientId,
                                    );

                                  return (
                                    <label
                                      key={
                                        configuration.clientId
                                      }
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={
                                          disabled
                                        }
                                        checked={
                                          checked
                                        }
                                        onChange={() =>
                                          toggleConfiguration(
                                            image.id,
                                            configuration.clientId,
                                          )
                                        }
                                      />

                                      <span>
                                        {configurationLabel(
                                          {
                                            ...configuration,
                                            fallbackLabel:
                                              configuration.fallbackLabel ||
                                              `Configuration ${
                                                index +
                                                1
                                              }`,
                                          },
                                        )}
                                      </span>
                                    </label>
                                  );
                                },
                              )}
                            </div>
                          ) : null}
                        </div>
                      </details>

                      <div className="st-admin-media-item__actions">
                        <button
                          type="button"
                          disabled={
                            disabled ||
                            visibleIndex === 0
                          }
                          onClick={() =>
                            moveImage(
                              image.id,
                              "left",
                            )
                          }
                          title="Move image earlier"
                        >
                          <ArrowLeft />
                        </button>

                        <button
                          type="button"
                          disabled={
                            disabled ||
                            visibleIndex ===
                              visibleImages.length -
                                1
                          }
                          onClick={() =>
                            moveImage(
                              image.id,
                              "right",
                            )
                          }
                          title="Move image later"
                        >
                          <ArrowRight />
                        </button>

                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            removeImage(image.id)
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
              },
            )}
          </div>
        </>
      )}
    </div>
  );
}
