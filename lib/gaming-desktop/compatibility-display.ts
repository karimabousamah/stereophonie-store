import type { PcPart, PcPartKind } from "@/lib/gaming-desktop/catalog";

type Selection = Partial<Record<PcPartKind, PcPart>>;

type LoosePart = PcPart & Record<string, unknown>;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function upper(value: unknown) {
  return text(value).toUpperCase();
}

function numberValue(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(text).filter(Boolean);
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(numberValue)
    .filter((value): value is number => value !== null);
}

function metadata(part: PcPart | undefined): LoosePart | null {
  return part ? (part as LoosePart) : null;
}

function getSocket(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return "";
  }

  const direct = upper(p.socket);

  if (direct) {
    return direct;
  }

  const haystack = upper([p.model, p.detail].join(" "));

  for (const socket of ["LGA1851", "LGA1700", "LGA1200", "AM5", "AM4"]) {
    if (haystack.includes(socket)) {
      return socket;
    }
  }

  return "";
}

function getMemoryType(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return "";
  }

  const direct = upper(p.memory);

  if (direct.includes("DDR4") && direct.includes("DDR5")) {
    return "DDR4 / DDR5";
  }

  if (direct.includes("DDR5")) {
    return "DDR5";
  }

  if (direct.includes("DDR4")) {
    return "DDR4";
  }

  const haystack = upper([p.model, p.detail].join(" "));

  if (haystack.includes("DDR5")) {
    return "DDR5";
  }

  if (haystack.includes("DDR4")) {
    return "DDR4";
  }

  /*
   * Platform-level inference where the platform
   * has only one mainstream memory generation.
   */
  const socket = getSocket(part);

  if (socket === "AM5" || socket === "LGA1851") {
    return "DDR5";
  }

  if (socket === "AM4" || socket === "LGA1200") {
    return "DDR4";
  }

  return "";
}

function memoriesMatch(first: string, second: string) {
  if (!first || !second) {
    return true;
  }

  if (first === "DDR4 / DDR5" || second === "DDR4 / DDR5") {
    return true;
  }

  return first === second;
}

function getRamCapacity(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return null;
  }

  const explicit = numberValue(p.capacityGb ?? p.memoryCapacityGb);

  if (explicit !== null) {
    return explicit;
  }

  const match = `${p.model} ${p.detail}`.match(/(\d+)\s*GB/i);

  return match ? Number(match[1]) : null;
}

function getMaxMemory(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return null;
  }

  return numberValue(p.maxMemoryGb ?? p.maxMemoryCapacityGb);
}

function getPsuWattage(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return null;
  }

  const explicit = numberValue(p.wattage);

  if (explicit !== null) {
    return explicit;
  }

  const match = `${p.model} ${p.detail}`.match(/(\d{3,4})\s*W\b/i);

  return match ? Number(match[1]) : null;
}

function inferGpuPsu(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return 0;
  }

  const explicit = numberValue(p.minPsuWattage ?? p.recommendedPsuWattage);

  if (explicit !== null) {
    return explicit;
  }

  const model = upper(p.model);

  const rules: Array<readonly [string, number]> = [
    ["RTX 5090", 1000],
    ["RTX 4090", 850],
    ["RTX 5080", 850],
    ["RTX 4080", 750],
    ["RTX 5070 TI", 750],
    ["RTX 4070 TI", 700],
    ["RTX 5070", 650],
    ["RTX 4070", 650],
    ["RTX 4060", 550],
    ["RTX 3090 TI", 850],
    ["RTX 3090", 750],
    ["RTX 3080", 750],
    ["RTX 3070 TI", 650],
    ["RTX 3070", 650],
    ["RTX 3060 TI", 600],
    ["RTX 3060", 550],
    ["RTX 3050", 500],

    ["RX 9070 XT", 750],
    ["RX 9070", 650],
    ["RX 7900 XTX", 800],
    ["RX 7900 XT", 750],
    ["RX 7900 GRE", 700],
    ["RX 7800 XT", 700],
    ["RX 7700 XT", 700],
    ["RX 7600", 550],
    ["RX 6950 XT", 850],
    ["RX 6900 XT", 850],
    ["RX 6800 XT", 750],
    ["RX 6800", 650],
    ["RX 6750 XT", 650],
    ["RX 6700 XT", 650],
    ["RX 6600", 500],

    ["ARC B580", 600],
    ["ARC B570", 600],
    ["ARC A770", 650],
    ["ARC A750", 600],
  ];

  for (const [token, wattage] of rules) {
    if (model.includes(token)) {
      return wattage;
    }
  }

  return 0;
}

function getSupportedSockets(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return [];
  }

  return stringArray(p.supportedSockets ?? p.sockets).map(upper);
}

function getFormFactor(part: PcPart | undefined) {
  const p = metadata(part);

  return p ? upper(p.formFactor) : "";
}

function getSupportedFormFactors(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return [];
  }

  return stringArray(p.supportedFormFactors).map(upper);
}

function getGpuLength(part: PcPart | undefined) {
  const p = metadata(part);

  return p ? numberValue(p.gpuLengthMm) : null;
}

function getCaseGpuClearance(part: PcPart | undefined) {
  const p = metadata(part);

  return p ? numberValue(p.maxGpuLengthMm) : null;
}

function getRadiatorSize(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return null;
  }

  const explicit = numberValue(p.radiatorSizeMm);

  if (explicit !== null) {
    return explicit;
  }

  const match = `${p.model} ${p.detail}`.match(
    /\b(120|140|240|280|360|420|480)\s*mm\b/i,
  );

  return match ? Number(match[1]) : null;
}

function getSupportedRadiators(part: PcPart | undefined) {
  const p = metadata(part);

  return p ? numberArray(p.supportedRadiatorSizes) : [];
}

function getFanSize(part: PcPart | undefined) {
  const p = metadata(part);

  if (!p) {
    return null;
  }

  const explicit = numberValue(p.fanSizeMm);

  if (explicit !== null) {
    return explicit;
  }

  const match = `${p.model} ${p.detail}`.match(/\b(120|140|180|200)\s*mm\b/i);

  return match ? Number(match[1]) : null;
}

function getSupportedFanSizes(part: PcPart | undefined) {
  const p = metadata(part);

  return p ? numberArray(p.supportedFanSizes) : [];
}

export function explainPartCompatibility(
  candidate: PcPart,
  selection: Selection,
  chosenParts: Iterable<PcPartKind>,
): string | null {
  const chosen = new Set(chosenParts);

  const cpu = chosen.has("cpu") ? selection.cpu : undefined;

  const motherboard = chosen.has("motherboard")
    ? selection.motherboard
    : undefined;

  const ram = chosen.has("ram") ? selection.ram : undefined;

  const gpu = chosen.has("gpu") ? selection.gpu : undefined;

  const psu = chosen.has("psu") ? selection.psu : undefined;

  const cooler = chosen.has("cooling") ? selection.cooling : undefined;

  const pcCase = chosen.has("case") ? selection.case : undefined;

  const fans = chosen.has("fans") ? selection.fans : undefined;

  /* ----------------------------------------------------------
     CPU / MOTHERBOARD SOCKET
  ---------------------------------------------------------- */

  if (candidate.kind === "motherboard" && cpu) {
    const cpuSocket = getSocket(cpu);

    const boardSocket = getSocket(candidate);

    if (cpuSocket && boardSocket && cpuSocket !== boardSocket) {
      return (
        `Doesn't work with your selected processor — ` +
        `${cpu.brand} ${cpu.model} requires ${cpuSocket}.`
      );
    }
  }

  if (candidate.kind === "cpu" && motherboard) {
    const cpuSocket = getSocket(candidate);

    const boardSocket = getSocket(motherboard);

    if (cpuSocket && boardSocket && cpuSocket !== boardSocket) {
      return (
        `Doesn't work with your selected motherboard — ` +
        `${motherboard.model} uses ${boardSocket}.`
      );
    }
  }

  /* ----------------------------------------------------------
     RAM / MOTHERBOARD MEMORY GENERATION
  ---------------------------------------------------------- */

  if (candidate.kind === "ram" && motherboard) {
    const ramType = getMemoryType(candidate);

    const boardMemory = getMemoryType(motherboard);

    if (!memoriesMatch(ramType, boardMemory)) {
      return (
        `Doesn't work with your selected motherboard — ` +
        `${motherboard.model} uses ${boardMemory}.`
      );
    }

    const capacity = getRamCapacity(candidate);

    const maximum = getMaxMemory(motherboard);

    if (capacity !== null && maximum !== null && capacity > maximum) {
      return (
        `Too much memory for your selected motherboard — ` +
        `maximum supported capacity is ${maximum}GB.`
      );
    }
  }

  if (candidate.kind === "motherboard" && ram) {
    const boardMemory = getMemoryType(candidate);

    const ramType = getMemoryType(ram);

    if (!memoriesMatch(boardMemory, ramType)) {
      return (
        `Doesn't work with your selected memory — ` +
        `${ram.model} is ${ramType}.`
      );
    }

    const capacity = getRamCapacity(ram);

    const maximum = getMaxMemory(candidate);

    if (capacity !== null && maximum !== null && capacity > maximum) {
      return (
        `Doesn't support your selected ${capacity}GB memory kit — ` +
        `this board supports up to ${maximum}GB.`
      );
    }
  }

  /* ----------------------------------------------------------
     CPU COOLER SOCKET
  ---------------------------------------------------------- */

  if (candidate.kind === "cooling" && cpu) {
    const socket = getSocket(cpu);

    const supported = getSupportedSockets(candidate);

    if (socket && supported.length > 0 && !supported.includes(socket)) {
      return (
        `Doesn't fit your selected processor platform — ` +
        `${cpu.model} uses ${socket}.`
      );
    }
  }

  if (candidate.kind === "cpu" && cooler) {
    const socket = getSocket(candidate);

    const supported = getSupportedSockets(cooler);

    if (socket && supported.length > 0 && !supported.includes(socket)) {
      return (
        `Doesn't work with your selected CPU cooler — ` +
        `${cooler.model} doesn't support ${socket}.`
      );
    }
  }

  /* ----------------------------------------------------------
     PSU / GPU
  ---------------------------------------------------------- */

  if (candidate.kind === "psu" && gpu) {
    const required = inferGpuPsu(gpu);

    const available = getPsuWattage(candidate);

    if (required > 0 && available !== null && available < required) {
      return (
        `Not enough power for your selected graphics card — ` +
        `${gpu.model} needs approximately ${required}W or more.`
      );
    }
  }

  if (candidate.kind === "gpu" && psu) {
    const required = inferGpuPsu(candidate);

    const available = getPsuWattage(psu);

    if (required > 0 && available !== null && available < required) {
      return (
        `Doesn't work with your selected power supply — ` +
        `this graphics card needs approximately ${required}W or more.`
      );
    }
  }

  /* ----------------------------------------------------------
     CASE / MOTHERBOARD
  ---------------------------------------------------------- */

  if (candidate.kind === "case" && motherboard) {
    const boardForm = getFormFactor(motherboard);

    const supported = getSupportedFormFactors(candidate);

    if (boardForm && supported.length > 0 && !supported.includes(boardForm)) {
      return (
        `Doesn't fit your selected motherboard — ` +
        `${motherboard.model} is ${boardForm}.`
      );
    }
  }

  if (candidate.kind === "motherboard" && pcCase) {
    const boardForm = getFormFactor(candidate);

    const supported = getSupportedFormFactors(pcCase);

    if (boardForm && supported.length > 0 && !supported.includes(boardForm)) {
      return (
        `Doesn't fit your selected PC case — ` +
        `${candidate.model} is ${boardForm}.`
      );
    }
  }

  /* ----------------------------------------------------------
     CASE / GPU LENGTH
  ---------------------------------------------------------- */

  if (candidate.kind === "case" && gpu) {
    const gpuLength = getGpuLength(gpu);

    const clearance = getCaseGpuClearance(candidate);

    if (gpuLength !== null && clearance !== null && gpuLength > clearance) {
      return (
        `Your selected graphics card is too long for this case — ` +
        `${gpuLength}mm GPU vs ${clearance}mm clearance.`
      );
    }
  }

  if (candidate.kind === "gpu" && pcCase) {
    const gpuLength = getGpuLength(candidate);

    const clearance = getCaseGpuClearance(pcCase);

    if (gpuLength !== null && clearance !== null && gpuLength > clearance) {
      return (
        `Doesn't fit your selected PC case — ` +
        `${gpuLength}mm card vs ${clearance}mm GPU clearance.`
      );
    }
  }

  /* ----------------------------------------------------------
     CASE / RADIATOR
  ---------------------------------------------------------- */

  if (candidate.kind === "case" && cooler) {
    const radiator = getRadiatorSize(cooler);

    const supported = getSupportedRadiators(candidate);

    if (
      radiator !== null &&
      supported.length > 0 &&
      !supported.includes(radiator)
    ) {
      return (
        `Doesn't support your selected CPU cooler — ` +
        `${radiator}mm radiator isn't supported by this case.`
      );
    }
  }

  if (candidate.kind === "cooling" && pcCase) {
    const radiator = getRadiatorSize(candidate);

    const supported = getSupportedRadiators(pcCase);

    if (
      radiator !== null &&
      supported.length > 0 &&
      !supported.includes(radiator)
    ) {
      return (
        `Doesn't fit your selected PC case — ` +
        `${radiator}mm radiator isn't supported.`
      );
    }
  }

  /* ----------------------------------------------------------
     CASE / FAN SIZE
  ---------------------------------------------------------- */

  if (candidate.kind === "fans" && pcCase) {
    const fanSize = getFanSize(candidate);

    const supported = getSupportedFanSizes(pcCase);

    if (
      fanSize !== null &&
      supported.length > 0 &&
      !supported.includes(fanSize)
    ) {
      return (
        `Doesn't fit your selected PC case — ` +
        `${fanSize}mm fans aren't supported.`
      );
    }
  }

  if (candidate.kind === "case" && fans) {
    const fanSize = getFanSize(fans);

    const supported = getSupportedFanSizes(candidate);

    if (
      fanSize !== null &&
      supported.length > 0 &&
      !supported.includes(fanSize)
    ) {
      return (
        `Doesn't support your selected case fans — ` +
        `${fanSize}mm fans aren't supported.`
      );
    }
  }

  return null;
}
