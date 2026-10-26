import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
});

const vector768 = customType<{ data: string; driverData: string }>({
  dataType: () => "vector(768)",
});

const tz = { withTimezone: true } as const;

export const requestRateLimits = pgTable("request_rate_limits", {
  key: varchar("key", { length: 128 }).primaryKey(),
  attempts: integer("attempts").notNull(),
  resetsAt: timestamp("resets_at", tz).notNull(),
}, (t) => [index("idx_request_rate_limits_resets_at").on(t.resetsAt)]);

export const supportedLocales = pgTable("supported_locales", {
  code: varchar("code", { length: 16 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  nativeName: varchar("native_name", { length: 64 }).notNull(),
  flagEmoji: varchar("flag_emoji", { length: 16 }).notNull(),
  hasDualRegister: boolean("has_dual_register").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
  isLlmTranslated: boolean("is_llm_translated").notNull().default(false),
  sortOrder: smallint("sort_order").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locales = pgTable("locales", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 16 }).notNull().unique(),
  label: varchar("label", { length: 64 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_locales_default").on(t.isDefault).where(sql`${t.isDefault} = true`),
  check("chk_default_locale_active", sql`NOT is_default OR is_active`),
]);

export const translations = pgTable("translations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  localeCode: varchar("locale_code", { length: 16 }).notNull()
    .references(() => locales.code, { onDelete: "cascade" }),
  group: varchar("group", { length: 64 }).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  valueType: varchar("value_type", { length: 16 }).$type<"string" | "json">().notNull().default("string"),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_translation_locale_key").on(t.localeCode, t.key),
  index("idx_translations_locale_group").on(t.localeCode, t.group),
  check("chk_translation_value_type", sql`value_type IN ('string', 'json')`),
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 120 }),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: timestamp("email_verified_at", tz),
    image: text("image"),
    password: varchar("password", { length: 255 }),
    role: varchar("role", { length: 20 }).notNull().default("reader"),
    preferredLocale: varchar("preferred_locale", { length: 16 })
      .notNull()
      .default("id")
      .references(() => supportedLocales.code),
    preferredIdRegister: varchar("preferred_id_register", { length: 16 })
      .notNull()
      .default("casual"),
    createdAt: timestamp("created_at", tz).defaultNow(),
    updatedAt: timestamp("updated_at", tz).defaultNow(),
  },
  (t) => [
    index("idx_users_preferred_locale").on(t.preferredLocale),
    check("chk_users_role", sql`role IN ('reader', 'editor', 'admin')`),
    check(
      "chk_users_preferred_id_register",
      sql`preferred_id_register IN ('casual', 'standard')`,
    ),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] }), index("idx_accounts_user").on(t.userId)],
);

export const authSessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", tz).notNull(),
}, (t) => [index("idx_sessions_user").on(t.userId)]);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", tz).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  email: varchar("email", { length: 255 }).primaryKey(),
  token: varchar("token", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", tz),
});

export const books = pgTable("books", {
  id: varchar("id", { length: 32 }).primaryKey(),
  volumeNumber: smallint("volume_number").notNull().unique(),
  volumeCode: varchar("volume_code", { length: 20 }).notNull(),
  priceSingleIdr: integer("price_single_idr").notNull(),
  priceSingleUsd: numeric("price_single_usd", { precision: 6, scale: 2 })
    .notNull()
    .default("4.99"),
  accentHex: varchar("accent_hex", { length: 16 }).notNull().default("#1D4ED8"),
  titles: jsonb("titles").notNull(),
  subtitles: jsonb("subtitles").notNull(),
  targetRoles: jsonb("target_roles").notNull(),
  keyFrameworks: jsonb("key_frameworks").notNull(),
  pdfKeys: jsonb("pdf_keys").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", tz).defaultNow(),
  updatedAt: timestamp("updated_at", tz).defaultNow(),
});

export const chapters = pgTable(
  "chapters",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    bookId: varchar("book_id", { length: 32 })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterIndex: smallint("chapter_index").notNull(),
    slug: varchar("slug", { length: 32 }).notNull(),
    isFreeSample: boolean("is_free_sample").notNull().default(false),
    motifIcon: varchar("motif_icon", { length: 32 }).notNull().default("compass"),
    illustrationPath: varchar("illustration_path", { length: 255 }),
    remotionCompositionId: varchar("remotion_composition_id", { length: 64 })
      .notNull()
      .default("ChapterInteractiveStory16x9"),
    remotionDurationFrames: integer("remotion_duration_frames").notNull().default(540),
    remotionFps: smallint("remotion_fps").notNull().default(30),
    isYoutubeEnabled: boolean("is_youtube_enabled").notNull().default(false),
    youtubeUnlistedId: varchar("youtube_unlisted_id", { length: 64 }),
    createdAt: timestamp("created_at", tz).defaultNow(),
    updatedAt: timestamp("updated_at", tz).defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_book_chapter_slug").on(t.bookId, t.slug),
    uniqueIndex("uq_book_chapter_index").on(t.bookId, t.chapterIndex),
  ],
);

export const chapterTranslations = pgTable(
  "chapter_translations",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    chapterId: bigint("chapter_id", { mode: "number" })
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 16 })
      .notNull()
      .references(() => supportedLocales.code),
    register: varchar("register", { length: 16 }).notNull().default("standard"),
    title: varchar("title", { length: 255 }).notNull(),
    illustrationCaption: text("illustration_caption"),
    rawMarkdown: text("raw_markdown").notNull(),
    compiledHtml: text("compiled_html").notNull(),
    safePreviewHtml: text("safe_preview_html").notNull(),
    hasScripts: boolean("has_scripts").notNull().default(false),
    extractedChecklists: jsonb("extracted_checklists").notNull().default("[]"),
    remotionSceneProps: jsonb("remotion_scene_props").notNull().default("{}"),
    translationStatus: varchar("translation_status", { length: 20 })
      .notNull()
      .default("PUBLISHED"),
    compiledAt: timestamp("compiled_at", tz)
      .notNull()
      .default(sql`NOW()`),
    updatedAt: timestamp("updated_at", tz)
      .notNull()
      .default(sql`NOW()`),
    searchVector: tsvector("search_vector"),
    embedding: vector768("embedding"),
  },
  (t) => [
    uniqueIndex("uq_chapter_locale_register").on(t.chapterId, t.locale, t.register),
    check(
      "chk_chapter_translations_register",
      sql`register IN ('casual', 'standard')`,
    ),
    check(
      "chk_chapter_translations_status",
      sql`translation_status IN ('DRAFT', 'REVIEW', 'PUBLISHED')`,
    ),
    index("idx_chapter_translations_search").using("gin", t.searchVector),
    index("idx_chapter_translations_locale_status").on(t.locale, t.translationStatus),
    index("idx_chapter_translations_embedding").using(
      "hnsw",
      sql`${t.embedding} vector_cosine_ops`,
    ),
  ],
);

export const pricingTiers = pgTable("pricing_tiers", {
  id: varchar("id", { length: 32 }).primaryKey(),
  names: jsonb("names").notNull(),
  descriptions: jsonb("descriptions").notNull(),
  features: jsonb("features").notNull(),
  badges: jsonb("badges"),
  priceIdr: integer("price_idr").notNull(),
  strikePriceIdr: integer("strike_price_idr"),
  priceUsd: numeric("price_usd", { precision: 6, scale: 2 }).notNull(),
  includedBookIds: jsonb("included_book_ids").notNull(),
  sortOrder: smallint("sort_order").notNull().default(1),
  isBestValue: boolean("is_best_value").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", tz).defaultNow(),
  updatedAt: timestamp("updated_at", tz).defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderNumber: varchar("order_number", { length: 64 }).notNull().unique(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    pricingTierId: varchar("pricing_tier_id", { length: 32 })
      .notNull()
      .references(() => pricingTiers.id),
    amountIdr: integer("amount_idr").notNull(),
    includedBookIds: jsonb("included_book_ids"),
    mayarInvoiceId: varchar("mayar_invoice_id", { length: 128 }).unique(),
    mayarTransactionId: varchar("mayar_transaction_id", { length: 128 }).unique(),
    paymentLink: text("payment_link"),
    paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("PENDING"),
    rawWebhookPayload: jsonb("raw_webhook_payload"),
    paidAt: timestamp("paid_at", tz),
    createdAt: timestamp("created_at", tz).defaultNow(),
    updatedAt: timestamp("updated_at", tz).defaultNow(),
  },
  (t) => [
    check(
      "chk_orders_payment_status",
      sql`payment_status IN ('PENDING', 'PAID', 'CLOSED', 'EXPIRED')`,
    ),
    index("idx_orders_customer_email").on(t.customerEmail),
    index("idx_orders_user_created").on(t.userId, t.createdAt),
    index("idx_orders_tier").on(t.pricingTierId),
    index("idx_orders_status_created").on(t.paymentStatus, t.createdAt),
  ],
);

export const userEntitlements = pgTable(
  "user_entitlements",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 32 })
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    grantedAt: timestamp("granted_at", tz)
      .notNull()
      .default(sql`NOW()`),
  },
  (t) => [
    uniqueIndex("uq_user_book").on(t.userId, t.bookId),
    index("idx_entitlements_book").on(t.bookId),
    index("idx_entitlements_order").on(t.orderId),
  ],
);

export const checklistProgress = pgTable(
  "checklist_progress",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 32 })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterSlug: varchar("chapter_slug", { length: 32 }).notNull(),
    itemId: varchar("item_id", { length: 16 }).notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    updatedAt: timestamp("updated_at", tz)
      .notNull()
      .default(sql`NOW()`),
  },
  (t) => [
    uniqueIndex("uq_user_checklist").on(t.userId, t.bookId, t.chapterSlug, t.itemId),
    index("idx_checklist_book").on(t.bookId),
  ],
);
