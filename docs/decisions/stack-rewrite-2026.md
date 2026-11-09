# Stack Rewrite 2026 — Status & Aturan Kerja

> Dokumen ini dibuat 8 November 2026 supaya sesi Claude Code manapun — termasuk
> sesi baru tanpa riwayat percakapan sama sekali — bisa langsung paham sedang
> di tahap apa, aturan apa yang sudah disepakati, dan risiko apa yang belum
> beres. Baca ini SEBELUM menyentuh kode kalau sedang melanjutkan rewrite ini.
> Update bagian "Status Milestone" setiap kali satu milestone selesai — jangan
> ditunda sampai akhir.

## 0. Prinsip kerja umum (bukan cuma rewrite ini)

Ada di `CLAUDE.md` bagian **"Prinsip Kerja Umum"** (paling atas, sebelum §1
Gambaran Proyek): think before coding, simplicity first, surgical changes,
goal-driven execution. Sumber asli tersimpan verbatim di
`docs/reference/coding-principles.md` + `coding-principles-examples.md`.
Referensi arsitektur target yang jadi acuan seluruh rewrite ini (stack,
BFF, folder structure) ada di `docs/reference/target-stack-readme.md` —
baca itu kalau mau tau PERSIS kenapa sebuah konvensi dipilih begini, bukan
cuma "pokoknya begini".

⚠️ Ada 1 konflik aturan yang belum diputuskan user: soal boleh/tidaknya
komentar kode — lihat catatan di `CLAUDE.md` bagian "Prinsip Kerja Umum".
Sengaja ditunda (user: "nanti saja gak masalah") — jangan tanya ulang.

Ada juga **"Prinsip UX/Produk"** (7 poin, ditempel user 2026-11-09) di
`CLAUDE.md` tepat di bawah "Prinsip Kerja Umum" — berpusat-pengguna,
usability, navigasi konsisten, feedback cepat, performa, aksesibilitas,
UX writing. Ini KRITERIA AUDIT tambahan tiap milestone M4-M7 (bukan cuma
"lulus test" — juga "apakah gampang dipakai kasir/staff yang belum pernah
lihat UI baru ini"), bukan item kerjaan satu kali. 2 poin (performa,
aksesibilitas) belum ada pengecekan otomatis — masih manual/kualitatif.

## 1. Apa ini

Rewrite total 4 app lama (`catalog`, `admin`, `pos`, `finance`) dari
JS/JSX + React Router + Supabase client langsung, ke:

- **TypeScript ketat** (`strict`, `noUncheckedIndexedAccess`, dll — lihat `tsconfig.base.json`)
- **TanStack Router** (code-based, bukan file-based) menggantikan React Router v7
- **TanStack Query** (tetap dipakai, sudah lama jadi standar)
- **Zustand** (tetap, state client-only)
- **Zod** untuk validasi di setiap boundary (env var, request/response Edge Function)
- **Biome** menggantikan ESLint + Prettier
- **BFF via Supabase Edge Functions** — browser TIDAK PERNAH panggil
  `supabase.from(...)` langsung lagi, semua lewat Edge Function
  `{action, input}` dispatch (lihat `supabase/functions/_shared/actions.ts`).
  Pengecualian yang disengaja: Supabase Auth, Realtime, dan inti
  offline-sync POS (Dexie) — ini TIDAK diubah, lihat `CLAUDE.md` §7/§13.
- Plus **app ke-5, `apps/studio`** — porting dari repo terpisah
  `deera-dev/deerastudio` (Next.js, AI photo/video generation untuk
  katalog + content marketing), ke stack yang sama di atas.
- Plus **design system baru, "Aurum"**, dipakai bersama di ke-5 app
  (lihat §4).

Alasan urutan pengerjaan (termudah/paling-gak-kritis dulu): lihat §3.

## 2. Status Milestone (UPDATE INI SETIAP MILESTONE SELESAI)

| # | Milestone | Status | Catatan |
|---|---|---|---|
| M0 | Tooling bootstrap (Biome, Husky, commitlint, CI skeleton) | ✅ Selesai | |
| M1 | `packages/shared` → TS + Zod + Edge-Function callers | ✅ Selesai | |
| M2 | Catalog → TS + Edge Functions + TanStack Router | ✅ Selesai | **Belum pakai Aurum** — masih skin-token lama (Emerald & Gold). Lihat task "Retrofit catalog onto Aurum". |
| M3a | Bangun Aurum jadi kode (tokens.css/Tailwind + 6 komponen TSX di `packages/shared`) + setup error tracking | 🔲 Belum mulai | Lihat §4 |
| — | Retrofit Catalog ke Aurum | 🔲 Belum mulai | Setelah M3a |
| — | Audit & Optimasi: Catalog (retroaktif) | 🔲 Belum mulai | Catalog selesai sebelum aturan "audit dulu" ada |
| M3 | Studio: scaffold ✅ (login jalan) + CRUD models/poses/presets + dashboard + Edge Functions + **desain otorisasi studio-publish** | 🟡 Sebagian | Lihat temuan keamanan di §6 |
| M4 | Admin (23 fitur) → TS + Edge Functions + Aurum | 🔲 Belum mulai | App terbesar (±7x Catalog). Audit dulu, lalu porting + rencana code-splitting |
| M5 | Finance → TS + Edge Functions + Aurum | 🔲 Belum mulai | Audit dulu |
| M6 | POS (risiko tertinggi, offline-sync) → TS + Edge Functions + Aurum + verifikasi hari pasar beneran | 🔲 Belum mulai | Audit dulu |
| M7 | Studio bagian AI (generate/history/content studio, 23 API routes) → Edge Functions + Aurum | 🔲 Belum mulai | Audit dulu + tambahkan cost-cap fal.ai |
| M8 | Beres-beres akhir — E2E semua app (termasuk ALUR LINTAS APP, bukan cuma per-app), hapus kode jalur lama, sapu bersih Aurum | 🔲 Belum mulai | |
| M-later | Tailwind v3 → v4 untuk 4 app lama sekaligus | ⏸️ Ditunda (sengaja) | `packages/shared/styles/index.css` dipakai bareng via postcss — gak bisa upgrade 1 app doang. Studio sudah v4 dari awal (gak numpang stylesheet shared, jadi gak kena batasan ini). |

**Kewajiban tetap tiap milestone (bukan item sekali-jalan):**
- Audit & Optimasi DULU sebelum porting kode (cari fitur/tabel/function yang tumpang-tindih, mati, atau bisa lebih baik — laporkan ke user sebelum eksekusi, JANGAN hapus apapun tanpa konfirmasi eksplisit).
- Setiap Edge Function baru WAJIB ada test (Deno), bukan cuma deploy+typecheck.
- Update bagian "Status Milestone" di file ini + bagian relevan `CLAUDE.md` SEBELUM pindah ke milestone berikutnya.
- Jangan flip Edge Function dari sisi client tanpa verifikasi HTTP beneran (sandbox dev biasanya gak punya akses network keluar ke Edge Function — perlu browser/Vercel preview asli).
- Komponen reuse via `packages/shared` — jangan reimplementasi Button/Input/dll per app.
- Tanpa komentar kode kecuali 1 baris pendek buat alasan yang gak kelihatan dari kodenya (aturan lama, tetap berlaku).
- Tiap halaman yang di-migrasi dicek terhadap 7 Prinsip UX/Produk (`CLAUDE.md`) sebelum dianggap selesai — bukan cuma lulus typecheck/test.

## 3. Kenapa urutannya begini

Catalog dulu (paling kecil, publik, tanpa auth, tanpa data kritis) buat
buktiin konvensi baru (TS strict, Biome, Zod-env, Edge Function pattern)
di tempat paling murah kalau salah. Studio paralel setelah M1 (beda
codebase, gak gantung ke admin/pos/finance, ngetes BFF pattern di kasus
kedua yang beda — orkestrasi API eksternal berat, bukan cuma CRUD).
Admin (besar tapi cuma online, gak ada offline-sync) → Finance (lebih
kecil, tapi uang gaji — salah dikit ketahuan langsung) → POS TERAKHIR
karena satu-satunya yang punya masalah arsitektur offline/Dexie, jadi
pola Edge Function-nya udah kebukti 2x duluan sebelum dipertaruhkan ke
sistem kasir harian.

## 4. Aurum (design system)

Dibuat sebagai Artifact (type "Design System") di akun claude.ai yang
sama — cari lewat `Artifact({action:"list", type:"Design System"})` kalau
link-nya hilang. Isinya: token warna (2 tema: `dark` jadi wajah utama
Catalog & Studio, `light` default Admin/POS/Finance), tipografi (Fraunces
+ Manrope), spacing/radius/shadow, 6 komponen dasar (Button, Input,
Badge, Card, Modal, Stepper) lengkap kode React + panduan pakai.

Keputusan penting yang JANGAN diulang tanya/debat lagi:
- **Accent BUKAN emas/coklat** — sempat gold (`#C9A769`/`#8C6A2C`), diganti
  ke **indigo** (`#8B8FF0` gelap / `#4549B8` terang) karena kerasa lebih
  "blend in"/futuristik di permukaan gelap. Nama sistemnya tetap "Aurum"
  (artinya emas dalam bahasa Latin) walau warnanya udah bukan emas —
  historis, bukan salah ketik.
- **Gak ada token warna terpisah buat "AI lagi proses"** — dulu ada `info`
  (biru-lavender), dihapus. Status "processing" sekarang pakai `accent`
  yang sama + animasi pulse (motion yang bedain "lagi jalan" vs "statis"),
  bukan warna kedua.
- `dark` = wajah utama Catalog & Studio (dibuka default gelap). `light` =
  default Admin/POS/Finance (kasir baca HP siang hari di pasar, bukan
  dipaksa kaca gelap).
- Semua kontras warna sudah dicek manual WCAG (≥4.5:1 teks, ≥3:1
  border/focus-ring) di KEDUA tema — kalau mau ganti warna token manapun,
  cek ulang kontrasnya, jangan asal ganti hex.
- Komponennya nanti jadi kode ASLI di `packages/shared` (task M3a) — artifact
  Design System itu cuma working draft/preview, bukan sumber kebenaran
  produksi setelah M3a selesai.

## 5. Keputusan arsitektur lain yang sudah final (jangan dibahas ulang)

- **BE sendiri vs Supabase**: TETAP Supabase. Edge Functions = backend
  kita sendiri (sudah ada 14+ function). Biaya di skala ini kecil (~$25/bln
  Pro), ganti infra = risiko besar buat sistem yang jalan tiap hari tanpa
  manfaat sepadan. Jangan diusulkan ulang kecuali skala bisnis berubah
  drastis (jutaan user).
- **Tailwind v3→v4 untuk 4 app lama**: ditunda sengaja (lihat tabel di
  atas), bukan kelupaan.
- **Studio pakai Tailwind v4 sendiri**: boleh beda dari 4 app lama karena
  CSS-nya gak numpang `packages/shared/styles/index.css`.

## 6. Risiko & temuan yang BELUM beres (per 2026-11-08)

Urut dari paling penting:

1. 🔴 **Supabase project masih plan FREE** (`organization.plan: "free"`,
   dicek via MCP `get_organization`) — **TIDAK ADA backup otomatis, tidak
   ada point-in-time-recovery**, sama sekali, untuk database yang dipakai
   bisnis tiap hari (sales, payroll, stok) sejak Mei 2026. User belum bisa
   upgrade ke Pro ($25/bln) karena alasan budget (per 2026-11-08). **Mitigasi
   sementara yang belum dikerjakan**: backup manual terjadwal (mis. GitHub
   Action yang jalanin `pg_dump` via connection string Supabase, simpan
   hasilnya di tempat AMAN — JANGAN commit ke repo publik, isinya data
   pelanggan/payroll). Tawarkan ini ke user kalau sesi mendatang belum ada
   progress soal backup.
2. Studio→`products` punya celah otorisasi nyata: route publish (di
   `deerastudio/app/api/generation-sets/[id]/publish/route.ts`) nulis pakai
   service-role key (bypass RLS total) TANPA cek otorisasi sendiri — cuma
   "kebetulan" lolos kalau baca tabel lain (`ai_generation_sets`) duluan
   berhasil. Risiko terbatas (semua akun staff internal, bukan publik),
   sengaja DITUNDA sampai M3/M7 biar didesain benar (Edge Function dengan
   auth check eksplisit), bukan ditambal di kode Next.js lama yang bakal
   dibuang.
3. RLS baru dicek sebagian (products, transfers, tabel `ai_*`) — belum
   sapu bersih ~70 tabel. Ada task tersendiri buat ini.
4. Biaya generate AI Studio (`ai_cost_log`, nyata dari fal.ai) gak pernah
   masuk laporan Admin/Finance — gap integrasi, bukan bug, masuk backlog
   M5/M7.
5. Belum ada error tracking (Sentry/sejenis) di app manapun — direncanakan
   jadi bagian M3a.
6. Edge Function belum ada test otomatis sama sekali (cuma
   deploy+typecheck) — jadi syarat wajib mulai M4 dst.
7. `npm audit` nunjukin 13 kerentanan (5 moderate, 8 high) — SEMUA di
   dev-tooling (vite, postcss, browserslist, dll), BUKAN kode yang jalan
   di browser user. Gak mendesak, tapi perlu `npm audit fix` suatu saat.
8. Sudah dicek & TERNYATA AMAN (jangan dicurigai ulang): service worker
   Admin/POS cuma buat push notification, gak nyimpen cache file apapun
   (gak ada risiko JS lama ke-cache pas Edge Function API berubah); ukuran
   database cuma 30MB, jauh dari limit manapun; POS baca
   `bahan_pembelian`/`bahan_pinjam` itu BUKAN bug, itu buat hitung BEP yang
   benar di fitur Laporan.
9. Sudah dihapus (2026-11-08, lihat migrasi
   `20261107_drop_stale_stok_warna_backup_tables.sql`): 6 tabel backup
   manual `stok_warna_backup*` yang gak kepake kode manapun.

## 7. Peta koneksi lintas-app (ringkas — detail penuh ada di riwayat chat 2026-11-08)

Tabel yang dipakai 2+ app, wajib dicek dampaknya tiap kali salah satu app
di-migrasi supaya gak putus koneksinya:

- `products` — Admin tulis, Catalog/POS/Finance baca, **Studio tulis balik**
  (foto hasil generate, lihat celah keamanan di §6.2).
- `profiles` — semua app upsert pas login (lewat `useAuth` shared).
- `stok_warna` — Admin & POS sama-sama baca/tulis (ini sumber race-condition
  yang sudah diketahui, Finance baca doang buat costing).
- `product_history` — audit log bersama Admin+POS.
- `hpp_template` — Admin authors, POS & Finance baca buat margin/payroll.
- `karyawan`, `jahit_cards` — penghubung data produksi (Admin) ↔ payroll
  (Finance).

## 8. Kalau mulai sesi baru tanpa context sama sekali

1. Baca file ini dulu, lalu `CLAUDE.md` (sudah ada pointer ke file ini di
   bagian atasnya).
2. Cek task list aktif (kalau masih ada dari sesi sebelumnya) atau anggap
   tabel "Status Milestone" di atas sebagai kebenaran terakhir.
3. Jangan tanya ulang keputusan yang sudah difinalkan di §5 — itu sudah
   dibahas & diputuskan, bukan pertanyaan terbuka.
4. §6 adalah daftar hal nyata yang masih belum beres — jangan anggap
   semuanya sudah aman cuma karena kodenya kelihatan rapi.
