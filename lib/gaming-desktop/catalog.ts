export type PcPartKind =
  | "cpu"
  | "gpu"
  | "motherboard"
  | "ram"
  | "storage"
  | "cooling"
  | "psu"
  | "case"
  | "fans";

export type PcMemoryType = "DDR4" | "DDR5" | "DDR4 / DDR5";

export type PcMotherboardFormFactor =
  "E-ATX" | "ATX" | "Micro-ATX" | "Mini-ITX";

export type PcPart = {
  id: string;
  kind: PcPartKind;
  brand: string;
  model: string;
  detail: string;

  /*
   * Search / catalogue metadata.
   */
  tags?: string[];

  /*
   * CPU / motherboard platform metadata.
   */
  socket?: string;
  supportedSockets?: string[];

  /*
   * Memory compatibility.
   */
  memory?: PcMemoryType;
  maxMemoryGb?: number;
  memorySlots?: number;

  /*
   * Motherboard / case geometry.
   */
  formFactor?: PcMotherboardFormFactor;
  supportedFormFactors?: PcMotherboardFormFactor[];

  /*
   * Power compatibility.
   */
  wattage?: number;
  recommendedPsuW?: number;

  /*
   * GPU / case geometry.
   */
  gpuLengthMm?: number;
  maxGpuLengthMm?: number;

  /*
   * Cooling / case compatibility.
   */
  radiatorSizeMm?: number;
  supportedRadiatorSizes?: number[];
  fanSizeMm?: number;
  supportedFanSizes?: number[];

  /*
   * Storage capabilities.
   */
  storageInterface?: "NVMe" | "SATA";
  pcieGeneration?: 3 | 4 | 5;
  m2Slots?: number;
};

function part(
  kind: PcPartKind,
  brand: string,
  model: string,
  detail: string,
  extras: Omit<PcPart, "id" | "kind" | "brand" | "model" | "detail"> = {},
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
    ...extras,
  };
}

export const cpuCatalog: PcPart[] = [
  /* AMD Ryzen 9000 */
  part("cpu", "AMD", "Ryzen 9 9950X3D", "16 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 9 9950X", "16 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 9 9900X3D", "12 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 9 9900X", "12 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 7 9800X3D", "8 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 7 9700X", "8 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 5 9600X", "6 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),

  /* AMD Ryzen 7000 */
  part("cpu", "AMD", "Ryzen 9 7950X3D", "16 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 9 7950X", "16 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 9 7900X3D", "12 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 9 7900X", "12 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 7 7800X3D", "8 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 7 7700X", "8 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 7 7700", "8 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 5 7600X", "6 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("cpu", "AMD", "Ryzen 5 7600", "6 cores · AM5", {
    socket: "AM5",
    memory: "DDR5",
  }),

  /* AMD Ryzen 5000 */
  part("cpu", "AMD", "Ryzen 9 5950X", "16 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 9 5900X", "12 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 7 5800X3D", "8 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 7 5800X", "8 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 7 5700X3D", "8 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 7 5700X", "8 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 5 5600X", "6 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 5 5600", "6 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),

  /* AMD Ryzen 3000 */
  part("cpu", "AMD", "Ryzen 9 3950X", "16 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 9 3900X", "12 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 7 3800X", "8 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 7 3700X", "8 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 5 3600X", "6 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("cpu", "AMD", "Ryzen 5 3600", "6 cores · AM4", {
    socket: "AM4",
    memory: "DDR4",
  }),

  /* Intel Core Ultra */
  part("cpu", "Intel", "Core Ultra 9 285K", "Arrow Lake · LGA1851", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part("cpu", "Intel", "Core Ultra 7 265K", "Arrow Lake · LGA1851", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part("cpu", "Intel", "Core Ultra 7 265KF", "Arrow Lake · LGA1851", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part("cpu", "Intel", "Core Ultra 5 245K", "Arrow Lake · LGA1851", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part("cpu", "Intel", "Core Ultra 5 245KF", "Arrow Lake · LGA1851", {
    socket: "LGA1851",
    memory: "DDR5",
  }),

  /* Intel 14th gen */
  part("cpu", "Intel", "Core i9-14900KS", "14th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i9-14900K", "14th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i9-14900KF", "14th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i7-14700K", "14th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i7-14700KF", "14th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i5-14600K", "14th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i5-14400F", "14th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),

  /* Intel 13th gen */
  part("cpu", "Intel", "Core i9-13900KS", "13th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i9-13900K", "13th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i7-13700K", "13th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i5-13600K", "13th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i5-13400F", "13th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),

  /* Intel 12th gen */
  part("cpu", "Intel", "Core i9-12900KS", "12th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i9-12900K", "12th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i7-12700K", "12th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i5-12600K", "12th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),
  part("cpu", "Intel", "Core i5-12400F", "12th Gen · LGA1700", {
    socket: "LGA1700",
    memory: "DDR4 / DDR5",
  }),

  /* Intel 11th / 10th */
  part("cpu", "Intel", "Core i9-11900K", "11th Gen · LGA1200", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
  part("cpu", "Intel", "Core i7-11700K", "11th Gen · LGA1200", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
  part("cpu", "Intel", "Core i5-11600K", "11th Gen · LGA1200", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
  part("cpu", "Intel", "Core i9-10900K", "10th Gen · LGA1200", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
  part("cpu", "Intel", "Core i7-10700K", "10th Gen · LGA1200", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
  part("cpu", "Intel", "Core i5-10600K", "10th Gen · LGA1200", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
];

export const gpuCatalog: PcPart[] = [
  /* RTX 50 */
  part("gpu", "NVIDIA", "GeForce RTX 5090", "32GB · Flagship", {
    wattage: 575,
  }),
  part("gpu", "NVIDIA", "GeForce RTX 5080", "16GB · Enthusiast", {
    wattage: 360,
  }),
  part("gpu", "NVIDIA", "GeForce RTX 5070 Ti", "16GB", { wattage: 300 }),
  part("gpu", "NVIDIA", "GeForce RTX 5070", "12GB", { wattage: 250 }),
  part("gpu", "NVIDIA", "GeForce RTX 5060 Ti 16GB", "Blackwell", {
    wattage: 180,
  }),
  part("gpu", "NVIDIA", "GeForce RTX 5060 Ti 8GB", "Blackwell", {
    wattage: 180,
  }),
  part("gpu", "NVIDIA", "GeForce RTX 5060", "Blackwell", { wattage: 145 }),

  /* RTX 40 */
  part("gpu", "NVIDIA", "GeForce RTX 4090", "24GB", { wattage: 450 }),
  part("gpu", "NVIDIA", "GeForce RTX 4080 SUPER", "16GB", { wattage: 320 }),
  part("gpu", "NVIDIA", "GeForce RTX 4080", "16GB", { wattage: 320 }),
  part("gpu", "NVIDIA", "GeForce RTX 4070 Ti SUPER", "16GB", { wattage: 285 }),
  part("gpu", "NVIDIA", "GeForce RTX 4070 Ti", "12GB", { wattage: 285 }),
  part("gpu", "NVIDIA", "GeForce RTX 4070 SUPER", "12GB", { wattage: 220 }),
  part("gpu", "NVIDIA", "GeForce RTX 4070", "12GB", { wattage: 200 }),
  part("gpu", "NVIDIA", "GeForce RTX 4060 Ti 16GB", "Ada Lovelace", {
    wattage: 165,
  }),
  part("gpu", "NVIDIA", "GeForce RTX 4060 Ti 8GB", "Ada Lovelace", {
    wattage: 160,
  }),
  part("gpu", "NVIDIA", "GeForce RTX 4060", "8GB", { wattage: 115 }),

  /* RTX 30 */
  part("gpu", "NVIDIA", "GeForce RTX 3090 Ti", "24GB", { wattage: 450 }),
  part("gpu", "NVIDIA", "GeForce RTX 3090", "24GB", { wattage: 350 }),
  part("gpu", "NVIDIA", "GeForce RTX 3080 Ti", "12GB", { wattage: 350 }),
  part("gpu", "NVIDIA", "GeForce RTX 3080", "10GB / 12GB", { wattage: 320 }),
  part("gpu", "NVIDIA", "GeForce RTX 3070 Ti", "8GB", { wattage: 290 }),
  part("gpu", "NVIDIA", "GeForce RTX 3070", "8GB", { wattage: 220 }),
  part("gpu", "NVIDIA", "GeForce RTX 3060 Ti", "8GB", { wattage: 200 }),
  part("gpu", "NVIDIA", "GeForce RTX 3060", "12GB", { wattage: 170 }),
  part("gpu", "NVIDIA", "GeForce RTX 3050", "8GB", { wattage: 130 }),

  /* RTX 20 / GTX */
  part("gpu", "NVIDIA", "GeForce RTX 2080 Ti", "11GB", { wattage: 250 }),
  part("gpu", "NVIDIA", "GeForce RTX 2080 SUPER", "8GB", { wattage: 250 }),
  part("gpu", "NVIDIA", "GeForce RTX 2080", "8GB", { wattage: 215 }),
  part("gpu", "NVIDIA", "GeForce RTX 2070 SUPER", "8GB", { wattage: 215 }),
  part("gpu", "NVIDIA", "GeForce RTX 2070", "8GB", { wattage: 175 }),
  part("gpu", "NVIDIA", "GeForce RTX 2060 SUPER", "8GB", { wattage: 175 }),
  part("gpu", "NVIDIA", "GeForce RTX 2060", "6GB", { wattage: 160 }),
  part("gpu", "NVIDIA", "GeForce GTX 1660 Ti", "6GB", { wattage: 120 }),
  part("gpu", "NVIDIA", "GeForce GTX 1660 SUPER", "6GB", { wattage: 125 }),
  part("gpu", "NVIDIA", "GeForce GTX 1660", "6GB", { wattage: 120 }),
  part("gpu", "NVIDIA", "GeForce GTX 1080 Ti", "11GB", { wattage: 250 }),
  part("gpu", "NVIDIA", "GeForce GTX 1080", "8GB", { wattage: 180 }),
  part("gpu", "NVIDIA", "GeForce GTX 1070 Ti", "8GB", { wattage: 180 }),
  part("gpu", "NVIDIA", "GeForce GTX 1070", "8GB", { wattage: 150 }),
  part("gpu", "NVIDIA", "GeForce GTX 1060 6GB", "Pascal", { wattage: 120 }),

  /* AMD 9000 */
  part("gpu", "AMD", "Radeon RX 9070 XT", "16GB", { wattage: 304 }),
  part("gpu", "AMD", "Radeon RX 9070", "16GB", { wattage: 220 }),
  part("gpu", "AMD", "Radeon RX 9060 XT 16GB", "RDNA 4", { wattage: 160 }),
  part("gpu", "AMD", "Radeon RX 9060 XT 8GB", "RDNA 4", { wattage: 160 }),

  /* AMD 7000 */
  part("gpu", "AMD", "Radeon RX 7900 XTX", "24GB", { wattage: 355 }),
  part("gpu", "AMD", "Radeon RX 7900 XT", "20GB", { wattage: 315 }),
  part("gpu", "AMD", "Radeon RX 7900 GRE", "16GB", { wattage: 260 }),
  part("gpu", "AMD", "Radeon RX 7800 XT", "16GB", { wattage: 263 }),
  part("gpu", "AMD", "Radeon RX 7700 XT", "12GB", { wattage: 245 }),
  part("gpu", "AMD", "Radeon RX 7600 XT", "16GB", { wattage: 190 }),
  part("gpu", "AMD", "Radeon RX 7600", "8GB", { wattage: 165 }),

  /* AMD 6000 */
  part("gpu", "AMD", "Radeon RX 6950 XT", "16GB", { wattage: 335 }),
  part("gpu", "AMD", "Radeon RX 6900 XT", "16GB", { wattage: 300 }),
  part("gpu", "AMD", "Radeon RX 6800 XT", "16GB", { wattage: 300 }),
  part("gpu", "AMD", "Radeon RX 6800", "16GB", { wattage: 250 }),
  part("gpu", "AMD", "Radeon RX 6750 XT", "12GB", { wattage: 250 }),
  part("gpu", "AMD", "Radeon RX 6700 XT", "12GB", { wattage: 230 }),
  part("gpu", "AMD", "Radeon RX 6650 XT", "8GB", { wattage: 180 }),
  part("gpu", "AMD", "Radeon RX 6600 XT", "8GB", { wattage: 160 }),
  part("gpu", "AMD", "Radeon RX 6600", "8GB", { wattage: 132 }),

  /* AMD older */
  part("gpu", "AMD", "Radeon RX 5700 XT", "8GB", { wattage: 225 }),
  part("gpu", "AMD", "Radeon RX 5700", "8GB", { wattage: 180 }),
  part("gpu", "AMD", "Radeon RX Vega 64", "8GB HBM2", { wattage: 295 }),
  part("gpu", "AMD", "Radeon RX Vega 56", "8GB HBM2", { wattage: 210 }),
  part("gpu", "AMD", "Radeon RX 590", "8GB", { wattage: 225 }),
  part("gpu", "AMD", "Radeon RX 580", "8GB", { wattage: 185 }),

  /* Intel Arc */
  part("gpu", "Intel", "Arc B580", "12GB", { wattage: 190 }),
  part("gpu", "Intel", "Arc B570", "10GB", { wattage: 150 }),
  part("gpu", "Intel", "Arc A770 16GB", "Alchemist", { wattage: 225 }),
  part("gpu", "Intel", "Arc A750", "8GB", { wattage: 225 }),
  part("gpu", "Intel", "Arc A580", "8GB", { wattage: 185 }),
];

export const motherboardCatalog: PcPart[] = [
  /* AM5 */
  part(
    "motherboard",
    "ASUS",
    "ROG Crosshair X870E Hero",
    "AM5 · X870E · DDR5",
    { socket: "AM5", memory: "DDR5" },
  ),
  part("motherboard", "ASUS", "ROG Strix X870E-E Gaming WiFi", "AM5 · X870E", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASUS", "ROG Strix X870-F Gaming WiFi", "AM5 · X870", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASUS", "TUF Gaming X870-Plus WiFi", "AM5 · X870", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASUS", "ROG Strix B850-F Gaming WiFi", "AM5 · B850", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASUS", "ROG Strix B650E-E Gaming WiFi", "AM5 · B650E", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASUS", "TUF Gaming B650-Plus WiFi", "AM5 · B650", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "MSI", "MEG X870E GODLIKE", "AM5 · X870E", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "MSI", "MPG X870E Carbon WiFi", "AM5 · X870E", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "MSI", "MAG X870 Tomahawk WiFi", "AM5 · X870", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "MSI", "MPG B850 Edge Ti WiFi", "AM5 · B850", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "MSI", "MAG B650 Tomahawk WiFi", "AM5 · B650", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "Gigabyte", "X870E AORUS Master", "AM5 · X870E", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "Gigabyte", "X870 AORUS Elite WiFi7", "AM5 · X870", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "Gigabyte", "B850 AORUS Elite WiFi7", "AM5 · B850", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "Gigabyte", "B650 AORUS Elite AX", "AM5 · B650", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASRock", "X870E Taichi", "AM5 · X870E", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASRock", "X870 Steel Legend WiFi", "AM5 · X870", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASRock", "B850 Steel Legend WiFi", "AM5 · B850", {
    socket: "AM5",
    memory: "DDR5",
  }),
  part("motherboard", "ASRock", "B650E Taichi Lite", "AM5 · B650E", {
    socket: "AM5",
    memory: "DDR5",
  }),

  /* AM4 */
  part("motherboard", "ASUS", "ROG Crosshair VIII Dark Hero", "AM4 · X570", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("motherboard", "ASUS", "ROG Strix X570-E Gaming WiFi II", "AM4 · X570", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("motherboard", "ASUS", "TUF Gaming B550-Plus WiFi II", "AM4 · B550", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("motherboard", "MSI", "MEG X570S ACE MAX", "AM4 · X570", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("motherboard", "MSI", "MAG B550 Tomahawk", "AM4 · B550", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("motherboard", "Gigabyte", "X570S AORUS Master", "AM4 · X570", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("motherboard", "Gigabyte", "B550 AORUS Elite V2", "AM4 · B550", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("motherboard", "ASRock", "X570 Taichi", "AM4 · X570", {
    socket: "AM4",
    memory: "DDR4",
  }),
  part("motherboard", "ASRock", "B550 Steel Legend", "AM4 · B550", {
    socket: "AM4",
    memory: "DDR4",
  }),

  /* Intel LGA1851 */
  part("motherboard", "ASUS", "ROG Maximus Z890 Extreme", "LGA1851 · Z890", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part("motherboard", "ASUS", "ROG Maximus Z890 Hero", "LGA1851 · Z890", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part(
    "motherboard",
    "ASUS",
    "ROG Strix Z890-E Gaming WiFi",
    "LGA1851 · Z890",
    { socket: "LGA1851", memory: "DDR5" },
  ),
  part("motherboard", "MSI", "MEG Z890 GODLIKE", "LGA1851 · Z890", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part("motherboard", "MSI", "MPG Z890 Carbon WiFi", "LGA1851 · Z890", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part("motherboard", "Gigabyte", "Z890 AORUS Master", "LGA1851 · Z890", {
    socket: "LGA1851",
    memory: "DDR5",
  }),
  part("motherboard", "ASRock", "Z890 Taichi", "LGA1851 · Z890", {
    socket: "LGA1851",
    memory: "DDR5",
  }),

  /* Intel LGA1700 */
  part("motherboard", "ASUS", "ROG Maximus Z790 Dark Hero", "LGA1700 · Z790", {
    socket: "LGA1700",
    memory: "DDR5",
  }),
  part(
    "motherboard",
    "ASUS",
    "ROG Strix Z790-E Gaming WiFi II",
    "LGA1700 · Z790",
    { socket: "LGA1700", memory: "DDR5" },
  ),
  part("motherboard", "ASUS", "TUF Gaming Z790-Plus WiFi", "LGA1700 · Z790", {
    socket: "LGA1700",
    memory: "DDR5",
  }),
  part(
    "motherboard",
    "ASUS",
    "TUF Gaming B760-Plus WiFi D4",
    "LGA1700 · B760 · DDR4",
    { socket: "LGA1700", memory: "DDR4" },
  ),
  part("motherboard", "MSI", "MEG Z790 ACE MAX", "LGA1700 · Z790", {
    socket: "LGA1700",
    memory: "DDR5",
  }),
  part("motherboard", "MSI", "MPG Z790 Carbon WiFi II", "LGA1700 · Z790", {
    socket: "LGA1700",
    memory: "DDR5",
  }),
  part("motherboard", "MSI", "MAG B760 Tomahawk WiFi", "LGA1700 · B760", {
    socket: "LGA1700",
    memory: "DDR5",
  }),
  part("motherboard", "Gigabyte", "Z790 AORUS Master X", "LGA1700 · Z790", {
    socket: "LGA1700",
    memory: "DDR5",
  }),
  part("motherboard", "Gigabyte", "Z790 AORUS Elite AX", "LGA1700 · Z790", {
    socket: "LGA1700",
    memory: "DDR5",
  }),
  part("motherboard", "Gigabyte", "B760 Gaming X AX DDR4", "LGA1700 · B760", {
    socket: "LGA1700",
    memory: "DDR4",
  }),
  part("motherboard", "ASRock", "Z790 Taichi Lite", "LGA1700 · Z790", {
    socket: "LGA1700",
    memory: "DDR5",
  }),
  part("motherboard", "ASRock", "B760 Steel Legend WiFi", "LGA1700 · B760", {
    socket: "LGA1700",
    memory: "DDR5",
  }),

  /* Intel LGA1200 */
  part("motherboard", "ASUS", "ROG Maximus XIII Hero", "LGA1200 · Z590", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
  part(
    "motherboard",
    "ASUS",
    "ROG Strix Z590-E Gaming WiFi",
    "LGA1200 · Z590",
    { socket: "LGA1200", memory: "DDR4" },
  ),
  part("motherboard", "MSI", "MEG Z590 ACE", "LGA1200 · Z590", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
  part("motherboard", "Gigabyte", "Z590 AORUS Master", "LGA1200 · Z590", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
  part("motherboard", "ASRock", "Z590 Taichi", "LGA1200 · Z590", {
    socket: "LGA1200",
    memory: "DDR4",
  }),
];

export const ramCatalog: PcPart[] = [
  part("ram", "Corsair", "Dominator Titanium RGB 64GB DDR5-6600", "2 × 32GB", {
    memory: "DDR5",
  }),
  part("ram", "Corsair", "Dominator Titanium RGB 32GB DDR5-6400", "2 × 16GB", {
    memory: "DDR5",
  }),
  part("ram", "Corsair", "Vengeance RGB 64GB DDR5-6000", "2 × 32GB", {
    memory: "DDR5",
  }),
  part("ram", "Corsair", "Vengeance RGB 32GB DDR5-6000", "2 × 16GB", {
    memory: "DDR5",
  }),
  part("ram", "G.Skill", "Trident Z5 Royal 64GB DDR5-6400", "2 × 32GB", {
    memory: "DDR5",
  }),
  part("ram", "G.Skill", "Trident Z5 RGB 48GB DDR5-7200", "2 × 24GB", {
    memory: "DDR5",
  }),
  part("ram", "G.Skill", "Trident Z5 Neo RGB 32GB DDR5-6000 CL30", "2 × 16GB", {
    memory: "DDR5",
  }),
  part("ram", "Kingston", "FURY Renegade RGB 64GB DDR5-6400", "2 × 32GB", {
    memory: "DDR5",
  }),
  part("ram", "Kingston", "FURY Beast RGB 32GB DDR5-6000", "2 × 16GB", {
    memory: "DDR5",
  }),
  part("ram", "TeamGroup", "T-Force Delta RGB 32GB DDR5-7200", "2 × 16GB", {
    memory: "DDR5",
  }),
  part("ram", "Crucial", "Pro Overclocking 32GB DDR5-6000", "2 × 16GB", {
    memory: "DDR5",
  }),
  part("ram", "ADATA", "XPG Lancer RGB 32GB DDR5-6000", "2 × 16GB", {
    memory: "DDR5",
  }),
  part("ram", "Patriot", "Viper Venom RGB 32GB DDR5-6400", "2 × 16GB", {
    memory: "DDR5",
  }),

  part("ram", "Corsair", "Dominator Platinum RGB 32GB DDR4-3600", "2 × 16GB", {
    memory: "DDR4",
  }),
  part("ram", "Corsair", "Vengeance RGB Pro SL 32GB DDR4-3600", "2 × 16GB", {
    memory: "DDR4",
  }),
  part("ram", "Corsair", "Vengeance LPX 32GB DDR4-3200", "2 × 16GB", {
    memory: "DDR4",
  }),
  part("ram", "G.Skill", "Trident Z Royal 32GB DDR4-3600", "2 × 16GB", {
    memory: "DDR4",
  }),
  part("ram", "G.Skill", "Trident Z Neo 32GB DDR4-3600", "2 × 16GB", {
    memory: "DDR4",
  }),
  part("ram", "G.Skill", "Ripjaws V 32GB DDR4-3600", "2 × 16GB", {
    memory: "DDR4",
  }),
  part("ram", "Kingston", "FURY Renegade RGB 32GB DDR4-3600", "2 × 16GB", {
    memory: "DDR4",
  }),
  part("ram", "Kingston", "FURY Beast 32GB DDR4-3200", "2 × 16GB", {
    memory: "DDR4",
  }),
  part("ram", "TeamGroup", "T-Force Xtreem ARGB 32GB DDR4-3600", "2 × 16GB", {
    memory: "DDR4",
  }),
];

export const storageCatalog: PcPart[] = [
  part("storage", "Samsung", "9100 PRO 4TB", "PCIe 5.0 NVMe"),
  part("storage", "Samsung", "9100 PRO 2TB", "PCIe 5.0 NVMe"),
  part("storage", "Samsung", "990 PRO 4TB", "PCIe 4.0 NVMe"),
  part("storage", "Samsung", "990 PRO 2TB", "PCIe 4.0 NVMe"),
  part("storage", "Samsung", "990 EVO Plus 2TB", "PCIe NVMe"),
  part("storage", "Samsung", "980 PRO 2TB", "PCIe 4.0 NVMe"),
  part("storage", "Samsung", "870 EVO 4TB", "SATA SSD"),
  part("storage", "WD_BLACK", "SN8100 4TB", "PCIe 5.0 NVMe"),
  part("storage", "WD_BLACK", "SN850X 4TB", "PCIe 4.0 NVMe"),
  part("storage", "WD_BLACK", "SN850X 2TB", "PCIe 4.0 NVMe"),
  part("storage", "WD_BLACK", "SN770 2TB", "PCIe 4.0 NVMe"),
  part("storage", "Crucial", "T705 4TB", "PCIe 5.0 NVMe"),
  part("storage", "Crucial", "T705 2TB", "PCIe 5.0 NVMe"),
  part("storage", "Crucial", "T700 2TB", "PCIe 5.0 NVMe"),
  part("storage", "Crucial", "P5 Plus 2TB", "PCIe 4.0 NVMe"),
  part("storage", "Kingston", "FURY Renegade G5 4TB", "PCIe 5.0 NVMe"),
  part("storage", "Kingston", "KC3000 2TB", "PCIe 4.0 NVMe"),
  part("storage", "Seagate", "FireCuda 540 2TB", "PCIe 5.0 NVMe"),
  part("storage", "Seagate", "FireCuda 530R 4TB", "PCIe 4.0 NVMe"),
  part("storage", "Corsair", "MP700 PRO 4TB", "PCIe 5.0 NVMe"),
  part("storage", "Corsair", "MP600 PRO XT 4TB", "PCIe 4.0 NVMe"),
  part("storage", "Sabrent", "Rocket 5 4TB", "PCIe 5.0 NVMe"),
  part("storage", "Sabrent", "Rocket 4 Plus 4TB", "PCIe 4.0 NVMe"),
  part("storage", "SK hynix", "Platinum P41 2TB", "PCIe 4.0 NVMe"),
  part("storage", "Solidigm", "P44 Pro 2TB", "PCIe 4.0 NVMe"),
];

export const coolingCatalog: PcPart[] = [
  part("cooling", "NZXT", "Kraken Elite 360 RGB", "360mm AIO"),
  part("cooling", "NZXT", "Kraken 360 RGB", "360mm AIO"),
  part("cooling", "Corsair", "iCUE LINK TITAN 360 RX RGB", "360mm AIO"),
  part("cooling", "Corsair", "iCUE H150i Elite LCD XT", "360mm AIO"),
  part("cooling", "Corsair", "Nautilus 360 RS ARGB", "360mm AIO"),
  part("cooling", "ASUS", "ROG Ryujin III 360 ARGB Extreme", "360mm AIO"),
  part("cooling", "ASUS", "ROG Strix LC III 360 ARGB", "360mm AIO"),
  part("cooling", "Arctic", "Liquid Freezer III Pro 360", "360mm AIO"),
  part("cooling", "Arctic", "Liquid Freezer III 360 A-RGB", "360mm AIO"),
  part("cooling", "Lian Li", "Galahad II LCD 360", "360mm AIO"),
  part("cooling", "Lian Li", "HydroShift LCD 360TL", "360mm AIO"),
  part("cooling", "Cooler Master", "MasterLiquid 360 Atmos", "360mm AIO"),
  part("cooling", "MSI", "MAG CoreLiquid E360", "360mm AIO"),
  part("cooling", "DeepCool", "Mystique 360", "360mm AIO"),
  part("cooling", "be quiet!", "Light Loop 360mm", "360mm AIO"),
  part("cooling", "Thermaltake", "TH360 V2 Ultra ARGB", "360mm AIO"),
  part("cooling", "Noctua", "NH-D15 G2", "Dual tower air cooler"),
  part("cooling", "Noctua", "NH-D15", "Dual tower air cooler"),
  part("cooling", "be quiet!", "Dark Rock Elite", "Dual tower air cooler"),
  part("cooling", "DeepCool", "Assassin IV", "Dual tower air cooler"),
  part(
    "cooling",
    "Thermalright",
    "Phantom Spirit 120 EVO",
    "Dual tower air cooler",
  ),
  part("cooling", "Cooler Master", "Hyper 212 Halo", "Tower air cooler"),
];

export const psuCatalog: PcPart[] = [
  part("psu", "Corsair", "AX1600i", "1600W · 80+ Titanium", { wattage: 1600 }),
  part("psu", "Corsair", "HX1500i", "1500W · 80+ Platinum", { wattage: 1500 }),
  part("psu", "Corsair", "HX1200i", "1200W · 80+ Platinum", { wattage: 1200 }),
  part("psu", "Corsair", "RM1200x SHIFT", "1200W · ATX 3.x", { wattage: 1200 }),
  part("psu", "Corsair", "RM1000x SHIFT", "1000W · ATX 3.x", { wattage: 1000 }),
  part("psu", "Corsair", "RM850x", "850W · 80+ Gold", { wattage: 850 }),
  part("psu", "Seasonic", "PRIME TX-1600", "1600W · Titanium", {
    wattage: 1600,
  }),
  part("psu", "Seasonic", "PRIME TX-1300", "1300W · Titanium", {
    wattage: 1300,
  }),
  part("psu", "Seasonic", "VERTEX GX-1200", "1200W · Gold", { wattage: 1200 }),
  part("psu", "Seasonic", "FOCUS GX-1000", "1000W · Gold", { wattage: 1000 }),
  part("psu", "be quiet!", "Dark Power Pro 13 1600W", "80+ Titanium", {
    wattage: 1600,
  }),
  part("psu", "be quiet!", "Dark Power 13 1000W", "80+ Titanium", {
    wattage: 1000,
  }),
  part("psu", "be quiet!", "Straight Power 12 1000W", "80+ Platinum", {
    wattage: 1000,
  }),
  part("psu", "ASUS", "ROG Thor 1600W Titanium III", "1600W", {
    wattage: 1600,
  }),
  part("psu", "ASUS", "ROG Thor 1200P2 Gaming", "1200W", { wattage: 1200 }),
  part("psu", "ASUS", "ROG Strix 1000W Gold Aura", "1000W", { wattage: 1000 }),
  part("psu", "MSI", "MEG Ai1600T PCIE5", "1600W · Titanium", {
    wattage: 1600,
  }),
  part("psu", "MSI", "MEG Ai1300P PCIE5", "1300W · Platinum", {
    wattage: 1300,
  }),
  part("psu", "MSI", "MPG A1000G PCIE5", "1000W · Gold", { wattage: 1000 }),
  part("psu", "Thermaltake", "Toughpower TF3 1550W", "1550W · Titanium", {
    wattage: 1550,
  }),
  part("psu", "Thermaltake", "Toughpower GF A3 1200W", "1200W · Gold", {
    wattage: 1200,
  }),
  part("psu", "Cooler Master", "V Platinum V2 1300W", "1300W · Platinum", {
    wattage: 1300,
  }),
  part("psu", "Super Flower", "Leadex VII XG 1300W", "1300W · Gold", {
    wattage: 1300,
  }),
];

export const caseCatalog: PcPart[] = [
  part("case", "Lian Li", "O11 Dynamic EVO RGB", "Dual chamber"),
  part("case", "Lian Li", "O11 Vision Compact", "Tempered glass"),
  part("case", "Lian Li", "O11D EVO XL", "Full tower"),
  part("case", "Lian Li", "Lancool III RGB", "High airflow"),
  part("case", "Lian Li", "Lancool 207", "Airflow"),
  part("case", "NZXT", "H9 Elite", "Dual chamber"),
  part("case", "NZXT", "H9 Flow", "Dual chamber airflow"),
  part("case", "NZXT", "H7 Flow", "Mid tower"),
  part("case", "NZXT", "H6 Flow RGB", "Compact dual chamber"),
  part("case", "Corsair", "9000D RGB Airflow", "Super tower"),
  part("case", "Corsair", "7000D Airflow", "Full tower"),
  part("case", "Corsair", "6500X RGB", "Dual chamber"),
  part("case", "Corsair", "5000D Airflow", "Mid tower"),
  part("case", "Corsair", "4000D Airflow", "Mid tower"),
  part("case", "HYTE", "Y70 Touch Infinite", "Panoramic"),
  part("case", "HYTE", "Y70", "Panoramic"),
  part("case", "HYTE", "Y60", "Panoramic"),
  part("case", "Fractal Design", "North XL", "Wood accent full tower"),
  part("case", "Fractal Design", "North", "Wood accent mid tower"),
  part("case", "Fractal Design", "Torrent", "High airflow"),
  part("case", "Fractal Design", "Meshify 2", "Airflow"),
  part("case", "Fractal Design", "Define 7", "Silent full tower"),
  part("case", "Phanteks", "NV9", "Full tower"),
  part("case", "Phanteks", "NV7", "Panoramic"),
  part("case", "Phanteks", "Eclipse G500A", "Airflow"),
  part("case", "Cooler Master", "HAF 700 EVO", "Full tower"),
  part("case", "Cooler Master", "TD500 Mesh V2", "Airflow"),
  part("case", "ASUS", "ROG Hyperion GR701", "Full tower"),
  part("case", "ASUS", "TUF Gaming GT502", "Dual chamber"),
  part("case", "be quiet!", "Dark Base Pro 901", "Full tower"),
  part("case", "be quiet!", "Shadow Base 800 FX", "Airflow"),
  part("case", "Thermaltake", "The Tower 600", "Vertical showcase"),
  part("case", "Thermaltake", "View 380 TG ARGB", "Panoramic"),
  part("case", "Antec", "C8", "Dual chamber"),
  part("case", "Montech", "King 95 Pro", "Panoramic"),
];

export const fanCatalog: PcPart[] = [
  part("fans", "Lian Li", "UNI FAN SL Wireless LCD 120 Triple Pack", "120mm"),
  part("fans", "Lian Li", "UNI FAN TL LCD 120 Triple Pack", "120mm"),
  part("fans", "Lian Li", "UNI FAN SL-INF 120 Triple Pack", "120mm"),
  part("fans", "Corsair", "iCUE LINK QX120 RGB Triple Pack", "120mm"),
  part("fans", "Corsair", "LX120 RGB Triple Pack", "120mm"),
  part("fans", "Corsair", "RX120 RGB Triple Pack", "120mm"),
  part("fans", "NZXT", "F120 RGB Core Triple Pack", "120mm"),
  part("fans", "Phanteks", "D30-120 DRGB Triple Pack", "120mm"),
  part("fans", "be quiet!", "Light Wings LX 120 Triple Pack", "120mm"),
  part("fans", "Noctua", "NF-A12x25 G2", "120mm"),
  part("fans", "Arctic", "P12 PWM PST A-RGB 0dB", "120mm"),
];

export const pcCatalog: Record<PcPartKind, PcPart[]> = {
  cpu: cpuCatalog,
  gpu: gpuCatalog,
  motherboard: motherboardCatalog,
  ram: ramCatalog,
  storage: storageCatalog,
  cooling: coolingCatalog,
  psu: psuCatalog,
  case: caseCatalog,
  fans: fanCatalog,
};

export const partLabels: Record<PcPartKind, string> = {
  cpu: "Processor",
  gpu: "Graphics card",
  motherboard: "Motherboard",
  ram: "Memory",
  storage: "Storage",
  cooling: "CPU cooling",
  psu: "Power supply",
  case: "PC case",
  fans: "Case fans",
};
