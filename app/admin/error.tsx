"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <main className="max-w-xl space-y-4 p-6" role="alert">
    <h1 className="text-xl font-bold">Permintaan admin belum berhasil</h1>
    <p>Periksa format JSON, nilai field, dan referensi buku yang dipakai. Muat ulang untuk memeriksa data yang tersimpan sebelum mencoba kembali.</p>
    <button type="button" onClick={reset} className="rounded border px-4 py-2">Muat ulang</button>
  </main>;
}
