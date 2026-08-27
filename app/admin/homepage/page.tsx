import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  ImageOff,
  LayoutTemplate,
  Save,
  Diamond,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import {
  normalizeHomepageSettings,
  type HomepageSettings,
} from "@/lib/homepage-settings";
import { createClient } from "@/lib/supabase/server";

import {
  createHomepageAnnouncement,
  deleteHomepageAnnouncement,
  toggleHomepageAnnouncement,
  updateHomepageAnnouncement,
  updateAnnouncementAppearance,
  updateHomepageSettings,
} from "./actions";

type HomepageAdminPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type HomepageAnnouncement = {
  id: string;
  message: string;
  link_label: string | null;
  link_href: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type ProductImage = {
  image_url: string | null;
  position: number;
  is_primary: boolean;
};

type ProductOption = {
  id: string;
  name: string;
  slug: string | null;
  product_images: ProductImage[] | null;
};

function getProductImage(product: ProductOption | null) {
  if (!product) {
    return null;
  }

  const images = product.product_images ?? [];

  const primary = images.find((image) => image.is_primary && image.image_url);

  if (primary?.image_url) {
    return primary.image_url;
  }

  return (
    [...images]
      .filter((image) => Boolean(image.image_url))
      .sort((first, second) => first.position - second.position)[0]
      ?.image_url ?? null
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
      {children}
    </span>
  );
}

export default async function AdminHomepagePage({
  searchParams,
}: HomepageAdminPageProps) {
  const query = await searchParams;

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: administrator, error: administratorError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (administratorError || !administrator?.is_active) {
    redirect("/admin/login");
  }

  const [settingsResult, productsResult] = await Promise.all([
    supabase
      .from("homepage_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle(),

    supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        product_images (
          image_url,
          position,
          is_primary
        )
      `,
      )
      .eq("status", "published")
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const settings = normalizeHomepageSettings(
    settingsResult.data as Partial<HomepageSettings> | null,
  );

  const products = (productsResult.data ?? []) as ProductOption[];

  const { data: announcementRows, error: announcementsError } = await supabase
    .from("homepage_announcements")
    .select(
      `
      id,
      message,
      link_label,
      link_href,
      is_active,
      sort_order,
      created_at
    `,
    )
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  const announcements = (announcementRows ?? []) as HomepageAnnouncement[];

  const activeAnnouncementCount = announcements.filter(
    (announcement) => announcement.is_active,
  ).length;

  const selectedHeroProduct =
    products.find((product) => product.id === settings.hero_product_id) ??
    products[0] ??
    null;

  const previewImage = getProductImage(selectedHeroProduct);

  return (
    <AdminShell
      role={administrator.role}
      pageTitle="Homepage"
      pageDescription="Control the storefront hero, featured product, headings, announcements and calls to action."
    >
      <div className="st3-admin-homepage-v3 px-5 py-5 sm:px-7 sm:py-7">
        <div className="mx-auto max-w-[1540px]">
          <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
                Storefront management
              </p>

              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                Homepage
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">
                Edit the main storefront content without changing website code.
              </p>
            </div>

            <Link
              href="/"
              target="_blank"
              className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-full border border-white/30 !bg-transparent px-6 text-[11px] font-semibold uppercase tracking-[0.18em] !text-white transition-all duration-200 hover:border-white/70 hover:!bg-white/10 hover:!text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              View homepage
              <ExternalLink className="h-4 w-4 shrink-0 !text-current transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </header>

          {query.success ? (
            <div
              role="status"
              className="mt-5 flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#86cfa1] bg-[#edf9f1] px-5 py-4 text-[13px] font-medium leading-5 text-[#175c35] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#2f9e5b]"
                aria-hidden="true"
              />
              <span>{query.success}</span>
            </div>
          ) : null}

          {query.error ? (
            <div
              role="alert"
              className="st-admin-notice st-admin-notice--error"
            >
              <span>{query.error}</span>
            </div>
          ) : null}

          {settingsResult.error ? (
            <div
              role="alert"
              className="st-admin-notice st-admin-notice--error"
            >
              <span>
                Homepage settings could not be loaded:{" "}
                {settingsResult.error.message}
              </span>
            </div>
          ) : null}

          <section className="mt-5 overflow-hidden rounded-[20px] border border-white/10 bg-[#0d0d0d]">
            <div className="border-b border-white/10 px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#fdb73e]">
                Announcement appearance
              </p>

              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
                Announcement background
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                Choose how the storefront announcement bar background should
                appear. The message rotation and transition remain unchanged.
              </p>
            </div>

            <form action={updateAnnouncementAppearance} className="p-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="relative block min-h-[178px] cursor-pointer">
                  <input
                    type="radio"
                    name="announcement_background_mode"
                    value="animated"
                    defaultChecked={
                      settings.announcement_background_mode === "animated"
                    }
                    className="peer absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                  />

                  <div
                    className="
                      pointer-events-none relative z-10 h-full rounded-[18px]
                      border border-[#d9d9dc] bg-[#f7f7f8] p-5
                      transition-[border-color,background-color,box-shadow,transform]
                      duration-200
                      peer-checked:border-[#d79520]
                      peer-checked:bg-[#fff9ed]
                      peer-checked:shadow-[0_0_0_3px_rgba(253,183,62,0.14)]
                      peer-focus-visible:ring-2
                      peer-focus-visible:ring-[#d79520]
                      peer-focus-visible:ring-offset-2
                      hover:border-[#bdbdc2]
                    "
                  >
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-sm font-semibold text-[#1d1d1f]">
                        Animated loader
                      </strong>

                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[#b9b9bd] bg-white">
                        <span className="h-2 w-2 rounded-full bg-[#fdb73e] opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
                      </span>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-full bg-[#e5e5e7]">
                      <div className="h-2 w-2/3 rounded-full bg-[#fdb73e]" />
                    </div>

                    <p className="mt-4 text-xs leading-5 text-[#6e6e73]">
                      Mustard fills the whole announcement background from 0 to
                      100% during each announcement cycle.
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="
                      pointer-events-none absolute right-5 top-5 z-30
                      h-[18px] w-[18px] rounded-full border
                      border-[#b9b9bd] bg-white
                      after:absolute after:left-1/2 after:top-1/2
                      after:h-2 after:w-2 after:-translate-x-1/2
                      after:-translate-y-1/2 after:rounded-full
                      after:bg-[#fdb73e] after:opacity-0
                      after:transition-opacity
                      peer-checked:border-[#d79520]
                      peer-checked:after:opacity-100
                    "
                  />
                </label>

                <label className="relative block min-h-[178px] cursor-pointer">
                  <input
                    type="radio"
                    name="announcement_background_mode"
                    value="still"
                    defaultChecked={
                      settings.announcement_background_mode === "still"
                    }
                    className="peer absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                  />

                  <div
                    className="
                      pointer-events-none relative z-10 h-full rounded-[18px]
                      border border-[#d9d9dc] bg-[#f7f7f8] p-5
                      transition-[border-color,background-color,box-shadow,transform]
                      duration-200
                      peer-checked:border-[#d79520]
                      peer-checked:bg-[#fff9ed]
                      peer-checked:shadow-[0_0_0_3px_rgba(253,183,62,0.14)]
                      peer-focus-visible:ring-2
                      peer-focus-visible:ring-[#d79520]
                      peer-focus-visible:ring-offset-2
                      hover:border-[#bdbdc2]
                    "
                  >
                    <div className="pr-8">
                      <strong className="text-sm font-semibold text-[#1d1d1f]">
                        Still mustard
                      </strong>
                    </div>

                    <div className="mt-5 h-8 rounded-[10px] bg-[#f6c365]" />

                    <p className="mt-4 text-xs leading-5 text-[#6e6e73]">
                      Keep a full mustard wallpaper behind the announcement at
                      all times with no loading movement.
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="
                      pointer-events-none absolute right-5 top-5 z-30
                      h-[18px] w-[18px] rounded-full border
                      border-[#b9b9bd] bg-white
                      after:absolute after:left-1/2 after:top-1/2
                      after:h-2 after:w-2 after:-translate-x-1/2
                      after:-translate-y-1/2 after:rounded-full
                      after:bg-[#fdb73e] after:opacity-0
                      after:transition-opacity
                      peer-checked:border-[#d79520]
                      peer-checked:after:opacity-100
                    "
                  />
                </label>

                <label className="relative block min-h-[178px] cursor-pointer">
                  <input
                    type="radio"
                    name="announcement_background_mode"
                    value="none"
                    defaultChecked={
                      settings.announcement_background_mode === "none"
                    }
                    className="peer absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                  />

                  <div
                    className="
                      pointer-events-none relative z-10 h-full rounded-[18px]
                      border border-[#d9d9dc] bg-[#f7f7f8] p-5
                      transition-[border-color,background-color,box-shadow,transform]
                      duration-200
                      peer-checked:border-[#d79520]
                      peer-checked:bg-[#fff9ed]
                      peer-checked:shadow-[0_0_0_3px_rgba(253,183,62,0.14)]
                      peer-focus-visible:ring-2
                      peer-focus-visible:ring-[#d79520]
                      peer-focus-visible:ring-offset-2
                      hover:border-[#bdbdc2]
                    "
                  >
                    <div className="pr-8">
                      <strong className="text-sm font-semibold text-[#1d1d1f]">
                        No wallpaper
                      </strong>
                    </div>

                    <div className="mt-5 h-8 rounded-[10px] border border-[#dddddf] bg-white" />

                    <p className="mt-4 text-xs leading-5 text-[#6e6e73]">
                      Keep the announcement bar clean and white without a
                      mustard background.
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="
                      pointer-events-none absolute right-5 top-5 z-30
                      h-[18px] w-[18px] rounded-full border
                      border-[#b9b9bd] bg-white
                      after:absolute after:left-1/2 after:top-1/2
                      after:h-2 after:w-2 after:-translate-x-1/2
                      after:-translate-y-1/2 after:rounded-full
                      after:bg-[#fdb73e] after:opacity-0
                      after:transition-opacity
                      peer-checked:border-[#d79520]
                      peer-checked:after:opacity-100
                    "
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#fdb73e] px-6 text-xs font-semibold text-[#1d1d1f] transition hover:bg-[#efaa29]"
                >
                  Save announcement appearance
                </button>
              </div>
            </form>
          </section>

          {/* === ST HOMEPAGE ANNOUNCEMENTS ADMIN START === */}

          <section className="mt-5 overflow-hidden rounded-[20px] border border-white/10 bg-[#0d0d0d]">
            <div className="flex flex-col gap-5 border-b border-white/10 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#fdb73e]">
                  Header message
                </p>

                <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
                  Announcement bar
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                  Messages appear directly below the storefront header. One
                  active announcement stays still. Multiple active announcements
                  rotate automatically every four seconds.
                </p>
              </div>

              <div className="flex shrink-0 gap-3">
                <div className="min-w-[110px] rounded-[16px] border border-white/10 bg-white/[0.035] px-4 py-3 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Active
                  </p>

                  <strong className="mt-1 block text-xl">
                    {activeAnnouncementCount}
                  </strong>
                </div>

                <div className="min-w-[110px] rounded-[16px] border border-white/10 bg-white/[0.035] px-4 py-3 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Total
                  </p>

                  <strong className="mt-1 block text-xl">
                    {announcements.length}
                  </strong>
                </div>
              </div>
            </div>

            <form
              action={createHomepageAnnouncement}
              className="border-b border-white/10 p-6"
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_120px]">
                <label>
                  <FieldLabel>New announcement</FieldLabel>

                  <input
                    name="message"
                    required
                    maxLength={300}
                    placeholder="Example: Enjoy a 2-year warranty on all Stereophonie products."
                    className="mt-3 min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#fdb73e]/60 focus:ring-4 focus:ring-[#fdb73e]/10"
                  />
                </label>

                <label>
                  <FieldLabel>Position</FieldLabel>

                  <input
                    name="sort_order"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={announcements.length}
                    className="mt-3 min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 text-white outline-none transition focus:border-[#fdb73e]/60"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label>
                  <FieldLabel>Optional link label</FieldLabel>

                  <input
                    name="link_label"
                    maxLength={80}
                    placeholder="Example: Learn more"
                    className="mt-3 min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#fdb73e]/60"
                  />
                </label>

                <label>
                  <FieldLabel>Optional link destination</FieldLabel>

                  <input
                    name="link_href"
                    maxLength={500}
                    placeholder="/delivery or https://..."
                    className="mt-3 min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#fdb73e]/60"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-white/55">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked
                    className="h-4 w-4 accent-[#fdb73e]"
                  />
                  Publish this announcement immediately
                </label>

                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#fdb73e] px-6 text-xs font-semibold text-[#1d1d1f] transition hover:bg-[#efaa29]"
                >
                  Add announcement
                </button>
              </div>
            </form>

            <div className="divide-y divide-white/10">
              {announcements.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-white/35">
                    No announcements yet. Add the first message above.
                  </p>
                </div>
              ) : (
                announcements.map((announcement, index) => (
                  <article key={announcement.id} className="p-5">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-8 min-w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-2 text-[10px] font-semibold text-white/45">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                            announcement.is_active
                              ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                              : "border-white/10 bg-white/[0.035] text-white/35"
                          }`}
                        >
                          {announcement.is_active ? "Live" : "Hidden"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={toggleHomepageAnnouncement}>
                          <input
                            type="hidden"
                            name="announcement_id"
                            value={announcement.id}
                          />

                          <input
                            type="hidden"
                            name="next_active"
                            value={announcement.is_active ? "false" : "true"}
                          />

                          <button
                            type="submit"
                            className="min-h-10 rounded-full border border-white/10 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 transition hover:border-white/30 hover:text-white"
                          >
                            {announcement.is_active ? "Hide" : "Publish"}
                          </button>
                        </form>

                        <form action={deleteHomepageAnnouncement}>
                          <input
                            type="hidden"
                            name="announcement_id"
                            value={announcement.id}
                          />

                          <button
                            type="submit"
                            className="min-h-10 rounded-full border border-red-400/20 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300 transition hover:border-red-400/45 hover:bg-red-400/[0.07]"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>

                    <form
                      action={updateHomepageAnnouncement}
                      className="grid gap-5"
                    >
                      <input
                        type="hidden"
                        name="announcement_id"
                        value={announcement.id}
                      />

                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_120px]">
                        <label>
                          <FieldLabel>Message</FieldLabel>

                          <input
                            name="message"
                            required
                            maxLength={300}
                            defaultValue={announcement.message}
                            className="mt-3 min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 text-white outline-none transition focus:border-[#fdb73e]/60"
                          />
                        </label>

                        <label>
                          <FieldLabel>Position</FieldLabel>

                          <input
                            name="sort_order"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={announcement.sort_order}
                            className="mt-3 min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 text-white outline-none transition focus:border-[#fdb73e]/60"
                          />
                        </label>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <label>
                          <FieldLabel>Link label</FieldLabel>

                          <input
                            name="link_label"
                            maxLength={80}
                            defaultValue={announcement.link_label ?? ""}
                            placeholder="Optional"
                            className="mt-3 min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#fdb73e]/60"
                          />
                        </label>

                        <label>
                          <FieldLabel>Link destination</FieldLabel>

                          <input
                            name="link_href"
                            maxLength={500}
                            defaultValue={announcement.link_href ?? ""}
                            placeholder="Optional"
                            className="mt-3 min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#fdb73e]/60"
                          />
                        </label>
                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-white/55">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={announcement.is_active}
                            className="h-4 w-4 accent-[#fdb73e]"
                          />
                          Active on storefront
                        </label>

                        <button
                          type="submit"
                          className="min-h-11 rounded-full border border-white/20 bg-white px-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black transition hover:bg-white/85"
                        >
                          Save announcement
                        </button>
                      </div>
                    </form>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* === ST HOMEPAGE ANNOUNCEMENTS ADMIN END === */}

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <form action={updateHomepageSettings} className="space-y-5">
              <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#fdb73e]">
                    Customer acquisition
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    First-order welcome offer
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                    Control the welcome popup and the real percentage applied to
                    newly generated first-order discount codes.
                  </p>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label className="flex min-h-[86px] cursor-pointer items-center justify-between gap-5 rounded-[16px] border border-white/10 bg-black px-5 md:col-span-2">
                    <div>
                      <FieldLabel>Enable welcome offer</FieldLabel>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        When disabled, guests will not see the first-order popup
                        and new welcome codes cannot be requested.
                      </p>
                    </div>

                    <input
                      name="welcome_discount_enabled"
                      type="checkbox"
                      defaultChecked={settings.welcome_discount_enabled}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-[#fdb73e]"
                    />
                  </label>

                  <label>
                    <FieldLabel>Discount percentage</FieldLabel>

                    <div className="relative mt-3">
                      <input
                        name="welcome_discount_percentage"
                        type="number"
                        required
                        min="1"
                        max="100"
                        step="1"
                        defaultValue={settings.welcome_discount_percentage}
                        className="min-h-11 w-full rounded-[13px] border border-white/10 bg-black px-4 pr-12 text-white outline-none transition focus:border-[#fdb73e]/60 focus:ring-4 focus:ring-[#fdb73e]/10"
                      />

                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/35">
                        %
                      </span>
                    </div>
                  </label>

                  <div className="rounded-[16px] border border-[#fdb73e]/20 bg-[#fdb73e]/[0.05] p-5">
                    <FieldLabel>Storefront preview</FieldLabel>

                    <strong className="mt-3 block text-lg font-semibold text-white">
                      Enjoy {settings.welcome_discount_percentage}% off your
                      first order
                    </strong>

                    <p className="mt-2 text-xs leading-5 text-white/35">
                      New private codes will use this exact percentage.
                      Previously issued codes keep their original value.
                    </p>
                  </div>
                </div>
              </section>
              <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
                <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4">
                  <LayoutTemplate className="h-5 w-5 text-white/40" />

                  <div>
                    <h2 className="text-xl font-semibold">Hero section</h2>

                    <p className="mt-1 text-sm text-white/35">
                      Main headline, description, buttons and featured image.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <FieldLabel>Small heading</FieldLabel>

                    <input
                      name="hero_eyebrow"
                      required
                      defaultValue={settings.hero_eyebrow}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 1</FieldLabel>

                    <input
                      name="hero_line_one"
                      required
                      defaultValue={settings.hero_line_one}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 2</FieldLabel>

                    <input
                      name="hero_line_two"
                      required
                      defaultValue={settings.hero_line_two}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 3</FieldLabel>

                    <input
                      name="hero_line_three"
                      required
                      defaultValue={settings.hero_line_three}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <FieldLabel>Custom hero image</FieldLabel>

                    <div className="mt-3 rounded-[18px] border border-white/10 bg-black/40 p-4">
                      {settings.hero_image_url ? (
                        <div className="mb-4 overflow-hidden rounded-[14px] border border-white/10 bg-white">
                          <div className="relative aspect-[16/7] w-full">
                            <Image
                              unoptimized
                              src={settings.hero_image_url}
                              alt="Current homepage hero image"
                              fill
                              sizes="700px"
                              className="object-contain"
                            />
                          </div>
                        </div>
                      ) : null}

                      <input
                        type="file"
                        name="hero_image"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="block w-full text-sm text-white/55 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-5 file:py-3 file:text-xs file:font-semibold file:text-black hover:file:bg-white/85"
                      />

                      <p className="mt-3 text-xs leading-5 text-white/30">
                        Upload a dedicated homepage hero visual. If none is
                        uploaded, the selected hero product image is used
                        automatically.
                      </p>

                      {settings.hero_image_url ? (
                        <label className="mt-4 flex items-center gap-3 text-xs text-red-300">
                          <input
                            type="checkbox"
                            name="remove_hero_image"
                            value="1"
                          />
                          Remove custom hero image
                        </label>
                      ) : null}
                    </div>
                  </div>

                  <label>
                    <FieldLabel>Hero product</FieldLabel>

                    <select
                      name="hero_product_id"
                      defaultValue={settings.hero_product_id ?? ""}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="">Automatic featured product</option>

                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="md:col-span-2">
                    <FieldLabel>Description</FieldLabel>

                    <textarea
                      name="hero_description"
                      required
                      rows={4}
                      defaultValue={settings.hero_description}
                      className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 leading-7 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Primary button label</FieldLabel>

                    <input
                      name="primary_button_label"
                      required
                      defaultValue={settings.primary_button_label}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Primary button link</FieldLabel>

                    <input
                      name="primary_button_href"
                      required
                      defaultValue={settings.primary_button_href}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Secondary button label</FieldLabel>

                    <input
                      name="secondary_button_label"
                      required
                      defaultValue={settings.secondary_button_label}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Secondary button link</FieldLabel>

                    <input
                      name="secondary_button_href"
                      required
                      defaultValue={settings.secondary_button_href}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-5 py-4">
                  <h2 className="text-xl font-semibold">
                    Homepage section order
                  </h2>

                  <p className="mt-1 text-sm text-white/35">
                    Choose the order of the three main homepage sections. Each
                    position must contain a different section.
                  </p>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-3">
                  <label>
                    <FieldLabel>First section</FieldLabel>

                    <select
                      name="section_order_first"
                      defaultValue={settings.section_order[0]}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="products">Products</option>

                      <option value="collections">Featured groups</option>

                      <option value="categories">Categories</option>
                    </select>
                  </label>

                  <label>
                    <FieldLabel>Second section</FieldLabel>

                    <select
                      name="section_order_second"
                      defaultValue={settings.section_order[1]}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="products">Products</option>

                      <option value="collections">Featured groups</option>

                      <option value="categories">Categories</option>
                    </select>
                  </label>

                  <label>
                    <FieldLabel>Third section</FieldLabel>

                    <select
                      name="section_order_third"
                      defaultValue={settings.section_order[2]}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="products">Products</option>

                      <option value="collections">Featured groups</option>

                      <option value="categories">Categories</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-5 py-4">
                  <h2 className="text-xl font-semibold">Product section</h2>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label className="flex min-h-11 items-center justify-between gap-5 rounded-[16px] border border-white/10 bg-black px-4 md:col-span-2">
                    <div>
                      <FieldLabel>Show product section</FieldLabel>

                      <p className="mt-1 text-xs text-white/35">
                        Display the selected products on the public homepage.
                      </p>
                    </div>

                    <input
                      name="products_enabled"
                      type="checkbox"
                      defaultChecked={settings.products_enabled}
                      className="h-5 w-5 accent-white"
                    />
                  </label>

                  <label>
                    <FieldLabel>Product order</FieldLabel>

                    <select
                      name="products_sort_mode"
                      defaultValue={settings.products_sort_mode}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="featured_first">
                        Featured products first
                      </option>

                      <option value="new_arrivals_first">
                        New arrivals first
                      </option>

                      <option value="newest">Newest products</option>
                    </select>
                  </label>

                  <label>
                    <FieldLabel>Number of products</FieldLabel>

                    <select
                      name="products_limit"
                      defaultValue={String(settings.products_limit)}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="4">4 products</option>

                      <option value="8">8 products</option>

                      <option value="12">12 products</option>
                    </select>
                  </label>

                  <label>
                    <FieldLabel>Small heading</FieldLabel>

                    <input
                      name="products_eyebrow"
                      required
                      defaultValue={settings.products_eyebrow}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Main heading</FieldLabel>

                    <input
                      name="products_heading"
                      required
                      defaultValue={settings.products_heading}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button label</FieldLabel>

                    <input
                      name="products_button_label"
                      required
                      defaultValue={settings.products_button_label}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button link</FieldLabel>

                    <input
                      name="products_button_href"
                      required
                      defaultValue={settings.products_button_href}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-5 py-4">
                  <h2 className="text-xl font-semibold">Featured groups</h2>

                  <p className="mt-1 text-sm text-white/35">
                    Control the curated product groups shown on the homepage.
                  </p>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label className="flex min-h-11 items-center justify-between gap-5 rounded-[16px] border border-white/10 bg-black px-4 md:col-span-2">
                    <div>
                      <FieldLabel>Show featured groups</FieldLabel>

                      <p className="mt-1 text-xs text-white/35">
                        Active product groups with images will appear here.
                      </p>
                    </div>

                    <input
                      name="collections_enabled"
                      type="checkbox"
                      defaultChecked={settings.collections_enabled}
                      className="h-5 w-5 accent-white"
                    />
                  </label>

                  <label>
                    <FieldLabel>Small heading</FieldLabel>

                    <input
                      name="collections_eyebrow"
                      required
                      defaultValue={settings.collections_eyebrow}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Main heading</FieldLabel>

                    <input
                      name="collections_heading"
                      required
                      defaultValue={settings.collections_heading}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button label</FieldLabel>

                    <input
                      name="collections_button_label"
                      required
                      defaultValue={settings.collections_button_label}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button link</FieldLabel>

                    <input
                      name="collections_button_href"
                      required
                      defaultValue={settings.collections_button_href}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <div className="mb-6 rounded-[16px] border border-white/10 bg-black/30 p-5">
                    <label className="flex cursor-pointer items-start justify-between gap-5">
                      <div>
                        <span className="block text-sm font-semibold text-white">
                          Automatic group scrolling
                        </span>

                        <span className="mt-2 block max-w-xl text-sm leading-6 text-white/40">
                          Automatically move the featured products row.
                          Customers can still scroll it manually whether this
                          option is enabled or disabled.
                        </span>
                      </div>

                      <input
                        type="checkbox"
                        name="collections_auto_scroll_enabled"
                        defaultChecked={
                          settings.collections_auto_scroll_enabled
                        }
                        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-white"
                      />
                    </label>
                  </div>

                  <label className="md:col-span-2">
                    <FieldLabel>Automatic scrolling speed</FieldLabel>

                    <select
                      name="collections_auto_scroll_speed"
                      defaultValue={settings.collections_auto_scroll_speed}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="slow">Slow — elegant and relaxed</option>
                      <option value="normal">Normal — recommended</option>
                      <option value="fast">Fast — more energetic</option>
                    </select>

                    <span className="mt-2 block text-sm leading-6 text-white/40">
                      Controls how quickly the group cards move when automatic
                      scrolling is enabled.
                    </span>
                  </label>

                  <label className="md:col-span-2">
                    <FieldLabel>Maximum featured cards</FieldLabel>

                    <select
                      name="collections_limit"
                      defaultValue={String(settings.collections_limit)}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="1">1 group</option>
                      <option value="2">2 groups</option>
                      <option value="3">3 groups</option>
                      <option value="4">4 groups</option>
                      <option value="5">5 groups</option>
                      <option value="6">6 groups</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-5 py-4">
                  <h2 className="text-xl font-semibold">Category section</h2>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label>
                    <FieldLabel>Small heading</FieldLabel>

                    <input
                      name="categories_eyebrow"
                      required
                      defaultValue={settings.categories_eyebrow}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Main heading</FieldLabel>

                    <input
                      name="categories_heading"
                      required
                      defaultValue={settings.categories_heading}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-5 py-4">
                  <h2 className="text-xl font-semibold">
                    Final call to action
                  </h2>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <FieldLabel>Small heading</FieldLabel>

                    <input
                      name="final_eyebrow"
                      required
                      defaultValue={settings.final_eyebrow}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 1</FieldLabel>

                    <input
                      name="final_line_one"
                      required
                      defaultValue={settings.final_line_one}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 2</FieldLabel>

                    <input
                      name="final_line_two"
                      required
                      defaultValue={settings.final_line_two}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button label</FieldLabel>

                    <input
                      name="final_button_label"
                      required
                      defaultValue={settings.final_button_label}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button link</FieldLabel>

                    <input
                      name="final_button_href"
                      required
                      defaultValue={settings.final_button_href}
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                </div>
              </section>

              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center gap-3 rounded-full bg-white px-6 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/85"
              >
                <Save className="h-4 w-4" />
                Save homepage
              </button>
            </form>

            <aside className="st-admin-home-preview xl:sticky xl:top-[110px] xl:self-start">
              <div className="st-admin-home-preview__shell">
                <header className="st-admin-home-preview__heading">
                  <div>
                    <Diamond className="h-4 w-4" />

                    <span>Current homepage</span>
                  </div>

                  <small>Live configuration preview</small>
                </header>

                <div className="st-admin-home-preview__browser">
                  <div className="st-admin-home-preview__chrome">
                    <span />
                    <span />
                    <span />

                    <div>stereophonie.store</div>
                  </div>

                  <div className="st-admin-home-preview__site-header">
                    <strong>STEREOPHONIE</strong>

                    <nav>
                      <span>Shop</span>
                      <span>Phones</span>
                      <span>Gaming</span>
                      <span>Audio</span>
                    </nav>

                    <span>Bag</span>
                  </div>

                  <div className="st-admin-home-preview__hero">
                    <div className="st-admin-home-preview__copy">
                      <small>{settings.hero_eyebrow}</small>

                      <h2>
                        {settings.hero_line_one}
                        <br />
                        {settings.hero_line_two}
                        <br />
                        {settings.hero_line_three}
                      </h2>

                      <p>{settings.hero_description}</p>

                      <div>
                        <span>{settings.primary_button_label}</span>

                        <span>{settings.secondary_button_label}</span>
                      </div>
                    </div>

                    <div className="st-admin-home-preview__visual">
                      {settings.hero_image_url || previewImage ? (
                        <Image
                          unoptimized
                          src={settings.hero_image_url || previewImage!}
                          alt={
                            settings.hero_image_url
                              ? "Homepage hero image"
                              : (selectedHeroProduct?.name ??
                                "Homepage hero product")
                          }
                          fill
                          sizes="430px"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageOff className="h-10 w-10 text-black/20" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="st-admin-home-preview__next">
                    <small>Selected for you</small>
                    <strong>New arrivals</strong>

                    <div>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>

                <p className="st-admin-home-preview__help">
                  This scaled storefront preview helps you understand how the
                  hero copy, buttons and selected product work together before
                  you open the public homepage.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
