import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

/* ==========================================================
   ENV
   ========================================================== */

function loadEnv(filename) {
  if (!fs.existsSync(filename)) return;

  const text = fs.readFileSync(filename, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");

    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();

    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

/* ==========================================================
   CONFIG
   ========================================================== */

const TARGETS = [
  "smart watches",
  "smartwatches",
  "gaming laptops",
  "tablets",
  "cameras",
];

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isTarget(name) {
  const normalized = normalize(name);

  return TARGETS.some(
    (target) =>
      normalized === normalize(target),
  );
}

/* ==========================================================
   IMAGE HELPERS
   ========================================================== */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function neutralLightStrength(r, g, b) {
  const brightness = (r + g + b) / 3;

  const spread =
    Math.max(r, g, b) -
    Math.min(r, g, b);

  /*
   * White / light-gray studio residue.
   * Avoids colorful product pixels.
   */
  if (brightness < 170) {
    return 0;
  }

  if (spread > 48) {
    return 0;
  }

  const bright =
    clamp(
      (brightness - 170) / 85,
      0,
      1,
    );

  const neutral =
    1 -
    clamp(
      spread / 48,
      0,
      1,
    );

  return bright * 0.72 + neutral * 0.28;
}

async function removeBoundaryHalo(input) {
  const raw =
    await sharp(input)
      .rotate()
      .ensureAlpha()
      .raw()
      .toBuffer({
        resolveWithObject: true,
      });

  const data = raw.data;
  const width = raw.info.width;
  const height = raw.info.height;
  const count = width * height;

  if (raw.info.channels !== 4) {
    throw new Error(
      "Could not convert category image to RGBA.",
    );
  }

  /*
   * Distance map from transparency.
   *
   * This is the important difference from deleting
   * all white pixels: only light pixels close to
   * transparent/background areas are attacked.
   */

  const distance =
    new Uint8Array(count);

  distance.fill(255);

  const queue =
    new Int32Array(count);

  let read = 0;
  let write = 0;

  for (let pixel = 0; pixel < count; pixel += 1) {
    const alpha =
      data[pixel * 4 + 3];

    if (alpha <= 18) {
      distance[pixel] = 0;
      queue[write++] = pixel;
    }
  }

  const maxDistance = 18;

  while (read < write) {
    const pixel = queue[read++];

    const currentDistance =
      distance[pixel];

    if (currentDistance >= maxDistance) {
      continue;
    }

    const x = pixel % width;
    const y = Math.floor(pixel / width);

    const nextDistance =
      currentDistance + 1;

    const neighbours = [];

    if (x > 0) {
      neighbours.push(pixel - 1);
    }

    if (x < width - 1) {
      neighbours.push(pixel + 1);
    }

    if (y > 0) {
      neighbours.push(pixel - width);
    }

    if (y < height - 1) {
      neighbours.push(pixel + width);
    }

    for (const neighbour of neighbours) {
      if (
        distance[neighbour] >
        nextDistance
      ) {
        distance[neighbour] =
          nextDistance;

        queue[write++] =
          neighbour;
      }
    }
  }

  /*
   * Remove white/light-gray matte residue.
   */
  for (let pixel = 0; pixel < count; pixel += 1) {
    const d = distance[pixel];

    if (
      d === 255 ||
      d > maxDistance
    ) {
      continue;
    }

    const offset =
      pixel * 4;

    const alpha =
      data[offset + 3];

    if (alpha <= 3) {
      continue;
    }

    const strength =
      neutralLightStrength(
        data[offset],
        data[offset + 1],
        data[offset + 2],
      );

    if (strength <= 0) {
      continue;
    }

    /*
     * Very aggressive at the actual cut edge,
     * then progressively weaker inward.
     */
    const proximity =
      1 -
      clamp(
        d / maxDistance,
        0,
        1,
      );

    const removal =
      clamp(
        strength *
          Math.pow(proximity, 0.62) *
          1.42,
        0,
        1,
      );

    data[offset + 3] =
      Math.round(
        alpha *
          (1 - removal),
      );
  }

  /*
   * Second micro-pass.
   *
   * Removes the thin gray/white line often left
   * directly underneath products.
   */
  for (let pixel = 0; pixel < count; pixel += 1) {
    const d = distance[pixel];

    if (d > 5) {
      continue;
    }

    const offset =
      pixel * 4;

    const alpha =
      data[offset + 3];

    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    const brightness =
      (r + g + b) / 3;

    const spread =
      Math.max(r, g, b) -
      Math.min(r, g, b);

    if (
      brightness >= 135 &&
      spread <= 38 &&
      alpha < 245
    ) {
      const amount =
        d <= 2
          ? 0.84
          : d <= 4
            ? 0.56
            : 0.32;

      data[offset + 3] =
        Math.round(
          alpha *
            (1 - amount),
        );
    }
  }

  return sharp(
    data,
    {
      raw: {
        width,
        height,
        channels: 4,
      },
    },
  )
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer();
}

async function trimAndNormalize(input) {
  let trimmed = input;

  try {
    trimmed =
      await sharp(input)
        .trim({
          background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0,
          },
          threshold: 3,
        })
        .png()
        .toBuffer();
  } catch {
    // Keep current buffer if trim finds nothing.
  }

  const targetWidth = 2200;
  const targetHeight = 1450;

  const resized =
    await sharp(trimmed)
      .resize({
        width: 2040,
        height: 1270,
        fit: "inside",
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();

  const metadata =
    await sharp(resized).metadata();

  const width =
    metadata.width ?? 2040;

  const height =
    metadata.height ?? 1270;

  return sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 4,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    },
  })
    .composite([
      {
        input: resized,

        left: Math.round(
          (targetWidth - width) / 2,
        ),

        top: Math.round(
          (targetHeight - height) / 2,
        ),
      },
    ])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer();
}

async function downloadImage(url) {
  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Unable to download image (${response.status}).`,
    );
  }

  return Buffer.from(
    await response.arrayBuffer(),
  );
}

/* ==========================================================
   RUN
   ========================================================== */

console.log("");
console.log(
  "======================================================",
);
console.log(
  " TARGETED CATEGORY IMAGE CLEANUP",
);
console.log(
  "======================================================",
);

const {
  data: categories,
  error: categoryError,
} =
  await supabase
    .from("categories")
    .select(
      "id,name,slug,image_url",
    )
    .not(
      "image_url",
      "is",
      null,
    );

if (categoryError) {
  throw categoryError;
}

const matched =
  (categories ?? []).filter(
    (category) =>
      isTarget(
        category.name,
      ),
  );

console.log("");
console.log(
  `Found ${matched.length} matching categories.`,
);

for (const category of matched) {
  try {
    console.log("");
    console.log(
      `→ ${category.name}`,
    );

    if (!category.image_url) {
      console.log(
        "  skipped: no image",
      );

      continue;
    }

    const original =
      await downloadImage(
        category.image_url,
      );

    const cleaned =
      await removeBoundaryHalo(
        original,
      );

    const finalImage =
      await trimAndNormalize(
        cleaned,
      );

    const safeSlug =
      normalize(
        category.slug ||
          category.name ||
          category.id,
      )
        .replace(/\s+/g, "-");

    const storagePath =
      `precision-clean/${safeSlug}/${category.id}-${Date.now()}.png`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          "category-images",
        )
        .upload(
          storagePath,
          finalImage,
          {
            contentType:
              "image/png",

            cacheControl:
              "31536000",

            upsert:
              false,
          },
        );

    if (uploadError) {
      throw uploadError;
    }

    const publicUrl =
      supabase.storage
        .from(
          "category-images",
        )
        .getPublicUrl(
          storagePath,
        )
        .data
        .publicUrl;

    const {
      error: updateError,
    } =
      await supabase
        .from(
          "categories",
        )
        .update({
          image_url:
            publicUrl,

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
      "  ✓ white halo/shadow cleaned",
    );

    console.log(
      "  ✓ transparent PNG normalized",
    );
  } catch (error) {
    console.error(
      `  ✗ ${category.name}`,
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );
  }
}

console.log("");
console.log(
  "======================================================",
);
console.log(
  " TARGETED CLEANUP COMPLETE",
);
console.log(
  "======================================================",
);
