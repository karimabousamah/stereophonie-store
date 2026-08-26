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
  file: File;
  previewUrl: string;
  altText: string;

  /*
   * Empty string = shared photograph.
   *
   * Otherwise this is the stable clientId of the exact
   * configuration, NOT its editable display name.
   */
  configurationId: string;
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

const maximumImages = 10;
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
   * IMPORTANT
   * ========================================================
   *
   * position is calculated INSIDE the photograph's own
   * configuration.
   *
   * Example:
   *
   * Black:
   *   Front  -> position 0 = MAIN
   *   Back   -> position 1
   *   Detail -> position 2
   *
   * White:
   *   Angle  -> position 0 = MAIN
   *   Front  -> position 1
   *
   * The configurations therefore have completely independent
   * galleries even though they are submitted together.
   *
   * isPrimary remains exactly ONE product-level primary image
   * for backward compatibility with cards / old database code.
   * Configuration main photographs are represented by
   * position === 0 inside their own group.
   * ========================================================
   */
  useEffect(() => {
    if (!onImagesChange) {
      return;
    }

    const groupPositions = new Map<string, number>();

    const prepared: DirectUploadSelectedImage[] = images.map(
      (image, absoluteIndex) => {
        const groupKey = image.configurationId || "__shared__";

        const groupPosition = groupPositions.get(groupKey) ?? 0;

        groupPositions.set(groupKey, groupPosition + 1);

        const configuration = image.configurationId
          ? configurationById.get(image.configurationId)
          : undefined;

        return {
          file: image.file,
          configurationId: image.configurationId,

          /*
           * Keep variantName for compatibility with the
           * current upload pipeline. The server now also
           * receives configurationId, which is authoritative.
           */
          variantName: configuration
            ? clean(configuration.variant_name) ||
              configurationLabel(configuration)
            : "",

          altText: image.altText,

          /*
           * Position is independent inside each configuration.
           * Shared photographs have their own group as well.
           */
          variantPosition: groupPosition,

          /*
           * Exactly one photograph can be marked Main for a
           * configuration. Shared photographs continue using
           * the normal product-level primary flag.
           */
          isVariantPrimary: Boolean(
            image.configurationId && groupPosition === 0,
          ),

          /*
           * Keep ONE global primary image because existing
           * product-card/database logic expects one.
           */
          isPrimary: absoluteIndex === 0,

          /*
           * Per-configuration position.
           */
          position: groupPosition,
        };
      },
    );

    onImagesChange(prepared);
  }, [images, configurationById, onImagesChange]);

  async function addFiles(selectedFiles: FileList | null) {
    setErrorMessage("");

    if (!selectedFiles?.length) {
      return;
    }

    const files = Array.from(selectedFiles);

    if (images.length + files.length > maximumImages) {
      setErrorMessage(
        `You can upload a maximum of ${maximumImages} photographs.`,
      );

      return;
    }

    const invalidType = files.find((file) => !allowedTypes.includes(file.type));

    if (invalidType) {
      setErrorMessage(
        `${invalidType.name} is not supported. Use JPEG, PNG or WebP.`,
      );

      return;
    }

    const oversizedFile = files.find((file) => file.size > maximumFileSize);

    if (oversizedFile) {
      setErrorMessage(`${oversizedFile.name} is larger than 10 MB.`);

      return;
    }

    let processedFiles: File[];

    try {
      setErrorMessage("Preparing photographs…");

      processedFiles = await Promise.all(
        files.map((file) => processImageBeforeUpload(file, "product")),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The photographs could not be prepared.",
      );

      return;
    }

    setErrorMessage("");

    const newImages: SelectedImage[] = processedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      altText: "",
      configurationId: "",
    }));

    setImages((current) => [...current, ...newImages]);

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

  function updateAltText(imageId: string, altText: string) {
    setImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? {
              ...image,
              altText,
            }
          : image,
      ),
    );
  }

  function updateConfiguration(imageId: string, configurationId: string) {
    setImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? {
              ...image,
              configurationId,
            }
          : image,
      ),
    );
  }

  /*
   * Reorder ONLY photographs belonging to the same
   * configuration.
   *
   * A Black photograph can therefore never accidentally move
   * inside the White gallery.
   */
  function moveImage(imageId: string, direction: "left" | "right") {
    setImages((current) => {
      const currentIndex = current.findIndex((image) => image.id === imageId);

      if (currentIndex < 0) {
        return current;
      }

      const target = current[currentIndex];

      const sameGroupIndices = current
        .map((image, index) => ({
          image,
          index,
        }))
        .filter(({ image }) => image.configurationId === target.configurationId)
        .map(({ index }) => index);

      const groupIndex = sameGroupIndices.indexOf(currentIndex);

      if (groupIndex < 0) {
        return current;
      }

      const nextGroupIndex =
        direction === "left" ? groupIndex - 1 : groupIndex + 1;

      if (nextGroupIndex < 0 || nextGroupIndex >= sameGroupIndices.length) {
        return current;
      }

      const swapIndex = sameGroupIndices[nextGroupIndex];

      const next = [...current];

      [next[currentIndex], next[swapIndex]] = [
        next[swapIndex],
        next[currentIndex],
      ];

      return next;
    });
  }

  /*
   * "Main" for a configuration means position 0 in that
   * configuration's own gallery.
   *
   * Move the selected image in front of every image belonging
   * to the same configuration.
   */
  function makeConfigurationMain(imageId: string) {
    setImages((current) => {
      const sourceIndex = current.findIndex((image) => image.id === imageId);

      if (sourceIndex < 0) {
        return current;
      }

      const source = current[sourceIndex];

      const firstGroupIndex = current.findIndex(
        (image) => image.configurationId === source.configurationId,
      );

      if (firstGroupIndex < 0 || firstGroupIndex === sourceIndex) {
        return current;
      }

      const next = [...current];

      const [removed] = next.splice(sourceIndex, 1);

      /*
       * Recalculate insertion location after removal.
       */
      const insertionIndex = next.findIndex(
        (image) => image.configurationId === source.configurationId,
      );

      if (insertionIndex < 0) {
        next.push(removed);
      } else {
        next.splice(insertionIndex, 0, removed);
      }

      return next;
    });
  }

  function groupPosition(image: SelectedImage) {
    const group = images.filter(
      (candidate) => candidate.configurationId === image.configurationId,
    );

    return group.findIndex((candidate) => candidate.id === image.id);
  }

  return (
    <div>
      <input
        ref={inputRef}
        id="product-images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          void addFiles(event.currentTarget.files);
        }}
      />

      {errorMessage ? (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {images.length === 0 ? (
        <label
          htmlFor="product-images"
          className="group flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed border-white/15 bg-black/20 px-5 text-center transition hover:border-white/35 hover:bg-white/[0.025]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <ImagePlus className="h-6 w-6" />
          </div>

          <p className="mt-6 text-lg font-semibold">
            Upload product photographs
          </p>

          <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
            Upload the photographs for every configuration. You can assign,
            order and choose the main photograph after upload.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/65">
            <Upload className="h-4 w-4" />
            Select photographs
          </span>
        </label>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-4 rounded-[20px] border border-white/10 bg-black/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">
                {images.length}{" "}
                {images.length === 1 ? "photograph" : "photographs"}
              </p>

              <p className="mt-1 text-xs leading-5 text-white/35">
                Assign every photograph to its configuration. The first
                photograph in each configuration is its main photograph.
              </p>
            </div>

            <label
              htmlFor="product-images"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/65 transition hover:bg-white hover:text-black"
            >
              <ImagePlus className="h-4 w-4" />
              Add photographs
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image, absoluteIndex) => {
              const localPosition = groupPosition(image);

              const configuration = image.configurationId
                ? configurationById.get(image.configurationId)
                : undefined;

              const isConfigurationMain = localPosition === 0;

              const sameGroupCount = images.filter(
                (candidate) =>
                  candidate.configurationId === image.configurationId,
              ).length;

              const currentLabel = configuration
                ? configurationLabel(configuration)
                : "Shared with all configurations";

              return (
                <article
                  key={image.id}
                  className={`overflow-hidden rounded-[12px] border bg-[#101010] transition ${
                    isConfigurationMain
                      ? "border-emerald-400/25"
                      : "border-white/10"
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-white">
                    <img
                      src={image.previewUrl}
                      alt={
                        image.altText ||
                        `Product photograph ${absoluteIndex + 1}`
                      }
                      className="h-full w-full object-contain"
                    />

                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                      <span className="rounded-full border border-black/10 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-black shadow-sm backdrop-blur">
                        {String(localPosition + 1).padStart(2, "0")}
                      </span>

                      {isConfigurationMain ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/15 bg-emerald-50/95 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.11em] text-emerald-700 shadow-sm">
                          <Star className="h-3 w-3 fill-current" />
                          Main
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="truncate text-sm font-semibold">
                      {image.file.name}
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      {(image.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    <div className="mt-4">
                      <label
                        htmlFor={`configuration-${image.id}`}
                        className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35"
                      >
                        Configuration
                      </label>

                      <select
                        id={`configuration-${image.id}`}
                        value={image.configurationId}
                        onChange={(event) =>
                          updateConfiguration(image.id, event.target.value)
                        }
                        className="mt-2 min-h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-white/35"
                      >
                        <option value="">Shared with all configurations</option>

                        {configurations.map((configuration, index) => (
                          <option
                            key={configuration.clientId}
                            value={configuration.clientId}
                          >
                            {configurationLabel({
                              ...configuration,
                              fallbackLabel:
                                configuration.fallbackLabel ||
                                `Configuration ${index + 1}`,
                            })}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-[10px] leading-4 text-white/25">
                        {currentLabel}
                      </p>
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor={`alt-${image.id}`}
                        className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35"
                      >
                        Image description
                      </label>

                      <input
                        id={`alt-${image.id}`}
                        type="text"
                        value={image.altText}
                        onChange={(event) =>
                          updateAltText(image.id, event.target.value)
                        }
                        placeholder="Front view, back view, detail…"
                        className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/35"
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveImage(image.id, "left")}
                        disabled={localPosition === 0}
                        title="Move earlier in this configuration"
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(image.id, "right")}
                        disabled={localPosition === sameGroupCount - 1}
                        title="Move later in this configuration"
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => makeConfigurationMain(image.id)}
                        disabled={isConfigurationMain}
                        title="Make main photograph for this configuration"
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06] hover:text-emerald-300 disabled:border-emerald-400/20 disabled:bg-emerald-400/[0.05] disabled:text-emerald-300"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            isConfigurationMain ? "fill-current" : ""
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        title="Remove photograph"
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-red-400/30 hover:bg-red-400/[0.06] hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
