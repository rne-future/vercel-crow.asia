import { z } from "zod";

const unsafe = new Set(["__proto__", "constructor", "prototype"]);
export const localeCodeSchema = z.string().min(2).max(16).regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/)
  .refine((value) => { try { return Intl.getCanonicalLocales(value).length === 1; } catch { return false; } }, "Invalid language tag");
export const translationKeySchema = z.string().min(1).max(255)
  .regex(/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/)
  .refine((key) => key.split(".").every((part) => !unsafe.has(part)), "Unsafe translation key");

export const localeSchema = z.object({
  code: localeCodeSchema,
  label: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(64),
  flagEmoji: z.string().max(16).default("🌐"),
  hasDualRegister: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
}).strict().refine((locale) => !locale.isDefault || locale.isActive, "Default locale must be active");

export const translationSchema = z.object({
  localeCode: localeCodeSchema,
  group: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  key: translationKeySchema,
  value: z.string().max(100000),
  valueType: z.enum(["string", "json"]).default("string"),
}).strict().superRefine((row, ctx) => {
  if (row.group !== row.key.split(".")[0]) ctx.addIssue({ code: "custom", message: "Group must match the first key segment" });
  if (row.valueType === "json") {
    try {
      const value: unknown = JSON.parse(row.value);
      if (!Array.isArray(value)) throw new Error("Structured translations must be arrays");
      const check = (v: unknown): boolean => typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null
        || (Array.isArray(v) ? v.every(check) : typeof v === "object" && Object.entries(v).every(([key, item]) => !unsafe.has(key) && check(item)));
      if (!check(value)) throw new Error("Invalid structured translation");
    } catch {
      ctx.addIssue({ code: "custom", message: "Value must be a valid JSON array without unsafe keys" });
    }
  }
});

export const bulkTranslationsSchema = z.array(translationSchema).min(1).max(1000)
  .refine((rows) => new Set(rows.map((row) => `${row.localeCode}:${row.key}`)).size === rows.length, "Duplicate translation keys");
export const localeStatusSchema = z.object({ code: localeCodeSchema, isActive: z.boolean() }).strict();
export const translationDeleteSchema = z.object({ localeCode: localeCodeSchema, key: translationKeySchema }).strict();
export type TranslationInput = z.infer<typeof translationSchema>;
export type LocaleInput = z.infer<typeof localeSchema>;
