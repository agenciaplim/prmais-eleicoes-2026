import { timingSafeEqual } from "node:crypto";

const MIN_SECRET_LENGTH = 32;

export class CollectorAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectorAuthConfigError";
  }
}

export function collectorSecretFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env
): string {
  const secret = env.COLLECTOR_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new CollectorAuthConfigError(`COLLECTOR_SECRET must contain at least ${MIN_SECRET_LENGTH} characters`);
  }
  return secret;
}

export function isCollectorAuthorized(authorization: string | null, secret: string): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(authorization.slice("Bearer ".length), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
