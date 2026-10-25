# Refactoring crow.asia → Vercel-Native (Next.js) + Supabase Postgres + R2

> **Status:** Rencana disetujui. **Sumber (Laravel, read-only):** `../crow.asia` · **Repo ini:** `/home/harry/Documents/harry/vercel-crow.asia`
> **Target:** hilangkan runtime PHP, daemon Octane, dan arsitektur stateful → stack TypeScript stateless, zero-config di Vercel, scalable.
> **Keputusan kunci:** Next.js App Router + Drizzle ORM + Auth.js · DB Supabase Postgres + pgvector · Storage Cloudflare R2 · **Tanpa Redis** (cache/session/queue disederhanakan).

## 1. Ringkasan Eksekutif

| Aspek | Eksisting (Laravel) | Target (Vercel-native) |
|---|---|---|
| Framework & router | Laravel 13 + Inertia 3 (`routes/web.php`) | Next.js App Router + TypeScript |
| Runtime | FrankenPHP via Octane (`Dockerfile`, `fly.toml`, `railway.json`) | Vercel serverless functions, zero-config |
| Admin | Filament 5 (6 Resources) | Next.js + shadcn/ui + TanStack Table |
| Form & validasi | Filament Forms + Form Request | React Hook Form + Zod |
| ORM | Eloquent | Drizzle ORM (Prisma sebagai alternatif) |
| Auth | Session DB Laravel (`sessions`) | Auth.js v5 + adapter Supabase Postgres |
| Storage PDF/ilustrasi | Disk `local` (disk `r2` belum didefinisikan) | Cloudflare R2 (presigned + public CDN) |
| Cache chapter | Redis `crow:chapter:v1:*` TTL 7d | Kolom DB hasil compile + ISR/`revalidateTag` |
| Queue/worker | `queue:work`, `crow:warm-cache` | Dihilangkan (sync); Inngest/QStash jalur upgrade |
| Scheduler | `schedule:run` | Vercel Cron (`vercel.json`) bila perlu |
| DB | Postgres pg18 lokal/Docker + pgvector | Supabase Postgres + pgvector (pooler 6543) |

**Non-tujuan:** ganti payment gateway (tetap Mayar); ganti konten buku (`books/**/*.md` tetap source of truth); pipeline embedding lanjutan (kolom `embedding vector(768)` disiapkan, NULL-toleran).

## 2. Inventaris Eksisting (hasil audit, jangan diubah sebelum migrasi)

### 2.1 Routes (`routes/web.php`, 46 baris; CSRF-exempt webhook di `bootstrap/app.php`)

- `GET /` → `LandingController@index`
- `GET /login`, `POST /login`, `POST /logout` → `AuthController`
- `GET /checkout/{tierId}`, `POST /checkout/process` → `CheckoutController`
- `GET /checkout/mock-pay/{orderNumber}` → **dev-only, HAPUS di production**
- `POST /api/webhooks/mayar` → `MayarWebhookController` (header `X-Callback-Token`)
- `GET /dashboard` → `DashboardController` (guard manual, tanpa middleware `auth`)
- `GET /download/pdf/{bookId}` → `DownloadPdfController`
- `GET /read/{bookId}[/{locale}[/{chapterSlug}]]` → `ReaderController@show`
- `POST /api/checklists/toggle` → `ChecklistController`
- `GET /api/search` → `SearchController` (raw SQL `tsvector`, limit 8)

### 2.2 Database (6 migrasi, 16 tabel — Postgres-native, NIHIL sintaks MySQL)

`supported_locales` (9 seed: `id,en,ms,ja,ko,zh-CN,tl,vi,th`) · `users` (uuid PK `DEFAULT uuidv7()`, CHECK `role`/`preferred_id_register`) · `password_reset_tokens` · `sessions` · `cache`/`cache_locks` · `jobs`/`job_batches`/`failed_jobs` · `books` (string PK `book-1..3`, kolom `jsonb`) · `chapters` (unique `uq_book_chapter_slug`, `uq_book_chapter_index`) · `chapter_translations` (`search_vector tsvector` + index GIN, `embedding vector(768)` + index HNSW, CHECK `register`/`translation_status`) · `pricing_tiers` (4 seed: `tier-book-1/2/3`, `bundle-all-3`) · `orders` (uuid `uuidv7()`, CHECK `payment_status`, unique `order_number`/`mayar_*`) · `user_entitlements` (`uq_user_book`) · `checklist_progress` (`uq_user_checklist`).

### 2.3 Services & Enums (`app/Services`, `app/Enums`)

- `Payment/MayarInvoiceService.php` — mock bila key kosong/`mock_*`, live `POST {base}/invoice/create`.
- `Payment/EntitlementSyncService.php` — auto-create user by email, `firstOrCreate` entitlement per `included_book_ids` (idempoten).
- `Content/ChapterCompilerService.php` (394 baris) — CommonMark (table+footnote+tasklist) + sanitizer allowlist + transform callouts/practice-cards/mermaid/footnotes-drawer/teammate-token + preview + remotion 4-step props. **Port 1:1 ke `lib/content/compiler.ts`.**
- `Content/ManuscriptParserService.php` — split `##`, drop preamble/TOC, merge riset→ch-14 bila ≥15 chapter, inject footnotes. **Port ke `lib/content/parser.ts`.**
- `Content/ChapterCacheService.php` — **HAPUS** (Redis). Diganti ISR + kolom DB.
- Enums: `ContentRegister` (casual/standard), `PaymentStatus` (PENDING/PAID/CLOSED/EXPIRED), `TranslationStatus` (DRAFT/REVIEW/PUBLISHED).

### 2.4 Filament Admin (24 file, 6 Resources, tanpa Pages/Widgets kustom)

Books (Katalog & Konten) · Chapters (+filter `book_id`, field YouTube kondisional) · PricingTiers (Bisnis & Penjualan) · Orders (+filter status tanpa CLOSED, **action `mark_paid`** → set PAID + `syncEntitlements`) · Users (+filter role, kolom `entitlements_count`, **action `grant_access`** → `firstOrCreate` entitlement) · SupportedLocales (+kolom `is_active` inline-toggle). Semua List+Create+Edit standar + bulk delete.

### 2.5 Frontend (`resources/js` — 5 Pages, 18 components)

`Landing` (quiz → rekomendasi book, katalog Remotion cover, pricing) · `Reader/ChapterView` (mode read/animasi, paywall, checklist optimistik, search Ctrl+K, locale/register switch) · `Checkout` (prefill user, `router.post /checkout/process`) · `Dashboard` (allBooks + 5 order terakhir + checklist count) · `Auth/Login`. Invarian locale/register yang WAJIB dipertahankan: landing selalu `standard`; reader `locale≠id → standard`, `locale=id → ?reg/cookie/standard`; dashboard `locale=id → casual`; search `locale=id → param reg` else `standard`.

### 2.6 Storage & deploy saat ini

`FILESYSTEM_DISK=local`, `storage/app/*` kosong, tanpa alur upload. `DownloadPdfController` butuh disk `r2` yang **belum ada** di `config/filesystems.php` (hanya `services.r2.bucket/endpoint`) → selalu fallback dummy PDF. `pdf_r2_keys` diisi manual di `SeedManuscriptsCommand`. Ilustrasi statis `public/illustrations/book-{1,2,3}/` (51 file) direferensi hardcoded (`Landing.tsx:491`, `LandscapeImageCarousel16x9.tsx:76,94`). Deploy: `Dockerfile` (FrankenPHP 1.13 + PHP 8.5) dipakai Fly/Railway/Compose; **`vercel.json` belum ada**.

## 3. Target Architecture

```
app/(marketing)/page.tsx                  ← Landing
app/login/page.tsx
app/dashboard/page.tsx
app/checkout/[tierId]/page.tsx + actions.ts
app/read/[bookId]/[[...parts]]/page.tsx   ← /read/book/locale/slug + ?reg
app/api/search/route.ts
app/api/checklists/toggle/route.ts
app/api/webhooks/mayar/route.ts
app/api/download/pdf/[bookId]/route.ts    ← redirect R2 presigned
app/admin/books|chapters|tiers|orders|users|locales/page.tsx + actions.ts
lib/db/schema.ts  lib/auth.ts  lib/i18n.ts  lib/mayar.ts  lib/entitlements.ts
lib/content/compiler.ts  lib/content/parser.ts
scripts/seed-manuscripts.ts               ← port crow:seed-manuscripts
drizzle.config.ts  vercel.json  .env.example
```

## 4. Strict Serverless Guardrails (wajib dipatuhi)

1. **Stateless:** tidak ada singleton memory/global antar-request; tidak ada `node-cache` global mutable. State → Supabase/ISR.
2. **Filesystem:** read-only kecuali `/tmp` (≤500 MB, sementara). Upload → stream langsung ke R2 presigned URL.
3. **Pooling:** runtime selalu via Supabase pooler (6543 / `?pgbouncer=true&sslmode=require`). DDL/migrasi hanya via direct connection (5432) dari CI/lokal — **bukan** dari serverless function.
4. **Jobs/timeout:** tidak ada background thread di request handler. Compile markdown saat seed/build. Email/laporan masa depan → Inngest/QStash.
5. **Validasi & cookie:** semua Server Action/Route Handler validasi Zod dulu; cookie session `HttpOnly; Secure; SameSite=Lax`.
6. **Secret:** `SERVICE_ROLE_KEY`, `MAYAR_*`, `R2_*` hanya server-side (tanpa prefix `NEXT_PUBLIC_`).

## 5. Migrasi Database ke Supabase

### 5.1 Persiapan project Supabase

1. Buat project di region SG/APAC terdekat.
2. Aktifkan extension **`vector`** via Dashboard → Database → Extensions (jangan andalkan `CREATE EXTENSION` dari migrasi — non-superuser).
3. Verifikasi pgvector mendukung `vector(768)` + `USING hnsw … vector_cosine_ops`; bila belum, fallback `USING ivfflat` dan catat di ADR.
4. Siapkan dua connection string: **pooler (6543)** untuk runtime Vercel, **direct (5432)** untuk `drizzle-kit migrate`.

### 5.2 Port skema (Drizzle, tipe identik)

Port 1:1 dari §2.2: `supported_locales` + 9 seed · `users` · `password_reset_tokens` · `books` · `chapters` (+ 2 unique) · `chapter_translations` (+ `search_vector` GIN, `embedding` HNSW, 2 CHECK) · `pricing_tiers` · `orders` (+ CHECK, 3 unique) · `user_entitlements` (`uq_user_book`) · `checklist_progress` (`uq_user_checklist`). **Tidak dibawa:** `sessions` Laravel (diganti tabel Auth.js — putuskan skema di ADR), `cache`/`cache_locks`, `jobs`/`job_batches`/`failed_jobs`. `jsonb`, `timestamptz`, `CHECK`, FK `cascade/nullOnDelete/restrict` tetap.

### 5.3 Jebakan Supabase (wajib ditangani, dari temuan audit)

- **`uuidv7()` default (4 tabel) tidak ada di Supabase PG 15/17** → migrasi gagal. Solusi: default `gen_random_uuid()` + generate UUID v7 di TS (rekomendasi), atau shim `uuid_generate_v7()` via `pgcrypto`.
- **`CREATE EXTENSION vector`** → jadikan idempoten/gated; sumber kebenaran = dashboard.
- **RLS:** skema Laravel berasumsi koneksi bypass-RLS. Keputusan awal: runtime Next.js pakai **service-role/pooler bypass** (minim, konsisten dengan guard `hasAccessToBook`); RLS penuh + Supabase Auth = fase 2. Supabase linter akan flag tabel tanpa RLS — suppress dengan justifikasi.
- **`sslmode=require` wajib** (`prefer` saat ini tidak cukup). Pooler transaksi + prepared statement bisa konflik → driver harus pooler-safe (`pgbouncer=true` + nonaktifkan prepared statements sesuai driver).

### 5.4 Seed & search

`scripts/seed-manuscripts.ts` (port `SeedManuscriptsCommand`): seed locales/books/tiers/users → parse `books/**/*.md` → `firstOrCreate Chapter` + `upsert ChapterTranslation` → `UPDATE search_vector = setweight(to_tsvector('simple',title),'A') || setweight(to_tsvector('simple',raw_markdown),'B')`. `embedding` tetap NULL.
`GET /api/search`: port SQL `SearchController:33-54` (`websearch_to_tsquery`, `ts_rank_cd`, `ts_headline … StartSel=<mark>`, fallback `ILIKE`, `LIMIT 8`) + invarian register + flag `is_unlocked` per baris (free ‖ admin ‖ `hasAccessToBook`).

## 6. Auth, Checkout & Webhook

- **Auth.js v5 credentials:** error message Indonesia sama (`Alamat email atau password tidak sesuai.`); `remember=true` → session maxAge panjang; tanpa register/forgot (sesuai eksisting). Guard admin: `role IN (admin, editor)` (port `User::canAccessPanel`).
- **Checkout Server Action:** validasi Zod (`pricing_tier_id exists`, email); buat `Order` (`CROW-YYYYMMDD-RAND6`, `user_id` nullable untuk guest, status PENDING); `lib/mayar.ts` (port `MayarInvoiceService`: mock vs live `POST {base}/invoice/create`); redirect ke `payment_link`.
- **Webhook `app/api/webhooks/mayar/route.ts`:** cek `X-Callback-Token` timing-safe → lookup by `order_number` lalu `mayar_invoice_id` → idempotensi via **advisory lock / status-check + unique constraint** (pengganti `Cache::lock` Redis) → mapping `PAID/SETTLED/SUCCESS/… → PAID`, `EXPIRED/FAILED/CANCELLED → EXPIRED`, simpan `raw_webhook_payload` → `lib/entitlements.ts` (port `EntitlementSyncService`: auto-create user by email, link `order.user_id`, `upsert` entitlements, return granted books). Uji double-fire.
- **`mock-pay` DILARANG deploy ke production.**

## 7. Reader, Dashboard, Checklist, PDF

- **Reader:** urutan `ReaderController@show` dipertahankan — book aktif → locale valid → register invarian → chapter → paywall (`free ‖ admin ‖ hasAccessToBook`) → translation (+fallback locale) → masking bila terkunci (`safe_preview_html`, potong `remotion steps[0]`, youtube null) → merge checklist → sidebar unlock map. RSC + Client Islands (`next/dynamic ssr:false` untuk Remotion/mermaid).
- **Dashboard:** guard redirect login; invarian `locale=id → casual` (beda dari reader — pertahankan); 5 order terakhir + count checklist per book.
- **Checklist toggle:** validasi Zod; auth → `upsert`; guest → `{authenticated:false}` tanpa tulis.
- **Download PDF:** `401/403/404` sama; ambil `pdf_r2_keys.a5` → R2 presigned GET +15 mnt → redirect; fallback dummy hanya non-production.

## 8. Admin Parity (Filament → Next.js)

Per resource di §2.4 → `app/admin/*` + TanStack Table + RHF+Zod: KeyValue = dynamic key-value editor, Tags = tag input, `is_active` locales = optimistic toggle cell, field YouTube kondisional via `watch`, filter `book_id`/status/role, bulk delete, dan dua custom action sebagai Server Action + dialog konfirmasi: **`mark_paid`** (set PAID + `syncEntitlements`) dan **`grant_access`** (`firstOrCreate` entitlement).

## 9. Frontend & Storage

- Port 5 Pages + komponen per §2.5; `router.visit` → `router.push` + cookie `crow:locale`/`crow:id-register`; `useTranslation.ts` → `lib/i18n.ts` (server+client, `lang/*.json` tetap); checklist optimistik + `fetch`; prev/next pertahankan `?reg=` bila `locale==id`.
- Ilustrasi & font: pindah ke R2/CDN atau `public/` Next dengan **path identik** (`/illustrations/…`, `/fonts/crow/fonts.css`) agar referensi hardcoded tidak pecah. `welcome.blade.php` + `public/build/*` dihapus, diganti `next build`.

## 10. Env & Vercel Config

```bash
# .env.example (baru — ganti stub sqlite/mysql:3306 & hapus OCTANE_*/CACHE_STORE=redis/DB_HOST lokal)
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres?sslmode=require
NEXTAUTH_SECRET=  NEXTAUTH_URL=  APP_URL=
SUPABASE_URL=  SUPABASE_ANON_KEY=  SUPABASE_SERVICE_ROLE_KEY=   # server-only
MAYAR_API_KEY=  MAYAR_BASE_URL=  MAYAR_WEBHOOK_TOKEN=          # server-only
R2_ACCOUNT_ID=  R2_ACCESS_KEY_ID=  R2_SECRET_ACCESS_KEY=  R2_BUCKET=  R2_PUBLIC_URL=
```

`vercel.json`: `regions: ["sin"]`, cron revalidasi harian (opsional). CI: `tsc --noEmit`, `drizzle-kit check`, `next lint`, Playwright E2E (landing → checkout(mock) → webhook idempoten → dashboard → reader paywall → search → checklist → download redirect).

## 11. Tahapan Eksekusi

1. **Schema & koneksi:** Drizzle schema + `drizzle.config.ts` (pooler vs direct) + smoke `SELECT 1` dari Preview; aktifkan `vector`; putuskan shim `uuidv7`.
2. **Seed & search:** port parser+compiler → seed → verifikasi `search_vector` + `/api/search` (8 hasil + snippet `<mark>`).
3. **Auth+entitlement:** Auth.js + `syncEntitlements` + webhook idempoten.
4. **Reader+paywall:** masking + checklist + sidebar + invarian locale/register.
5. **Checkout+dashboard+PDF:** order create, agregat dashboard, R2 presigned.
6. **Admin parity:** 6 resources + 2 action + inline toggle.
7. **Cutover:** freeze tulis Laravel → final seed → DNS → hapus `mock-pay`; arsip/hapus `Dockerfile/fly.toml/railway.json/compose.yaml`; tulis ADR + runbook.

## 12. Verifikasi, Risiko & Keputusan Terbuka

- **Verifikasi:** build hijau; Playwright E2E; replay webhook aman; matriks paywall (guest/free/paid/admin × id/en × casual/standard); `EXPLAIN` search (<200 ms p95 target); presigned PDF 15 mnt.
- **Risiko:** (1) pgvector/HNSW Supabase ≠ pg18 lokal → fallback ivfflat. (2) `uuidv7()` → §5.3. (3) Pooler/prepared-statement → driver pooler-safe. (4) Remotion SSR → client-only. (5) KeyValue/Tags Filament → custom editor + Zod `record(string,string)`.
- **Keputusan arsitektur: lihat [`ADR.md`](./ADR.md)** (ADR-006 s/d ADR-010, ACCEPTED): **Drizzle + Auth.js + service-role bypass** (Supabase Auth/RLS = fase 2); tabel Auth.js standar gantikan `sessions` Laravel.
