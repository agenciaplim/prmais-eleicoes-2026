import { compactVerify, decodeProtectedHeader, importJWK, type JWK } from "jose";
import { parseTseJson, type TsePayloadByKind, type TsePayloadKind } from "./parser";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
const MAX_CONFIGURED_TIMEOUT_MS = 30_000;
const MAX_CONFIGURED_PAYLOAD_BYTES = 20 * 1024 * 1024;

const allowedSources = {
  "https://resultados.tse.jus.br": /^oficial$/,
  "https://resultados-sim.tse.jus.br/simulado": /^simulado\d{4}$/
} as const;

const trustedJwks = {
  s: {
    kty: "OKP",
    use: "sig",
    key_ops: ["verify"],
    alg: "EdDSA",
    kid: "pEGrlis0i8vO2Bz7Ergwr0MnKfg",
    crv: "Ed25519",
    x: "81fm_gXW6Q5gBWrGJkE7j5MOS5vmTnRqqFHfdMeRbsw"
  },
  o: {
    kty: "OKP",
    use: "sig",
    key_ops: ["verify"],
    alg: "EdDSA",
    kid: "sNbt9Q_fLS65zE1_ZLNV-XRRwPY",
    crv: "Ed25519",
    x: "kWlpNHjuws1csyQZwzn3Fhzbi3RD435RbpThtSr4hMc"
  }
} as const satisfies Record<"s" | "o", JWK & { kid: string }>;

type ElectionFileRequest = {
  cycle: string;
  electionId: string;
};

export type Ea20Scope =
  | { type: "country" }
  | { type: "state"; uf: string }
  | { type: "municipality"; uf: string; municipalityCode: string }
  | { type: "electoral-zone"; uf: string; municipalityCode: string; zoneCode: string };

export type TseFileRequest =
  | { kind: "EA11" }
  | ({ kind: "EA12" } & ElectionFileRequest)
  | ({ kind: "EA14" } & ElectionFileRequest)
  | ({ kind: "EA15"; uf: string } & ElectionFileRequest)
  | ({ kind: "EA20"; officeCode: string; scope: Ea20Scope } & ElectionFileRequest);

export type TseClientConfig = {
  baseUrl: string;
  environment: string;
  timeoutMs?: number;
  maxPayloadBytes?: number;
  jwsMode?: "required" | "disabled";
};

export type TseFetchErrorCode =
  | "INVALID_CONFIG"
  | "INVALID_REQUEST"
  | "HTTP_ERROR"
  | "INVALID_CONTENT_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "EMPTY_RESPONSE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_SIGNATURE"
  | "REQUEST_MISMATCH";

export class TseFetchError extends Error {
  readonly code: TseFetchErrorCode;
  readonly status: number | null;

  constructor(code: TseFetchErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "TseFetchError";
    this.code = code;
    this.status = status;
  }
}

type FetchImplementation = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type NormalizedConfig = {
  baseUrl: string;
  environment: string;
  expectedPhase: "s" | "o";
  timeoutMs: number;
  maxPayloadBytes: number;
  jwsMode: "required" | "disabled";
};

function invalidConfig(message: string): never {
  throw new TseFetchError("INVALID_CONFIG", message);
}

function normalizeBaseUrl(rawBaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawBaseUrl);
  } catch {
    return invalidConfig("TSE base URL is invalid");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    return invalidConfig("TSE base URL must be an HTTPS source without credentials, query, or fragment");
  }

  const path = url.pathname.replace(/\/+$/, "");
  const normalized = `${url.origin}${path}`;
  if (!(normalized in allowedSources)) {
    return invalidConfig("TSE base URL is not in the allowlist");
  }

  return normalized;
}

function normalizeConfig(config: TseClientConfig): NormalizedConfig {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const environmentPattern = allowedSources[baseUrl as keyof typeof allowedSources];

  if (!environmentPattern.test(config.environment)) {
    return invalidConfig("TSE environment does not match the configured source");
  }

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxPayloadBytes = config.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  const jwsMode = config.jwsMode ?? "disabled";

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_CONFIGURED_TIMEOUT_MS) {
    return invalidConfig(`TSE timeout must be between 1 and ${MAX_CONFIGURED_TIMEOUT_MS} milliseconds`);
  }

  if (!Number.isInteger(maxPayloadBytes) || maxPayloadBytes <= 0 || maxPayloadBytes > MAX_CONFIGURED_PAYLOAD_BYTES) {
    return invalidConfig(`TSE payload limit must be between 1 and ${MAX_CONFIGURED_PAYLOAD_BYTES} bytes`);
  }

  if (jwsMode !== "required" && jwsMode !== "disabled") {
    return invalidConfig("TSE JWS mode must be required or disabled");
  }

  return {
    baseUrl,
    environment: config.environment,
    expectedPhase: config.environment === "oficial" ? "o" : "s",
    timeoutMs,
    maxPayloadBytes,
    jwsMode
  };
}

function assertPattern(value: string, pattern: RegExp, label: string): void {
  if (!pattern.test(value)) {
    throw new TseFetchError("INVALID_REQUEST", `${label} has an invalid format`);
  }
}

function normalizeUf(uf: string): string {
  assertPattern(uf, /^[a-z]{2}$/i, "UF");
  return uf.toLowerCase();
}

function normalizeNumericId(value: string, maxDigits: number, label: string): string {
  assertPattern(value, new RegExp(`^\\d{1,${maxDigits}}$`), label);
  return BigInt(value).toString();
}

function electionPath(request: ElectionFileRequest): { directoryId: string; fileId: string } {
  assertPattern(request.cycle, /^ele\d{4}$/, "cycle");
  const directoryId = normalizeNumericId(request.electionId, 6, "election ID");
  return { directoryId, fileId: directoryId.padStart(6, "0") };
}

function buildPath(request: TseFileRequest): string {
  if (request.kind === "EA11") return "comum/config/ele-c.json";

  const { directoryId, fileId } = electionPath(request);
  const prefix = `${request.cycle}/${directoryId}`;

  if (request.kind === "EA12") return `${prefix}/config/mun-e${fileId}-cm.json`;
  if (request.kind === "EA14") return `${prefix}/dados/br/br-e${fileId}-ab.json`;

  if (request.kind === "EA15") {
    const uf = normalizeUf(request.uf);
    return `${prefix}/dados/${uf}/${uf}-e${fileId}-ab.json`;
  }

  const officeCode = normalizeNumericId(request.officeCode, 4, "office code").padStart(4, "0");
  let directory: string;
  let filePrefix: string;

  switch (request.scope.type) {
    case "country":
      directory = "br";
      filePrefix = "br";
      break;
    case "state": {
      const uf = normalizeUf(request.scope.uf);
      directory = uf;
      filePrefix = uf;
      break;
    }
    case "municipality": {
      const uf = normalizeUf(request.scope.uf);
      assertPattern(request.scope.municipalityCode, /^\d{5}$/, "municipality code");
      directory = uf;
      filePrefix = `${uf}${request.scope.municipalityCode}`;
      break;
    }
    case "electoral-zone": {
      const uf = normalizeUf(request.scope.uf);
      assertPattern(request.scope.municipalityCode, /^\d{5}$/, "municipality code");
      assertPattern(request.scope.zoneCode, /^\d{4}$/, "electoral zone code");
      directory = uf;
      filePrefix = `${uf}${request.scope.municipalityCode}-z${request.scope.zoneCode}`;
      break;
    }
  }

  return `${prefix}/dados/${directory}/${filePrefix}-c${officeCode}-e${fileId}-u.json`;
}

function expectedScope(scope: Ea20Scope): { type: "br" | "uf" | "mu" | "zona"; code: string } {
  switch (scope.type) {
    case "country":
      return { type: "br", code: "br" };
    case "state":
      return { type: "uf", code: normalizeUf(scope.uf) };
    case "municipality":
      return { type: "mu", code: scope.municipalityCode };
    case "electoral-zone":
      return { type: "zona", code: scope.zoneCode };
  }
}

function assertPayloadMatchesRequest(
  request: TseFileRequest,
  payload: TsePayloadByKind[TsePayloadKind],
  expectedPhase: "s" | "o"
): void {
  if (payload.f !== expectedPhase) {
    throw new TseFetchError("REQUEST_MISMATCH", "TSE payload phase does not match the requested environment");
  }

  if (request.kind === "EA11" || request.kind === "EA12") return;

  const expectedElection = normalizeNumericId(request.electionId, 6, "election ID");
  if (!("ele" in payload) || payload.ele !== expectedElection) {
    throw new TseFetchError("REQUEST_MISMATCH", "TSE payload election does not match the request");
  }

  if (request.kind === "EA14") {
    const ea14 = payload as TsePayloadByKind["EA14"];
    if (!ea14.abr.some((scope) => scope.tpabr === "br" && scope.cdabr === "br")) {
      throw new TseFetchError("REQUEST_MISMATCH", "TSE payload does not contain the Brazil scope");
    }
    return;
  }

  if (request.kind === "EA15") {
    const uf = normalizeUf(request.uf);
    const ea15 = payload as TsePayloadByKind["EA15"];
    if (!ea15.abr.some((scope) => scope.tpabr === "uf" && scope.cdabr === uf)) {
      throw new TseFetchError("REQUEST_MISMATCH", "TSE payload does not contain the requested UF");
    }
    return;
  }

  const ea20 = payload as TsePayloadByKind["EA20"];
  const scope = expectedScope(request.scope);
  if (ea20.tpabr !== scope.type || ea20.cdabr !== scope.code) {
    throw new TseFetchError("REQUEST_MISMATCH", "TSE payload scope does not match the request");
  }

  const officeCode = normalizeNumericId(request.officeCode, 4, "office code");
  if (!ea20.carg || ea20.carg.some((office) => office.cd !== officeCode)) {
    throw new TseFetchError("REQUEST_MISMATCH", "TSE payload office does not match the request");
  }
}

async function readLimitedBody(response: Response, maxPayloadBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      throw new TseFetchError("PAYLOAD_TOO_LARGE", "TSE response has an invalid content length");
    }
    if (declaredLength > maxPayloadBytes) {
      throw new TseFetchError("PAYLOAD_TOO_LARGE", "TSE response exceeds the payload limit");
    }
  }

  if (!response.body) {
    throw new TseFetchError("EMPTY_RESPONSE", "TSE response has no body");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxPayloadBytes) {
        await reader.cancel();
        throw new TseFetchError("PAYLOAD_TOO_LARGE", "TSE response exceeds the payload limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (size === 0) {
    throw new TseFetchError("EMPTY_RESPONSE", "TSE response body is empty");
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new TseFetchError("NETWORK_ERROR", "TSE response is not valid UTF-8");
  }
}

async function verifyWithKey(jws: string, jwk: JWK & { kid: string }, key: CryptoKey): Promise<string> {
  let header: ReturnType<typeof decodeProtectedHeader>;
  try {
    header = decodeProtectedHeader(jws);
  } catch {
    throw new TseFetchError("INVALID_SIGNATURE", "TSE JWS has an invalid protected header");
  }

  if (header.alg !== "EdDSA" || header.kid !== jwk.kid) {
    throw new TseFetchError("INVALID_SIGNATURE", "TSE JWS algorithm or key identifier is not trusted");
  }

  try {
    const verified = await compactVerify(jws, key, { algorithms: ["EdDSA"] });
    return new TextDecoder("utf-8", { fatal: true }).decode(verified.payload);
  } catch {
    throw new TseFetchError("INVALID_SIGNATURE", "TSE JWS signature verification failed");
  }
}

export async function verifyCompactJws(jws: string, jwk: JWK & { kid: string }): Promise<string> {
  let key: CryptoKey;
  try {
    key = (await importJWK(jwk, "EdDSA")) as CryptoKey;
  } catch {
    throw new TseFetchError("INVALID_CONFIG", "TSE JWS public key is invalid");
  }
  return verifyWithKey(jws.trim(), jwk, key);
}

function envInteger(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    return invalidConfig(`${name} must be a positive integer no greater than ${maximum}`);
  }
  return value;
}

export function tseClientConfigFromEnv(): TseClientConfig {
  if (process.env.TSE_ENV !== "remote") {
    return invalidConfig("Remote TSE access requires TSE_ENV=remote");
  }

  const baseUrl = process.env.TSE_BASE_URL;
  const environment = process.env.TSE_RESULTS_ENV;
  if (!baseUrl || !environment) {
    return invalidConfig("TSE_BASE_URL and TSE_RESULTS_ENV are required for remote access");
  }

  const jwsMode = process.env.TSE_JWS_MODE ?? "required";
  if (jwsMode !== "required" && jwsMode !== "disabled") {
    return invalidConfig("TSE_JWS_MODE must be required or disabled");
  }

  return {
    baseUrl,
    environment,
    timeoutMs: envInteger("TSE_FETCH_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, MAX_CONFIGURED_TIMEOUT_MS),
    maxPayloadBytes: envInteger(
      "TSE_MAX_PAYLOAD_BYTES",
      DEFAULT_MAX_PAYLOAD_BYTES,
      MAX_CONFIGURED_PAYLOAD_BYTES
    ),
    jwsMode
  };
}

export function createTseClient(config: TseClientConfig, fetchImplementation: FetchImplementation = fetch) {
  if (typeof window !== "undefined") {
    return invalidConfig("The TSE client can only run on the server");
  }

  const normalizedConfig = normalizeConfig(config);
  const trustedJwk = trustedJwks[normalizedConfig.expectedPhase];
  const verificationKey =
    normalizedConfig.jwsMode === "required"
      ? importJWK(trustedJwk, "EdDSA").catch(() => {
          throw new TseFetchError("INVALID_CONFIG", "TSE JWS public key is invalid");
        })
      : null;

  function buildUrl(request: TseFileRequest): URL {
    const jsonPath = buildPath(request);
    const path = normalizedConfig.jwsMode === "required" ? jsonPath.replace(/\.json$/, ".jws") : jsonPath;
    return new URL(`${normalizedConfig.baseUrl}/${normalizedConfig.environment}/${path}`);
  }

  async function fetchPayload<K extends TsePayloadKind>(
    request: Extract<TseFileRequest, { kind: K }>
  ): Promise<TsePayloadByKind[K]> {
    const url = buildUrl(request);
    const timeoutSignal = AbortSignal.timeout(normalizedConfig.timeoutMs);
    let response: Response;

    try {
      response = await fetchImplementation(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        redirect: "error",
        cache: "no-store",
        credentials: "omit",
        signal: timeoutSignal
      });
    } catch {
      if (timeoutSignal.aborted) {
        throw new TseFetchError("TIMEOUT", "TSE request timed out");
      }
      throw new TseFetchError("NETWORK_ERROR", "TSE request failed");
    }

    if (!response.ok) {
      throw new TseFetchError("HTTP_ERROR", `TSE returned HTTP ${response.status}`, response.status);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!/^(?:application|text)\/json(?:\s*;|$)/.test(contentType)) {
      throw new TseFetchError("INVALID_CONTENT_TYPE", "TSE response is not JSON");
    }

    let json: string;
    try {
      json = await readLimitedBody(response, normalizedConfig.maxPayloadBytes);
    } catch (error) {
      if (error instanceof TseFetchError) throw error;
      if (timeoutSignal.aborted) {
        throw new TseFetchError("TIMEOUT", "TSE request timed out while reading the response");
      }
      throw new TseFetchError("NETWORK_ERROR", "TSE response could not be read");
    }

    const verifiedJson = verificationKey
      ? await verifyWithKey(json.trim(), trustedJwk, (await verificationKey) as CryptoKey)
      : json;
    const payload = parseTseJson(request.kind, verifiedJson);
    assertPayloadMatchesRequest(request, payload, normalizedConfig.expectedPhase);
    return payload;
  }

  return { buildUrl, fetchPayload };
}

export type TseClient = ReturnType<typeof createTseClient>;
