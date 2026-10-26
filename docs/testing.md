# Pengujian

[Indeks dokumentasi](README.md) · [Konfigurasi](configuration.md) · [Konten fixture](content.md)

## Jenis pemeriksaan

| Perintah | Cakupan / batas |
| --- | --- |
| `npm run lint` | ESLint, aturan Next.js, dan boundary import layer UI/routing. |
| `npm run typecheck` | TypeScript tanpa emit; dapat membuat metadata incremental. |
| `npm test` | Unit dan integration test yang diimpor `tests/run.ts`. |
| `npm run test:browser` | Dua suite Playwright Chromium secara berurutan. |
| `npm run test:editor` | Rerender komponen editor asli di Chromium, tanpa server/DB; memerlukan browser Playwright terpasang. |
| `npm run test:reader` | Checklist pada komponen reader asli di Chromium (komponen sekeliling dan fetch di-stub): label duplikat, reorder, keyboard toggle, pending, rollback, dan empty state; tanpa server/DB. |
| `npm run db:check` | Konsistensi berkas migrasi Drizzle; bukan pembandingan schema live dengan seluruh SQL. |
| `npm run db:smoke` | Koneksi dan daftar tabel wajib; tidak membuktikan izin vendor atau keberadaan PDF. |
| `npm run build` | Build produksi Next.js dan pemeriksaan tipe/lint yang dijalankan build. |

Unit test mencakup sanitizer/compiler, parser footnote, validasi, Origin, respons invoice, autentikasi webhook, serta dictionary i18n. Test kumpulan naskah dilewati bila file input tidak tersedia. Test database dilewati bila `TEST_DATABASE_URL` tidak diberikan. Periksa hasil skip sebelum menyatakan seluruh skenario teruji.

## Test integrasi database

Gunakan database khusus yang namanya berakhiran `_test`. Guard test juga menerima satu nama fixture khusus yang terlihat pada source; suffix nama saja tidak membuktikan database aman untuk ditimpa. Jangan menunjuk database development harian atau production.

Contoh berikut memakai URL yang harus diisi sesuai database test yang telah dibuat dan diberi ekstensi `vector`:

```bash
export CROW_TEST_DATABASE_URL='postgresql://<user>:<password-url-encoded>@localhost:5432/crow_test'

DATABASE_URL="$CROW_TEST_DATABASE_URL" DIRECT_URL="$CROW_TEST_DATABASE_URL" npm run db:migrate
DATABASE_URL="$CROW_TEST_DATABASE_URL" MANUSCRIPT_SOURCE_DIR=/path/to/content npm run db:seed
DATABASE_URL="$CROW_TEST_DATABASE_URL" npm run db:seed-translations

TEST_DATABASE_URL="$CROW_TEST_DATABASE_URL" npm test
```

Test `tests/checklist-migration.test.ts` dapat dijalankan sendiri pada database `_test` tanpa seed/vector: `TEST_DATABASE_URL="$CROW_TEST_DATABASE_URL" node --import tsx tests/checklist-migration.test.ts`. Test memakai tabel TEMP dengan bentuk schema lama, mengeksekusi SQL migration asli dalam transaksi, lalu memeriksa pemetaan lintas bahasa, UTF-8, deduplikasi, dan posisi yatim. Test ini dilewati bila URL tidak tersedia; pemeriksaan statis/`db:check` bukan bukti SQL berjalan benar.

Integration suite membutuhkan buku/bab fixture dari seed, termasuk `book-1/ch-7`. Suite memeriksa transaksi pembayaran, callback paralel/replay, snapshot, revoke, paid content, rate limit, locale/default, serta invoice failure menggunakan fetch stub. Suite juga mengubah status terjemahan dan metadata locale fixture; jangan memakai data editorial nyata sebagai fixture.

## Test browser

Runner browser memerlukan server lokal yang sudah berjalan. Validasi host localhost pada runner tidak memeriksa database di balik server tersebut; isolasi harus dipastikan saat menyalakan server.

Siapkan akun fixture pada database test yang sama:

```bash
DATABASE_URL="$CROW_TEST_DATABASE_URL" \
SEED_DEV_PASSWORD=local-browser-test-password \
npm run db:seed-users

npx playwright install chromium
```

`SEED_DEV_PASSWORD` wajib tidak kosong untuk akun baru. Seed ulang tidak mengganti password akun yang sudah ada; gunakan `E2E_PASSWORD` yang sesuai dengan password akun fixture saat ini, bukan menganggap nilai seed baru meresetnya.

Jalankan server pada terminal pertama:

```bash
DATABASE_URL="$CROW_TEST_DATABASE_URL" \
NEXTAUTH_SECRET=local-only-browser-test-secret-at-least-32-characters \
APP_URL=http://localhost:4051 \
NEXTAUTH_URL=http://localhost:4051 \
MAYAR_API_KEY=mock_local \
MAYAR_WEBHOOK_TOKEN=local-browser-webhook-token \
MAYAR_WEBHOOK_SIGNING_SECRET= \
SUPABASE_URL= \
SUPABASE_SERVICE_ROLE_KEY= \
NEXT_DIST_DIR=.next-browser \
npx next dev --port 4051
```

Variabel contoh secret/password di atas hanya fixture lokal. Assignment kosong menonaktifkan signing gateway dan koneksi storage pada server test, sehingga konfigurasi vendor dari `.env.local` tidak digunakan untuk dua integrasi tersebut.

Pada terminal kedua, jalankan:

```bash
E2E_BASE_URL=http://localhost:4051 \
E2E_PASSWORD=local-browser-test-password \
E2E_WEBHOOK_TOKEN=local-browser-webhook-token \
npm run test:browser
```

`CROW_TEST_DATABASE_URL` harus tersedia pada terminal yang menjalankan perintah penyiapan/server. Shell environment tidak otomatis dibagikan ke terminal lain.

### Parameter runner

| Variabel | Fungsi |
| --- | --- |
| `E2E_BASE_URL` | Base URL server; default `http://localhost:4051`. |
| `E2E_PASSWORD` | Password akun fixture `admin@crow.asia`. |
| `E2E_WEBHOOK_TOKEN` | Token yang sama dengan server test. |
| `BROWSER_PATH` | Executable Chromium opsional. |

Suite penuh memerlukan development/mock mode. Suite tersebut membuat guest/order, menandai pembayaran simulasi, menyimpan checklist, dan mengubah fixture dictionary/locale. Suite i18n mengembalikan nilai terjemahan utama setelah selesai dan menonaktifkan locale fixture; ini tetap bukan suite read-only.

Repeated login dapat mencapai batas 10 percobaan/email/15 menit. Gunakan database test bersih atau tunggu window sesuai kebutuhan; jangan menonaktifkan limiter aplikasi hanya untuk menjalankan suite.

## Praktik perubahan

Perubahan kontrak API perlu memperbarui [referensi API](api-reference.md) dan test validasi/response. Perubahan alur pembayaran perlu mempertahankan test rollback, konkurensi, snapshot, dan revoke. Perubahan dictionary perlu memeriksa round-trip array, fallback, dan invalidasi setelah write.

Build/test pada source yang sama tidak mencakup pembayaran Mayar sungguhan, akses bucket live, seluruh browser, load test, atau pengukuran CLS lapangan. Verifikasi integrasi vendor memerlukan environment serta data uji yang sesuai.

Rujukan: [runner unit](../tests/run.ts), [integration suite](../tests/database.test.ts), [browser flow](../tests/browser-flow.cjs), [browser i18n](../tests/browser-i18n.cjs), dan [scripts package](../package.json).
