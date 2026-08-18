"use client";

import {
  ImageIcon,
  ImageOff,
  MonitorUp,
  Save,
} from "lucide-react";

import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";

import {
  removeCategoryWallpaper,
  updateCategoryHomepagePresentation,
} from "@/app/admin/categories/actions";

type Props = {
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  showOnHomepage: boolean;
};

export default function CategoryHomepageControls({
  categoryId,
  categoryName,
  imageUrl,
  showOnHomepage,
}: Props) {
  return (
    <section className="border-t border-white/10 bg-black/30 p-5 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">

        {/* =========================================
            WALLPAPER PREVIEW
        ========================================== */}

        <div>
          <div className="relative aspect-[16/10] overflow-hidden border border-white/10 bg-black">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${categoryName} homepage wallpaper`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-white/25">
                <ImageOff className="h-8 w-8" />

                <span className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                  No wallpaper
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-4 pb-3 pt-12">
              <span className="text-[8px] font-semibold uppercase tracking-[0.15em] text-white/60">
                Homepage preview
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-white/30">
            The image appears inside the existing category card in
            “CHOOSE YOUR MODE.”
          </p>
        </div>

        {/* =========================================
            RIGHT SIDE
        ========================================== */}

        <div className="min-w-0">

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03]">
              <MonitorUp className="h-4 w-4 text-white/40" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">
                Choose Your Mode
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/35">
                Control whether this category appears on the homepage and
                manage the visual displayed inside its category card.
              </p>
            </div>
          </div>

          {/* =========================================
              MAIN SAVE / UPLOAD FORM
              IMPORTANT: no form exists inside this form
          ========================================== */}

          <form
            action={updateCategoryHomepagePresentation}
            className="mt-5"
          >
            <input
              type="hidden"
              name="category_id"
              value={categoryId}
            />

            <label className="flex cursor-pointer items-center justify-between gap-5 border border-white/10 bg-black px-4 py-4">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-[0.15em] text-white/65">
                  Show on homepage
                </span>

                <span className="mt-1 block text-xs leading-5 text-white/30">
                  Include this category in “CHOOSE YOUR MODE.”
                </span>
              </div>

              <input
                type="checkbox"
                name="show_on_homepage"
                defaultChecked={showOnHomepage}
                className="h-5 w-5 shrink-0 accent-white"
              />
            </label>

            <div className="mt-4">
              <label
                htmlFor={`category-wallpaper-${categoryId}`}
                className="text-xs font-semibold uppercase tracking-[0.15em] text-white/55"
              >
                Category wallpaper
              </label>

              <div className="mt-3 border border-dashed border-white/15 bg-black p-4 transition hover:border-white/35">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03]">
                    <ImageIcon className="h-4 w-4 text-white/35" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/65">
                      {imageUrl
                        ? "Replace current wallpaper"
                        : "Upload category wallpaper"}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/25">
                      Recommended: landscape image · JPG, PNG, WEBP or AVIF ·
                      maximum 10 MB
                    </p>

                    <input
                      id={`category-wallpaper-${categoryId}`}
                      type="file"
                      name="wallpaper"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="
                        mt-4 block w-full
                        text-xs text-white/40
                        file:mr-4
                        file:border-0
                        file:bg-white
                        file:px-4
                        file:py-2.5
                        file:text-[10px]
                        file:font-semibold
                        file:uppercase
                        file:tracking-[0.12em]
                        file:text-black
                        hover:file:bg-white/85
                      "
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="
                mt-5
                inline-flex min-h-11
                items-center justify-center
                gap-2
                bg-white
                px-5
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.15em]
                text-black
                transition
                hover:bg-white/85
              "
            >
              <Save className="h-3.5 w-3.5" />

              {imageUrl
                ? "Save / Replace wallpaper"
                : "Save homepage settings"}
            </button>
          </form>

          {/* =========================================
              REMOVE FORM
              Separate sibling form — NOT nested
          ========================================== */}

          {imageUrl ? (
            <form
              action={removeCategoryWallpaper}
              className="mt-3"
            >
              <input
                type="hidden"
                name="category_id"
                value={categoryId}
              />

              <ConfirmSubmitButton
                label="Remove wallpaper"
                pendingLabel="Removing..."
                confirmation={`Remove the homepage wallpaper from "${categoryName}"?`}
                className="
                  inline-flex min-h-11
                  items-center justify-center
                  border border-red-400/20
                  px-5
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.15em]
                  text-red-300
                  transition
                  hover:border-red-400/45
                  hover:bg-red-400/[0.08]
                "
              />
            </form>
          ) : null}

        </div>
      </div>
    </section>
  );
}
