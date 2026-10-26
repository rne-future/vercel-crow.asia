# Dokumentasi crow.asia

Dokumentasi ini menjelaskan perilaku yang tersedia pada kode aplikasi. Fitur yang masih berupa usulan ditempatkan pada [rekomendasi pengembangan](recommendations.md), bukan pada daftar kemampuan runtime.

## Panduan berdasarkan kebutuhan

| Kebutuhan | Dokumen |
| --- | --- |
| Menjalankan aplikasi pertama kali | [README project](../README.md#mulai-mengembangkan) |
| Menentukan koneksi database dan kredensial vendor | [Konfigurasi](configuration.md) |
| Memahami batas module dan hak akses | [Arsitektur](architecture.md) |
| Memahami order, pembayaran, dan replay callback | [Pembayaran](payments.md) |
| Mengonsumsi endpoint HTTP | [Referensi API](api-reference.md) |
| Menyiapkan atau mengedit naskah/PDF | [Konten](content.md) |
| Mengelola bahasa dan dictionary | [i18n](i18n.md) |
| Menjalankan test dengan data terisolasi | [Pengujian](testing.md) |
| Merilis aplikasi dan memeriksa gangguan | [Deployment](deployment.md) |
| Menentukan pekerjaan berikutnya | [Rekomendasi](recommendations.md) |

## Istilah domain

| Istilah | Arti di aplikasi |
| --- | --- |
| Book | Satu playbook dengan metadata, kumpulan bab, dan object key PDF. |
| Chapter | Identitas bab dalam buku; kontennya berada pada terjemahan bab. |
| Chapter translation | Naskah, hasil kompilasi, locale/register, dan status publikasi sebuah bab. |
| Pricing tier | Paket harga yang berisi daftar ID buku. |
| Order | Pembelian dengan harga dan snapshot buku pada saat checkout. |
| Entitlement | Hak akses user terhadap satu buku, terpisah dari status order. |
| Locale | Kode bahasa antarmuka, misalnya `id` atau `en`. |
| Register | Ragam naskah `casual` atau `standard`; switcher tersedia untuk Indonesia. |
| UI translation | Nilai dictionary antarmuka dengan key bertitik, bukan isi naskah bab. |

## Rujukan implementasi

Perubahan kontrak perlu diikuti pembaruan dokumentasi terkait. Rujukan utama adalah [schema database](../lib/db/schema.ts), [module domain](../lib/modules), [route API](../app/api), [script package](../package.json), dan [test](../tests).

Diagram menggunakan blok Mermaid agar dapat ditampilkan langsung oleh renderer Markdown yang mendukung Mermaid. Relasi pada diagram model data dibatasi pada foreign key yang benar-benar didefinisikan; diagram proses menggambarkan alur service, bukan layanan tambahan yang belum ada.
