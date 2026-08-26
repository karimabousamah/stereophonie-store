import type {
  PcPart,
  PcPartKind,
} from "@/lib/gaming-desktop/catalog";

/*
 * ============================================================
 * STEREOPHONIE MEGA GAMING-PC CATALOG
 * ============================================================
 *
 * Supplemental catalogue spanning current hardware and
 * important previous generations.
 *
 * Compatibility metadata is only added where we have a useful,
 * reliable platform characteristic such as socket / DDR type /
 * wattage. Missing metadata does NOT make a product
 * incompatible.
 */

type Extra =
  Record<string, unknown>;

function item(
  kind: PcPartKind,
  brand: string,
  model: string,
  detail: string,
  extra: Extra = {},
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

    ...extra,
  } as PcPart;
}

/* ============================================================
   PROCESSORS
============================================================ */

const cpu: PcPart[] = [
  /* AMD Ryzen 9000 */
  item("cpu","AMD","Ryzen 9 9950X3D","16 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:170}),
  item("cpu","AMD","Ryzen 9 9950X","16 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:170}),
  item("cpu","AMD","Ryzen 9 9900X3D","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}),
  item("cpu","AMD","Ryzen 9 9900X","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}),
  item("cpu","AMD","Ryzen 7 9850X3D","AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}),
  item("cpu","AMD","Ryzen 7 9800X3D","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}),
  item("cpu","AMD","Ryzen 7 9700X","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),
  item("cpu","AMD","Ryzen 5 9600X","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),

  /* AMD Ryzen 8000G */
  item("cpu","AMD","Ryzen 7 8700G","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),
  item("cpu","AMD","Ryzen 5 8600G","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),
  item("cpu","AMD","Ryzen 5 8500G","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),

  /* AMD Ryzen 7000 */
  item("cpu","AMD","Ryzen 9 7950X3D","16 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}),
  item("cpu","AMD","Ryzen 9 7950X","16 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:170}),
  item("cpu","AMD","Ryzen 9 7900X3D","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}),
  item("cpu","AMD","Ryzen 9 7900X","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:170}),
  item("cpu","AMD","Ryzen 9 7900","12 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),
  item("cpu","AMD","Ryzen 7 7800X3D","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:120}),
  item("cpu","AMD","Ryzen 7 7700X","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:105}),
  item("cpu","AMD","Ryzen 7 7700","8 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),
  item("cpu","AMD","Ryzen 5 7600X","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:105}),
  item("cpu","AMD","Ryzen 5 7600","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),
  item("cpu","AMD","Ryzen 5 7500F","6 cores · AM5 · DDR5",{socket:"AM5",memory:"DDR5",tdp:65}),

  /* AMD Ryzen 5000 */
  item("cpu","AMD","Ryzen 9 5950X","16 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 9 5900XT","16 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 9 5900X","12 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 7 5800X3D","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 7 5800X","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 7 5700X3D","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 7 5700X","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}),
  item("cpu","AMD","Ryzen 7 5700G","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}),
  item("cpu","AMD","Ryzen 5 5600X3D","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 5 5600X","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}),
  item("cpu","AMD","Ryzen 5 5600","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}),
  item("cpu","AMD","Ryzen 5 5600G","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}),
  item("cpu","AMD","Ryzen 5 5500","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}),

  /* Ryzen 3000 */
  item("cpu","AMD","Ryzen 9 3950X","16 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 9 3900XT","12 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 9 3900X","12 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 7 3800XT","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 7 3800X","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:105}),
  item("cpu","AMD","Ryzen 7 3700X","8 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}),
  item("cpu","AMD","Ryzen 5 3600XT","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:95}),
  item("cpu","AMD","Ryzen 5 3600X","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:95}),
  item("cpu","AMD","Ryzen 5 3600","6 cores · AM4 · DDR4",{socket:"AM4",memory:"DDR4",tdp:65}),

  /* Intel Core Ultra desktop */
  item("cpu","Intel","Core Ultra 9 285K","24 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}),
  item("cpu","Intel","Core Ultra 7 270K Plus","LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}),
  item("cpu","Intel","Core Ultra 7 265K","20 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}),
  item("cpu","Intel","Core Ultra 7 265KF","20 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}),
  item("cpu","Intel","Core Ultra 5 250K Plus","LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}),
  item("cpu","Intel","Core Ultra 5 250KF Plus","LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}),
  item("cpu","Intel","Core Ultra 5 245K","14 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}),
  item("cpu","Intel","Core Ultra 5 245KF","14 cores · LGA1851 · DDR5",{socket:"LGA1851",memory:"DDR5",tdp:125}),

  /* Intel 14th Gen */
  item("cpu","Intel","Core i9-14900KS","LGA1700 · DDR4 / DDR5",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:150}),
  item("cpu","Intel","Core i9-14900K","LGA1700 · DDR4 / DDR5",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i9-14900KF","LGA1700 · DDR4 / DDR5",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i9-14900","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:65}),
  item("cpu","Intel","Core i7-14700K","LGA1700 · DDR4 / DDR5",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i7-14700KF","LGA1700 · DDR4 / DDR5",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i7-14700","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:65}),
  item("cpu","Intel","Core i5-14600K","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i5-14600KF","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i5-14500","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:65}),
  item("cpu","Intel","Core i5-14400F","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:65}),

  /* Intel 13th Gen */
  item("cpu","Intel","Core i9-13900KS","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:150}),
  item("cpu","Intel","Core i9-13900K","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i9-13900KF","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i7-13700K","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i7-13700KF","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i5-13600K","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i5-13600KF","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i5-13400F","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:65}),

  /* Intel 12th Gen */
  item("cpu","Intel","Core i9-12900KS","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:150}),
  item("cpu","Intel","Core i9-12900K","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i9-12900KF","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i7-12700K","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i7-12700KF","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i5-12600K","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:125}),
  item("cpu","Intel","Core i5-12400F","LGA1700",{socket:"LGA1700",memory:"DDR4 / DDR5",tdp:65}),

  /* Intel 11th Gen */
  item("cpu","Intel","Core i9-11900K","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i9-11900KF","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i7-11700K","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i7-11700KF","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i5-11600K","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i5-11400F","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:65}),

  /* Intel 10th Gen */
  item("cpu","Intel","Core i9-10900K","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i9-10850K","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i7-10700K","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i7-10700","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:65}),
  item("cpu","Intel","Core i5-10600K","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:125}),
  item("cpu","Intel","Core i5-10400F","LGA1200 · DDR4",{socket:"LGA1200",memory:"DDR4",tdp:65}),
];

/* ============================================================
   GRAPHICS CARDS
============================================================ */

const gpu: PcPart[] = [
  /* NVIDIA 50 */
  item("gpu","NVIDIA","GeForce RTX 5090","32GB · Blackwell",{minPsuWattage:1000}),
  item("gpu","NVIDIA","GeForce RTX 5080","16GB · Blackwell",{minPsuWattage:850}),
  item("gpu","NVIDIA","GeForce RTX 5070 Ti","16GB · Blackwell",{minPsuWattage:750}),
  item("gpu","NVIDIA","GeForce RTX 5070","12GB · Blackwell",{minPsuWattage:650}),
  item("gpu","NVIDIA","GeForce RTX 5060 Ti 16GB","Blackwell",{minPsuWattage:600}),
  item("gpu","NVIDIA","GeForce RTX 5060 Ti 8GB","Blackwell",{minPsuWattage:600}),
  item("gpu","NVIDIA","GeForce RTX 5060","Blackwell",{minPsuWattage:550}),
  item("gpu","NVIDIA","GeForce RTX 5050","Blackwell",{minPsuWattage:550}),

  /* NVIDIA 40 */
  item("gpu","NVIDIA","GeForce RTX 4090","24GB",{minPsuWattage:850}),
  item("gpu","NVIDIA","GeForce RTX 4080 SUPER","16GB",{minPsuWattage:750}),
  item("gpu","NVIDIA","GeForce RTX 4080","16GB",{minPsuWattage:750}),
  item("gpu","NVIDIA","GeForce RTX 4070 Ti SUPER","16GB",{minPsuWattage:700}),
  item("gpu","NVIDIA","GeForce RTX 4070 Ti","12GB",{minPsuWattage:700}),
  item("gpu","NVIDIA","GeForce RTX 4070 SUPER","12GB",{minPsuWattage:650}),
  item("gpu","NVIDIA","GeForce RTX 4070","12GB",{minPsuWattage:650}),
  item("gpu","NVIDIA","GeForce RTX 4060 Ti 16GB","Ada Lovelace",{minPsuWattage:550}),
  item("gpu","NVIDIA","GeForce RTX 4060 Ti 8GB","Ada Lovelace",{minPsuWattage:550}),
  item("gpu","NVIDIA","GeForce RTX 4060","8GB",{minPsuWattage:550}),

  /* NVIDIA 30 */
  item("gpu","NVIDIA","GeForce RTX 3090 Ti","24GB",{minPsuWattage:850}),
  item("gpu","NVIDIA","GeForce RTX 3090","24GB",{minPsuWattage:750}),
  item("gpu","NVIDIA","GeForce RTX 3080 Ti","12GB",{minPsuWattage:750}),
  item("gpu","NVIDIA","GeForce RTX 3080 12GB","Ampere",{minPsuWattage:750}),
  item("gpu","NVIDIA","GeForce RTX 3080 10GB","Ampere",{minPsuWattage:750}),
  item("gpu","NVIDIA","GeForce RTX 3070 Ti","8GB",{minPsuWattage:650}),
  item("gpu","NVIDIA","GeForce RTX 3070","8GB",{minPsuWattage:650}),
  item("gpu","NVIDIA","GeForce RTX 3060 Ti","8GB",{minPsuWattage:600}),
  item("gpu","NVIDIA","GeForce RTX 3060 12GB","Ampere",{minPsuWattage:550}),
  item("gpu","NVIDIA","GeForce RTX 3060 8GB","Ampere",{minPsuWattage:550}),
  item("gpu","NVIDIA","GeForce RTX 3050 8GB","Ampere",{minPsuWattage:500}),
  item("gpu","NVIDIA","GeForce RTX 3050 6GB","Ampere",{minPsuWattage:450}),

  /* NVIDIA 20 */
  item("gpu","NVIDIA","GeForce RTX 2080 Ti","11GB",{minPsuWattage:650}),
  item("gpu","NVIDIA","GeForce RTX 2080 SUPER","8GB",{minPsuWattage:650}),
  item("gpu","NVIDIA","GeForce RTX 2080","8GB",{minPsuWattage:650}),
  item("gpu","NVIDIA","GeForce RTX 2070 SUPER","8GB",{minPsuWattage:600}),
  item("gpu","NVIDIA","GeForce RTX 2070","8GB",{minPsuWattage:550}),
  item("gpu","NVIDIA","GeForce RTX 2060 SUPER","8GB",{minPsuWattage:550}),
  item("gpu","NVIDIA","GeForce RTX 2060","6GB",{minPsuWattage:500}),

  /* GTX */
  item("gpu","NVIDIA","GeForce GTX 1660 Ti","6GB",{minPsuWattage:450}),
  item("gpu","NVIDIA","GeForce GTX 1660 SUPER","6GB",{minPsuWattage:450}),
  item("gpu","NVIDIA","GeForce GTX 1660","6GB",{minPsuWattage:450}),
  item("gpu","NVIDIA","GeForce GTX 1650 SUPER","4GB",{minPsuWattage:400}),
  item("gpu","NVIDIA","GeForce GTX 1650","4GB",{minPsuWattage:350}),

  /* AMD RX 9000 */
  item("gpu","AMD","Radeon RX 9070 XT","RDNA 4",{minPsuWattage:750}),
  item("gpu","AMD","Radeon RX 9070","RDNA 4",{minPsuWattage:650}),
  item("gpu","AMD","Radeon RX 9060 XT 16GB","RDNA 4",{minPsuWattage:550}),
  item("gpu","AMD","Radeon RX 9060 XT 8GB","RDNA 4",{minPsuWattage:550}),

  /* AMD RX 7000 */
  item("gpu","AMD","Radeon RX 7900 XTX","24GB",{minPsuWattage:800}),
  item("gpu","AMD","Radeon RX 7900 XT","20GB",{minPsuWattage:750}),
  item("gpu","AMD","Radeon RX 7900 GRE","16GB",{minPsuWattage:700}),
  item("gpu","AMD","Radeon RX 7800 XT","16GB",{minPsuWattage:700}),
  item("gpu","AMD","Radeon RX 7700 XT","12GB",{minPsuWattage:700}),
  item("gpu","AMD","Radeon RX 7600 XT","16GB",{minPsuWattage:600}),
  item("gpu","AMD","Radeon RX 7600","8GB",{minPsuWattage:550}),

  /* AMD RX 6000 */
  item("gpu","AMD","Radeon RX 6950 XT","16GB",{minPsuWattage:850}),
  item("gpu","AMD","Radeon RX 6900 XT","16GB",{minPsuWattage:850}),
  item("gpu","AMD","Radeon RX 6800 XT","16GB",{minPsuWattage:750}),
  item("gpu","AMD","Radeon RX 6800","16GB",{minPsuWattage:650}),
  item("gpu","AMD","Radeon RX 6750 XT","12GB",{minPsuWattage:650}),
  item("gpu","AMD","Radeon RX 6700 XT","12GB",{minPsuWattage:650}),
  item("gpu","AMD","Radeon RX 6650 XT","8GB",{minPsuWattage:550}),
  item("gpu","AMD","Radeon RX 6600 XT","8GB",{minPsuWattage:550}),
  item("gpu","AMD","Radeon RX 6600","8GB",{minPsuWattage:500}),
  item("gpu","AMD","Radeon RX 6500 XT","4GB",{minPsuWattage:400}),

  /* AMD RX 5000 */
  item("gpu","AMD","Radeon RX 5700 XT","8GB",{minPsuWattage:600}),
  item("gpu","AMD","Radeon RX 5700","8GB",{minPsuWattage:550}),
  item("gpu","AMD","Radeon RX 5600 XT","6GB",{minPsuWattage:500}),
  item("gpu","AMD","Radeon RX 5500 XT 8GB","RDNA",{minPsuWattage:450}),

  /* Intel */
  item("gpu","Intel","Arc B580","12GB · Battlemage",{minPsuWattage:600}),
  item("gpu","Intel","Arc B570","10GB · Battlemage",{minPsuWattage:600}),
  item("gpu","Intel","Arc A770 16GB","Alchemist",{minPsuWattage:650}),
  item("gpu","Intel","Arc A770 8GB","Alchemist",{minPsuWattage:650}),
  item("gpu","Intel","Arc A750","8GB",{minPsuWattage:600}),
  item("gpu","Intel","Arc A580","8GB",{minPsuWattage:550}),
];

/* ============================================================
   MOTHERBOARDS
============================================================ */

const motherboard: PcPart[] = [
  /* AM5 X870/X870E */
  item("motherboard","ASUS","ROG Crosshair X870E Hero","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","ASUS","ROG Strix X870E-E Gaming WiFi","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","ASUS","ROG Strix X870-A Gaming WiFi","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","ASUS","TUF Gaming X870-Plus WiFi","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","MSI","MEG X870E GODLIKE","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","MSI","MPG X870E Carbon WiFi","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","MSI","MAG X870 Tomahawk WiFi","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","Gigabyte","X870E AORUS Master","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","Gigabyte","X870 AORUS Elite WiFi7","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","ASRock","X870E Taichi","AM5 · X870E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","ASRock","X870 Steel Legend WiFi","AM5 · X870 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),

  /* AM5 X670 / B650 */
  item("motherboard","ASUS","ROG Crosshair X670E Extreme","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","ROG Crosshair X670E Hero","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","ROG Strix X670E-E Gaming WiFi","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","ROG Strix B650E-E Gaming WiFi","AM5 · B650E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","ROG Strix B650-A Gaming WiFi","AM5 · B650 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","TUF Gaming B650-Plus WiFi","AM5 · B650 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","MSI","MEG X670E GODLIKE","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","MSI","MEG X670E ACE","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","MSI","MPG X670E Carbon WiFi","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","MSI","MAG B650 Tomahawk WiFi","AM5 · B650 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","Gigabyte","X670E AORUS Xtreme","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","Gigabyte","X670E AORUS Master","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","Gigabyte","B650 AORUS Master","AM5 · B650 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","Gigabyte","B650 AORUS Elite AX","AM5 · B650 · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASRock","X670E Taichi","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","ASRock","X670E Steel Legend","AM5 · X670E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASRock","B650E Taichi","AM5 · B650E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","ASRock","B650E Steel Legend WiFi","AM5 · B650E · DDR5",{socket:"AM5",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),

  /* AM4 */
  item("motherboard","ASUS","ROG Crosshair VIII Extreme","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"E-ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","ROG Crosshair VIII Dark Hero","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","ROG Crosshair VIII Hero WiFi","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","ROG Strix X570-E Gaming WiFi II","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","ROG Strix B550-F Gaming WiFi II","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","TUF Gaming B550-Plus WiFi II","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","MSI","MEG X570 GODLIKE","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"E-ATX",maxMemoryGb:128}),
  item("motherboard","MSI","MEG X570S ACE MAX","AM4 · X570S · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","MSI","MAG X570S Tomahawk MAX WiFi","AM4 · X570S · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","MSI","MAG B550 Tomahawk MAX WiFi","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","Gigabyte","X570S AORUS Master","AM4 · X570S · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","Gigabyte","X570 AORUS Xtreme","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"E-ATX",maxMemoryGb:128}),
  item("motherboard","Gigabyte","B550 AORUS Master","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASRock","X570 Taichi","AM4 · X570 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASRock","B550 Taichi","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASRock","B550 Steel Legend","AM4 · B550 · DDR4",{socket:"AM4",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),

  /* Intel LGA1851 */
  item("motherboard","ASUS","ROG Maximus Z890 Extreme","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","ASUS","ROG Maximus Z890 Hero","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","ASUS","ROG Strix Z890-E Gaming WiFi","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","ASUS","ROG Strix Z890-A Gaming WiFi","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","MSI","MEG Z890 GODLIKE","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","MSI","MEG Z890 ACE","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","MSI","MPG Z890 Carbon WiFi","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"ATX",maxMemoryGb:256}),
  item("motherboard","Gigabyte","Z890 AORUS Xtreme AI TOP","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","Gigabyte","Z890 AORUS Master","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","ASRock","Z890 Taichi Aqua","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),
  item("motherboard","ASRock","Z890 Taichi","LGA1851 · Z890 · DDR5",{socket:"LGA1851",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:256}),

  /* Intel LGA1700 DDR5 */
  item("motherboard","ASUS","ROG Maximus Z790 Apex Encore","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","ROG Maximus Z790 Dark Hero","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","ROG Maximus Z790 Hero","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","ROG Strix Z790-E Gaming WiFi II","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","ROG Strix Z790-F Gaming WiFi II","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASUS","TUF Gaming Z790-Pro WiFi","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","MSI","MEG Z790 GODLIKE MAX","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","MSI","MEG Z790 ACE MAX","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","MSI","MPG Z790 Carbon WiFi II","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","MSI","MAG Z790 Tomahawk MAX WiFi","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","Gigabyte","Z790 AORUS Xtreme X","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","Gigabyte","Z790 AORUS Master X","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","Gigabyte","Z790 AORUS Elite X WiFi7","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),
  item("motherboard","ASRock","Z790 Taichi Carrara","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","ASRock","Z790 Taichi Lite","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"E-ATX",maxMemoryGb:192}),
  item("motherboard","ASRock","Z790 Steel Legend WiFi","LGA1700 · Z790 · DDR5",{socket:"LGA1700",memory:"DDR5",formFactor:"ATX",maxMemoryGb:192}),

  /* Intel LGA1700 DDR4 */
  item("motherboard","ASUS","ROG Strix Z690-A Gaming WiFi D4","LGA1700 · Z690 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","TUF Gaming Z790-Plus WiFi D4","LGA1700 · Z790 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","MSI","MAG Z790 Tomahawk WiFi DDR4","LGA1700 · Z790 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","MSI","PRO Z690-A DDR4","LGA1700 · Z690 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","Gigabyte","Z690 AORUS Elite AX DDR4","LGA1700 · Z690 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","Gigabyte","Z690 Gaming X DDR4","LGA1700 · Z690 · DDR4",{socket:"LGA1700",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),

  /* Intel LGA1200 */
  item("motherboard","ASUS","ROG Maximus XIII Extreme","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"E-ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","ROG Maximus XIII Hero","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","ROG Strix Z590-E Gaming WiFi","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","MSI","MEG Z590 GODLIKE","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"E-ATX",maxMemoryGb:128}),
  item("motherboard","MSI","MEG Z590 ACE","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","Gigabyte","Z590 AORUS Xtreme","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"E-ATX",maxMemoryGb:128}),
  item("motherboard","Gigabyte","Z590 AORUS Master","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASRock","Z590 OC Formula","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASRock","Z590 Taichi","LGA1200 · Z590 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","ASUS","ROG Maximus XII Hero WiFi","LGA1200 · Z490 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","MSI","MEG Z490 ACE","LGA1200 · Z490 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
  item("motherboard","Gigabyte","Z490 AORUS Master","LGA1200 · Z490 · DDR4",{socket:"LGA1200",memory:"DDR4",formFactor:"ATX",maxMemoryGb:128}),
];

/* ============================================================
   MEMORY
============================================================ */

const ram: PcPart[] = [
  item("ram","Corsair","Dominator Titanium RGB 96GB DDR5-6600","2 × 48GB · DDR5",{memory:"DDR5",capacityGb:96}),
  item("ram","Corsair","Dominator Titanium RGB 64GB DDR5-6600","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Corsair","Dominator Titanium RGB 32GB DDR5-7200","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),
  item("ram","Corsair","Dominator Platinum RGB 64GB DDR5-6000","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Corsair","Dominator Platinum RGB 32GB DDR5-6200","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),
  item("ram","Corsair","Vengeance RGB 96GB DDR5-6000","2 × 48GB · DDR5",{memory:"DDR5",capacityGb:96}),
  item("ram","Corsair","Vengeance RGB 64GB DDR5-6000","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Corsair","Vengeance RGB 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),
  item("ram","Corsair","Vengeance 64GB DDR5-5600","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Corsair","Vengeance 32GB DDR5-5600","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),

  item("ram","G.Skill","Trident Z5 Royal 96GB DDR5-6400","2 × 48GB · DDR5",{memory:"DDR5",capacityGb:96}),
  item("ram","G.Skill","Trident Z5 Royal 48GB DDR5-8000","2 × 24GB · DDR5",{memory:"DDR5",capacityGb:48}),
  item("ram","G.Skill","Trident Z5 RGB 64GB DDR5-6400","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","G.Skill","Trident Z5 RGB 48GB DDR5-7600","2 × 24GB · DDR5",{memory:"DDR5",capacityGb:48}),
  item("ram","G.Skill","Trident Z5 Neo RGB 64GB DDR5-6000","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","G.Skill","Trident Z5 Neo RGB 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),
  item("ram","G.Skill","Ripjaws S5 64GB DDR5-6000","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","G.Skill","Ripjaws S5 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),

  item("ram","Kingston","FURY Renegade RGB 96GB DDR5-6400","2 × 48GB · DDR5",{memory:"DDR5",capacityGb:96}),
  item("ram","Kingston","FURY Renegade RGB 64GB DDR5-6400","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Kingston","FURY Renegade RGB 32GB DDR5-7200","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),
  item("ram","Kingston","FURY Beast RGB 64GB DDR5-6000","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Kingston","FURY Beast RGB 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),
  item("ram","Kingston","FURY Beast 64GB DDR5-5600","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Kingston","FURY Beast 32GB DDR5-5600","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),

  item("ram","Crucial","Pro Overclocking 64GB DDR5-6000","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Crucial","Pro Overclocking 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),
  item("ram","Crucial","Pro 64GB DDR5-5600","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Crucial","Pro 32GB DDR5-5600","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),

  item("ram","TeamGroup","T-Force Xtreem 48GB DDR5-8000","2 × 24GB · DDR5",{memory:"DDR5",capacityGb:48}),
  item("ram","TeamGroup","T-Force Delta RGB 64GB DDR5-6400","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","TeamGroup","T-Force Delta RGB 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),

  item("ram","ADATA","XPG Lancer RGB 64GB DDR5-6000","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","ADATA","XPG Lancer RGB 32GB DDR5-7200","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),
  item("ram","ADATA","XPG Lancer Blade 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),

  item("ram","Patriot","Viper Xtreme 5 RGB 48GB DDR5-8000","2 × 24GB · DDR5",{memory:"DDR5",capacityGb:48}),
  item("ram","Patriot","Viper Venom RGB 64GB DDR5-6000","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Patriot","Viper Venom 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),

  item("ram","Lexar","ARES RGB 64GB DDR5-6400","2 × 32GB · DDR5",{memory:"DDR5",capacityGb:64}),
  item("ram","Lexar","ARES RGB 32GB DDR5-6000","2 × 16GB · DDR5",{memory:"DDR5",capacityGb:32}),

  /* DDR4 */
  item("ram","Corsair","Dominator Platinum RGB 64GB DDR4-3600","2 × 32GB · DDR4",{memory:"DDR4",capacityGb:64}),
  item("ram","Corsair","Dominator Platinum RGB 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","Corsair","Vengeance RGB Pro SL 64GB DDR4-3600","2 × 32GB · DDR4",{memory:"DDR4",capacityGb:64}),
  item("ram","Corsair","Vengeance RGB Pro SL 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","Corsair","Vengeance LPX 64GB DDR4-3200","2 × 32GB · DDR4",{memory:"DDR4",capacityGb:64}),
  item("ram","Corsair","Vengeance LPX 32GB DDR4-3200","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","Corsair","Vengeance LPX 16GB DDR4-3200","2 × 8GB · DDR4",{memory:"DDR4",capacityGb:16}),

  item("ram","G.Skill","Trident Z Royal Elite 32GB DDR4-4000","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","G.Skill","Trident Z Royal 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","G.Skill","Trident Z Neo 64GB DDR4-3600","2 × 32GB · DDR4",{memory:"DDR4",capacityGb:64}),
  item("ram","G.Skill","Trident Z Neo 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","G.Skill","Ripjaws V 64GB DDR4-3600","2 × 32GB · DDR4",{memory:"DDR4",capacityGb:64}),
  item("ram","G.Skill","Ripjaws V 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","G.Skill","Ripjaws V 16GB DDR4-3200","2 × 8GB · DDR4",{memory:"DDR4",capacityGb:16}),

  item("ram","Kingston","FURY Renegade RGB 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","Kingston","FURY Beast RGB 64GB DDR4-3600","2 × 32GB · DDR4",{memory:"DDR4",capacityGb:64}),
  item("ram","Kingston","FURY Beast 32GB DDR4-3200","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),

  item("ram","Crucial","Ballistix MAX 32GB DDR4-4000","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","Crucial","Ballistix 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","Crucial","Ballistix 16GB DDR4-3200","2 × 8GB · DDR4",{memory:"DDR4",capacityGb:16}),

  item("ram","TeamGroup","T-Force Xtreem ARGB 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","TeamGroup","T-Force Delta RGB 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","ADATA","XPG Spectrix D50 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
  item("ram","Patriot","Viper Steel 32GB DDR4-3600","2 × 16GB · DDR4",{memory:"DDR4",capacityGb:32}),
];

/* ============================================================
   STORAGE
============================================================ */

const storage: PcPart[] = [
  item("storage","Samsung","9100 PRO 8TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Samsung","9100 PRO 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Samsung","9100 PRO 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Samsung","990 PRO 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Samsung","990 PRO 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Samsung","990 PRO 1TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Samsung","990 EVO Plus 4TB","NVMe",{pcieGeneration:4}),
  item("storage","Samsung","990 EVO Plus 2TB","NVMe",{pcieGeneration:4}),
  item("storage","Samsung","980 PRO 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Samsung","980 PRO 1TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Samsung","980 1TB","PCIe 3.0 NVMe",{pcieGeneration:3}),
  item("storage","Samsung","970 EVO Plus 2TB","PCIe 3.0 NVMe",{pcieGeneration:3}),
  item("storage","Samsung","970 EVO Plus 1TB","PCIe 3.0 NVMe",{pcieGeneration:3}),

  item("storage","WD_BLACK","SN850X 8TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","WD_BLACK","SN850X 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","WD_BLACK","SN850X 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","WD_BLACK","SN850 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","WD_BLACK","SN770 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","WD_BLACK","SN750 SE 1TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","WD_BLACK","SN750 2TB","PCIe 3.0 NVMe",{pcieGeneration:3}),

  item("storage","Crucial","T705 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Crucial","T705 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Crucial","T705 1TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Crucial","T700 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Crucial","T700 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Crucial","T500 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Crucial","P5 Plus 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Crucial","P3 Plus 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Crucial","P3 Plus 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),

  item("storage","Kingston","FURY Renegade G5 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Kingston","FURY Renegade G5 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Kingston","FURY Renegade 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Kingston","KC3000 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Kingston","KC3000 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Kingston","NV3 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Kingston","NV2 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),

  item("storage","Seagate","FireCuda 540 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Seagate","FireCuda 530R 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Seagate","FireCuda 530 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Seagate","FireCuda 530 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Seagate","FireCuda 520 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Seagate","FireCuda 510 2TB","PCIe 3.0 NVMe",{pcieGeneration:3}),

  item("storage","Corsair","MP700 PRO SE 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Corsair","MP700 PRO 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Corsair","MP700 PRO 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Corsair","MP600 PRO XT 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Corsair","MP600 PRO LPX 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Corsair","MP600 CORE XT 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),

  item("storage","Sabrent","Rocket 5 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Sabrent","Rocket 5 2TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Sabrent","Rocket 4 Plus-G 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Sabrent","Rocket 4 Plus 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),

  item("storage","SK hynix","Platinum P41 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","SK hynix","Gold P31 2TB","PCIe 3.0 NVMe",{pcieGeneration:3}),
  item("storage","Solidigm","P44 Pro 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","Lexar","NM1090 PRO 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","Lexar","NM790 4TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
  item("storage","TeamGroup","T-Force Cardea Z540 4TB","PCIe 5.0 NVMe",{pcieGeneration:5}),
  item("storage","ADATA","XPG Gammix S70 Blade 2TB","PCIe 4.0 NVMe",{pcieGeneration:4}),
];

/* ============================================================
   CPU COOLING
============================================================ */

const cooling: PcPart[] = [
  item("cooling","NZXT","Kraken Elite 360 RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700","LGA1851"]}),
  item("cooling","NZXT","Kraken Elite 280 RGB","280mm AIO",{radiatorSizeMm:280,supportedSockets:["AM4","AM5","LGA1200","LGA1700","LGA1851"]}),
  item("cooling","NZXT","Kraken 360 RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","NZXT","Kraken 280 RGB","280mm AIO",{radiatorSizeMm:280,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","NZXT","Kraken Z73 RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","NZXT","Kraken X73 RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),

  item("cooling","Corsair","iCUE LINK TITAN 360 RX RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}),
  item("cooling","Corsair","iCUE LINK TITAN 280 RX RGB","280mm AIO",{radiatorSizeMm:280,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}),
  item("cooling","Corsair","iCUE LINK H150i LCD","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Corsair","iCUE H150i Elite LCD XT","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Corsair","iCUE H150i Elite Capellix XT","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Corsair","iCUE H115i Elite Capellix XT","280mm AIO",{radiatorSizeMm:280,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Corsair","iCUE H100i Elite Capellix XT","240mm AIO",{radiatorSizeMm:240,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Corsair","Nautilus 360 RS ARGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}),

  item("cooling","Arctic","Liquid Freezer III Pro 420","420mm AIO",{radiatorSizeMm:420,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}),
  item("cooling","Arctic","Liquid Freezer III Pro 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}),
  item("cooling","Arctic","Liquid Freezer III Pro 280","280mm AIO",{radiatorSizeMm:280,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}),
  item("cooling","Arctic","Liquid Freezer III 420 A-RGB","420mm AIO",{radiatorSizeMm:420,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Arctic","Liquid Freezer III 360 A-RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Arctic","Liquid Freezer II 360 A-RGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),

  item("cooling","ASUS","ROG Ryujin III 360 ARGB Extreme","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}),
  item("cooling","ASUS","ROG Ryujin III 360 ARGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","ASUS","ROG Ryujin II 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","ASUS","ROG Strix LC III 360 ARGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","ASUS","ROG Strix LC II 360 ARGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),

  item("cooling","Lian Li","HydroShift LCD 360TL","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Lian Li","Galahad II LCD 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Lian Li","Galahad II Trinity Performance 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Lian Li","Galahad AIO 360 UNI FAN SL Edition","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),

  item("cooling","Cooler Master","MasterLiquid 360 Atmos","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Cooler Master","MasterLiquid PL360 Flux","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Cooler Master","MasterLiquid ML360 Illusion","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),

  item("cooling","be quiet!","Light Loop 360mm","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700","LGA1851"]}),
  item("cooling","be quiet!","Pure Loop 2 FX 360mm","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","be quiet!","Silent Loop 2 360mm","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),

  item("cooling","Thermaltake","TH360 V2 Ultra ARGB","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Thermaltake","TOUGHLIQUID Ultra 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),

  item("cooling","DeepCool","Mystique 360","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","DeepCool","LS720 SE","360mm AIO",{radiatorSizeMm:360,supportedSockets:["AM4","AM5","LGA1700"]}),

  /* Air */
  item("cooling","Noctua","NH-D15 G2","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700","LGA1851"]}),
  item("cooling","Noctua","NH-D15 chromax.black","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Noctua","NH-D15","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Noctua","NH-U12A chromax.black","Tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Noctua","NH-U12S chromax.black","Tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),

  item("cooling","be quiet!","Dark Rock Elite","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","be quiet!","Dark Rock Pro 5","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","be quiet!","Dark Rock Pro 4","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),

  item("cooling","DeepCool","Assassin IV","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","DeepCool","AK620 Digital","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","DeepCool","AK620","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}),

  item("cooling","Thermalright","Phantom Spirit 120 EVO","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Thermalright","Phantom Spirit 120 SE","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1700"]}),
  item("cooling","Thermalright","Peerless Assassin 120 SE","Dual-tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Cooler Master","Hyper 212 Halo","Tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
  item("cooling","Cooler Master","Hyper 212 Black Edition","Tower air cooler",{supportedSockets:["AM4","AM5","LGA1200","LGA1700"]}),
];

/* ============================================================
   POWER SUPPLIES
============================================================ */

const psu: PcPart[] = [
  item("psu","Corsair","AX1600i","1600W · Titanium",{wattage:1600}),
  item("psu","Corsair","HX1500i","1500W · Platinum",{wattage:1500}),
  item("psu","Corsair","HX1200i","1200W · Platinum",{wattage:1200}),
  item("psu","Corsair","HX1000i","1000W · Platinum",{wattage:1000}),
  item("psu","Corsair","RM1200x SHIFT","1200W · Gold",{wattage:1200}),
  item("psu","Corsair","RM1000x SHIFT","1000W · Gold",{wattage:1000}),
  item("psu","Corsair","RM1000x","1000W · Gold",{wattage:1000}),
  item("psu","Corsair","RM850x SHIFT","850W · Gold",{wattage:850}),
  item("psu","Corsair","RM850x","850W · Gold",{wattage:850}),
  item("psu","Corsair","RM750x","750W · Gold",{wattage:750}),
  item("psu","Corsair","RM650x","650W · Gold",{wattage:650}),
  item("psu","Corsair","SF1000","1000W · SFX",{wattage:1000}),
  item("psu","Corsair","SF850","850W · SFX",{wattage:850}),
  item("psu","Corsair","SF750","750W · SFX",{wattage:750}),

  item("psu","Seasonic","PRIME TX-1600","1600W · Titanium",{wattage:1600}),
  item("psu","Seasonic","PRIME TX-1300","1300W · Titanium",{wattage:1300}),
  item("psu","Seasonic","PRIME TX-1000","1000W · Titanium",{wattage:1000}),
  item("psu","Seasonic","VERTEX PX-1200","1200W · Platinum",{wattage:1200}),
  item("psu","Seasonic","VERTEX GX-1200","1200W · Gold",{wattage:1200}),
  item("psu","Seasonic","VERTEX GX-1000","1000W · Gold",{wattage:1000}),
  item("psu","Seasonic","VERTEX GX-850","850W · Gold",{wattage:850}),
  item("psu","Seasonic","FOCUS GX-1000","1000W · Gold",{wattage:1000}),
  item("psu","Seasonic","FOCUS GX-850","850W · Gold",{wattage:850}),
  item("psu","Seasonic","FOCUS GX-750","750W · Gold",{wattage:750}),
  item("psu","Seasonic","FOCUS GX-650","650W · Gold",{wattage:650}),

  item("psu","be quiet!","Dark Power Pro 13 1600W","Titanium",{wattage:1600}),
  item("psu","be quiet!","Dark Power Pro 13 1300W","Titanium",{wattage:1300}),
  item("psu","be quiet!","Dark Power 13 1000W","Titanium",{wattage:1000}),
  item("psu","be quiet!","Straight Power 12 1500W","Platinum",{wattage:1500}),
  item("psu","be quiet!","Straight Power 12 1200W","Platinum",{wattage:1200}),
  item("psu","be quiet!","Straight Power 12 1000W","Platinum",{wattage:1000}),
  item("psu","be quiet!","Straight Power 12 850W","Platinum",{wattage:850}),
  item("psu","be quiet!","Pure Power 12 M 1000W","Gold",{wattage:1000}),
  item("psu","be quiet!","Pure Power 12 M 850W","Gold",{wattage:850}),
  item("psu","be quiet!","Pure Power 12 M 750W","Gold",{wattage:750}),

  item("psu","ASUS","ROG Thor 1600W Titanium III","1600W",{wattage:1600}),
  item("psu","ASUS","ROG Thor 1200P2 Gaming","1200W",{wattage:1200}),
  item("psu","ASUS","ROG Thor 1000P2 Gaming","1000W",{wattage:1000}),
  item("psu","ASUS","ROG Loki SFX-L 1200W Titanium","1200W",{wattage:1200}),
  item("psu","ASUS","ROG Loki SFX-L 1000W Platinum","1000W",{wattage:1000}),
  item("psu","ASUS","ROG Strix 1000W Gold Aura","1000W",{wattage:1000}),
  item("psu","ASUS","ROG Strix 850W Gold Aura","850W",{wattage:850}),
  item("psu","ASUS","TUF Gaming 1000W Gold","1000W",{wattage:1000}),
  item("psu","ASUS","TUF Gaming 850W Gold","850W",{wattage:850}),

  item("psu","MSI","MEG Ai1600T PCIE5","1600W · Titanium",{wattage:1600}),
  item("psu","MSI","MEG Ai1300P PCIE5","1300W · Platinum",{wattage:1300}),
  item("psu","MSI","MPG A1250GS PCIE5","1250W",{wattage:1250}),
  item("psu","MSI","MPG A1000G PCIE5","1000W · Gold",{wattage:1000}),
  item("psu","MSI","MPG A850G PCIE5","850W · Gold",{wattage:850}),
  item("psu","MSI","MAG A850GL PCIE5","850W · Gold",{wattage:850}),
  item("psu","MSI","MAG A750GL PCIE5","750W · Gold",{wattage:750}),

  item("psu","Thermaltake","Toughpower TF3 1550W","Titanium",{wattage:1550}),
  item("psu","Thermaltake","Toughpower GF A3 1200W","Gold",{wattage:1200}),
  item("psu","Thermaltake","Toughpower GF A3 1050W","Gold",{wattage:1050}),
  item("psu","Thermaltake","Toughpower GF A3 850W","Gold",{wattage:850}),
  item("psu","Thermaltake","Toughpower GF3 1000W","Gold",{wattage:1000}),
  item("psu","Thermaltake","Toughpower GF3 850W","Gold",{wattage:850}),

  item("psu","Cooler Master","V Platinum V2 1300W","Platinum",{wattage:1300}),
  item("psu","Cooler Master","V Gold i 1000","Gold",{wattage:1000}),
  item("psu","Cooler Master","MWE Gold 1050 V2","Gold",{wattage:1050}),
  item("psu","Cooler Master","MWE Gold 850 V2","Gold",{wattage:850}),
  item("psu","Cooler Master","MWE Gold 750 V2","Gold",{wattage:750}),

  item("psu","Super Flower","Leadex Titanium 1600W","Titanium",{wattage:1600}),
  item("psu","Super Flower","Leadex VII XG 1300W","Gold",{wattage:1300}),
  item("psu","Super Flower","Leadex VII XG 1000W","Gold",{wattage:1000}),
  item("psu","EVGA","SuperNOVA 1600 P+","1600W · Platinum",{wattage:1600}),
  item("psu","EVGA","SuperNOVA 1000 G6","1000W · Gold",{wattage:1000}),
  item("psu","EVGA","SuperNOVA 850 G6","850W · Gold",{wattage:850}),
];

/* ============================================================
   PC CASES
============================================================ */

const pcCase: PcPart[] = [
  /* Lian Li */
  item("case","Lian Li","O11 Dynamic EVO RGB","Dual chamber"),
  item("case","Lian Li","O11 Dynamic EVO","Dual chamber"),
  item("case","Lian Li","O11 Dynamic EVO XL","Full tower"),
  item("case","Lian Li","O11D EVO XL","Full tower"),
  item("case","Lian Li","O11 Vision Compact","Panoramic"),
  item("case","Lian Li","O11 Vision","Panoramic"),
  item("case","Lian Li","O11 Dynamic XL ROG Certified","Full tower"),
  item("case","Lian Li","O11 Dynamic","Dual chamber"),
  item("case","Lian Li","O11 Air Mini","Compact dual chamber"),
  item("case","Lian Li","O11 Dynamic Mini","Compact dual chamber"),
  item("case","Lian Li","Lancool III RGB","High airflow"),
  item("case","Lian Li","Lancool III","High airflow"),
  item("case","Lian Li","Lancool II Mesh RGB","Airflow"),
  item("case","Lian Li","Lancool 216 RGB","Airflow"),
  item("case","Lian Li","Lancool 216","Airflow"),
  item("case","Lian Li","Lancool 207","Airflow"),
  item("case","Lian Li","Lancool 205 Mesh","Mid tower"),
  item("case","Lian Li","A3-mATX","Micro-ATX"),

  /* NZXT */
  item("case","NZXT","H9 Flow RGB+","Large dual chamber"),
  item("case","NZXT","H9 Flow RGB","Large dual chamber"),
  item("case","NZXT","H9 Flow","Large dual chamber"),
  item("case","NZXT","H9 Elite","Dual chamber"),
  item("case","NZXT","H7 Flow RGB","Large mid tower"),
  item("case","NZXT","H7 Flow","Large mid tower"),
  item("case","NZXT","H7 Elite","Mid tower"),
  item("case","NZXT","H6 RGB+","Compact dual chamber"),
  item("case","NZXT","H6 Flow RGB","Compact dual chamber"),
  item("case","NZXT","H6 Flow","Compact dual chamber"),
  item("case","NZXT","H5 Flow RGB","Compact ATX"),
  item("case","NZXT","H5 Flow","Compact ATX"),
  item("case","NZXT","H5 Elite","Compact ATX"),
  item("case","NZXT","H3 Flow","Micro-ATX"),
  item("case","NZXT","H2 Flow","Mini-ITX"),
  item("case","NZXT","H510 Elite","Legacy mid tower"),
  item("case","NZXT","H510 Flow","Legacy mid tower"),
  item("case","NZXT","H710i","Legacy full-size mid tower"),

  /* Corsair */
  item("case","Corsair","9000D RGB Airflow","Super full tower"),
  item("case","Corsair","Obsidian Series 1000D","Super tower"),
  item("case","Corsair","7000D Airflow","Full tower"),
  item("case","Corsair","iCUE 7000X RGB","Full tower"),
  item("case","Corsair","6500X RGB","Dual chamber"),
  item("case","Corsair","6500X","Dual chamber"),
  item("case","Corsair","6500D Airflow","Dual chamber airflow"),
  item("case","Corsair","AIR 5400 LX-R RGB","Triple chamber"),
  item("case","Corsair","AIR 5400 RS-R ARGB","Triple chamber"),
  item("case","Corsair","iCUE LINK 5000T LX RGB","Mid tower"),
  item("case","Corsair","iCUE 5000T RGB","Mid tower"),
  item("case","Corsair","5000D RGB Airflow","Mid tower"),
  item("case","Corsair","5000D Airflow","Mid tower"),
  item("case","Corsair","5000X RGB","Mid tower"),
  item("case","Corsair","FRAME 5000D RS","Modular mid tower"),
  item("case","Corsair","FRAME 5000D WOOD RS","Modular mid tower"),
  item("case","Corsair","FRAME 4500X LX-R RGB","Panoramic mid tower"),
  item("case","Corsair","FRAME 4500X RS-R ARGB","Panoramic mid tower"),
  item("case","Corsair","FRAME 4000D LCD RS ARGB","Mid tower"),
  item("case","Corsair","FRAME 4000D RS ARGB","Mid tower"),
  item("case","Corsair","4000D RGB Airflow","Mid tower"),
  item("case","Corsair","4000D Airflow","Mid tower"),
  item("case","Corsair","3500X ARGB","Panoramic mid tower"),
  item("case","Corsair","3500X","Panoramic mid tower"),
  item("case","Corsair","3200D RS ARGB","Mid tower"),
  item("case","Corsair","3000D RGB Airflow","Mid tower"),
  item("case","Corsair","2800X RS-R ARGB","Micro-ATX"),
  item("case","Corsair","2500X","Micro-ATX dual chamber"),
  item("case","Corsair","2500D Airflow","Micro-ATX dual chamber"),
  item("case","Corsair","Crystal Series 680X RGB","Dual chamber"),
  item("case","Corsair","Crystal Series 570X RGB","Tempered glass"),
  item("case","Corsair","Obsidian Series 750D Airflow","Full tower"),
  item("case","Corsair","Graphite Series 780T","Full tower"),
  item("case","Corsair","Graphite Series 760T","Full tower"),

  /* Fractal */
  item("case","Fractal Design","North XL","Wood accent full tower"),
  item("case","Fractal Design","North XL RC","Full tower"),
  item("case","Fractal Design","North","Wood accent mid tower"),
  item("case","Fractal Design","North Charcoal Black","Mid tower"),
  item("case","Fractal Design","Torrent","High airflow"),
  item("case","Fractal Design","Torrent Compact","Compact airflow"),
  item("case","Fractal Design","Torrent Nano","Mini-ITX"),
  item("case","Fractal Design","Meshify 2 XL","Full tower"),
  item("case","Fractal Design","Meshify 2","Airflow"),
  item("case","Fractal Design","Meshify 2 Compact","Compact airflow"),
  item("case","Fractal Design","Meshify C","Legacy airflow"),
  item("case","Fractal Design","Define 7 XL","Full tower"),
  item("case","Fractal Design","Define 7","Silent tower"),
  item("case","Fractal Design","Define 7 Compact","Compact silent"),
  item("case","Fractal Design","Pop XL Air","Full-size airflow"),
  item("case","Fractal Design","Pop Air","Airflow"),
  item("case","Fractal Design","Era 2","Mini-ITX"),
  item("case","Fractal Design","Terra","Mini-ITX"),

  /* HYTE */
  item("case","HYTE","Y70 Touch Infinite","Panoramic"),
  item("case","HYTE","Y70 Touch","Panoramic"),
  item("case","HYTE","Y70","Panoramic"),
  item("case","HYTE","Y60","Panoramic"),
  item("case","HYTE","Y40","Panoramic"),

  /* Phanteks */
  item("case","Phanteks","NV9","Full tower"),
  item("case","Phanteks","NV7","Panoramic"),
  item("case","Phanteks","NV5 MKII","Panoramic"),
  item("case","Phanteks","NV5","Panoramic"),
  item("case","Phanteks","Eclipse G500A","Airflow"),
  item("case","Phanteks","Eclipse P500A","Airflow"),
  item("case","Phanteks","Eclipse P600S","Hybrid"),
  item("case","Phanteks","Eclipse P400A","Airflow"),
  item("case","Phanteks","Enthoo 719","Full tower"),
  item("case","Phanteks","Enthoo Pro 2","Full tower"),

  /* Cooler Master */
  item("case","Cooler Master","HAF 700 EVO","Full tower"),
  item("case","Cooler Master","HAF 700","Full tower"),
  item("case","Cooler Master","HAF 500","Airflow"),
  item("case","Cooler Master","MasterFrame 700","Open air"),
  item("case","Cooler Master","TD500 Mesh V2","Airflow"),
  item("case","Cooler Master","TD500 Mesh","Airflow"),
  item("case","Cooler Master","MasterBox 520 Mesh","Mid tower"),
  item("case","Cooler Master","NR200P MAX","Mini-ITX"),
  item("case","Cooler Master","NR200P","Mini-ITX"),

  /* ASUS */
  item("case","ASUS","ROG Hyperion GR701","Full tower"),
  item("case","ASUS","ROG Strix Helios","Mid/full tower"),
  item("case","ASUS","ROG Strix Helios II","Showcase tower"),
  item("case","ASUS","TUF Gaming GT502 Horizon","Dual chamber"),
  item("case","ASUS","TUF Gaming GT502","Dual chamber"),
  item("case","ASUS","TUF Gaming GT501","Mid tower"),

  /* be quiet */
  item("case","be quiet!","Dark Base Pro 901","Full tower"),
  item("case","be quiet!","Dark Base 701","Full tower"),
  item("case","be quiet!","Shadow Base 800 FX","Airflow"),
  item("case","be quiet!","Shadow Base 800","Airflow"),
  item("case","be quiet!","Silent Base 802","Silent / airflow"),
  item("case","be quiet!","Pure Base 500FX","Airflow"),
  item("case","be quiet!","Pure Base 500DX","Airflow"),

  /* Thermaltake */
  item("case","Thermaltake","The Tower 900","Vertical full tower"),
  item("case","Thermaltake","The Tower 600","Vertical showcase"),
  item("case","Thermaltake","The Tower 500","Vertical showcase"),
  item("case","Thermaltake","The Tower 300","Micro tower"),
  item("case","Thermaltake","View 380 TG ARGB","Panoramic"),
  item("case","Thermaltake","View 51 TG ARGB","Full tower"),
  item("case","Thermaltake","Core P8 TG","Open-frame full tower"),
  item("case","Thermaltake","Core P6 TG","Open-frame mid tower"),

  /* Others */
  item("case","Antec","C8","Dual chamber"),
  item("case","Antec","C8 Curve Wood","Dual chamber"),
  item("case","Antec","Performance 1 FT","Full tower"),
  item("case","Montech","King 95 Pro","Panoramic"),
  item("case","Montech","King 95","Panoramic"),
  item("case","Montech","Sky Two GX","Airflow"),
  item("case","Montech","Air 903 Max","Airflow"),
  item("case","Jonsbo","TK-3","Panoramic"),
  item("case","Jonsbo","D41 Mesh","Compact ATX"),
];

/* ============================================================
   CASE FANS
============================================================ */

const fans: PcPart[] = [
  item("fans","Lian Li","UNI FAN SL Wireless LCD 120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Lian Li","UNI FAN TL LCD 120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Lian Li","UNI FAN TL 120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Lian Li","UNI FAN SL-INF 120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Lian Li","UNI FAN SL-INF 140","140mm",{fanSizeMm:140}),
  item("fans","Lian Li","UNI FAN SL V2 120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Lian Li","UNI FAN SL140 V2","140mm",{fanSizeMm:140}),
  item("fans","Lian Li","UNI FAN AL120 V2 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Lian Li","UNI FAN AL140 V2","140mm",{fanSizeMm:140}),

  item("fans","Corsair","iCUE LINK QX120 RGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Corsair","iCUE LINK QX140 RGB Twin Pack","140mm",{fanSizeMm:140}),
  item("fans","Corsair","iCUE LINK LX120 RGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Corsair","LX120 RGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Corsair","LX140 RGB Twin Pack","140mm",{fanSizeMm:140}),
  item("fans","Corsair","RX120 RGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Corsair","RX140 RGB Twin Pack","140mm",{fanSizeMm:140}),
  item("fans","Corsair","AF120 RGB Elite Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Corsair","AF140 RGB Elite Twin Pack","140mm",{fanSizeMm:140}),
  item("fans","Corsair","QL120 RGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Corsair","QL140 RGB Twin Pack","140mm",{fanSizeMm:140}),
  item("fans","Corsair","LL120 RGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Corsair","LL140 RGB Twin Pack","140mm",{fanSizeMm:140}),

  item("fans","NZXT","F120 RGB Core Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","NZXT","F140 RGB Core Twin Pack","140mm",{fanSizeMm:140}),
  item("fans","NZXT","F120 RGB Duo Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","NZXT","F140 RGB Duo Twin Pack","140mm",{fanSizeMm:140}),
  item("fans","NZXT","F120Q","120mm",{fanSizeMm:120}),
  item("fans","NZXT","F140Q","140mm",{fanSizeMm:140}),
  item("fans","NZXT","Aer RGB 2 120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","NZXT","Aer RGB 2 140 Twin Pack","140mm",{fanSizeMm:140}),

  item("fans","Phanteks","D30-120 DRGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Phanteks","D30-140 DRGB Triple Pack","140mm",{fanSizeMm:140}),
  item("fans","Phanteks","T30-120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Phanteks","M25-120 DRGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Phanteks","M25-140 DRGB Triple Pack","140mm",{fanSizeMm:140}),

  item("fans","be quiet!","Light Wings LX 120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","be quiet!","Light Wings LX 140 Triple Pack","140mm",{fanSizeMm:140}),
  item("fans","be quiet!","Light Wings 120 High-Speed Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","be quiet!","Light Wings 140 High-Speed Triple Pack","140mm",{fanSizeMm:140}),
  item("fans","be quiet!","Silent Wings Pro 4 120mm","120mm",{fanSizeMm:120}),
  item("fans","be quiet!","Silent Wings Pro 4 140mm","140mm",{fanSizeMm:140}),
  item("fans","be quiet!","Silent Wings 4 120mm","120mm",{fanSizeMm:120}),
  item("fans","be quiet!","Silent Wings 4 140mm","140mm",{fanSizeMm:140}),

  item("fans","Noctua","NF-A12x25 G2 PWM","120mm",{fanSizeMm:120}),
  item("fans","Noctua","NF-A12x25 PWM","120mm",{fanSizeMm:120}),
  item("fans","Noctua","NF-A12x25 PWM chromax.black.swap","120mm",{fanSizeMm:120}),
  item("fans","Noctua","NF-A14 PWM","140mm",{fanSizeMm:140}),
  item("fans","Noctua","NF-A14 PWM chromax.black.swap","140mm",{fanSizeMm:140}),
  item("fans","Noctua","NF-F12 PWM","120mm",{fanSizeMm:120}),
  item("fans","Noctua","NF-S12A PWM","120mm",{fanSizeMm:120}),

  item("fans","Arctic","P12 Max","120mm",{fanSizeMm:120}),
  item("fans","Arctic","P12 PWM PST","120mm",{fanSizeMm:120}),
  item("fans","Arctic","P12 PWM PST A-RGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Arctic","P14 Max","140mm",{fanSizeMm:140}),
  item("fans","Arctic","P14 PWM PST","140mm",{fanSizeMm:140}),
  item("fans","Arctic","P14 PWM PST A-RGB","140mm",{fanSizeMm:140}),

  item("fans","Cooler Master","Mobius 120P ARGB","120mm",{fanSizeMm:120}),
  item("fans","Cooler Master","MasterFan MF120 Halo Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Cooler Master","MasterFan MF140 Halo2","140mm",{fanSizeMm:140}),

  item("fans","Thermaltake","SWAFAN EX12 RGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","Thermaltake","SWAFAN EX14 RGB Triple Pack","140mm",{fanSizeMm:140}),
  item("fans","Thermaltake","TOUGHFAN 12 Pro","120mm",{fanSizeMm:120}),
  item("fans","Thermaltake","TOUGHFAN 14 Pro","140mm",{fanSizeMm:140}),

  item("fans","ASUS","ROG Strix XF 120","120mm",{fanSizeMm:120}),
  item("fans","ASUS","TUF Gaming TF120 ARGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","MSI","MPG EZ120 ARGB Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","DeepCool","FC120 Triple Pack","120mm",{fanSizeMm:120}),
  item("fans","DeepCool","FT14","140mm",{fanSizeMm:140}),
];

/*
 * Storage, cooling and PSU contain no CPU-platform dependency
 * unless compatibility metadata specifically says otherwise.
 */

export const megaPcCatalog:
  Record<PcPartKind, PcPart[]> = {
    cpu,
    gpu,
    motherboard,
    ram,
    storage,
    cooling,
    psu,
    case: pcCase,
    fans,
  };
