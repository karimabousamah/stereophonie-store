import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing from .env.local",
  );
}

if (!supabaseSecret) {
  throw new Error(
    "SUPABASE_SECRET_KEY is missing from .env.local",
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseSecret,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const bucket = "category-images";

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupDir = path.resolve(
  ".stereophonie-backups",
  `category-image-webp-migration-${timestamp}`,
);

await fs.mkdir(
  backupDir,
  {
    recursive: true,
  },
);

function safeSlug(value) {
  return String(value || "category")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function prettyBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "unknown";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)} MB`;
}

async function downloadImage(url) {
  const started = Date.now();

  const response = await fetch(
    url,
    {
      signal:
        AbortSignal.timeout(
          30000,
        ),
      cache:
        "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  return {
    buffer:
      Buffer.from(
        arrayBuffer,
      ),
    milliseconds:
      Date.now() -
      started,
    contentType:
      response.headers.get(
        "content-type",
      ),
  };
}

console.log("");
console.log(
  "==========================================================",
);
console.log(
  " STEREOPHONIE — EXISTING CATEGORY IMAGE MIGRATION",
);
console.log(
  "==========================================================",
);
console.log("");

const {
  data: categories,
  error: categoryError,
} = await supabase
  .from("categories")
  .select(
    `
      id,
      name,
      slug,
      image_url,
      show_on_homepage,
      homepage_theme,
      sort_order
    `,
  )
  .order(
    "sort_order",
    {
      ascending: true,
    },
  );

if (categoryError) {
  throw categoryError;
}

const rows =
  categories ?? [];

await fs.writeFile(
  path.join(
    backupDir,
    "categories-before.json",
  ),
  JSON.stringify(
    rows,
    null,
    2,
  ),
  "utf8",
);

console.log(
  `✓ Database backup written to:`,
);
console.log(
  `  ${backupDir}/categories-before.json`,
);
console.log("");

const candidates =
  rows.filter(
    (category) =>
      Boolean(
        category.image_url,
      ),
  );

console.log(
  `Found ${candidates.length} categories with artwork.`,
);
console.log("");

let migrated = 0;
let skipped = 0;
let failed = 0;

let totalOriginalBytes = 0;
let totalWebpBytes = 0;

const report = [];

for (
  const category
  of candidates
) {
  console.log(
    "----------------------------------------------------------",
  );
  console.log(
    category.name,
  );

  const originalUrl =
    String(
      category.image_url,
    );

  /*
   * Already migrated through this exact migration.
   * Leave it untouched.
   */
  if (
    originalUrl.includes(
      "/optimized-webp/",
    )
  ) {
    console.log(
      "✓ Already migrated — skipping",
    );

    skipped += 1;

    report.push({
      id:
        category.id,
      name:
        category.name,
      status:
        "already-migrated",
      oldUrl:
        originalUrl,
      newUrl:
        originalUrl,
    });

    continue;
  }

  try {
    console.log(
      "Downloading existing artwork...",
    );

    const downloaded =
      await downloadImage(
        originalUrl,
      );

    const originalBytes =
      downloaded.buffer.length;

    totalOriginalBytes +=
      originalBytes;

    console.log(
      `✓ Downloaded ${prettyBytes(originalBytes)} in ${downloaded.milliseconds}ms`,
    );

    /*
     * Existing images already went through your category
     * background-removal / canvas pipeline.
     *
     * We DO NOT run background removal again.
     * We only re-encode the already prepared artwork.
     */
    const image =
      sharp(
        downloaded.buffer,
        {
          failOn:
            "none",
        },
      );

    const metadata =
      await image.metadata();

    const maximumWidth =
      1600;

    const needsResize =
      typeof metadata.width ===
        "number" &&
      metadata.width >
        maximumWidth;

    const webp =
      await image
        .resize(
          needsResize
            ? {
                width:
                  maximumWidth,
                withoutEnlargement:
                  true,
              }
            : undefined,
        )
        .webp({
          quality:
            88,
          alphaQuality:
            92,
          effort:
            5,
          smartSubsample:
            true,
        })
        .toBuffer();

    const webpBytes =
      webp.length;

    totalWebpBytes +=
      webpBytes;

    const reduction =
      originalBytes > 0
        ? (
            100 -
            (
              webpBytes /
              originalBytes
            ) *
              100
          )
        : 0;

    console.log(
      `✓ WebP prepared: ${prettyBytes(webpBytes)}`,
    );

    console.log(
      `✓ Transfer reduction: ${reduction.toFixed(1)}%`,
    );

    const slug =
      safeSlug(
        category.slug ||
          category.name,
      );

    const storagePath =
      `optimized-webp/${slug}/${category.id}-${Date.now()}.webp`;

    console.log(
      "Uploading optimized copy...",
    );

    const {
      error:
        uploadError,
    } =
      await supabase
        .storage
        .from(
          bucket,
        )
        .upload(
          storagePath,
          webp,
          {
            contentType:
              "image/webp",
            cacheControl:
              "31536000",
            upsert:
              false,
          },
        );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data:
        publicUrlData,
    } =
      supabase
        .storage
        .from(
          bucket,
        )
        .getPublicUrl(
          storagePath,
        );

    const newUrl =
      publicUrlData
        .publicUrl;

    /*
     * Verify the newly uploaded file BEFORE changing DB.
     */
    console.log(
      "Verifying uploaded WebP...",
    );

    const verification =
      await fetch(
        newUrl,
        {
          signal:
            AbortSignal.timeout(
              30000,
            ),
          cache:
            "no-store",
        },
      );

    if (
      !verification.ok
    ) {
      throw new Error(
        `New image verification failed: HTTP ${verification.status}`,
      );
    }

    console.log(
      "✓ New file reachable",
    );

    /*
     * Only now change the category row.
     */
    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "categories",
        )
        .update({
          image_url:
            newUrl,
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          category.id,
        );

    if (updateError) {
      throw updateError;
    }

    console.log(
      "✓ Database URL updated",
    );

    console.log(
      "✓ Original image preserved for rollback",
    );

    migrated += 1;

    report.push({
      id:
        category.id,
      name:
        category.name,
      status:
        "migrated",
      originalBytes,
      webpBytes,
      reductionPercent:
        Number(
          reduction.toFixed(
            2,
          ),
        ),
      oldUrl:
        originalUrl,
      newUrl,
      storagePath,
    });
  } catch (error) {
    failed += 1;

    const message =
      error instanceof
      Error
        ? error.message
        : String(
            error,
          );

    console.error(
      `✗ FAILED: ${message}`,
    );

    report.push({
      id:
        category.id,
      name:
        category.name,
      status:
        "failed",
      oldUrl:
        originalUrl,
      error:
        message,
    });
  }
}

await fs.writeFile(
  path.join(
    backupDir,
    "migration-report.json",
  ),
  JSON.stringify(
    report,
    null,
    2,
  ),
  "utf8",
);

const totalReduction =
  totalOriginalBytes > 0
    ? 100 -
      (
        totalWebpBytes /
        totalOriginalBytes
      ) *
        100
    : 0;

console.log("");
console.log(
  "==========================================================",
);
console.log(
  " MIGRATION COMPLETE",
);
console.log(
  "==========================================================",
);
console.log("");

console.log(
  `Migrated: ${migrated}`,
);
console.log(
  `Skipped:  ${skipped}`,
);
console.log(
  `Failed:   ${failed}`,
);

console.log("");

console.log(
  `Original transferred size: ${prettyBytes(totalOriginalBytes)}`,
);

console.log(
  `New transferred size:      ${prettyBytes(totalWebpBytes)}`,
);

if (
  totalOriginalBytes >
    0
) {
  console.log(
    `Total reduction:           ${totalReduction.toFixed(1)}%`,
  );
}

console.log("");

console.log(
  "✓ Old Supabase objects were NOT deleted.",
);

console.log(
  "✓ Database backup exists.",
);

console.log(
  "✓ Migration report exists.",
);

console.log("");

console.log(
  `Backup: ${backupDir}`,
);

console.log("");
