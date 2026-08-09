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

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
  altText: string;
};

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

const maximumImages = 10;
const maximumFileSize = 10 * 1024 * 1024;

type ImageUploaderProps = {
  disabled?: boolean;
  onImagesChange?: (images: DirectUploadSelectedImage[]) => void;
};

export default function ImageUploader({
  disabled = false,
  onImagesChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<SelectedImage[]>([]);

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [mainImageId, setMainImageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const mainImageIndex = useMemo(() => {
    if (!mainImageId) {
      return images.length > 0 ? 0 : -1;
    }

    return images.findIndex((image) => image.id === mainImageId);
  }, [images, mainImageId]);

  const imageMetadata = useMemo(
    () =>
      images.map((image, index) => ({
        position: index,
        alt_text: image.altText.trim(),
        is_primary: index === mainImageIndex,
      })),
    [images, mainImageIndex],
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

  useEffect(() => {
    onImagesChange?.(
      images.map((image, index) => ({
        file: image.file,
        altText: image.altText,
        isPrimary: index === mainImageIndex,
        position: index,
      })),
    );
  }, [images, mainImageIndex, onImagesChange]);

  function addFiles(selectedFiles: FileList | null) {
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

    const newImages: SelectedImage[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      altText: "",
    }));

    const updatedImages = [...images, ...newImages];

    setImages(updatedImages);

    if (!mainImageId && updatedImages.length > 0) {
      setMainImageId(updatedImages[0].id);
    }
  }

  function removeImage(imageId: string) {
    const imageToRemove = images.find((image) => image.id === imageId);

    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }

    const updatedImages = images.filter((image) => image.id !== imageId);

    setImages(updatedImages);

    if (mainImageId === imageId) {
      setMainImageId(updatedImages[0]?.id ?? null);
    }
  }

  function moveImage(imageId: string, direction: "left" | "right") {
    const currentIndex = images.findIndex((image) => image.id === imageId);

    if (currentIndex === -1) {
      return;
    }

    const nextIndex =
      direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= images.length) {
      return;
    }

    const updatedImages = [...images];

    [updatedImages[currentIndex], updatedImages[nextIndex]] = [
      updatedImages[nextIndex],
      updatedImages[currentIndex],
    ];

    setImages(updatedImages);
  }

  function updateAltText(imageId: string, altText: string) {
    setImages((currentImages) =>
      currentImages.map((image) =>
        image.id === imageId
          ? {
              ...image,
              altText,
            }
          : image,
      ),
    );
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
        onChange={(event) => addFiles(event.target.files)}
      />

      <input type="hidden" name="main_image_index" value={mainImageIndex} />

      <input
        type="hidden"
        name="image_metadata"
        value={JSON.stringify(imageMetadata)}
      />

      {errorMessage && (
        <div className="mb-5 border border-red-400/30 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {images.length === 0 ? (
        <label
          htmlFor="product-images"
          className="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center border border-dashed border-white/20 bg-black/20 px-6 text-center transition duration-300 hover:border-white/50 hover:bg-white/[0.035]"
        >
          <div className="flex h-14 w-14 items-center justify-center border border-white/15 bg-white/[0.04] transition group-hover:border-white group-hover:bg-white group-hover:text-black">
            <ImagePlus className="h-6 w-6" />
          </div>

          <p className="mt-6 text-lg font-semibold">
            Upload product photographs
          </p>

          <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
            Select up to ten JPEG, PNG or WebP photographs. Each file must be
            smaller than 10 MB.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 border border-white/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/65 transition group-hover:border-white group-hover:bg-white group-hover:text-black">
            <Upload className="h-4 w-4" />
            Select photographs
          </span>
        </label>
      ) : (
        <div>
          <div className="mb-5 flex flex-col gap-4 border border-white/10 bg-black/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">
                {images.length}{" "}
                {images.length === 1
                  ? "photograph selected"
                  : "photographs selected"}
              </p>

              <p className="mt-1 text-xs text-white/35">
                The first photograph marked Main will appear first on the
                storefront.
              </p>
            </div>

            <label
              htmlFor="product-images"
              className="inline-flex cursor-pointer items-center justify-center gap-2 border border-white/15 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/65 transition hover:border-white hover:bg-white hover:text-black"
            >
              <ImagePlus className="h-4 w-4" />
              Add photographs
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image, index) => {
              const isMain =
                image.id === mainImageId || (!mainImageId && index === 0);

              return (
                <article
                  key={image.id}
                  className={`overflow-hidden border bg-[#101010] transition ${
                    isMain ? "border-emerald-400/50" : "border-white/10"
                  }`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-black">
                    <img
                      src={image.previewUrl}
                      alt={image.altText || `Product photograph ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-3">
                      <span className="border border-white/15 bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        {index + 1}
                      </span>

                      {isMain && (
                        <span className="inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
                          <Star className="h-3 w-3 fill-current" />
                          Main
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="truncate text-sm font-semibold">
                      {image.file.name}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      {(image.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    <div className="mt-4">
                      <label
                        htmlFor={`alt-${image.id}`}
                        className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
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
                        placeholder="Example: Front view of the dress"
                        className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => moveImage(image.id, "left")}
                        disabled={index === 0}
                        aria-label="Move photograph left"
                        className="flex h-10 items-center justify-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(image.id, "right")}
                        disabled={index === images.length - 1}
                        aria-label="Move photograph right"
                        className="flex h-10 items-center justify-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMainImageId(image.id)}
                        disabled={isMain}
                        aria-label="Set as main photograph"
                        className="flex h-10 items-center justify-center border border-white/10 text-white/50 transition hover:border-emerald-400/40 hover:text-emerald-300 disabled:cursor-default disabled:border-emerald-400/30 disabled:text-emerald-300"
                      >
                        <Star
                          className={`h-4 w-4 ${isMain ? "fill-current" : ""}`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        aria-label="Remove photograph"
                        className="flex h-10 items-center justify-center border border-white/10 text-white/50 transition hover:border-red-400/40 hover:bg-red-400/[0.06] hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
