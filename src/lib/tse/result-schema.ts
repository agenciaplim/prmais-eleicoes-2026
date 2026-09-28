import { z } from "zod";
import type { ElectionResult } from "./types";

const safeCountSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const percentageSchema = z.number().min(0).max(100);
const timestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => Number.isFinite(Date.parse(value)), "expected a valid ISO 8601 timestamp");

const ticketMemberSchema = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  fullName: z.string().min(1),
  party: z.string().min(1),
  role: z.enum(["vice", "first-alternate", "second-alternate"])
});

const substituteSchema = z.object({
  name: z.string().min(1),
  fullName: z.string().min(1),
  party: z.string().min(1)
});

const candidateSchema = z.object({
  id: z.string().regex(/^\d+$/),
  number: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  fullName: z.string().min(1),
  party: z.string().min(1),
  partyName: z.string().min(1),
  votes: safeCountSchema,
  percentage: percentageSchema,
  rank: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  elected: z.boolean(),
  status: z.enum([
    "pending",
    "elected",
    "elected-by-quotient",
    "elected-by-average",
    "not-elected",
    "runoff",
    "alternate"
  ]),
  destination: z.enum(["pending", "valid", "party-list", "annulled", "annulled-sub-judice"]),
  runningMates: z.array(ticketMemberSchema),
  substitutes: z.array(substituteSchema)
});

const nullableCountSchema = safeCountSchema.nullable();

export const electionResultSchema: z.ZodType<ElectionResult> = z.object({
  sourceId: z.string().regex(/^\d+$/),
  electionId: z.string().regex(/^\d+$/),
  round: z.union([z.literal(1), z.literal(2)]),
  phase: z.enum(["simulation", "official"]),
  scope: z.string().regex(/^(?:[A-Z]{2}|\d{4,5})$/),
  scopeType: z.enum(["country", "state", "municipality", "electoral-zone"]),
  office: z.enum(["president", "governor", "senator", "federal-deputy", "state-deputy"]),
  officeCode: z.string().regex(/^\d+$/),
  officeName: z.string().min(1),
  seats: safeCountSchema,
  electoralQuotient: nullableCountSchema,
  generatedAt: timestampSchema,
  updatedAt: timestampSchema,
  status: z.enum(["not-started", "in-progress", "finished"]),
  final: z.boolean(),
  progress: percentageSchema,
  sections: z.object({
    total: safeCountSchema,
    totalized: safeCountSchema,
    pending: safeCountSchema
  }),
  electorate: z.object({
    eligible: safeCountSchema,
    totalized: safeCountSchema,
    attendance: safeCountSchema,
    abstention: safeCountSchema
  }),
  votes: z.object({
    total: safeCountSchema,
    candidateVotes: safeCountSchema,
    valid: nullableCountSchema,
    nominal: nullableCountSchema,
    partyList: nullableCountSchema,
    annulled: nullableCountSchema,
    annulledSubJudice: nullableCountSchema,
    blank: safeCountSchema,
    nullVotes: safeCountSchema,
    regularNull: nullableCountSchema,
    technicalNull: safeCountSchema,
    canceledWithoutValidity: safeCountSchema,
    withoutAnnulment: safeCountSchema
  }),
  candidates: z.array(candidateSchema)
});
