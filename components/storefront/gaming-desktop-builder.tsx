"use client";

import {
  Check,
  ChevronRight,
  Cpu,
  Fan,
  Gauge,
  HardDrive,
  MemoryStick,
  MessageCircle,
  Microchip,
  MonitorUp,
  Package,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

type PartKey =
  | "cpu"
  | "gpu"
  | "motherboard"
  | "ram"
  | "storage"
  | "cooling"
  | "psu"
  | "case";

type Choice = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  badge?: string;
};

type PartDefinition = {
  key: PartKey;
  label: string;
  shortLabel: string;
  description: string;
  icon:
    | typeof Cpu
    | typeof Microchip
    | typeof MemoryStick;
  options: Choice[];
};

const parts: PartDefinition[] = [
  {
    key: "cpu",
    label: "Processor",
    shortLabel: "CPU",
    description: "The core of your gaming performance.",
    icon: Cpu,
    options: [
      {
        id: "ryzen-7-9800x3d",
        name: "AMD Ryzen 7 9800X3D",
        subtitle: "8 cores · Gaming focused",
        price: 529,
        badge: "Recommended",
      },
      {
        id: "ryzen-9-9950x3d",
        name: "AMD Ryzen 9 9950X3D",
        subtitle: "16 cores · Extreme performance",
        price: 749,
      },
      {
        id: "core-ultra-7-265k",
        name: "Intel Core Ultra 7 265K",
        subtitle: "20 cores · High performance",
        price: 409,
      },
    ],
  },
  {
    key: "gpu",
    label: "Graphics card",
    shortLabel: "GPU",
    description: "Choose the graphics performance you want.",
    icon: MonitorUp,
    options: [
      {
        id: "rtx-5070-ti",
        name: "NVIDIA GeForce RTX 5070 Ti",
        subtitle: "16GB · High-end gaming",
        price: 899,
      },
      {
        id: "rtx-5080",
        name: "NVIDIA GeForce RTX 5080",
        subtitle: "16GB · Enthusiast",
        price: 1299,
        badge: "Popular",
      },
      {
        id: "rtx-5090",
        name: "NVIDIA GeForce RTX 5090",
        subtitle: "32GB · Ultimate",
        price: 2499,
      },
    ],
  },
  {
    key: "motherboard",
    label: "Motherboard",
    shortLabel: "Board",
    description: "The platform connecting your entire build.",
    icon: Microchip,
    options: [
      {
        id: "rog-x870f",
        name: "ASUS ROG Strix X870-F Gaming WiFi",
        subtitle: "AM5 · Wi-Fi 7 · DDR5",
        price: 429,
        badge: "Recommended",
      },
      {
        id: "msi-x870e-carbon",
        name: "MSI MPG X870E Carbon WiFi",
        subtitle: "AM5 · PCIe 5.0 · DDR5",
        price: 499,
      },
      {
        id: "z890-aorus",
        name: "Gigabyte Z890 AORUS Elite WiFi7",
        subtitle: "Intel · Wi-Fi 7 · DDR5",
        price: 349,
      },
    ],
  },
  {
    key: "ram",
    label: "Memory",
    shortLabel: "RAM",
    description: "Fast memory for gaming and multitasking.",
    icon: MemoryStick,
    options: [
      {
        id: "32-ddr5",
        name: "32GB DDR5 6000MHz",
        subtitle: "2 × 16GB",
        price: 139,
        badge: "Recommended",
      },
      {
        id: "64-ddr5",
        name: "64GB DDR5 6000MHz",
        subtitle: "2 × 32GB",
        price: 249,
      },
      {
        id: "96-ddr5",
        name: "96GB DDR5 6400MHz",
        subtitle: "2 × 48GB",
        price: 369,
      },
    ],
  },
  {
    key: "storage",
    label: "Storage",
    shortLabel: "SSD",
    description: "Fast NVMe storage for games and applications.",
    icon: HardDrive,
    options: [
      {
        id: "1tb-990-pro",
        name: "Samsung 990 Pro 1TB",
        subtitle: "NVMe PCIe 4.0",
        price: 119,
      },
      {
        id: "2tb-990-pro",
        name: "Samsung 990 Pro 2TB",
        subtitle: "NVMe PCIe 4.0",
        price: 189,
        badge: "Recommended",
      },
      {
        id: "4tb-990-pro",
        name: "Samsung 990 Pro 4TB",
        subtitle: "NVMe PCIe 4.0",
        price: 349,
      },
    ],
  },
  {
    key: "cooling",
    label: "Cooling",
    shortLabel: "Cooling",
    description: "Keep performance stable under heavy loads.",
    icon: Fan,
    options: [
      {
        id: "kraken-240",
        name: "NZXT Kraken 240",
        subtitle: "240mm liquid cooling",
        price: 179,
      },
      {
        id: "kraken-360",
        name: "NZXT Kraken 360",
        subtitle: "360mm liquid cooling",
        price: 239,
        badge: "Recommended",
      },
      {
        id: "rog-ryujin",
        name: "ASUS ROG Ryujin III 360",
        subtitle: "360mm premium liquid cooling",
        price: 349,
      },
    ],
  },
  {
    key: "psu",
    label: "Power supply",
    shortLabel: "PSU",
    description: "Stable power sized for your configuration.",
    icon: Zap,
    options: [
      {
        id: "850w",
        name: "Corsair RM850x 850W",
        subtitle: "80+ Gold · Fully modular",
        price: 159,
      },
      {
        id: "1000w",
        name: "Corsair RM1000x 1000W",
        subtitle: "80+ Gold · Fully modular",
        price: 209,
        badge: "Recommended",
      },
      {
        id: "1200w",
        name: "Seasonic Vertex GX-1200",
        subtitle: "1200W · 80+ Gold",
        price: 269,
      },
    ],
  },
  {
    key: "case",
    label: "Case",
    shortLabel: "Case",
    description: "Choose the enclosure surrounding your build.",
    icon: Package,
    options: [
      {
        id: "o11-black",
        name: "Lian Li O11 Dynamic EVO · Black",
        subtitle: "Tempered glass · Dual chamber",
        price: 189,
        badge: "Popular",
      },
      {
        id: "h9-flow",
        name: "NZXT H9 Flow · Black",
        subtitle: "Panoramic glass · High airflow",
        price: 179,
      },
      {
        id: "corsair-6500x",
        name: "Corsair 6500X · Black",
        subtitle: "Dual chamber · Tempered glass",
        price: 199,
      },
    ],
  },
];

const defaultSelections: Record<PartKey, string> = {
  cpu: "ryzen-7-9800x3d",
  gpu: "rtx-5080",
  motherboard: "rog-x870f",
  ram: "32-ddr5",
  storage: "2tb-990-pro",
  cooling: "kraken-360",
  psu: "1000w",
  case: "o11-black",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function GamingDesktopBuilder() {
  const [activePart, setActivePart] =
    useState<PartKey>("gpu");

  const [selections, setSelections] =
    useState<Record<PartKey, string>>(
      defaultSelections,
    );

  const selectedParts = useMemo(
    () =>
      parts.map((part) => ({
        part,
        choice:
          part.options.find(
            (option) =>
              option.id ===
              selections[part.key],
          ) ?? part.options[0],
      })),
    [selections],
  );

  const estimatedTotal = useMemo(
    () =>
      selectedParts.reduce(
        (total, item) =>
          total + item.choice.price,
        0,
      ),
    [selectedParts],
  );

  const activeDefinition =
    parts.find(
      (part) => part.key === activePart,
    ) ?? parts[0];

  const configurationReference = useMemo(
    () =>
      `ST-GAMING-${Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()}`,
    [],
  );

  function choose(
    key: PartKey,
    choiceId: string,
  ) {
    setSelections((current) => ({
      ...current,
      [key]: choiceId,
    }));
  }

  function resetBuild() {
    setSelections(defaultSelections);
    setActivePart("gpu");
  }

  function sendToWhatsApp() {
    const phone =
      process.env
        .NEXT_PUBLIC_STEREOPHONIE_WHATSAPP ??
      "";

    const specificationLines =
      selectedParts.map(
        ({ part, choice }) =>
          `${part.shortLabel}: ${choice.name}`,
      );

    const message = [
      "Hello Stereophonie,",
      "",
      "I would like to request this custom gaming desktop configuration:",
      "",
      ...specificationLines,
      "",
      `Estimated configuration total: ${money(
        estimatedTotal,
      )}`,
      `Configuration reference: ${configurationReference}`,
      "",
      "Please contact me regarding compatibility, availability and final pricing.",
    ].join("\n");

    const base = phone
      ? `https://wa.me/${phone}`
      : "https://wa.me/";

    window.open(
      `${base}?text=${encodeURIComponent(
        message,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <main className="st-gaming-builder">
      <section className="st-gaming-builder__hero">
        <div className="st-gaming-builder__hero-copy">
          <span className="st-gaming-builder__eyebrow">
            <Sparkles />
            Stereophonie Custom Gaming
          </span>

          <h1>
            Your dream gaming desktop.
            <br />
            <em>We got you covered.</em>
          </h1>

          <p>
            Explore the machine, select each
            component and send your complete
            configuration directly to our team.
          </p>

          <div className="st-gaming-builder__hero-meta">
            <span>
              <ShieldCheck />
              Compatibility reviewed by Stereophonie
            </span>

            <span>
              <MessageCircle />
              Final confirmation through WhatsApp
            </span>
          </div>
        </div>

        <div className="st-gaming-builder__reference">
          <small>BUILD REFERENCE</small>
          <strong>{configurationReference}</strong>
        </div>
      </section>

      <section className="st-gaming-builder__workspace">
        <aside className="st-gaming-builder__parts">
          <div className="st-gaming-builder__panel-heading">
            <span>01</span>
            <div>
              <strong>Choose your components</strong>
              <small>
                Select a part to configure it.
              </small>
            </div>
          </div>

          <div className="st-gaming-builder__parts-list">
            {parts.map((part, index) => {
              const Icon = part.icon;

              const selected =
                selectedParts.find(
                  (item) =>
                    item.part.key === part.key,
                )?.choice;

              const active =
                activePart === part.key;

              return (
                <button
                  key={part.key}
                  type="button"
                  className={
                    active
                      ? "is-active"
                      : undefined
                  }
                  onClick={() =>
                    setActivePart(part.key)
                  }
                >
                  <span className="st-gaming-builder__part-index">
                    {String(index + 1).padStart(
                      2,
                      "0",
                    )}
                  </span>

                  <span className="st-gaming-builder__part-icon">
                    <Icon />
                  </span>

                  <span className="st-gaming-builder__part-copy">
                    <strong>{part.label}</strong>
                    <small>
                      {selected?.name ??
                        "Choose component"}
                    </small>
                  </span>

                  <ChevronRight />
                </button>
              );
            })}
          </div>
        </aside>

        <div className="st-gaming-builder__computer-area">
          <div className="st-gaming-builder__scene-label">
            <span>
              Interactive desktop
            </span>
            <small>
              Select highlighted components
            </small>
          </div>

          <div className="st-gaming-builder__scene">
            <div className="st-gaming-builder__floor" />

            <div className="st-gaming-builder__pc">
              <div className="st-gaming-builder__pc-top" />
              <div className="st-gaming-builder__pc-side" />

              <div className="st-gaming-builder__glass">
                <div className="st-gaming-builder__motherboard" />

                <button
                  type="button"
                  className={`st-gaming-hotspot st-gaming-hotspot--cpu ${
                    activePart === "cpu"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivePart("cpu")
                  }
                  aria-label="Configure processor"
                >
                  <span>CPU</span>
                </button>

                <button
                  type="button"
                  className={`st-gaming-hotspot st-gaming-hotspot--gpu ${
                    activePart === "gpu"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivePart("gpu")
                  }
                  aria-label="Configure graphics card"
                >
                  <span>GPU</span>
                </button>

                <button
                  type="button"
                  className={`st-gaming-hotspot st-gaming-hotspot--ram ${
                    activePart === "ram"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivePart("ram")
                  }
                  aria-label="Configure memory"
                >
                  <span>RAM</span>
                </button>

                <button
                  type="button"
                  className={`st-gaming-hotspot st-gaming-hotspot--board ${
                    activePart ===
                    "motherboard"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivePart(
                      "motherboard",
                    )
                  }
                  aria-label="Configure motherboard"
                >
                  <span>BOARD</span>
                </button>

                <button
                  type="button"
                  className={`st-gaming-hotspot st-gaming-hotspot--storage ${
                    activePart === "storage"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivePart("storage")
                  }
                  aria-label="Configure storage"
                >
                  <span>SSD</span>
                </button>

                <button
                  type="button"
                  className={`st-gaming-hotspot st-gaming-hotspot--cooling ${
                    activePart === "cooling"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivePart("cooling")
                  }
                  aria-label="Configure cooling"
                >
                  <span>COOLING</span>
                </button>

                <button
                  type="button"
                  className={`st-gaming-hotspot st-gaming-hotspot--psu ${
                    activePart === "psu"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivePart("psu")
                  }
                  aria-label="Configure power supply"
                >
                  <span>PSU</span>
                </button>
              </div>

              <div className="st-gaming-builder__front">
                <div className="st-gaming-builder__fan">
                  <i />
                </div>
                <div className="st-gaming-builder__fan">
                  <i />
                </div>
                <div className="st-gaming-builder__fan">
                  <i />
                </div>
              </div>
            </div>

            <div className="st-gaming-builder__scene-hint">
              <Gauge />
              Click a component inside the desktop
            </div>
          </div>
        </div>

        <aside className="st-gaming-builder__selector">
          <div className="st-gaming-builder__panel-heading">
            <span>02</span>

            <div>
              <strong>
                {activeDefinition.label}
              </strong>
              <small>
                {activeDefinition.description}
              </small>
            </div>
          </div>

          <div className="st-gaming-builder__choices">
            {activeDefinition.options.map(
              (choice) => {
                const selected =
                  selections[
                    activeDefinition.key
                  ] === choice.id;

                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={
                      selected
                        ? "is-selected"
                        : undefined
                    }
                    onClick={() =>
                      choose(
                        activeDefinition.key,
                        choice.id,
                      )
                    }
                  >
                    <span className="st-gaming-builder__choice-top">
                      <span>
                        {choice.badge ? (
                          <small>
                            {choice.badge}
                          </small>
                        ) : null}

                        <strong>
                          {choice.name}
                        </strong>

                        <em>
                          {choice.subtitle}
                        </em>
                      </span>

                      <span className="st-gaming-builder__choice-check">
                        {selected ? (
                          <Check />
                        ) : null}
                      </span>
                    </span>

                    <b>
                      + {money(choice.price)}
                    </b>
                  </button>
                );
              },
            )}
          </div>
        </aside>
      </section>

      <section className="st-gaming-builder__summary">
        <div className="st-gaming-builder__summary-heading">
          <div>
            <span>03 · Your configuration</span>
            <h2>
              Your desktop is ready.
            </h2>
            <p>
              Send your selected build to
              Stereophonie. Our team will verify
              final compatibility, stock and price
              before confirming your order.
            </p>
          </div>

          <button
            type="button"
            onClick={resetBuild}
            className="st-gaming-builder__reset"
          >
            <RotateCcw />
            Reset build
          </button>
        </div>

        <div className="st-gaming-builder__summary-grid">
          <div className="st-gaming-builder__spec-list">
            {selectedParts.map(
              ({ part, choice }) => (
                <div key={part.key}>
                  <span>
                    {part.shortLabel}
                  </span>

                  <strong>
                    {choice.name}
                  </strong>

                  <b>
                    {money(choice.price)}
                  </b>
                </div>
              ),
            )}
          </div>

          <aside className="st-gaming-builder__checkout">
            <span>Estimated configuration</span>

            <strong>
              {money(estimatedTotal)}
            </strong>

            <p>
              This is an estimate only. Final
              availability, compatibility and
              pricing are confirmed by Stereophonie.
            </p>

            <button
              type="button"
              onClick={sendToWhatsApp}
            >
              <MessageCircle />
              <span>
                Send configuration to
                Stereophonie
              </span>
              <ChevronRight />
            </button>

            <small>
              No payment is made online for custom
              gaming desktops.
            </small>
          </aside>
        </div>
      </section>
    </main>
  );
}
