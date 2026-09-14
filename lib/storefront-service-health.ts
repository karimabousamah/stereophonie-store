import { createAdminClient } from "@/lib/supabase/admin";

export async function storefrontServiceIsAvailable() {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("products")
      .select("id")
      .limit(1);

    if (error) {
      console.error(
        "Stereophonie storefront availability probe failed:",
        error,
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Stereophonie storefront availability probe threw:",
      error,
    );

    return false;
  }
}
