# Rekomendasi pengembangan

[Indeks dokumentasi](README.md) · [Arsitektur saat ini](architecture.md)

Bagian ini berisi usulan pekerjaan berikutnya. Fitur di bawah belum dianggap tersedia hanya karena tabel, dependency, atau slot environment pendukung sudah ada. Prioritas adalah saran urutan implementasi, bukan jadwal rilis.

| Prioritas | Pekerjaan | Hasil yang diharapkan |
| --- | --- | --- |
| P1 | Google login dan account linking | Login sosial mempertahankan identitas, role, dan pembelian akun yang sama. |
| P1 | Lifecycle akun dan provisioning admin | Admin production dapat dibuat secara terkontrol; pembaca dapat memulihkan akses akunnya. |
| P1 | Rekonsiliasi pembayaran | Order yang tertinggal karena timeout/callback gagal dapat ditinjau dan dipulihkan tanpa grant ganda. |
| P1 | Otomasi test dan isolasi fixture | CI menjalankan skenario penting tanpa memakai data development harian/production. |
| P2 | Operasional storage dan observability | Upload/verifikasi PDF serta diagnosis kegagalan vendor memiliki tooling yang jelas. |
| P2 | Evolusi locale dan konten | Resolusi locale konsisten dan workflow editorial memiliki aturan publikasi yang disepakati. |
| P3 | Embedding dan registry komposisi | Infrastruktur yang disiapkan pada schema mendapat implementasi runtime bila diperlukan produk. |

## Login Google dan penautan akun

**Kondisi saat ini:** [konfigurasi Auth.js](../lib/integrations/auth.ts) hanya mengaktifkan Credentials provider. Route `app/api/auth/[...nextauth]/route.ts`, tombol Google, dan konfigurasi credential Google belum tersedia.

Pekerjaan yang disarankan:

1. Siapkan OAuth Client Web Application dan consent configuration pada Google.
2. Tambahkan Google provider, handler callback Auth.js, serta konfigurasi server `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`.
3. Tambahkan tombol login dan pesan kegagalan melalui dictionary i18n.
4. Tetapkan proses linking untuk pemilik akun email/password, dengan pembuktian akun existing; jangan otomatis memindahkan hak buku hanya berdasarkan email yang belum diverifikasi.

Kriteria penerimaan: user baru mendapat role reader, user lama tetap memiliki order/entitlement yang sama, login password tetap bekerja, role tidak dapat dinaikkan melalui profil provider, dan kegagalan callback ditangani. PostgreSQL tetap menyimpan data aplikasi; login Google tidak mensyaratkan perpindahan database.

## Lifecycle akun dan admin

**Kondisi saat ini:** guest membuat akun melalui checkout. Tabel reset token ada pada schema, tetapi route/form reset password dan registrasi umum belum tersedia. [Seed user](../scripts/seed-users.ts) membuat/memperbarui akun development tetap. Akun baru memerlukan `SEED_DEV_PASSWORD` yang tidak kosong, tanpa fallback; password akun lama dipertahankan.

Tambahkan command provisioning admin production yang tidak menciptakan akun fixture atau menimpa user tanpa keputusan operator. Setelah itu, rancang reset password/invitation dengan token terbatas waktu dan delivery yang sesuai. Jika akun pernah dibuat dengan password fallback versi lama, lakukan rotasi secara terpisah; seed ulang tidak merotasi credential.

Kriteria penerimaan: bootstrap admin tidak bergantung pada seed fixture, reset tidak membocorkan keberadaan akun, token hanya dapat dipakai sesuai kebijakan, dan perubahan credential tidak mengubah kepemilikan pembelian.

## Keandalan pembayaran

**Kondisi saat ini:** fulfillment transaksi/replay sudah tersedia, tetapi [request invoice](../lib/modules/orders/orders.service.ts) belum memiliki retry queue atau rekonsiliasi. Akun/order di-commit sebelum memanggil vendor; timeout dapat memerlukan pemeriksaan keadaan vendor.

Tambahkan job/command rekonsiliasi berdasarkan identifier order/invoice, pencatatan event operasional, serta prosedur penanganan refund/revocation. Bila vendor menyediakan idempotency key untuk pembuatan invoice, gunakan setelah kontraknya diverifikasi terhadap integrasi yang dipilih.

Kriteria penerimaan: operator dapat membedakan invoice gagal dibuat dari respons yang hilang, status lokal dapat dipulihkan dengan bukti vendor, dan pemulihan tidak menggandakan grant atau menghidupkan akses yang sudah dicabut tanpa otorisasi.

## Pengujian dan reproduksibilitas

**Kondisi saat ini:** [package scripts](../package.json) menyediakan pemeriksaan lokal, tetapi repository belum memiliki pipeline CI. Integration/browser suite memerlukan seed fixture dan melakukan mutasi; guard nama database/host lokal tidak menjamin isolasi seluruh data.

Sediakan database disposable per run, fixture khusus test, pembersihan deterministik, dan pipeline lint/typecheck/unit/integration/browser/build. Pin versi Node melalui `engines`/file versi setelah menentukan matriks yang didukung. Tambahkan pemeriksaan tautan dan parsing Mermaid pada pipeline dokumentasi.

Kriteria penerimaan: suite dapat diulang pada environment baru, test yang dilewati terlihat jelas, dan tidak diperlukan akses ke database aplikasi sehari-hari untuk memverifikasi perubahan.

## Storage dan observability

**Kondisi saat ini:** [Storage integration](../lib/integrations/storage.ts) hanya meminta signed URL; uploader admin dan preflight object belum tersedia. Beberapa kegagalan transport/parsing masih diteruskan sebagai exception. Log invoice belum memberi correlation ID lintas request.

Sediakan tooling upload/verifikasi object key, pemetaan error Storage yang konsisten, log terstruktur tanpa secret, serta metrik callback/invoice/fulfillment. Tetapkan kebijakan penggunaan dan backup credential server sesuai infrastruktur.

Kriteria penerimaan: operator dapat menguji keberadaan PDF, menelusuri order dari checkout hingga callback, dan membedakan akses ditolak, object hilang, timeout, serta error vendor.

## Locale, editorial, dan animasi

Satukan aturan locale lintas [middleware](../middleware.ts), page reader, dan helper request agar kombinasi path/query/cookie memiliki perilaku kanonis yang teruji. Tambahkan keputusan produk untuk search pada bahasa tanpa naskah: hasil kosong, fallback eksplisit, atau pemberitahuan UI.

Jika publikasi memerlukan approval, implementasikan aturan transisi role/status; saat ini DRAFT/REVIEW/PUBLISHED dapat dipilih langsung oleh pengelola. Jika beberapa komposisi animasi diperlukan, buat registry yang menghubungkan composition ID tersimpan dengan komponen Player yang benar.

Kolom embedding dan indeks HNSW belum membuat search menjadi semantic search. Implementasi embedding memerlukan pipeline pembuatan/pembaruan vektor, query retrieval, dan evaluasi relevansi sebelum dijadikan kemampuan produk.
