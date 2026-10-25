# vercel-crow.asia

Vercel-native rewrite of [crow.asia](../crow.asia) (Laravel 13 + Filament + Octane, read-only source) → **Next.js App Router + TypeScript + Drizzle ORM + Auth.js v5**, DB **Supabase Postgres + pgvector**, storage **Cloudflare R2**, **tanpa Redis**.

## Dokumen

- [`docs/refactor/README.md`](./docs/refactor/README.md) — rencana refactoring komprehensif (audit, arsitektur target, tahapan eksekusi).
- [`docs/refactor/ADR.md`](./docs/refactor/ADR.md) — ADR-006 s/d ADR-010 (ACCEPTED): Next.js full-rewrite, Drizzle, Auth.js fase 1, R2, tanpa Redis.

## Struktur (target, lihat README refactor §3)

```
app/            ← App Router: (marketing), login, dashboard, checkout, read, api/*, admin/*
lib/            ← db/schema, auth, i18n, mayar, entitlements, content/compiler+parser
scripts/        ← seed-manuscripts.ts
public/         ← aset statis (path ilustrasi/font identik dengan sumber)
drizzle.config.ts  vercel.json  .env.example
```

## Mulai

```bash
cp .env.example .env.local   # isi kredensial Supabase/R2/Mayar (lihat docs/refactor/README.md §10)
```
