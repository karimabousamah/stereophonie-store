"use client";

import {
  Check,
  ChevronRight,
  CirclePlus,
  Package,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  ProductAvailabilityStatus,
  ProductVariantAttributes,
} from "@/lib/stereophonie-v2/product-variants";

import ConfigurationColorPicker from "@/components/admin/products/configuration-color-picker";

export type AdminElectronicsVariant = {
  id?: string | null;
  clientId: string;
  variant_name: string;

  /**
   * Explicit storefront order.
   * 0 = first configuration, 1 = second, etc.
   */
  display_position: number;

  attributes: ProductVariantAttributes;
  sku: string;
  regular_price: number | "";
  sale_price: number | "";
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: ProductAvailabilityStatus | "";
};

type ElectronicsVariantEditorProps = {
  variants: AdminElectronicsVariant[];
  onChange: (variants: AdminElectronicsVariant[]) => void;
  categoryName?: string;
  brandName?: string;

  /**
   * Only supplied by Edit Product.
   *
   * It lets a newly-created configuration persist itself using
   * the existing product save action without accidentally changing
   * a live product back into a draft.
   */
  saveExistingConfigurationIntent?: "draft" | "publish";
};

const availabilityOptions: {
  value: ProductAvailabilityStatus;
  label: string;
  description: string;
  className: string;
}[] = [
  {
    value: "in_stock",
    label: "In stock",
    description: "Available now and ready for customers to purchase.",
    className: "is-in-stock",
  },
  {
    value: "low_stock",
    label: "Low stock",
    description: "Available now, but only a limited quantity remains.",
    className: "is-low-stock",
  },
  {
    value: "out_of_stock",
    label: "Out of stock",
    description: "Visible in the store, but temporarily unavailable to order.",
    className: "is-out-of-stock",
  },
  {
    value: "coming_soon",
    label: "Coming soon",
    description: "Show this configuration before it becomes available.",
    className: "is-coming-soon",
  },
];


const productColorPalette = [
  { name: "Black", hex: "#111111" },
  { name: "Midnight", hex: "#232427" },
  { name: "Space Black", hex: "#2f3032" },
  { name: "Graphite", hex: "#55565a" },
  { name: "Charcoal", hex: "#4c4c4e" },
  { name: "Gray", hex: "#8e8e93" },
  { name: "Silver", hex: "#d7d8da" },
  { name: "White", hex: "#f8f8f8" },

  { name: "Titanium", hex: "#8c8982" },
  { name: "Natural Titanium", hex: "#aaa69d" },
  { name: "Desert Titanium", hex: "#c8a88d" },
  { name: "Gold", hex: "#d5b174" },
  { name: "Rose Gold", hex: "#d9a49a" },
  { name: "Bronze", hex: "#98694c" },

  { name: "Red", hex: "#d52f36" },
  { name: "Product Red", hex: "#bf0013" },
  { name: "Burgundy", hex: "#681c2c" },
  { name: "Pink", hex: "#e5a5b7" },
  { name: "Purple", hex: "#735b99" },
  { name: "Lavender", hex: "#b5a8d7" },

  { name: "Navy", hex: "#26364f" },
  { name: "Blue", hex: "#3478c7" },
  { name: "Sierra Blue", hex: "#9bb6cf" },
  { name: "Sky Blue", hex: "#a8c7e7" },
  { name: "Teal", hex: "#318789" },
  { name: "Cyan", hex: "#55b8c8" },

  { name: "Green", hex: "#47885e" },
  { name: "Alpine Green", hex: "#536b5c" },
  { name: "Mint", hex: "#a8d5bd" },
  { name: "Olive", hex: "#777957" },

  { name: "Yellow", hex: "#e3c353" },
  { name: "Orange", hex: "#e87932" },
  { name: "Coral", hex: "#e78778" },
  { name: "Brown", hex: "#76584b" },
  { name: "Beige", hex: "#d7c5a7" },
  { name: "Cream", hex: "#eee4d2" },
] as const;

type SuggestedAttribute = readonly [string, string];

const commonAttributePresets: SuggestedAttribute[] = [
  ["model", "Model"],
  ["color", "Colour"],
  ["edition", "Edition"],
];

const categoryAttributePresets: Array<{
  match: string[];
  attributes: SuggestedAttribute[];
}> = [
  {
    match: [
      "phone cover",
      "iphone cover",
      "smartphone cover",
      "phone case",
      "iphone case",
      "mobile case",
      "case",
      "cover",
    ],
    attributes: [
      ["compatibility", "Compatible with"],
      ["material", "Material"],
      ["case_type", "Case type"],
      ["magsafe", "MagSafe"],
      ["finish", "Finish"],
      ["protection", "Protection"],
    ],
  },
  {
    match: ["phone", "smartphone", "mobile"],
    attributes: [
      ["storage", "Storage"],
      ["memory", "RAM"],
      ["processor", "Processor"],
      ["display", "Display"],
      ["camera", "Camera"],
      ["battery", "Battery"],
      ["connectivity", "Connectivity"],
      ["sim", "SIM"],
    ],
  },
  {
    match: ["gaming laptop", "laptop", "notebook"],
    attributes: [
      ["processor", "CPU / Processor"],
      ["graphics", "GPU / Graphics"],
      ["memory", "RAM"],
      ["storage", "Storage"],
      ["display", "Display"],
      ["refresh_rate", "Refresh rate"],
      ["operating_system", "Operating system"],
      ["battery", "Battery"],
    ],
  },
  {
    match: ["desktop", "computer", "pc"],
    attributes: [
      ["processor", "CPU / Processor"],
      ["graphics", "GPU / Graphics"],
      ["memory", "RAM"],
      ["storage", "Storage"],
      ["motherboard", "Motherboard"],
      ["power_supply", "Power supply"],
      ["operating_system", "Operating system"],
    ],
  },
  {
    match: ["tablet", "ipad"],
    attributes: [
      ["storage", "Storage"],
      ["memory", "RAM"],
      ["processor", "Processor"],
      ["display", "Display"],
      ["connectivity", "Connectivity"],
      ["battery", "Battery"],
      ["stylus_support", "Stylus support"],
    ],
  },
  {
    match: ["audio", "sound", "earphone", "headphone", "speaker"],
    attributes: [
      ["audio_type", "Audio type"],
      ["connectivity", "Connectivity"],
      ["battery", "Battery life"],
      ["noise_cancellation", "Noise cancellation"],
      ["microphone", "Microphone"],
      ["driver_size", "Driver size"],
      ["water_resistance", "Water resistance"],
    ],
  },
  {
    match: ["camera", "gopro", "instax", "polaroid"],
    attributes: [
      ["sensor", "Sensor"],
      ["resolution", "Resolution"],
      ["lens", "Lens"],
      ["video", "Video"],
      ["stabilization", "Stabilization"],
      ["zoom", "Zoom"],
      ["storage", "Storage"],
      ["connectivity", "Connectivity"],
    ],
  },
  {
    match: ["smartwatch", "fitness watch", "watch"],
    attributes: [
      ["case_size", "Case size"],
      ["display", "Display"],
      ["connectivity", "Connectivity"],
      ["battery", "Battery"],
      ["gps", "GPS"],
      ["water_resistance", "Water resistance"],
      ["compatibility", "Compatibility"],
    ],
  },
  {
    match: ["gaming"],
    attributes: [
      ["platform", "Platform"],
      ["connectivity", "Connectivity"],
      ["compatibility", "Compatibility"],
      ["edition", "Edition"],
      ["lighting", "Lighting"],
    ],
  },
  {
    match: ["board", "card game", "games"],
    attributes: [
      ["players", "Players"],
      ["recommended_age", "Recommended age"],
      ["play_time", "Play time"],
      ["language", "Language"],
      ["edition", "Edition"],
    ],
  },
  {
    match: ["network", "router", "wifi"],
    attributes: [
      ["wifi_standard", "Wi-Fi standard"],
      ["speed", "Speed"],
      ["bands", "Bands"],
      ["ports", "Ports"],
      ["coverage", "Coverage"],
      ["security", "Security"],
    ],
  },
  {
    match: ["printer"],
    attributes: [
      ["printer_type", "Printer type"],
      ["print_technology", "Print technology"],
      ["connectivity", "Connectivity"],
      ["paper_size", "Paper size"],
      ["duplex", "Duplex"],
      ["print_speed", "Print speed"],
    ],
  },
  {
    match: ["home", "living", "office"],
    attributes: [
      ["power", "Power"],
      ["capacity", "Capacity"],
      ["connectivity", "Connectivity"],
      ["dimensions", "Dimensions"],
      ["warranty", "Warranty"],
    ],
  },
];

/*
 * ============================================================
 * SMART CONFIGURATION VALUE LIBRARY
 * ============================================================
 *
 * These are suggestions, not hard restrictions.
 *
 * The administrator can select a common value from the browser
 * suggestion list OR type a completely new value.
 *
 * This keeps product creation fast without making the catalogue
 * dependent on a permanently hard-coded specification list.
 */

const commonAttributeOptions: Record<string, string[]> = {
  storage: [
    "32 GB",
    "64 GB",
    "128 GB",
    "256 GB",
    "512 GB",
    "1 TB",
    "2 TB",
    "4 TB",
  ],

  memory: [
    "2 GB",
    "3 GB",
    "4 GB",
    "6 GB",
    "8 GB",
    "12 GB",
    "16 GB",
    "18 GB",
    "24 GB",
    "32 GB",
    "36 GB",
    "48 GB",
    "64 GB",
    "96 GB",
    "128 GB",
  ],

  ram: [
    "4 GB",
    "6 GB",
    "8 GB",
    "12 GB",
    "16 GB",
    "24 GB",
    "32 GB",
    "48 GB",
    "64 GB",
    "96 GB",
    "128 GB",
  ],

  sim: [
    "eSIM only",
    "Physical SIM only",
    "Physical SIM + eSIM",
    "Dual physical SIM",
    "Dual SIM + eSIM",
  ],

  connectivity: [
    "USB-C",
    "Lightning",
    "Micro-USB",
    "USB-A",
    "Wi-Fi",
    "Wi-Fi + Cellular",
    "Bluetooth",
    "Wireless",
    "Wired",
  ],

  edition: [
    "Standard",
    "Pro",
    "Pro Max",
    "Plus",
    "Ultra",
    "Max",
    "Mini",
    "Air",
    "SE",
    "Gaming",
    "Limited Edition",
    "Special Edition",
  ],

  operating_system: [
    "iOS",
    "iPadOS",
    "macOS",
    "Android",
    "Windows 11 Home",
    "Windows 11 Pro",
    "ChromeOS",
    "Linux",
  ],

  refresh_rate: [
    "60 Hz",
    "75 Hz",
    "90 Hz",
    "120 Hz",
    "144 Hz",
    "165 Hz",
    "180 Hz",
    "240 Hz",
    "360 Hz",
  ],

  network: [
    "Wi-Fi",
    "Wi-Fi + Cellular",
    "4G LTE",
    "5G",
    "5G + Wi-Fi",
  ],

  magsafe: [
    "Yes",
    "No",
    "MagSafe compatible",
  ],

  material: [
    "Silicone",
    "Leather",
    "FineWoven",
    "Polycarbonate",
    "TPU",
    "Plastic",
    "Aluminium",
    "Stainless steel",
    "Titanium",
    "Fabric",
  ],

  case_type: [
    "Standard case",
    "Clear case",
    "Silicone case",
    "Leather case",
    "Wallet case",
    "Bumper case",
    "Rugged case",
    "MagSafe case",
  ],

  finish: [
    "Matte",
    "Glossy",
    "Soft touch",
    "Transparent",
    "Textured",
    "Metallic",
  ],

  protection: [
    "Standard protection",
    "Drop protection",
    "Shock resistant",
    "Raised camera protection",
    "Raised screen protection",
    "Rugged protection",
  ],

  noise_cancellation: [
    "None",
    "Passive",
    "Active Noise Cancellation",
    "Adaptive Noise Cancellation",
  ],

  compatibility: [
    "Universal",
  ],

  stylus_support: [
    "Yes",
    "No",
  ],

  gps: [
    "Yes",
    "No",
    "GPS",
    "GPS + Cellular",
  ],

  water_resistance: [
    "Not rated",
    "IPX4",
    "IPX5",
    "IPX7",
    "IP67",
    "IP68",
  ],

  platform: [
    "PlayStation 5",
    "PlayStation 4",
    "Xbox Series X|S",
    "Xbox One",
    "Nintendo Switch",
    "Nintendo Switch 2",
    "PC",
    "macOS",
    "Mobile",
  ],
};


/*
 * Brand-aware processor suggestions.
 *
 * Matching is intentionally flexible because the brand names in
 * the administrator catalogue may contain additional wording.
 */
const processorOptionsByBrand: Array<{
  match: string[];
  values: string[];
}> = [
  {
    match: ["apple"],
    values: [
      "Apple A15 Bionic",
      "Apple A16 Bionic",
      "Apple A17 Pro",
      "Apple A18",
      "Apple A18 Pro",
      "Apple A19",
      "Apple A19 Pro",
      "Apple M1",
      "Apple M2",
      "Apple M3",
      "Apple M4",
      "Apple M5",
    ],
  },

  {
    match: ["samsung"],
    values: [
      "Samsung Exynos 1380",
      "Samsung Exynos 1480",
      "Samsung Exynos 2400",
      "Samsung Exynos 2500",
      "Snapdragon 8 Gen 2",
      "Snapdragon 8 Gen 3",
      "Snapdragon 8 Elite",
      "Snapdragon 8 Elite Gen 2",
    ],
  },

  {
    match: ["google"],
    values: [
      "Google Tensor",
      "Google Tensor G2",
      "Google Tensor G3",
      "Google Tensor G4",
      "Google Tensor G5",
    ],
  },

  {
    match: ["xiaomi", "redmi", "poco"],
    values: [
      "Snapdragon 7 Gen 3",
      "Snapdragon 8 Gen 2",
      "Snapdragon 8 Gen 3",
      "Snapdragon 8 Elite",
      "MediaTek Dimensity 8300",
      "MediaTek Dimensity 9300",
      "MediaTek Dimensity 9400",
    ],
  },

  {
    match: ["oneplus", "oppo", "realme"],
    values: [
      "Snapdragon 7 Gen 3",
      "Snapdragon 8 Gen 2",
      "Snapdragon 8 Gen 3",
      "Snapdragon 8 Elite",
      "MediaTek Dimensity 8300",
      "MediaTek Dimensity 9300",
      "MediaTek Dimensity 9400",
    ],
  },

  {
    match: ["huawei", "honor"],
    values: [
      "Kirin 9000S",
      "Kirin 9010",
      "Snapdragon 8+ Gen 1",
      "Snapdragon 8 Gen 2",
    ],
  },

  {
    match: [
      "asus",
      "acer",
      "lenovo",
      "hp",
      "dell",
      "msi",
      "razer",
    ],
    values: [
      "Intel Core i3",
      "Intel Core i5",
      "Intel Core i7",
      "Intel Core i9",
      "Intel Core Ultra 5",
      "Intel Core Ultra 7",
      "Intel Core Ultra 9",
      "AMD Ryzen 3",
      "AMD Ryzen 5",
      "AMD Ryzen 7",
      "AMD Ryzen 9",
      "AMD Ryzen AI 7",
      "AMD Ryzen AI 9",
    ],
  },
];


const genericProcessorOptions = [
  "Apple A18",
  "Apple A18 Pro",
  "Apple A19",
  "Apple A19 Pro",
  "Apple M2",
  "Apple M3",
  "Apple M4",
  "Apple M5",
  "Snapdragon 7 Gen 3",
  "Snapdragon 8 Gen 2",
  "Snapdragon 8 Gen 3",
  "Snapdragon 8 Elite",
  "Snapdragon 8 Elite Gen 2",
  "MediaTek Dimensity 8300",
  "MediaTek Dimensity 9300",
  "MediaTek Dimensity 9400",
  "Google Tensor G3",
  "Google Tensor G4",
  "Google Tensor G5",
  "Samsung Exynos 2400",
  "Samsung Exynos 2500",
  "Intel Core i3",
  "Intel Core i5",
  "Intel Core i7",
  "Intel Core i9",
  "Intel Core Ultra 5",
  "Intel Core Ultra 7",
  "Intel Core Ultra 9",
  "AMD Ryzen 3",
  "AMD Ryzen 5",
  "AMD Ryzen 7",
  "AMD Ryzen 9",
  "AMD Ryzen AI 7",
  "AMD Ryzen AI 9",
];


function uniqueOptions(
  values: string[],
) {
  return Array.from(
    new Map(
      values.map((value) => [
        value.trim().toLowerCase(),
        value.trim(),
      ]),
    ).values(),
  ).filter(Boolean);
}


function processorOptionsForBrand(
  brandName: string,
) {
  const normalizedBrand =
    brandName
      .trim()
      .toLowerCase();

  if (!normalizedBrand) {
    return genericProcessorOptions;
  }

  const matched =
    processorOptionsByBrand.find(
      (group) =>
        group.match.some(
          (keyword) =>
            normalizedBrand.includes(
              keyword,
            ),
        ),
    );

  return matched?.values ??
    genericProcessorOptions;
}


function optionsForAttribute(
  key: string,
  brandName: string,
) {
  const normalizedKey =
    key.trim().toLowerCase();

  if (
    normalizedKey === "processor" ||
    normalizedKey === "cpu"
  ) {
    return uniqueOptions(
      processorOptionsForBrand(
        brandName,
      ),
    );
  }

  return uniqueOptions(
    commonAttributeOptions[
      normalizedKey
    ] ?? [],
  );
}


function attributeHelpText(
  key: string,
  brandName: string,
) {
  const normalizedKey =
    key.trim().toLowerCase();

  if (
    normalizedKey === "processor" ||
    normalizedKey === "cpu"
  ) {
    return brandName.trim()
      ? `Available choices adapted to ${brandName}.`
      : "Select the processor for this configuration.";
  }

  if (
    normalizedKey === "storage" ||
    normalizedKey === "memory" ||
    normalizedKey === "ram"
  ) {
    return "Select the exact capacity for this configuration.";
  }

  if (normalizedKey === "sim") {
    return "Select the SIM configuration customers will receive.";
  }

  if (
    normalizedKey === "connectivity"
  ) {
    return "Select the applicable connection type.";
  }

  return "Select the applicable specification.";
}

function attributesForCategory(categoryName: string): SuggestedAttribute[] {
  const normalized = categoryName.trim().toLowerCase();

  const matched = categoryAttributePresets.find((preset) =>
    preset.match.some((keyword) => normalized.includes(keyword)),
  );

  const merged = [
    ...(matched?.attributes ?? []),
    ...commonAttributePresets,
  ];

  return Array.from(
    new Map(merged.map((item) => [item[0], item])).values(),
  );
}

function createVariant(): AdminElectronicsVariant {
  return {
    clientId: crypto.randomUUID(),
    variant_name: "",
    display_position: 0,
    attributes: {},
    sku: "",
    regular_price: "",
    sale_price: "",
    stock_quantity: 0,
    low_stock_threshold: 2,
    availability_status: "",
  };
}

function humanizeAttributeKey(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/*
 * Configuration names should describe what actually differentiates
 * one sellable option from another.
 *
 * Examples:
 *   Orange · 256GB
 *   Midnight · 512GB · 8GB RAM
 *   Black · iPhone 17 Pro · MagSafe
 *
 * We deliberately avoid stuffing every technical specification into
 * the customer-facing name.
 */
const configurationNamePriority = [
  "color",
  "colour",
  "storage",
  "capacity",
  "memory",
  "ram",
  "compatibility",
  "model",
  "edition",
  "case_type",
  "connectivity",
] as const;

function normalizeConfigurationValue(
  value: unknown,
) {
  return String(value ?? "").trim();
}

function generatedConfigurationName(
  attributes: ProductVariantAttributes,
) {
  const values: string[] = [];
  const seen = new Set<string>();

  for (const key of configurationNamePriority) {
    const value =
      normalizeConfigurationValue(
        attributes[key],
      );

    if (!value) {
      continue;
    }

    const identity =
      value.toLowerCase();

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    values.push(value);
  }

  /*
   * If none of the preferred differentiating fields are populated,
   * use the first useful attributes instead of creating a meaningless
   * empty label.
   */
  if (values.length === 0) {
    for (const value of Object.values(attributes)) {
      const normalized =
        normalizeConfigurationValue(value);

      if (!normalized) {
        continue;
      }

      const identity =
        normalized.toLowerCase();

      if (seen.has(identity)) {
        continue;
      }

      seen.add(identity);
      values.push(normalized);

      if (values.length >= 3) {
        break;
      }
    }
  }

  return values
    .slice(0, 4)
    .join(" · ");
}

export default function ElectronicsVariantEditor({
  variants,
  onChange,
  categoryName = "",
  brandName = "",
  saveExistingConfigurationIntent,
}: ElectronicsVariantEditorProps) {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variants[0]?.clientId ?? null,
  );

  const [customAttributeName, setCustomAttributeName] = useState("");


  const suggestedAttributes = useMemo(
    () =>
      attributesForCategory(categoryName).filter(
        ([key]) =>
          key !== "color" &&
          key !== "colour",
      ),
    [categoryName],
  );

  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  /*
   * One canonical configuration order.
   *
   * The parent array is not guaranteed to already be physically
   * sorted by display_position. Every piece of ordering UI must
   * therefore use this same ordered representation.
   */
  const orderedVariants = useMemo(
    () =>
      [...variants].sort(
        (first, second) => {
          const positionDifference =
            Number(first.display_position ?? 0) -
            Number(second.display_position ?? 0);

          if (positionDifference !== 0) {
            return positionDifference;
          }

          /*
           * Stable fallback for legacy configurations that may
           * temporarily share the same display_position.
           */
          return (
            variants.indexOf(first) -
            variants.indexOf(second)
          );
        },
      ),
    [variants],
  );

  const activeVariant =
    orderedVariants.find(
      (variant) =>
        variant.clientId === activeVariantId,
    ) ??
    orderedVariants[0] ??
    null;

  const activeVariantOrderIndex =
    activeVariant
      ? orderedVariants.findIndex(
          (variant) =>
            variant.clientId ===
            activeVariant.clientId,
        )
      : -1;

  const totalStock = useMemo(
    () =>
      variants.reduce((total, variant) => {
        if (
          variant.availability_status === "out_of_stock" ||
          variant.availability_status === "coming_soon"
        ) {
          return total;
        }

        return total + Math.max(0, Number(variant.stock_quantity) || 0);
      }, 0),
    [variants],
  );

  const availableConfigurations = useMemo(
    () =>
      variants.filter(
        (variant) =>
          (variant.availability_status === "in_stock" ||
            variant.availability_status === "low_stock") &&
          variant.stock_quantity > 0,
      ).length,
    [variants],
  );

  function updateVariant(
    clientId: string,
    updates: Partial<AdminElectronicsVariant>,
  ) {
    onChange(
      variants.map((variant) =>
        variant.clientId === clientId
          ? {
              ...variant,
              ...updates,
            }
          : variant,
      ),
    );
  }

  function addVariant() {
    const nextVariant = {
      ...createVariant(),
      display_position: variants.length,
    };

    onChange([...variants, nextVariant]);
    setActiveVariantId(nextVariant.clientId);
  }

  function duplicateVariant(
    source: AdminElectronicsVariant,
  ) {
    const nextVariant: AdminElectronicsVariant = {
      ...source,

      /*
       * It is a brand-new database configuration.
       */
      id: null,
      clientId: crypto.randomUUID(),

      /*
       * Never duplicate an SKU automatically because SKUs should
       * identify one exact sellable configuration.
       */
      sku: "",

      /*
       * Deep-copy the flexible specification object.
       */
      attributes: {
        ...source.attributes,
      },

      /*
       * Leave the name ready for the admin to change one option.
       * As soon as a differentiating attribute changes, smart naming
       * can generate the correct customer-facing configuration name.
       */
      variant_name: "",

      /*
       * A duplicated configuration is a new option and therefore
       * starts at the end of the storefront ordering.
       */
      display_position: variants.length,
    };

    onChange([
      ...variants,
      nextVariant,
    ]);

    setActiveVariantId(
      nextVariant.clientId,
    );
  }

  function saveActiveConfiguration() {
    if (
      !activeVariant ||
      activeVariant.id ||
      !saveExistingConfigurationIntent
    ) {
      return;
    }

    /*
     * Editing an existing product already has a complete,
     * battle-tested product save pipeline.
     *
     * Reuse that exact pipeline instead of creating a second
     * database mutation path that could drift out of sync.
     *
     * - Live product  -> preserve Publish
     * - Draft product -> preserve Draft
     */
    const targetId =
      saveExistingConfigurationIntent === "publish"
        ? "st-save-existing-product-publish"
        : "st-save-existing-product-draft";

    const saveButton =
      document.getElementById(
        targetId,
      ) as HTMLButtonElement | null;

    if (!saveButton) {
      return;
    }

    saveButton.click();
  }


  function moveVariant(
    clientId: string,
    direction: "up" | "down",
  ) {
    const currentIndex =
      orderedVariants.findIndex(
        (variant) =>
          variant.clientId === clientId,
      );

    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= orderedVariants.length
    ) {
      return;
    }

    [
      orderedVariants[currentIndex],
      orderedVariants[targetIndex],
    ] = [
      orderedVariants[targetIndex],
      orderedVariants[currentIndex],
    ];

    /*
     * Persist both:
     *   1. display_position
     *   2. the physical React array order
     *
     * Keeping them synchronized prevents the editor, uploader and
     * storefront from seeing two different configuration orders.
     */
    onChange(
      orderedVariants.map(
        (variant, index) => ({
          ...variant,
          display_position: index,
        }),
      ),
    );
  }


  function generateActiveVariantName() {
    if (!activeVariant) {
      return;
    }

    const generated =
      generatedConfigurationName(
        activeVariant.attributes,
      );

    if (!generated) {
      return;
    }

    updateVariant(
      activeVariant.clientId,
      {
        variant_name:
          generated,
      },
    );
  }

  function removeVariant(clientId: string) {
    if (variants.length <= 1) {
      return;
    }

    const nextVariants = variants
      .filter(
        (variant) =>
          variant.clientId !== clientId,
      )
      .sort(
        (first, second) =>
          Number(first.display_position ?? 0) -
          Number(second.display_position ?? 0),
      )
      .map((variant, index) => ({
        ...variant,
        display_position: index,
      }));

    onChange(nextVariants);

    if (activeVariantId === clientId) {
      setActiveVariantId(nextVariants[0]?.clientId ?? null);
    }
  }

  function updateAttribute(clientId: string, key: string, value: string) {
    const variant =
      variants.find(
        (item) =>
          item.clientId === clientId,
      );

    if (!variant) {
      return;
    }

    const previousGeneratedName =
      generatedConfigurationName(
        variant.attributes,
      );

    const nextAttributes = {
      ...variant.attributes,
      [key]: value,
    };

    const nextGeneratedName =
      generatedConfigurationName(
        nextAttributes,
      );

    /*
     * Automatic naming is intentionally respectful:
     *
     * - blank name -> auto generate
     * - previously auto-generated name -> keep it synchronized
     * - manually customized name -> leave it completely untouched
     */
    const currentName =
      variant.variant_name.trim();

    const shouldAutoName =
      !currentName ||
      (
        Boolean(previousGeneratedName) &&
        currentName === previousGeneratedName
      );

    updateVariant(clientId, {
      attributes:
        nextAttributes,

      ...(shouldAutoName &&
      nextGeneratedName
        ? {
            variant_name:
              nextGeneratedName,
          }
        : {}),
    });
  }

  function removeAttribute(clientId: string, key: string) {
    const variant = variants.find((item) => item.clientId === clientId);

    if (!variant) {
      return;
    }

    const nextAttributes = {
      ...variant.attributes,
    };

    delete nextAttributes[key];

    updateVariant(clientId, {
      attributes: nextAttributes,
    });
  }

  function addCustomAttribute() {
    if (!activeVariant) {
      return;
    }

    const key = customAttributeName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!key) {
      return;
    }

    updateVariant(activeVariant.clientId, {
      attributes: {
        ...activeVariant.attributes,
        [key]: activeVariant.attributes[key] ?? "",
      },
    });

    setCustomAttributeName("");
  }

  if (!activeVariant) {
    return (
      <div className="border border-dashed border-white/15 bg-black/20 px-6 py-14 text-center">
        <Package className="mx-auto h-7 w-7 text-white/30" />

        <p className="mt-4 font-semibold">No configurations</p>

        <button
          type="button"
          onClick={addVariant}
          className="mt-5 inline-flex min-h-11 items-center gap-2 border border-white bg-white px-5 text-xs font-semibold uppercase tracking-[0.12em] text-black"
        >
          <Plus className="h-4 w-4" />
          Create configuration
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border border-white/10 bg-black/20">
        <div className="border-b border-white/10 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Sellable configurations
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="border border-white/10 bg-white/[0.03] p-3">
              <span className="text-[9px] uppercase tracking-[0.12em] text-white/30">
                Total
              </span>
              <strong className="mt-1 block text-lg">{variants.length}</strong>
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-3">
              <span className="text-[9px] uppercase tracking-[0.12em] text-white/30">
                Live
              </span>
              <strong className="mt-1 block text-lg">
                {availableConfigurations}
              </strong>
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-3">
              <span className="text-[9px] uppercase tracking-[0.12em] text-white/30">
                Stock
              </span>
              <strong className="mt-1 block text-lg">{totalStock}</strong>
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {orderedVariants.map((variant, index) => {
            const active = activeVariant.clientId === variant.clientId;

            const status = availabilityOptions.find(
              (option) => option.value === variant.availability_status,
            );

            return (
              <button
                key={variant.clientId}
                type="button"
                onClick={() => setActiveVariantId(variant.clientId)}
                className={`flex w-full items-center gap-3 px-4 py-4 text-left transition ${
                  active
                    ? "bg-white text-black"
                    : "text-white hover:bg-white/[0.05]"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center border text-[10px] font-semibold ${
                    active ? "border-black/10" : "border-white/10 text-white/35"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {variant.variant_name.trim() ||
                      `Configuration ${index + 1}`}
                  </span>

                  <span
                    className={`mt-1 flex items-center gap-2 text-[10px] ${
                      active ? "text-black/45" : "text-white/35"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        status?.className ?? ""
                      }`}
                    />

                    {status?.label ?? "Unknown"}
                  </span>
                </span>

                <ChevronRight
                  className={`h-4 w-4 ${
                    active ? "text-black/40" : "text-white/25"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={addVariant}
            className="flex min-h-12 w-full items-center justify-center gap-2 border border-white/15 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white hover:bg-white hover:text-black"
          >
            <CirclePlus className="h-4 w-4" />
            Add configuration
          </button>
        </div>
      </aside>

      <section className="min-w-0 border border-white/10 bg-black/20">
        <header className="flex flex-col gap-5 border-b border-white/10 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Configuration editor
            </p>

            <h3 className="mt-2 text-2xl font-semibold">
              {activeVariant.variant_name.trim() || "Untitled configuration"}
            </h3>

            <p className="mt-2 text-sm text-white/35">
              Define exactly what the customer is purchasing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {saveExistingConfigurationIntent &&
            !activeVariant.id ? (
              <button
                type="button"
                onClick={saveActiveConfiguration}
                title="Save this new configuration so photographs can be assigned to it"
                className="st-admin-save-configuration inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/[0.13]"
              >
                <Save className="h-4 w-4" />
                Save configuration
              </button>
            ) : null}

            <div
              className="inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.035]"
              title="Choose where this configuration appears to customers"
            >
              <button
                type="button"
                onClick={() =>
                  moveVariant(
                    activeVariant.clientId,
                    "up",
                  )
                }
                disabled={
                  activeVariantOrderIndex <= 0
                }
                className="min-h-11 rounded-none border-0 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-white/55 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-25"
              >
                ↑ Earlier
              </button>

              <span className="border-x border-white/10 px-3 text-[10px] font-semibold text-white/35">
                {activeVariantOrderIndex + 1}
                {" / "}
                {orderedVariants.length}
              </span>

              <button
                type="button"
                onClick={() =>
                  moveVariant(
                    activeVariant.clientId,
                    "down",
                  )
                }
                disabled={
                  activeVariantOrderIndex >=
                  orderedVariants.length - 1
                }
                className="min-h-11 rounded-none border-0 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-white/55 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-25"
              >
                Later ↓
              </button>
            </div>

            <button
              type="button"
              onClick={generateActiveVariantName}
              title="Build the configuration name from its selected options"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/60 transition hover:border-white hover:bg-white hover:text-black"
            >
              <Check className="h-4 w-4" />
              Generate name
            </button>

            <button
              type="button"
              onClick={() =>
                duplicateVariant(
                  activeVariant,
                )
              }
              title="Copy this configuration, then change only the options that are different"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-white transition hover:border-white hover:bg-white hover:text-black"
            >
              <CirclePlus className="h-4 w-4" />
              Duplicate
            </button>

            {variants.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  removeVariant(
                    activeVariant.clientId,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-400/20 px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-red-300 transition hover:bg-red-400/[0.08]"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            ) : null}
          </div>
        </header>

        <div className="p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                Configuration name
              </span>

              <input
                value={activeVariant.variant_name}
                onChange={(event) =>
                  updateVariant(activeVariant.clientId, {
                    variant_name: event.target.value,
                  })
                }
                placeholder="e.g. 256GB / Black"
                className="mt-3 min-h-14 w-full border border-white/10 bg-black/30 px-4 text-white outline-none transition placeholder:text-white/20 focus:border-white/50"
              />

              <span className="mt-2 block text-xs leading-5 text-white/25">
                We build this automatically from important options such as
                colour, storage and RAM. You can still type your own name at
                any time.
              </span>
            </label>

            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                SKU
              </span>

              <input
                value={activeVariant.sku}
                onChange={(event) =>
                  updateVariant(activeVariant.clientId, {
                    sku: event.target.value,
                  })
                }
                placeholder="Optional internal SKU"
                className="mt-3 min-h-14 w-full border border-white/10 bg-black/30 px-4 text-white outline-none transition placeholder:text-white/20 focus:border-white/50"
              />
            </label>
          </div>

                      <section className="st-admin-config-color mt-8 border-t border-white/10 pt-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/40">
                    Product colour
                  </p>

                  <h4 className="mt-2 text-xl font-semibold">
                    Choose configuration colour
                  </h4>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                    Select the physical colour for this configuration. The full palette stays hidden until you need it.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setColorPickerOpen((current) => !current)
                  }
                  aria-expanded={colorPickerOpen}
                  className="st-admin-color-trigger"
                >
                  <span
                    className="st-admin-color-trigger__swatch"
                    style={{
                      background:
                        productColorPalette.find(
                          (colour) =>
                            colour.name === activeVariant.attributes.color,
                        )?.hex ?? "#f5f5f7",
                    }}
                    aria-hidden="true"
                  />

                  <span className="min-w-0 flex-1 truncate text-left">
                    {activeVariant.attributes.color || "Choose colour"}
                  </span>

                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition ${
                      colorPickerOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>
              </div>

              {colorPickerOpen ? (
                <div className="st-admin-color-panel">
                  <div className="st-admin-color-grid">
                    {productColorPalette.map((colour) => {
                      const selected =
                        activeVariant.attributes.color === colour.name;

                      return (
                        <button
                          key={colour.name}
                          type="button"
                          aria-pressed={selected}
                          className={`st-admin-color-option ${
                            selected ? "is-selected" : ""
                          }`}
                          onClick={() => {
                            updateAttribute(
                              activeVariant.clientId,
                              "color",
                              colour.name,
                            );

                            setColorPickerOpen(false);
                          }}
                        >
                          <span
                            className="st-admin-color-option__swatch"
                            style={{ background: colour.hex }}
                            aria-hidden="true"
                          />

                          <span className="truncate">
                            {colour.name}
                          </span>

                          {selected ? (
                            <Check
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          ) : (
                            <span />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  
                </div>
              ) : null}
            </section>


<section className="mt-8 border-t border-white/10 pt-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/40">
                Technical specifications
              </p>

              <h4 className="mt-2 text-xl font-semibold">
                Configuration attributes
              </h4>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                Choose the exact predefined value for each built-in specification. Built-in attributes are selection-only. Use Add spec below only when you need an additional custom specification.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {suggestedAttributes.map(([key, label]) => {
                const options =
                  optionsForAttribute(
                    key,
                    brandName,
                  );

                /*
                 * Built-in catalogue attributes are deliberately
                 * selection-only.
                 *
                 * This keeps configuration data consistent and avoids
                 * values such as:
                 *
                 *   512gb
                 *   512 GB
                 *   512G
                 *
                 * becoming three different storefront options.
                 *
                 * Free typing belongs only to Custom specifications.
                 */
                if (options.length === 0) {
                  return null;
                }

                const selectedValue =
                  activeVariant.attributes[key] ?? "";

                return (
                  <label
                    key={key}
                    className="border border-white/10 bg-black/20 p-4"
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
                      {label}
                    </span>

                    <div className="relative mt-3">
                      <select
                        value={selectedValue}
                        onChange={(event) =>
                          updateAttribute(
                            activeVariant.clientId,
                            key,
                            event.target.value,
                          )
                        }
                        className="min-h-12 w-full cursor-pointer appearance-none border border-white/10 bg-black/30 px-3 pr-11 text-sm text-white outline-none transition focus:border-white/45"
                      >
                        <option value="">
                          Select {label}
                        </option>

                        {options.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          ),
                        )}
                      </select>

                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-white/35"
                      >
                        ▼
                      </span>
                    </div>

                    <span className="mt-2 block text-[11px] leading-5 text-white/25">
                      {attributeHelpText(
                        key,
                        brandName,
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            {Object.entries(activeVariant.attributes).filter(
              ([key]) =>
                !suggestedAttributes.some(
                  ([suggestedKey]) => suggestedKey === key,
                ),
            ).length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(activeVariant.attributes)
                  .filter(
                    ([key]) =>
                      !suggestedAttributes.some(
                        ([suggestedKey]) => suggestedKey === key,
                      ),
                  )
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
                          {humanizeAttributeKey(key)}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeAttribute(activeVariant.clientId, key)
                          }
                          aria-label={`Remove ${humanizeAttributeKey(key)}`}
                          className="text-white/30 transition hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <input
                        value={value}
                        onChange={(event) =>
                          updateAttribute(
                            activeVariant.clientId,
                            key,
                            event.target.value,
                          )
                        }
                        className="mt-3 w-full border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-white/45"
                      />
                    </div>
                  ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={customAttributeName}
                onChange={(event) => setCustomAttributeName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomAttribute();
                  }
                }}
                placeholder="Custom specification name, e.g. Charging standard"
                className="min-h-12 flex-1 border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/45"
              />

              <button
                type="button"
                onClick={addCustomAttribute}
                className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black"
              >
                <Plus className="h-4 w-4" />
                Add spec
              </button>
            </div>
          </section>

          <section className="mt-8 border-t border-white/10 pt-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/40">
              Pricing
            </p>

            <h4 className="mt-2 text-xl font-semibold">
              Configuration price
            </h4>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
              Set the selling price for this exact configuration. Different
              storage, memory, colour or edition combinations can have their
              own prices.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Regular price
                </span>

                <div className="mt-3 flex min-h-14 overflow-hidden border border-white/10 bg-black/30 focus-within:border-white/50">
                  <span className="flex items-center border-r border-white/10 px-4 text-white/35">
                    $
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={activeVariant.regular_price}
                    onChange={(event) =>
                      updateVariant(activeVariant.clientId, {
                        regular_price:
                          event.target.value === ""
                            ? ""
                            : Math.max(0, Number(event.target.value)),
                      })
                    }
                    placeholder="0.00"
                    className="w-full bg-transparent px-4 text-white outline-none placeholder:text-white/20"
                  />
                </div>
              </label>

              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Sale price
                </span>

                <div className="mt-3 flex min-h-14 overflow-hidden border border-white/10 bg-black/30 focus-within:border-white/50">
                  <span className="flex items-center border-r border-white/10 px-4 text-white/35">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activeVariant.sale_price}
                    onChange={(event) =>
                      updateVariant(activeVariant.clientId, {
                        sale_price:
                          event.target.value === ""
                            ? ""
                            : Math.max(0, Number(event.target.value)),
                      })
                    }
                    placeholder="Optional"
                    className="w-full bg-transparent px-4 text-white outline-none placeholder:text-white/20"
                  />
                </div>
              </label>
            </div>

            {activeVariant.sale_price !== "" &&
            activeVariant.regular_price !== "" &&
            Number(activeVariant.sale_price) >=
              Number(activeVariant.regular_price) ? (
              <div className="mt-4 flex items-start gap-3 border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
                <span>
                  Sale price must be lower than the regular price.
                </span>
              </div>
            ) : null}
          </section>

          <section className="mt-8 border-t border-white/10 pt-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/40">
              Inventory
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Stock quantity
                </span>

                <input
                  type="number"
                  min="0"
                  disabled={
                    activeVariant.availability_status === "out_of_stock" ||
                    activeVariant.availability_status === "coming_soon"
                  }
                  value={
                    activeVariant.availability_status === "out_of_stock" ||
                    activeVariant.availability_status === "coming_soon"
                      ? 0
                      : activeVariant.stock_quantity
                  }
                  onChange={(event) =>
                    updateVariant(activeVariant.clientId, {
                      stock_quantity: Math.max(
                        0,
                        Number(event.target.value) || 0,
                      ),
                    })
                  }
                  className="mt-3 min-h-14 w-full border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-white/50 disabled:opacity-30"
                />
              </label>

              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Low-stock threshold
                </span>

                <input
                  type="number"
                  min="0"
                  value={activeVariant.low_stock_threshold}
                  onChange={(event) =>
                    updateVariant(activeVariant.clientId, {
                      low_stock_threshold: Math.max(
                        0,
                        Number(event.target.value) || 0,
                      ),
                    })
                  }
                  className="mt-3 min-h-14 w-full border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-white/50"
                />
              </label>
            </div>
          </section>

                      <section className="mt-8 border-t border-white/10 pt-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/40">
                Selling status
              </p>

              <h4 className="mt-2 text-xl font-semibold">
                Customer availability
              </h4>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                Choose how this exact configuration should appear and behave in the store.
              </p>

              <div className="st-admin-selling-status mt-5">
                {availabilityOptions.map((option) => {
                  const active =
                    activeVariant.availability_status === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      className={`st-admin-selling-status__option ${option.className} ${
                        active ? "is-selected" : ""
                      }`}
                      onClick={() =>
                        updateVariant(activeVariant.clientId, {
                          availability_status: option.value,
                          stock_quantity:
                            option.value === "out_of_stock" ||
                            option.value === "coming_soon"
                              ? 0
                              : activeVariant.stock_quantity,
                        })
                      }
                    >
<span className="st-admin-selling-status__copy">
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
        </div>
      </section>
    </div>
  );
}
