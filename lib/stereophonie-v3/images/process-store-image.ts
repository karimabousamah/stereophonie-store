import sharp from "sharp";
export type StoreImageKind = "product" | "category";

type ProcessStoreImageOptions = {
  input: Buffer;
  kind: StoreImageKind;
};

type PreparedImage = {
  data: Buffer;
  width: number;
  height: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

async function prepareRgba(input: Buffer): Promise<PreparedImage> {
  const result = await sharp(input).rotate().ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });

  if (result.info.channels !== 4) {
    throw new Error("Image could not be converted to RGBA.");
  }

  return {
    data: result.data,
    width: result.info.width,
    height: result.info.height,
  };
}

function pixelOffset(pixel: number) {
  return pixel * 4;
}

function sampleBackgroundColor({ data, width, height }: PreparedImage) {
  const samples: Array<[number, number, number]> = [];

  const sampleSize = Math.max(2, Math.floor(Math.min(width, height) * 0.025));

  function collect(startX: number, startY: number) {
    for (let y = startY; y < Math.min(height, startY + sampleSize); y += 1) {
      for (let x = startX; x < Math.min(width, startX + sampleSize); x += 1) {
        const offset = (y * width + x) * 4;

        const alpha = data[offset + 3];

        if (alpha < 200) {
          continue;
        }

        samples.push([data[offset], data[offset + 1], data[offset + 2]]);
      }
    }
  }

  collect(0, 0);

  collect(Math.max(0, width - sampleSize), 0);

  collect(0, Math.max(0, height - sampleSize));

  collect(Math.max(0, width - sampleSize), Math.max(0, height - sampleSize));

  if (!samples.length) {
    return {
      r: 255,
      g: 255,
      b: 255,
    };
  }

  const brightSamples = samples.filter(([r, g, b]) => {
    const brightness = (r + g + b) / 3;

    const spread = Math.max(r, g, b) - Math.min(r, g, b);

    return brightness >= 185 && spread <= 60;
  });

  const chosen = brightSamples.length ? brightSamples : samples;

  const average = chosen.reduce(
    (totals, [r, g, b]) => {
      totals.r += r;
      totals.g += g;
      totals.b += b;

      return totals;
    },
    {
      r: 0,
      g: 0,
      b: 0,
    },
  );

  return {
    r: average.r / chosen.length,

    g: average.g / chosen.length,

    b: average.b / chosen.length,
  };
}

function backgroundStrength(
  r: number,
  g: number,
  b: number,
  background: {
    r: number;
    g: number;
    b: number;
  },
) {
  const brightness = (r + g + b) / 3;

  const spread = Math.max(r, g, b) - Math.min(r, g, b);

  if (brightness < 185 || spread > 65) {
    return 0;
  }

  const dr = r - background.r;

  const dg = g - background.g;

  const db = b - background.b;

  const distance = Math.sqrt(dr * dr + dg * dg + db * db);

  const colorMatch = 1 - clamp(distance / 105, 0, 1);

  const whiteStrength = clamp((brightness - 185) / 70, 0, 1);

  const neutrality = 1 - clamp(spread / 65, 0, 1);

  return colorMatch * 0.46 + whiteStrength * 0.36 + neutrality * 0.18;
}

async function removeConnectedBackground(input: Buffer) {
  const prepared = await prepareRgba(input);

  const { data, width, height } = prepared;

  const background = sampleBackgroundColor(prepared);

  const totalPixels = width * height;

  const visited = new Uint8Array(totalPixels);

  const queue = new Int32Array(totalPixels);

  let readIndex = 0;
  let writeIndex = 0;

  function canEnter(pixel: number) {
    if (pixel < 0 || pixel >= totalPixels || visited[pixel]) {
      return false;
    }

    const offset = pixelOffset(pixel);

    if (data[offset + 3] < 10) {
      return true;
    }

    const strength = backgroundStrength(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      background,
    );

    return strength >= 0.42;
  }

  function enqueue(pixel: number) {
    if (!canEnter(pixel)) {
      return;
    }

    visited[pixel] = 1;

    queue[writeIndex] = pixel;

    writeIndex += 1;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);

    enqueue((height - 1) * width + x);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);

    enqueue(y * width + width - 1);
  }

  while (readIndex < writeIndex) {
    const pixel = queue[readIndex];

    readIndex += 1;

    const x = pixel % width;

    const y = Math.floor(pixel / width);

    if (x > 0) {
      enqueue(pixel - 1);
    }

    if (x < width - 1) {
      enqueue(pixel + 1);
    }

    if (y > 0) {
      enqueue(pixel - width);
    }

    if (y < height - 1) {
      enqueue(pixel + width);
    }
  }

  for (let pixel = 0; pixel < totalPixels; pixel += 1) {
    if (!visited[pixel]) {
      continue;
    }

    const offset = pixelOffset(pixel);

    const strength = backgroundStrength(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      background,
    );

    const originalAlpha = data[offset + 3];

    const removal = clamp((strength - 0.34) / 0.48, 0, 1);

    data[offset + 3] = Math.round(originalAlpha * (1 - removal));
  }

  return sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

function productBackgroundDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;

  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function productLocalContrast(
  data: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
) {
  const offset = pixelOffset(y * width + x);

  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];

  const neighbours = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const;

  let maximumDifference = 0;

  for (const [dx, dy] of neighbours) {
    const nx = x + dx;
    const ny = y + dy;

    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }

    const neighbourOffset = pixelOffset(ny * width + nx);

    const difference = productBackgroundDistance(
      r,
      g,
      b,
      data[neighbourOffset],
      data[neighbourOffset + 1],
      data[neighbourOffset + 2],
    );

    maximumDifference = Math.max(maximumDifference, difference);
  }

  return maximumDifference;
}

async function productImageHasTransparency(input: Buffer) {
  const metadata = await sharp(input).metadata();

  if (!metadata.hasAlpha) {
    return false;
  }

  const prepared = await prepareRgba(input);

  const totalPixels = prepared.width * prepared.height;

  if (totalPixels <= 0) {
    return false;
  }

  let transparentPixels = 0;

  for (let pixel = 0; pixel < totalPixels; pixel += 1) {
    const alpha = prepared.data[pixelOffset(pixel) + 3];

    if (alpha < 245) {
      transparentPixels += 1;
    }
  }

  return transparentPixels / totalPixels > 0.001;
}

async function trimTransparentSpace(input: Buffer) {
  try {
    return await sharp(input)
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

async function productCanvas(input: Buffer) {
  const canvasSize = 1800;

  const subjectSize = 1500;

  const resized = await sharp(input)
    .resize({
      width: subjectSize,
      height: subjectSize,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const metadata = await sharp(resized).metadata();

  const width = metadata.width ?? subjectSize;

  const height = metadata.height ?? subjectSize;

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
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
        left: Math.round((canvasSize - width) / 2),
        top: Math.round((canvasSize - height) / 2),
      },
    ])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer();
}

async function categoryCanvas(input: Buffer) {
  /*
   * Homepage category artwork does not need a 2200px source.
   *
   * 1800 × 1186 keeps the same approximate aspect ratio,
   * preserves Retina-quality rendering, transparency and
   * background removal while reducing transferred/storage size.
   */
  const canvasWidth = 1800;

  const canvasHeight = 1186;

  const resized = await sharp(input)
    .resize({
      width: 1640,
      height: 1040,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const metadata = await sharp(resized).metadata();

  const width = metadata.width ?? 1640;

  const height = metadata.height ?? 1040;

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
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
        left: Math.round((canvasWidth - width) / 2),
        top: Math.round((canvasHeight - height) / 2),
      },
    ])
    .webp({
      quality: 88,
      alphaQuality: 90,
      effort: 5,
      smartSubsample: true,
    })
    .toBuffer();
}

export async function processStoreImage({
  input,
  kind,
}: ProcessStoreImageOptions) {
  if (kind === "product") {
    /*
     * PRODUCT PHOTOS — PRESERVE SOURCE
     *
     * Automatic background removal is intentionally disabled.
     *
     * Product uploads keep the complete photograph:
     * - no AI segmentation;
     * - no white-background detection;
     * - no flood fill;
     * - no generated transparency;
     * - no RGB manipulation.
     *
     * Existing transparency in PNG/WebP uploads is preserved.
     * We only normalize orientation before using the existing
     * Stereophonie product canvas.
     */
    const preserved = await sharp(input)
      .rotate()
      .ensureAlpha()
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer();

    return productCanvas(preserved);
  }

  const transparent = await removeConnectedBackground(input);

  const trimmed = await trimTransparentSpace(transparent);

  return categoryCanvas(trimmed);
}
