"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="max-w-xl mx-auto py-12 px-6 text-center space-y-4" role="alert">
      <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center font-bold text-xl">
        ⚠️
      </div>
      <h1 className="text-xl font-black text-[#111113]">Permintaan admin belum berhasil</h1>
      <p className="text-xs text-stone-500 leading-relaxed">
        Periksa format JSON, nilai input, atau dependensi referensi data yang digunakan. Silakan muat ulang untuk memeriksa data yang tersimpan.
      </p>
      <div>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg font-bold text-xs bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
        >
          Muat Ulang Halaman
        </button>
      </div>
    </main>
  );
}
