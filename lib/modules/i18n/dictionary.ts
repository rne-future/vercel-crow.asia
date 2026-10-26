import { translationKeySchema, translationSchema, type TranslationInput } from "./i18n.schema";

export type Dictionary = Record<string, unknown>;

export function assertTranslationShape(row: TranslationInput, baseline: TranslationInput[]) {
  const expected = baseline.find((item) => item.key === row.key);
  if (!expected) {
    if (baseline.some((item) => row.key.startsWith(`${item.key}.`) || item.key.startsWith(`${row.key}.`))) throw new Error("Key conflicts with the baseline dictionary structure");
    return;
  }
  if (expected.valueType !== row.valueType) throw new Error("Translation type must match the baseline");
  if (row.valueType !== "json") return;
  const compatible = (value: unknown, reference: unknown): boolean => {
    if (Array.isArray(reference)) return Array.isArray(value) && (reference.length === 0 || value.every((item) => reference.some((example) => compatible(item, example))));
    if (reference !== null && typeof reference === "object") {
      return value !== null && typeof value === "object" && !Array.isArray(value)
        && Object.entries(reference).every(([key, example]) => Object.hasOwn(value, key) && compatible((value as Dictionary)[key], example));
    }
    return typeof value === typeof reference;
  };
  if (!compatible(JSON.parse(row.value), JSON.parse(expected.value))) throw new Error("Structured translation must preserve the baseline fields and value types");
}

export function flattenDictionary(dict: Dictionary, localeCode: string, prefix = ""): TranslationInput[] {
  return Object.entries(dict).flatMap(([name, value]) => {
    const key = prefix ? `${prefix}.${name}` : name;
    translationKeySchema.parse(key);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenDictionary(value as Dictionary, localeCode, key);
    }
    return [translationSchema.parse({
      localeCode, key, group: key.split(".")[0],
      value: typeof value === "string" ? value : JSON.stringify(value),
      valueType: typeof value === "string" ? "string" : "json",
    })];
  });
}

export function expandTranslations(rows: Pick<TranslationInput, "key" | "value" | "valueType">[]): Dictionary {
  const dict: Dictionary = {};
  for (const row of rows) {
    translationKeySchema.parse(row.key);
    const segments = row.key.split(".");
    let parent = dict;
    for (const segment of segments.slice(0, -1)) {
      if (!Object.hasOwn(parent, segment)) parent[segment] = {};
      const node = parent[segment];
      if (!node || typeof node !== "object" || Array.isArray(node)) throw new Error(`Conflicting translation key: ${row.key}`);
      parent = node as Dictionary;
    }
    const leaf = segments[segments.length - 1];
    if (Object.hasOwn(parent, leaf)) throw new Error(`Conflicting translation key: ${row.key}`);
    parent[leaf] = row.valueType === "json" ? JSON.parse(row.value) : row.value;
  }
  return dict;
}

export function mergeDictionaries(...dictionaries: Dictionary[]): Dictionary {
  const result: Dictionary = {};
  for (const dict of dictionaries) {
    for (const [key, value] of Object.entries(dict)) {
      translationKeySchema.parse(key);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const previous = result[key];
        result[key] = mergeDictionaries(previous && typeof previous === "object" && !Array.isArray(previous) ? previous as Dictionary : {}, value as Dictionary);
      } else result[key] = structuredClone(value);
    }
  }
  return result;
}
