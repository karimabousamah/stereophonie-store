import fs from "node:fs";
import path from "node:path";

import {
  createClient,
} from "@supabase/supabase-js";

import sharp from "sharp";

function loadEnvironmentFile(
  filename,
) {
  if (
    !fs.existsSync(
      filename,
    )
  ) {
    return;
  }

  const source =
    fs.readFileSync(
      filename,
      "utf8",
    );

  for (
    const rawLine of
    source.split(
      /\r?\n/,
    )
  ) {
    const line =
      rawLine.trim();

    if (
      !line ||
      line.startsWith(
        "#",
      )
    ) {
      continue;
    }

    const separator =
      line.indexOf(
        "=",
      );

    if (
      separator < 1
    ) {
      continue;
    }

    const key =
      line
        .slice(
          0,
          separator,
        )
        .trim();

    let value =
      line
        .slice(
          separator + 1,
        )
        .trim();

    if (
      (
        value.startsWith(
          '"',
        ) &&
        value.endsWith(
          '"',
        )
      ) ||
      (
        value.startsWith(
          "'",
        ) &&
        value.endsWith(
          "'",
        )
      )
    ) {
      value =
        value.slice(
          1,
          -1,
        );
    }

    if (
      !process.env[
        key
      ]
    ) {
      process.env[
        key
      ] = value;
    }
  }
}

loadEnvironmentFile(
  path.join(
    process.cwd(),
    ".env.local",
  ),
);

loadEnvironmentFile(
  path.join(
    process.cwd(),
    ".env",
  ),
);

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecret =
  process.env
    .SUPABASE_SECRET_KEY;

if (
  !supabaseUrl ||
  !supabaseSecret
) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is missing.",
  );
}

const supabase =
  createClient(
    supabaseUrl,
    supabaseSecret,
    {
      auth: {
        persistSession:
          false,
        autoRefreshToken:
          false,
      },
    },
  );

function clamp(
  value,
  min,
  max,
) {
  return Math.max(
    min,
    Math.min(
      max,
      value,
    ),
  );
}

function pixelOffset(
  pixel,
) {
  return (
    pixel * 4
  );
}

async function prepareRgba(
  input,
) {
  const result =
    await sharp(
      input,
    )
      .rotate()
      .ensureAlpha()
      .raw()
      .toBuffer({
        resolveWithObject:
          true,
      });

  return {
    data:
      result.data,
    width:
      result.info.width,
    height:
      result.info.height,
  };
}

function sampleBackgroundColor(
  prepared,
) {
  const {
    data,
    width,
    height,
  } = prepared;

  const samples = [];

  const size =
    Math.max(
      2,
      Math.floor(
        Math.min(
          width,
          height,
        ) *
          0.025,
      ),
    );

  function collect(
    startX,
    startY,
  ) {
    for (
      let y = startY;
      y <
      Math.min(
        height,
        startY +
          size,
      );
      y += 1
    ) {
      for (
        let x = startX;
        x <
        Math.min(
          width,
          startX +
            size,
        );
        x += 1
      ) {
        const offset =
          (
            y * width +
            x
          ) * 4;

        if (
          data[
            offset + 3
          ] <
          200
        ) {
          continue;
        }

        samples.push([
          data[offset],
          data[
            offset + 1
          ],
          data[
            offset + 2
          ],
        ]);
      }
    }
  }

  collect(
    0,
    0,
  );

  collect(
    Math.max(
      0,
      width - size,
    ),
    0,
  );

  collect(
    0,
    Math.max(
      0,
      height - size,
    ),
  );

  collect(
    Math.max(
      0,
      width - size,
    ),
    Math.max(
      0,
      height - size,
    ),
  );

  const usable =
    samples.filter(
      ([r, g, b]) => {
        const brightness =
          (
            r +
            g +
            b
          ) / 3;

        const spread =
          Math.max(
            r,
            g,
            b,
          ) -
          Math.min(
            r,
            g,
            b,
          );

        return (
          brightness >=
            185 &&
          spread <=
            60
        );
      },
    );

  const source =
    usable.length
      ? usable
      : samples;

  if (
    !source.length
  ) {
    return {
      r: 255,
      g: 255,
      b: 255,
    };
  }

  const total =
    source.reduce(
      (
        result,
        [r, g, b],
      ) => {
        result.r += r;
        result.g += g;
        result.b += b;

        return result;
      },
      {
        r: 0,
        g: 0,
        b: 0,
      },
    );

  return {
    r:
      total.r /
      source.length,

    g:
      total.g /
      source.length,

    b:
      total.b /
      source.length,
  };
}

function strength(
  r,
  g,
  b,
  background,
) {
  const brightness =
    (
      r +
      g +
      b
    ) / 3;

  const spread =
    Math.max(
      r,
      g,
      b,
    ) -
    Math.min(
      r,
      g,
      b,
    );

  if (
    brightness <
      185 ||
    spread >
      65
  ) {
    return 0;
  }

  const dr =
    r -
    background.r;

  const dg =
    g -
    background.g;

  const db =
    b -
    background.b;

  const distance =
    Math.sqrt(
      dr * dr +
      dg * dg +
      db * db,
    );

  return (
    (
      1 -
      clamp(
        distance /
          105,
        0,
        1,
      )
    ) *
      0.46 +
    clamp(
      (
        brightness -
        185
      ) / 70,
      0,
      1,
    ) *
      0.36 +
    (
      1 -
      clamp(
        spread /
          65,
        0,
        1,
      )
    ) *
      0.18
  );
}

async function removeBackground(
  input,
) {
  const prepared =
    await prepareRgba(
      input,
    );

  const {
    data,
    width,
    height,
  } = prepared;

  const background =
    sampleBackgroundColor(
      prepared,
    );

  const count =
    width * height;

  const visited =
    new Uint8Array(
      count,
    );

  const queue =
    new Int32Array(
      count,
    );

  let read = 0;
  let write = 0;

  function canEnter(
    pixel,
  ) {
    if (
      pixel < 0 ||
      pixel >= count ||
      visited[pixel]
    ) {
      return false;
    }

    const offset =
      pixelOffset(
        pixel,
      );

    if (
      data[
        offset + 3
      ] < 10
    ) {
      return true;
    }

    return (
      strength(
        data[offset],
        data[
          offset + 1
        ],
        data[
          offset + 2
        ],
        background,
      ) >=
      0.42
    );
  }

  function enqueue(
    pixel,
  ) {
    if (
      !canEnter(
        pixel,
      )
    ) {
      return;
    }

    visited[pixel] = 1;
    queue[write] =
      pixel;
    write += 1;
  }

  for (
    let x = 0;
    x < width;
    x += 1
  ) {
    enqueue(x);

    enqueue(
      (
        height - 1
      ) *
        width +
        x,
    );
  }

  for (
    let y = 0;
    y < height;
    y += 1
  ) {
    enqueue(
      y * width,
    );

    enqueue(
      y * width +
        width -
        1,
    );
  }

  while (
    read < write
  ) {
    const pixel =
      queue[read];

    read += 1;

    const x =
      pixel %
      width;

    const y =
      Math.floor(
        pixel /
          width,
      );

    if (x > 0) {
      enqueue(
        pixel - 1,
      );
    }

    if (
      x <
      width - 1
    ) {
      enqueue(
        pixel + 1,
      );
    }

    if (y > 0) {
      enqueue(
        pixel -
          width,
      );
    }

    if (
      y <
      height - 1
    ) {
      enqueue(
        pixel +
          width,
      );
    }
  }

  for (
    let pixel = 0;
    pixel < count;
    pixel += 1
  ) {
    if (
      !visited[pixel]
    ) {
      continue;
    }

    const offset =
      pixelOffset(
        pixel,
      );

    const amount =
      clamp(
        (
          strength(
            data[offset],
            data[
              offset + 1
            ],
            data[
              offset + 2
            ],
            background,
          ) -
          0.34
        ) /
          0.48,
        0,
        1,
      );

    data[
      offset + 3
    ] =
      Math.round(
        data[
          offset + 3
        ] *
          (
            1 -
            amount
          ),
      );
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
    .png()
    .toBuffer();
}

async function trim(
  input,
) {
  try {
    return await sharp(
      input,
    )
      .trim({
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
        threshold: 4,
      })
      .png()
      .toBuffer();
  } catch {
    return input;
  }
}

async function productCanvas(
  input,
) {
  const size =
    1800;

  const resized =
    await sharp(
      input,
    )
      .resize({
        width: 1500,
        height: 1500,
        fit: "inside",
      })
      .png()
      .toBuffer();

  const meta =
    await sharp(
      resized,
    ).metadata();

  const width =
    meta.width ?? 1500;

  const height =
    meta.height ?? 1500;

  return sharp({
    create: {
      width: size,
      height: size,
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
        input:
          resized,
        left:
          Math.round(
            (
              size -
              width
            ) / 2,
          ),
        top:
          Math.round(
            (
              size -
              height
            ) / 2,
          ),
      },
    ])
    .png({
      compressionLevel: 9,
    })
    .toBuffer();
}

async function categoryCanvas(
  input,
) {
  const width =
    2200;

  const height =
    1450;

  const resized =
    await sharp(
      input,
    )
      .resize({
        width: 2020,
        height: 1270,
        fit: "inside",
      })
      .png()
      .toBuffer();

  const meta =
    await sharp(
      resized,
    ).metadata();

  const subjectWidth =
    meta.width ?? 2020;

  const subjectHeight =
    meta.height ?? 1270;

  return sharp({
    create: {
      width,
      height,
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
        input:
          resized,
        left:
          Math.round(
            (
              width -
              subjectWidth
            ) / 2,
          ),
        top:
          Math.round(
            (
              height -
              subjectHeight
            ) / 2,
          ),
      },
    ])
    .png({
      compressionLevel: 9,
    })
    .toBuffer();
}

async function processImage(
  buffer,
  kind,
) {
  const transparent =
    await removeBackground(
      buffer,
    );

  const trimmed =
    await trim(
      transparent,
    );

  return kind ===
    "category"
    ? categoryCanvas(
        trimmed,
      )
    : productCanvas(
        trimmed,
      );
}

async function download(
  url,
) {
  const response =
    await fetch(url);

  if (
    !response.ok
  ) {
    throw new Error(
      `Download failed (${response.status})`,
    );
  }

  return Buffer.from(
    await response.arrayBuffer(),
  );
}

function publicUrl(
  bucket,
  storagePath,
) {
  return supabase.storage
    .from(bucket)
    .getPublicUrl(
      storagePath,
    )
    .data
    .publicUrl;
}

async function processCategories() {
  console.log("");
  console.log(
    "CATEGORY IMAGES",
  );
  console.log(
    "------------------------------------------",
  );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "categories",
      )
      .select(
        "id,name,slug,image_url",
      )
      .not(
        "image_url",
        "is",
        null,
      );

  if (error) {
    throw error;
  }

  for (
    const category of
    data ?? []
  ) {
    if (
      !category.image_url
    ) {
      continue;
    }

    try {
      console.log(
        `Processing category: ${category.name}`,
      );

      const original =
        await download(
          category.image_url,
        );

      const processed =
        await processImage(
          original,
          "category",
        );

      const safeSlug =
        String(
          category.slug ||
            category.id,
        )
          .toLowerCase()
          .replace(
            /[^a-z0-9-]/g,
            "-",
          );

      const storagePath =
        `processed/${safeSlug}/${category.id}-${Date.now()}.png`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "category-images",
          )
          .upload(
            storagePath,
            processed,
            {
              contentType:
                "image/png",
              cacheControl:
                "31536000",
              upsert:
                false,
            },
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      const imageUrl =
        publicUrl(
          "category-images",
          storagePath,
        );

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
              imageUrl,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            category.id,
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      console.log(
        "  ✓ transparent PNG saved",
      );
    } catch (error) {
      console.error(
        `  ✗ ${category.name}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }
}

async function processProducts() {
  console.log("");
  console.log(
    "PRODUCT IMAGES",
  );
  console.log(
    "------------------------------------------",
  );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "product_images",
      )
      .select(
        "id,product_id,image_url,storage_path",
      )
      .not(
        "image_url",
        "is",
        null,
      );

  if (error) {
    throw error;
  }

  for (
    const image of
    data ?? []
  ) {
    if (
      !image.image_url
    ) {
      continue;
    }

    try {
      console.log(
        `Processing product image ${image.id}`,
      );

      const original =
        await download(
          image.image_url,
        );

      const processed =
        await processImage(
          original,
          "product",
        );

      const storagePath =
        `processed/${image.product_id}/${image.id}-${Date.now()}.png`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "product-images",
          )
          .upload(
            storagePath,
            processed,
            {
              contentType:
                "image/png",
              cacheControl:
                "31536000",
              upsert:
                false,
            },
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      const imageUrl =
        publicUrl(
          "product-images",
          storagePath,
        );

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "product_images",
          )
          .update({
            image_url:
              imageUrl,
            storage_path:
              storagePath,
          })
          .eq(
            "id",
            image.id,
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      console.log(
        "  ✓ transparent PNG saved",
      );
    } catch (error) {
      console.error(
        `  ✗ ${image.id}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }
}

console.log("");
console.log(
  "======================================================",
);
console.log(
  " REPROCESSING EXISTING STOREFRONT IMAGES",
);
console.log(
  "======================================================",
);

await processCategories();
await processProducts();

console.log("");
console.log(
  "======================================================",
);
console.log(
  " IMAGE MIGRATION FINISHED",
);
console.log(
  "======================================================",
);
console.log("");
console.log(
  "Old originals were intentionally NOT deleted.",
);
console.log(
  "Database rows now point to processed transparent PNGs.",
);
