import sharp from "sharp";

const OUTPUT_SIZE = 1600;
const PRODUCT_INSET = 150;
const CATEGORY_INSET = 80;

type StoreImageKind =
  | "product"
  | "category";

function isBackgroundPixel(
  r: number,
  g: number,
  b: number,
  a: number,
) {
  if (a < 8) {
    return true;
  }

  /*
   * Deliberately conservative.
   *
   * We remove white / nearly-white studio backgrounds,
   * but avoid destroying light-colored products.
   */
  const minimum = Math.min(r, g, b);
  const maximum = Math.max(r, g, b);

  const brightness =
    (r + g + b) / 3;

  const colorSpread =
    maximum - minimum;

  return (
    brightness >= 244 &&
    colorSpread <= 14
  );
}

/*
 * Removes only white pixels CONNECTED TO THE OUTSIDE
 * of the photograph.
 *
 * This matters because a white phone, white headphone,
 * white logo, etc. can remain white inside the subject.
 * We do not simply make every white pixel transparent.
 */
async function removeConnectedWhiteBackground(
  input: Buffer,
) {
  const prepared = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({
      resolveWithObject: true,
    });

  const {
    data,
    info,
  } = prepared;

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  if (channels !== 4) {
    throw new Error(
      "Expected RGBA image data.",
    );
  }

  const pixelCount =
    width * height;

  const visited =
    new Uint8Array(pixelCount);

  const queue =
    new Int32Array(pixelCount);

  let queueStart = 0;
  let queueEnd = 0;

  function pixelBackground(
    index: number,
  ) {
    const offset =
      index * channels;

    return isBackgroundPixel(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3],
    );
  }

  function enqueue(
    index: number,
  ) {
    if (
      index < 0 ||
      index >= pixelCount ||
      visited[index]
    ) {
      return;
    }

    if (!pixelBackground(index)) {
      return;
    }

    visited[index] = 1;
    queue[queueEnd++] = index;
  }

  /*
   * Seed flood-fill from all four edges.
   */

  for (
    let x = 0;
    x < width;
    x += 1
  ) {
    enqueue(x);

    enqueue(
      (height - 1) *
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
    queueStart <
    queueEnd
  ) {
    const index =
      queue[queueStart++];

    const x =
      index % width;

    const y =
      Math.floor(
        index / width,
      );

    if (x > 0) {
      enqueue(index - 1);
    }

    if (
      x <
      width - 1
    ) {
      enqueue(index + 1);
    }

    if (y > 0) {
      enqueue(
        index - width,
      );
    }

    if (
      y <
      height - 1
    ) {
      enqueue(
        index + width,
      );
    }
  }

  /*
   * Make only connected background pixels transparent.
   */

  for (
    let index = 0;
    index < pixelCount;
    index += 1
  ) {
    if (!visited[index]) {
      continue;
    }

    data[
      index * channels + 3
    ] = 0;
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

export async function processStoreImage({
  input,
  kind,
}: {
  input: Buffer;
  kind: StoreImageKind;
}) {
  const backgroundRemoved =
    await removeConnectedWhiteBackground(
      input,
    );

  /*
   * Transparent-edge trim.
   */

  const trimmed =
    await sharp(
      backgroundRemoved,
    )
      .trim({
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
      })
      .png()
      .toBuffer();

  const inset =
    kind === "product"
      ? PRODUCT_INSET
      : CATEGORY_INSET;

  const usableSize =
    OUTPUT_SIZE -
    inset * 2;

  /*
   * Every processed image gets the SAME:
   *
   * 1600 × 1600 transparent canvas
   * centered subject
   * proportional contain-fit
   * consistent breathing room
   */

  return sharp(trimmed)
    .resize({
      width: usableSize,
      height: usableSize,
      fit: "contain",
      withoutEnlargement:
        false,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    })
    .extend({
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    })
    .resize(
      OUTPUT_SIZE,
      OUTPUT_SIZE,
      {
        fit: "fill",
      },
    )
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer();
}
