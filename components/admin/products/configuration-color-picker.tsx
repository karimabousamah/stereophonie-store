"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  canonicalizeProductColorwayName,
  normalizeProductColorway,
  productColorwayHex,
} from "@/lib/product-colorways";

export type ConfigurationColorValue = {
  name: string;
  hex: string;
};

type Props = {
  value?: ConfigurationColorValue | null;
  onChange: (value: ConfigurationColorValue) => void;
};

const rawPresetColors: ConfigurationColorValue[] = [
  // Essentials
  { name: "Black", hex: "#111111" },
  { name: "Jet Black", hex: "#0A0A0A" },
  { name: "Matte Black", hex: "#1C1C1E" },
  { name: "Glossy Black", hex: "#171717" },
  { name: "Carbon Black", hex: "#242424" },
  { name: "Midnight", hex: "#1D2530" },
  { name: "Graphite", hex: "#4B4B4D" },
  { name: "Charcoal", hex: "#454547" },
  { name: "Dark Gray", hex: "#555558" },
  { name: "Gray", hex: "#808083" },
  { name: "Space Gray", hex: "#6B6B6D" },
  { name: "Light Gray", hex: "#B8B8BA" },
  { name: "Silver", hex: "#C9C9C9" },
  { name: "Platinum", hex: "#D5D2CB" },
  { name: "White", hex: "#F7F7F5" },
  { name: "Pearl White", hex: "#F4F1EA" },
  { name: "Clear", hex: "transparent" },

  // Apple-style finishes
  { name: "Natural Titanium", hex: "#A69F91" },
  { name: "Black Titanium", hex: "#3C3B3A" },
  { name: "White Titanium", hex: "#E4E2DD" },
  { name: "Blue Titanium", hex: "#3E4855" },
  { name: "Desert Titanium", hex: "#B39A82" },
  { name: "Titanium", hex: "#8D8A83" },
  { name: "Starlight", hex: "#F0E6D3" },
  { name: "Space Black", hex: "#303033" },
  { name: "Alpine Green", hex: "#576856" },
  { name: "Sierra Blue", hex: "#9BB5CE" },
  { name: "Deep Purple", hex: "#51495C" },
  { name: "Pacific Blue", hex: "#365B6D" },
  { name: "Ultramarine", hex: "#5967D8" },
  { name: "Teal", hex: "#2A9D8F" },
  { name: "Pink", hex: "#E98AAE" },
  { name: "Product Red", hex: "#C8252C" },
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Gold", hex: "#D4AF37" },

  // Samsung-style finishes
  { name: "Phantom Black", hex: "#242426" },
  { name: "Phantom White", hex: "#F0F0ED" },
  { name: "Phantom Silver", hex: "#B9B7C0" },
  { name: "Phantom Gray", hex: "#6E7073" },
  { name: "Phantom Violet", hex: "#A99BC0" },
  { name: "Phantom Green", hex: "#53645A" },
  { name: "Phantom Navy", hex: "#35445C" },
  { name: "Cream", hex: "#EFE7D5" },
  { name: "Lavender", hex: "#B9A7E8" },
  { name: "Mint", hex: "#98D8C8" },
  { name: "Graphite Gray", hex: "#57585B" },
  { name: "Bora Purple", hex: "#8D79A8" },
  { name: "Awesome Black", hex: "#202124" },
  { name: "Awesome White", hex: "#F3F3F1" },
  { name: "Awesome Blue", hex: "#79A8C9" },
  { name: "Awesome Violet", hex: "#A69AC8" },
  { name: "Awesome Lime", hex: "#C5D97A" },
  { name: "Navy", hex: "#14213D" },

  // Fitbit / fitness colors
  { name: "Lunar White", hex: "#E9E5DB" },
  { name: "Soft Gold", hex: "#C9AD7F" },
  { name: "Platinum Silver", hex: "#BFC0C2" },
  { name: "Obsidian", hex: "#26272A" },
  { name: "Porcelain", hex: "#E8E2D8" },
  { name: "Bay Blue", hex: "#557E9E" },
  { name: "Coral", hex: "#FF6F61" },
  { name: "Rose", hex: "#C9858D" },
  { name: "Lilac", hex: "#B8A6CE" },
  { name: "Sage", hex: "#9BAA8F" },

  // Huawei-style finishes
  { name: "Emerald Green", hex: "#35685C" },
  { name: "Forest Green", hex: "#405C4B" },
  { name: "Spruce Green", hex: "#50675A" },
  { name: "Nebula Gray", hex: "#73777B" },
  { name: "Mystic Silver", hex: "#C1C5C7" },
  { name: "Golden Black", hex: "#292623" },
  { name: "Crystal Blue", hex: "#89BBD1" },
  { name: "Sakura Pink", hex: "#E7B9C1" },
  { name: "Isle Blue", hex: "#7D9DB3" },
  { name: "Green", hex: "#4E8B57" },

  // Google / Pixel-style colors
  { name: "Porcelain White", hex: "#E8E3D9" },
  { name: "Hazel", hex: "#7C8175" },
  { name: "Bay", hex: "#6D91B4" },
  { name: "Peony", hex: "#E79BA8" },
  { name: "Wintergreen", hex: "#A9C5B5" },
  { name: "Lemongrass", hex: "#C9CF9E" },
  { name: "Snow", hex: "#F1F1EE" },
  { name: "Stormy Black", hex: "#333438" },
  { name: "Sorta Seafoam", hex: "#A8C4B8" },

  // Blues
  { name: "Blue", hex: "#2F6BFF" },
  { name: "Sky Blue", hex: "#7CC7F2" },
  { name: "Ice Blue", hex: "#B5DCEB" },
  { name: "Royal Blue", hex: "#3155A6" },
  { name: "Cobalt Blue", hex: "#315FA8" },
  { name: "Ocean Blue", hex: "#3E7795" },
  { name: "Aqua Blue", hex: "#58B6C9" },
  { name: "Turquoise", hex: "#40C9C6" },
  { name: "Cyan", hex: "#39C6D4" },

  // Greens
  { name: "Mint Green", hex: "#A3D9C9" },
  { name: "Olive", hex: "#727A3E" },
  { name: "Olive Green", hex: "#68704A" },
  { name: "Lime", hex: "#A8C93F" },
  { name: "Lime Green", hex: "#8FCB48" },
  { name: "Neon Green", hex: "#57E32C" },

  // Reds / oranges / yellows
  { name: "Red", hex: "#D92D20" },
  { name: "Crimson", hex: "#A9232D" },
  { name: "Burgundy", hex: "#6B1D2A" },
  { name: "Wine Red", hex: "#722F37" },
  { name: "Orange", hex: "#F57C00" },
  { name: "Burnt Orange", hex: "#C8672A" },
  { name: "Yellow", hex: "#F4C430" },
  { name: "Mustard", hex: "#FDB73E" },

  // Pink / purple
  { name: "Hot Pink", hex: "#FF4FA3" },
  { name: "Blush Pink", hex: "#E8B4B8" },
  { name: "Light Pink", hex: "#F0B8C6" },
  { name: "Purple", hex: "#7651C9" },
  { name: "Violet", hex: "#7759A6" },
  { name: "Lilac Purple", hex: "#B39DDB" },

  // Natural / metallic
  { name: "Beige", hex: "#D8C3A5" },
  { name: "Sand", hex: "#CDBA96" },
  { name: "Tan", hex: "#B7926A" },
  { name: "Brown", hex: "#765341" },
  { name: "Chocolate", hex: "#5B4036" },
  { name: "Copper", hex: "#B87333" },
  { name: "Bronze", hex: "#9C7148" },
  { name: "Champagne", hex: "#D8C3A5" },

  // Gaming / accessories
  { name: "RGB Black", hex: "#18181B" },
  { name: "Mercury White", hex: "#E8E8E6" },
  { name: "Quartz Pink", hex: "#E7A8B6" },
  { name: "Gunmetal", hex: "#4D5154" },
  { name: "Steel Gray", hex: "#71777A" },
  { name: "Neon Yellow", hex: "#D9E632" },

  // Extended electronics color library
  { name: "Berry", hex: "#9B3158" },
  { name: "Dark Berry", hex: "#702840" },
  { name: "Wild Berry", hex: "#A43C64" },
  { name: "Raspberry", hex: "#B3345C" },
  { name: "Raspberry Pink", hex: "#C74770" },
  { name: "Strawberry", hex: "#D95065" },
  { name: "Cranberry", hex: "#9E2A46" },
  { name: "Cherry Red", hex: "#B52B3B" },
  { name: "Cherry Pink", hex: "#D9667B" },
  { name: "Plum", hex: "#70405D" },
  { name: "Deep Plum", hex: "#513346" },
  { name: "Mulberry", hex: "#78435E" },
  { name: "Mauve", hex: "#A77A91" },
  { name: "Dusty Rose", hex: "#C58C98" },
  { name: "Rose Quartz", hex: "#D5A5AD" },
  { name: "Obsidian Black", hex: "#292A2D" },

  { name: "Iris", hex: "#A9A3C5" },

  { name: "Titanium Black", hex: "#2F3032" },
  { name: "Titanium Gray", hex: "#777773" },
  { name: "Titanium Silverblue", hex: "#A8B6BD" },
  { name: "Titanium Blue", hex: "#526676" },
  { name: "Titanium Green", hex: "#596B60" },
  { name: "Titanium Violet", hex: "#716A80" },
  { name: "Titanium Yellow", hex: "#D5C79E" },

  { name: "Emerald", hex: "#397364" },

  { name: "Pink Gold", hex: "#CFA5A2" },
  { name: "Sand White", hex: "#DED4C4" },
  { name: "Frost Silver", hex: "#C3C5C6" },
  { name: "Midnight Black", hex: "#222326" },

  { name: "Jade Cyan", hex: "#7CB8B2" },
  { name: "Ocean Cyan", hex: "#70AAB9" },
  { name: "Velvet Black", hex: "#28282A" },
  { name: "Sunrise Orange", hex: "#CF815F" },
  { name: "Moonlight White", hex: "#ECE9E2" },
  { name: "Crystal Silver", hex: "#C3C4C5" },

  { name: "Rock Gray", hex: "#777A7B" },
  { name: "Aurora Purple", hex: "#A28AB0" },

  { name: "Coral Green", hex: "#78AA93" },

  { name: "Watermelon", hex: "#D76670" },

  { name: "Mist Blue", hex: "#86AABD" },
  { name: "Sage Gray", hex: "#919C91" },

  { name: "Emerald Dusk", hex: "#3D7464" },
  { name: "Glacial Blue", hex: "#9EC8D9" },
  { name: "Astral Black", hex: "#212225" },
  { name: "Moonstone Gray", hex: "#A3A5A4" },
  { name: "Arctic Dawn", hex: "#D9DADB" },
  { name: "Forest Emerald", hex: "#38705B" },

  { name: "Cosmic Orange", hex: "#D86C38" },
  { name: "Burnt Titanium", hex: "#9A765D" },
  { name: "Champagne Gold", hex: "#D5BE98" },
  { name: "Midnight Green", hex: "#43534A" },
  { name: "Space Silver", hex: "#B9B9B8" },
  { name: "Slate", hex: "#596168" },
  { name: "Slate Gray", hex: "#62696D" },
  { name: "Mustard Yellow", hex: "#FDB73E" },
  { name: "Golden Yellow", hex: "#E4B640" },
  { name: "Sunflower Yellow", hex: "#E4BC39" },
  { name: "Amber", hex: "#D9982F" },
  { name: "Amber Orange", hex: "#D98536" },
  { name: "Tangerine", hex: "#E77735" },
  { name: "Apricot", hex: "#DEA073" },
  { name: "Peach", hex: "#E9AC8B" },
  { name: "Pistachio", hex: "#A7B997" },
  { name: "Seafoam", hex: "#93BEB1" },
  { name: "Moss Green", hex: "#697A5A" },
  { name: "Pine Green", hex: "#3D5C4C" },
  { name: "Army Green", hex: "#5C6547" },
  { name: "Jade Green", hex: "#4E8979" },
  { name: "Kelly Green", hex: "#4D915A" },
  { name: "Denim Blue", hex: "#597B98" },
  { name: "Steel Blue", hex: "#637F92" },
  { name: "Midnight Blue", hex: "#283A50" },
  { name: "Electric Blue", hex: "#396BCE" },
  { name: "Azure", hex: "#559BC7" },
  { name: "Cerulean", hex: "#4D91B4" },
  { name: "Powder Blue", hex: "#A8C8D8" },
  { name: "Orchid", hex: "#A56A9D" },
  { name: "Amethyst", hex: "#826A9A" },
  { name: "Eggplant", hex: "#574052" },
  { name: "Pastel Purple", hex: "#BAA7C9" },
  { name: "Magenta", hex: "#BF4C86" },
  { name: "Fuchsia", hex: "#C94591" },
  { name: "Pastel Pink", hex: "#E8BCC7" },
  { name: "Stone", hex: "#AAA398" },
  { name: "Stone Gray", hex: "#928F89" },
  { name: "Taupe", hex: "#968476" },
  { name: "Khaki", hex: "#A49B75" },
  { name: "Ivory", hex: "#ECE5D5" },
  { name: "Off White", hex: "#EEECE6" },
  { name: "Sandstone", hex: "#BCAE99" },
  { name: "Coffee Brown", hex: "#654B3B" },
  { name: "Mocha", hex: "#806656" },
  { name: "Neon Purple", hex: "#8D45E8" },
  { name: "Neon Pink", hex: "#EC4B9B" },
  { name: "Neon Blue", hex: "#3E7FE8" },
  { name: "Neon Cyan", hex: "#36C8CE" },
  { name: "Cyber Green", hex: "#65D63F" },
  { name: "Cyber Yellow", hex: "#DCE241" },
  { name: "Racing Red", hex: "#CC3038" },
  { name: "Gunmetal Gray", hex: "#52595D" },
  { name: "Stealth Black", hex: "#191A1C" },
  { name: "Frost White", hex: "#E8E9E8" },
];

const presetColors = Array.from(
  new Map(
    rawPresetColors.map((colorway) => {
      const normalized = normalizeProductColorway(colorway);

      return [normalized.name.toLocaleLowerCase(), normalized] as const;
    }),
  ).values(),
);

function swatchStyle(hex: string) {
  if (hex !== "transparent") {
    return { backgroundColor: hex };
  }

  return {
    backgroundColor: "#ffffff",
    backgroundImage:
      "linear-gradient(45deg, #d1d1d6 25%, transparent 25%), linear-gradient(-45deg, #d1d1d6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d1d6 75%), linear-gradient(-45deg, transparent 75%, #d1d1d6 75%)",
    backgroundSize: "8px 8px",
    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
  };
}

export default function ConfigurationColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredColors = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return presetColors;
    }

    return presetColors.filter((color) =>
      color.name.toLowerCase().includes(normalized),
    );
  }, [query]);

  function chooseColor(color: ConfigurationColorValue) {
    const name = canonicalizeProductColorwayName(color.name);

    onChange({
      name,
      hex: productColorwayHex(name) ?? color.hex,
    });

    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative w-fit">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex h-10 min-w-[190px] max-w-[245px] items-center gap-2.5 rounded-[10px] border border-black/10 bg-white px-3 text-left transition hover:border-black/20 hover:bg-[#fafafa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b335]/25"
      >
        <span
          className="h-5 w-5 shrink-0 rounded-full border border-black/10"
          style={swatchStyle(value?.hex ?? "#e5e5e7")}
          aria-hidden="true"
        />

        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#1d1d1f]">
          {value?.name || "Choose a color"}
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-black/35 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-[470px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[16px] border border-black/10 bg-white shadow-[0_22px_60px_rgba(0,0,0,0.16)]">
          <div className="flex items-center gap-2 border-b border-black/[0.07] bg-white p-3">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
                strokeWidth={1.8}
                aria-hidden="true"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search colors..."
                className="h-10 w-full rounded-[10px] border border-black/10 bg-[#f7f7f8] pl-10 pr-4 text-[12px] text-[#1d1d1f] outline-none transition placeholder:text-black/30 hover:border-black/15 focus:border-[#e4a42d] focus:bg-white focus:ring-0"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              aria-label="Close color selector"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-black/10 bg-[#f7f7f8] p-0 text-black/40 transition-all duration-200 hover:border-[#fdb73e]/70 hover:bg-[#fff8e9] hover:text-black hover:shadow-[0_0_0_3px_rgba(253,183,62,0.14),0_0_18px_rgba(253,183,62,0.20)]"
            >
              <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-3">
            {filteredColors.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {filteredColors.map((color) => {
                  const selected =
                    value?.name === color.name &&
                    value?.hex.toLowerCase() === color.hex.toLowerCase();

                  return (
                    <button
                      key={`${color.name}-${color.hex}`}
                      type="button"
                      onClick={() => chooseColor(color)}
                      className={`flex h-10 min-w-0 items-center gap-2.5 rounded-[10px] border px-3 text-left text-[11px] font-medium transition ${
                        selected
                          ? "border-[#e2a12d] bg-[#fff8e9] text-[#1d1d1f]"
                          : "border-black/[0.07] bg-[#fafafa] text-black/70 hover:border-black/15 hover:bg-white"
                      }`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-black/10"
                        style={swatchStyle(color.hex)}
                        aria-hidden="true"
                      />

                      <span className="min-w-0 flex-1 truncate">
                        {color.name}
                      </span>

                      {selected ? (
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-[#bf7e08]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px] font-medium text-black/45">
                  No matching colors.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
