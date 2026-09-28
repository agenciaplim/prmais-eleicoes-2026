export function validateTtl(ttlSeconds: number | undefined): void {
  if (ttlSeconds !== undefined && (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0)) {
    throw new RangeError("Cache TTL must be a positive integer number of seconds");
  }
}
