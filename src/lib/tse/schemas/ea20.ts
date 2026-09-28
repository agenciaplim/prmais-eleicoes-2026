import { z } from "zod";
import {
  countStringSchema,
  dateOrEmptyStringSchema,
  dateStringSchema,
  electorateSchema,
  identifierStringSchema,
  percentageStringSchema,
  phaseSchema,
  progressStatusSchema,
  sectionsSchema,
  timeOrEmptyStringSchema,
  timeStringSchema,
  turnSchema,
  yesNoSchema
} from "./common";

const destinationSchema = z.enum(["Válido", "Válido (legenda)", "Anulado", "Anulado sub judice", ""]);

const substituteSchema = z.object({
  nm: z.string().min(1).max(200),
  nmu: z.string().min(1).max(200),
  sgp: z.string().min(1).max(30)
});

const runningMateSchema = z.object({
  tp: z.enum(["v", "s1", "s2"]),
  sqcand: identifierStringSchema,
  nm: z.string().min(1).max(200),
  nmu: z.string().min(1).max(200),
  sgp: z.string().min(1).max(30)
});

const candidateSchema = z.object({
  n: identifierStringSchema,
  sqcand: identifierStringSchema,
  nm: z.string().min(1).max(200),
  nmu: z.string().min(1).max(200),
  dt: dateOrEmptyStringSchema,
  dvt: destinationSchema,
  seq: identifierStringSchema,
  e: yesNoSchema,
  st: z.enum(["", "Eleito", "Eleito por QP", "Eleito por média", "Não eleito", "2º turno", "Suplente"]),
  vap: countStringSchema,
  pvap: percentageStringSchema,
  pvapn: percentageStringSchema,
  vs: z.array(runningMateSchema).optional(),
  subs: z.array(substituteSchema).optional()
});

const partySchema = z.object({
  n: identifierStringSchema,
  sg: z.string().min(1).max(100),
  nm: z.string().min(1).max(200),
  nfed: z.union([identifierStringSchema, z.literal("")]),
  dvt: destinationSchema.optional(),
  tvtn: countStringSchema,
  tvtl: countStringSchema.optional(),
  tvan: countStringSchema,
  tval: countStringSchema.optional(),
  vag: countStringSchema.optional(),
  cand: z.array(candidateSchema).optional()
});

const coalitionSchema = z.object({
  n: identifierStringSchema,
  nm: z.string().min(1).max(300),
  tp: z.enum(["c", "i", "f"]),
  com: z.string().max(500),
  tvtn: countStringSchema.optional(),
  tvtl: countStringSchema.optional(),
  tvan: countStringSchema.optional(),
  tval: countStringSchema.optional(),
  vag: countStringSchema.optional(),
  par: z.array(partySchema).min(1)
});

const federationSchema = z.object({
  n: identifierStringSchema,
  nm: z.string().min(1).max(300),
  sg: z.string().min(1).max(100),
  com: z.string().min(1).max(500),
  npar: z.array(identifierStringSchema).min(1)
});

const officeSchema = z.object({
  cd: identifierStringSchema,
  nmn: z.string().min(1).max(100),
  nmm: z.string().min(1).max(100),
  nmf: z.string().min(1).max(100),
  nv: countStringSchema,
  qe: countStringSchema.optional(),
  fed: z.array(federationSchema),
  agr: z.array(coalitionSchema).min(1)
});

const answerSchema = z.object({
  n: identifierStringSchema,
  ds: z.string().min(1).max(500),
  seq: identifierStringSchema,
  e: yesNoSchema,
  st: z.string().max(100),
  vap: countStringSchema,
  pvap: percentageStringSchema,
  pvapn: percentageStringSchema
});

const questionSchema = z.object({
  cd: identifierStringSchema,
  ds: z.string().min(1).max(500),
  resp: z.array(answerSchema).min(1)
});

function addVoteEqualityIssue(
  ctx: z.RefinementCtx,
  path: string,
  left: string,
  rightNames: string[],
  rightValues: string[]
): void {
  const rightTotal = rightValues.reduce((total, value) => total + BigInt(value), 0n);
  if (BigInt(left) !== rightTotal) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: `${path} must equal ${rightNames.join(" + ")}`
    });
  }
}

const votesSchema = z
  .object({
    tv: countStringSchema,
    vvc: countStringSchema,
    pvvc: percentageStringSchema,
    pvvcn: percentageStringSchema,
    vv: countStringSchema.optional(),
    pvv: percentageStringSchema.optional(),
    pvvn: percentageStringSchema.optional(),
    vl: countStringSchema.optional(),
    pvl: percentageStringSchema.optional(),
    pvln: percentageStringSchema.optional(),
    vnom: countStringSchema.optional(),
    pvnom: percentageStringSchema.optional(),
    pvnomn: percentageStringSchema.optional(),
    van: countStringSchema.optional(),
    pvan: percentageStringSchema.optional(),
    pvann: percentageStringSchema.optional(),
    vansj: countStringSchema.optional(),
    pvansj: percentageStringSchema.optional(),
    pvansjn: percentageStringSchema.optional(),
    vscv: countStringSchema,
    vb: countStringSchema,
    pvb: percentageStringSchema,
    pvbn: percentageStringSchema,
    tvn: countStringSchema,
    ptvn: percentageStringSchema,
    ptvnn: percentageStringSchema,
    vn: countStringSchema.optional(),
    pvn: percentageStringSchema.optional(),
    pvnn: percentageStringSchema.optional(),
    vnt: countStringSchema,
    pvnt: percentageStringSchema,
    pvntn: percentageStringSchema,
    vsan: countStringSchema
  })
  .superRefine((value, ctx) => {
    addVoteEqualityIssue(
      ctx,
      "tv",
      value.tv,
      ["vvc", "vb", "tvn", "vscv"],
      [value.vvc, value.vb, value.tvn, value.vscv]
    );

    if (value.vv !== undefined && value.van !== undefined && value.vansj !== undefined) {
      addVoteEqualityIssue(ctx, "vvc", value.vvc, ["vv", "van", "vansj"], [value.vv, value.van, value.vansj]);
    }

    if (value.vv !== undefined && value.vnom !== undefined) {
      addVoteEqualityIssue(ctx, "vv", value.vv, ["vnom", "vl"], [value.vnom, value.vl ?? "0"]);
    }

    if (value.vn !== undefined) {
      addVoteEqualityIssue(ctx, "tvn", value.tvn, ["vn", "vnt"], [value.vn, value.vnt]);
    }
  });

export const ea20Schema = z
  .object({
    ele: identifierStringSchema,
    t: turnSchema,
    f: phaseSchema,
    sup: yesNoSchema,
    tpabr: z.enum(["br", "uf", "mu", "zona"]),
    cdabr: z.string().min(1).max(5),
    dg: dateStringSchema,
    hg: timeStringSchema,
    idg: identifierStringSchema,
    dv: yesNoSchema,
    dt: dateOrEmptyStringSchema,
    ht: timeOrEmptyStringSchema,
    tf: yesNoSchema,
    and: progressStatusSchema,
    md: z.enum(["e", "s", "n"]).optional(),
    esae: yesNoSchema.optional(),
    mnae: z.array(z.string().min(1).max(500)).optional(),
    carg: z.array(officeSchema).min(1).optional(),
    perg: z.array(questionSchema).min(1).optional(),
    s: sectionsSchema,
    e: electorateSchema,
    v: votesSchema
  })
  .superRefine((value, ctx) => {
    if ((value.carg === undefined) === (value.perg === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["carg"],
        message: "payload must contain exactly one of carg or perg"
      });
    }

    const scopeMatches =
      (value.tpabr === "br" && value.cdabr === "br") ||
      (value.tpabr === "uf" && /^[a-z]{2}$/.test(value.cdabr)) ||
      (value.tpabr === "mu" && /^\d{5}$/.test(value.cdabr)) ||
      (value.tpabr === "zona" && /^\d{4}$/.test(value.cdabr));

    if (!scopeMatches) {
      ctx.addIssue({ code: "custom", path: ["cdabr"], message: "scope code does not match tpabr" });
    }

    if (value.md !== undefined && value.tf === "s") {
      ctx.addIssue({ code: "custom", path: ["md"], message: "md is only valid before final totalization" });
    }

    if (value.esae === "s" && (!value.mnae || value.mnae.length === 0)) {
      ctx.addIssue({ code: "custom", path: ["mnae"], message: "mnae is required when esae is s" });
    }

    if (value.mnae && value.mnae.length > 0 && value.esae !== "s") {
      ctx.addIssue({ code: "custom", path: ["mnae"], message: "mnae must be empty unless esae is s" });
    }

    if (value.tpabr === "mu" && value.and === "f" && value.s.snt !== "0") {
      ctx.addIssue({
        code: "custom",
        path: ["s", "snt"],
        message: "a finished municipal scope cannot have non-totalized sections"
      });
    }
  });

export type Ea20Payload = z.infer<typeof ea20Schema>;
