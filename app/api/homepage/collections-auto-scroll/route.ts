import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("homepage_settings")
      .select("collections_auto_scroll_enabled, collections_auto_scroll_speed")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.error("Could not load collection auto-scroll setting:", error);

      return NextResponse.json(
        {
          enabled: true,
          speed: "normal",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        enabled: data?.collections_auto_scroll_enabled !== false,
        speed:
          data?.collections_auto_scroll_speed === "slow" ||
          data?.collections_auto_scroll_speed === "fast"
            ? data.collections_auto_scroll_speed
            : "normal",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Collection auto-scroll settings API failed:", error);

    return NextResponse.json(
      {
        enabled: true,
        speed: "normal",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
