import { Clapperboard, Film, MonitorPlay } from "lucide-react";

import { createMoviesSeriesCategory } from "@/app/admin/categories/actions";
import { createClient } from "@/lib/supabase/server";

type MoviesSeriesCategoryRow = {
  id: string;
  sort_order: number | null;
  is_active: boolean | null;
  show_on_homepage: boolean | null;
  homepage_theme: "light" | "dark" | null;
};

export default async function MoviesSeriesCategoryPanel() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("categories")
    .select("id, sort_order, is_active, show_on_homepage, homepage_theme")
    .in("slug", [
      "movies-series",
      "movies-and-series",
      "films-series",
      "films-and-series",
    ])
    .order("sort_order", { ascending: true })
    .limit(1);

  const category =
    ((data ?? [])[0] as MoviesSeriesCategoryRow | undefined) ?? null;

  const ready =
    Boolean(category) &&
    category?.is_active === true &&
    category?.show_on_homepage === true &&
    category?.homepage_theme === "dark";

  return (
    <section className="st-category-cinema">
      <div className="st-category-cinema__identity">
        <div className="st-category-cinema__icon">
          <Clapperboard aria-hidden="true" />
        </div>

        <div>
          <span>Special storefront category</span>
          <h2>Movies &amp; Series</h2>
          <p>
            Dedicated storefront experience for films and series. Keep its
            category record and presentation synchronized here.
          </p>
        </div>
      </div>

      <div className="st-category-cinema__features">
        <span>
          <Film aria-hidden="true" />
          Cinematic storefront
        </span>

        <span>
          <MonitorPlay aria-hidden="true" />
          Trailer experience
        </span>

        <span className={ready ? "is-ready" : ""}>
          {ready ? "Experience ready" : "Synchronization required"}
        </span>
      </div>

      <form action={createMoviesSeriesCategory}>
        <label>
          <span>Display order</span>
          <input
            type="number"
            name="sort_order"
            min="0"
            step="1"
            defaultValue={category?.sort_order ?? 20}
          />
        </label>

        <button type="submit">
          {category ? "Synchronize" : "Create Movies & Series"}
        </button>
      </form>
    </section>
  );
}
