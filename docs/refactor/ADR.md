---
document: ADR-refactor
project: crow.asia
version: 1.0.0-vercel-refactor
date: 2026-10-25
status: Accepted (Winner: Next.js + Drizzle + Auth.js + Supabase Postgres + R2, tanpa Redis)
summary: Architecture Decision Record untuk refactoring crow.asia dari Laravel 13 + Filament + Octane/FrankenPHP ke stack Vercel-native yang stateless dan zero-config.
---

# Architecture Decision Record (ADR): Refactoring `crow.asia` → Vercel-Native

| Atribut Dokumen | Detail |
| :--- | :--- |
| **ID Keputusan** | ADR-006 s/d ADR-010 (`crow.asia` Vercel Refactor Edition) |
| **Tanggal** | 25 Oktober 2026 |
| **Status** | **ACCEPTED (Acuan Resmi `docs/refactor/README.md`)** |
| **Keputusan Pemenang** | **Next.js App Router + TypeScript + Drizzle ORM + Auth.js v5 + Supabase Postgres (`pgvector`) + Cloudflare R2, tanpa Redis** |
| **Keputusan pendahulu** | `docs/blueprint/02-ADR.md` di **repo sumber** (ADR-001 s/d ADR-005, stack Laravel) tetap berlaku sebagai dokumentasi asal; ADR ini menggantikannya untuk target Vercel |
| **Repo sumber (Laravel, READ-ONLY)** | `/home/harry/Documents/harry/crow.asia` (branch `development`) — semua path Laravel di ADR ini (`routes/web.php`, `app/*`, `resources/js/*`, `database/migrations/*`, `config/*`, dst.) merujuk ke sana |

---

## ADR-006: Arsitektur Runtime — Full Rewrite Next.js di Vercel

### 1. Konteks

Target yang disetujui: menghilangkan dependensi runtime PHP, daemon Octane, dan arsitektur stateful → stack TypeScript stateless, zero-config di Vercel, scalable. Semua fitur wajib hidup (lihat `docs/refactor/README.md` §1): Landing, Auth, Checkout Mayar + webhook, Dashboard, Reader + paywall, Search, Checklist, Download PDF, parity admin Filament, ilustrasi, i18n 9 locale. Eksisting: Laravel 13 + Filament 5 + Inertia 3 di FrankenPHP via Octane (`Dockerfile`, `fly.toml`, `railway.json`), tanpa `vercel.json`.

### 2. Perbandingan 3 Kandidat

| Kriteria Evaluasi | Bobot | Kandidat 1: Laravel-on-Vercel (`vercel-php` + `api/index.php`) | Kandidat 2: Split (Next.js statis di Vercel + Laravel API-only di Railway/Fly) | **Kandidat 3: Full rewrite Next.js App Router di Vercel** |
| :--- | :---: | :---: | :---: | :---: |
| **1. Kesesuaian target zero-PHP/stateless** | 30% | 1.5 / 5 *(PHP runtime tetap hidup)* | 1.0 / 5 *(daemon Octane tetap hidup)* | **5.0 / 5** |
| **2. Serverless-fit (admin, queue, FS read-only)** | 25% | 2.0 / 5 *(Filament cold-start berat; `queue:work` & `storage/app` mati)* | 3.5 / 5 *(API aman di container, tapi 2 deploy + sesi lintas domain)* | **4.5 / 5** *(RSC/Server Actions + ISR; Remotion client-only)* |
| **3. Biaya & risiko migrasi** | 20% | 3.5 / 5 *(minim rewrite)* | 2.5 / 5 *(kontrak API + CORS + auth ganda)* | **4.0 / 5** *(rewrite penuh tapi komponen React 19/Remotion reuse)* |
| **4. Operasional jangka panjang** | 15% | 2.0 / 5 *(runtime komunitas, bukan first-class Vercel)* | 2.0 / 5 *(dua platform, dua runbook)* | **5.0 / 5** *(satu deploy, Preview per PR)* |
| **5. Reuse aset frontend** | 10% | 4.0 / 5 | 4.0 / 5 | **4.5 / 5** *(5 Pages + 18 components di `resources/js` port langsung)* |
| **TOTAL SKOR TERBOBOT** | **100%** | **2.28 / 5.00** | **2.23 / 5.00** | **🏆 4.63 / 5.00 (PEMENANG)** |

### 3. Keputusan

**Kandidat 3 menang.** Kandidat 1 gagal di guardrails serverless: Filament + Octane tidak dirancang untuk function ephemeral (cold start, filesystem read-only mematikan `storage/app`, tidak ada `queue:work`/`schedule:run`). Kandidat 2 melanggar tujuan utama (PHP/Octane tetap hidup) sambil menambah kompleksitas sesi lintas domain. Rewrite Next.js reuse logika presentasi React yang sudah ada dan memetakan tiap route `routes/web.php` ke App Router (`docs/refactor/README.md` §3, §7–§8).

### 4. Konsekuensi

- `Dockerfile` / `fly.toml` / `railway.json` / `compose.yaml` diarsipkan atau dihapus saat cutover; `vercel.json` baru (`regions: ["sin"]`).
- Route dev-only `GET /checkout/mock-pay/{orderNumber}` **dilarang** deploy ke production (diganti script/seed lokal).
- Remotion + mermaid wajib client-only (`next/dynamic ssr:false`, hormati `prefers-reduced-motion`).

---

## ADR-007: ORM — Drizzle (Prisma sebagai alternatif yang ditolak)

### 1. Konteks

Skema Postgres-native (§2.2 README): `jsonb`, `tsvector` + index GIN, `embedding vector(768)` + index HNSW, `CHECK`, FK, `uuidv7()` default. Query kritis memakai SQL mentah (`SearchController.php:33-54`: `websearch_to_tsquery`, `ts_rank_cd`, `ts_headline`; `SeedManuscriptsCommand.php:119-124`: update `search_vector`). Koneksi runtime wajib via Supabase pooler 6543.

### 2. Perbandingan 2 Kandidat

| Kriteria Evaluasi | Bobot | Kandidat 1: Prisma | **Kandidat 2: Drizzle ORM** |
| :--- | :---: | :---: | :---: |
| **1. SQL mentah kompleks** | 30% | 3.0 / 5 *(`$queryRaw` bisa, tapi di luar type-system Prisma)* | **5.0 / 5** *(SQL-first, `sql` template type-safe)* |
| **2. DDL kustom PG** | 25% | 2.5 / 5 *(migrate kesulitan `tsvector`/`vector`/HNSW → tetap raw SQL)* | **4.5 / 5** *(`drizzle-kit` + custom types/extensions eksplisit)* |
| **3. Pooler-safe serverless** | 20% | 3.0 / 5 *(perlu Prisma Accelerate / tune pooling)* | **5.0 / 5** *(driver ringan, `pgbouncer=true` + nonaktifkan prepared statements)* |
| **4. Cold-start / bundle** | 15% | 3.0 / 5 *(client + engine berat)* | **5.0 / 5** |
| **5. DX migrasi skema 16 tabel** | 10% | 4.0 / 5 | 4.0 / 5 |
| **TOTAL SKOR TERBOBOT** | **100%** | **2.98 / 5.00** | **🏆 4.78 / 5.00 (PEMENANG)** |

### 3. Keputusan

**Drizzle ORM + `drizzle-kit`.** Pola koneksi ganda: `DATABASE_URL` (pooler 6543, runtime Vercel) + `DIRECT_URL` (direct 5432, DDL dari CI/lokal — bukan dari function). `uuidv7()` default diganti `gen_random_uuid()` + generate UUID v7 di TS (Supabase PG tidak punya `uuidv7()` builtin — lihat README §5.3).

---

## ADR-008: Auth — Auth.js v5 + Service-Role Bypass (Fase 1); Supabase Auth + RLS (Fase 2)

### 1. Konteks

Eksisting: session DB Laravel (`sessions`), guard manual per controller, `User::canAccessPanel()` = `role IN (admin, editor)`, login `remember=true` selalu. Tidak ada register/forgot. Skema berasumsi koneksi bypass-RLS.

### 2. Perbandingan 3 Kandidat

| Kriteria Evaluasi | Bobot | Kandidat 1: Supabase Auth + RLS penuh (langsung) | **Kandidat 2: Auth.js v5 credentials + Drizzle adapter (fase 1)** | Kandidat 3: Clerk / auth eksternal |
| :--- | :---: | :---: | :---: | :---: |
| **1. Kecilnya migrasi (user, hash, guard)** | 35% | 2.0 / 5 *(impor user ke `auth.users`, tulis ulang guard + RLS policies 16 tabel)* | **5.0 / 5** *(hash bcrypt Laravel terverifikasi via `bcryptjs.compare` — tanpa reset paksa; guard `hasAccessToBook` port langsung)* | 2.5 / 5 |
| **2. Kesesuaian serverless Vercel** | 25% | 4.5 / 5 | **4.5 / 5** | 4.0 / 5 |
| **3. Keamanan & kontrol sesi** | 20% | 5.0 / 5 *(RLS end-to-end)* | 4.0 / 5 *(otorisasi di app-layer, pola sama seperti Laravel saat ini)* | 4.5 / 5 |
| **4. Biaya / lock-in** | 10% | 4.0 / 5 | **5.0 / 5** | 2.0 / 5 |
| **5. Operasional (linter, policies)** | 10% | 2.5 / 5 *(16 tabel butuh policies sebelum launch)* | **4.0 / 5** *(supabase linter di-suppress dengan justifikasi)* | 3.5 / 5 |
| **TOTAL SKOR TERBOBOT** | **100%** | **3.28 / 5.00** | **🏆 4.58 / 5.00 (PEMENANG FASE 1)** | 3.10 / 5.00 |

### 3. Keputusan

**Fase 1: Auth.js v5 credentials + `@auth/drizzle-adapter` di Supabase Postgres, runtime memakai koneksi service-role/pooler bypass** — konsisten dengan asumsi otorisasi app-layer Laravel (`auth()->user + hasAccessToBook`). Skema: pakai tabel standar Auth.js (`users/accounts/sessions/verificationTokens`); tabel `sessions` Laravel di-drop, kolom profil domain (`role`, `preferred_locale`, `preferred_id_register`) dipertahankan di `users`. Cookie `HttpOnly; Secure; SameSite=Lax`; `remember=true` → session `maxAge` panjang; pesan error Indonesia dipertahankan. **Fase 2 (terjadwal, bukan blokir launch):** migrasi ke Supabase Auth + RLS policies per tabel.

---

## ADR-009: Storage — Cloudflare R2 (Vercel Blob & Supabase Storage ditolak)

### 1. Konteks

Eksisting: `FILESYSTEM_DISK=local`, tanpa alur upload. `DownloadPdfController.php:28-34` sudah mendesain pola presigned GET +15 menit ke disk `r2` yang **belum pernah didefinisikan** (`config/filesystems.php` tidak punya disk `r2`; hanya `services.r2.bucket/endpoint`), sehingga selalu fallback dummy PDF. `pdf_r2_keys` jsonb diisi manual di seeder. Ilustrasi 51 file di `public/illustrations/` direferensi hardcoded.

### 2. Keputusan

**Cloudflare R2** (S3-compatible). Alasan: (1) melanjutkan intent yang sudah ada di kode (bukan menambah vendor baru); (2) pola presigned +15 menit port langsung ke `app/api/download/pdf/[bookId]/route.ts`; (3) ilustrasi disajikan via public CDN R2 dengan **path identik** (`/illustrations/…`) agar referensi hardcoded tidak pecah; (4) keluar dari Vercel tanpa lock-in. Vercel Blob ditolak (lock-in platform, duplikasi alasan), Supabase Storage ditolak (menambah hop vendor tanpa kebutuhan — DB Supabase tetap fokus Postgres).
Layout: `playbooks/*-a5.pdf` (private, presigned) + `illustrations/**` (public CDN). Fallback dummy PDF hanya `NODE_ENV != production`. Kredensial `R2_*` server-only.

---

## ADR-010: Cache / Queue / Scheduler — Tanpa Redis (Fase 1)

### 1. Konteks

Eksisting bergantung Redis: `CACHE_STORE=redis`, `ChapterCacheService` (`crow:chapter:v1:*`, TTL 7d), `Cache::lock` untuk idempotensi webhook Mayar, `crow:warm-cache`, `queue:work`, `REDIS_HOST` di compose. Keputusan user: sederhanakan **tanpa Redis**.

### 2. Keputusan

| Beban Redis lama | Pengganti tanpa Redis |
|---|---|
| Cache chapter 7d | Kolom hasil compile (`compiled_html`/`safe_preview_html`) + ISR / `revalidateTag('chapter')`; pre-compile saat seed/build |
| `crow:warm-cache` | Dihapus; build-time precompile |
| `Cache::lock("mayar:webhook:…")` | Advisory lock Postgres / status-check + unique constraint di `orders` |
| Session (`sessions`) | Auth.js DB adapter (Supabase, bukan KV) |
| `queue:work` / job async | Sync di request; Inngest/QStash sebagai **jalur upgrade** bila ada beban async nyata |
| `schedule:run` | Vercel Cron (`vercel.json`) bila perlu revalidasi |

Env yang dihapus: `CACHE_STORE=redis`, `REDIS_HOST/PORT`, `OCTANE_*`. Upstash/Vercel KV ditunda ke fase 2 dan hanya bila hit-rate membenarkan.

---

## Fase 2 (tidak memblokir launch)

1. Supabase Auth + RLS policies per tabel (pengganti service-role bypass ADR-008).
2. Pipeline embedding untuk `embedding vector(768)` (kolom disiapkan NULL-toleran).
3. Upstash/Vercel KV bila ISR + DB tidak cukup.
4. Audit log admin (opsional).
