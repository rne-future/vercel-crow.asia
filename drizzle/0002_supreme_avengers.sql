ALTER TABLE "orders" ADD COLUMN "included_book_ids" jsonb;
--> statement-breakpoint
UPDATE orders SET included_book_ids = pricing_tiers.included_book_ids
FROM pricing_tiers WHERE orders.pricing_tier_id = pricing_tiers.id;
