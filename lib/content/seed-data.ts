export const SUPPORTED_LOCALES = [
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flagEmoji: "🇮🇩", hasDualRegister: true, isActive: true, isLlmTranslated: false, sortOrder: 1 },
  { code: "en", name: "English", nativeName: "English", flagEmoji: "🌐", hasDualRegister: false, isActive: true, isLlmTranslated: false, sortOrder: 2 },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flagEmoji: "🇲🇾", hasDualRegister: false, isActive: false, isLlmTranslated: false, sortOrder: 3 },
  { code: "ja", name: "Japanese", nativeName: "日本語", flagEmoji: "🇯🇵", hasDualRegister: false, isActive: false, isLlmTranslated: false, sortOrder: 4 },
  { code: "ko", name: "Korean", nativeName: "한국어", flagEmoji: "🇰🇷", hasDualRegister: false, isActive: false, isLlmTranslated: false, sortOrder: 5 },
  { code: "zh-CN", name: "Simplified Chinese", nativeName: "简体中文", flagEmoji: "🇨🇳", hasDualRegister: false, isActive: false, isLlmTranslated: false, sortOrder: 6 },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog", flagEmoji: "🇹🇱", hasDualRegister: false, isActive: false, isLlmTranslated: false, sortOrder: 7 },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flagEmoji: "🇻🇳", hasDualRegister: false, isActive: false, isLlmTranslated: false, sortOrder: 8 },
  { code: "th", name: "Thai", nativeName: "ภาษาไทย", flagEmoji: "🇹🇭", hasDualRegister: false, isActive: false, isLlmTranslated: false, sortOrder: 9 },
] as const;

interface BookSeed {
  id: string;
  volumeNumber: number;
  volumeCode: string;
  priceSingleIdr: number;
  priceSingleUsd: string;
  accentHex: string;
  titles: Record<string, string>;
  subtitles: Record<string, string>;
  targetRoles: string[];
  keyFrameworks: string[];
  pdfKeys: Record<string, string>;
  isActive: boolean;
}

export const BOOKS: BookSeed[] = [
  {
    id: "book-1",
    volumeNumber: 1,
    volumeCode: "VOL. 01",
    priceSingleIdr: 59000,
    priceSingleUsd: "4.99",
    accentHex: "#1D4ED8",
    titles: {
      "id:casual": "Mahir Memimpin Tim",
      "id:standard": "Mahir Memimpin Tim",
      "en:standard": "Mastering Team Leadership",
    },
    subtitles: {
      "id:casual": "Panduan Taktis Transisi Individual Contributor Menjadi Team Lead Tangguh",
      "id:standard": "Panduan Taktis Transisi Individual Contributor Menjadi Team Lead Tangguh",
      "en:standard": "A Tactical Field Playbook for First-Time Engineering & Product Team Leads",
    },
    targetRoles: ["First-Time Team Lead", "Senior Engineer", "Product Manager"],
    keyFrameworks: ["Rumus 3K", "Kerangka 4x4", "Kalibrasi L1-L4", "Rencana 30 Hari"],
    pdfKeys: { a5: "playbooks/vol-01-a5.pdf" },
    isActive: true,
  },
  {
    id: "book-2",
    volumeNumber: 2,
    volumeCode: "VOL. 02",
    priceSingleIdr: 79000,
    priceSingleUsd: "6.99",
    accentHex: "#EA580C",
    titles: {
      "id:casual": "Napas Panjang Memimpin Tim",
      "id:standard": "Napas Panjang Memimpin Tim",
      "en:standard": "Endurance in Team Leadership",
    },
    subtitles: {
      "id:casual": "Biar Nggak Boncos Energi & Tetap Waras di Tengah Tekanan Target",
      "id:standard": "Biar Nggak Boncos Energi & Tetap Waras di Tengah Tekanan Target",
      "en:standard": "Navigating Burnout, Sustainable Cadence, and Psychological Safety",
    },
    targetRoles: ["Engineering Manager", "Tech Lead", "Startup Founder"],
    keyFrameworks: ["Beban 30/70", "Audit Energi", "Kapasitas Berkelanjutan", "Boundary Shield"],
    pdfKeys: { a5: "playbooks/vol-02-a5.pdf" },
    isActive: true,
  },
  {
    id: "book-3",
    volumeNumber: 3,
    volumeCode: "VOL. 03",
    priceSingleIdr: 99000,
    priceSingleUsd: "8.99",
    accentHex: "#0F766E",
    titles: {
      "id:casual": "Memimpin Para Leader",
      "id:standard": "Memimpin Para Leader",
      "en:standard": "Leading Other Leaders",
    },
    subtitles: {
      "id:casual": "Dari Mengelola Kerjaan Teknis ke Orkestrasi Manajer & Eksekutif",
      "id:standard": "Dari Mengelola Kerjaan Teknis ke Orkestrasi Manajer & Eksekutif",
      "en:standard": "Orchestrating Senior Engineering Leads, Directors, and Executive Alignment",
    },
    targetRoles: ["VP of Engineering", "Head of Product", "CTO"],
    keyFrameworks: ["Orkestrasi Multi-Tim", "Pendelegasian Bertingkat", "Penyelarasan Eksekutif", "Kaderisasi Leader"],
    pdfKeys: { a5: "playbooks/vol-03-a5.pdf" },
    isActive: true,
  },
];

interface PricingTierSeed {
  id: string;
  names: Record<string, string>;
  descriptions: Record<string, string>;
  features: Record<string, string[]>;
  badges: Record<string, string> | null;
  priceIdr: number;
  strikePriceIdr: number | null;
  priceUsd: string;
  includedBookIds: string[];
  sortOrder: number;
  isBestValue: boolean;
  isActive: boolean;
}

export const PRICING_TIERS: PricingTierSeed[] = [
  {
    id: "tier-book-1",
    names: { id: "VOL. 01: Mahir Memimpin Tim", en: "VOL. 01: Mastering Team Leadership" },
    descriptions: { id: "Menciptakan Tim yang Mandiri & Bisa Diandalkan", en: "Transition from IC to High-Impact Team Lead" },
    features: {
      id: [
        "Buka Penuh Bab 2 s.d. Bab 13 + Lampiran Ringkasan Meja Kerja",
        "Templat Skrip Memberi Target, Memuji, dan Menegur Empat Mata",
        "Format Interaktif Web-Reader + Berkas PDF Siap Cetak",
        "Sekali Bayar • Akses Selamanya",
      ],
      en: [
        "Full Access to Chapters 2–13 + Desk Reference Summary",
        "Ready-to-Copy Scripts for Goal Setting, Praise, and 1-on-1 Feedback",
        "Interactive Web-Reader + Print-Ready PDF",
        "One-Time Payment • Lifetime Access",
      ],
    },
    badges: null,
    priceIdr: 59000,
    strikePriceIdr: null,
    priceUsd: "4.99",
    includedBookIds: ["book-1"],
    sortOrder: 1,
    isBestValue: false,
    isActive: true,
  },
  {
    id: "tier-book-2",
    names: { id: "VOL. 02: Napas Panjang Memimpin Tim", en: "VOL. 02: Endurance in Team Leadership" },
    descriptions: { id: "Mengatasi Kejenuhan & Membangun Sistem Kerja Mandiri", en: "Anti-Burnout & Sustainable Cadence" },
    features: {
      id: [
        "Buka Penuh Bab 2 s.d. Bab 13 + Lampiran Ringkasan Meja Kerja",
        "Templat Skrip Pendelegasian Wewenang & Negosiasi Beban Kerja",
        "Format Interaktif Web-Reader + Berkas PDF Siap Cetak",
        "Sekali Bayar • Akses Selamanya",
      ],
      en: [
        "Full Access to Chapters 2–13 + Desk Reference Summary",
        "Delegation & Capacity Negotiation Script Templates",
        "Interactive Web-Reader + Print-Ready PDF",
        "One-Time Payment • Lifetime Access",
      ],
    },
    badges: null,
    priceIdr: 79000,
    strikePriceIdr: null,
    priceUsd: "6.99",
    includedBookIds: ["book-2"],
    sortOrder: 2,
    isBestValue: false,
    isActive: true,
  },
  {
    id: "tier-book-3",
    names: { id: "VOL. 03: Memimpin Para Leader", en: "VOL. 03: Leading Other Leaders" },
    descriptions: { id: "Dari Mengarahkan Tim ke Menggerakkan Divisi & Cabang", en: "Orchestrating Senior Leads & Directors" },
    features: {
      id: [
        "Buka Penuh Bab 2 s.d. Bab 13 + Lampiran Ringkasan Meja Kerja",
        "Templat Skrip Membina Kepala Tim, Target Cabang, & Mediasi",
        "Format Interaktif Web-Reader + Berkas PDF Siap Cetak",
        "Sekali Bayar • Akses Selamanya",
      ],
      en: [
        "Full Access to Chapters 2–13 + Desk Reference Summary",
        "Lead Coaching, Multi-Branch Alignment, & Mediation Scripts",
        "Interactive Web-Reader + Print-Ready PDF",
        "One-Time Payment • Lifetime Access",
      ],
    },
    badges: null,
    priceIdr: 99000,
    strikePriceIdr: null,
    priceUsd: "8.99",
    includedBookIds: ["book-3"],
    sortOrder: 3,
    isBestValue: false,
    isActive: true,
  },
  {
    id: "bundle-all-3",
    names: { id: "Complete Trilogy Box Set (Volume 01, 02 & 03)", en: "Complete Trilogy Box Set (Volume 01, 02 & 03)" },
    descriptions: {
      id: "Akses menyeluruh seluruh trilogi (39 bab praktis + 3 lampiran), Bahasa Indonesia (Kasual & Standar) + English, dan seluruh berkas PDF A5.",
      en: "Full access to complete trilogy (39 practical chapters + 3 summaries), ID (Casual & Standard) + English, and all A5 PDFs.",
    },
    features: {
      id: [
        "Buka Penuh Seluruh 3 Buku (Total 39 Bab Praktis)",
        "Ratusan Contoh Kalimat & Skrip Percakapan Siap Salin",
        "Bebas Beralih Mode Bahasa Bacaan Kapan Saja (Standar & Kasual)",
        "Akses Web-Reader Selamanya + Unduhan 3 PDF Siap Cetak",
      ],
      en: [
        "Full Access to All 3 Books (39 Practical Chapters)",
        "Hundreds of Ready-to-Copy Scripts for Difficult Situations",
        "Seamless Language & Register Switching (Standard & Casual)",
        "Lifetime Interactive Web-Reader Access + 3 Print-Ready PDFs",
      ],
    },
    badges: { label: "Best Value", color: "#1D4ED8" },
    priceIdr: 149000,
    strikePriceIdr: 237000,
    priceUsd: "11.99",
    includedBookIds: ["book-1", "book-2", "book-3"],
    sortOrder: 4,
    isBestValue: true,
    isActive: true,
  },
];

export const MOTIF_ICONS = [
  "compass",
  "shuffle",
  "layout-grid",
  "ear",
  "help-circle",
  "target",
  "heart",
  "check-square",
  "sparkles",
  "alert-triangle",
  "calendar",
  "activity",
  "sliders",
  "flag",
  "book-open",
] as const;

export function resolveMotifIcon(chapterIndex: number): string {
  return MOTIF_ICONS[chapterIndex] ?? "compass";
}

export interface ManuscriptFile {
  path: string;
  bookId: string;
  locale: string;
  register: "casual" | "standard";
}

export const MANUSCRIPTS: ManuscriptFile[] = [
  { path: "books/id/casual/book-1.md", bookId: "book-1", locale: "id", register: "casual" },
  { path: "books/id/casual/book-2.md", bookId: "book-2", locale: "id", register: "casual" },
  { path: "books/id/casual/book-3.md", bookId: "book-3", locale: "id", register: "casual" },
  { path: "books/id/standar/book-1.md", bookId: "book-1", locale: "id", register: "standard" },
  { path: "books/id/standar/book-2.md", bookId: "book-2", locale: "id", register: "standard" },
  { path: "books/id/standar/book-3.md", bookId: "book-3", locale: "id", register: "standard" },
  { path: "books/en/book-1.md", bookId: "book-1", locale: "en", register: "standard" },
  { path: "books/en/book-2.md", bookId: "book-2", locale: "en", register: "standard" },
  { path: "books/en/book-3.md", bookId: "book-3", locale: "en", register: "standard" },
];
