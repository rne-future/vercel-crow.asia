# crow.asia

Platform playbook kepemimpinan dengan katalog, pembelian akses, dan pembaca web interaktif. Pembaca dapat membuka bab contoh, membeli paket melalui Mayar, lalu mengakses koleksi, checklist praktik, dan PDF dari dashboard.

## Kemampuan aplikasi

| Area | Implementasi |
| --- | --- |
| Pembaca | Bab contoh dan berbayar, tema kertas, ukuran teks, personalisasi nama, serta animasi Remotion. |
| Akun | Login email/password melalui Auth.js, sesi JWT, dan role reader/editor/admin. |
| Commerce | Paket harga, invoice Mayar, callback pembayaran, dan entitlement per buku. |
| Pencarian | Full-text PostgreSQL dan pencocokan judul; cuplikan mengikuti hak akses. |
| Konten | Naskah Markdown, diagram Mermaid, footnote, checklist, dan video YouTube opsional. |
| Bahasa | Dictionary UI dari database, pengelolaan locale, dan fallback JSON Indonesia/Inggris. |
| Admin | Buku, bab, naskah, paket harga, order, pengguna, locale, dan terjemahan UI. |
| PDF | Signed URL dari bucket private Supabase Storage setelah pemeriksaan hak buku. |

Google login, reset password, dan pencarian berbasis embedding belum tersedia. Rencana pengembangan dibahas terpisah di [rekomendasi](docs/recommendations.md).

## Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL/pgvector, Auth.js, Remotion, Mermaid, Mayar, dan Supabase Storage. Konfigurasi deployment Vercel tersedia pada [vercel.json](vercel.json).

## Mulai mengembangkan

### 1. Siapkan dependency dan environment

Gunakan Node.js 24 untuk mengikuti contoh pengembangan, npm, serta PostgreSQL dengan ekstensi `vector`. Repository belum menetapkan versi Node melalui `engines` atau `.nvmrc`.

```bash
npm ci
test -f .env.local || cp .env.example .env.local
```

Isi `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, dan `APP_URL`. Untuk development lokal, URL aplikasi adalah `http://localhost:4050`; runtime dan migrasi boleh menggunakan koneksi PostgreSQL lokal yang sama. Format dan fungsi seluruh variabel tersedia pada [konfigurasi](docs/configuration.md).

### 2. Siapkan schema dan data awal

```bash
npm run db:migrate
npm run db:seed-translations
```

Seed naskah memerlukan kumpulan file Markdown dengan struktur yang ditentukan pada [panduan konten](docs/content.md):

```bash
MANUSCRIPT_SOURCE_DIR=/path/to/content npm run db:seed
```

Seed naskah juga menyimpan metadata buku dan paket. Gunakan pada instalasi awal atau saat memang ingin menerapkan data seed; edit rutin dilakukan melalui admin.

Untuk membuat akun admin dan pembaca development, gunakan database lokal tersendiri dan tentukan password secara eksplisit:

```bash
SEED_DEV_PASSWORD='<password-development>' npm run db:seed-users
```

Script tersebut memperbarui akun tetap yang didefinisikan di [seed-users.ts](scripts/seed-users.ts), termasuk akun admin `admin@crow.asia`. Jangan gunakan script ini untuk bootstrap production.

### 3. Jalankan aplikasi

```bash
npm run dev
```

Buka **http://localhost:4050**. Untuk pengujian pembayaran simulasi, jalankan `MAYAR_API_KEY=mock_local npm run dev`. Key Mayar asli tetap memanggil API vendor walaupun server berjalan dalam development.

## Struktur repository

```text
app/                  Halaman, route API, dan Server Actions
components/           UI, layout, tampilan domain, landing, dan komposisi animasi
lib/modules/          Service, repository, dan schema validasi domain
lib/integrations/     Auth.js, Mayar, verifikasi webhook, dan Storage REST
lib/db/               Client, schema Drizzle, UUID, dan tipe transaksi
lib/shared/           Error domain dan konfigurasi font
lib/content/          Metadata katalog dan daftar input seed
scripts/              Seed, pemuatan environment, dan smoke database
drizzle/              Migrasi SQL dan snapshot schema
public/               Ilustrasi dan font lokal
tests/                Unit, integrasi database, dan browser
docs/                 Panduan penggunaan dan referensi teknis
```

`scripts/load-env.ts` memuat environment Next.js; perubahan schema dijalankan oleh Drizzle Kit, bukan oleh script environment tersebut.

## Perintah utama

```bash
npm run lint
npm run typecheck
npm test
npm run db:check
npm run build
```

Test database dan browser membutuhkan database terisolasi. Ikuti [panduan pengujian](docs/testing.md) agar perintah penyiapan fixture tidak menulis ke database aplikasi.

## Dokumentasi

Mulai dari [indeks dokumentasi](docs/README.md), atau langsung buka:

- [Konfigurasi environment](docs/configuration.md)
- [Arsitektur, akses, dan model data](docs/architecture.md)
- [Checkout dan pembayaran](docs/payments.md)
- [Referensi API](docs/api-reference.md)
- [Konten dan media](docs/content.md)
- [Bahasa dan terjemahan](docs/i18n.md)
- [Pengujian](docs/testing.md)
- [Deployment dan operasional](docs/deployment.md)
- [Rekomendasi pengembangan](docs/recommendations.md)
