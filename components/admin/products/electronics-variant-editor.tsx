"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Copy,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

import ConfigurationColorPicker from "@/components/admin/products/configuration-color-picker";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

export type AdminElectronicsVariant = {
  clientId: string;
  id?: string | null;
  variant_name: string;
  display_position?: number;
  attributes: Record<string, string>;
  sku: string;
  regular_price: number | "";
  sale_price: number | "";
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus | "";
};

type ElectronicsVariantEditorProps = {
  variants: AdminElectronicsVariant[];
  onChange: (variants: AdminElectronicsVariant[]) => void;
  categoryName?: string;
  brandName?: string;
  saveExistingConfigurationIntent?: "publish" | "draft";
};

type OptionLevel = {
  id: string;
  key: string;
  label: string;
  values: string[];
};

const availabilityOptions: {
  value: AvailabilityStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "in_stock",
    label: "In stock",
    description: "Available and ready to purchase.",
  },
  {
    value: "low_stock",
    label: "Low stock",
    description: "Available, but inventory is running low.",
  },
  {
    value: "out_of_stock",
    label: "Out of stock",
    description: "Visible to customers but cannot be purchased.",
  },
  {
    value: "coming_soon",
    label: "Coming soon",
    description: "Visible before this configuration becomes available.",
  },
];

const configurationHierarchyKey = "__configuration_hierarchy";

const hierarchyPresetLabels = [
  "Color",
  "Storage",
  "Screen Size",
  "Size",
  "RAM",
  "Capacity",
  "Connectivity",
  "Material",
  "Model",
  "Generation",
  "Band Size",
  "Case Size",
] as const;

const optionValuePresets: Record<string, string[]> = {
  storage: [
    "1GB",
    "2GB",
    "4GB",
    "8GB",
    "16GB",
    "32GB",
    "64GB",
    "128GB",
    "256GB",
    "512GB",
    "1TB",
    "1.5TB",
    "2TB",
    "3TB",
    "4TB",
    "5TB",
    "6TB",
    "8TB",
    "10TB",
    "12TB",
    "14TB",
    "16TB",
    "18TB",
    "20TB",
    "22TB",
    "24TB",
    "30TB",
    "32TB",
    "36TB",
    "40TB",
    "48TB",
    "60TB",
    "64TB",
    "80TB",
    "100TB",
  ],

  ram: [
    "1GB",
    "2GB",
    "3GB",
    "4GB",
    "6GB",
    "8GB",
    "12GB",
    "16GB",
    "18GB",
    "24GB",
    "32GB",
    "36GB",
    "48GB",
    "64GB",
    "96GB",
    "128GB",
    "192GB",
    "256GB",
    "384GB",
    "512GB",
    "768GB",
    "1TB",
    "1.5TB",
    "2TB",
  ],

  screen_size: [
    '1.2"',
    '1.3"',
    '1.4"',
    '1.5"',
    '1.6"',
    '1.7"',
    '1.8"',
    '2"',
    '2.4"',
    '2.8"',
    '3"',
    '3.2"',
    '3.5"',
    '4"',
    '4.5"',
    '4.7"',
    '5"',
    '5.2"',
    '5.4"',
    '5.5"',
    '5.8"',
    '6"',
    '6.1"',
    '6.2"',
    '6.3"',
    '6.4"',
    '6.5"',
    '6.6"',
    '6.7"',
    '6.8"',
    '6.9"',
    '7"',
    '7.6"',
    '8"',
    '8.3"',
    '8.7"',
    '9"',
    '9.7"',
    '10"',
    '10.1"',
    '10.2"',
    '10.4"',
    '10.5"',
    '10.9"',
    '11"',
    '11.5"',
    '12"',
    '12.1"',
    '12.3"',
    '12.4"',
    '12.9"',
    '13"',
    '13.3"',
    '13.4"',
    '13.5"',
    '14"',
    '14.2"',
    '14.5"',
    '15"',
    '15.3"',
    '15.6"',
    '16"',
    '16.1"',
    '16.2"',
    '17"',
    '17.3"',
    '18"',
    '18.4"',
    '19"',
    '20"',
    '21"',
    '21.5"',
    '22"',
    '23"',
    '23.8"',
    '24"',
    '24.5"',
    '25"',
    '27"',
    '28"',
    '29"',
    '30"',
    '31.5"',
    '32"',
    '34"',
    '35"',
    '38"',
    '40"',
    '42"',
    '43"',
    '45"',
    '48"',
    '49"',
    '50"',
    '55"',
    '58"',
    '60"',
    '65"',
    '70"',
    '75"',
    '77"',
    '80"',
    '82"',
    '83"',
    '85"',
    '86"',
    '88"',
    '90"',
    '92"',
    '95"',
    '97"',
    '98"',
    '100"',
  ],

  size: [
    "XXXS",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
    "4XL",
    "5XL",
    "10cm",
    "15cm",
    "20cm",
    "25cm",
    "30cm",
    "50cm",
    "75cm",
    "0.25m",
    "0.5m",
    "0.75m",
    "1m",
    "1.2m",
    "1.5m",
    "1.8m",
    "2m",
    "2.5m",
    "3m",
    "4m",
    "5m",
    "7.5m",
    "10m",
    "15m",
    "20m",
    "25m",
    "30m",
    "50m",
    "100m",
  ],

  capacity: [
    "50mAh",
    "100mAh",
    "200mAh",
    "300mAh",
    "500mAh",
    "750mAh",
    "1000mAh",
    "1500mAh",
    "2000mAh",
    "2500mAh",
    "3000mAh",
    "3500mAh",
    "4000mAh",
    "4500mAh",
    "5000mAh",
    "6000mAh",
    "7000mAh",
    "8000mAh",
    "10000mAh",
    "12000mAh",
    "15000mAh",
    "20000mAh",
    "25000mAh",
    "30000mAh",
    "40000mAh",
    "50000mAh",
    "50ml",
    "100ml",
    "250ml",
    "500ml",
    "750ml",
    "1L",
    "1.5L",
    "2L",
    "3L",
    "5L",
    "10L",
    "20L",
  ],

  connectivity: [
    "Wi-Fi",
    "Wi-Fi 4",
    "Wi-Fi 5",
    "Wi-Fi 6",
    "Wi-Fi 6E",
    "Wi-Fi 7",
    "Wi-Fi + Cellular",
    "2G",
    "3G",
    "4G",
    "4G LTE",
    "5G",
    "5G mmWave",
    "Bluetooth",
    "Bluetooth 4.0",
    "Bluetooth 4.1",
    "Bluetooth 4.2",
    "Bluetooth 5.0",
    "Bluetooth 5.1",
    "Bluetooth 5.2",
    "Bluetooth 5.3",
    "Bluetooth 5.4",
    "NFC",
    "GPS",
    "GNSS",
    "UWB",
    "Ethernet",
    "Fast Ethernet",
    "Gigabit Ethernet",
    "2.5GbE",
    "5GbE",
    "10GbE",
    "USB-A",
    "USB-C",
    "Micro-USB",
    "Mini-USB",
    "USB 2.0",
    "USB 3.0",
    "USB 3.1",
    "USB 3.2",
    "USB4",
    "Thunderbolt 3",
    "Thunderbolt 4",
    "Thunderbolt 5",
    "HDMI",
    "HDMI 2.0",
    "HDMI 2.1",
    "DisplayPort",
    "DisplayPort 1.4",
    "DisplayPort 2.0",
    "3.5mm Audio",
    "Optical Audio",
    "RCA",
    "Lightning",
    "MagSafe",
    "SIM",
    "Dual SIM",
    "Nano-SIM",
    "eSIM",
    "Dual eSIM",
    "Zigbee",
    "Z-Wave",
    "Thread",
    "Matter",
    "LoRa",
    "LoRaWAN",
  ],

  material: [
    "Plastic",
    "Recycled Plastic",
    "Polycarbonate",
    "ABS",
    "TPU",
    "Silicone",
    "Liquid Silicone",
    "Rubber",
    "Aluminum",
    "Aluminium",
    "Anodized Aluminum",
    "Stainless Steel",
    "Steel",
    "Carbon Steel",
    "Titanium",
    "Titanium Alloy",
    "Magnesium Alloy",
    "Glass",
    "Tempered Glass",
    "Ceramic",
    "Carbon Fiber",
    "Kevlar",
    "Aramid Fiber",
    "Leather",
    "Vegan Leather",
    "Faux Leather",
    "Fabric",
    "Nylon",
    "Polyester",
    "Mesh",
    "Wood",
    "Bamboo",
    "Copper",
    "Brass",
  ],

  generation: [
    "1st Generation",
    "2nd Generation",
    "3rd Generation",
    "4th Generation",
    "5th Generation",
    "6th Generation",
    "7th Generation",
    "8th Generation",
    "9th Generation",
    "10th Generation",
    "11th Generation",
    "12th Generation",
    "13th Generation",
    "14th Generation",
    "15th Generation",
    "16th Generation",
    "17th Generation",
    "18th Generation",
    "19th Generation",
    "20th Generation",
    "Gen 1",
    "Gen 2",
    "Gen 3",
    "Gen 4",
    "Gen 5",
    "Gen 6",
    "Gen 7",
    "Gen 8",
    "Gen 9",
    "Gen 10",
  ],

  band_size: [
    "XS",
    "S",
    "S/M",
    "M",
    "M/L",
    "L",
    "XL",
    "120mm",
    "130mm",
    "140mm",
    "150mm",
    "160mm",
    "170mm",
    "180mm",
    "190mm",
    "200mm",
    "210mm",
    "220mm",
    "230mm",
    "240mm",
    "250mm",
  ],

  case_size: [
    "20mm",
    "22mm",
    "24mm",
    "26mm",
    "28mm",
    "30mm",
    "32mm",
    "34mm",
    "36mm",
    "38mm",
    "40mm",
    "41mm",
    "42mm",
    "43mm",
    "44mm",
    "45mm",
    "46mm",
    "47mm",
    "48mm",
    "49mm",
    "50mm",
    "51mm",
    "52mm",
  ],

  model: [],
};

function presetsForLevel(level: OptionLevel) {
  const key = normalizeKey(level.label || level.key);

  return optionValuePresets[key] ?? [];
}

function SearchableOptionValuePicker({
  level,
  onChange,
}: {
  level: OptionLevel;
  onChange: (values: string[]) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 390,
  });

  const selected = uniqueValues(level.values.map(clean).filter(Boolean));
  const presets = presetsForLevel(level);

  const cleanQuery = clean(query);
  const normalizedQuery = optionIdentity(cleanQuery);

  const allValues = useMemo(
    () => uniqueValues([...selected, ...presets]),
    [selected, presets],
  );

  const filteredValues = useMemo(() => {
    if (!normalizedQuery) {
      return allValues;
    }

    return allValues.filter((value) =>
      optionIdentity(value).includes(normalizedQuery),
    );
  }, [allValues, normalizedQuery]);

  const exactMatch = normalizedQuery
    ? (allValues.find((value) => optionIdentity(value) === normalizedQuery) ??
      null)
    : null;

  const canCreate = Boolean(cleanQuery && !exactMatch);

  useEffect(() => {
    setMounted(true);
  }, []);

  function isSelected(value: string) {
    return selected.some(
      (selectedValue) =>
        optionIdentity(selectedValue) === optionIdentity(value),
    );
  }

  function updatePosition() {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();

    const viewportPadding = 16;
    const desiredWidth = Math.max(rect.width, 390);
    const maximumWidth = Math.min(desiredWidth, window.innerWidth - 32);

    let left = rect.left;

    if (left + maximumWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - maximumWidth - viewportPadding;
    }

    if (left < viewportPadding) {
      left = viewportPadding;
    }

    setPosition({
      top: rect.bottom + 8,
      left,
      width: maximumWidth,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    const handleViewportChange = () => updatePosition();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 30);

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
      setActiveIndex(-1);
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalizedQuery]);

  function toggleValue(value: string) {
    if (isSelected(value)) {
      onChange(
        selected.filter(
          (selectedValue) =>
            optionIdentity(selectedValue) !== optionIdentity(value),
        ),
      );
    } else {
      onChange(uniqueValues([...selected, value]));
    }

    /*
     * Unlike Brand, keep the directory open because this is
     * intentionally a multi-select control.
     */
    setQuery("");
    setActiveIndex(-1);

    requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
  }

  function createRequestedValue() {
    const requestedValue = cleanQuery;

    if (!requestedValue) {
      return;
    }

    const existing =
      allValues.find(
        (value) => optionIdentity(value) === optionIdentity(requestedValue),
      ) ?? null;

    if (existing) {
      if (!isSelected(existing)) {
        onChange(uniqueValues([...selected, existing]));
      }
    } else {
      onChange(uniqueValues([...selected, requestedValue]));
    }

    setQuery("");
    setActiveIndex(-1);

    requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (filteredValues.length === 0) {
        return;
      }

      setActiveIndex((current) =>
        current < filteredValues.length - 1 ? current + 1 : 0,
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (filteredValues.length === 0) {
        return;
      }

      setActiveIndex((current) =>
        current > 0 ? current - 1 : filteredValues.length - 1,
      );

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (activeIndex >= 0 && filteredValues[activeIndex]) {
        toggleValue(filteredValues[activeIndex]);
        return;
      }

      if (filteredValues.length === 1) {
        toggleValue(filteredValues[0]);
        return;
      }

      if (canCreate) {
        createRequestedValue();
      }
    }
  }

  const dropdown =
    mounted && open
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[10000] overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.08)]"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            role="dialog"
            aria-label={`Choose ${level.label}`}
          >
            <div className="border-b border-black/[0.07] p-3">
              <div className="flex min-h-[48px] items-center gap-3 rounded-[13px] border border-black/10 bg-[#f7f7f8] px-3.5 transition focus-within:border-[#d59a2e]/65 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(253,183,62,0.10)]">
                <Search className="h-[17px] w-[17px] shrink-0 text-black/42" />

                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={`Search ${level.label.toLowerCase()}...`}
                  autoComplete="off"
                  className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[14px] font-medium text-[#1d1d1f] outline-none ring-0 shadow-none placeholder:text-black/35 focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none st-admin-product-brand-picker__search-input"
                  aria-label={`Search ${level.label}`}
                  role="combobox"
                  aria-expanded="true"
                  aria-autocomplete="list"
                />

                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-black/35 transition hover:bg-black/[0.055] hover:text-black/70"
                    aria-label={`Clear ${level.label} search`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-4 px-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.17em] text-black/35">
                  {level.label} directory
                </span>

                <span className="text-[11px] font-medium text-black/38">
                  {filteredValues.length}{" "}
                  {filteredValues.length === 1 ? "choice" : "choices"}
                </span>
              </div>
            </div>

            <div className="max-h-[330px] overflow-y-auto overscroll-contain p-2">
              {filteredValues.length > 0 ? (
                <div
                  role="listbox"
                  aria-label={`Available ${level.label}`}
                  aria-multiselectable="true"
                >
                  {filteredValues.map((value, index) => {
                    const selectedValue = isSelected(value);
                    const active = index === activeIndex;

                    return (
                      <button
                        key={value}
                        type="button"
                        role="option"
                        aria-selected={selectedValue}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => toggleValue(value)}
                        className={`mb-1 flex min-h-[46px] w-full items-center justify-between gap-4 rounded-[12px] px-3.5 text-left transition ${
                          selectedValue
                            ? "bg-[#fff6df] text-[#7b5000]"
                            : active
                              ? "bg-black/[0.045] text-black"
                              : "text-black/72 hover:bg-black/[0.035] hover:text-black"
                        }`}
                      >
                        <span className="min-w-0 truncate text-[13px] font-semibold">
                          {value}
                        </span>

                        {selectedValue ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fdb73e] text-black shadow-[0_4px_12px_rgba(253,183,62,0.25)]">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/22">
                            Select
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-7 text-center">
                  <Search className="mx-auto h-5 w-5 text-black/20" />

                  <p className="mt-3 text-[13px] font-semibold text-black/65">
                    No matching {level.label.toLowerCase()}
                  </p>

                  <p className="mt-1 text-[12px] leading-5 text-black/40">
                    You can add this choice without leaving the product.
                  </p>
                </div>
              )}
            </div>

            {canCreate ? (
              <div className="border-t border-black/[0.07] bg-[#fafafa] p-2.5">
                <button
                  type="button"
                  onClick={createRequestedValue}
                  className="group flex min-h-[48px] w-full items-center justify-between gap-4 rounded-[13px] border border-[#e0a535]/55 bg-[#fffaf0] px-3.5 text-left transition hover:border-[#d29525] hover:bg-[#fff5dd] hover:shadow-[0_8px_24px_rgba(253,183,62,0.16)]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fdb73e] text-black shadow-[0_5px_14px_rgba(253,183,62,0.25)]">
                      <Plus className="h-4 w-4" strokeWidth={2.2} />
                    </span>

                    <span className="min-w-0">
                      <strong className="block truncate text-[12px] font-semibold text-[#1d1d1f]">
                        Add “{cleanQuery}”
                      </strong>

                      <small className="mt-0.5 block text-[10px] font-medium text-black/38">
                        Create and select automatically
                      </small>
                    </span>
                  </span>
                </button>
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative mt-3 w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((current) => !current);

          if (!open) {
            requestAnimationFrame(updatePosition);
          }
        }}
        className={`group relative flex min-h-[52px] w-full items-center justify-between gap-4 rounded-[13px] border px-4 text-left outline-none transition ${
          open
            ? "border-[#d59a2e]/70 bg-white shadow-[0_0_0_4px_rgba(253,183,62,0.09),0_6px_18px_rgba(0,0,0,0.045)]"
            : "border-black/10 bg-[#111111] text-white hover:border-white/25 hover:bg-[#151515]"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
              open
                ? "bg-[#fdb73e] text-black"
                : "bg-white/[0.07] text-white/55 group-hover:bg-white/[0.10] group-hover:text-white/75"
            }`}
          >
            <Search className="h-4 w-4" />
          </span>

          <span className="min-w-0">
            <small
              className={`block text-[9px] font-semibold uppercase tracking-[0.17em] transition ${
                open ? "text-black/38" : "text-white/28"
              }`}
            >
              {level.label}
            </small>

            <strong
              className={`mt-0.5 block truncate text-[13px] font-semibold ${
                open
                  ? "text-[#1d1d1f]"
                  : selected.length
                    ? "text-white"
                    : "text-white/50"
              }`}
            >
              {selected.length
                ? `${selected.length} ${
                    selected.length === 1 ? "choice" : "choices"
                  } selected`
                : `Select ${level.label.toLowerCase()}`}
            </strong>
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 transition duration-200 ${
            open
              ? "rotate-180 text-[#9a6500]"
              : "text-white/38 group-hover:text-white/65"
          }`}
        />
      </button>

      {selected.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleValue(value)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/42 transition hover:border-[#fdb73e]/35 hover:bg-[#fdb73e]/[0.08] hover:text-[#f4bd55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fdb73e]/25"
              aria-label={`Remove ${value}`}
            >
              <X className="h-3 w-3" />
              {value}
            </button>
          ))}
        </div>
      ) : null}

      {dropdown}
    </div>
  );
}

function isPresetHierarchyLabel(value: string) {
  const normalized = clean(value).toLowerCase();

  return hierarchyPresetLabels.some(
    (label) => label.toLowerCase() === normalized,
  );
}

const hiddenSelectorKeys = new Set([
  configurationHierarchyKey,
  "color_hex",
  "colour_hex",
  "color_name",
  "colour_name",
  "band_color",
  "band_colour",
  "swatch",
  "swatch_hex",
  "hex",
  "image",
  "image_url",
]);

const preferredAttributeOrder = [
  "color",
  "colour",
  "screen_size",
  "display_size",
  "size",
  "storage",
  "capacity",
  "memory",
  "ram",
];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function humanizeKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function optionIdentity(value: string) {
  return clean(value).toLowerCase();
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = optionIdentity(value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function selectorKeysFromVariants(variants: AdminElectronicsVariant[]) {
  const found: string[] = [];

  for (const variant of variants) {
    for (const key of Object.keys(variant.attributes ?? {})) {
      const normalized = normalizeKey(key);

      if (
        !normalized ||
        hiddenSelectorKeys.has(normalized) ||
        found.includes(normalized)
      ) {
        continue;
      }

      found.push(normalized);
    }
  }

  return found.sort((first, second) => {
    const firstPriority = preferredAttributeOrder.indexOf(first);
    const secondPriority = preferredAttributeOrder.indexOf(second);

    const firstRank =
      firstPriority === -1 ? Number.MAX_SAFE_INTEGER : firstPriority;
    const secondRank =
      secondPriority === -1 ? Number.MAX_SAFE_INTEGER : secondPriority;

    if (firstRank !== secondRank) {
      return firstRank - secondRank;
    }

    return found.indexOf(first) - found.indexOf(second);
  });
}

function persistedHierarchyKeys(variants: AdminElectronicsVariant[]) {
  for (const variant of variants) {
    const raw = clean(variant.attributes?.[configurationHierarchyKey]);

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        continue;
      }

      const keys = parsed
        .map((value) => normalizeKey(String(value ?? "")))
        .filter(
          (key, index, allKeys) =>
            Boolean(key) &&
            !hiddenSelectorKeys.has(key) &&
            allKeys.indexOf(key) === index,
        );

      if (keys.length > 0) {
        return keys;
      }
    } catch {
      // Legacy products fall back to inferred configuration keys.
    }
  }

  return [];
}

function hierarchyMetadata(levels: OptionLevel[]) {
  return JSON.stringify(levels.map((level) => level.key));
}

function levelsFromVariants(
  variants: AdminElectronicsVariant[],
): OptionLevel[] {
  const persisted = persistedHierarchyKeys(variants);

  const keys =
    persisted.length > 0 ? persisted : selectorKeysFromVariants(variants);

  return keys.map((key) => ({
    id: crypto.randomUUID(),
    key,
    label: humanizeKey(key),
    values: uniqueValues(
      variants
        .map((variant) => clean(variant.attributes?.[key]))
        .filter(Boolean),
    ),
  }));
}

function combinationKey(
  attributes: Record<string, string>,
  levels: OptionLevel[],
) {
  return levels
    .map(
      (level) => `${level.key}:${optionIdentity(attributes[level.key] ?? "")}`,
    )
    .join("|");
}

function cartesianProduct(levels: OptionLevel[]) {
  if (levels.length === 0) {
    return [] as Record<string, string>[];
  }

  let combinations: Record<string, string>[] = [{}];

  for (const level of levels) {
    const values = uniqueValues(level.values.map(clean).filter(Boolean));

    if (values.length === 0) {
      return [];
    }

    combinations = combinations.flatMap((combination) =>
      values.map((value) => ({
        ...combination,
        [level.key]: value,
      })),
    );
  }

  return combinations;
}

function generatedName(
  attributes: Record<string, string>,
  levels: OptionLevel[],
) {
  return levels
    .map((level) => clean(attributes[level.key]))
    .filter(Boolean)
    .join(" / ");
}

function defaultVariant(
  attributes: Record<string, string>,
  levels: OptionLevel[],
  position: number,
): AdminElectronicsVariant {
  return {
    clientId: crypto.randomUUID(),
    id: null,
    variant_name:
      generatedName(attributes, levels) || `Configuration ${position + 1}`,
    display_position: position,
    attributes,
    sku: "",
    regular_price: "",
    sale_price: "",
    stock_quantity: 0,
    low_stock_threshold: 2,
    availability_status: "in_stock",
  };
}

export default function ElectronicsVariantEditor({
  variants,
  onChange,
}: ElectronicsVariantEditorProps) {
  const [levels, setLevels] = useState<OptionLevel[]>(() =>
    levelsFromVariants(variants),
  );

  const [activeClientId, setActiveClientId] = useState(
    variants[0]?.clientId ?? "",
  );

  const [newLevelName, setNewLevelName] = useState("");
  const [hierarchyError, setHierarchyError] = useState("");
  const [customSpecName, setCustomSpecName] = useState("");

  const [customSpecError, setCustomSpecError] = useState("");
  const orderedVariants = useMemo(
    () =>
      [...variants].sort(
        (first, second) =>
          Number(first.display_position ?? 0) -
          Number(second.display_position ?? 0),
      ),
    [variants],
  );

  const activeVariant =
    orderedVariants.find((variant) => variant.clientId === activeClientId) ??
    orderedVariants[0] ??
    null;

  useEffect(() => {
    if (!activeVariant && orderedVariants[0]) {
      setActiveClientId(orderedVariants[0].clientId);
    }
  }, [activeVariant, orderedVariants]);

  /*
   * Keep the existing photograph manager synchronized with
   * configuration edits.
   */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("stereophonie:admin-product-configurations", {
        detail: {
          configurations: orderedVariants.map((variant, index) => ({
            id: variant.id ?? variant.clientId,
            variant_name:
              clean(variant.variant_name) || `Configuration ${index + 1}`,
            fallbackLabel:
              clean(variant.variant_name) || `Configuration ${index + 1}`,
            persisted: Boolean(variant.id),
          })),
        },
      }),
    );
  }, [orderedVariants]);

  function emit(next: AdminElectronicsVariant[]) {
    onChange(
      next.map((variant, index) => ({
        ...variant,
        display_position: index,
      })),
    );
  }

  function updateVariant(
    clientId: string,
    updates: Partial<AdminElectronicsVariant>,
  ) {
    emit(
      orderedVariants.map((variant) =>
        variant.clientId === clientId
          ? {
              ...variant,
              ...updates,
            }
          : variant,
      ),
    );
  }

  function updateAttribute(clientId: string, key: string, value: string) {
    emit(
      orderedVariants.map((variant) => {
        if (variant.clientId !== clientId) {
          return variant;
        }

        const attributes = {
          ...(variant.attributes ?? {}),
        };

        if (clean(value)) {
          attributes[key] = value;
        } else {
          delete attributes[key];
        }

        return {
          ...variant,
          attributes,
        };
      }),
    );
  }

  function updateHierarchyValue(clientId: string, key: string, value: string) {
    /*
     * Attribute + generated configuration name must be updated
     * together.
     *
     * Doing these as two separate emit() calls causes the second
     * React state update to be built from stale variant attributes
     * and can immediately erase the hierarchy value the user just
     * selected.
     */
    emit(
      orderedVariants.map((variant) => {
        if (variant.clientId !== clientId) {
          return variant;
        }

        const attributes = {
          ...(variant.attributes ?? {}),
        };

        if (clean(value)) {
          attributes[key] = value;
        } else {
          delete attributes[key];
        }

        return {
          ...variant,
          attributes,
          variant_name:
            generatedName(attributes, levels) || variant.variant_name,
        };
      }),
    );
  }

  /*
   * Persist the storefront selector hierarchy on every existing
   * configuration whenever the hierarchy structure itself changes.
   *
   * Values are deliberately excluded: changing "Black, White" to
   * "Black, White, Orange" does not change the selector order.
   */
  function variantsWithHierarchy(
    sourceVariants: AdminElectronicsVariant[],
    nextLevels: OptionLevel[],
  ) {
    const normalizedKeys = nextLevels
      .map((level) => normalizeKey(level.label || level.key))
      .filter(
        (key, index, allKeys) =>
          Boolean(key) &&
          !hiddenSelectorKeys.has(key) &&
          allKeys.indexOf(key) === index,
      );

    const hierarchyValue = JSON.stringify(normalizedKeys);

    return sourceVariants.map((variant) => {
      const attributes = {
        ...(variant.attributes ?? {}),
      };

      if (normalizedKeys.length > 0) {
        attributes[configurationHierarchyKey] = hierarchyValue;
      } else {
        delete attributes[configurationHierarchyKey];
      }

      return {
        ...variant,
        attributes,
      };
    });
  }

  function commitHierarchy(nextLevels: OptionLevel[]) {
    setLevels(nextLevels);
    emit(variantsWithHierarchy(orderedVariants, nextLevels));
  }

  function addLevel() {
    const label = clean(newLevelName);
    const key = normalizeKey(label);

    if (!label || !key) {
      setHierarchyError("Enter a configuration level name.");
      return;
    }

    if (hiddenSelectorKeys.has(key)) {
      setHierarchyError(`${label} is reserved for internal product metadata.`);
      return;
    }

    if (levels.some((level) => level.key === key)) {
      setHierarchyError(`${label} already exists in the hierarchy.`);
      return;
    }

    const nextLevels = [
      ...levels,
      {
        id: crypto.randomUUID(),
        key,
        label,
        values: [],
      },
    ];

    commitHierarchy(nextLevels);

    setNewLevelName("");
    setHierarchyError("");
  }

  function renameLevel(levelId: string, label: string) {
    const currentLevel = levels.find((level) => level.id === levelId);

    if (!currentLevel) {
      return;
    }

    const nextKey = normalizeKey(label);

    const nextLevels = levels.map((level) =>
      level.id === levelId
        ? {
            ...level,
            label,
            ...(nextKey ? { key: nextKey } : {}),
          }
        : level,
    );

    setLevels(nextLevels);

    const renamedVariants = orderedVariants.map((variant) => {
      const attributes = {
        ...(variant.attributes ?? {}),
      };

      if (
        nextKey &&
        nextKey !== currentLevel.key &&
        Object.prototype.hasOwnProperty.call(attributes, currentLevel.key)
      ) {
        const previousValue = attributes[currentLevel.key];

        delete attributes[currentLevel.key];
        attributes[nextKey] = previousValue;
      }

      return {
        ...variant,
        attributes,
      };
    });

    emit(variantsWithHierarchy(renamedVariants, nextLevels));
  }

  function updateLevelValues(levelId: string, values: string[]) {
    const normalizedValues = uniqueValues(values.map(clean).filter(Boolean));

    setLevels((current) =>
      current.map((level) =>
        level.id === levelId
          ? {
              ...level,
              values: normalizedValues,
            }
          : level,
      ),
    );
  }

  function moveLevel(levelId: string, direction: "up" | "down") {
    const index = levels.findIndex((level) => level.id === levelId);

    if (index < 0) {
      return;
    }

    const target = direction === "up" ? index - 1 : index + 1;

    if (target < 0 || target >= levels.length) {
      return;
    }

    const nextLevels = [...levels];

    [nextLevels[index], nextLevels[target]] = [
      nextLevels[target],
      nextLevels[index],
    ];

    commitHierarchy(nextLevels);
  }

  function removeLevel(levelId: string) {
    const level = levels.find((candidate) => candidate.id === levelId);

    if (!level) {
      return;
    }

    const nextLevels = levels.filter((candidate) => candidate.id !== levelId);

    setLevels(nextLevels);

    const variantsWithoutLevel = orderedVariants.map((variant) => {
      const attributes = {
        ...(variant.attributes ?? {}),
      };

      delete attributes[level.key];

      return {
        ...variant,
        attributes,
      };
    });

    emit(variantsWithHierarchy(variantsWithoutLevel, nextLevels));
  }

  function generatedCombinationIdentity(
    attributes: Record<string, string>,
    hierarchyLevels: OptionLevel[],
  ) {
    /*
     * Configuration identity MUST use the entire customer-choice path.
     *
     * Black / 1.8M and White / 1.8M are different configurations even
     * though both contain the same Size value.
     *
     * The level key is included as well as its value so this remains
     * correct for arbitrary hierarchy depth.
     */
    return JSON.stringify(
      hierarchyLevels.map((level) => [
        level.key,
        optionIdentity(clean(attributes[level.key])),
      ]),
    );
  }

  function generateCombinations() {
    const normalizedLevels = levels
      .map((level) => ({
        ...level,
        key: normalizeKey(level.label || level.key),
        label: clean(level.label) || humanizeKey(level.key),
        values: uniqueValues(level.values.map(clean).filter(Boolean)),
      }))
      .filter((level) => level.key);

    if (normalizedLevels.length === 0) {
      setHierarchyError(
        "Add at least one configuration level before generating combinations.",
      );
      return;
    }

    const duplicateKeys = normalizedLevels
      .map((level) => level.key)
      .filter((key, index, allKeys) => allKeys.indexOf(key) !== index);

    if (duplicateKeys.length > 0) {
      setHierarchyError("Each hierarchy level must have a different name.");
      return;
    }

    const incomplete = normalizedLevels.find(
      (level) => level.values.length === 0,
    );

    if (incomplete) {
      setHierarchyError(`Add at least one value for ${incomplete.label}.`);
      return;
    }

    const combinations = cartesianProduct(normalizedLevels);

    if (combinations.length > 250) {
      setHierarchyError(
        `This hierarchy would create ${combinations.length} configurations. Reduce the option values before generating.`,
      );
      return;
    }

    const existingByCombination = new Map(
      orderedVariants.map((variant) => [
        generatedCombinationIdentity(
          variant.attributes ?? {},
          normalizedLevels,
        ),
        variant,
      ]),
    );

    const generated = combinations.map((attributes, index) => {
      const existing = existingByCombination.get(
        generatedCombinationIdentity(attributes, normalizedLevels),
      );

      const hierarchyValue = hierarchyMetadata(normalizedLevels);

      if (!existing) {
        return defaultVariant(
          {
            ...attributes,
            [configurationHierarchyKey]: hierarchyValue,
          },
          normalizedLevels,
          index,
        );
      }

      /*
       * Preserve non-selector technical metadata when rebuilding
       * the hierarchy.
       *
       * The reserved hierarchy key is replaced below so every
       * exact configuration carries the same authoritative
       * customer-facing option order.
       */
      const preservedAttributes = Object.fromEntries(
        Object.entries(existing.attributes ?? {}).filter(
          ([key]) =>
            key !== configurationHierarchyKey &&
            !normalizedLevels.some((level) => level.key === key),
        ),
      );

      return {
        ...existing,
        display_position: index,
        attributes: {
          ...preservedAttributes,
          ...attributes,
          [configurationHierarchyKey]: hierarchyValue,
        },
        variant_name: generatedName(attributes, normalizedLevels),
      };
    });

    setLevels(normalizedLevels);
    setHierarchyError("");
    emit(generated);

    if (generated.length > 0) {
      setActiveClientId(generated[0].clientId);
    }
  }

  function addManualConfiguration() {
    const next = defaultVariant({}, [], orderedVariants.length);
    emit([...orderedVariants, next]);
    setActiveClientId(next.clientId);
  }

  function duplicateVariant(variant: AdminElectronicsVariant) {
    const copy: AdminElectronicsVariant = {
      ...variant,
      clientId: crypto.randomUUID(),
      id: null,
      variant_name: `${variant.variant_name} Copy`,
      sku: "",
      display_position: orderedVariants.length,
      attributes: {
        ...(variant.attributes ?? {}),
      },
    };

    emit([...orderedVariants, copy]);
    setActiveClientId(copy.clientId);
  }

  function removeVariant(clientId: string) {
    if (orderedVariants.length <= 1) {
      return;
    }

    const index = orderedVariants.findIndex(
      (variant) => variant.clientId === clientId,
    );

    const next = orderedVariants.filter(
      (variant) => variant.clientId !== clientId,
    );

    emit(next);

    const fallback = next[Math.min(Math.max(index, 0), next.length - 1)];

    setActiveClientId(fallback?.clientId ?? "");
  }

  function moveVariant(clientId: string, direction: "up" | "down") {
    const index = orderedVariants.findIndex(
      (variant) => variant.clientId === clientId,
    );

    const target = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || target < 0 || target >= orderedVariants.length) {
      return;
    }

    const next = [...orderedVariants];
    [next[index], next[target]] = [next[target], next[index]];

    emit(next);
  }

  function addCustomSpecification() {
    if (!activeVariant) {
      return;
    }

    const label = clean(customSpecName);
    const key = normalizeKey(label);

    setCustomSpecError("");

    if (!label || !key) {
      return;
    }

    if (
      levels.some((level) => level.key === key) ||
      Object.prototype.hasOwnProperty.call(activeVariant.attributes ?? {}, key)
    ) {
      setCustomSpecError("This technical specification already exists.");
      return;
    }

    /*
     * updateAttribute removes blank values, so inserting a new
     * specification through updateAttribute(..., "") immediately
     * deleted it. Create the editable key directly instead.
     */
    emit(
      orderedVariants.map((variant) =>
        variant.clientId === activeVariant.clientId
          ? {
              ...variant,
              attributes: {
                ...(variant.attributes ?? {}),
                [key]: "",
              },
            }
          : variant,
      ),
    );

    setCustomSpecName("");
    setCustomSpecError("");
  }

  const selectorKeys = new Set([
    ...levels.map((level) => level.key),
    configurationHierarchyKey,
  ]);

  const technicalAttributes = activeVariant
    ? Object.entries(activeVariant.attributes ?? {}).filter(
        ([key]) =>
          !selectorKeys.has(key) && !hiddenSelectorKeys.has(normalizeKey(key)),
      )
    : [];

  const activeIndex = activeVariant
    ? orderedVariants.findIndex(
        (variant) => variant.clientId === activeVariant.clientId,
      )
    : -1;

  return (
    <div className="space-y-6">
      <section className="overflow-visible rounded-[24px] border border-black/10 bg-white">
        <header className="border-b border-black/[0.07] px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d99100]">
            Product setup
          </p>

          <h3 className="mt-2 text-2xl font-semibold text-black">
            Set up customer choices
          </h3>
          <div className="mt-3 rounded-[14px] border border-black/[0.07] bg-[#fafafa] px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fdb73e] text-[10px] font-bold leading-none text-black">
                1
              </span>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-black">
                  Start by choosing what the customer selects first.
                </p>

                <p className="mt-0.5 text-[11px] leading-5 text-black/45">
                  For example: Color, Storage, Screen Size or RAM. Then select
                  every available choice for that option.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/45">
            Choose what the customer selects before buying. Add only the options
            this product actually needs.
          </p>
        </header>

        <div className="p-5">
          {levels.length > 0 ? (
            <div className="space-y-3">
              {levels.map((level, index) => {
                const presetLevel = isPresetHierarchyLabel(level.label);
                const colorLevel =
                  level.key === "color" || level.key === "colour";

                return (
                  <div
                    key={level.id}
                    className="rounded-[16px] border border-black/[0.08] bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
                  >
                    <div className="grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)_auto] lg:items-start">
                      <div>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/40">
                          Step {index + 1}
                        </span>

                        <select
                          value={presetLevel ? level.label : "__custom__"}
                          onChange={(event) => {
                            const value = event.target.value;

                            if (value === "__custom__") {
                              if (presetLevel) {
                                renameLevel(level.id, "Custom Option");
                              }

                              return;
                            }

                            renameLevel(level.id, value);
                          }}
                          className="mt-2 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-black outline-none transition focus:border-[#f5b335]"
                        >
                          {hierarchyPresetLabels.map((label) => (
                            <option key={label} value={label}>
                              {label}
                            </option>
                          ))}

                          <option value="__custom__">Custom option</option>
                        </select>

                        {!presetLevel ? (
                          <input
                            value={
                              level.label === "Custom Option" ? "" : level.label
                            }
                            onChange={(event) =>
                              renameLevel(
                                level.id,
                                event.target.value || "Custom Option",
                              )
                            }
                            placeholder="Type option name"
                            className="mt-2 min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-[#f5b335]"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/40">
                          Available choices
                        </span>

                        {colorLevel ? (
                          <div className="mt-2">
                            {level.values.length > 0 ? (
                              <div className="mb-3 flex flex-wrap gap-2">
                                {level.values.map((value) => (
                                  <span
                                    key={value}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-black"
                                  >
                                    {value}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateLevelValues(
                                          level.id,
                                          level.values.filter(
                                            (item) => item !== value,
                                          ),
                                        )
                                      }
                                      className="grid h-5 w-5 place-items-center rounded-full text-black/35 transition hover:bg-black/[0.06] hover:text-black"
                                      aria-label={`Remove ${value}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mb-3 text-xs text-black/40">
                                No colors selected yet.
                              </p>
                            )}

                            <ConfigurationColorPicker
                              value={null}
                              onChange={(color) => {
                                const alreadySelected = level.values.some(
                                  (value) =>
                                    value.toLowerCase() ===
                                    color.name.toLowerCase(),
                                );

                                if (alreadySelected) return;

                                updateLevelValues(level.id, [
                                  ...level.values,
                                  color.name,
                                ]);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="mt-2">
                            <SearchableOptionValuePicker
                              level={level}
                              onChange={(values) =>
                                updateLevelValues(level.id, values)
                              }
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white">
                        <button
                          type="button"
                          onClick={() => moveLevel(level.id, "up")}
                          disabled={index === 0}
                          className="grid h-11 w-11 place-items-center border-r border-black/10 text-black/45 transition hover:bg-black/[0.04] hover:text-black disabled:opacity-20"
                          aria-label={`Move ${level.label} earlier`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveLevel(level.id, "down")}
                          disabled={index === levels.length - 1}
                          className="grid h-11 w-11 place-items-center border-r border-black/10 text-black/45 transition hover:bg-black/[0.04] hover:text-black disabled:opacity-20"
                          aria-label={`Move ${level.label} later`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeLevel(level.id)}
                          className="grid h-11 w-11 place-items-center text-red-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove ${level.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-black/15 bg-[#fafafa] p-6 text-sm text-black/40">
              No product options yet.
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <select
              value={
                hierarchyPresetLabels.includes(
                  newLevelName as (typeof hierarchyPresetLabels)[number],
                )
                  ? newLevelName
                  : newLevelName
                    ? "__custom__"
                    : ""
              }
              onChange={(event) => {
                const value = event.target.value;

                setNewLevelName(
                  value === "__custom__" ? "Custom Option" : value,
                );

                setHierarchyError("");
              }}
              className="min-h-11 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-black outline-none transition focus:border-[#f5b335]"
            >
              <option value="">Choose what the customer selects...</option>

              {hierarchyPresetLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}

              <option value="__custom__">Custom option</option>
            </select>

            <button
              type="button"
              onClick={addLevel}
              disabled={!clean(newLevelName)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black transition hover:border-[#f5b335] hover:bg-[#fff8e8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add option
            </button>

            <button
              type="button"
              onClick={generateCombinations}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#f5b335]/50 bg-[#fff8e8] px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b97500] transition hover:bg-[#f5b335] hover:text-black"
            >
              <RefreshCw className="h-4 w-4" />
              Generate configurations
            </button>
          </div>

          {hierarchyError ? (
            <p className="mt-3 text-sm text-red-500">{hierarchyError}</p>
          ) : null}

          {levels.length > 0 ? (
            <div className="mt-5 rounded-[16px] border border-black/[0.07] bg-[#fafafa] px-4 py-3 text-xs text-black/45">
              Customers choose:{" "}
              <strong className="font-semibold text-black/70">
                {levels.map((level) => level.label).join(" → ")}
              </strong>
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
        <header className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Final combinations
            </p>

            <h3 className="mt-2 text-2xl font-semibold">
              {orderedVariants.length} sellable configuration
              {orderedVariants.length === 1 ? "" : "s"}
            </h3>
          </div>

          <button
            type="button"
            onClick={addManualConfiguration}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-white hover:text-black"
          >
            <CirclePlus className="h-4 w-4" />
            Add manually
          </button>
        </header>

        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-black/[0.07] bg-white lg:border-b-0 lg:border-r lg:border-black/[0.07]">
            {orderedVariants.map((variant, index) => {
              const active = activeVariant?.clientId === variant.clientId;

              return (
                <button
                  key={variant.clientId}
                  type="button"
                  onClick={() => setActiveClientId(variant.clientId)}
                  className={`group block w-full border-b border-black/[0.06] px-4 py-3 text-left transition ${
                    active
                      ? "bg-[#fff8e8] text-black"
                      : "bg-white text-black hover:bg-[#fafafa]"
                  }`}
                >
                  <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-black/35">
                    Configuration {index + 1}
                  </span>

                  <strong className="mt-1 block truncate text-[13px] font-semibold tracking-[-0.01em]">
                    {clean(variant.variant_name) ||
                      `Configuration ${index + 1}`}
                  </strong>

                  <span className="mt-1.5 block truncate text-[9px] font-medium tracking-[0.04em] text-black/35">
                    {variant.sku || "No SKU"}
                  </span>
                </button>
              );
            })}
          </aside>

          {activeVariant ? (
            <div className="min-w-0 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex border border-white/10">
                  <button
                    type="button"
                    onClick={() => moveVariant(activeVariant.clientId, "up")}
                    disabled={activeIndex <= 0}
                    className="grid h-11 w-11 place-items-center border-r border-white/10 text-white/45 hover:bg-white hover:text-black disabled:opacity-20"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="flex h-11 items-center px-4 text-xs text-white/35">
                    {activeIndex + 1} / {orderedVariants.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => moveVariant(activeVariant.clientId, "down")}
                    disabled={activeIndex >= orderedVariants.length - 1}
                    className="grid h-11 w-11 place-items-center border-l border-white/10 text-white/45 hover:bg-white hover:text-black disabled:opacity-20"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateVariant(activeVariant.clientId, {
                      variant_name:
                        generatedName(activeVariant.attributes, levels) ||
                        activeVariant.variant_name,
                    })
                  }
                  className="inline-flex min-h-11 items-center gap-2 border border-white/15 px-4 text-[10px] font-semibold uppercase tracking-[0.11em] text-white/60 hover:bg-white hover:text-black"
                >
                  <Check className="h-4 w-4" />
                  Generate name
                </button>

                <button
                  type="button"
                  onClick={() => duplicateVariant(activeVariant)}
                  className="inline-flex min-h-11 items-center gap-2 border border-white/15 px-4 text-[10px] font-semibold uppercase tracking-[0.11em] text-white hover:bg-white hover:text-black"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>

                {orderedVariants.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeVariant(activeVariant.clientId)}
                    className="inline-flex min-h-11 items-center gap-2 border border-red-400/20 px-4 text-[10px] font-semibold uppercase tracking-[0.11em] text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                ) : null}
              </div>

              {levels.length > 0 ? (
                <section className="mt-7 border-t border-white/10 pt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                    Hierarchy values
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {levels.map((level) => (
                      <label
                        key={level.id}
                        className="border border-white/10 bg-black/20 p-4"
                      >
                        <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/35">
                          {level.label}
                        </span>

                        <select
                          value={activeVariant.attributes[level.key] ?? ""}
                          onChange={(event) =>
                            updateHierarchyValue(
                              activeVariant.clientId,
                              level.key,
                              event.target.value,
                            )
                          }
                          className="mt-3 min-h-11 w-full border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/45"
                        >
                          <option value="">Select {level.label}</option>

                          {level.values.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-7 border-t border-white/10 pt-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                      Configuration name
                    </span>

                    <input
                      value={activeVariant.variant_name}
                      onChange={(event) =>
                        updateVariant(activeVariant.clientId, {
                          variant_name: event.target.value,
                        })
                      }
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-white/50"
                    />
                  </label>

                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
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
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-white/50"
                    />
                  </label>
                </div>
              </section>

              <section className="mt-7 border-t border-white/10 pt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                  Pricing
                </p>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
                      Regular price
                    </span>

                    <input
                      type="number"
                      min="0"
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
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-white/50"
                    />
                  </label>

                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
                      Sale price
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
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-white/50"
                    />
                  </label>
                </div>
              </section>

              <section className="mt-7 border-t border-white/10 pt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                  Inventory
                </p>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
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
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-white/50 disabled:opacity-30"
                    />
                  </label>

                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
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
                      className="mt-3 min-h-11 w-full border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-white/50"
                    />
                  </label>
                </div>
              </section>

              <section className="mt-7 border-t border-white/10 pt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                  Customer availability
                </p>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  {availabilityOptions.map((option) => {
                    const selected =
                      activeVariant.availability_status === option.value;

                    const statusStyle =
                      option.value === "in_stock"
                        ? selected
                          ? "border-[#238636] bg-[#238636] text-white shadow-[0_6px_16px_rgba(35,134,54,0.18)]"
                          : "border-[#b7dfbf] bg-[#f2fbf4] text-[#237a35] hover:border-[#238636]"
                        : option.value === "low_stock"
                          ? selected
                            ? "border-[#d79a12] bg-[#e9ad25] text-[#251900] shadow-[0_6px_16px_rgba(215,154,18,0.18)]"
                            : "border-[#f1d68d] bg-[#fff9e8] text-[#9a6a00] hover:border-[#d79a12]"
                          : option.value === "out_of_stock"
                            ? selected
                              ? "border-[#cf3b36] bg-[#cf3b36] text-white shadow-[0_6px_16px_rgba(207,59,54,0.18)]"
                              : "border-[#efbbb8] bg-[#fff4f3] text-[#b52e29] hover:border-[#cf3b36]"
                            : selected
                              ? "border-[#3678d4] bg-[#3678d4] text-white shadow-[0_6px_16px_rgba(54,120,212,0.18)]"
                              : "border-[#b9d2f2] bg-[#f3f8ff] text-[#316cad] hover:border-[#3678d4]";

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          updateVariant(activeVariant.clientId, {
                            availability_status: option.value,
                          })
                        }
                        aria-pressed={selected}
                        className={`inline-flex min-h-10 items-center justify-center rounded-[11px] border px-4 text-[11px] font-semibold transition ${statusStyle}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mt-7 border-t border-white/10 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={customSpecName}
                    onChange={(event) => {
                      setCustomSpecName(event.target.value);
                      setCustomSpecError("");
                    }}
                    placeholder="Technical metadata — e.g. Charging standard"
                    className="min-h-11 flex-1 border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/45"
                  />

                  <button
                    type="button"
                    onClick={addCustomSpecification}
                    className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 px-5 text-[10px] font-semibold uppercase tracking-[0.11em] text-white hover:bg-white hover:text-black"
                  >
                    <Plus className="h-4 w-4" />
                    Add technical spec
                  </button>
                </div>
                {customSpecError ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {customSpecError}
                  </p>
                ) : null}

                {technicalAttributes.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {technicalAttributes.map(([key, value]) => (
                      <div
                        key={key}
                        className="border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/35">
                            {humanizeKey(key)}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              const attributes = {
                                ...activeVariant.attributes,
                              };

                              delete attributes[key];

                              updateVariant(activeVariant.clientId, {
                                attributes,
                              });
                            }}
                            className="text-white/30 hover:text-red-300"
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
                          className="mt-3 min-h-10 w-full border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/45"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
