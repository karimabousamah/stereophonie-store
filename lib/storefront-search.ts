/*
 * Shared Stereophonie storefront search intelligence.
 *
 * This is intentionally independent from product/database types so the
 * live suggestion API and the submitted Shop catalogue use exactly the
 * same normalization, no-space matching and typo tolerance.
 */

export function normalizeStorefrontSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactSearchText(value: string) {
  return normalizeStorefrontSearchText(value).replace(/\s+/g, "");
}

function searchTokens(value: string) {
  return normalizeStorefrontSearchText(value)
    .split(" ")
    .filter(Boolean);
}

function editDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (!left) {
    return right.length;
  }

  if (!right) {
    return left.length;
  }

  const previous = Array.from(
    {
      length: right.length + 1,
    },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (
      let rightIndex = 1;
      rightIndex <= right.length;
      rightIndex += 1
    ) {
      const above = previous[rightIndex];
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + substitutionCost,
      );

      diagonal = above;
    }
  }

  return previous[right.length];
}

function allowedTypoDistance(length: number) {
  if (length <= 3) {
    return 0;
  }

  if (length <= 6) {
    return 1;
  }

  if (length <= 12) {
    return 2;
  }

  return 3;
}

function fuzzyTokenMatch(queryToken: string, candidateToken: string) {
  if (queryToken === candidateToken) {
    return true;
  }

  if (
    queryToken.length >= 3 &&
    candidateToken.startsWith(queryToken)
  ) {
    return true;
  }

  if (
    candidateToken.length >= 3 &&
    queryToken.startsWith(candidateToken)
  ) {
    return true;
  }

  const maxDistance = Math.min(
    allowedTypoDistance(queryToken.length),
    allowedTypoDistance(candidateToken.length),
  );

  if (maxDistance === 0) {
    return false;
  }

  if (Math.abs(queryToken.length - candidateToken.length) > maxDistance) {
    return false;
  }

  return editDistance(queryToken, candidateToken) <= maxDistance;
}

function allQueryTokensMatch(query: string, candidate: string) {
  const queryParts = searchTokens(query);
  const candidateParts = searchTokens(candidate);

  if (queryParts.length === 0 || candidateParts.length === 0) {
    return false;
  }

  return queryParts.every((queryToken) =>
    candidateParts.some((candidateToken) =>
      fuzzyTokenMatch(queryToken, candidateToken),
    ),
  );
}

function fuzzyCompactMatch(query: string, candidate: string) {
  const compactQuery = compactSearchText(query);
  const compactCandidate = compactSearchText(candidate);

  if (!compactQuery || !compactCandidate) {
    return false;
  }

  if (
    compactCandidate.includes(compactQuery) ||
    compactQuery.includes(compactCandidate)
  ) {
    return true;
  }

  const maxDistance = allowedTypoDistance(compactQuery.length);

  if (maxDistance === 0) {
    return false;
  }

  if (
    Math.abs(compactQuery.length - compactCandidate.length) <=
      maxDistance &&
    editDistance(compactQuery, compactCandidate) <= maxDistance
  ) {
    return true;
  }

  /*
   * A product name usually contains extra brand/model words.
   * Compare the query against similarly-sized windows of the
   * candidate so a typo does not require the entire product name
   * to have exactly the same length.
   */
  if (
    compactQuery.length >= 5 &&
    compactCandidate.length > compactQuery.length
  ) {
    const minimumWindow = Math.max(
      1,
      compactQuery.length - maxDistance,
    );

    const maximumWindow = Math.min(
      compactCandidate.length,
      compactQuery.length + maxDistance,
    );

    for (
      let windowLength = minimumWindow;
      windowLength <= maximumWindow;
      windowLength += 1
    ) {
      for (
        let offset = 0;
        offset + windowLength <= compactCandidate.length;
        offset += 1
      ) {
        const window = compactCandidate.slice(
          offset,
          offset + windowLength,
        );

        if (editDistance(compactQuery, window) <= maxDistance) {
          return true;
        }
      }
    }
  }

  return false;
}

export function storefrontSearchValueScore(value: string, query: string) {
  const normalizedValue = normalizeStorefrontSearchText(value);
  const normalizedQuery = normalizeStorefrontSearchText(query);

  if (!normalizedValue || !normalizedQuery) {
    return null;
  }

  const compactValue = compactSearchText(normalizedValue);
  const compactQuery = compactSearchText(normalizedQuery);

  if (normalizedValue === normalizedQuery) {
    return 0;
  }

  if (compactValue === compactQuery) {
    return 1;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 2;
  }

  if (compactValue.startsWith(compactQuery)) {
    return 3;
  }

  if (normalizedValue.includes(normalizedQuery)) {
    return 4;
  }

  if (compactValue.includes(compactQuery)) {
    return 5;
  }

  if (allQueryTokensMatch(normalizedQuery, normalizedValue)) {
    return 6;
  }

  if (fuzzyCompactMatch(normalizedQuery, normalizedValue)) {
    return 7;
  }

  return null;
}

export function storefrontSearchDirectProductMatch({
  name,
  brand = "",
  query,
}: {
  name: string;
  brand?: string;
  query: string;
}) {
  const normalizedQuery = normalizeStorefrontSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const normalizedName = normalizeStorefrontSearchText(name);
  const normalizedBrand = normalizeStorefrontSearchText(brand);

  if (!normalizedName) {
    return false;
  }

  /*
   * Direct storefront results are intentionally product-name led.
   *
   * Brand/category/description must never independently admit an
   * unrelated product. For example, "Apple AirPods" must not return
   * an iPad merely because both products have the Apple brand.
   *
   * When the query begins with the product brand, remove that brand
   * from the query and require the remaining product intent to match
   * the actual product name.
   */
  let productIntent = normalizedQuery;

  if (
    normalizedBrand &&
    normalizedQuery !== normalizedBrand &&
    normalizedQuery.startsWith(`${normalizedBrand} `)
  ) {
    productIntent = normalizedQuery
      .slice(normalizedBrand.length)
      .trim();
  }

  if (!productIntent) {
    return storefrontSearchValueScore(
      normalizedBrand,
      normalizedQuery,
    ) !== null;
  }

  return storefrontSearchValueScore(
    normalizedName,
    productIntent,
  ) !== null;
}
