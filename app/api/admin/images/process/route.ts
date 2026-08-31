import { NextRequest, NextResponse } from "next/server";

import { processStoreImage } from "@/lib/stereophonie-v3/images/process-store-image";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const file = form.get("file");

    const rawKind = String(form.get("kind") ?? "product");

    const kind = rawKind === "category" ? "category" : "product";

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Image file is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "Only image files are supported.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: "Image is too large.",
        },
        {
          status: 413,
        },
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const processed = await processStoreImage({
      input: Buffer.from(arrayBuffer),
      kind,
    });

    return new NextResponse(new Uint8Array(processed), {
      status: 200,
      headers: {
        "Content-Type": "image/png",

        "Cache-Control": "no-store",

        "X-Stereophonie-Image": "processed",
      },
    });
  } catch (error) {
    console.error("Image processing failed:", error);

    return NextResponse.json(
      {
        error: "Could not process image.",
      },
      {
        status: 500,
      },
    );
  }
}
