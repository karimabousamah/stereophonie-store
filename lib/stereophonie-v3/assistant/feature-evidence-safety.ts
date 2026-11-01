/*
 * ST_ASSISTANT_NEGATIVE_FEATURE_EVIDENCE_V1
 *
 * Reject explicit negative or contradictory feature
 * statements before a fact can confirm a capability.
 *
 * This is a conservative safety guard, not a general
 * natural-language understanding engine. Uncertain
 * evidence must not be presented as confirmation.
 */

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function assistantFeatureExplicitlyNegated(
  factName: string,
  factValue: string,
  requestedFeature: string,
): boolean {
  const name = normalize(factName);
  const value = normalize(factValue);
  const feature = normalize(requestedFeature);

  const aliases: Record<string, string> = {
    wifi: "wi\\s*fi|wireless|wlan",
    "wi fi": "wi\\s*fi|wireless|wlan",
    wireless: "wi\\s*fi|wireless|wlan",
    bluetooth: "bluetooth",
    scan: "scan|scanner|scanning",
    scanning: "scan|scanner|scanning",
    scanner: "scan|scanner|scanning",
    copy: "copy|copying|copies|photocopy",
    copying: "copy|copying|copies|photocopy",
    duplex: "duplex|double\\s+sided|two\\s+sided",
  };

  const safeFeature =
    feature.replace(/[^a-z0-9 ]/g, "");

  const expression =
    aliases[feature] ??
    safeFeature.replace(/\s+/g, "\\s+");

  if (!expression) return false;

  const term = `(?:${expression})`;

  const mentioned = new RegExp(
    `\\b${term}\\b`,
  );

  if (
    !mentioned.test(name) &&
    !mentioned.test(value)
  ) {
    return false;
  }

  if (
    /^(?:no|none|false|off|disabled|unsupported|not supported|unavailable|not available|absent|not included|n a)$/.test(
      value,
    )
  ) {
    return true;
  }

  const negativeBefore = new RegExp(
    `\\b(?:no|without|not|never|lacks?|unsupported|disabled|unavailable)\\b.{0,36}\\b${term}\\b`,
  );

  const negativeAfter = new RegExp(
    `\\b${term}\\b.{0,32}\\b(?:no|false|not|unsupported|disabled|unavailable|absent|off)\\b`,
  );

  if (
    negativeBefore.test(value) ||
    negativeAfter.test(value) ||
    negativeBefore.test(name) ||
    negativeAfter.test(name)
  ) {
    return true;
  }

  if (
    mentioned.test(name) &&
    (
      /^(?:optional|requires|not included)\b/.test(value) ||
      /^(?:usb|wired|ethernet)\b.*\bonly\b/.test(value) ||
      /\bonly\b.*\b(?:usb|wired|ethernet)\b/.test(value)
    )
  ) {
    return true;
  }

  return false;
}
