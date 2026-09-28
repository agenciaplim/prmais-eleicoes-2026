import type { ZodIssue, ZodType } from "zod";
import {
  ea11Schema,
  ea12Schema,
  ea14Schema,
  ea15Schema,
  ea20Schema,
  type Ea11Payload,
  type Ea12Payload,
  type Ea14Payload,
  type Ea15Payload,
  type Ea20Payload
} from "./schemas";

export type TsePayloadKind = "EA11" | "EA12" | "EA14" | "EA15" | "EA20";

export type TsePayloadByKind = {
  EA11: Ea11Payload;
  EA12: Ea12Payload;
  EA14: Ea14Payload;
  EA15: Ea15Payload;
  EA20: Ea20Payload;
};

const schemas: Record<TsePayloadKind, ZodType> = {
  EA11: ea11Schema,
  EA12: ea12Schema,
  EA14: ea14Schema,
  EA15: ea15Schema,
  EA20: ea20Schema
};

export class TsePayloadError extends Error {
  readonly code: "INVALID_JSON" | "INVALID_SCHEMA";
  readonly kind: TsePayloadKind;
  readonly issues: readonly ZodIssue[];

  constructor(
    kind: TsePayloadKind,
    code: "INVALID_JSON" | "INVALID_SCHEMA",
    issues: readonly ZodIssue[] = []
  ) {
    const detail = code === "INVALID_JSON" ? "invalid JSON" : `${issues.length} schema issue(s)`;
    super(`${kind} payload rejected: ${detail}`);
    this.name = "TsePayloadError";
    this.kind = kind;
    this.code = code;
    this.issues = issues;
  }
}

export function parseTsePayload<K extends TsePayloadKind>(kind: K, input: unknown): TsePayloadByKind[K] {
  const result = schemas[kind].safeParse(input);
  if (!result.success) {
    throw new TsePayloadError(kind, "INVALID_SCHEMA", result.error.issues);
  }

  return result.data as TsePayloadByKind[K];
}

export function parseTseJson<K extends TsePayloadKind>(kind: K, json: string): TsePayloadByKind[K] {
  let input: unknown;

  try {
    input = JSON.parse(json) as unknown;
  } catch {
    throw new TsePayloadError(kind, "INVALID_JSON");
  }

  return parseTsePayload(kind, input);
}
