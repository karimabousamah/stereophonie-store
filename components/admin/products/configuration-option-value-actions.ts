"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminProductOptionValue = {
  id: string;
  optionKey: string;
  value: string;
};

type ListProductOptionValuesResult =
  | {
      ok: true;
      values: AdminProductOptionValue[];
    }
  | {
      ok: false;
      error: string;
    };

type CreateProductOptionValueResult =
  | {
      ok: true;
      value: AdminProductOptionValue;
      created: boolean;
    }
  | {
      ok: false;
      error: string;
    };

type RenameProductOptionValueResult =
  | {
      ok: true;
      value: AdminProductOptionValue;
    }
  | {
      ok: false;
      error: string;
    };

function normalizeOptionKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeValue(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
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

export async function listProductOptionValues(
  rawOptionKey: string,
): Promise<ListProductOptionValuesResult> {
  const administrator = await requireAdministrator();

  if (!administrator) {
    return {
      ok: false,
      error: "Administrator authentication is required.",
    };
  }

  const optionKey = normalizeOptionKey(rawOptionKey);

  if (!optionKey) {
    return {
      ok: false,
      error: "Invalid product option.",
    };
  }

  const { data, error } = await administrator.supabase
    .from("admin_product_option_values")
    .select("id, option_key, value")
    .eq("option_key", optionKey)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    values: (data ?? []).map((item) => ({
      id: item.id,
      optionKey: item.option_key,
      value: item.value,
    })),
  };
}

export async function renameProductOptionValue(
  rawOptionKey: string,
  valueId: string,
  rawValue: string,
): Promise<RenameProductOptionValueResult> {
  const administrator = await requireAdministrator();

  if (!administrator) {
    return {
      ok: false,
      error: "Administrator authentication is required.",
    };
  }

  const optionKey = normalizeOptionKey(rawOptionKey);
  const normalizedId = String(valueId ?? "").trim();
  const value = normalizeValue(rawValue);

  if (!optionKey || !normalizedId) {
    return {
      ok: false,
      error: "Invalid product option.",
    };
  }

  if (!value) {
    return {
      ok: false,
      error: "Enter an option value.",
    };
  }

  if (value.length > 160) {
    return {
      ok: false,
      error: "Product option value must be 160 characters or fewer.",
    };
  }

  const { data: currentValue, error: currentError } =
    await administrator.supabase
      .from("admin_product_option_values")
      .select("id, option_key, value")
      .eq("id", normalizedId)
      .eq("option_key", optionKey)
      .maybeSingle();

  if (currentError) {
    return {
      ok: false,
      error: currentError.message,
    };
  }

  if (!currentValue) {
    return {
      ok: false,
      error: "This reusable option value no longer exists.",
    };
  }

  const { data: existingValues, error: existingError } =
    await administrator.supabase
      .from("admin_product_option_values")
      .select("id, option_key, value")
      .eq("option_key", optionKey);

  if (existingError) {
    return {
      ok: false,
      error: existingError.message,
    };
  }

  const duplicate = (existingValues ?? []).find(
    (item) =>
      item.id !== normalizedId &&
      normalizeValue(item.value).toLocaleLowerCase() ===
        value.toLocaleLowerCase(),
  );

  if (duplicate) {
    return {
      ok: false,
      error: `“${value}” already exists for this product option.`,
    };
  }

  const { data, error } = await administrator.supabase
    .from("admin_product_option_values")
    .update({ value })
    .eq("id", normalizedId)
    .eq("option_key", optionKey)
    .select("id, option_key, value")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error:
        error?.message ??
        "The reusable product option value could not be renamed.",
    };
  }

  return {
    ok: true,
    value: {
      id: data.id,
      optionKey: data.option_key,
      value: data.value,
    },
  };
}

export async function createProductOptionValue(
  rawOptionKey: string,
  rawValue: string,
): Promise<CreateProductOptionValueResult> {
  const administrator = await requireAdministrator();

  if (!administrator) {
    return {
      ok: false,
      error: "Administrator authentication is required.",
    };
  }

  const optionKey = normalizeOptionKey(rawOptionKey);
  const value = normalizeValue(rawValue);

  if (!optionKey) {
    return {
      ok: false,
      error: "Invalid product option.",
    };
  }

  if (!value) {
    return {
      ok: false,
      error: "Enter an option value.",
    };
  }

  if (optionKey.length > 120) {
    return {
      ok: false,
      error: "Product option name is too long.",
    };
  }

  if (value.length > 160) {
    return {
      ok: false,
      error: "Product option value must be 160 characters or fewer.",
    };
  }

  const { data: existingValues, error: existingError } =
    await administrator.supabase
      .from("admin_product_option_values")
      .select("id, option_key, value")
      .eq("option_key", optionKey);

  if (existingError) {
    return {
      ok: false,
      error: existingError.message,
    };
  }

  const existing = (existingValues ?? []).find(
    (item) =>
      normalizeValue(item.value).toLocaleLowerCase() ===
      value.toLocaleLowerCase(),
  );

  if (existing) {
    return {
      ok: true,
      created: false,
      value: {
        id: existing.id,
        optionKey: existing.option_key,
        value: existing.value,
      },
    };
  }

  const { data, error } = await administrator.supabase
    .from("admin_product_option_values")
    .insert({
      option_key: optionKey,
      value,
      created_by: administrator.userId,
    })
    .select("id, option_key, value")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      const { data: concurrentValues, error: concurrentError } =
        await administrator.supabase
          .from("admin_product_option_values")
          .select("id, option_key, value")
          .eq("option_key", optionKey);

      if (!concurrentError) {
        const concurrentValue = (concurrentValues ?? []).find(
          (item) =>
            normalizeValue(item.value).toLocaleLowerCase() ===
            value.toLocaleLowerCase(),
        );

        if (concurrentValue) {
          return {
            ok: true,
            created: false,
            value: {
              id: concurrentValue.id,
              optionKey: concurrentValue.option_key,
              value: concurrentValue.value,
            },
          };
        }
      }
    }

    return {
      ok: false,
      error: error?.message ?? "The product option value could not be saved.",
    };
  }

  return {
    ok: true,
    created: true,
    value: {
      id: data.id,
      optionKey: data.option_key,
      value: data.value,
    },
  };
}
