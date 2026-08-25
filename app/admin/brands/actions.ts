"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const brandsPath = "/admin/brands";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(`${brandsPath}?${type}=${encodeURIComponent(message)}`);
}

function parseSortOrder(formData: FormData) {
  const value = Number(formData.get("sort_order") ?? 0);

  if (!Number.isInteger(value) || value < 0) {
    return 0;
  }

  return value;
}

function friendlyDatabaseError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A brand with this name or URL already exists.";
  }

  return message;
}

async function requireAdministrator() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: administrator, error } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (error || !administrator?.is_active) {
    redirect("/admin/login");
  }

  return supabase;
}

export async function createBrand(formData: FormData) {
  const supabase = await requireAdministrator();

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);

  if (!name) {
    redirectWithMessage("error", "Brand name is required.");
  }

  if (!slug) {
    redirectWithMessage(
      "error",
      "Enter a brand name that can be used in a website URL.",
    );
  }

  const { error } = await supabase.from("brands").insert({
    name,
    slug,
    description: description || null,
    sort_order: parseSortOrder(formData),
    is_active: formData.get("is_active") === "on",
  });

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage("success", "Brand created successfully.");
}

const electronicsBrandLibrary = [
  'Apple',
  'Samsung',
  'Google',
  'Xiaomi',
  'Redmi',
  'POCO',
  'Huawei',
  'Honor',
  'OnePlus',
  'Nothing',
  'Motorola',
  'Nokia',
  'HMD',
  'Oppo',
  'Realme',
  'Vivo',
  'ZTE',
  'TCL',
  'Asus',
  'Sony',
  'Fairphone',
  'Acer',
  'Alienware',
  'Dell',
  'Dynabook',
  'Framework',
  'Gigabyte',
  'HP',
  'Lenovo',
  'LG',
  'Microsoft',
  'MSI',
  'Razer',
  'Samsung Computing',
  'VAIO',
  'AMD',
  'Intel',
  'NVIDIA',
  'ASRock',
  'Biostar',
  'Cooler Master',
  'Corsair',
  'DeepCool',
  'EVGA',
  'Fractal Design',
  'G.Skill',
  'Kingston',
  'Kingston Fury',
  'Lian Li',
  'NZXT',
  'Noctua',
  'Patriot',
  'PNY',
  'Seasonic',
  'Thermaltake',
  'Zotac',
  'Crucial',
  'Lexar',
  'SanDisk',
  'Seagate',
  'Western Digital',
  'WD_BLACK',
  'Synology',
  'QNAP',
  'LaCie',
  'Transcend',
  'Logitech G',
  'SteelSeries',
  'HyperX',
  'ROCCAT',
  'Turtle Beach',
  'Thrustmaster',
  'Fanatec',
  'SCUF',
  'PowerA',
  '8BitDo',
  'GameSir',
  'Backbone',
  'PlayStation',
  'Xbox',
  'Nintendo',
  'AirPods',
  'Audio-Technica',
  'Bang & Olufsen',
  'Beats',
  'Beyerdynamic',
  'Bose',
  'Bowers & Wilkins',
  'Denon',
  'Edifier',
  'FiiO',
  'Harman Kardon',
  'Jabra',
  'JBL',
  'Marshall',
  'Nothing Audio',
  'Sennheiser',
  'Shokz',
  'Skullcandy',
  'Sonos',
  'Soundcore',
  'Technics',
  'Ultimate Ears',
  'Yamaha',
  'AKG',
  'Blue Microphones',
  'Elgato',
  'Focusrite',
  'Rode',
  'Shure',
  'Zoom',
  'Amazfit',
  'Coros',
  'Fitbit',
  'Garmin',
  'Oura',
  'Polar',
  'Suunto',
  'Whoop',
  'Canon',
  'DJI',
  'Fujifilm',
  'GoPro',
  'Hasselblad',
  'Insta360',
  'Kodak',
  'Leica',
  'Nikon',
  'OM System',
  'Panasonic Lumix',
  'Polaroid',
  'Ricoh',
  'Sigma',
  'Tamron',
  'Aruba',
  'ASUS Networking',
  'Cisco',
  'D-Link',
  'Linksys',
  'Mercusys',
  'MikroTik',
  'Netgear',
  'TP-Link',
  'Ubiquiti',
  'Zyxel',
  'Brother',
  'Canon Office',
  'Epson',
  'HP Office',
  'Kyocera',
  'Lexmark',
  'Pantum',
  'Xerox',
  'BenQ',
  'Epson Projectors',
  'Hisense',
  'Optoma',
  'ViewSonic',
  'XGIMI',
  'Amazon',
  'Arlo',
  'Aqara',
  'Eufy',
  'Google Nest',
  'Nanoleaf',
  'Philips Hue',
  'Ring',
  'Roborock',
  'Tapo',
  'Yeelight',
  'Braun',
  'Breville',
  "De'Longhi",
  'Dyson',
  'iRobot',
  'Kenwood',
  'KitchenAid',
  'Nespresso',
  'Ninja',
  'Philips',
  'Russell Hobbs',
  'Tefal',
  'Anker',
  'Baseus',
  'Belkin',
  'EcoFlow',
  'Energizer',
  'Jackery',
  'Mophie',
  'OtterBox',
  'Spigen',
  'UGREEN',
  'Zendure',
  'APC',
  'CyberPower',
  'Eaton',
  'Segway',
  'Ninebot',
  'Xiaomi Mobility',
  'Incase',
  'Peak Design',
  'Satechi',
  'Twelve South',
  'Wacom',
] as const;

export async function installElectronicsBrandLibrary() {
  const supabase = await requireAdministrator();

  const { error } = await supabase.from("brands").upsert(
    electronicsBrandLibrary.map((name, index) => ({
      name,
      slug: slugify(name),
      description: null,
      sort_order: index,
      is_active: true,
    })),
    {
      onConflict: "slug",
      ignoreDuplicates: true,
    },
  );

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage(
    "success",
    "Electronics brand library added. Existing brands were preserved.",
  );
}

export async function updateBrand(formData: FormData) {
  const supabase = await requireAdministrator();

  const brandId = String(formData.get("brand_id") ?? "").trim();

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);

  if (!brandId) {
    redirectWithMessage("error", "Brand could not be identified.");
  }

  if (!name || !slug) {
    redirectWithMessage("error", "Enter a valid brand name.");
  }

  const { error } = await supabase
    .from("brands")
    .update({
      name,
      slug,
      description: description || null,
      sort_order: parseSortOrder(formData),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", brandId);

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage("success", "Brand updated successfully.");
}

export async function toggleBrand(formData: FormData) {
  const supabase = await requireAdministrator();

  const brandId = String(formData.get("brand_id") ?? "").trim();

  const nextActive = String(formData.get("next_active") ?? "") === "true";

  if (!brandId) {
    redirectWithMessage("error", "Brand could not be identified.");
  }

  const { error } = await supabase
    .from("brands")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", brandId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage(
    "success",
    nextActive ? "Brand activated." : "Brand deactivated.",
  );
}

export async function deleteBrand(formData: FormData) {
  const supabase = await requireAdministrator();

  const brandId = String(formData.get("brand_id") ?? "").trim();

  if (!brandId) {
    redirectWithMessage("error", "Brand could not be identified.");
  }

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("brand_id", brandId);

  if (countError) {
    redirectWithMessage("error", countError.message);
  }

  if ((count ?? 0) > 0) {
    redirectWithMessage(
      "error",
      "This brand contains products. Move those products to another brand before deleting it.",
    );
  }

  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", brandId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage("success", "Brand deleted successfully.");
}
