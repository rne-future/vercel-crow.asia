import { unstable_cache, revalidateTag } from "next/cache";
import id from "@/lang-id.json";
import en from "@/lang-en.json";
import { assertTranslationShape, expandTranslations, flattenDictionary, mergeDictionaries, type Dictionary } from "./dictionary";
import { i18nRepository, type I18nRepository } from "./i18n.repository";
import { bulkTranslationsSchema, localeCodeSchema, localeSchema, localeStatusSchema, translationDeleteSchema, translationSchema } from "./i18n.schema";

export const I18N_CACHE_TAG = "i18n";
const baselines: Record<string, Dictionary> = { id, en };
const baselineKeys = flattenDictionary(id, "id");
const baselineLocales = [
  { code: "id", label: "Bahasa Indonesia", name: "Indonesian", nativeName: "Bahasa Indonesia", flagEmoji: "🇮🇩", hasDualRegister: true, isLlmTranslated: false, isActive: true, isDefault: true },
  { code: "en", label: "English", name: "English", nativeName: "English", flagEmoji: "🌐", hasDualRegister: false, isLlmTranslated: false, isActive: true, isDefault: false },
];

const cachedRepository: I18nRepository = {
  ...i18nRepository,
  getLocales: unstable_cache(() => i18nRepository.getLocales(), ["i18n-locales-v1"], { tags: [I18N_CACHE_TAG], revalidate: 300 }),
  getTranslationsByLocale: unstable_cache((code: string) => i18nRepository.getTranslationsByLocale(code), ["i18n-dictionary-v1"], { tags: [I18N_CACHE_TAG], revalidate: 300 }),
};

const authorize = async () => { await (await import("@/lib/modules/auth/auth.service")).authService.requireAdmin(); };

export function createI18nService(repository: I18nRepository, invalidate: () => void, requireEditor: () => Promise<void> = authorize) {
  const getLocales = async () => {
    try {
      const rows = await repository.getLocales();
      return rows.length ? rows : baselineLocales;
    } catch {
      // Keep the public dictionary available before migrations or during DB outages.
      return baselineLocales;
    }
  };
  const getActiveLocales = async () => (await getLocales()).filter((row) => row.isActive);
  const resolveLocale = async (requested?: string) => {
    const rows = await getActiveLocales();
    return rows.find((row) => row.code === requested)?.code ?? rows.find((row) => row.isDefault)?.code ?? "id";
  };
  const getDictionary = async (requested?: string) => {
    const active = await getActiveLocales();
    const defaultCode = active.find((row) => row.isDefault)?.code ?? "id";
    const code = active.find((row) => row.code === requested)?.code ?? defaultCode;
    const baseline = mergeDictionaries(id, baselines[defaultCode] ?? {}, baselines[code] ?? {});
    const read = async (locale: string) => {
      try { return expandTranslations(await repository.getTranslationsByLocale(locale)); }
      catch { return {}; }
    };
    const [fallback, target] = await Promise.all([read(defaultCode), code === defaultCode ? Promise.resolve({}) : read(code)]);
    return mergeDictionaries(baseline, fallback, target);
  };
  return {
    getLocales, getActiveLocales, resolveLocale, getDictionary,
    async getPageTranslations(requested?: string) {
      const locale = await resolveLocale(requested);
      const [translations, locales] = await Promise.all([getDictionary(locale), getActiveLocales()]);
      return { locale, translations, locales };
    },
    async listForAdmin(code: string) {
      await requireEditor();
      return { locales: await repository.getLocales(), translations: await repository.getTranslationsByLocale(localeCodeSchema.parse(code)) };
    },
    async saveLocale(input: unknown) {
      await requireEditor();
      await repository.saveLocale(localeSchema.parse(input));
      invalidate();
    },
    async setLocaleActive(input: unknown) {
      await requireEditor();
      const parsed = localeStatusSchema.parse(input);
      await repository.setLocaleActive(parsed.code, parsed.isActive);
      invalidate();
    },
    async upsertTranslation(input: unknown) {
      await requireEditor();
      const parsed = translationSchema.parse(input);
      assertTranslationShape(parsed, baselineKeys);
      await repository.upsertTranslation(parsed);
      invalidate();
    },
    async bulkUpsertTranslations(input: unknown) {
      await requireEditor();
      const parsed = bulkTranslationsSchema.parse(input);
      parsed.forEach((row) => assertTranslationShape(row, baselineKeys));
      await repository.bulkUpsertTranslations(parsed);
      invalidate();
    },
    async deleteTranslation(input: unknown) {
      await requireEditor();
      const parsed = translationDeleteSchema.parse(input);
      await repository.deleteTranslation(parsed.localeCode, parsed.key);
      invalidate();
    },
  };
}

export const i18nService = createI18nService(cachedRepository, () => revalidateTag(I18N_CACHE_TAG));
