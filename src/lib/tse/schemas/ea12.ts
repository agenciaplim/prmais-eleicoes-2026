import { z } from "zod";
import { generatedFileFields } from "./common";

const domesticMunicipalitySchema = z.object({
  cd: z.string().regex(/^\d{5}$/),
  cdi: z.string().regex(/^\d{7}$/, "expected the 7-digit IBGE code observed in 2026"),
  nm: z.string().min(1).max(200),
  c: z.enum(["s", "n"]),
  z: z.array(z.string().regex(/^\d{4}$/)).min(1)
});

const foreignLocalitySchema = domesticMunicipalitySchema.extend({
  cdi: z.literal("")
});

const domesticStateScopeSchema = z.object({
  cd: z.string().regex(/^[a-z]{2}$/).refine((value) => value !== "zz", "zz is reserved for foreign localities"),
  ds: z.string().min(1).max(200),
  mu: z.array(domesticMunicipalitySchema).min(1)
});

const foreignScopeSchema = z.object({
  cd: z.literal("zz"),
  ds: z.string().min(1).max(200),
  mu: z.array(foreignLocalitySchema).min(1)
});

export const ea12Schema = z.object({
  ...generatedFileFields,
  abr: z.array(z.union([domesticStateScopeSchema, foreignScopeSchema])).min(1)
});

export type Ea12Payload = z.infer<typeof ea12Schema>;
