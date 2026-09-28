import { z } from "zod";
import {
  dateStringSchema,
  generatedFileFields,
  identifierStringSchema,
  turnSchema
} from "./common";

const fileDirectorySchema = z.object({
  tp: z.string().min(1).max(10),
  dir: z.string().min(1).max(500).regex(/^<base>\//, "directory template must start with <base>/")
});

const officeSchema = z.object({
  cd: identifierStringSchema,
  ds: z.string().min(1).max(200),
  tp: identifierStringSchema
});

const abbreviatedMunicipalitySchema = z.object({
  cd: z.string().regex(/^\d{5}$/),
  cdi: z.union([z.string().regex(/^\d{7}$/), z.literal("")])
});

const electionScopeSchema = z.object({
  cd: z.union([z.literal("br"), z.string().regex(/^[a-z]{2}$/)]),
  cp: z.array(officeSchema).min(1),
  mu: z.array(abbreviatedMunicipalitySchema).optional()
});

const electionSchema = z.object({
  cd: identifierStringSchema,
  cdt2: z.union([identifierStringSchema, z.literal("")]).optional(),
  sqele: identifierStringSchema.optional(),
  nm: z.string().min(1).max(300),
  t: turnSchema,
  tp: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9"]),
  abr: z.array(electionScopeSchema).min(1)
});

const electionEventSchema = z.object({
  cd: identifierStringSchema,
  cdpr: identifierStringSchema,
  c: z.string().regex(/^ele\d{4}$/),
  dt: dateStringSchema,
  dtlim: dateStringSchema,
  e: z.array(electionSchema).min(1)
});

export const ea11Schema = z.object({
  ...generatedFileFields,
  arq: z.array(fileDirectorySchema).min(1),
  pl: z.array(electionEventSchema).min(1)
});

export type Ea11Payload = z.infer<typeof ea11Schema>;
