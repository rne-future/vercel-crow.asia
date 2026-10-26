import { z } from "zod";

const id = z.string().min(1).max(32).regex(/^[a-z0-9-]+$/);
const stringMap = z.record(z.string(), z.string());
const money = z.coerce.number().int().min(0).max(2147483647);
const usd = z.coerce.number().min(0).max(9999.99).transform((n) => n.toFixed(2));

export function jsonField(form: FormData, key: string, fallback: unknown) {
  const value = String(form.get(key) ?? "").trim();
  return value ? JSON.parse(value) : fallback;
}

export const bookSchema = z.object({
  id,
  volumeNumber: z.coerce.number().int().min(1).max(32767),
  volumeCode: z.string().min(1).max(20),
  priceSingleIdr: money,
  priceSingleUsd: usd,
  accentHex: z.string().regex(/^#[0-9a-f]{6}$/i),
  titles: stringMap.refine((value) => Object.keys(value).length > 0, "Titles required"),
  subtitles: stringMap,
  targetRoles: z.array(z.string()),
  keyFrameworks: z.array(z.string()),
  pdfKeys: stringMap,
  isActive: z.boolean(),
});

export const tierSchema = z.object({
  id,
  names: stringMap.refine((value) => Object.keys(value).length > 0, "Names required"),
  descriptions: stringMap,
  features: z.record(z.string(), z.array(z.string())),
  badges: stringMap.nullable(),
  priceIdr: money.refine((n) => n > 0, "Price must be positive"),
  strikePriceIdr: money.nullable(),
  priceUsd: usd,
  includedBookIds: z.array(id).min(1),
  sortOrder: z.coerce.number().int().min(0).max(32767),
  isBestValue: z.boolean(),
  isActive: z.boolean(),
});

export const chapterSchema = z.object({
  chapterIndex: z.coerce.number().int().min(0).max(32767),
  isFreeSample: z.boolean(),
  motifIcon: z.string().min(1).max(32),
  illustrationPath: z.string().max(255).regex(/^\/illustrations\/[a-zA-Z0-9/_.-]+$/).nullable(),
  remotionCompositionId: z.string().min(1).max(64),
  remotionDurationFrames: z.coerce.number().int().min(1).max(108000),
  remotionFps: z.coerce.number().int().min(1).max(120),
  isYoutubeEnabled: z.boolean(),
  youtubeUnlistedId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/).nullable(),
});

export const resourceIdSchema = id;
