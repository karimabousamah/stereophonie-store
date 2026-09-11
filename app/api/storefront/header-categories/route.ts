import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 300;

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,sort_order")
    .eq("is_active", true)

    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Header categories could not load:", error);

    return NextResponse.json(
      {
        categories: [],
        error: "Categories unavailable",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      categories: data ?? [],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
