CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"volume_number" smallint NOT NULL,
	"volume_code" varchar(20) NOT NULL,
	"price_single_idr" integer NOT NULL,
	"price_single_usd" numeric(6, 2) DEFAULT '4.99' NOT NULL,
	"accent_hex" varchar(16) DEFAULT '#1D4ED8' NOT NULL,
	"titles" jsonb NOT NULL,
	"subtitles" jsonb NOT NULL,
	"target_roles" jsonb NOT NULL,
	"key_frameworks" jsonb NOT NULL,
	"pdf_keys" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "books_volume_number_unique" UNIQUE("volume_number")
);
--> statement-breakpoint
CREATE TABLE "chapter_translations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chapter_translations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"chapter_id" bigint NOT NULL,
	"locale" varchar(16) NOT NULL,
	"register" varchar(16) DEFAULT 'standard' NOT NULL,
	"title" varchar(255) NOT NULL,
	"illustration_caption" text,
	"raw_markdown" text NOT NULL,
	"compiled_html" text NOT NULL,
	"safe_preview_html" text NOT NULL,
	"has_scripts" boolean DEFAULT false NOT NULL,
	"extracted_checklists" jsonb DEFAULT '[]' NOT NULL,
	"remotion_scene_props" jsonb DEFAULT '{}' NOT NULL,
	"translation_status" varchar(20) DEFAULT 'PUBLISHED' NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"search_vector" "tsvector",
	"embedding" vector(768),
	CONSTRAINT "chk_chapter_translations_register" CHECK (register IN ('casual', 'standard')),
	CONSTRAINT "chk_chapter_translations_status" CHECK (translation_status IN ('DRAFT', 'REVIEW', 'PUBLISHED'))
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chapters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"book_id" varchar(32) NOT NULL,
	"chapter_index" smallint NOT NULL,
	"slug" varchar(32) NOT NULL,
	"is_free_sample" boolean DEFAULT false NOT NULL,
	"motif_icon" varchar(32) DEFAULT 'compass' NOT NULL,
	"illustration_path" varchar(255),
	"remotion_composition_id" varchar(64) DEFAULT 'ChapterInteractiveStory16x9' NOT NULL,
	"remotion_duration_frames" integer DEFAULT 540 NOT NULL,
	"remotion_fps" smallint DEFAULT 30 NOT NULL,
	"is_youtube_enabled" boolean DEFAULT false NOT NULL,
	"youtube_unlisted_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" varchar(32) NOT NULL,
	"chapter_slug" varchar(32) NOT NULL,
	"item_index" smallint NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(64) NOT NULL,
	"user_id" uuid,
	"customer_email" varchar(255) NOT NULL,
	"pricing_tier_id" varchar(32) NOT NULL,
	"amount_idr" integer NOT NULL,
	"mayar_invoice_id" varchar(128),
	"mayar_transaction_id" varchar(128),
	"payment_link" text,
	"payment_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"raw_webhook_payload" jsonb,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_mayar_invoice_id_unique" UNIQUE("mayar_invoice_id"),
	CONSTRAINT "orders_mayar_transaction_id_unique" UNIQUE("mayar_transaction_id"),
	CONSTRAINT "chk_orders_payment_status" CHECK (payment_status IN ('PENDING', 'PAID', 'CLOSED', 'EXPIRED'))
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"email" varchar(255) PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pricing_tiers" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"names" jsonb NOT NULL,
	"descriptions" jsonb NOT NULL,
	"features" jsonb NOT NULL,
	"badges" jsonb,
	"price_idr" integer NOT NULL,
	"strike_price_idr" integer,
	"price_usd" numeric(6, 2) NOT NULL,
	"included_book_ids" jsonb NOT NULL,
	"sort_order" smallint DEFAULT 1 NOT NULL,
	"is_best_value" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supported_locales" (
	"code" varchar(16) PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"native_name" varchar(64) NOT NULL,
	"flag_emoji" varchar(16) NOT NULL,
	"has_dual_register" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_llm_translated" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" varchar(32) NOT NULL,
	"order_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"granted_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120),
	"email" varchar(255) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"image" text,
	"password" varchar(255),
	"role" varchar(20) DEFAULT 'reader' NOT NULL,
	"preferred_locale" varchar(16) DEFAULT 'id' NOT NULL,
	"preferred_id_register" varchar(16) DEFAULT 'casual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "chk_users_role" CHECK (role IN ('reader', 'editor', 'admin')),
	CONSTRAINT "chk_users_preferred_id_register" CHECK (preferred_id_register IN ('casual', 'standard'))
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_translations" ADD CONSTRAINT "chapter_translations_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_translations" ADD CONSTRAINT "chapter_translations_locale_supported_locales_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."supported_locales"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_progress" ADD CONSTRAINT "checklist_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_progress" ADD CONSTRAINT "checklist_progress_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pricing_tier_id_pricing_tiers_id_fk" FOREIGN KEY ("pricing_tier_id") REFERENCES "public"."pricing_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_locale_supported_locales_code_fk" FOREIGN KEY ("preferred_locale") REFERENCES "public"."supported_locales"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chapter_locale_register" ON "chapter_translations" USING btree ("chapter_id","locale","register");--> statement-breakpoint
CREATE INDEX "idx_chapter_translations_search" ON "chapter_translations" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_chapter_translations_embedding" ON "chapter_translations" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_book_chapter_slug" ON "chapters" USING btree ("book_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_book_chapter_index" ON "chapters" USING btree ("book_id","chapter_index");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_checklist" ON "checklist_progress" USING btree ("user_id","book_id","chapter_slug","item_index");--> statement-breakpoint
CREATE INDEX "idx_orders_customer_email" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_book" ON "user_entitlements" USING btree ("user_id","book_id");
