import {
  pcCatalog,
  type PcMemoryType,
  type PcMotherboardFormFactor,
  type PcPart,
  type PcPartKind,
} from "@/lib/gaming-desktop/catalog";

export type PcBuildSelection =
  Record<PcPartKind, PcPart>;

export type CompatibilityResult = {
  compatible: boolean;
  reasons: string[];
  recommendation?: string;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function text(part: PcPart) {
  return [
    part.brand,
    part.model,
    part.detail,
    ...(part.tags ?? []),
  ]
    .join(" ")
    .toUpperCase();
}

/* ============================================================
   PLATFORM / SOCKET INFERENCE
============================================================ */

export function getCpuSocket(
  part: PcPart,
): string | null {
  if (part.socket) {
    return normalize(part.socket);
  }

  const value = text(part);

  if (
    value.includes("RYZEN 9000") ||
    value.includes("RYZEN 8000") ||
    value.includes("RYZEN 7000") ||
    value.includes("AM5")
  ) {
    return "AM5";
  }

  if (
    value.includes("RYZEN 5000") ||
    value.includes("RYZEN 4000") ||
    value.includes("RYZEN 3000") ||
    value.includes("AM4")
  ) {
    return "AM4";
  }

  if (
    value.includes("CORE ULTRA") ||
    value.includes("LGA1851")
  ) {
    return "LGA1851";
  }

  if (
    value.includes("14TH GEN") ||
    value.includes("13TH GEN") ||
    value.includes("12TH GEN") ||
    value.includes("LGA1700")
  ) {
    return "LGA1700";
  }

  return null;
}

export function getMotherboardSocket(
  part: PcPart,
): string | null {
  if (part.socket) {
    return normalize(part.socket);
  }

  const value = text(part);

  /*
   * AMD AM5
   */
  if (
    /\bX870E?\b/.test(value) ||
    /\bB850\b/.test(value) ||
    /\bX670E?\b/.test(value) ||
    /\bB650E?\b/.test(value) ||
    /\bA620\b/.test(value)
  ) {
    return "AM5";
  }

  /*
   * AMD AM4
   */
  if (
    /\bX570\b/.test(value) ||
    /\bB550\b/.test(value) ||
    /\bA520\b/.test(value) ||
    /\bX470\b/.test(value) ||
    /\bB450\b/.test(value)
  ) {
    return "AM4";
  }

  /*
   * Intel Core Ultra desktop platform.
   */
  if (
    /\bZ890\b/.test(value) ||
    /\bB860\b/.test(value) ||
    /\bH810\b/.test(value) ||
    value.includes("LGA1851")
  ) {
    return "LGA1851";
  }

  /*
   * Intel 12th / 13th / 14th gen.
   */
  if (
    /\bZ790\b/.test(value) ||
    /\bB760\b/.test(value) ||
    /\bH770\b/.test(value) ||
    /\bZ690\b/.test(value) ||
    /\bB660\b/.test(value) ||
    /\bH670\b/.test(value) ||
    /\bH610\b/.test(value) ||
    value.includes("LGA1700")
  ) {
    return "LGA1700";
  }

  return null;
}

/* ============================================================
   MEMORY
============================================================ */

export function getMemoryType(
  part: PcPart,
): PcMemoryType | null {
  if (part.memory) {
    return part.memory;
  }

  const value = text(part);

  if (
    value.includes("DDR4") &&
    value.includes("DDR5")
  ) {
    return "DDR4 / DDR5";
  }

  if (value.includes("DDR5")) {
    return "DDR5";
  }

  if (value.includes("DDR4")) {
    return "DDR4";
  }

  const socket =
    part.kind === "motherboard"
      ? getMotherboardSocket(part)
      : getCpuSocket(part);

  if (socket === "AM5") {
    return "DDR5";
  }

  if (socket === "AM4") {
    return "DDR4";
  }

  if (socket === "LGA1851") {
    return "DDR5";
  }

  return null;
}

export function getRamCapacityGb(
  part: PcPart,
): number | null {
  const value = text(part);

  /*
   * Examples:
   * 2x16GB
   * 2 x 32 GB
   * 4x32GB
   */
  const kitMatch = value.match(
    /(\d+)\s*[X×]\s*(\d+)\s*GB/,
  );

  if (kitMatch) {
    return (
      Number(kitMatch[1]) *
      Number(kitMatch[2])
    );
  }

  /*
   * Examples:
   * 32GB DDR5-6000
   * 64 GB DDR5
   * 128GB KIT
   */
  const directMatches = [
    ...value.matchAll(
      /(\d+)\s*GB/g,
    ),
  ];

  if (!directMatches.length) {
    return null;
  }

  return Math.max(
    ...directMatches.map(
      (match) => Number(match[1]),
    ),
  );
}

/* ============================================================
   MOTHERBOARD FORM FACTOR
============================================================ */

export function getFormFactor(
  part: PcPart,
): PcMotherboardFormFactor | null {
  if (part.formFactor) {
    return part.formFactor;
  }

  const value = text(part);

  if (
    value.includes("MINI-ITX") ||
    value.includes("MINI ITX") ||
    /\bITX\b/.test(value)
  ) {
    return "Mini-ITX";
  }

  if (
    value.includes("MICRO-ATX") ||
    value.includes("MICRO ATX") ||
    value.includes("MATX") ||
    value.includes("M-ATX")
  ) {
    return "Micro-ATX";
  }

  if (
    value.includes("E-ATX") ||
    value.includes("EATX")
  ) {
    return "E-ATX";
  }

  if (/\bATX\b/.test(value)) {
    return "ATX";
  }

  return null;
}

function formFactorRank(
  formFactor: PcMotherboardFormFactor,
) {
  const ranks: Record<
    PcMotherboardFormFactor,
    number
  > = {
    "Mini-ITX": 1,
    "Micro-ATX": 2,
    ATX: 3,
    "E-ATX": 4,
  };

  return ranks[formFactor];
}

function caseSupportsMotherboard(
  pcCase: PcPart,
  motherboard: PcPart,
) {
  const board =
    getFormFactor(motherboard);

  if (!board) {
    return true;
  }

  if (
    pcCase.supportedFormFactors?.length
  ) {
    return pcCase.supportedFormFactors.includes(
      board,
    );
  }

  const value = text(pcCase);

  /*
   * The current Stereophonie catalogue is overwhelmingly
   * mid/full/dual-chamber ATX cases.
   *
   * Explicit compact Mini-ITX cases are handled separately.
   */
  if (
    value.includes("MINI-ITX") ||
    value.includes("MINI ITX")
  ) {
    return board === "Mini-ITX";
  }

  if (
    value.includes("MICRO-ATX") ||
    value.includes("MICRO ATX")
  ) {
    return (
      formFactorRank(board) <=
      formFactorRank("Micro-ATX")
    );
  }

  /*
   * Full towers / super towers generally allow E-ATX.
   */
  if (
    value.includes("FULL TOWER") ||
    value.includes("SUPER TOWER") ||
    value.includes("9000D") ||
    value.includes("7000D") ||
    value.includes("O11D EVO XL") ||
    value.includes("NV9") ||
    value.includes("HAF 700") ||
    value.includes("HYPERION") ||
    value.includes("DARK BASE PRO")
  ) {
    return true;
  }

  /*
   * Normal mid-tower/dual-chamber default:
   * Mini-ITX, Micro-ATX and ATX.
   */
  return (
    formFactorRank(board) <=
    formFactorRank("ATX")
  );
}

/* ============================================================
   GPU POWER
============================================================ */

export function getGpuRecommendedPsuW(
  gpu: PcPart,
): number {
  if (gpu.recommendedPsuW) {
    return gpu.recommendedPsuW;
  }

  const value = text(gpu);

  const rules: Array<
    [RegExp, number]
  > = [
    [/RTX\s*5090/, 1000],
    [/RTX\s*5080/, 850],
    [/RTX\s*5070\s*TI/, 750],
    [/RTX\s*5070/, 650],
    [/RTX\s*5060\s*TI/, 650],
    [/RTX\s*5060/, 550],

    [/RTX\s*4090/, 1000],
    [/RTX\s*4080\s*SUPER/, 850],
    [/RTX\s*4080/, 850],
    [/RTX\s*4070\s*TI\s*SUPER/, 750],
    [/RTX\s*4070\s*TI/, 750],
    [/RTX\s*4070\s*SUPER/, 700],
    [/RTX\s*4070/, 650],
    [/RTX\s*4060\s*TI/, 550],
    [/RTX\s*4060/, 500],

    [/RX\s*9070\s*XT/, 750],
    [/RX\s*9070/, 700],
    [/RX\s*7900\s*XTX/, 850],
    [/RX\s*7900\s*XT/, 750],
    [/RX\s*7900\s*GRE/, 700],
    [/RX\s*7800\s*XT/, 700],
    [/RX\s*7700\s*XT/, 700],
    [/RX\s*7600\s*XT/, 600],
    [/RX\s*7600/, 550],

    [/ARC\s*B580/, 650],
    [/ARC\s*B570/, 600],
    [/ARC\s*A770/, 650],
    [/ARC\s*A750/, 600],
  ];

  for (const [
    pattern,
    watts,
  ] of rules) {
    if (pattern.test(value)) {
      return watts;
    }
  }

  /*
   * Unknown modern gaming GPU:
   * use a safe minimum rather than allowing tiny PSUs.
   */
  return 650;
}

function cpuPowerAdjustment(
  cpu: PcPart,
) {
  const value = text(cpu);

  if (
    value.includes("9950") ||
    value.includes("7950") ||
    value.includes("14900") ||
    value.includes("13900") ||
    value.includes("12900") ||
    value.includes("ULTRA 9")
  ) {
    return 100;
  }

  if (
    value.includes("9900") ||
    value.includes("7900") ||
    value.includes("14700") ||
    value.includes("13700") ||
    value.includes("12700") ||
    value.includes("ULTRA 7")
  ) {
    return 50;
  }

  return 0;
}

export function getBuildRecommendedPsuW(
  selection: PcBuildSelection,
  chosenParts: Set<PcPartKind>,
) {
  let recommendation = 0;

  if (chosenParts.has("gpu")) {
    recommendation =
      getGpuRecommendedPsuW(
        selection.gpu,
      );
  }

  if (
    recommendation > 0 &&
    chosenParts.has("cpu")
  ) {
    recommendation +=
      cpuPowerAdjustment(
        selection.cpu,
      );
  }

  /*
   * Round upward to standard PSU classes.
   */
  const standardSteps = [
    550,
    650,
    750,
    850,
    1000,
    1200,
    1300,
    1500,
    1600,
  ];

  for (const step of standardSteps) {
    if (recommendation <= step) {
      return step;
    }
  }

  return recommendation;
}

/* ============================================================
   COOLING
============================================================ */

function coolerSupportsSocket(
  cooler: PcPart,
  socket: string,
) {
  if (
    cooler.supportedSockets?.length
  ) {
    return cooler.supportedSockets
      .map(normalize)
      .includes(normalize(socket));
  }

  /*
   * Existing catalogue cooler metadata does not yet contain
   * socket kits for every individual SKU.
   *
   * Do NOT falsely reject modern coolers merely because
   * historical mounting-kit metadata is absent.
   *
   * Exact supportedSockets can be added to individual products
   * later and will immediately become authoritative.
   */
  return true;
}

/* ============================================================
   ITEM COMPATIBILITY
============================================================ */

export function getPartCompatibility(
  item: PcPart,
  selection: PcBuildSelection,
  chosenParts: Set<PcPartKind>,
): CompatibilityResult {
  const reasons: string[] = [];

  /*
   * ----------------------------------------------------------
   * CPU
   *
   * CPU remains the platform anchor.
   * We intentionally allow the customer to change CPU freely.
   * Downstream incompatible selections are then unconfirmed.
   * ----------------------------------------------------------
   */
  if (item.kind === "cpu") {
    return {
      compatible: true,
      reasons,
    };
  }

  /*
   * ----------------------------------------------------------
   * GPU
   *
   * GPU also remains freely selectable.
   * PSU will subsequently be constrained by the selected GPU.
   * ----------------------------------------------------------
   */
  if (item.kind === "gpu") {
    return {
      compatible: true,
      reasons,
    };
  }

  /*
   * ----------------------------------------------------------
   * MOTHERBOARD
   * ----------------------------------------------------------
   */
  if (item.kind === "motherboard") {
    if (chosenParts.has("cpu")) {
      const cpuSocket =
        getCpuSocket(
          selection.cpu,
        );

      const boardSocket =
        getMotherboardSocket(
          item,
        );

      if (
        cpuSocket &&
        boardSocket &&
        cpuSocket !== boardSocket
      ) {
        reasons.push(
          `Requires ${cpuSocket} motherboard for selected processor.`,
        );
      }
    }

    if (chosenParts.has("case")) {
      if (
        !caseSupportsMotherboard(
          selection.case,
          item,
        )
      ) {
        reasons.push(
          "This motherboard form factor does not fit the selected case.",
        );
      }
    }
  }

  /*
   * ----------------------------------------------------------
   * RAM
   * ----------------------------------------------------------
   */
  if (item.kind === "ram") {
    if (
      chosenParts.has(
        "motherboard",
      )
    ) {
      const boardMemory =
        getMemoryType(
          selection.motherboard,
        );

      const ramMemory =
        getMemoryType(item);

      if (
        boardMemory &&
        ramMemory &&
        boardMemory !==
          "DDR4 / DDR5" &&
        ramMemory !==
          "DDR4 / DDR5" &&
        boardMemory !==
          ramMemory
      ) {
        reasons.push(
          `Selected motherboard requires ${boardMemory} memory.`,
        );
      }

      const capacity =
        getRamCapacityGb(item);

      const maxMemory =
        selection.motherboard
          .maxMemoryGb;

      if (
        capacity &&
        maxMemory &&
        capacity > maxMemory
      ) {
        reasons.push(
          `Selected motherboard supports up to ${maxMemory}GB of memory.`,
        );
      }
    }
  }

  /*
   * ----------------------------------------------------------
   * STORAGE
   *
   * Modern PCIe NVMe generations are backward compatible.
   * A Gen5 drive may operate at Gen4 speed on a Gen4 M.2 slot,
   * so we must NOT incorrectly mark it incompatible.
   * ----------------------------------------------------------
   */
  if (item.kind === "storage") {
    if (
      item.storageInterface ===
        "NVMe" &&
      chosenParts.has(
        "motherboard",
      ) &&
      selection.motherboard
        .m2Slots === 0
    ) {
      reasons.push(
        "Selected motherboard does not provide an M.2 NVMe slot.",
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * CPU COOLING
   * ----------------------------------------------------------
   */
  if (item.kind === "cooling") {
    if (chosenParts.has("cpu")) {
      const socket =
        getCpuSocket(
          selection.cpu,
        );

      if (
        socket &&
        !coolerSupportsSocket(
          item,
          socket,
        )
      ) {
        reasons.push(
          `Cooler does not support ${socket}.`,
        );
      }
    }

    if (
      chosenParts.has("case") &&
      item.radiatorSizeMm &&
      selection.case
        .supportedRadiatorSizes
        ?.length &&
      !selection.case
        .supportedRadiatorSizes
        .includes(
          item.radiatorSizeMm,
        )
    ) {
      reasons.push(
        `${item.radiatorSizeMm}mm radiator does not fit the selected case.`,
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * POWER SUPPLY
   * ----------------------------------------------------------
   */
  if (item.kind === "psu") {
    const required =
      getBuildRecommendedPsuW(
        selection,
        chosenParts,
      );

    if (
      required > 0 &&
      item.wattage &&
      item.wattage < required
    ) {
      reasons.push(
        `Selected CPU/GPU configuration requires approximately ${required}W or greater.`,
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * CASE
   * ----------------------------------------------------------
   */
  if (item.kind === "case") {
    if (
      chosenParts.has(
        "motherboard",
      ) &&
      !caseSupportsMotherboard(
        item,
        selection.motherboard,
      )
    ) {
      reasons.push(
        "Selected motherboard does not fit this case.",
      );
    }

    if (
      chosenParts.has("gpu") &&
      item.maxGpuLengthMm &&
      selection.gpu
        .gpuLengthMm &&
      selection.gpu.gpuLengthMm >
        item.maxGpuLengthMm
    ) {
      reasons.push(
        `Selected graphics card is too long for this case.`,
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * CASE FANS
   * ----------------------------------------------------------
   */
  if (item.kind === "fans") {
    if (
      chosenParts.has("case") &&
      item.fanSizeMm &&
      selection.case
        .supportedFanSizes
        ?.length &&
      !selection.case
        .supportedFanSizes
        .includes(
          item.fanSizeMm,
        )
    ) {
      reasons.push(
        `${item.fanSizeMm}mm fans are not supported by the selected case.`,
      );
    }
  }

  return {
    compatible:
      reasons.length === 0,
    reasons,
  };
}

/* ============================================================
   FILTER THE PICKER
============================================================ */

export function getCompatibleCatalogItems(
  kind: PcPartKind,
  selection: PcBuildSelection,
  chosenParts: Set<PcPartKind>,
) {
  return pcCatalog[kind].filter(
    (item) =>
      getPartCompatibility(
        item,
        selection,
        chosenParts,
      ).compatible,
  );
}

/* ============================================================
   VALIDATE ALREADY-CONFIRMED COMPONENTS
============================================================ */

function selectedPartIsCompatible(
  kind: PcPartKind,
  selection: PcBuildSelection,
  chosenParts: Set<PcPartKind>,
) {
  return getPartCompatibility(
    selection[kind],
    selection,
    chosenParts,
  ).compatible;
}

/*
 * When a major component changes, previously-confirmed pieces
 * that are no longer valid are automatically removed from the
 * customer's confirmed configuration.
 *
 * The product remains visible as a suggestion, but is no longer
 * counted toward 9/9 until the customer confirms a compatible
 * replacement.
 */
export function sanitizeChosenParts(
  selection: PcBuildSelection,
  chosenParts: Set<PcPartKind>,
  changedPart: PcPartKind,
) {
  const next =
    new Set(chosenParts);

  next.add(changedPart);

  /*
   * Several passes allow dependent invalidation.
   *
   * Example:
   * Intel board becomes invalid after selecting AMD CPU.
   * Board is removed.
   * RAM that depended on that board is then also unconfirmed.
   */
  for (
    let pass = 0;
    pass < 4;
    pass += 1
  ) {
    let changed = false;

    for (
      const kind of
        Array.from(next)
    ) {
      if (
        kind === changedPart
      ) {
        continue;
      }

      if (
        !selectedPartIsCompatible(
          kind,
          selection,
          next,
        )
      ) {
        next.delete(kind);
        changed = true;
      }
    }

    /*
     * RAM configuration is motherboard-dependent.
     */
    if (
      next.has("ram") &&
      !next.has("motherboard") &&
      changedPart === "cpu"
    ) {
      next.delete("ram");
      changed = true;
    }

    if (!changed) {
      break;
    }
  }

  return next;
}

/* ============================================================
   HUMAN-READABLE BUILD STATUS
============================================================ */

export function getCompatibilitySummary(
  selection: PcBuildSelection,
  chosenParts: Set<PcPartKind>,
) {
  const issues: Array<{
    kind: PcPartKind;
    reasons: string[];
  }> = [];

  for (
    const kind of
      Array.from(chosenParts)
  ) {
    const result =
      getPartCompatibility(
        selection[kind],
        selection,
        chosenParts,
      );

    if (!result.compatible) {
      issues.push({
        kind,
        reasons:
          result.reasons,
      });
    }
  }

  return {
    compatible:
      issues.length === 0,
    issues,
    recommendedPsuW:
      getBuildRecommendedPsuW(
        selection,
        chosenParts,
      ),
  };
}
