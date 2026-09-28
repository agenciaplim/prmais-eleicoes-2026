import { z } from "zod";
import {
  countStringSchema,
  dateOrEmptyStringSchema,
  electorateSchema,
  municipalityProgressFields,
  percentageStringSchema,
  progressRootFields,
  progressStatusSchema,
  sectionsSchema,
  timeOrEmptyStringSchema
} from "./common";

const sharedScopeFields = {
  and: progressStatusSchema,
  dt: dateOrEmptyStringSchema,
  ht: timeOrEmptyStringSchema,
  s: sectionsSchema,
  e: electorateSchema
};

const stateCounters = {
  ufsnr: countStringSchema,
  pufsnr: percentageStringSchema,
  pufsnrn: percentageStringSchema,
  ufspt: countStringSchema,
  pufspt: percentageStringSchema,
  pufsptn: percentageStringSchema,
  ufsf: countStringSchema,
  pufsf: percentageStringSchema,
  pufsfn: percentageStringSchema
};

const optionalMunicipalityProgressFields = {
  munnr: municipalityProgressFields.munnr.optional(),
  pmunnr: municipalityProgressFields.pmunnr.optional(),
  pmunnrn: municipalityProgressFields.pmunnrn.optional(),
  munpt: municipalityProgressFields.munpt.optional(),
  pmunpt: municipalityProgressFields.pmunpt.optional(),
  pmunptn: municipalityProgressFields.pmunptn.optional(),
  munf: municipalityProgressFields.munf.optional(),
  pmunf: municipalityProgressFields.pmunf.optional(),
  pmunfn: municipalityProgressFields.pmunfn.optional()
};

const ea14BrazilScopeSchema = z.object({
  ...sharedScopeFields,
  ...stateCounters,
  ...optionalMunicipalityProgressFields,
  tpabr: z.literal("br"),
  cdabr: z.literal("br")
});

const ea14StateScopeSchema = z.object({
  ...sharedScopeFields,
  ...municipalityProgressFields,
  tpabr: z.literal("uf"),
  cdabr: z.string().regex(/^[a-z]{2}$/)
});

export const ea14Schema = z.object({
  ...progressRootFields,
  abr: z.array(z.discriminatedUnion("tpabr", [ea14BrazilScopeSchema, ea14StateScopeSchema])).min(1)
});

const ea15StateScopeSchema = z.object({
  ...sharedScopeFields,
  ...municipalityProgressFields,
  tpabr: z.literal("uf"),
  cdabr: z.string().regex(/^[a-z]{2}$/)
});

const ea15MunicipalityScopeSchema = z.object({
  ...sharedScopeFields,
  tpabr: z.literal("mun"),
  cdabr: z.string().regex(/^\d{5}$/)
});

export const ea15Schema = z.object({
  ...progressRootFields,
  abr: z.array(z.discriminatedUnion("tpabr", [ea15StateScopeSchema, ea15MunicipalityScopeSchema])).min(1)
});

export type Ea14Payload = z.infer<typeof ea14Schema>;
export type Ea15Payload = z.infer<typeof ea15Schema>;
