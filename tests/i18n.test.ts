import assert from "node:assert/strict";
import { test } from "node:test";
import id from "../lang-id.json";
import en from "../lang-en.json";
import { assertTranslationShape, expandTranslations, flattenDictionary, mergeDictionaries } from "../lib/modules/i18n/dictionary";
import { createI18nService } from "../lib/modules/i18n/i18n.service";
import { i18nRepository } from "../lib/modules/i18n/i18n.repository";
import { localeSchema, translationSchema, bulkTranslationsSchema } from "../lib/modules/i18n/i18n.schema";
import { translate } from "../lib/i18n";

test("all baseline translation keys and structured arrays round-trip without losing types", () => {
  for (const [code, dict] of Object.entries({ id, en })) {
    const flattened = flattenDictionary(dict, code);
    assert.deepEqual(expandTranslations(flattened), dict);
    for (const row of flattened) assertTranslationShape(row, flattenDictionary(id, "id"));
  }
  const dict = mergeDictionaries({ nested: { a: "A", b: "B" } }, { nested: { a: "Updated" } });
  assert.equal(translate(dict, "nested.a"), "Updated");
  assert.equal(translate(dict, "nested.b"), "B");
  assert.equal(translate({ hello: "Hello :name, {count}" }, "hello", { name: "Ada", count: 2 }), "Hello Ada, 2");
});

test("translation input rejects prototype pollution, malformed structures, group conflicts and duplicate keys", () => {
  const base = { localeCode: "id", group: "reader", key: "reader.title", value: "Title" };
  for (const key of ["__proto__.polluted", "reader.constructor.x", "reader..title"]) {
    assert.equal(translationSchema.safeParse({ ...base, key }).success, false);
  }
  assert.equal(translationSchema.safeParse({ ...base, group: "landing" }).success, false);
  assert.equal(translationSchema.safeParse({ ...base, valueType: "json", value: "{invalid}" }).success, false);
  assert.equal(translationSchema.safeParse({ ...base, valueType: "json", value: '[{"__proto__":{}}]' }).success, false);
  assert.equal(bulkTranslationsSchema.safeParse([base, base]).success, false);
  assert.equal(localeSchema.safeParse({ code: "en", name: "English", label: "English", isDefault: true, isActive: false }).success, false);
  assert.throws(() => expandTranslations([
    { key: "reader", value: "text", valueType: "string" },
    { key: "reader.title", value: "Title", valueType: "string" },
  ]), /Conflicting/);
  const baseline = flattenDictionary(id, "id");
  const list = baseline.find((row) => row.valueType === "json")!;
  assert.throws(() => assertTranslationShape({ ...list, value: '[123]' }, baseline), /preserve/);
  assert.throws(() => assertTranslationShape({ ...base, key: "reader", valueType: "string" }, baseline), /conflicts/);
});

test("i18n service uses target DB then default DB then JSON, and handles DB downtime", async () => {
  const repository = {
    ...i18nRepository,
    async getLocales() { return [
      { code: "id", label: "Indonesia", name: "Indonesian", nativeName: "Indonesia", flagEmoji: "", isLlmTranslated: false, hasDualRegister: true, isActive: true, isDefault: true },
      { code: "en", label: "English", name: "English", nativeName: "English", flagEmoji: "", isLlmTranslated: false, hasDualRegister: false, isActive: true, isDefault: false },
    ]; },
    async getTranslationsByLocale(code: string) {
      return flattenDictionary(code === "en" ? { nav: { login: "Target" } } : { nav: { login: "Default", logout: "Default logout" } }, code)
        .map((row) => ({ ...row, id: row.key, createdAt: new Date(), updatedAt: new Date() }));
    },
  };
  const service = createI18nService(repository, () => {});
  const dict = await service.getDictionary("en");
  assert.equal(translate(dict, "nav.login"), "Target");
  assert.equal(translate(dict, "nav.logout"), "Default logout");
  assert.equal(translate(dict, "nav.pricing"), en.nav.pricing);
  assert.equal(await service.resolveLocale("../../bad"), "id");
  const unavailable = createI18nService({ ...repository,
    async getLocales() { throw new Error("DB down"); },
    async getTranslationsByLocale() { throw new Error("DB down"); },
  }, () => {});
  assert.deepEqual(await unavailable.getDictionary("en"), mergeDictionaries(id, en));
  assert.deepEqual(await unavailable.getDictionary("id"), id);
});

test("translation updates require authorization and invalidate only after a successful write", async () => {
  const events: string[] = [];
  const repository = { ...i18nRepository, async upsertTranslation() { events.push("write"); } };
  const service = createI18nService(repository, () => { events.push("invalidate"); }, async () => { events.push("authorize"); });
  const input = { localeCode: "id", group: "reader", key: "reader.title", value: "Updated" };
  await service.upsertTranslation(input);
  assert.deepEqual(events, ["authorize", "write", "invalidate"]);
  events.length = 0;
  const denied = createI18nService(repository, () => { events.push("invalidate"); }, async () => { throw new Error("Forbidden"); });
  await assert.rejects(denied.upsertTranslation(input), /Forbidden/);
  assert.equal(events.length, 0);
  const failing = createI18nService({ ...repository, async upsertTranslation() { throw new Error("write failed"); } }, () => { events.push("invalidate"); }, async () => {});
  await assert.rejects(failing.upsertTranslation(input), /write failed/);
  assert.equal(events.length, 0);
  await assert.rejects(service.upsertTranslation({ ...input, key: "__proto__.x" }));
  assert.deepEqual(events, ["authorize"]);
});
