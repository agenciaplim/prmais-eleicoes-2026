import { z } from "zod";

const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
const PERCENTAGE_PATTERN = /^(?:100(?:,0{1,9})?|(?:0|[1-9]\d?)(?:,\d{1,9})?)$/;

function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const countStringSchema = z.string().regex(/^\d{1,15}$/, "expected a non-negative integer string");
export const identifierStringSchema = z.string().regex(/^\d{1,20}$/, "expected a numeric identifier string");
export const percentageStringSchema = z.string().regex(PERCENTAGE_PATTERN, "expected a percentage from 0 to 100 using comma decimals");
export const dateStringSchema = z.string().refine(isCalendarDate, "expected a valid date in dd/mm/yyyy format");
export const dateOrEmptyStringSchema = z.union([dateStringSchema, z.literal("")]);
export const timeStringSchema = z.string().regex(TIME_PATTERN, "expected a valid time in HH:mm:ss format");
export const timeOrEmptyStringSchema = z.union([timeStringSchema, z.literal("")]);
export const yesNoSchema = z.enum(["s", "n"]);
export const phaseSchema = z.enum(["s", "o"]);
export const turnSchema = z.enum(["1", "2"]);
export const progressStatusSchema = z.enum(["n", "p", "f"]);

function addEqualityIssue(
  ctx: z.RefinementCtx,
  path: string[],
  leftName: string,
  left: string,
  rightNames: string[],
  rightValues: string[]
): void {
  const rightTotal = rightValues.reduce((total, value) => total + BigInt(value), 0n);
  if (BigInt(left) !== rightTotal) {
    ctx.addIssue({
      code: "custom",
      path,
      message: `${leftName} must equal ${rightNames.join(" + ")}`
    });
  }
}

export const sectionsSchema = z
  .object({
    ts: countStringSchema,
    st: countStringSchema,
    pst: percentageStringSchema,
    pstn: percentageStringSchema,
    snt: countStringSchema,
    psnt: percentageStringSchema,
    psntn: percentageStringSchema,
    si: countStringSchema,
    psi: percentageStringSchema,
    psin: percentageStringSchema,
    sni: countStringSchema,
    psni: percentageStringSchema,
    psnin: percentageStringSchema,
    sa: countStringSchema,
    psa: percentageStringSchema,
    psan: percentageStringSchema,
    sna: countStringSchema,
    psna: percentageStringSchema,
    psnan: percentageStringSchema
  })
  .superRefine((value, ctx) => {
    addEqualityIssue(ctx, ["ts"], "ts", value.ts, ["st", "snt"], [value.st, value.snt]);
    addEqualityIssue(ctx, ["st"], "st", value.st, ["si", "sni"], [value.si, value.sni]);
    addEqualityIssue(ctx, ["si"], "si", value.si, ["sa", "sna"], [value.sa, value.sna]);
  });

export const electorateSchema = z
  .object({
    te: countStringSchema,
    est: countStringSchema,
    pest: percentageStringSchema,
    pestn: percentageStringSchema,
    esnt: countStringSchema,
    pesnt: percentageStringSchema,
    pesntn: percentageStringSchema,
    esi: countStringSchema,
    pesi: percentageStringSchema,
    pesin: percentageStringSchema,
    esni: countStringSchema,
    pesni: percentageStringSchema,
    pesnin: percentageStringSchema,
    esa: countStringSchema,
    pesa: percentageStringSchema,
    pesan: percentageStringSchema,
    esna: countStringSchema,
    pesna: percentageStringSchema,
    pesnan: percentageStringSchema,
    c: countStringSchema,
    pc: percentageStringSchema,
    pcn: percentageStringSchema,
    a: countStringSchema,
    pa: percentageStringSchema,
    pan: percentageStringSchema
  })
  .superRefine((value, ctx) => {
    addEqualityIssue(ctx, ["te"], "te", value.te, ["est", "esnt"], [value.est, value.esnt]);
    addEqualityIssue(ctx, ["est"], "est", value.est, ["esi", "esni"], [value.esi, value.esni]);
    addEqualityIssue(ctx, ["esi"], "esi", value.esi, ["esa", "esna"], [value.esa, value.esna]);
    addEqualityIssue(ctx, ["esi"], "esi", value.esi, ["c", "a"], [value.c, value.a]);
  });

export const generatedFileFields = {
  dg: dateStringSchema,
  hg: timeStringSchema,
  idg: identifierStringSchema,
  f: phaseSchema
};

export const progressRootFields = {
  ele: identifierStringSchema,
  t: turnSchema,
  f: phaseSchema,
  dg: dateStringSchema,
  hg: timeStringSchema,
  idg: identifierStringSchema
};

export const municipalityProgressFields = {
  munnr: countStringSchema,
  pmunnr: percentageStringSchema,
  pmunnrn: percentageStringSchema,
  munpt: countStringSchema,
  pmunpt: percentageStringSchema,
  pmunptn: percentageStringSchema,
  munf: countStringSchema,
  pmunf: percentageStringSchema,
  pmunfn: percentageStringSchema
};
