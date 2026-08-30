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
   * Empty array = Shared with all configurations.
   *
   * Otherwise this contains every exact configuration clientId
   * using this same physical photograph.
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
   * A physical photograph has one order while creating the
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

    const prepared: DirectUploadSelectedImage[] = images.map(
      (image, absoluteIndex) => ({
        file: image.file,
        configurationIds: Array.from(
          new Set(
            image.configurationIds
              .map((configurationId) => clean(configurationId))
              .filter(Boolean),
          ),
        ),
        altText: image.altText,
        isPrimary: absoluteIndex === 0,
        position: absoluteIndex,
      }),
    );

    onImagesChange(prepared);
  }, [images, onImagesChange]);

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
      configurationIds: [],
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
      const currentIndex = current.findIndex((image) => image.id === imageId);

      if (currentIndex < 0) {
        return current;
      }

      const destinationIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      if (destinationIndex < 0 || destinationIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moving] = next.splice(currentIndex, 1);

      next.splice(destinationIndex, 0, moving);

      return next;
    });
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
              const isShared = image.configurationIds.length === 0;

              const selectedConfigurations = image.configurationIds
                .map((configurationId) =>
                  configurationById.get(configurationId),
                )
                .filter(
                  (
                    configuration,
                  ): configuration is ImageUploaderConfiguration =>
                    Boolean(configuration),
                );

              const currentLabel = isShared
                ? "Shared with all configurations"
                : selectedConfigurations
                    .map((configuration) => configurationLabel(configuration))
                    .join(" · ");

              return (
                <article
                  key={image.id}
                  className={`overflow-hidden rounded-[12px] border bg-[#101010] transition ${
                    absoluteIndex === 0
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
                        {String(absoluteIndex + 1).padStart(2, "0")}
                      </span>

                      {absoluteIndex === 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/15 bg-emerald-50/95 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.11em] text-emerald-700 shadow-sm">
                          <Star className="h-3 w-3 fill-current" />
                          Product Main
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
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">
                        Photograph usage
                      </p>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => makeShared(image.id)}
                        className={`mt-2 w-full rounded-xl border px-3 py-3 text-left text-xs transition ${
                          isShared
                            ? "border-emerald-300/35 bg-emerald-300/[0.07] text-emerald-200"
                            : "border-white/10 bg-black/30 text-white/45 hover:border-white/25 hover:text-white/70"
                        }`}
                      >
                        Shared with all configurations
                      </button>

                      {configurations.length > 0 ? (
                        <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
                          {configurations.map((configuration, index) => {
                            const checked = image.configurationIds.includes(
                              configuration.clientId,
                            );

                            return (
                              <label
                                key={configuration.clientId}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                                  checked
                                    ? "border-white/20 bg-white/[0.06]"
                                    : "border-transparent hover:bg-white/[0.03]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={disabled}
                                  checked={checked}
                                  onChange={() =>
                                    toggleConfiguration(
                                      image.id,
                                      configuration.clientId,
                                    )
                                  }
                                  className="h-4 w-4 accent-white"
                                />

                                <span className="min-w-0 truncate text-xs text-white/65">
                                  {configurationLabel({
                                    ...configuration,
                                    fallbackLabel:
                                      configuration.fallbackLabel ||
                                      `Configuration ${index + 1}`,
                                  })}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] leading-4 text-white/25">
                          Create product configurations to assign this
                          photograph to specific versions.
                        </p>
                      )}

                      <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/25">
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
                        disabled={disabled || absoluteIndex === 0}
                        onClick={() => moveImage(image.id, "left")}
                        title="Move photograph earlier"
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        disabled={
                          disabled || absoluteIndex === images.length - 1
                        }
                        onClick={() => moveImage(image.id, "right")}
                        title="Move photograph later"
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeImage(image.id)}
                        title="Remove photograph"
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-red-400/30 hover:bg-red-400/[0.06] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-20"
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
