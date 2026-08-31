export const NEW_DROP_DURATION_DAYS = 7;

export const NEW_DROP_DURATION_MS =
  NEW_DROP_DURATION_DAYS * 24 * 60 * 60 * 1000;

export function newDropExpiration(startedAt: string | null | undefined) {
  if (!startedAt) {
    return null;
  }

  const started = new Date(startedAt).getTime();

  if (!Number.isFinite(started)) {
    return null;
  }

  return started + NEW_DROP_DURATION_MS;
}

export function isNewDropActive(
  startedAt: string | null | undefined,
  now = Date.now(),
) {
  const expiration = newDropExpiration(startedAt);

  if (expiration === null) {
    return false;
  }

  const started = new Date(startedAt!).getTime();

  return now >= started && now < expiration;
}

export function newDropRemainingMs(
  startedAt: string | null | undefined,
  now = Date.now(),
) {
  const expiration = newDropExpiration(startedAt);

  if (expiration === null) {
    return 0;
  }

  return Math.max(0, expiration - now);
}
