"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminCustomColorway = {
  id: string;
  name: string;
  hex: string;
};

export type CustomColorwayResult =
  | {
      ok: true;
      colorway: AdminCustomColorway;
      created: boolean;
    }
  | {
      ok: false;
      error: string;
    };

function normalizeName(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.charAt(0).toLocaleUpperCase() + cleaned.slice(1);
}

function normalizeHex(value: unknown) {
  const cleaned = String(value ?? "")
    .trim()
    .toUpperCase();

  if (!/^#[0-9A-F]{6}$/.test(cleaned)) {
    return "";
  }

  return cleaned;
}

async function requireAdministrator() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const { data: administrator, error } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (error || !administrator?.is_active) {
    return null;
  }

  return {
    supabase,
    userId,
  };
}

export async function listCustomColorways(): Promise<
  | {
      ok: true;
      colorways: AdminCustomColorway[];
    }
  | {
      ok: false;
      error: string;
    }
> {
  const administrator = await requireAdministrator();

  if (!administrator) {
    return {
      ok: false,
      error: "Administrator authentication is required.",
    };
  }

  const { data, error } = await administrator.supabase
    .from("admin_custom_colors")
    .select("id, name, hex_value")
    .order("created_at", { ascending: true });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    colorways: (data ?? []).map((colorway) => ({
      id: colorway.id,
      name: colorway.name,
      hex: colorway.hex_value.toUpperCase(),
    })),
  };
}

export async function createCustomColorway(
  rawName: string,
  rawHex: string,
): Promise<CustomColorwayResult> {
  const administrator = await requireAdministrator();

  if (!administrator) {
    return {
      ok: false,
      error: "Administrator authentication is required.",
    };
  }

  const name = normalizeName(rawName);
  const hex = normalizeHex(rawHex);

  if (!name) {
    return {
      ok: false,
      error: "Enter a colorway name.",
    };
  }

  if (name.length > 80) {
    return {
      ok: false,
      error: "Colorway name must be 80 characters or fewer.",
    };
  }

  if (!hex) {
    return {
      ok: false,
      error: "Choose a valid color.",
    };
  }

  const { data: existingMatches, error: existingMatchError } =
    await administrator.supabase
      .from("admin_custom_colors")
      .select("id, name, hex_value")
      .eq("hex_value", hex);

  if (existingMatchError) {
    return {
      ok: false,
      error: existingMatchError.message,
    };
  }

  const existingExactPair = (existingMatches ?? []).find(
    (colorway) =>
      colorway.name.trim().toLocaleLowerCase() ===
        name.trim().toLocaleLowerCase() &&
      colorway.hex_value.trim().toLocaleLowerCase() ===
        hex.trim().toLocaleLowerCase(),
  );

  if (existingExactPair) {
    return {
      ok: true,
      created: false,
      colorway: {
        id: existingExactPair.id,
        name: existingExactPair.name,
        hex: existingExactPair.hex_value.toUpperCase(),
      },
    };
  }

  const { data, error } = await administrator.supabase
    .from("admin_custom_colors")
    .insert({
      name,
      hex_value: hex,
      created_by: administrator.userId,
    })
    .select("id, name, hex_value")
    .single();

  if (error?.code === "23505") {
    const { data: concurrentMatches, error: concurrentMatchError } =
      await administrator.supabase
        .from("admin_custom_colors")
        .select("id, name, hex_value")
        .eq("hex_value", hex);

    if (concurrentMatchError) {
      return {
        ok: false,
        error: concurrentMatchError.message,
      };
    }

    const concurrentExactPair = (concurrentMatches ?? []).find(
      (colorway) =>
        colorway.name.trim().toLocaleLowerCase() ===
          name.trim().toLocaleLowerCase() &&
        colorway.hex_value.trim().toLocaleLowerCase() ===
          hex.trim().toLocaleLowerCase(),
    );

    if (concurrentExactPair) {
      return {
        ok: true,
        created: false,
        colorway: {
          id: concurrentExactPair.id,
          name: concurrentExactPair.name,
          hex: concurrentExactPair.hex_value.toUpperCase(),
        },
      };
    }
  }

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "The colorway could not be saved.",
    };
  }

  return {
    ok: true,
    created: true,
    colorway: {
      id: data.id,
      name: data.name,
      hex: data.hex_value.toUpperCase(),
    },
  };
}

export async function deleteCustomColorway(colorwayId: string): Promise<
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const administrator = await requireAdministrator();

  if (!administrator) {
    return {
      ok: false,
      error: "Administrator authentication is required.",
    };
  }

  const id = String(colorwayId ?? "").trim();

  if (!id) {
    return {
      ok: false,
      error: "Invalid colorway.",
    };
  }

  const { error } = await administrator.supabase
    .from("admin_custom_colors")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
  };
}
