import type {
  PcPart,
  PcPartKind,
} from "@/lib/gaming-desktop/catalog";

/*
 * ============================================================
 * STEREOPHONIE EXTENDED GAMING DESKTOP CATALOG
 * ============================================================
 *
 * This file supplements the main catalogue.
 *
 * It intentionally includes:
 * - current enthusiast hardware
 * - mainstream hardware
 * - previous-generation hardware
 * - approximately the last 5+ years of relevant gaming parts
 *
 * Duplicate IDs are removed in the builder before display.
 */

type Meta =
  Record<string, unknown>;

type Row =
  readonly [
    brand: string,
    model: string,
    detail: string,
    meta?: Meta,
  ];

function makePart(
  kind: PcPartKind,
  brand: string,
  model: string,
  detail: string,
  meta: Meta = {},
): PcPart {
  return {
    id: `${kind}-${brand}-${model}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),

    kind,
    brand,
    model,
    detail,

    ...meta,
  } as PcPart;
}

function fromRows(
  kind: PcPartKind,
  rows: readonly Row[],
): PcPart[] {
  return rows.map(
    ([brand, model, detail, meta]) =>
      makePart(
        kind,
        brand,
        model,
        detail,
        meta ?? {},
      ),
  );
}

/* ============================================================
   PROCESSORS
============================================================ */

const cpuRows: readonly Row[] = [
  /* AMD AM5 — Zen 5 / Zen 4 */
  ["AMD","Ryzen 9 9950X3D","16 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:170}],
  ["AMD","Ryzen 9 9950X","16 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:170}],
  ["AMD","Ryzen 9 9900X3D","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}],
  ["AMD","Ryzen 9 9900X","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}],
  ["AMD","Ryzen 7 9800X3D","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}],
  ["AMD","Ryzen 7 9700X","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}],
  ["AMD","Ryzen 5 9600X","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}],

  ["AMD","Ryzen 9 7950X3D","16 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}],
  ["AMD","Ryzen 9 7950X","16 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:170}],
  ["AMD","Ryzen 9 7900X3D","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}],
  ["AMD","Ryzen 9 7900X","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:170}],
  ["AMD","Ryzen 9 7900","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}],
  ["AMD","Ryzen 7 7800X3D","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}],
  ["AMD","Ryzen 7 7700X","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:105}],
  ["AMD","Ryzen 7 7700","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}],
  ["AMD","Ryzen 5 7600X","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:105}],
  ["AMD","Ryzen 5 7600","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}],

  ["AMD","Ryzen 7 8700G","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}],
  ["AMD","Ryzen 5 8600G","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}],
  ["AMD","Ryzen 5 8500G","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}],

  /* AMD AM4 */
  ["AMD","Ryzen 9 5950X","16 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}],
  ["AMD","Ryzen 9 5900X","12 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}],
  ["AMD","Ryzen 9 5900XT","16 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}],
  ["AMD","Ryzen 7 5800X3D","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}],
  ["AMD","Ryzen 7 5800X","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}],
  ["AMD","Ryzen 7 5700X3D","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}],
  ["AMD","Ryzen 7 5700X","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}],
  ["AMD","Ryzen 7 5700G","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}],
  ["AMD","Ryzen 5 5600X","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}],
  ["AMD","Ryzen 5 5600","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}],
  ["AMD","Ryzen 5 5600G","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}],
  ["AMD","Ryzen 5 5500","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}],

  /* Intel LGA1851 */
  ["Intel","Core Ultra 9 285K","24 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}],
  ["Intel","Core Ultra 7 265K","20 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}],
  ["Intel","Core Ultra 7 265KF","20 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}],
  ["Intel","Core Ultra 5 245K","14 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}],
  ["Intel","Core Ultra 5 245KF","14 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}],
  ["Intel","Core Ultra 7 270K Plus","LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}],
  ["Intel","Core Ultra 5 250K Plus","LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}],

  /* Intel LGA1700 */
  ["Intel","Core i9-14900KS","14th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:150}],
  ["Intel","Core i9-14900K","14th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i9-14900KF","14th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i7-14700K","14th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i7-14700KF","14th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i5-14600K","14th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i5-14600KF","14th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],

  ["Intel","Core i9-13900KS","13th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:150}],
  ["Intel","Core i9-13900K","13th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i9-13900KF","13th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i7-13700K","13th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i7-13700KF","13th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i5-13600K","13th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i5-13600KF","13th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],

  ["Intel","Core i9-12900KS","12th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:150}],
  ["Intel","Core i9-12900K","12th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i7-12700K","12th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i7-12700KF","12th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i5-12600K","12th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}],
  ["Intel","Core i5-12400F","12th Gen · LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:65}],

  /* Intel LGA1200 */
  ["Intel","Core i9-11900K","11th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}],
  ["Intel","Core i9-11900KF","11th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}],
  ["Intel","Core i7-11700K","11th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}],
  ["Intel","Core i7-11700","11th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:65}],
  ["Intel","Core i5-11600K","11th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}],

  ["Intel","Core i9-10900K","10th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}],
  ["Intel","Core i9-10850K","10th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}],
  ["Intel","Core i7-10700K","10th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}],
  ["Intel","Core i5-10600K","10th Gen · LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}],
];

/* ============================================================
   GRAPHICS CARDS
============================================================ */

const gpuRows: readonly Row[] = [
  ["NVIDIA","GeForce RTX 5090","32GB · Blackwell",{minPsuWattage:1000}],
  ["NVIDIA","GeForce RTX 5080","16GB · Blackwell",{minPsuWattage:850}],
  ["NVIDIA","GeForce RTX 5070 Ti","16GB · Blackwell",{minPsuWattage:750}],
  ["NVIDIA","GeForce RTX 5070","12GB · Blackwell",{minPsuWattage:650}],
  ["NVIDIA","GeForce RTX 5060 Ti 16GB","Blackwell",{minPsuWattage:600}],
  ["NVIDIA","GeForce RTX 5060 Ti 8GB","Blackwell",{minPsuWattage:600}],
  ["NVIDIA","GeForce RTX 5060","Blackwell",{minPsuWattage:550}],
  ["NVIDIA","GeForce RTX 5050","Blackwell",{minPsuWattage:550}],

  ["NVIDIA","GeForce RTX 4090","24GB · Ada Lovelace",{minPsuWattage:850}],
  ["NVIDIA","GeForce RTX 4080 SUPER","16GB · Ada Lovelace",{minPsuWattage:750}],
  ["NVIDIA","GeForce RTX 4080","16GB · Ada Lovelace",{minPsuWattage:750}],
  ["NVIDIA","GeForce RTX 4070 Ti SUPER","16GB · Ada Lovelace",{minPsuWattage:700}],
  ["NVIDIA","GeForce RTX 4070 Ti","12GB · Ada Lovelace",{minPsuWattage:700}],
  ["NVIDIA","GeForce RTX 4070 SUPER","12GB · Ada Lovelace",{minPsuWattage:650}],
  ["NVIDIA","GeForce RTX 4070","12GB · Ada Lovelace",{minPsuWattage:650}],
  ["NVIDIA","GeForce RTX 4060 Ti 16GB","Ada Lovelace",{minPsuWattage:550}],
  ["NVIDIA","GeForce RTX 4060 Ti 8GB","Ada Lovelace",{minPsuWattage:550}],
  ["NVIDIA","GeForce RTX 4060","8GB · Ada Lovelace",{minPsuWattage:550}],

  ["NVIDIA","GeForce RTX 3090 Ti","24GB · Ampere",{minPsuWattage:850}],
  ["NVIDIA","GeForce RTX 3090","24GB · Ampere",{minPsuWattage:750}],
  ["NVIDIA","GeForce RTX 3080 Ti","12GB · Ampere",{minPsuWattage:750}],
  ["NVIDIA","GeForce RTX 3080 12GB","Ampere",{minPsuWattage:750}],
  ["NVIDIA","GeForce RTX 3080 10GB","Ampere",{minPsuWattage:750}],
  ["NVIDIA","GeForce RTX 3070 Ti","8GB · Ampere",{minPsuWattage:650}],
  ["NVIDIA","GeForce RTX 3070","8GB · Ampere",{minPsuWattage:650}],
  ["NVIDIA","GeForce RTX 3060 Ti","8GB · Ampere",{minPsuWattage:600}],
  ["NVIDIA","GeForce RTX 3060 12GB","Ampere",{minPsuWattage:550}],
  ["NVIDIA","GeForce RTX 3050","Ampere",{minPsuWattage:500}],

  ["NVIDIA","GeForce RTX 2080 Ti","11GB · Turing",{minPsuWattage:650}],
  ["NVIDIA","GeForce RTX 2080 SUPER","8GB · Turing",{minPsuWattage:650}],
  ["NVIDIA","GeForce RTX 2070 SUPER","8GB · Turing",{minPsuWattage:600}],
  ["NVIDIA","GeForce RTX 2060 SUPER","8GB · Turing",{minPsuWattage:550}],

  ["AMD","Radeon RX 9070 XT","RDNA 4",{minPsuWattage:750}],
  ["AMD","Radeon RX 9070","RDNA 4",{minPsuWattage:650}],
  ["AMD","Radeon RX 7900 XTX","24GB · RDNA 3",{minPsuWattage:800}],
  ["AMD","Radeon RX 7900 XT","20GB · RDNA 3",{minPsuWattage:750}],
  ["AMD","Radeon RX 7900 GRE","16GB · RDNA 3",{minPsuWattage:700}],
  ["AMD","Radeon RX 7800 XT","16GB · RDNA 3",{minPsuWattage:700}],
  ["AMD","Radeon RX 7700 XT","12GB · RDNA 3",{minPsuWattage:700}],
  ["AMD","Radeon RX 7600 XT","16GB · RDNA 3",{minPsuWattage:600}],
  ["AMD","Radeon RX 7600","8GB · RDNA 3",{minPsuWattage:550}],

  ["AMD","Radeon RX 6950 XT","16GB · RDNA 2",{minPsuWattage:850}],
  ["AMD","Radeon RX 6900 XT","16GB · RDNA 2",{minPsuWattage:850}],
  ["AMD","Radeon RX 6800 XT","16GB · RDNA 2",{minPsuWattage:750}],
  ["AMD","Radeon RX 6800","16GB · RDNA 2",{minPsuWattage:650}],
  ["AMD","Radeon RX 6750 XT","12GB · RDNA 2",{minPsuWattage:650}],
  ["AMD","Radeon RX 6700 XT","12GB · RDNA 2",{minPsuWattage:650}],
  ["AMD","Radeon RX 6650 XT","8GB · RDNA 2",{minPsuWattage:550}],
  ["AMD","Radeon RX 6600 XT","8GB · RDNA 2",{minPsuWattage:550}],
  ["AMD","Radeon RX 6600","8GB · RDNA 2",{minPsuWattage:500}],

  ["Intel","Arc B580","Battlemage",{minPsuWattage:600}],
  ["Intel","Arc B570","Battlemage",{minPsuWattage:600}],
  ["Intel","Arc A770 16GB","Alchemist",{minPsuWattage:650}],
  ["Intel","Arc A750","Alchemist",{minPsuWattage:600}],
];

/* ============================================================
   MOTHERBOARDS
============================================================ */

const motherboardRows: readonly Row[] = [
  /* AMD AM5 */
  ["ASUS","ROG Crosshair X870E Hero","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["ASUS","ROG Strix X870E-E Gaming WiFi","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["ASUS","ROG Strix X870-A Gaming WiFi","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["ASUS","TUF Gaming X870-Plus WiFi","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["MSI","MEG X870E GODLIKE","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}],
  ["MSI","MPG X870E Carbon WiFi","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["MSI","MAG X870 Tomahawk WiFi","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["Gigabyte","X870E AORUS Master","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}],
  ["Gigabyte","X870 AORUS Elite WiFi7","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["ASRock","X870E Taichi","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}],
  ["ASRock","X870 Steel Legend WiFi","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],

  ["ASUS","ROG Crosshair X670E Hero","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["ASUS","ROG Strix X670E-E Gaming WiFi","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["ASUS","TUF Gaming B650-Plus WiFi","AM5 · B650 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["MSI","MEG X670E ACE","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}],
  ["MSI","MAG B650 Tomahawk WiFi","AM5 · B650 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["Gigabyte","X670E AORUS Master","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}],
  ["Gigabyte","B650 AORUS Elite AX","AM5 · B650 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["ASRock","X670E Taichi","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}],
  ["ASRock","B650E Steel Legend WiFi","AM5 · B650E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],

  /* AMD AM4 */
  ["ASUS","ROG Crosshair VIII Dark Hero","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["ASUS","ROG Strix X570-E Gaming WiFi II","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["ASUS","ROG Strix B550-F Gaming WiFi II","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["MSI","MEG X570S ACE MAX","AM4 · X570S · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["MSI","MAG B550 Tomahawk MAX WiFi","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["Gigabyte","X570S AORUS Master","AM4 · X570S · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["Gigabyte","B550 AORUS Master","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["ASRock","X570 Taichi","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["ASRock","B550 Steel Legend","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],

  /* Intel LGA1851 */
  ["ASUS","ROG Maximus Z890 Extreme","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}],
  ["ASUS","ROG Maximus Z890 Hero","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["ASUS","ROG Strix Z890-E Gaming WiFi","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["MSI","MEG Z890 GODLIKE","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}],
  ["MSI","MPG Z890 Carbon WiFi","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}],
  ["Gigabyte","Z890 AORUS Master","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}],
  ["ASRock","Z890 Taichi","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}],

  /* Intel LGA1700 DDR5 */
  ["ASUS","ROG Maximus Z790 Dark Hero","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["ASUS","ROG Strix Z790-E Gaming WiFi II","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["ASUS","TUF Gaming Z790-Pro WiFi","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["MSI","MEG Z790 ACE MAX","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}],
  ["MSI","MPG Z790 Carbon WiFi II","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["MSI","MAG Z790 Tomahawk MAX WiFi","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["Gigabyte","Z790 AORUS Master X","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}],
  ["Gigabyte","Z790 AORUS Elite AX","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],
  ["ASRock","Z790 Taichi Lite","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}],
  ["ASRock","Z790 Steel Legend WiFi","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}],

  /* Intel LGA1700 DDR4 */
  ["ASUS","TUF Gaming Z790-Plus WiFi D4","LGA1700 · Z790 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["ASUS","ROG Strix Z690-A Gaming WiFi D4","LGA1700 · Z690 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["MSI","MAG Z790 Tomahawk WiFi DDR4","LGA1700 · Z790 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["MSI","PRO Z690-A DDR4","LGA1700 · Z690 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["Gigabyte","Z690 AORUS Elite AX DDR4","LGA1700 · Z690 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],

  /* Intel LGA1200 / Z590 */
  ["ASUS","ROG Maximus XIII Hero","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["ASUS","ROG Strix Z590-E Gaming WiFi","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["MSI","MEG Z590 ACE","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["Gigabyte","Z590 AORUS Master","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["ASRock","Z590 Taichi","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["ASUS","ROG Maximus XII Hero WiFi","LGA1200 · Z490 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
  ["MSI","MEG Z490 ACE","LGA1200 · Z490 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}],
];

/* ============================================================
   MEMORY
============================================================ */

const ramRows: readonly Row[] = [
  ["Corsair","Dominator Titanium RGB 96GB DDR5-6600","2×48GB · DDR5",{memory:"DDR5",capacityGb:96}],
  ["Corsair","Dominator Titanium RGB 64GB DDR5-6600","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["Corsair","Dominator Platinum RGB 64GB DDR5-6000","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["Corsair","Vengeance RGB 64GB DDR5-6000","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["Corsair","Vengeance 32GB DDR5-6000","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["Corsair","Vengeance RGB Pro SL 32GB DDR4-3600","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],
  ["Corsair","Vengeance LPX 32GB DDR4-3200","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],
  ["Corsair","Vengeance LPX 64GB DDR4-3200","2×32GB · DDR4",{memory:"DDR4",capacityGb:64}],

  ["G.Skill","Trident Z5 Royal 96GB DDR5-6400","2×48GB · DDR5",{memory:"DDR5",capacityGb:96}],
  ["G.Skill","Trident Z5 RGB 64GB DDR5-6400","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["G.Skill","Trident Z5 Neo RGB 64GB DDR5-6000","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["G.Skill","Trident Z5 Neo RGB 32GB DDR5-6000","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["G.Skill","Ripjaws S5 32GB DDR5-6000","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["G.Skill","Trident Z Neo 32GB DDR4-3600","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],
  ["G.Skill","Ripjaws V 32GB DDR4-3600","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],
  ["G.Skill","Ripjaws V 64GB DDR4-3200","2×32GB · DDR4",{memory:"DDR4",capacityGb:64}],

  ["Kingston","FURY Renegade RGB 96GB DDR5-6400","2×48GB · DDR5",{memory:"DDR5",capacityGb:96}],
  ["Kingston","FURY Renegade RGB 64GB DDR5-6400","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["Kingston","FURY Beast RGB 32GB DDR5-6000","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["Kingston","FURY Beast 32GB DDR5-5600","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["Kingston","FURY Renegade RGB 32GB DDR4-3600","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],
  ["Kingston","FURY Beast 32GB DDR4-3200","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],

  ["Crucial","Pro Overclocking 32GB DDR5-6000","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["Crucial","Pro 64GB DDR5-5600","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["Crucial","Pro 32GB DDR5-5600","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["Crucial","Ballistix MAX 32GB DDR4-4000","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],
  ["Crucial","Ballistix 32GB DDR4-3600","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],

  ["TeamGroup","T-Force Delta RGB 64GB DDR5-6400","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["TeamGroup","T-Force Delta RGB 32GB DDR5-6000","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["TeamGroup","T-Force Xtreem ARGB 32GB DDR4-3600","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],

  ["ADATA","XPG Lancer RGB 64GB DDR5-6000","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["ADATA","XPG Lancer Blade 32GB DDR5-6000","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
  ["ADATA","XPG Spectrix D50 32GB DDR4-3600","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],

  ["Patriot","Viper Venom RGB 64GB DDR5-6000","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["Patriot","Viper Steel 32GB DDR4-3600","2×16GB · DDR4",{memory:"DDR4",capacityGb:32}],

  ["Lexar","Ares RGB 64GB DDR5-6400","2×32GB · DDR5",{memory:"DDR5",capacityGb:64}],
  ["Lexar","Ares RGB 32GB DDR5-6000","2×16GB · DDR5",{memory:"DDR5",capacityGb:32}],
];

/* ============================================================
   STORAGE
============================================================ */

const storageRows: readonly Row[] = [
  ["Samsung","9100 PRO 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Samsung","990 PRO 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Samsung","990 PRO 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Samsung","990 EVO Plus 2TB","NVMe",{pcieGeneration:4}],
  ["Samsung","980 PRO 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Samsung","980 PRO 1TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Samsung","980 1TB","PCIe 3.0 NVMe",{pcieGeneration:3}],
  ["Samsung","970 EVO Plus 2TB","PCIe 3.0 NVMe",{pcieGeneration:3}],
  ["Samsung","970 EVO Plus 1TB","PCIe 3.0 NVMe",{pcieGeneration:3}],

  ["WD_BLACK","SN850X 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["WD_BLACK","SN850X 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["WD_BLACK","SN850 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["WD_BLACK","SN770 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["WD_BLACK","SN750 2TB","PCIe 3.0 NVMe",{pcieGeneration:3}],

  ["Crucial","T705 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Crucial","T705 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Crucial","T700 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Crucial","T700 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Crucial","T500 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Crucial","P5 Plus 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Crucial","P3 Plus 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],

  ["Kingston","FURY Renegade G5 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Kingston","FURY Renegade 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Kingston","KC3000 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Kingston","KC3000 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Kingston","NV2 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],

  ["Seagate","FireCuda 540 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Seagate","FireCuda 530R 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Seagate","FireCuda 530 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Seagate","FireCuda 520 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],

  ["Corsair","MP700 PRO 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Corsair","MP700 PRO 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Corsair","MP600 PRO XT 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Corsair","MP600 CORE XT 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],

  ["Sabrent","Rocket 5 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}],
  ["Sabrent","Rocket 4 Plus 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["SK hynix","Platinum P41 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
  ["Solidigm","P44 Pro 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}],
];

/* ============================================================
   CPU COOLING
============================================================ */

const coolingRows: readonly Row[] = [
  ["NZXT","Kraken Elite 360 RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700","LGA1851"]}],
  ["NZXT","Kraken Elite 280 RGB","280mm AIO",{radiatorSizeMm:280,supportedSockets:["AM4","AM5","LGA1200","LGA1700","LGA1851"]}],
  ["NZXT","Kraken 360 RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],

  ["Corsair","iCUE LINK TITAN 360 RX RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}],
  ["Corsair","iCUE H150i Elite LCD XT","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],
  ["Corsair","iCUE H115i Elite Capellix XT","280mm AIO",{radiatorSizeMm:280,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],
  ["Corsair","iCUE H100i Elite Capellix XT","240mm AIO",{radiatorSizeMm:240,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],

  ["Arctic","Liquid Freezer III Pro 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}],
  ["Arctic","Liquid Freezer III 360 A-RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}],
  ["Arctic","Liquid Freezer II 360 A-RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],

  ["ASUS","ROG Ryujin III 360 ARGB Extreme","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}],
  ["ASUS","ROG Ryujin II 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],

  ["Lian Li","HydroShift LCD 360TL","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}],
  ["Lian Li","Galahad II LCD 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}],
  ["Lian Li","Galahad AIO 360 UNI FAN SL Edition","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],

  ["Cooler Master","MasterLiquid 360 Atmos","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}],
  ["Cooler Master","MasterLiquid ML360 Illusion","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],

  ["be quiet!","Light Loop 360mm","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}],
  ["be quiet!","Pure Loop 2 FX 360mm","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],

  ["Noctua","NH-D15 G2","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700","LGA1851"]}],
  ["Noctua","NH-D15 chromax.black","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],
  ["Noctua","NH-U12A chromax.black","Tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],

  ["DeepCool","Assassin IV","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}],
  ["DeepCool","AK620 Digital","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}],
  ["Thermalright","Phantom Spirit 120 EVO","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}],
  ["Thermalright","Peerless Assassin 120 SE","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}],
];

/* ============================================================
   POWER SUPPLIES
============================================================ */

const psuRows: readonly Row[] = [
  ["Corsair","AX1600i","1600W · Titanium",{wattage:1600}],
  ["Corsair","HX1500i","1500W · Platinum",{wattage:1500}],
  ["Corsair","HX1200i","1200W · Platinum",{wattage:1200}],
  ["Corsair","RM1200x SHIFT","1200W · ATX 3.x",{wattage:1200}],
  ["Corsair","RM1000x SHIFT","1000W · ATX 3.x",{wattage:1000}],
  ["Corsair","RM1000x","1000W · Gold",{wattage:1000}],
  ["Corsair","RM850x","850W · Gold",{wattage:850}],
  ["Corsair","RM750x","750W · Gold",{wattage:750}],
  ["Corsair","RM650x","650W · Gold",{wattage:650}],

  ["Seasonic","PRIME TX-1600","1600W · Titanium",{wattage:1600}],
  ["Seasonic","PRIME TX-1300","1300W · Titanium",{wattage:1300}],
  ["Seasonic","VERTEX GX-1200","1200W · Gold",{wattage:1200}],
  ["Seasonic","VERTEX GX-1000","1000W · Gold",{wattage:1000}],
  ["Seasonic","FOCUS GX-1000","1000W · Gold",{wattage:1000}],
  ["Seasonic","FOCUS GX-850","850W · Gold",{wattage:850}],
  ["Seasonic","FOCUS GX-750","750W · Gold",{wattage:750}],

  ["be quiet!","Dark Power Pro 13 1600W","1600W · Titanium",{wattage:1600}],
  ["be quiet!","Dark Power 13 1000W","1000W · Titanium",{wattage:1000}],
  ["be quiet!","Straight Power 12 1200W","1200W · Platinum",{wattage:1200}],
  ["be quiet!","Straight Power 12 1000W","1000W · Platinum",{wattage:1000}],
  ["be quiet!","Pure Power 12 M 850W","850W · Gold",{wattage:850}],

  ["ASUS","ROG Thor 1600W Titanium III","1600W",{wattage:1600}],
  ["ASUS","ROG Thor 1200P2 Gaming","1200W",{wattage:1200}],
  ["ASUS","ROG Thor 1000P2 Gaming","1000W",{wattage:1000}],
  ["ASUS","ROG Strix 1000W Gold Aura","1000W",{wattage:1000}],
  ["ASUS","TUF Gaming 850W Gold","850W",{wattage:850}],

  ["MSI","MEG Ai1600T PCIE5","1600W · Titanium",{wattage:1600}],
  ["MSI","MEG Ai1300P PCIE5","1300W · Platinum",{wattage:1300}],
  ["MSI","MPG A1000G PCIE5","1000W · Gold",{wattage:1000}],
  ["MSI","MPG A850G PCIE5","850W · Gold",{wattage:850}],

  ["Thermaltake","Toughpower TF3 1550W","1550W · Titanium",{wattage:1550}],
  ["Thermaltake","Toughpower GF A3 1200W","1200W · Gold",{wattage:1200}],
  ["Thermaltake","Toughpower GF A3 850W","850W · Gold",{wattage:850}],

  ["Cooler Master","V Platinum V2 1300W","1300W · Platinum",{wattage:1300}],
  ["Cooler Master","MWE Gold 1050 V2","1050W · Gold",{wattage:1050}],
  ["Cooler Master","MWE Gold 850 V2","850W · Gold",{wattage:850}],
];

/* ============================================================
   CASES
============================================================ */

const caseRows: readonly Row[] = [
  ["Lian Li","O11 Dynamic EVO RGB","Dual chamber",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:455,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
  ["Lian Li","O11 Vision Compact","Panoramic",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:408,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["Lian Li","O11D EVO XL","Full tower",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:460,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
  ["Lian Li","Lancool III RGB","Airflow",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:435,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
  ["Lian Li","Lancool II Mesh RGB","Airflow",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:384,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],

  ["NZXT","H9 Elite","Dual chamber",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:435,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["NZXT","H9 Flow","Dual chamber airflow",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:435,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["NZXT","H7 Flow","Mid tower",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:400,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["NZXT","H6 Flow RGB","Compact dual chamber",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:365,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["NZXT","H510 Elite","Legacy mid tower",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:381,supportedRadiatorSizes:[120,240,280],supportedFanSizes:[120,140]}],

  ["Corsair","9000D RGB Airflow","Super tower",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:400,supportedRadiatorSizes:[120,240,280,360,420,480],supportedFanSizes:[120,140]}],
  ["Corsair","7000D Airflow","Full tower",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:450,supportedRadiatorSizes:[120,240,280,360,420,480],supportedFanSizes:[120,140]}],
  ["Corsair","6500X RGB","Dual chamber",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:400,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["Corsair","5000D Airflow","Mid tower",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:420,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["Corsair","4000D Airflow","Mid tower",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:360,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],

  ["HYTE","Y70 Touch Infinite","Panoramic",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:422,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["HYTE","Y70","Panoramic",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:422,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["HYTE","Y60","Panoramic",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:375,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],

  ["Fractal Design","North XL","Full tower",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:413,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
  ["Fractal Design","North","Mid tower",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:355,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],
  ["Fractal Design","Torrent","High airflow",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:423,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140,180]}],
  ["Fractal Design","Meshify 2","Airflow",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:467,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],

  ["Phanteks","NV9","Full tower",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:490,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
  ["Phanteks","NV7","Panoramic",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:450,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
  ["Phanteks","Eclipse P500A","Airflow",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:435,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],

  ["Cooler Master","HAF 700 EVO","Full tower",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:490,supportedRadiatorSizes:[120,240,280,360,420,480],supportedFanSizes:[120,140,200]}],
  ["Cooler Master","TD500 Mesh V2","Airflow",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:410,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],

  ["ASUS","ROG Hyperion GR701","Full tower",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:460,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
  ["ASUS","TUF Gaming GT502","Dual chamber",{supportedFormFactors:["ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:400,supportedRadiatorSizes:[120,240,280,360],supportedFanSizes:[120,140]}],

  ["be quiet!","Dark Base Pro 901","Full tower",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:495,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
  ["be quiet!","Shadow Base 800 FX","Airflow",{supportedFormFactors:["E-ATX","ATX","Micro-ATX","Mini-ITX"],maxGpuLengthMm:430,supportedRadiatorSizes:[120,240,280,360,420],supportedFanSizes:[120,140]}],
];

/* ============================================================
   CASE FANS
============================================================ */

const fanRows: readonly Row[] = [
  ["Lian Li","UNI FAN SL Wireless LCD 120 Triple Pack","120mm",{fanSizeMm:120}],
  ["Lian Li","UNI FAN TL LCD 120 Triple Pack","120mm",{fanSizeMm:120}],
  ["Lian Li","UNI FAN SL-INF 120 Triple Pack","120mm",{fanSizeMm:120}],
  ["Lian Li","UNI FAN AL120 V2 Triple Pack","120mm",{fanSizeMm:120}],
  ["Lian Li","UNI FAN SL140 V2","140mm",{fanSizeMm:140}],

  ["Corsair","iCUE LINK QX120 RGB Triple Pack","120mm",{fanSizeMm:120}],
  ["Corsair","iCUE LINK QX140 RGB Twin Pack","140mm",{fanSizeMm:140}],
  ["Corsair","LX120 RGB Triple Pack","120mm",{fanSizeMm:120}],
  ["Corsair","RX120 RGB Triple Pack","120mm",{fanSizeMm:120}],
  ["Corsair","LL120 RGB Triple Pack","120mm",{fanSizeMm:120}],
  ["Corsair","QL120 RGB Triple Pack","120mm",{fanSizeMm:120}],

  ["NZXT","F120 RGB Core Triple Pack","120mm",{fanSizeMm:120}],
  ["NZXT","F140 RGB Core Twin Pack","140mm",{fanSizeMm:140}],
  ["NZXT","Aer RGB 2 120mm Triple Pack","120mm",{fanSizeMm:120}],

  ["Phanteks","D30-120 DRGB Triple Pack","120mm",{fanSizeMm:120}],
  ["Phanteks","D30-140 DRGB Triple Pack","140mm",{fanSizeMm:140}],
  ["Phanteks","T30-120 Triple Pack","120mm",{fanSizeMm:120}],

  ["be quiet!","Light Wings LX 120 Triple Pack","120mm",{fanSizeMm:120}],
  ["be quiet!","Light Wings 140 Triple Pack","140mm",{fanSizeMm:140}],
  ["be quiet!","Silent Wings Pro 4 120mm","120mm",{fanSizeMm:120}],
  ["be quiet!","Silent Wings Pro 4 140mm","140mm",{fanSizeMm:140}],

  ["Noctua","NF-A12x25 G2","120mm",{fanSizeMm:120}],
  ["Noctua","NF-A12x25 PWM","120mm",{fanSizeMm:120}],
  ["Noctua","NF-A14 PWM","140mm",{fanSizeMm:140}],

  ["Arctic","P12 PWM PST A-RGB Triple Pack","120mm",{fanSizeMm:120}],
  ["Arctic","P12 Max","120mm",{fanSizeMm:120}],
  ["Arctic","P14 PWM PST A-RGB","140mm",{fanSizeMm:140}],

  ["Cooler Master","MasterFan MF120 Halo Triple Pack","120mm",{fanSizeMm:120}],
  ["Thermaltake","SWAFAN EX12 RGB Triple Pack","120mm",{fanSizeMm:120}],
  ["Thermaltake","TOUGHFAN 14 Pro","140mm",{fanSizeMm:140}],
];

/* ============================================================
   EXPORT
============================================================ */

export const extendedPcCatalog:
  Record<PcPartKind, PcPart[]> = {
    cpu: fromRows(
      "cpu",
      cpuRows,
    ),

    gpu: fromRows(
      "gpu",
      gpuRows,
    ),

    motherboard: fromRows(
      "motherboard",
      motherboardRows,
    ),

    ram: fromRows(
      "ram",
      ramRows,
    ),

    storage: fromRows(
      "storage",
      storageRows,
    ),

    cooling: fromRows(
      "cooling",
      coolingRows,
    ),

    psu: fromRows(
      "psu",
      psuRows,
    ),

    case: fromRows(
      "case",
      caseRows,
    ),

    fans: fromRows(
      "fans",
      fanRows,
    ),
  };
