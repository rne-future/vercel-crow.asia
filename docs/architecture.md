# Arsitektur aplikasi

[Indeks dokumentasi](README.md) · [Pembayaran](payments.md) · [Referensi API](api-reference.md)

## Komponen dan boundary

```mermaid
flowchart LR
    B[Browser] --> A[Next.js App Router]
    A --> S[Domain services]
    S --> R[Repositories]
    R --> D[(PostgreSQL)]
    S --> I[Integrations]
    I --> M[Mayar API]
    I --> F[Supabase Storage REST]
    S --> C[Next.js Data Cache untuk i18n]
    A --> U[Client UI]
    U --> V[Remotion dan Mermaid]
```

Page, Route Handler, dan Server Action menangani routing, decoding input, respons, serta presentasi. Service menerapkan aturan domain dan otorisasi; repository menjalankan query Drizzle/SQL. Integrasi membungkus SDK/vendor. [ESLint](../eslint.config.mjs) membatasi import DB, ORM, dan repository dari `app/` serta `components/`.

| Module | Tanggung jawab | Entry |
| --- | --- | --- |
| Auth | Credential, sesi/profil, role, dan rate limit | [auth.service.ts](../lib/modules/auth/auth.service.ts) |
| Books | Katalog, tier, library, dan administrasi metadata | [books.service.ts](../lib/modules/books/books.service.ts) |
| Orders | Checkout, invoice, callback, dan fulfillment | [orders.service.ts](../lib/modules/orders/orders.service.ts) |
| Reader | Konten terbit, pencarian, checklist, PDF, dan edit naskah | [reader.service.ts](../lib/modules/reader/reader.service.ts) |
| Entitlements | Kebijakan akses buku dan grant admin | [entitlements.service.ts](../lib/modules/reader/entitlements.service.ts) |
| i18n | Locale, dictionary, fallback, dan cache | [i18n.service.ts](../lib/modules/i18n/i18n.service.ts) |

Service memakai export fungsi/object. Input domain divalidasi melalui schema Zod di module masing-masing. Tidak ada worker antrean, scheduler rekonsiliasi, atau layanan embedding pada runtime saat ini.

## Autentikasi dan role

[Auth.js](../lib/integrations/auth.ts) mengaktifkan Credentials provider, bcrypt, dan sesi JWT dengan `maxAge` 30 hari. Saat token diperiksa kembali tanpa user login baru, callback mengambil profil/role dari database; akun yang sudah hilang kehilangan `token.id`.

| Role | Kemampuan yang diterapkan |
| --- | --- |
| `reader` | Koleksi dan progress milik sendiri; akses buku mengikuti entitlement aktif. |
| `editor` | Area admin, termasuk pengelolaan konten/locale/order dan grant buku; tidak dapat mengubah role user. |
| `admin` | Kemampuan editor ditambah perubahan role user. |

`requireAdmin()` menerima `admin` maupun `editor` dan mengarahkan user lain ke `/login`. Guard ada pada data fetching dan mutasi service/action; middleware locale tidak memutuskan otorisasi admin. Auth.js memiliki konfigurasi Drizzle adapter dan tabel pendukung, tetapi Google/OAuth dan reset password belum diaktifkan sebagai flow aplikasi.

## Pemeriksaan akses reader

```mermaid
flowchart TD
    R[Request reader] --> V{Buku aktif dan bab valid?}
    V -- Tidak --> N[404]
    V -- Ya --> T{Terjemahan PUBLISHED tersedia?}
    T -- Tidak --> N
    T -- Ya --> G{Bab contoh atau user memiliki hak buku?}
    G -- Ya --> F[HTML penuh dan data interaktif yang diizinkan]
    G -- Tidak --> P[Safe preview tanpa checklist, langkah scene, atau video ID]
    F --> U[Serialisasi ke UI reader]
    P --> U
```

Hak buku berasal dari entitlement aktif atau role pengelola. Server membentuk payload sebelum dikirim ke client. Bab contoh tidak membuat seluruh buku menjadi terbuka. HTML disanitasi kembali saat dibaca; metadata buku/daftar bab tetap dapat ditampilkan pada reader terkunci.

PDF selalu membutuhkan login, buku aktif, dan hak buku. Search hanya mengambil buku/locale aktif dan naskah PUBLISHED, serta menyembunyikan snippet paid dari user tanpa hak. Checklist pada bab contoh dapat ditoggle anonim, tetapi tanpa sesi perubahan tersebut tidak disimpan ke database.

## Model data inti

Diagram berikut menampilkan foreign key inti, bukan seluruh kolom atau tabel Auth.js.

```mermaid
erDiagram
    users ||--o{ user_entitlements : user_id
    books ||--o{ user_entitlements : book_id
    users |o--o{ orders : user_id
    pricing_tiers ||--o{ orders : pricing_tier_id
    orders |o--o{ user_entitlements : order_id
    books ||--o{ chapters : book_id
    chapters ||--o{ chapter_translations : chapter_id
    supported_locales ||--o{ chapter_translations : locale
    supported_locales ||--o{ users : preferred_locale
    locales ||--o{ translations : locale_code
    users {
        uuid id PK
        varchar email UK
        varchar role
    }
    books {
        varchar id PK
        jsonb titles
        jsonb pdf_keys
    }
    pricing_tiers {
        varchar id PK
        jsonb included_book_ids
    }
    orders {
        uuid id PK
        varchar order_number UK
        jsonb included_book_ids
        varchar payment_status
    }
    user_entitlements {
        uuid id PK
        uuid user_id FK
        varchar book_id FK
        uuid order_id FK
        boolean is_active
    }
    chapters {
        bigint id PK
        varchar book_id FK
        varchar slug
    }
    chapter_translations {
        bigint id PK
        bigint chapter_id FK
        varchar locale FK
        varchar register
        varchar translation_status
    }
    supported_locales {
        varchar code PK
        varchar native_name
    }
    locales {
        uuid id PK
        varchar code UK
        boolean is_default
    }
    translations {
        uuid id PK
        varchar locale_code FK
        varchar key
        text value
    }
```

- Unique `(user_id, book_id)` membatasi satu record entitlement per pasangan user/buku. `is_active` menentukan aksesnya.
- `included_book_ids` pada tier dan order berupa JSON, bukan relasi junction/FK per elemen. Grant ke buku yang tidak valid dapat menggagalkan transaksi fulfillment.
- `locales` dan `supported_locales` disinkronkan oleh repository i18n berdasarkan kode. Tidak ada foreign key antara kedua tabel tersebut.
- `checklist_progress` memiliki FK user/buku dan unique user/book/slug/item_id. `item_id` adalah 12 digit pertama SHA-256 atas label HTML tersanitasi (UTF-8), disimpan sebagai varchar(16); posisi bukan identitas. Label identik dalam bab berbagi completion, sedangkan label terjemahan berbeda memiliki ID berbeda. Keberadaan bab dan item diperiksa service, bukan FK ke chapter.
- `chapter_translations` memiliki search vector dan embedding `vector(768)`. Query pencarian saat ini memakai full-text dan `ILIKE` judul; belum memakai embedding.

Definisi lengkap tabel, constraint, dan indeks ada di [schema.ts](../lib/db/schema.ts). Berkas [migrasi](../drizzle) adalah riwayat DDL yang dijalankan ke database.
