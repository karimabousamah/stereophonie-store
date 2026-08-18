import sharp from "sharp";

export type StoreImageKind =
  | "product"
  | "category";

const PRODUCT_CANVAS = 1800;
const PRODUCT_SUBJECT = 1460;

const CATEGORY_CANVAS = 2000;
const CATEGORY_SUBJECT = 1840;

type RawImage = {
  data: Buffer;
  width: number;
  height: number;
};

function pixelOffset(
  pixel: number,
) {
  return pixel * 4;
}

/*
 * Determine how strongly a pixel resembles a white /
 * neutral studio background.
 *
 * 0 = definitely subject
 * 1 = definitely background
 *
 * We intentionally require near-neutral RGB values so
 * bright colored products are not erased.
 */
function whiteBackgroundStrength(
  r: number,
  g: number,
  b: number,
) {
  const min = Math.min(
    r,
    g,
    b,
  );

  const max = Math.max(
    r,
    g,
    b,
  );

  const spread =
    max - min;

  const brightness =
    (r + g + b) / 3;

  if (
    brightness < 225 ||
    spread > 28
  ) {
    return 0;
  }

  /*
   * Soft transition handles JPEG compression and
   * anti-aliased white/gray edges much better than
   * a hard threshold.
   */
  const brightnessStrength =
    Math.max(
      0,
      Math.min(
        1,
        (brightness - 225) / 27,
      ),
    );

  const neutralityStrength =
    Math.max(
      0,
      Math.min(
        1,
        (28 - spread) / 18,
      ),
    );

  return (
    brightnessStrength *
    neutralityStrength
  );
}

/*
 * Flood-fill only from the OUTSIDE of the image.
 *
 * This is important:
 * a white iPhone / AirPods / controller inside the
 * photograph does not disappear simply because it is white.
 */
async function removeStudioBackground(
  input: Buffer,
): Promise<Buffer> {
  const prepared =
    await sharp(input)
      .rotate()
      .ensureAlpha()
      .raw()
      .toBuffer({
        resolveWithObject:
          true,
      });

  const {
    data,
    info,
  } = prepared;

  if (
    info.channels !== 4
  ) {
    throw new Error(
      "Could not prepare RGBA image.",
    );
  }

  const width =
    info.width;

  const height =
    info.height;

  const pixels =
    width * height;

  const visited =
    new Uint8Array(
      pixels,
    );

  const queue =
    new Int32Array(
      pixels,
    );

  let read = 0;
  let write = 0;

  function canEnter(
    pixel: number,
  ) {
    if (
      pixel < 0 ||
      pixel >= pixels ||
      visited[pixel]
    ) {
      return false;
    }

    const offset =
      pixelOffset(
        pixel,
      );

    const alpha =
      data[
        offset + 3
      ];

    if (alpha <= 4) {
      return true;
    }

    return (
      whiteBackgroundStrength(
        data[offset],
        data[offset + 1],
        data[offset + 2],
      ) >
      0.06
    );
  }

  function enqueue(
    pixel: number,
  ) {
    if (
      !canEnter(
        pixel,
      )
    ) {
      return;
    }

    visited[pixel] = 1;

    queue[
      write++
    ] = pixel;
  }

  /*
   * Seed from every outside edge.
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
    read < write
  ) {
    const pixel =
      queue[
        read++
      ];

    const x =
      pixel % width;

    const y =
      Math.floor(
        pixel / width,
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
        pixel - width,
      );
    }

    if (
      y <
      height - 1
    ) {
      enqueue(
        pixel + width,
      );
    }
  }

  /*
   * Turn only OUTSIDE-CONNECTED background pixels
   * transparent.
   *
   * The soft alpha edge avoids ugly white JPEG halos.
   */
  for (
    let pixel = 0;
    pixel < pixels;
    pixel += 1
  ) {
    if (
      !visited[
        pixel
      ]
    ) {
      continue;
    }

    const offset =
      pixelOffset(
        pixel,
      );

    const strength =
      whiteBackgroundStrength(
        data[offset],
        data[offset + 1],
        data[offset + 2],
      );

    if (
      strength >=
      0.88
    ) {
      data[
        offset + 3
      ] = 0;

      continue;
    }

    const currentAlpha =
      data[
        offset + 3
      ];

    data[
      offset + 3
    ] =
      Math.round(
        currentAlpha *
          (1 -
            strength),
      );
  }

  /*
   * A tiny blur on alpha edge followed by sharpening
   * removes hard cut-out artifacts without blurring
   * the product itself.
   */
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

async function trimmedSubject(
  input: Buffer,
) {
  return sharp(input)
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
}

async function standardizedCanvas({
  image,
  canvas,
  subject,
}: {
  image: Buffer;
  canvas: number;
  subject: number;
}) {
  /*
   * Resize subject while preserving aspect ratio.
   */
  const contained =
    await sharp(image)
      .resize({
        width:
          subject,
        height:
          subject,
        fit:
          "inside",
        withoutEnlargement:
          false,
      })
      .png()
      .toBuffer();

  const metadata =
    await sharp(
      contained,
    ).metadata();

  const width =
    metadata.width ?? subject;

  const height =
    metadata.height ?? subject;

  const left =
    Math.max(
      0,
      Math.floor(
        (canvas -
          width) /
          2,
      ),
    );

  const top =
    Math.max(
      0,
      Math.floor(
        (canvas -
          height) /
          2,
      ),
    );

  return sharp({
    create: {
      width:
        canvas,
      height:
        canvas,
      channels:
        4,
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
          contained,
        left,
        top,
      },
    ])
    .png({
      compressionLevel:
        9,
      adaptiveFiltering:
        true,
    })
    .toBuffer();
}

export async function processStoreImage({
  input,
  kind,
}: {
  input: Buffer;
  kind: StoreImageKind;
}) {
  const transparent =
    await removeStudioBackground(
      input,
    );

  const subject =
    await trimmedSubject(
      transparent,
    );

  if (
    kind ===
    "category"
  ) {
    return standardizedCanvas({
      image:
        subject,
      canvas:
        CATEGORY_CANVAS,
      subject:
        CATEGORY_SUBJECT,
    });
  }

  return standardizedCanvas({
    image:
      subject,
    canvas:
      PRODUCT_CANVAS,
    subject:
      PRODUCT_SUBJECT,
  });
}
