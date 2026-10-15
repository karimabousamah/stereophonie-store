"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Eye,
  ImageIcon,
  ImageOff,
  Moon,
  MonitorUp,
  Sun,
  Trash2,
  X,
} from "lucide-react";

import {
  removeSubcategoryWallpaper,
} from "@/app/admin/categories/actions";

type SubcategoryStorefrontControlsProps = {
  subcategoryId: string;
  formId: string;
  actions: ReactNode;
  subcategoryName: string;
  imageUrl: string | null;
  homepageTheme: "light" | "dark";
};

function SubcategoryWallpaperRemoveButton({
  subcategoryName,
  disabled,
}: {
  subcategoryName: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="st-category-homepage__remove st-category-destructive-action st-admin-image-destructive-v32"
      disabled={disabled || pending}
      onClick={(event) => {
        if (
          !window.confirm(
            `Remove the wallpaper from "${subcategoryName}"?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <span>{pending ? "Removing..." : "Remove wallpaper"}</span>
      <Trash2 aria-hidden="true" />
    </button>
  );
}

export default function SubcategoryStorefrontControls({
  subcategoryId,
  formId,
  actions,
  subcategoryName,
  imageUrl,
  homepageTheme,
}: SubcategoryStorefrontControlsProps) {
  const [selectedTheme, setSelectedTheme] =
    useState<"light" | "dark">(homepageTheme);

  const [wallpaperFileName, setWallpaperFileName] =
    useState<string | null>(null);

  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);

  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedTheme(homepageTheme);
    setWallpaperFileName(null);
  }, [subcategoryId, homepageTheme]);

  useEffect(() => {
    if (!isWallpaperOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWallpaperOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isWallpaperOpen]);

  return (
    <section className="st-category-homepage is-subcategory">
      <div className="st-category-homepage__media">
        <div className="st-category-homepage__preview">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${subcategoryName} storefront wallpaper`}
            />
          ) : (
            <div className="st-category-homepage__empty">
              <ImageOff aria-hidden="true" />
              <span>No wallpaper</span>
            </div>
          )}
        </div>

        <div className="st-category-homepage__preview-actions">
          <button
            type="button"
            className="st-category-homepage__view"
            disabled={!imageUrl}
            onClick={() => {
              if (imageUrl) {
                setIsWallpaperOpen(true);
              }
            }}
          >
            <span>View wallpaper</span>
            <Eye aria-hidden="true" />
          </button>

          <form action={removeSubcategoryWallpaper}>
            <input
              type="hidden"
              name="subcategory_id"
              value={subcategoryId}
            />

            <SubcategoryWallpaperRemoveButton
              subcategoryName={subcategoryName}
              disabled={!imageUrl}
            />
          </form>
        </div>
      </div>

      <div className="st-category-homepage__content">
        <div className="st-category-homepage__heading">
          <MonitorUp aria-hidden="true" />

          <div>
            <strong>Storefront presentation</strong>
            <span>Appearance and wallpaper for this subcategory.</span>
          </div>
        </div>

        <div className="st-category-homepage__form">
<input
              type="hidden"
              name="homepage_theme"
              value={selectedTheme}
              form={formId}
            />

          <div className="st-category-homepage__themes">
            <button
              type="button"
              className={selectedTheme === "light" ? "is-selected" : ""}
              onClick={() => setSelectedTheme("light")}
              aria-pressed={selectedTheme === "light"}
            >
              <Sun aria-hidden="true" />

              <span>
                <strong>Light</strong>
                <small>Bright storefront card</small>
              </span>
            </button>

            <button
              type="button"
              className={selectedTheme === "dark" ? "is-selected" : ""}
              onClick={() => setSelectedTheme("dark")}
              aria-pressed={selectedTheme === "dark"}
            >
              <Moon aria-hidden="true" />

              <span>
                <strong>Dark</strong>
                <small>Black storefront card</small>
              </span>
            </button>
          </div>

          <div className="st-category-homepage__upload">
            <div className="st-category-homepage__upload-copy">
              <ImageIcon aria-hidden="true" />

              <span>
                <strong>
                  {imageUrl ? "Replace wallpaper" : "Upload wallpaper"}
                </strong>

                <small>
                  JPG, PNG, WEBP or AVIF · maximum 10 MB
                </small>
              </span>
            </div>

            <input
              ref={wallpaperInputRef}
              className="st-category-homepage__file-input"
              type="file"
              name="wallpaper"
              form={formId}
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) =>
                setWallpaperFileName(
                  event.target.files?.[0]?.name ?? null,
                )
              }
            />

            <button
              type="button"
              className="st-category-homepage__file-button"
              onClick={() => wallpaperInputRef.current?.click()}
            >
              Choose file
            </button>

            <span
              className={`st-category-homepage__file-name ${
                wallpaperFileName ? "has-file" : ""
              }`}
              title={wallpaperFileName ?? undefined}
            >
              {wallpaperFileName ?? "No file selected"}
            </span>
          </div>

          <div className="st-category-homepage__save-row st-category-workspace__actions st-category-workspace__final-actions">
            {actions}
          </div>
        </div>
      </div>

      {imageUrl && isWallpaperOpen ? (
        <div
          className="st-category-homepage__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${subcategoryName} wallpaper preview`}
        >
          <button
            type="button"
            className="st-category-homepage__lightbox-backdrop"
            onClick={() => setIsWallpaperOpen(false)}
            aria-label="Close wallpaper preview"
          />

          <div className="st-category-homepage__lightbox-panel">
            <div className="st-category-homepage__lightbox-head">
              <div>
                <span>Wallpaper preview</span>
                <strong>{subcategoryName}</strong>
              </div>

              <button
                type="button"
                className="st-category-homepage__lightbox-close"
                onClick={() => setIsWallpaperOpen(false)}
                aria-label="Close wallpaper preview"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="st-category-homepage__lightbox-stage">
              <img
                src={imageUrl}
                alt={`${subcategoryName} storefront wallpaper full preview`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
