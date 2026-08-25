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

import { updateHomepageSettings } from "./actions";

type HomepageAdminPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
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
      <div className="st3-admin-homepage-v3 px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1540px]">
          <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
                Storefront management
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Homepage
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">
                Edit the main storefront content without changing website code.
              </p>
            </div>

            <Link
              href="/"
              target="_blank"
              className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full border border-white/30 !bg-transparent px-6 text-[11px] font-semibold uppercase tracking-[0.18em] !text-white transition-all duration-200 hover:border-white/70 hover:!bg-white/10 hover:!text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              View homepage
              <ExternalLink className="h-4 w-4 shrink-0 !text-current transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </header>

          {query.success ? (
            <div className="mt-7 rounded-[18px] border border-emerald-400/25 bg-emerald-400/[0.08] px-5 py-4 text-sm text-emerald-200">
              {query.success}
            </div>
          ) : null}

          {query.error ? (
            <div className="mt-7 rounded-[18px] border border-red-400/25 bg-red-400/[0.08] px-5 py-4 text-sm text-red-200">
              {query.error}
            </div>
          ) : null}

          {settingsResult.error ? (
            <div className="mt-7 rounded-[18px] border border-red-400/25 bg-red-400/[0.08] px-5 py-4 text-sm text-red-200">
              Homepage settings could not be loaded:{" "}
              {settingsResult.error.message}
            </div>
          ) : null}

          <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_420px]">
            <form action={updateHomepageSettings} className="space-y-7" encType="multipart/form-data">
              <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d]">
                <div className="flex items-center gap-4 border-b border-white/10 px-6 py-5">
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 1</FieldLabel>

                    <input
                      name="hero_line_one"
                      required
                      defaultValue={settings.hero_line_one}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 2</FieldLabel>

                    <input
                      name="hero_line_two"
                      required
                      defaultValue={settings.hero_line_two}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 3</FieldLabel>

                    <input
                      name="hero_line_three"
                      required
                      defaultValue={settings.hero_line_three}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <FieldLabel>Custom hero image</FieldLabel>

                    <div className="mt-3 rounded-[18px] border border-white/10 bg-black/40 p-4">
                      {settings.hero_image_url ? (
                        <div className="mb-4 overflow-hidden rounded-[14px] border border-white/10 bg-white">
                          <div className="relative aspect-[16/7] w-full">
                            <Image
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
                        Upload a dedicated homepage hero visual. If none is uploaded,
                        the selected hero product image is used automatically.
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Primary button link</FieldLabel>

                    <input
                      name="primary_button_href"
                      required
                      defaultValue={settings.primary_button_href}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Secondary button label</FieldLabel>

                    <input
                      name="secondary_button_label"
                      required
                      defaultValue={settings.secondary_button_label}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Secondary button link</FieldLabel>

                    <input
                      name="secondary_button_href"
                      required
                      defaultValue={settings.secondary_button_href}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-6 py-5">
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="products">Products</option>

                      <option value="collections">Featured groups</option>

                      <option value="categories">Categories</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-6 py-5">
                  <h2 className="text-xl font-semibold">Product section</h2>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label className="flex min-h-14 items-center justify-between gap-5 rounded-[16px] border border-white/10 bg-black px-4 md:col-span-2">
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Main heading</FieldLabel>

                    <input
                      name="products_heading"
                      required
                      defaultValue={settings.products_heading}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button label</FieldLabel>

                    <input
                      name="products_button_label"
                      required
                      defaultValue={settings.products_button_label}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button link</FieldLabel>

                    <input
                      name="products_button_href"
                      required
                      defaultValue={settings.products_button_href}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-6 py-5">
                  <h2 className="text-xl font-semibold">Featured groups</h2>

                  <p className="mt-1 text-sm text-white/35">
                    Control the curated product groups shown on the homepage.
                  </p>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label className="flex min-h-14 items-center justify-between gap-5 rounded-[16px] border border-white/10 bg-black px-4 md:col-span-2">
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Main heading</FieldLabel>

                    <input
                      name="collections_heading"
                      required
                      defaultValue={settings.collections_heading}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button label</FieldLabel>

                    <input
                      name="collections_button_label"
                      required
                      defaultValue={settings.collections_button_label}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button link</FieldLabel>

                    <input
                      name="collections_button_href"
                      required
                      defaultValue={settings.collections_button_href}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <div className="mb-6 rounded-[16px] border border-white/10 bg-black/30 p-5">
                    <label className="flex cursor-pointer items-start justify-between gap-5">
                      <div>
                        <span className="block text-sm font-semibold text-white">
                          Automatic group scrolling
                        </span>

                        <span className="mt-2 block max-w-xl text-sm leading-6 text-white/40">
                          Automatically move the featured products row. Customers
                          can still scroll it manually whether this option is
                          enabled or disabled.
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    >
                      <option value="slow">Slow — elegant and relaxed</option>
                      <option value="normal">Normal — recommended</option>
                      <option value="fast">Fast — more energetic</option>
                    </select>

                    <span className="mt-2 block text-sm leading-6 text-white/40">
                      Controls how quickly the group cards move when
                      automatic scrolling is enabled.
                    </span>
                  </label>

                  <label className="md:col-span-2">
                    <FieldLabel>Maximum featured cards</FieldLabel>

                    <select
                      name="collections_limit"
                      defaultValue={String(settings.collections_limit)}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
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

              <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-6 py-5">
                  <h2 className="text-xl font-semibold">Category section</h2>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <label>
                    <FieldLabel>Small heading</FieldLabel>

                    <input
                      name="categories_eyebrow"
                      required
                      defaultValue={settings.categories_eyebrow}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Main heading</FieldLabel>

                    <input
                      name="categories_heading"
                      required
                      defaultValue={settings.categories_heading}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d]">
                <div className="border-b border-white/10 px-6 py-5">
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
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 1</FieldLabel>

                    <input
                      name="final_line_one"
                      required
                      defaultValue={settings.final_line_one}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Headline line 2</FieldLabel>

                    <input
                      name="final_line_two"
                      required
                      defaultValue={settings.final_line_two}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button label</FieldLabel>

                    <input
                      name="final_button_label"
                      required
                      defaultValue={settings.final_button_label}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>

                  <label>
                    <FieldLabel>Button link</FieldLabel>

                    <input
                      name="final_button_href"
                      required
                      defaultValue={settings.final_button_href}
                      className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                </div>
              </section>

              <button
                type="submit"
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-white px-6 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/85"
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
                      <small>
                        {settings.hero_eyebrow}
                      </small>

                      <h2>
                        {settings.hero_line_one}
                        <br />
                        {settings.hero_line_two}
                        <br />
                        {settings.hero_line_three}
                      </h2>

                      <p>
                        {settings.hero_description}
                      </p>

                      <div>
                        <span>
                          {settings.primary_button_label}
                        </span>

                        <span>
                          {settings.secondary_button_label}
                        </span>
                      </div>
                    </div>

                    <div className="st-admin-home-preview__visual">
                      {(settings.hero_image_url || previewImage) ? (
                        <Image
                          src={settings.hero_image_url || previewImage!}
                          alt={
                            settings.hero_image_url
                              ? "Homepage hero image"
                              : selectedHeroProduct?.name ??
                                "Homepage hero product"
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
                  This scaled storefront preview helps you understand how the hero copy, buttons and selected product work together before you open the public homepage.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
