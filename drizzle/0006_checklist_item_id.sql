-- Run with reader/editor writes paused; Drizzle applies this migration in a transaction.
LOCK TABLE "chapter_translations", "checklist_progress" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
ALTER TABLE "checklist_progress" ADD COLUMN "item_id" varchar(16);--> statement-breakpoint
UPDATE "chapter_translations" ct
SET extracted_checklists = (
  SELECT COALESCE(jsonb_agg(
    item || jsonb_build_object('itemId', left(encode(sha256(convert_to(item->>'labelHtml', 'UTF8')), 'hex'), 12))
    ORDER BY ordinal
  ), '[]'::jsonb)
  FROM jsonb_array_elements(ct.extracted_checklists) WITH ORDINALITY AS items(item, ordinal)
);--> statement-breakpoint
-- Legacy progress had no locale: preserve its mark for each currently published label at that position.
CREATE TEMP TABLE checklist_progress_remapped ON COMMIT DROP AS
SELECT DISTINCT ON (p.user_id, p.book_id, p.chapter_slug, item->>'itemId')
  p.user_id, p.book_id, p.chapter_slug, item->>'itemId' AS item_id, p.is_completed, p.updated_at
FROM "checklist_progress" p
JOIN "chapters" c ON c.book_id = p.book_id AND c.slug = p.chapter_slug
JOIN "chapter_translations" ct ON ct.chapter_id = c.id AND ct.translation_status = 'PUBLISHED'
CROSS JOIN LATERAL jsonb_array_elements(ct.extracted_checklists) WITH ORDINALITY AS items(item, ordinal)
WHERE COALESCE((item->>'itemIndex')::integer, ordinal::integer - 1) = p.item_index
  AND p.item_index >= 0 AND item->>'itemId' IS NOT NULL
ORDER BY p.user_id, p.book_id, p.chapter_slug, item->>'itemId', p.updated_at DESC, p.id DESC;--> statement-breakpoint
-- Unmapped positions cannot be recovered from the old positional key.
DELETE FROM "checklist_progress";--> statement-breakpoint
DROP INDEX "uq_user_checklist";--> statement-breakpoint
ALTER TABLE "checklist_progress" DROP COLUMN "item_index";--> statement-breakpoint
INSERT INTO "checklist_progress" (id, user_id, book_id, chapter_slug, item_id, is_completed, updated_at)
SELECT gen_random_uuid(), user_id, book_id, chapter_slug, item_id, is_completed, updated_at
FROM checklist_progress_remapped;--> statement-breakpoint
ALTER TABLE "checklist_progress" ALTER COLUMN "item_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_checklist" ON "checklist_progress" USING btree ("user_id","book_id","chapter_slug","item_id");
