/*
 * ============================================================
 * STEREOPHONIE — PRODUCT COLORWAY LIBRARY
 * ============================================================
 *
 * One authoritative color-name / storefront-swatch resolver.
 *
 * IMPORTANT:
 * Manufacturers generally publish finish names and product
 * imagery, not official CSS/HEX values for physical finishes.
 * The hexadecimal values here are therefore storefront visual
 * references matched closely to manufacturer presentation.
 *
 * Official manufacturer spelling/capitalization should always
 * be preserved when a branded finish is available.
 * ============================================================
 */

export type ProductColorway = {
  name: string;
  hex: string;
};

const productColorways: ProductColorway[] = [
  // ----------------------------------------------------------
  // Apple
  // ----------------------------------------------------------
  { name: "Midnight", hex: "#1D2530" },
  { name: "Starlight", hex: "#F0E6D3" },
  { name: "Space Black", hex: "#303033" },
  { name: "Space Gray", hex: "#6B6B6D" },
  { name: "Graphite", hex: "#4B4B4D" },

  { name: "Natural Titanium", hex: "#A69F91" },
  { name: "Black Titanium", hex: "#3C3B3A" },
  { name: "White Titanium", hex: "#E4E2DD" },
  { name: "Blue Titanium", hex: "#3E4855" },
  { name: "Desert Titanium", hex: "#B39A82" },

  { name: "Cosmic Orange", hex: "#D86C38" },
  { name: "Deep Blue", hex: "#314B62" },
  { name: "Ultramarine", hex: "#5967D8" },
  { name: "Teal", hex: "#4E8F88" },
  { name: "Pink", hex: "#E8A5B5" },

  { name: "Pacific Blue", hex: "#365B6D" },
  { name: "Sierra Blue", hex: "#9BB5CE" },
  { name: "Alpine Green", hex: "#576856" },
  { name: "Deep Purple", hex: "#51495C" },
  { name: "Midnight Green", hex: "#43534A" },

  { name: "Product Red", hex: "#C8252C" },
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Silver", hex: "#C9C9C9" },

  // ----------------------------------------------------------
  // Samsung
  // ----------------------------------------------------------
  { name: "Titanium Silverblue", hex: "#A8B6BD" },
  { name: "Titanium Black", hex: "#2F3032" },
  { name: "Titanium Gray", hex: "#777773" },
  { name: "Titanium Whitesilver", hex: "#D7D8D3" },
  { name: "Titanium Jetblack", hex: "#202124" },
  { name: "Titanium Jadegreen", hex: "#68796D" },
  { name: "Titanium Pinkgold", hex: "#C9A09A" },

  { name: "Phantom Black", hex: "#242426" },
  { name: "Phantom White", hex: "#F0F0ED" },
  { name: "Phantom Silver", hex: "#B9B7C0" },
  { name: "Phantom Gray", hex: "#6E7073" },
  { name: "Phantom Violet", hex: "#A99BC0" },
  { name: "Phantom Green", hex: "#53645A" },
  { name: "Phantom Navy", hex: "#35445C" },

  { name: "Icyblue", hex: "#C5D6E6" },
  { name: "Silver Shadow", hex: "#B7B8B5" },
  { name: "Navy", hex: "#14213D" },
  { name: "Mint", hex: "#98D8C8" },
  { name: "Cream", hex: "#EFE7D5" },
  { name: "Lavender", hex: "#B9A7E8" },
  { name: "Bora Purple", hex: "#8D79A8" },

  { name: "Awesome Black", hex: "#202124" },
  { name: "Awesome White", hex: "#F3F3F1" },
  { name: "Awesome Blue", hex: "#79A8C9" },
  { name: "Awesome Violet", hex: "#A69AC8" },
  { name: "Awesome Lime", hex: "#C5D97A" },

  // ----------------------------------------------------------
  // Google / Pixel
  // ----------------------------------------------------------
  { name: "Obsidian", hex: "#26272A" },
  { name: "Porcelain", hex: "#E8E2D8" },
  { name: "Hazel", hex: "#7C8175" },
  { name: "Bay", hex: "#6D91B4" },
  { name: "Peony", hex: "#E79BA8" },
  { name: "Wintergreen", hex: "#A9C5B5" },
  { name: "Lemongrass", hex: "#C9CF9E" },
  { name: "Snow", hex: "#F1F1EE" },
  { name: "Stormy Black", hex: "#333438" },
  { name: "Sorta Seafoam", hex: "#A8C4B8" },
  { name: "Rose Quartz", hex: "#D5A5AD" },

  // ----------------------------------------------------------
  // Huawei
  // ----------------------------------------------------------
  { name: "Emerald Green", hex: "#35685C" },
  { name: "Forest Green", hex: "#405C4B" },
  { name: "Spruce Green", hex: "#50675A" },
  { name: "Nebula Gray", hex: "#73777B" },
  { name: "Mystic Silver", hex: "#C1C5C7" },
  { name: "Golden Black", hex: "#292623" },
  { name: "Crystal Blue", hex: "#89BBD1" },
  { name: "Sakura Pink", hex: "#E7B9C1" },
  { name: "Isle Blue", hex: "#7D9DB3" },

  // ----------------------------------------------------------
  // Xiaomi / Redmi family
  // ----------------------------------------------------------
  { name: "Midnight Black", hex: "#222326" },
  { name: "Jade Cyan", hex: "#7CB8B2" },
  { name: "Ocean Cyan", hex: "#70AAB9" },
  { name: "Velvet Black", hex: "#28282A" },
  { name: "Sunrise Orange", hex: "#CF815F" },
  { name: "Moonlight White", hex: "#ECE9E2" },
  { name: "Crystal Silver", hex: "#C3C4C5" },

  // ----------------------------------------------------------
  // Common / cross-brand finishes
  // ----------------------------------------------------------
  { name: "Black", hex: "#111111" },
  { name: "Jet Black", hex: "#0A0A0A" },
  { name: "Matte Black", hex: "#1C1C1E" },
  { name: "Glossy Black", hex: "#171717" },
  { name: "Carbon Black", hex: "#242424" },
  { name: "Charcoal", hex: "#454547" },

  { name: "Gray", hex: "#808083" },
  { name: "Dark Gray", hex: "#555558" },
  { name: "Light Gray", hex: "#B8B8BA" },
  { name: "Platinum", hex: "#D5D2CB" },

  { name: "White", hex: "#F7F7F5" },
  { name: "Pearl White", hex: "#F4F1EA" },

  { name: "Blue", hex: "#2F6BFF" },
  { name: "Sky Blue", hex: "#7CC7F2" },
  { name: "Ice Blue", hex: "#B5DCEB" },
  { name: "Royal Blue", hex: "#3155A6" },
  { name: "Cobalt Blue", hex: "#315FA8" },
  { name: "Ocean Blue", hex: "#3E7795" },
  { name: "Aqua Blue", hex: "#58B6C9" },

  { name: "Green", hex: "#4E8B57" },
  { name: "Mint Green", hex: "#A3D9C9" },
  { name: "Olive", hex: "#727A3E" },
  { name: "Olive Green", hex: "#68704A" },

  { name: "Purple", hex: "#7651C9" },
  { name: "Violet", hex: "#7759A6" },
  { name: "Lilac", hex: "#B8A6CE" },

  { name: "Red", hex: "#D92D20" },
  { name: "Crimson", hex: "#A9232D" },
  { name: "Burgundy", hex: "#6B1D2A" },

  { name: "Orange", hex: "#F57C00" },
  { name: "Burnt Orange", hex: "#C8672A" },

  { name: "Yellow", hex: "#F4C430" },
  { name: "Mustard", hex: "#FDB73E" },

  { name: "Beige", hex: "#D8C3A5" },
  { name: "Sand", hex: "#CDBA96" },
  { name: "Ivory", hex: "#ECE5D5" },

  { name: "Clear", hex: "transparent" },
];

function identity(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const colorwayByIdentity = new Map(
  productColorways.map((colorway) => [identity(colorway.name), colorway]),
);

/*
 * Historical / malformed aliases that already exist in the
 * Stereophonie admin preset library or may exist in saved data.
 *
 * They resolve without requiring a destructive database migration.
 */
const aliases: Record<string, string> = {
  naturaltitanium: "Natural Titanium",
  pacificblue: "Pacific Blue",
  productred: "Product Red",

  phantomblack: "Phantom Black",
  phantomwhite: "Phantom White",
  phantomsilver: "Phantom Silver",
  phantomgray: "Phantom Gray",
  phantomviolet: "Phantom Violet",
  phantomgreen: "Phantom Green",
  phantomnavy: "Phantom Navy",

  awesomeblack: "Awesome Black",
  awesomewhite: "Awesome White",
  awesomeblue: "Awesome Blue",
  awesomeviolet: "Awesome Violet",
  awesomelime: "Awesome Lime",

  emeraldgreen: "Emerald Green",
  crystalblue: "Crystal Blue",

  stormyblack: "Stormy Black",
  cobaltblue: "Cobalt Blue",

  cherryred: "Cherry Red",
  cherrypink: "Cherry Pink",

  velvetblack: "Velvet Black",
  aurorapurple: "Aurora Purple",
  astralblack: "Astral Black",
  arcticdawn: "Arctic Dawn",
  forestemerald: "Forest Emerald",

  cosmicorange: "Cosmic Orange",
  goldenyellow: "Golden Yellow",
  powderblue: "Powder Blue",
  pastelpurple: "Pastel Purple",
  pastelpink: "Pastel Pink",
  coffeebrown: "Coffee Brown",
  racingred: "Racing Red",

  titaniumsilverblue: "Titanium Silverblue",
  titaniumwhitesilver: "Titanium Whitesilver",
  titaniumjetblack: "Titanium Jetblack",
  titaniumjadegreen: "Titanium Jadegreen",
  titaniumpinkgold: "Titanium Pinkgold",
};

export function canonicalizeProductColorwayName(value: unknown) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  const normalized = identity(trimmed);

  const alias = aliases[normalized];

  if (alias) {
    return alias;
  }

  const known = colorwayByIdentity.get(normalized);

  if (known) {
    return known.name;
  }

  /*
   * Unknown/custom admin colors remain allowed.
   * At minimum enforce the store rule that the name starts
   * with a capital letter.
   */
  return trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1);
}

export function productColorwayHex(value: unknown) {
  const canonical = canonicalizeProductColorwayName(value);

  if (!canonical) {
    return null;
  }

  return colorwayByIdentity.get(identity(canonical))?.hex ?? null;
}

export function normalizeProductColorway(
  colorway: ProductColorway,
): ProductColorway {
  const name = canonicalizeProductColorwayName(colorway.name);

  return {
    name,
    hex: productColorwayHex(name) ?? colorway.hex,
  };
}
