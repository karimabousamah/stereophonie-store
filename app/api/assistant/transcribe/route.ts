/*
 * ST_ASSISTANT_PAID_TRANSCRIPTION_DISABLED_V1
 *
 * Stereophonie uses free on-device transcription instead.
 * This endpoint deliberately makes no provider or model calls.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Cloud voice transcription is disabled. " +
        "Please use on-device dictation.",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
