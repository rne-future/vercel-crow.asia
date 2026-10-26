import { and, asc, eq, sql } from "drizzle-orm";
import { locales, supportedLocales, translations } from "@/lib/db/schema";
import type { LocaleInput, TranslationInput } from "./i18n.schema";
import { expandTranslations } from "./dictionary";

const connection = async () => (await import("@/lib/db")).db;

export const i18nRepository = {
  async getLocales() {
    const db = await connection();
    return db.select({
      code: locales.code, label: locales.label, isActive: locales.isActive, isDefault: locales.isDefault,
      name: supportedLocales.name, nativeName: supportedLocales.nativeName, flagEmoji: supportedLocales.flagEmoji,
      hasDualRegister: supportedLocales.hasDualRegister, isLlmTranslated: supportedLocales.isLlmTranslated,
    }).from(locales).innerJoin(supportedLocales, eq(supportedLocales.code, locales.code)).orderBy(asc(supportedLocales.sortOrder), asc(locales.code));
  },
  async getActiveLocales() {
    return (await i18nRepository.getLocales()).filter((row) => row.isActive);
  },
  async getTranslationsByLocale(code: string) {
    return (await connection()).select().from(translations).where(eq(translations.localeCode, code)).orderBy(asc(translations.key));
  },
  async saveLocale(input: LocaleInput) {
    return (await connection()).transaction(async (tx) => {
      // One lock also serializes first-locale creation when no rows exist yet.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(75618231)`);
      const all = await tx.select().from(locales).for("update");
      const existing = all.find((row) => row.code === input.code);
      if (existing?.isDefault && (!input.isDefault || !input.isActive)) throw new Error("Choose another default locale before disabling this one");
      const isDefault = input.isDefault || all.length === 0;
      if (isDefault && !input.isActive) throw new Error("Default locale must be active");
      if (isDefault) await tx.update(locales).set({ isDefault: false, updatedAt: new Date() }).where(eq(locales.isDefault, true));
      await tx.insert(supportedLocales).values({
        code: input.code, name: input.name, nativeName: input.label, flagEmoji: input.flagEmoji,
        hasDualRegister: input.hasDualRegister, isActive: input.isActive,
      }).onConflictDoUpdate({ target: supportedLocales.code, set: {
        name: input.name, nativeName: input.label, flagEmoji: input.flagEmoji,
        hasDualRegister: input.hasDualRegister, isActive: input.isActive, updatedAt: new Date(),
      } });
      await tx.insert(locales).values({ code: input.code, label: input.label, isActive: input.isActive, isDefault })
        .onConflictDoUpdate({ target: locales.code, set: { label: input.label, isActive: input.isActive, isDefault, updatedAt: new Date() } });
    });
  },
  async setLocaleActive(code: string, isActive: boolean) {
    return (await connection()).transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(75618231)`);
      const [locale] = await tx.select().from(locales).where(eq(locales.code, code)).for("update");
      if (!locale) throw new Error("Locale not found");
      if (locale.isDefault && !isActive) throw new Error("Default locale must remain active");
      await tx.update(locales).set({ isActive, updatedAt: new Date() }).where(eq(locales.code, code));
      await tx.update(supportedLocales).set({ isActive, updatedAt: new Date() }).where(eq(supportedLocales.code, code));
    });
  },
  async upsertTranslation(input: TranslationInput) {
    return i18nRepository.bulkUpsertTranslations([input]);
  },
  async bulkUpsertTranslations(input: TranslationInput[]) {
    return (await connection()).transaction(async (tx) => {
      // Serialize key shape checks with writes, including concurrent bulk edits.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(75618232)`);
      for (const code of new Set(input.map((row) => row.localeCode))) {
        const existing = await tx.select().from(translations).where(eq(translations.localeCode, code));
        const merged = new Map<string, Pick<TranslationInput, "key" | "value" | "valueType">>(existing.map((row) => [row.key, row]));
        for (const row of input.filter((row) => row.localeCode === code)) merged.set(row.key, row);
        expandTranslations([...merged.values()]);
      }
      for (const row of input) await tx.insert(translations).values(row).onConflictDoUpdate({
        target: [translations.localeCode, translations.key],
        set: { value: row.value, group: row.group, valueType: row.valueType, updatedAt: new Date() },
      });
    });
  },
  async deleteTranslation(localeCode: string, key: string) {
    await (await connection()).delete(translations).where(and(eq(translations.localeCode, localeCode), eq(translations.key, key)));
  },
};

export type I18nRepository = typeof i18nRepository;
