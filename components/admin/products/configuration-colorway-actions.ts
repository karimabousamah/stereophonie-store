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

  const { data: existingByName, error: existingNameError } =
    await administrator.supabase
      .from("admin_custom_colors")
      .select("id, name, hex_value")
      .ilike("name", name)
      .maybeSingle();

  if (existingNameError) {
    return {
      ok: false,
      error: existingNameError.message,
    };
  }

  if (existingByName) {
    return {
      ok: true,
      created: false,
      colorway: {
        id: existingByName.id,
        name: existingByName.name,
        hex: existingByName.hex_value.toUpperCase(),
      },
    };
  }

  const { data: existingByHex, error: existingHexError } =
    await administrator.supabase
      .from("admin_custom_colors")
      .select("id, name, hex_value")
      .ilike("hex_value", hex)
      .maybeSingle();

  if (existingHexError) {
    return {
      ok: false,
      error: existingHexError.message,
    };
  }

  if (existingByHex) {
    return {
      ok: false,
      error: `That exact color is already saved as "${existingByHex.name}".`,
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
