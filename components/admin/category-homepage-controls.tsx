"use client";

import { ImageIcon, ImageOff, MonitorUp, Moon, Save, Sun } from "lucide-react";

import { useState } from "react";

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
  homepageTheme: "light" | "dark";
};

export default function CategoryHomepageControls({
  categoryId,
  categoryName,
  imageUrl,
  showOnHomepage,
  homepageTheme,
}: Props) {
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">(
    homepageTheme,
  );

  return (
    <section className="border-t border-white/10 bg-black/30 p-4 sm:p-5">
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
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
            The image appears inside the existing category card in “CHOOSE YOUR
            MODE.”
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
                Control whether this category appears on the homepage and manage
                the visual displayed inside its category card.
              </p>
            </div>
          </div>

          {/* =========================================
              MAIN SAVE / UPLOAD FORM
              IMPORTANT: no form exists inside this form
          ========================================== */}

          <form action={updateCategoryHomepagePresentation} className="mt-5">
            <input type="hidden" name="category_id" value={categoryId} />

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

            {/* =========================================
                CATEGORY APPEARANCE
            ========================================== */}

            <div className="mt-4">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/55">
                  Category appearance
                </p>

                <p className="mt-1 text-xs leading-5 text-white/30">
                  Choose how this category card appears in “CHOOSE YOUR MODE.”
                  This setting affects only this category.
                </p>
              </div>

              {/*
               * The selected value is submitted through this
               * hidden field.
               *
               * We deliberately use real clickable buttons below
               * instead of hidden radio inputs + peer styling.
               */}
              <input
                type="hidden"
                name="homepage_theme"
                value={selectedTheme}
              />

              <div
                className="grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Category homepage appearance"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedTheme === "light"}
                  onClick={() => setSelectedTheme("light")}
                  className={`group flex min-h-[92px] w-full items-center gap-4 rounded-[18px] border px-4 py-4 text-left transition ${
                    selectedTheme === "light"
                      ? "border-amber-400/70 bg-amber-400/[0.10] shadow-[0_0_0_1px_rgba(245,179,53,0.12),0_8px_30px_rgba(245,179,53,0.05)]"
                      : "border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border bg-white text-black transition ${
                      selectedTheme === "light"
                        ? "border-amber-400/55 shadow-[0_0_0_3px_rgba(245,179,53,0.08)]"
                        : "border-black/10"
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <strong className="block text-sm font-semibold text-white">
                        Light
                      </strong>

                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 shrink-0 rounded-full border transition ${
                          selectedTheme === "light"
                            ? "border-amber-300 bg-amber-400 shadow-[0_0_0_3px_rgba(245,179,53,0.10)]"
                            : "border-white/20 bg-transparent"
                        }`}
                      />
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-white/35">
                      Bright Apple-style card with dark typography.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedTheme === "dark"}
                  onClick={() => setSelectedTheme("dark")}
                  className={`group flex min-h-[92px] w-full items-center gap-4 rounded-[18px] border px-4 py-4 text-left transition ${
                    selectedTheme === "dark"
                      ? "border-amber-400/70 bg-amber-400/[0.10] shadow-[0_0_0_1px_rgba(245,179,53,0.12),0_8px_30px_rgba(245,179,53,0.05)]"
                      : "border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border bg-[#050505] transition ${
                      selectedTheme === "dark"
                        ? "border-amber-400/70 shadow-[0_0_0_3px_rgba(245,179,53,0.10),0_5px_18px_rgba(0,0,0,0.18)]"
                        : "border-black/15 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    }`}
                  >
                    <Moon
                      strokeWidth={2.25}
                      className={`h-[18px] w-[18px] transition ${
                        selectedTheme === "dark"
                          ? "st-admin-theme-moon st-admin-theme-moon--selected"
                          : "st-admin-theme-moon st-admin-theme-moon--idle"
                      }`}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <strong className="block text-sm font-semibold text-white">
                        Dark
                      </strong>

                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 shrink-0 rounded-full border transition ${
                          selectedTheme === "dark"
                            ? "border-amber-300 bg-amber-400 shadow-[0_0_0_3px_rgba(245,179,53,0.10)]"
                            : "border-white/20 bg-transparent"
                        }`}
                      />
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-white/35">
                      Premium black card with light typography.
                    </span>
                  </span>
                </button>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-white/30">
                Selected:{" "}
                <span className="font-semibold capitalize text-amber-300">
                  {selectedTheme}
                </span>
              </p>
            </div>

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

              {imageUrl ? "Save / Replace wallpaper" : "Save homepage settings"}
            </button>
          </form>

          {/* =========================================
              REMOVE FORM
              Separate sibling form — NOT nested
          ========================================== */}

          {imageUrl ? (
            <form action={removeCategoryWallpaper} className="mt-3">
              <input type="hidden" name="category_id" value={categoryId} />

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
