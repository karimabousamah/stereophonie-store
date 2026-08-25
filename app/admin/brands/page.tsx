import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  Plus,
  Power,
  Tags,
  Trash2,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import BrandSearch from "@/components/admin/brand-search";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { createClient } from "@/lib/supabase/server";

import {
  createBrand,
  deleteBrand,
  installElectronicsBrandLibrary,
  toggleBrand,
  updateBrand,
} from "./actions";

type BrandsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type ProductBrandLink = {
  brand_id: string | null;
};

export default async function AdminBrandsPage({
  searchParams,
}: BrandsPageProps) {
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

  const [brandsResult, productLinksResult] = await Promise.all([
    supabase
      .from("brands")
      .select(
        `
        id,
        name,
        slug,
        description,
        sort_order,
        is_active,
        created_at
      `,
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase.from("products").select("brand_id"),
  ]);

  const brands = (brandsResult.data ?? []) as Brand[];

  const productLinks = (productLinksResult.data ?? []) as ProductBrandLink[];

  const productCounts = new Map<string, number>();

  for (const product of productLinks) {
    if (!product.brand_id) {
      continue;
    }

    productCounts.set(
      product.brand_id,
      (productCounts.get(product.brand_id) ?? 0) + 1,
    );
  }

  const activeCount = brands.filter(
    (brand) => brand.is_active,
  ).length;

  const totalAssignedProducts = productLinks.filter((product) =>
    Boolean(product.brand_id),
  ).length;

  return (
    <AdminShell
      role={administrator.role}
      pageTitle="Brands"
      pageDescription="Create and organize the product brands displayed throughout the store."
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1540px]">
          <header className="border-b border-white/10 pb-8">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
              Catalog
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Brands
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">
              Keep manufacturer names consistent across product pages, search,
              filters and the storefront catalog.
            </p>
          </header>

          <section className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] border border-white/10 bg-[#0d0d0d] p-5">
              <Tags className="h-5 w-5 text-white/30" />

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Total brands
              </p>

              <p className="mt-3 text-3xl font-semibold">{brands.length}</p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-[#0d0d0d] p-5">
              <CheckCircle2 className="h-5 w-5 text-white/30" />

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Active brands
              </p>

              <p className="mt-3 text-3xl font-semibold">{activeCount}</p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-[#0d0d0d] p-5">
              <Package className="h-5 w-5 text-white/30" />

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Assigned products
              </p>

              <p className="mt-3 text-3xl font-semibold">
                {totalAssignedProducts}
              </p>
            </div>
          </section>

          {query.success ? (
            <div className="mt-7 rounded-[16px] border border-emerald-400/25 bg-emerald-400/[0.08] px-5 py-4 text-sm text-emerald-200">
              {query.success}
            </div>
          ) : null}

          {query.error ? (
            <div className="mt-7 rounded-[16px] border border-red-400/25 bg-red-400/[0.08] px-5 py-4 text-sm text-red-200">
              {query.error}
            </div>
          ) : null}

          {brandsResult.error || productLinksResult.error ? (
            <div className="mt-7 rounded-[16px] border border-red-400/25 bg-red-400/[0.08] px-5 py-4 text-sm text-red-200">
              Brand information could not be loaded completely.
            </div>
          ) : null}

          <section className="mt-7 overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d]">
            <div className="flex items-center gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Plus className="h-5 w-5 text-white/50" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Create brand</h2>

                <p className="mt-1 text-sm text-white/35">
                  The website URL is generated automatically from the name.
                </p>
              </div>
            </div>

            <form
              action={createBrand}
              className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_140px_auto] lg:items-end"
            >
              <div>
                <label
                  htmlFor="new-brand-name"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                >
                  Brand name
                </label>

                <input
                  id="new-brand-name"
                  name="name"
                  required
                  placeholder="Example: Apple"
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition placeholder:text-white/20 focus:border-white/45"
                />
              </div>

              <div>
                <label
                  htmlFor="new-brand-order"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                >
                  Display order
                </label>

                <input
                  id="new-brand-order"
                  name="sort_order"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue="0"
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                />
              </div>

              <button
                type="submit"
                className="flex min-h-12 items-center justify-center gap-2 bg-white px-6 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white/85"
              >
                <Plus className="h-4 w-4" />
                Create
              </button>

              <div className="lg:col-span-3">
                <label
                  htmlFor="new-brand-description"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                >
                  Description
                </label>

                <textarea
                  id="new-brand-description"
                  name="description"
                  rows={3}
                  placeholder="Optional internal or storefront description."
                  className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-white/45"
                />

                <label className="mt-4 inline-flex cursor-pointer items-center gap-3 text-sm text-white/55">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked
                    className="h-4 w-4 accent-white"
                  />
                  Active and available for products
                </label>
              </div>
            </form>
          </section>

          <section className="mt-7 flex flex-col gap-5 rounded-[22px] border border-[#f4b632]/35 bg-[#fff7e3] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#946000]">
                Starter library
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Add recognized electronics brands
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Install more than 50 real manufacturers covering phones,
                computing, gaming, audio, cameras, networking and storage.
                Existing brands stay untouched.
              </p>
            </div>

            <form action={installElectronicsBrandLibrary}>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f4b632] px-6 text-sm font-semibold text-black transition hover:bg-[#e8a91f]"
              >
                <Plus className="h-4 w-4" />
                Add brand library
              </button>
            </form>
          </section>

          <BrandSearch total={brands.length} />

          <section className="mt-7 space-y-4">
            {brands.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center border border-white/10 bg-[#0d0d0d] px-6 text-center">
                <Tags className="h-8 w-8 text-white/30" />

                <h2 className="mt-6 text-3xl font-semibold">
                  No brands yet
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
                  Create the first brand using the form above.
                </p>
              </div>
            ) : (
              brands.map((brand) => {
                const productCount = productCounts.get(brand.id) ?? 0;

                return (
                  <article
                    key={brand.id}
                  data-admin-brand-card="true"
                  data-admin-brand-search={`${brand.name} ${brand.slug} ${brand.description ?? ""}`}
                    className="border border-white/10 bg-[#0d0d0d]"
                  >
                    <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-semibold">
                            {brand.name}
                          </h2>

                          <span
                            className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                              brand.is_active
                                ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                                : "border-white/10 bg-white/[0.04] text-white/35"
                            }`}
                          >
                            {brand.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/35">
                          /{brand.slug} · {productCount}{" "}
                          {productCount === 1 ? "product" : "products"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={toggleBrand}>
                          <input
                            type="hidden"
                            name="brand_id"
                            value={brand.id}
                          />

                          <input
                            type="hidden"
                            name="next_active"
                            value={brand.is_active ? "false" : "true"}
                          />

                          <button
                            type="submit"
                            className="flex min-h-10 items-center gap-2 border border-white/10 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 transition hover:border-white/30 hover:text-white"
                          >
                            <Power className="h-3.5 w-3.5" />

                            {brand.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>

                        <form action={deleteBrand}>
                          <input
                            type="hidden"
                            name="brand_id"
                            value={brand.id}
                          />

                          <ConfirmSubmitButton
                            label="Delete"
                            pendingLabel="Deleting..."
                            confirmation={`Delete the brand "${brand.name}"? This cannot be undone.`}
                            className="flex min-h-10 items-center gap-2 border border-red-400/20 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300 transition hover:border-red-400/45 hover:bg-red-400/[0.08]"
                          />
                        </form>
                      </div>
                    </div>

                    <form
                      action={updateBrand}
                      className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_140px_auto] lg:items-end"
                    >
                      <input
                        type="hidden"
                        name="brand_id"
                        value={brand.id}
                      />

                      <div>
                        <label
                          htmlFor={`brand-name-${brand.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                        >
                          Name
                        </label>

                        <input
                          id={`brand-name-${brand.id}`}
                          name="name"
                          required
                          defaultValue={brand.name}
                          className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`brand-order-${brand.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                        >
                          Display order
                        </label>

                        <input
                          id={`brand-order-${brand.id}`}
                          name="sort_order"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={brand.sort_order}
                          className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                        />
                      </div>

                      <button
                        type="submit"
                        className="min-h-12 bg-white px-6 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white/85"
                      >
                        Save brand
                      </button>

                      <div className="lg:col-span-3">
                        <label
                          htmlFor={`brand-description-${brand.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                        >
                          Description
                        </label>

                        <textarea
                          id={`brand-description-${brand.id}`}
                          name="description"
                          rows={3}
                          defaultValue={brand.description ?? ""}
                          className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 leading-6 text-white outline-none transition focus:border-white/45"
                        />

                        <label className="mt-4 inline-flex cursor-pointer items-center gap-3 text-sm text-white/55">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={brand.is_active}
                            className="h-4 w-4 accent-white"
                          />
                          Active
                        </label>
                      </div>
                    </form>
                  </article>
                );
              })
            )}
          </section>

          <div className="mt-7 flex items-start gap-3 border border-amber-400/20 bg-amber-400/[0.06] p-5 text-sm leading-6 text-amber-100/70">
            <Trash2 className="mt-0.5 h-4 w-4 shrink-0" />
            Brands containing products cannot be deleted. Reassign those
            products first to prevent broken storefront organization.
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
