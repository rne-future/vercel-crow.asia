CREATE TABLE "locales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(16) NOT NULL,
	"label" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locales_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_default_locale_active" CHECK (NOT is_default OR is_active)
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale_code" varchar(16) NOT NULL,
	"group" varchar(64) NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"value_type" varchar(16) DEFAULT 'string' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_translation_value_type" CHECK (value_type IN ('string', 'json'))
);
--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_locale_code_locales_code_fk" FOREIGN KEY ("locale_code") REFERENCES "public"."locales"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_locales_default" ON "locales" USING btree ("is_default") WHERE "locales"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_translation_locale_key" ON "translations" USING btree ("locale_code","key");--> statement-breakpoint
CREATE INDEX "idx_translations_locale_group" ON "translations" USING btree ("locale_code","group");--> statement-breakpoint
CREATE INDEX "idx_accounts_user" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chapter_translations_locale_status" ON "chapter_translations" USING btree ("locale","translation_status");--> statement-breakpoint
CREATE INDEX "idx_checklist_book" ON "checklist_progress" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_orders_user_created" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_tier" ON "orders" USING btree ("pricing_tier_id");--> statement-breakpoint
CREATE INDEX "idx_entitlements_book" ON "user_entitlements" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_entitlements_order" ON "user_entitlements" USING btree ("order_id");
--> statement-breakpoint
INSERT INTO "supported_locales" ("code", "name", "native_name", "flag_emoji", "has_dual_register", "is_active", "sort_order")
VALUES ('id', 'Indonesian', 'Bahasa Indonesia', '🇮🇩', true, true, 1),
       ('en', 'English', 'English', '🌐', false, true, 2)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
UPDATE "supported_locales" SET "is_active" = true WHERE "code" = 'id';
--> statement-breakpoint
INSERT INTO "locales" ("code", "label", "is_active", "is_default")
SELECT "code", "native_name", CASE WHEN "code" = 'id' THEN true ELSE "is_active" END, "code" = 'id'
FROM "supported_locales";
