import {
  Clapperboard,
  Check,
  CircleAlert,
  Film,
  MonitorPlay,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createMoviesSeriesCategory } from "@/app/admin/categories/actions";

type MoviesSeriesCategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  show_on_homepage: boolean | null;
  homepage_theme: "light" | "dark" | null;
};

function StatusPill({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex min-h-8 items-center gap-2 rounded-[10px] border px-3",
        "text-[11px] font-semibold tracking-[-0.01em]",
        active
          ? "border-[#f5b335]/35 bg-[#fff7e4] text-[#1d1d1f]"
          : "border-black/[0.08] bg-[#f7f7f8] text-black/45",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-[2px]",
          active ? "bg-[#f5b335]" : "bg-black/20",
        ].join(" ")}
        aria-hidden="true"
      />

      {children}
    </span>
  );
}

export default async function MoviesSeriesCategoryPanel() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(
      `
        id,
        name,
        slug,
        sort_order,
        is_active,
        show_on_homepage,
        homepage_theme
      `,
    )
    .in("slug", [
      "movies-series",
      "movies-and-series",
      "films-series",
      "films-and-series",
    ])
    .order("sort_order", {
      ascending: true,
    })
    .limit(1);

  const category =
    ((data ?? [])[0] as MoviesSeriesCategoryRow | undefined) ?? null;

  const ready =
    Boolean(category) &&
    category?.is_active === true &&
    category?.show_on_homepage === true &&
    category?.homepage_theme === "dark";

  return (
    <section className="mb-7 overflow-hidden rounded-[26px] border border-black/[0.075] bg-white shadow-[0_18px_55px_rgba(29,29,31,0.045)]">
      <div className="grid lg:grid-cols-[1.16fr_0.84fr]">
        <div className="relative overflow-hidden p-4 sm:p-5">
          <div
            className="pointer-events-none absolute right-[-85px] top-[-105px] h-[270px] w-[270px] rounded-full bg-[#f5b335]/[0.08] blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] border border-[#f5b335]/30 bg-[#fff7e3]">
                  <Clapperboard className="h-5 w-5 text-[#1d1d1f]" />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
                      Special storefront experience
                    </span>

                    <Sparkles className="h-3.5 w-3.5 text-[#b97700]" />
                  </div>

                  <h2 className="text-[25px] font-semibold tracking-[-0.045em] text-[#1d1d1f] sm:text-[29px]">
                    Movies &amp; Series
                  </h2>

                  <p className="mt-2 max-w-[690px] text-sm leading-6 text-black/50">
                    A dedicated cinematic category with its own homepage
                    experience, trailer carousel and sourcing page. It is not
                    treated as a normal add-to-cart product department.
                  </p>
                </div>
              </div>

              <div
                className={[
                  "inline-flex min-h-9 items-center gap-2 rounded-[11px] border px-3.5",
                  "text-[10px] font-semibold uppercase tracking-[0.16em]",
                  ready
                    ? "border-emerald-500/20 bg-emerald-50 text-emerald-700"
                    : "border-[#f5b335]/35 bg-[#fff8e8] text-[#8a5b00]",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2 w-2 rounded-[3px]",
                    ready ? "bg-emerald-500" : "bg-[#f5b335]",
                  ].join(" ")}
                />

                {ready
                  ? "Experience ready"
                  : category
                    ? "Needs synchronization"
                    : "Not created"}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusPill active={Boolean(category)}>
                Category record
              </StatusPill>

              <StatusPill active={category?.is_active === true}>
                Active
              </StatusPill>

              <StatusPill active={category?.show_on_homepage === true}>
                Homepage
              </StatusPill>

              <StatusPill active={category?.homepage_theme === "dark"}>
                Dark theme
              </StatusPill>

              <StatusPill active={Boolean(category)}>/movies-series</StatusPill>
            </div>

            {error ? (
              <div className="mt-6 flex items-start gap-3 rounded-[16px] border border-red-500/15 bg-red-50/70 p-4 text-sm text-red-700">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />

                <div>
                  <strong className="block font-semibold">
                    Category status could not be loaded
                  </strong>

                  <span className="mt-1 block text-red-700/75">
                    {error.message}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-black/[0.065] bg-[#fafafa] p-4">
                <Film className="h-4 w-4 text-black/55" />

                <strong className="mt-5 block text-sm font-semibold text-[#1d1d1f]">
                  Cinematic homepage
                </strong>

                <p className="mt-1.5 text-xs leading-5 text-black/45">
                  Dedicated black entertainment presentation with featured
                  posters.
                </p>
              </div>

              <div className="rounded-[18px] border border-black/[0.065] bg-[#fafafa] p-4">
                <MonitorPlay className="h-4 w-4 text-black/55" />

                <strong className="mt-5 block text-sm font-semibold text-[#1d1d1f]">
                  Trailer experience
                </strong>

                <p className="mt-1.5 text-xs leading-5 text-black/45">
                  Poster selection transitions into a trailer preview after the
                  viewing delay.
                </p>
              </div>

              <div className="rounded-[18px] border border-black/[0.065] bg-[#fafafa] p-4">
                <Check className="h-4 w-4 text-black/55" />

                <strong className="mt-5 block text-sm font-semibold text-[#1d1d1f]">
                  Sourcing workflow
                </strong>

                <p className="mt-1.5 text-xs leading-5 text-black/45">
                  Customers request availability and price instead of adding
                  entertainment titles to cart.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-black/[0.07] bg-[#fafafa] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
              Homepage control
            </span>

            <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.035em] text-[#1d1d1f]">
              {category ? "Synchronize experience." : "Create the experience."}
            </h3>

            <p className="mt-2 text-sm leading-6 text-black/48">
              This uses the same display-order system as the rest of your
              homepage categories.
            </p>
          </div>

          <form action={createMoviesSeriesCategory} className="mt-6">
            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                Display order
              </span>

              <input
                type="number"
                name="sort_order"
                min="0"
                step="1"
                defaultValue={category?.sort_order ?? 20}
                className="h-12 w-full rounded-[14px] border border-black/[0.09] bg-white px-4 text-sm font-medium text-[#1d1d1f] outline-none transition focus:border-[#f5b335] focus:ring-4 focus:ring-[#f5b335]/10"
              />
            </label>

            <button
              type="submit"
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#f5b335] bg-[#f5b335] px-5 text-sm font-semibold text-[#1d1d1f] shadow-[0_10px_28px_rgba(245,179,53,0.18)] transition hover:bg-[#eaaa2b]"
            >
              <Clapperboard className="h-4 w-4" />

              {category ? "Repair & synchronize" : "Create Movies & Series"}
            </button>
          </form>

          <div className="mt-5 border-t border-black/[0.06] pt-5">
            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-black/42">Canonical slug</dt>
                <dd className="font-medium text-[#1d1d1f]">movies-series</dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-black/42">Homepage theme</dt>
                <dd className="font-medium text-[#1d1d1f]">Dark</dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-black/42">Commerce mode</dt>
                <dd className="font-medium text-[#1d1d1f]">
                  Inquiry / sourcing
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-black/42">Customer route</dt>
                <dd className="font-medium text-[#1d1d1f]">/movies-series</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
