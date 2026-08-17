"use client";

import {
  Check,
  ChevronRight,
  CirclePlus,
  Package,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  ProductAvailabilityStatus,
  ProductVariantAttributes,
} from "@/lib/stereophonie-v2/product-variants";

export type AdminElectronicsVariant = {
  id?: string | null;
  clientId: string;
  variant_name: string;
  attributes: ProductVariantAttributes;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: ProductAvailabilityStatus;
};

type ElectronicsVariantEditorProps = {
  variants: AdminElectronicsVariant[];
  onChange: (variants: AdminElectronicsVariant[]) => void;
};

const availabilityOptions: {
  value: ProductAvailabilityStatus;
  label: string;
  description: string;
  className: string;
  dotClassName: string;
}[] = [
  {
    value: "in_stock",
    label: "In stock",
    description: "Customers can purchase this configuration.",
    className: "border-emerald-400/30 bg-emerald-400/[0.06]",
    dotClassName: "bg-emerald-400",
  },
  {
    value: "low_stock",
    label: "Low stock",
    description: "Available, but remaining inventory is limited.",
    className: "border-amber-400/30 bg-amber-400/[0.06]",
    dotClassName: "bg-amber-400",
  },
  {
    value: "out_of_stock",
    label: "Out of stock",
    description: "This configuration cannot currently be ordered.",
    className: "border-red-400/30 bg-red-400/[0.06]",
    dotClassName: "bg-red-400",
  },
  {
    value: "coming_soon",
    label: "Coming soon",
    description: "Display this configuration before it becomes available.",
    className: "border-sky-400/30 bg-sky-400/[0.06]",
    dotClassName: "bg-sky-400",
  },
];

const suggestedAttributes = [
  ["storage", "Storage"],
  ["memory", "Memory / RAM"],
  ["processor", "Processor"],
  ["graphics", "Graphics"],
  ["color", "Colour"],
  ["connectivity", "Connectivity"],
  ["edition", "Edition"],
  ["display", "Display"],
  ["battery", "Battery"],
  ["generation", "Generation"],
] as const;

function createVariant(): AdminElectronicsVariant {
  return {
    clientId: crypto.randomUUID(),
    variant_name: "",
    attributes: {},
    sku: "",
    stock_quantity: 0,
    low_stock_threshold: 2,
    availability_status: "in_stock",
  };
}

function humanizeAttributeKey(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function ElectronicsVariantEditor({
  variants,
  onChange,
}: ElectronicsVariantEditorProps) {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variants[0]?.clientId ?? null,
  );

  const [customAttributeName, setCustomAttributeName] = useState("");

  const activeVariant =
    variants.find((variant) => variant.clientId === activeVariantId) ??
    variants[0] ??
    null;

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
    const nextVariant = createVariant();

    onChange([...variants, nextVariant]);
    setActiveVariantId(nextVariant.clientId);
  }

  function removeVariant(clientId: string) {
    if (variants.length <= 1) {
      return;
    }

    const nextVariants = variants.filter(
      (variant) => variant.clientId !== clientId,
    );

    onChange(nextVariants);

    if (activeVariantId === clientId) {
      setActiveVariantId(nextVariants[0]?.clientId ?? null);
    }
  }

  function updateAttribute(clientId: string, key: string, value: string) {
    const variant = variants.find((item) => item.clientId === clientId);

    if (!variant) {
      return;
    }

    updateVariant(clientId, {
      attributes: {
        ...variant.attributes,
        [key]: value,
      },
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
          {variants.map((variant, index) => {
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
                        status?.dotClassName ?? "bg-white/30"
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

          {variants.length > 1 ? (
            <button
              type="button"
              onClick={() => removeVariant(activeVariant.clientId)}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-400/20 px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-red-300 transition hover:bg-red-400/[0.08]"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          ) : null}
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
                This is the configuration name shown to customers.
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

          <section className="mt-8 border-t border-white/10 pt-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/40">
                Technical specifications
              </p>

              <h4 className="mt-2 text-xl font-semibold">
                Configuration attributes
              </h4>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                Add only specifications that differentiate this configuration.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {suggestedAttributes.map(([key, label]) => (
                <label
                  key={key}
                  className="border border-white/10 bg-black/20 p-4"
                >
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
                    {label}
                  </span>

                  <input
                    value={activeVariant.attributes[key] ?? ""}
                    onChange={(event) =>
                      updateAttribute(
                        activeVariant.clientId,
                        key,
                        event.target.value,
                      )
                    }
                    placeholder="Optional"
                    className="mt-3 w-full border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/45"
                  />
                </label>
              ))}
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
                placeholder="Custom specification, e.g. refresh rate"
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

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {availabilityOptions.map((option) => {
                const active =
                  activeVariant.availability_status === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
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
                    className={`min-h-[112px] border p-4 text-left transition ${
                      active
                        ? option.className
                        : "border-white/10 bg-black/20 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${option.dotClassName}`}
                          />

                          <strong className="text-sm">{option.label}</strong>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-white/35">
                          {option.description}
                        </p>
                      </div>

                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          active ? "border-white/50" : "border-white/15"
                        }`}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </div>
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
