"use client";

import { Check, ChevronDown, Palette, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export type ConfigurationColorValue = {
  name: string;
  hex: string;
};

type Props = {
  value?: ConfigurationColorValue | null;
  onChange: (value: ConfigurationColorValue) => void;
};

const presetColors: ConfigurationColorValue[] = [
  { name: "Black", hex: "#111111" },
  { name: "Midnight", hex: "#1D2530" },
  { name: "Graphite", hex: "#4B4B4D" },
  { name: "Space Gray", hex: "#6B6B6D" },
  { name: "Silver", hex: "#C9C9C9" },
  { name: "White", hex: "#F7F7F5" },
  { name: "Cream", hex: "#EFE7D5" },
  { name: "Beige", hex: "#D8C3A5" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Titanium", hex: "#8D8A83" },
  { name: "Natural Titanium", hex: "#A69F91" },
  { name: "Desert Titanium", hex: "#B39A82" },
  { name: "Blue", hex: "#2F6BFF" },
  { name: "Navy", hex: "#14213D" },
  { name: "Sky Blue", hex: "#7CC7F2" },
  { name: "Teal", hex: "#2A9D8F" },
  { name: "Turquoise", hex: "#40C9C6" },
  { name: "Green", hex: "#4E8B57" },
  { name: "Mint", hex: "#98D8C8" },
  { name: "Olive", hex: "#727A3E" },
  { name: "Yellow", hex: "#F4C430" },
  { name: "Orange", hex: "#F57C00" },
  { name: "Coral", hex: "#FF6F61" },
  { name: "Red", hex: "#D92D20" },
  { name: "Burgundy", hex: "#6B1D2A" },
  { name: "Pink", hex: "#E98AAE" },
  { name: "Hot Pink", hex: "#FF4FA3" },
  { name: "Purple", hex: "#7651C9" },
  { name: "Lavender", hex: "#B9A7E8" },
  { name: "Brown", hex: "#765341" },
  { name: "Copper", hex: "#B87333" },
];

export default function ConfigurationColorPicker({
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customHex, setCustomHex] = useState("#f5b335");
  const [customName, setCustomName] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return presetColors;

    return presetColors.filter((color) =>
      color.name.toLowerCase().includes(normalized),
    );
  }, [query]);

  function choose(color: ConfigurationColorValue) {
    onChange(color);
    setOpen(false);
    setQuery("");
  }

  function addCustom() {
    const name = customName.trim();

    if (!name) return;

    choose({
      name,
      hex: customHex.toUpperCase(),
    });

    setCustomName("");
  }

  return (
    <div className="st-admin-v5-color">
      <button
        type="button"
        className="st-admin-v5-color__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span
          className="st-admin-v5-color__selected-swatch"
          style={{ backgroundColor: value?.hex ?? "#d1d1d6" }}
        />

        <span>
          <small>Configuration colour</small>
          <strong>{value?.name || "Choose colour"}</strong>
        </span>

        <ChevronDown className={open ? "is-open" : ""} />
      </button>

      {open ? (
        <section className="st-admin-v5-color__panel">
          <header>
            <div>
              <Palette />
              <span>
                <small>Colour library</small>
                <strong>Choose a product colour</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close colour library"
            >
              <X />
            </button>
          </header>

          <label className="st-admin-v5-color__search">
            <Search />
            <input id="st-colour-library-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search colours..."
            />
          </label>

          <div className="st-admin-v5-color__grid">
            {filtered.map((color) => {
              const selected =
                value?.name === color.name &&
                value?.hex.toLowerCase() === color.hex.toLowerCase();

              return (
                <button
                  key={`${color.name}-${color.hex}`}
                  type="button"
                  className={selected ? "is-selected" : ""}
                  onClick={() => choose(color)}
                >
                  <i style={{ backgroundColor: color.hex }} />
                  <span>{color.name}</span>
                  {selected ? <Check /> : null}
                </button>
              );
            })}
          </div>

          <div className="st-admin-v5-color__custom">
            

            <div className="st-admin-v5-color__custom-editor">
              <label className="st-admin-v5-color__wheel">
                <input
                  type="color"
                  value={customHex}
                  onChange={(event) => setCustomHex(event.target.value)}
                />
                <span style={{ backgroundColor: customHex }} />
              </label>

              <label>
                <small>Colour name</small>
                <input
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="e.g. Stereophonie Sand"
                />
              </label>

              <label>
                <small>HEX</small>
                <input
                  value={customHex.toUpperCase()}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(next)) {
                      setCustomHex(next);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={addCustom}
                disabled={!customName.trim() || !/^#[0-9A-Fa-f]{6}$/.test(customHex)}
              >
                <Plus />
                Add colour
              </button>
            </div>

            <p>
              Custom colours can later be stored in your permanent admin colour
              library after the database migration is applied.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
