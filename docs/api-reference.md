# Referensi API

[Indeks dokumentasi](README.md) · [Arsitektur](architecture.md) · [Pembayaran](payments.md)

## Konvensi

API memakai route Next.js dan sesi cookie Auth.js. Mutasi login, logout, checkout, dan checklist memerlukan header `Origin` yang persis cocok dengan origin `APP_URL`; bila `APP_URL` kosong, guard menggunakan origin request URL. Origin hilang juga ditolak dengan 403.

Error yang ditangani route berbentuk `{"error":"pesan"}`. Exception lain diteruskan ke Next.js; jangan mengasumsikan setiap respons 500 memiliki schema JSON yang sama. Server Actions admin bukan API REST dan tidak didokumentasikan sebagai endpoint CRUD publik.

## Login

`POST /api/auth/login` menerima form data, bukan JSON.

| Field | Validasi |
| --- | --- |
| `email` | Email valid, trim/lowercase, maksimal 255 karakter. |
| `password` | 1–1024 karakter pada schema login; diperiksa terhadap hash bcrypt user. |

```json
{"ok":true}
```

| Status | Kondisi |
| --- | --- |
| 200 | Credential diterima; cookie sesi diset melalui Auth.js. |
| 400 | Form atau nilai credential tidak valid. |
| 401 | Credential ditolak Auth.js. |
| 403 | Origin tidak sesuai. |
| 429 | Lebih dari 10 percobaan per email dalam window 15 menit. |

Rujukan: [route login](../app/api/auth/login/route.ts), [schema auth](../lib/modules/auth/auth.schema.ts), dan [rate limit](../lib/modules/auth/auth.repository.ts).

## Logout

`POST /api/auth/logout` memerlukan Origin yang sesuai, tanpa payload khusus. Respons berhasil adalah `200 {"ok":true}`. Rujukan: [route logout](../app/api/auth/logout/route.ts).

## Checkout

`POST /api/checkout/process` menerima `application/json`. Gunakan mode Mayar mock dan database test ketika mencoba contoh payload.

```json
{
  "pricing_tier_id": "tier-book-1",
  "customer_email": "reader@example.test",
  "customer_name": "Reader",
  "customer_mobile": "081234567890",
  "password": "example-only-password"
}
```

| Field | Kontrak |
| --- | --- |
| `pricing_tier_id` | ID 1–32 karakter, lowercase alfanumerik/hyphen; tier harus aktif. |
| `customer_email` | Email valid, maksimal 255 karakter; field wajib meskipun order user login memakai email profil. |
| `customer_name` | Opsional/null, trim, maksimal 120 karakter. |
| `customer_mobile` | 8–15 digit dengan prefix `+` opsional. |
| `password` | Opsional pada schema; wajib secara bisnis untuk guest baru. Panjang 8–72 karakter dan maksimal 72 byte UTF-8. |

Schema menolak field JSON tambahan. Client tidak mengirim harga atau daftar buku.

```json
{"payment_link":"http://localhost:4050/checkout/mock-pay/CROW-EXAMPLE"}
```

Contoh link di atas adalah ilustrasi mode mock; mode live mengembalikan URL HTTPS dari provider.

| Status | Kondisi |
| --- | --- |
| 200 | Order dan link pembayaran tersedia. |
| 400 | Payload tidak valid atau guest tidak memberikan password. |
| 403 | Origin tidak sesuai. |
| 404 | Tier tidak ditemukan/nonaktif. |
| 409 | Email guest sudah terdaftar atau pembuatan akun bersamaan mengalami conflict. |
| 429 | Batas 10 percobaan checkout per email/15 menit terlampaui. |
| 502 | Penyiapan invoice gagal. |

Rujukan: [route checkout](../app/api/checkout/process/route.ts) dan [orders service/schema](../lib/modules/orders).

## Callback Mayar

`POST /api/webhooks/mayar` menggunakan token callback, bukan cookie sesi atau guard Origin. Contoh minimal untuk order yang sudah ada:

```json
{
  "event": "payment.received",
  "data": {
    "orderNumber": "CROW-EXAMPLE",
    "status": "SUCCESS"
  }
}
```

```json
{
  "status": "success",
  "order_number": "CROW-EXAMPLE",
  "granted_books": ["book-1"],
  "idempotent": false
}
```

Callback non-paid mengembalikan `status: "received"`, `order_number`, dan `payment_status`. `idempotent: true` berarti order sudah PAID sebelum pemrosesan kali ini.

| Status | Kondisi |
| --- | --- |
| 200 | Callback diproses atau status diterima tanpa fulfillment. |
| 400 | JSON/schema tidak valid. |
| 401 | Token kosong/salah atau signature opsional tidak valid. |
| 404 | Order tidak ditemukan. |
| 409 | Identifier order/invoice/transaksi bertentangan. |
| 413 | Body melebihi 1.000.000 byte UTF-8. |

Kontrak header, prioritas identifier, status, dan replay dijelaskan pada [pembayaran](payments.md). Rujukan route: [webhooks/mayar](../app/api/webhooks/mayar/route.ts).

## Pencarian

`GET /api/search?q=kalibrasi&locale=id&register=standard`.

| Query | Default / batas |
| --- | --- |
| `q` | String kosong; trim, maksimal 200 karakter. Kurang dari 2 karakter mengembalikan `[]`. |
| `locale` | `id`; kode bahasa yang lolos schema locale. |
| `register` | `casual` atau `standard`; didahulukan dari `reg`. |
| `reg` | Alias register. Tanpa keduanya memakai `standard`. Bahasa non-id selalu menggunakan `standard`. |

Hasil maksimal delapan record. Field respons meliputi `book_id`, `volume_code`, `accent_hex`, `chapter_index`, `chapter_slug`, `chapter_title`, `is_free_sample`, `rank`, `snippet`, `is_unlocked`, dan `url`. Tipe aplikasi untuk `rank` adalah `string | null` dari driver SQL; service menormalisasi `chapter_index` menjadi number.

Respons berhasil 200 dengan `Cache-Control: private, no-store`; query tidak valid menghasilkan 400. Snippet hanya mengizinkan markup `<mark>`. Untuk hasil locked, `snippet` kosong. Search tidak memakai fallback locale reader: query locale/register dipakai secara langsung dan dapat menghasilkan array kosong.

Rujukan: [route](../app/api/search/route.ts), [schema](../lib/modules/reader/reader.schema.ts), dan [query SQL](../lib/modules/reader/reader.repository.ts).

## Checklist

`POST /api/checklists/toggle` menerima JSON berikut:

```json
{
  "book_id": "book-1",
  "chapter_slug": "ch-7",
  "item_id": "f00ba4123456",
  "is_completed": true
}
```

ID buku/slug mengikuti pola ID domain maksimal 32 karakter. `item_id` adalah hash konten dari props reader (12 karakter heksadesimal), bukan nomor urut; `is_completed` boolean dan field tambahan ditolak. Service memeriksa buku aktif, bab, hak akses, dan keberadaan ID pada setidaknya satu terjemahan PUBLISHED bab tersebut. Penyisipan/pengurutan ulang tidak memindahkan progress; perubahan label menghasilkan item baru. Label bahasa/ragam yang berbeda mempunyai progress terpisah setelah migrasi.

```json
{"success":true,"is_completed":true,"authenticated":true}
```

Respons 200 memakai `authenticated: false` untuk guest pada bab contoh dan tidak menyimpan progress. Payload invalid menghasilkan 400; Origin atau hak bab yang ditolak 403; bab/item yang tidak ditemukan 404.

Rujukan: [route checklist](../app/api/checklists/toggle/route.ts) dan [toggleChecklist](../lib/modules/reader/reader.service.ts).

## Download PDF

`GET /api/download/pdf/[bookId]` memerlukan sesi cookie.

| Status | Kondisi |
| --- | --- |
| 302 | Redirect melalui header `Location` ke signed URL Storage, bukan stream PDF dari route ini. |
| 400 | Format ID buku tidak valid setelah user terautentikasi. |
| 401 | User belum login. |
| 403 | Tidak memiliki entitlement aktif/role pengelola. |
| 404 | Buku tidak ditemukan/nonaktif. |
| 503 | Konfigurasi/file/signed URL belum tersedia pada kegagalan yang ditangani integration. |

Respons route memakai `Cache-Control: private, no-store`. Timeout, kegagalan transport, atau error parsing tak terduga dapat diteruskan sebagai error server; integration belum mengubah semua kegagalan menjadi 503. Signed URL yang diterima service berlaku 900 detik.

Rujukan: [route PDF](../app/api/download/pdf/[bookId]/route.ts) dan [integration Storage](../lib/integrations/storage.ts).
