"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin/categories";
const MEDIA_BUCKET = "homepage-images";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type MoviesSeriesActionResult = {
  ok: boolean;
  message: string;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type EntertainmentRow = {
  id: string;
  slug: string;
  title: string;
  kind: "Movie" | "Series";
  year: string;
  genre: string;
  tagline: string;
  poster_url: string;
  poster_storage_path: string | null;
  backdrop_url: string;
  backdrop_storage_path: string | null;
  trailer_url: string;
  trailer_storage_path: string | null;
  sort_order: number;
  is_active: boolean;
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

async function requireAdministrator() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: administrator, error } =
    await supabase
      .from("admin_users")
      .select("is_active")
      .eq("user_id", userId)
      .single();

  if (error || !administrator?.is_active) {
    redirect("/admin/login");
  }

  return supabase;
}

function requiredText(
  formData: FormData,
  key: string,
  label: string,
) {
  const value =
    String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

function optionalFile(
  formData: FormData,
  key: string,
) {
  const value = formData.get(key);

  if (
    value instanceof File &&
    value.size > 0
  ) {
    return value;
  }

  return null;
}

function imageExtension(file: File) {
  const type = file.type.toLowerCase();

  if (type === "image/jpeg" || type === "image/jpg") {
    return "jpg";
  }

  if (type === "image/png") {
    return "png";
  }

  if (type === "image/webp") {
    return "webp";
  }

  if (type === "image/avif") {
    return "avif";
  }

  return null;
}

function videoExtension(file: File) {
  const type = file.type.toLowerCase();

  if (type === "video/mp4") {
    return "mp4";
  }

  if (type === "video/webm") {
    return "webm";
  }

  return null;
}

async function uploadEntertainmentImage({
  supabase,
  file,
  slug,
  role,
}: {
  supabase: SupabaseClient;
  file: File;
  slug: string;
  role: "poster" | "backdrop";
}) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `${role === "poster" ? "Poster" : "Backdrop"} images must be smaller than 10 MB.`,
    );
  }

  const extension = imageExtension(file);

  if (!extension) {
    throw new Error(
      "Entertainment images must be JPG, PNG, WEBP or AVIF.",
    );
  }

  const path =
    `movies-series/${slug}/` +
    `${role}-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const bytes =
    new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType: file.type.toLowerCase(),
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(
      `${role === "poster" ? "Poster" : "Backdrop"} upload failed: ${error.message}`,
    );
  }

  const { data } = supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
  };
}

async function uploadEntertainmentTrailer({
  supabase,
  file,
  slug,
}: {
  supabase: SupabaseClient;
  file: File;
  slug: string;
}) {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      "Trailer videos must be smaller than 50 MB.",
    );
  }

  const extension = videoExtension(file);

  if (!extension) {
    throw new Error(
      "Trailer videos must be MP4 or WEBM.",
    );
  }

  const path =
    `movies-series/${slug}/` +
    `trailer-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const bytes =
    new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType: file.type.toLowerCase(),
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(
      `Trailer upload failed: ${error.message}`,
    );
  }

  const { data } = supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
  };
}

async function removeStoragePaths(
  supabase: SupabaseClient,
  paths: Array<string | null | undefined>,
) {
  const clean = paths.filter(
    (value): value is string =>
      typeof value === "string" &&
      value.trim().length > 0,
  );

  if (!clean.length) {
    return;
  }

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove(clean);

  if (error) {
    console.error(
      "Movies & Series media cleanup failed:",
      error,
    );
  }
}

function refreshEntertainment() {
  revalidatePath("/");
  revalidatePath("/movies-series");
  revalidatePath(ADMIN_PATH);
}

async function uniqueSlug(
  supabase: SupabaseClient,
  title: string,
  year: string,
) {
  const base =
    slugify(title) || "entertainment-title";

  const candidates = [
    base,
    slugify(`${title}-${year}`),
    `${base}-${crypto.randomUUID().slice(0, 8)}`,
  ];

  for (const candidate of candidates) {
    const { data } = await supabase
      .from("entertainment_titles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomUUID()}`;
}

export async function createEntertainmentTitle(
  formData: FormData,
): Promise<MoviesSeriesActionResult> {
  const supabase = await requireAdministrator();

  const uploadedPaths: string[] = [];

  // MOVIES_SERIES_INSERT_AFTER_ORDERING
  const shiftedOrders: Array<{
    id: string;
    sortOrder: number;
  }> = [];

  try {
    const title =
      requiredText(formData, "title", "Title");

    const kindInput =
      String(formData.get("kind") ?? "Movie");

    const kind: "Movie" | "Series" =
      kindInput === "Series"
        ? "Series"
        : "Movie";

    const year =
      requiredText(formData, "year", "Year");

    const genre =
      requiredText(formData, "genre", "Genre");

    const tagline =
      requiredText(
        formData,
        "tagline",
        "Short description",
      );

    const poster =
      optionalFile(formData, "poster");

    const backdrop =
      optionalFile(formData, "backdrop");

    const trailer =
      optionalFile(formData, "trailer");

    if (!poster) {
      throw new Error(
        "Choose a poster image.",
      );
    }

    if (!backdrop) {
      throw new Error(
        "Choose a cinematic backdrop image.",
      );
    }

    if (!trailer) {
      throw new Error(
        "Choose a trailer video.",
      );
    }

    const slug =
      await uniqueSlug(
        supabase,
        title,
        year,
      );

    const posterMedia =
      await uploadEntertainmentImage({
        supabase,
        file: poster,
        slug,
        role: "poster",
      });

    uploadedPaths.push(posterMedia.path);

    const backdropMedia =
      await uploadEntertainmentImage({
        supabase,
        file: backdrop,
        slug,
        role: "backdrop",
      });

    uploadedPaths.push(backdropMedia.path);

    const trailerMedia =
      await uploadEntertainmentTrailer({
        supabase,
        file: trailer,
        slug,
      });

    uploadedPaths.push(trailerMedia.path);

    const insertAfterId =
      String(
        formData.get("insert_after_id") ?? "",
      ).trim();

    const {
      data: orderedRows,
      error: orderError,
    } =
      await supabase
        .from("entertainment_titles")
        .select(
          "id,sort_order,created_at",
        )
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        });

    if (orderError) {
      throw new Error(
        `Title order could not be prepared: ${orderError.message}`,
      );
    }

    const rows =
      orderedRows ?? [];

    const lastOrder =
      rows.length > 0
        ? Number(
            rows[
              rows.length - 1
            ].sort_order ??
              rows.length - 1,
          )
        : -1;

    let sortOrder =
      lastOrder + 1;

    if (insertAfterId) {
      const afterIndex =
        rows.findIndex(
          (row) =>
            row.id === insertAfterId,
        );

      if (afterIndex >= 0) {
        const afterOrder =
          Number(
            rows[
              afterIndex
            ].sort_order ??
              afterIndex,
          );

        sortOrder =
          afterOrder + 1;

        /*
         * Shift later siblings from bottom to top.
         *
         * Doing this in reverse order also remains safe if
         * sort_order is uniquely constrained.
         */
        const laterRows =
          rows
            .slice(
              afterIndex + 1,
            )
            .reverse();

        for (
          const row
          of laterRows
        ) {
          const originalOrder =
            Number(
              row.sort_order ??
                rows.findIndex(
                  (candidate) =>
                    candidate.id ===
                    row.id,
                ),
            );

          const shifted =
            await supabase
              .from(
                "entertainment_titles",
              )
              .update({
                sort_order:
                  originalOrder + 1,

                updated_at:
                  new Date()
                    .toISOString(),
              })
              .eq(
                "id",
                row.id,
              );

          if (shifted.error) {
            throw new Error(
              `Title order could not be shifted: ${shifted.error.message}`,
            );
          }

          shiftedOrders.push({
            id: row.id,
            sortOrder:
              originalOrder,
          });
        }
      }
    }

    const { error } = await supabase
      .from("entertainment_titles")
      .insert({
        slug,
        title,
        kind,
        year,
        genre,
        tagline,

        poster_url: posterMedia.url,
        poster_storage_path: posterMedia.path,

        backdrop_url: backdropMedia.url,
        backdrop_storage_path:
          backdropMedia.path,

        trailer_url: trailerMedia.url,
        trailer_storage_path:
          trailerMedia.path,

        sort_order: sortOrder,

        is_active:
          formData.get("is_active") === "on",
      });

    if (error) {
      throw new Error(error.message);
    }

    refreshEntertainment();

    return {
      ok: true,
      message: `${title} was added successfully.`,
    };
  } catch (error) {
    /*
     * If insertion failed after siblings were shifted,
     * restore their original sort_order values.
     */
    if (shiftedOrders.length) {
      const rollbackRows =
        [...shiftedOrders]
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder,
          );

      for (
        const row
        of rollbackRows
      ) {
        await supabase
          .from(
            "entertainment_titles",
          )
          .update({
            sort_order:
              row.sortOrder,
          })
          .eq(
            "id",
            row.id,
          );
      }
    }

    await removeStoragePaths(
      supabase,
      uploadedPaths,
    );

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The title could not be added.",
    };
  }
}

export async function updateEntertainmentTitle(
  formData: FormData,
): Promise<MoviesSeriesActionResult> {
  const supabase = await requireAdministrator();

  const id =
    String(formData.get("title_id") ?? "").trim();

  if (!id) {
    return {
      ok: false,
      message:
        "The Movies & Series title could not be identified.",
    };
  }

  const { data: current, error: currentError } =
    await supabase
      .from("entertainment_titles")
      .select("*")
      .eq("id", id)
      .single();

  if (currentError || !current) {
    return {
      ok: false,
      message:
        "The Movies & Series title could not be loaded.",
    };
  }

  const row = current as EntertainmentRow;

  const newPaths: string[] = [];

  try {
    const title =
      requiredText(formData, "title", "Title");

    const kindInput =
      String(formData.get("kind") ?? "Movie");

    const kind: "Movie" | "Series" =
      kindInput === "Series"
        ? "Series"
        : "Movie";

    const year =
      requiredText(formData, "year", "Year");

    const genre =
      requiredText(formData, "genre", "Genre");

    const tagline =
      requiredText(
        formData,
        "tagline",
        "Short description",
      );

    const poster =
      optionalFile(formData, "poster");

    const backdrop =
      optionalFile(formData, "backdrop");

    const trailer =
      optionalFile(formData, "trailer");

    let posterUrl = row.poster_url;
    let posterPath =
      row.poster_storage_path;

    let backdropUrl = row.backdrop_url;
    let backdropPath =
      row.backdrop_storage_path;

    let trailerUrl = row.trailer_url;
    let trailerPath =
      row.trailer_storage_path;

    if (poster) {
      const media =
        await uploadEntertainmentImage({
          supabase,
          file: poster,
          slug: row.slug,
          role: "poster",
        });

      posterUrl = media.url;
      posterPath = media.path;

      newPaths.push(media.path);
    }

    if (backdrop) {
      const media =
        await uploadEntertainmentImage({
          supabase,
          file: backdrop,
          slug: row.slug,
          role: "backdrop",
        });

      backdropUrl = media.url;
      backdropPath = media.path;

      newPaths.push(media.path);
    }

    if (trailer) {
      const media =
        await uploadEntertainmentTrailer({
          supabase,
          file: trailer,
          slug: row.slug,
        });

      trailerUrl = media.url;
      trailerPath = media.path;

      newPaths.push(media.path);
    }

    const { error } = await supabase
      .from("entertainment_titles")
      .update({
        title,
        kind,
        year,
        genre,
        tagline,

        poster_url: posterUrl,
        poster_storage_path: posterPath,

        backdrop_url: backdropUrl,
        backdrop_storage_path:
          backdropPath,

        trailer_url: trailerUrl,
        trailer_storage_path:
          trailerPath,

        is_active:
          formData.get("is_active") === "on",

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const replacedPaths: string[] = [];

    if (
      poster &&
      row.poster_storage_path
    ) {
      replacedPaths.push(
        row.poster_storage_path,
      );
    }

    if (
      backdrop &&
      row.backdrop_storage_path
    ) {
      replacedPaths.push(
        row.backdrop_storage_path,
      );
    }

    if (
      trailer &&
      row.trailer_storage_path
    ) {
      replacedPaths.push(
        row.trailer_storage_path,
      );
    }

    await removeStoragePaths(
      supabase,
      replacedPaths,
    );

    refreshEntertainment();

    return {
      ok: true,
      message: `${title} was updated successfully.`,
    };
  } catch (error) {
    await removeStoragePaths(
      supabase,
      newPaths,
    );

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The title could not be updated.",
    };
  }
}

export async function deleteEntertainmentTitle(
  idInput: string,
): Promise<MoviesSeriesActionResult> {
  const supabase = await requireAdministrator();

  const id =
    String(idInput ?? "").trim();

  if (!id) {
    return {
      ok: false,
      message:
        "The Movies & Series title could not be identified.",
    };
  }

  const { data: current, error: currentError } =
    await supabase
      .from("entertainment_titles")
      .select(
        `
          title,
          poster_storage_path,
          backdrop_storage_path,
          trailer_storage_path
        `,
      )
      .eq("id", id)
      .single();

  if (currentError || !current) {
    return {
      ok: false,
      message:
        "The title could not be loaded.",
    };
  }

  const { error } = await supabase
    .from("entertainment_titles")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await removeStoragePaths(
    supabase,
    [
      current.poster_storage_path,
      current.backdrop_storage_path,
      current.trailer_storage_path,
    ],
  );

  refreshEntertainment();

  return {
    ok: true,
    message: `${current.title} was removed.`,
  };
}

export async function toggleEntertainmentTitle(
  idInput: string,
  nextActiveInput: boolean,
): Promise<MoviesSeriesActionResult> {
  const supabase = await requireAdministrator();

  const id =
    String(idInput ?? "").trim();

  if (!id) {
    return {
      ok: false,
      message:
        "The Movies & Series title could not be identified.",
    };
  }

  const nextActive =
    Boolean(nextActiveInput);

  const { data, error } = await supabase
    .from("entertainment_titles")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("title")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message:
        error?.message ??
        "The title status could not be changed.",
    };
  }

  refreshEntertainment();

  return {
    ok: true,
    message: nextActive
      ? `${data.title} is now visible.`
      : `${data.title} is now hidden.`,
  };
}

export async function moveEntertainmentTitle(
  idInput: string,
  directionInput: "up" | "down",
): Promise<MoviesSeriesActionResult> {
  const supabase = await requireAdministrator();

  const id =
    String(idInput ?? "").trim();

  const direction =
    directionInput === "up"
      ? "up"
      : "down";

  const { data, error } = await supabase
    .from("entertainment_titles")
    .select("id,title,sort_order")
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    return {
      ok: false,
      message:
        `Title order could not be loaded: ${error.message}`,
    };
  }

  const rows = data ?? [];

  const index =
    rows.findIndex(
      (row) => row.id === id,
    );

  if (index < 0) {
    return {
      ok: false,
      message:
        "The title could not be found.",
    };
  }

  const targetIndex =
    direction === "up"
      ? index - 1
      : index + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= rows.length
  ) {
    return {
      ok: true,
      message:
        "The title is already at the end of the list.",
    };
  }

  const current = rows[index];
  const target = rows[targetIndex];

  const currentOrder =
    Number(current.sort_order ?? index);

  const targetOrder =
    Number(
      target.sort_order ?? targetIndex,
    );

  const first = await supabase
    .from("entertainment_titles")
    .update({
      sort_order: targetOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);

  if (first.error) {
    return {
      ok: false,
      message: first.error.message,
    };
  }

  const second = await supabase
    .from("entertainment_titles")
    .update({
      sort_order: currentOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id);

  if (second.error) {
    await supabase
      .from("entertainment_titles")
      .update({
        sort_order: currentOrder,
      })
      .eq("id", current.id);

    return {
      ok: false,
      message: second.error.message,
    };
  }

  refreshEntertainment();

  return {
    ok: true,
    message: `${current.title} was reordered.`,
  };
}
