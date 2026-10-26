import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { stableItemId } from "../lib/modules/reader/content/compiler";
import postgres from "postgres";

const migration = readFileSync(new URL("../drizzle/0006_checklist_item_id.sql", import.meta.url), "utf8");

test("migration runs on legacy fixtures and preserves language marks without positional drift", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = process.env.TEST_DATABASE_URL!;
  assert.match(new URL(url).pathname, /_test$/);
  const client = postgres(url, { max: 1 });
  try {
    await client.begin(async (tx) => {
      await tx.unsafe(`CREATE TEMP TABLE chapter_translations (id integer, chapter_id integer, translation_status text, extracted_checklists jsonb);
        CREATE TEMP TABLE chapters (id integer, book_id text, slug text);
        CREATE TEMP TABLE checklist_progress (id uuid DEFAULT gen_random_uuid(), user_id uuid, book_id text, chapter_slug text, item_index smallint NOT NULL, is_completed boolean, updated_at timestamptz);
        CREATE UNIQUE INDEX uq_user_checklist ON checklist_progress(user_id, book_id, chapter_slug, item_index);
        INSERT INTO chapters VALUES (1, 'book-1', 'ch-0');`);
      await tx`INSERT INTO chapter_translations VALUES
        (1, 1, 'PUBLISHED', ${tx.json([{ itemIndex: 0, labelHtml: "Alpha" }, { itemIndex: 1, labelHtml: "Alpha" }])}::jsonb),
        (2, 1, 'PUBLISHED', ${tx.json([{ itemIndex: 0, labelHtml: "Bahasa é" }, { itemIndex: 1, labelHtml: "Bahasa é" }])}::jsonb),
        (3, 1, 'DRAFT', ${tx.json([{ itemIndex: 0, labelHtml: "Draft" }])}::jsonb)`;
      await tx.unsafe(`INSERT INTO checklist_progress (user_id, book_id, chapter_slug, item_index, is_completed, updated_at) VALUES
        ('00000000-0000-4000-8000-000000000001', 'book-1', 'ch-0', 0, true, '2026-01-01'),
        ('00000000-0000-4000-8000-000000000001', 'book-1', 'ch-0', 1, false, '2026-01-02'),
        ('00000000-0000-4000-8000-000000000001', 'book-1', 'ch-0', 9, true, '2026-01-03')`);
      const fixtureTypes = await tx`SELECT jsonb_typeof(extracted_checklists) AS type FROM chapter_translations`;
      assert.ok(fixtureTypes.every((row) => row.type === "array"), "legacy fixtures must contain JSON arrays, not double-encoded strings");
      for (const statement of migration.split('--> statement-breakpoint')) await tx.unsafe(statement);
      const progress = await tx`SELECT item_id, is_completed FROM checklist_progress ORDER BY item_id`;
      assert.deepEqual(progress.map((r) => r.item_id).sort(), [stableItemId("Alpha"), stableItemId("Bahasa é")].sort());
      assert.ok(progress.every((r) => r.is_completed === false));
      const translations = await tx`SELECT extracted_checklists FROM chapter_translations ORDER BY id`;
      assert.equal(translations[0].extracted_checklists[0].itemId, stableItemId("Alpha"));
      assert.equal(translations[2].extracted_checklists[0].itemId, stableItemId("Draft"));
    });
  } finally { await client.end(); }
});

test("migration backfills stored checklist IDs before remapping progress", () => {
  assert.match(migration, /UPDATE "chapter_translations"/);
  assert.match(migration, /sha256\(convert_to\(item->>'labelHtml', 'UTF8'\)\)/);
  assert.match(migration, /WITH ORDINALITY/);
  assert.ok(migration.indexOf('UPDATE "chapter_translations"') < migration.indexOf('DELETE FROM "checklist_progress"'));
});

test("migration preserves published language mappings and resolves duplicates by latest update", () => {
  assert.match(migration, /translation_status = 'PUBLISHED'/);
  assert.match(migration, /DISTINCT ON \(p.user_id, p.book_id, p.chapter_slug, item->>'itemId'\)/);
  assert.match(migration, /p.updated_at DESC/);
  assert.ok(migration.indexOf('CREATE TEMP TABLE checklist_progress_remapped') < migration.indexOf('DELETE FROM "checklist_progress"'));
});
