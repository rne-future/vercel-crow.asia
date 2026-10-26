import "./load-env";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { locales, supportedLocales, translations } from "../lib/db/schema";
import { flattenDictionary } from "../lib/modules/i18n/dictionary";
import id from "../lang-id.json";
import en from "../lang-en.json";

async function main() {
  const dictionaries = [{ code: "id", label: "Bahasa Indonesia", name: "Indonesian", dict: id }, { code: "en", label: "English", name: "English", dict: en }];
  const rows = dictionaries.flatMap((item) => flattenDictionary(item.dict, item.code));
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(75618231)`);
    for (const item of dictionaries) {
      await tx.insert(supportedLocales).values({ code: item.code, name: item.name, nativeName: item.label, flagEmoji: item.code === "id" ? "🇮🇩" : "🌐", isActive: true, hasDualRegister: item.code === "id" }).onConflictDoNothing();
      await tx.insert(locales).values({ code: item.code, label: item.label, isActive: true }).onConflictDoNothing();
    }
    const defaults = await tx.select({ code: locales.code }).from(locales).where(eq(locales.isDefault, true));
    if (!defaults.length) await tx.update(locales).set({ isDefault: true, isActive: true }).where(eq(locales.code, "id"));
    // Re-running the seed only adds missing keys; edited admin values survive.
    for (let start = 0; start < rows.length; start += 200) await tx.insert(translations).values(rows.slice(start, start + 200)).onConflictDoNothing();
  });
  console.log(`Baseline i18n seeded: ${rows.length} keys across id/en (existing values preserved).`);
}

main().catch((error: unknown) => {
  console.error("Translation seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}).finally(() => db.$client.end());
