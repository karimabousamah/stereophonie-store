import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Package,
  Plus,
  Power,
  Diamond,
  Trash2,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { createClient } from "@/lib/supabase/server";

import {
  createCollection,
  deleteCollection,
  toggleCollection,
  updateCollection,
} from "./actions";

type CollectionsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  storage_path: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
};

type ProductCollectionLink = {
  collection_id: string | null;
};

export default async function AdminCollectionsPage({
  searchParams,
}: CollectionsPageProps) {
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

  const [collectionsResult, productLinksResult] = await Promise.all([
    supabase
      .from("collections")
      .select(
        `
        id,
        name,
        slug,
        description,
        image_url,
        storage_path,
        sort_order,
        is_featured,
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

    supabase.from("products").select("collection_id"),
  ]);

  const collections = (collectionsResult.data ?? []) as Collection[];

  const productLinks = (productLinksResult.data ??
    []) as ProductCollectionLink[];

  const productCounts = new Map<string, number>();

  for (const product of productLinks) {
    if (!product.collection_id) {
      continue;
    }

    productCounts.set(
      product.collection_id,
      (productCounts.get(product.collection_id) ?? 0) + 1,
    );
  }

  const activeCount = collections.filter(
    (collection) => collection.is_active,
  ).length;

  const featuredCount = collections.filter(
    (collection) => collection.is_featured,
  ).length;

  const assignedProducts = productLinks.filter((product) =>
    Boolean(product.collection_id),
  ).length;

  return (
    <AdminShell
      role={administrator.role}
      pageTitle="Collections"
      pageDescription="Create and organize curated product collections for the storefront."
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
              Merchandising
            </p>

            <h1 className="mt-3 text-5xl font-semibold uppercase tracking-[-0.055em] sm:text-7xl">
              Collections
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">
              Build curated groups such as new arrivals, summer edits,
              essentials, and featured selections.
            </p>
          </header>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="border border-white/10 bg-[#0d0d0d] p-5">
              <Boxes className="h-5 w-5 text-white/30" />

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Total collections
              </p>

              <p className="mt-3 text-3xl font-semibold">
                {collections.length}
              </p>
            </div>

            <div className="border border-white/10 bg-[#0d0d0d] p-5">
              <CheckCircle2 className="h-5 w-5 text-white/30" />

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Active
              </p>

              <p className="mt-3 text-3xl font-semibold">{activeCount}</p>
            </div>

            <div className="border border-white/10 bg-[#0d0d0d] p-5">
              <Diamond className="h-5 w-5 text-white/30" />

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Featured
              </p>

              <p className="mt-3 text-3xl font-semibold">{featuredCount}</p>
            </div>

            <div className="border border-white/10 bg-[#0d0d0d] p-5">
              <Package className="h-5 w-5 text-white/30" />

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Assigned products
              </p>

              <p className="mt-3 text-3xl font-semibold">{assignedProducts}</p>
            </div>
          </section>

          {query.success ? (
            <div className="mt-7 border border-emerald-400/25 bg-emerald-400/[0.08] px-5 py-4 text-sm text-emerald-200">
              {query.success}
            </div>
          ) : null}

          {query.error ? (
            <div className="mt-7 border border-red-400/25 bg-red-400/[0.08] px-5 py-4 text-sm text-red-200">
              {query.error}
            </div>
          ) : null}

          {collectionsResult.error || productLinksResult.error ? (
            <div className="mt-7 border border-red-400/25 bg-red-400/[0.08] px-5 py-4 text-sm text-red-200">
              Collection information could not be loaded completely.
            </div>
          ) : null}

          <section className="mt-7 border border-white/10 bg-[#0d0d0d]">
            <div className="flex items-center gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white/[0.04]">
                <Plus className="h-5 w-5 text-white/50" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Create collection</h2>

                <p className="mt-1 text-sm text-white/35">
                  The collection URL is generated automatically.
                </p>
              </div>
            </div>

            <form
              action={createCollection}
              className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_140px_auto] lg:items-end"
            >
              <div>
                <label
                  htmlFor="new-collection-name"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                >
                  Collection name
                </label>

                <input
                  id="new-collection-name"
                  name="name"
                  required
                  placeholder="Example: Summer Edit"
                  className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition placeholder:text-white/20 focus:border-white/45"
                />
              </div>

              <div>
                <label
                  htmlFor="new-collection-order"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                >
                  Display order
                </label>

                <input
                  id="new-collection-order"
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
                  htmlFor="new-collection-image"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                >
                  Collection image
                </label>

                <input
                  id="new-collection-image"
                  name="collection_image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-3 block w-full cursor-pointer border border-dashed border-white/15 bg-black px-4 py-4 text-sm text-white/50 file:mr-4 file:border-0 file:bg-white file:px-4 file:py-2 file:text-[10px] file:font-semibold file:uppercase file:tracking-[0.14em] file:text-black"
                />

                <p className="mt-2 text-xs leading-5 text-white/30">
                  JPEG, PNG or WebP. Maximum size: 10 MB.
                </p>
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="new-collection-description"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                >
                  Description
                </label>

                <textarea
                  id="new-collection-description"
                  name="description"
                  rows={3}
                  placeholder="Optional collection description."
                  className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-white/45"
                />

                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-white/55">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked
                      className="h-4 w-4 accent-white"
                    />
                    Active
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-white/55">
                    <input
                      type="checkbox"
                      name="is_featured"
                      className="h-4 w-4 accent-white"
                    />
                    Featured collection
                  </label>
                </div>
              </div>
            </form>
          </section>

          <section className="mt-7 space-y-4">
            {collections.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center border border-white/10 bg-[#0d0d0d] px-6 text-center">
                <Boxes className="h-8 w-8 text-white/30" />

                <h2 className="mt-6 text-3xl font-semibold">
                  No collections yet
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
                  Create the first collection using the form above.
                </p>
              </div>
            ) : (
              collections.map((collection) => {
                const productCount = productCounts.get(collection.id) ?? 0;

                return (
                  <article
                    key={collection.id}
                    className="border border-white/10 bg-[#0d0d0d]"
                  >
                    <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-semibold">
                            {collection.name}
                          </h2>

                          <span
                            className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                              collection.is_active
                                ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                                : "border-white/10 bg-white/[0.04] text-white/35"
                            }`}
                          >
                            {collection.is_active ? "Active" : "Inactive"}
                          </span>

                          {collection.is_featured ? (
                            <span className="border border-violet-400/25 bg-violet-400/[0.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-300">
                              Featured
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm text-white/35">
                          /{collection.slug} · {productCount}{" "}
                          {productCount === 1 ? "product" : "products"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={toggleCollection}>
                          <input
                            type="hidden"
                            name="collection_id"
                            value={collection.id}
                          />

                          <input
                            type="hidden"
                            name="next_active"
                            value={collection.is_active ? "false" : "true"}
                          />

                          <button
                            type="submit"
                            className="flex min-h-10 items-center gap-2 border border-white/10 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 transition hover:border-white/30 hover:text-white"
                          >
                            <Power className="h-3.5 w-3.5" />

                            {collection.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>

                        <form action={deleteCollection}>
                          <input
                            type="hidden"
                            name="collection_id"
                            value={collection.id}
                          />

                          <ConfirmSubmitButton
                            label="Delete"
                            pendingLabel="Deleting..."
                            confirmation={`Delete the collection "${collection.name}"? This cannot be undone.`}
                            className="flex min-h-10 items-center gap-2 border border-red-400/20 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300 transition hover:border-red-400/45 hover:bg-red-400/[0.08]"
                          />
                        </form>
                      </div>
                    </div>

                    <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                        Collection image
                      </p>

                      <div className="mt-4 h-56 w-full max-w-[340px] overflow-hidden border border-white/10 bg-black">
                        {collection.image_url ? (
                          <img
                            src={collection.image_url}
                            alt={`${collection.name} collection`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center text-xs font-semibold uppercase tracking-[0.14em] text-white/25">
                            No collection image
                          </div>
                        )}
                      </div>
                    </div>

                    <form
                      action={updateCollection}
                      className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_140px_auto] lg:items-end"
                    >
                      <input
                        type="hidden"
                        name="collection_id"
                        value={collection.id}
                      />

                      <div>
                        <label
                          htmlFor={`collection-name-${collection.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                        >
                          Name
                        </label>

                        <input
                          id={`collection-name-${collection.id}`}
                          name="name"
                          required
                          defaultValue={collection.name}
                          className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`collection-order-${collection.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                        >
                          Display order
                        </label>

                        <input
                          id={`collection-order-${collection.id}`}
                          name="sort_order"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={collection.sort_order}
                          className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-white outline-none transition focus:border-white/45"
                        />
                      </div>

                      <button
                        type="submit"
                        className="min-h-12 bg-white px-6 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white/85"
                      >
                        Save collection
                      </button>

                      <div className="lg:col-span-3">
                        <label
                          htmlFor={`collection-image-${collection.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                        >
                          Replace collection image
                        </label>

                        <input
                          id={`collection-image-${collection.id}`}
                          name="collection_image"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="mt-3 block w-full cursor-pointer border border-dashed border-white/15 bg-black px-4 py-4 text-sm text-white/50 file:mr-4 file:border-0 file:bg-white file:px-4 file:py-2 file:text-[10px] file:font-semibold file:uppercase file:tracking-[0.14em] file:text-black"
                        />

                        <p className="mt-2 text-xs leading-5 text-white/30">
                          Leave this empty to keep the existing image. JPEG, PNG
                          or WebP, up to 10 MB.
                        </p>
                      </div>

                      <div className="lg:col-span-3">
                        <label
                          htmlFor={`collection-description-${collection.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55"
                        >
                          Description
                        </label>

                        <textarea
                          id={`collection-description-${collection.id}`}
                          name="description"
                          rows={3}
                          defaultValue={collection.description ?? ""}
                          className="mt-3 w-full resize-y border border-white/10 bg-black px-4 py-3 leading-6 text-white outline-none transition focus:border-white/45"
                        />

                        <div className="mt-4 flex flex-wrap gap-6">
                          <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-white/55">
                            <input
                              type="checkbox"
                              name="is_active"
                              defaultChecked={collection.is_active}
                              className="h-4 w-4 accent-white"
                            />
                            Active
                          </label>

                          <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-white/55">
                            <input
                              type="checkbox"
                              name="is_featured"
                              defaultChecked={collection.is_featured}
                              className="h-4 w-4 accent-white"
                            />
                            Featured collection
                          </label>
                        </div>
                      </div>
                    </form>
                  </article>
                );
              })
            )}
          </section>

          <div className="mt-7 flex items-start gap-3 border border-amber-400/20 bg-amber-400/[0.06] p-5 text-sm leading-6 text-amber-100/70">
            <Trash2 className="mt-0.5 h-4 w-4 shrink-0" />
            Collections containing products cannot be deleted. Remove or
            reassign those products first.
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
