# Konfigurasi environment

[Indeks dokumentasi](README.md) · [Menjalankan aplikasi](../README.md#mulai-mengembangkan)

## Cara pemuatan

Next.js membaca environment saat proses berjalan. Script database memakai [scripts/load-env.ts](../scripts/load-env.ts), yang memanggil `loadEnvConfig(process.cwd())` dari `@next/env`. Variabel yang sudah diberikan oleh shell/proses memiliki prioritas terhadap nilai file environment.

Gunakan [.env.example](../.env.example) sebagai template dan simpan nilai lokal di `.env.local`, yang diabaikan Git. Dokumentasi tidak menyimpan password, token, atau isi `.notes/`.

## Database

| Variabel | Diperlukan untuk | Perilaku |
| --- | --- | --- |
| `DATABASE_URL` | Runtime, seed, smoke database | Client DB menolak inisialisasi jika nilai kosong. |
| `DIRECT_URL` | Drizzle Kit migrate | Koneksi DDL pada [drizzle.config.ts](../drizzle.config.ts). |

Untuk PostgreSQL lokal, kedua variabel dapat menggunakan koneksi yang sama:

```dotenv
DATABASE_URL="postgresql://<user>:<password-url-encoded>@localhost:5432/vercel-crow.asia"
DIRECT_URL="postgresql://<user>:<password-url-encoded>@localhost:5432/vercel-crow.asia"
```

Ganti placeholder dan encode karakter khusus password sebagai komponen URL. Database harus sudah dibuat dan user aplikasi memerlukan izin schema/tabel yang sesuai. Ekstensi `vector` perlu tersedia; jika user migrasi tidak dapat membuatnya, minta administrator database menyiapkannya terlebih dahulu.

Untuk deployment yang memakai pooler, arahkan runtime ke connection string pooler dan migrasi ke koneksi DDL yang sesuai. Client runtime mengatur `prepare: false`, `max: 5`, `idle_timeout: 20`, dan `connect_timeout: 10`. Batas pool berlaku per instance, bukan untuk seluruh deployment.

## Autentikasi dan URL

| Variabel | Fungsi |
| --- | --- |
| `NEXTAUTH_SECRET` | Secret Auth.js; perubahan nilainya dapat membatalkan sesi yang ada. |
| `NEXTAUTH_URL` | URL untuk autentikasi. |
| `APP_URL` | Origin yang diharapkan oleh mutasi API dan base URL checkout. |

Gunakan `http://localhost:4050` untuk kedua URL pada development standar. Production memakai origin HTTPS yang sama dengan aplikasi. Saat membuka aplikasi dengan hostname/port lain, sesuaikan nilai URL tersebut; request Origin yang tidak cocok akan ditolak.

Buat secret dengan generator acak, kemudian simpan hasilnya pada environment server:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Login saat ini menggunakan Credentials provider. Variabel Google OAuth belum dikonsumsi oleh konfigurasi auth; rencana penambahannya ada di [rekomendasi](recommendations.md#login-google-dan-penautan-akun).

## Mayar

| Variabel | Fungsi / default |
| --- | --- |
| `MAYAR_API_KEY` | Bearer credential pembuatan invoice. |
| `MAYAR_BASE_URL` | Kosong memakai `https://api.mayar.id/hl/v2`. |
| `MAYAR_WEBHOOK_TOKEN` | Memvalidasi header `x-callback-token`; callback ditolak bila konfigurasi kosong. |
| `MAYAR_WEBHOOK_SIGNING_SECRET` | Mengaktifkan kontrak HMAC opsional untuk gateway yang menandatangani body. |

| Mode server | API key | Hasil |
| --- | --- | --- |
| Development/non-production | Kosong atau prefix `mock_` | Invoice simulasi dan route mock payment. |
| Development/non-production | Key asli | Request ke API Mayar. |
| Production | Kosong atau prefix `mock_` | Pembuatan invoice gagal; mock payment tidak tersedia. |
| Production | Key asli | Request ke API Mayar. |

Signing opsional bukan asumsi tentang header resmi vendor. Sender yang mengaktifkannya harus mengikuti kontrak pada [pembayaran](payments.md#autentikasi-callback).

## PDF dan Supabase Storage

| Variabel | Dipakai runtime | Fungsi |
| --- | --- | --- |
| `SUPABASE_URL` | Ya | Base URL API project untuk Storage REST. |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya | Credential server untuk membuat signed URL. |
| `SUPABASE_STORAGE_BUCKET` | Ya | Nama bucket; default `playbooks`. |
| `SUPABASE_PUBLISHABLE_KEY` | Tidak | Slot konfigurasi key publik untuk integrasi/tooling yang membutuhkannya. |
| `SUPABASE_ANON_KEY` | Tidak | Slot konfigurasi anon key. |

`SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`, `SUPABASE_S3_ACCESS_KEY_ID`, dan `SUPABASE_S3_SECRET_ACCESS_KEY` juga tersedia di template, tetapi belum dikonsumsi route upload/download. Download menggunakan REST, bukan protokol S3. Publishable key dan secret S3 tidak menggantikan service-role key.

## Tooling

| Variabel | Pemakai |
| --- | --- |
| `VERCEL_TOKEN` | Proses Vercel CLI/API yang memuat token tersebut; tidak diperlukan runtime aplikasi. |
| `MANUSCRIPT_SOURCE_DIR` | Seed dan test kompilasi naskah; default `../crow.asia`. |
| `SEED_DEV_PASSWORD` | Wajib tidak kosong untuk membuat akun development baru; tanpa fallback. Seed ulang mempertahankan password akun yang sudah ada. |
| `TEST_DATABASE_URL` | Test integrasi; lihat [isolasi database](testing.md#test-integrasi-database). |
| `NEXT_DIST_DIR` | Mengganti output `.next` untuk memisahkan server/build lokal. |
| `E2E_BASE_URL`, `E2E_PASSWORD`, `E2E_WEBHOOK_TOKEN` | Runner browser; lihat [pengujian](testing.md#test-browser). |
| `BROWSER_PATH` | Executable Chromium opsional pada runner browser. |

Perintah CLI terpisah tidak otomatis membaca `.env.local`. Muat environment pada proses yang membutuhkan nilainya. Jangan memakai satu direktori output Next untuk beberapa server yang berjalan bersamaan.

Rujukan: [client DB](../lib/db/index.ts), [Auth.js](../lib/integrations/auth.ts), [Mayar](../lib/integrations/mayar.ts), [Storage](../lib/integrations/storage.ts), dan [template environment](../.env.example).
