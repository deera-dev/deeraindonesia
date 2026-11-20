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
| M3 | Studio: scaffold ✅ (login jalan) + CRUD models/poses/presets + dashboard + Edge Functions + **desain otorisasi studio-publish** | 🟡 Sebagian | CRUD models/poses/presets ✅ (2026-11-19): `studio-{models,poses,presets}-crud` Edge Functions di-deploy (forward JWT caller, RLS `authenticated_full_access`), vertical slice lengkap (schema/api/queries/hooks/components) + 136 test + route wiring + AppShell nav. **Otorisasi studio-publish ✅ (2026-11-19)**: `studio-publish` Edge Function di-deploy + 3 secret Cloudinary sudah diisi user manual, lihat §6.2 (resolved) untuk desain lengkapnya. Masih belum dites end-to-end (nunggu M7 atau tes manual). Client masih panggil `supabase.from()` langsung di CRUD models/poses/presets (pola deferred sama kayak M1/M2, lihat §6.10). **Belum**: dashboard generate/history/content (M7), halaman generate yang benar-benar memanggil `studio-publish` (juga M7 — function-nya sudah ada tapi belum ada caller). |
| M4 | Admin (24 fitur) → TS + Edge Functions + Aurum | 🟡 Sebagian | App terbesar (±7x Catalog). Audit ✅ (2026-11-19, `docs/reports/audit-report-m4-admin.md`) + 3 temuan dieksekusi (3 dead hook dihapus, 6 RLS policy dobel dihapus, sinkron 2-arah `toko_kunjungan`↔checklist trip `ngorder-jadwal`). **Pertama kali Edge Function dites beneran dari browser asli (2026-11-19)** sebelum porting mulai — lihat §6.10 (resolved). Porting kode: **produk** (`produk-crud` Edge Function + RPC atomik `save_product`/`delete_product_cascade`, ✅), **stok-opname** (`stok-opname-crud` + RPC `save_stok_opname`, ✅), **pindah-stok-lokasi** (`move_stok_lokasi` identitas dari `auth.uid()`, ✅ — lihat insiden #12), **transfer** (`approve_transfer` identitas dari `auth.uid()`, ✅), **buku-potongan** (dicek, sudah atomik dari sananya, tidak ada perubahan), **produksi-bahan** (RPC `merge_bahan_dupe_group`, ✅), **produksi-hpp** (RPC `save_hpp_template`/`save_hpp_config_value`, ✅), **produksi-record** (RPC `create_produksi_batch`/`update_produksi_batch` + `deleteBatchAndProduct` delegasi ke `delete_product_cascade`, ✅ — lihat insiden #13). Semua RPC di atas ditest langsung di DB production (BEGIN/ROLLBACK, bukan cuma lolos compile) sebelum dianggap selesai. Belum: konversi TS penuh fitur manapun (masih `.js`/`.jsx`, cuma fungsi tulis-DB-nya yang diubah), 16 fitur admin lain (produksi-jahit, produksi-sampel, cmt, ngorder, ngorder-jadwal, pasar-restock, pelanggan, calon-customer, blast, analytics, trafik-katalog, notifikasi, cetak-label, pengiriman, auth, history). |
| M5 | Finance → TS + Edge Functions + Aurum | 🔲 Belum mulai | Audit dulu |
| M6 | POS (risiko tertinggi, offline-sync) → TS + Edge Functions + Aurum + verifikasi hari pasar beneran | 🔲 Belum mulai | Audit dulu |
| M7 | Studio bagian AI (generate/history/content studio, 23 API routes) → Edge Functions + Aurum | 🔲 Belum mulai | Audit dulu + tambahkan cost-cap fal.ai |
| M8 | Beres-beres akhir — E2E semua app (termasuk ALUR LINTAS APP, bukan cuma per-app), hapus kode jalur lama, sapu bersih Aurum | 🔲 Belum mulai | |
| M-later | Tailwind v3 → v4 untuk 4 app lama sekaligus | ⏸️ Ditunda (sengaja) | `packages/shared/styles/index.css` dipakai bareng via postcss — gak bisa upgrade 1 app doang. Studio sudah v4 dari awal (gak numpang stylesheet shared, jadi gak kena batasan ini). |
| — | Sync pass: merge `origin/master` ke branch rewrite | ✅ Selesai (2026-11-19) | Komit `cda9577`. Porting: catalog geo-tracking (`/api/track`), fix password-lowercase di `shared/features/auth`, kolom `ngorder` di `shared/features/stok` (schema.ts/api.ts + test), retirement fitur komentar/mention sampel (2 Edge Function + `CommentThread`). Sisanya (~125 file, admin/pos/finance) cuma noise format Biome vs kerja nyata master — diambil versi master apa adanya. Lihat §6.11 soal 2 Edge Function mati yang masih ACTIVE di Supabase. Semua 5 test suite (6563 test) + `tsc --noEmit` (catalog/studio/shared) hijau. |

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
2. ✅ **RESOLVED (2026-11-19)** — ~~Studio→`products` punya celah otorisasi
   nyata~~: route publish lama (di
   `deerastudio/app/api/generation-sets/[id]/publish/route.ts`) nulis pakai
   service-role key (bypass RLS total) TANPA cek otorisasi sendiri — cuma
   "kebetulan" lolos kalau baca tabel lain (`ai_generation_sets`) duluan
   berhasil. Didesain ulang jadi `supabase/functions/studio-publish/index.ts`
   (dideploy, ACTIVE):
   - **Dicek ulang `pg_policies` LIVE dulu** (bukan cuma baca migrasi lama) —
     ternyata `products` SUDAH punya policy authenticated (SELECT/INSERT/
     UPDATE/DELETE, `qual: true`), sama longgarnya dengan
     `authenticated_full_access` di `ai_generation_sets`/`ai_generations`,
     dan `product_history` sudah authenticated-insert juga. Jadi **service-role
     TIDAK PERLU SAMA SEKALI** — function forward JWT caller apa adanya (pola
     sama kayak `studio-{models,poses,presets}-crud`), zero privilege
     escalation. Gerbang otorisasinya: `verify_jwt: true` di platform (semua
     Edge Function di repo ini pakai ini) + RLS Postgres di tiap tabel.
   - Ditambah cek eksplisit `supabase.auth.getUser()` di awal function (dulu
     TIDAK ADA — cuma "kebetulan lolos"), dipakai juga buat audit log.
   - **Perbaikan data-integrity ikutan**: query `ai_generations` sekarang
     WAJIB `generation_set_id = input.generationSetId` (dulu cuma
     `.in("id", allIds)` tanpa ikat ke set-nya — generation id dari set/produk
     LAIN bisa ikut lolos kalau caller tahu/nebak UUID).
   - **Audit trail baru**: insert ke `product_history` (action
     `studio-publish`) — dulu publish AI sama sekali TIDAK tercatat di audit
     log yang sama dengan semua perubahan `products` lainnya. `ACTION_META`
     di `apps/admin/src/features/history/utils.js` sudah ditambah entrinya.
   - 3 secret (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
     `CLOUDINARY_API_SECRET` — BUKAN sama dengan `VITE_CLOUDINARY_UPLOAD_PRESET`
     yang dipakai admin/pos, itu unsigned preset, gak butuh api_key/api_secret)
     sudah diisi user manual lewat dashboard Supabase (2026-11-19, MCP
     `create_edge_function_secret` ditolak Supabase: "Storing keys is paused").
     **Masih belum dites end-to-end** (user pilih tunggu M7, bukan tes manual
     curl sekarang) — sandbox mana pun di environment ini juga gak punya
     jalur network ke `*.supabase.co/functions/v1` (§6.10), jadi verifikasi
     HTTP beneran nunggu halaman generate/publish Studio jadi (M7, caller
     pertama) atau tes manual dari browser/Vercel preview asli. Ada data
     sampel siap pakai kalau mau tes manual sewaktu-waktu: generation set
     `00173215-2ca2-4916-a4d4-12a356e5adb2` (produk `D-085-PRS`, 3 gambar
     `completed`, sudah pernah dipublish sebelumnya jadi aman diulang). Belum
     ada test Deno (lihat §6.6 — gak ada tooling `deno` lokal di sandbox
     manapun sejauh ini, 3 function CRUD studio M3 lainnya juga belum ada
     test-nya, retroaktif).
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
10. ✅ **RESOLVED (2026-11-19)** — ~~sandbox TIDAK PUNYA jalur network ke
    Supabase, semua Edge Function belum pernah dites beneran~~: dikonfirmasi
    ulang bahwa SELURUH host `*.supabase.co` (bukan cuma `/functions/v1`)
    ketutup dari sandbox sesi cloud manapun (proxy outbound nolak eksplisit,
    dicek `curl` langsung — berlaku juga buat `/rest/v1/rpc/...`, jadi RPC
    langsung sama sekali gak lebih "testable" dari sandbox dibanding Edge
    Function). Karena itu, verifikasi WAJIB dari browser asli user sendiri,
    bukan dari sini. **Sudah dites user (2026-11-19) dari Console browser
    beneran, 2 percobaan gagal dulu sebelum berhasil** — berguna dicatat
    penyebabnya biar gak keulang:
    1. Percobaan pertama gagal dgn `TypeError: ... non ISO-8859-1 code
       point` — token JWT panjang yang di-paste dari chat ke aplikasi
       catatan user ketukar jadi karakter bullet (●) oleh fitur
       penyamaran-rahasia aplikasi itu, bukan masalah di Edge Function-nya.
    2. Percobaan kedua gagal dgn CSP `Refused to connect` — browser yang
       dipakai masih di tab `claude.ai` (atau sejenis), yang CSP-nya sendiri
       cuma izinin daftar domain tertentu (vercel/sentry/pusher/dll),
       TIDAK termasuk Supabase-nya Deera. Bukan masalah di Edge
       Function-nya juga.
    3. **Fix**: pindah ke tab yang alamatnya beneran `catalog.deera.id`,
       pakai fetch tanpa header auth (sempat di-redeploy `products` dgn
       `verify_jwt:false` khusus buat tes ini — data `products` emang
       udah publik, aman — lalu dikunci lagi `verify_jwt:true` begitu tes
       selesai). **Hasilnya SUKSES**: 192 produk kebaca lengkap
       (`kode`/`nama`/`image`/`detail`/`position`, dst) lewat
       `fetch(".../functions/v1/products", {method:"POST", body:
       {action:"list"}})` — pola `{action,input}` + CORS + response shape
       `{data: [...]}` TERBUKTI jalan betulan di browser nyata, bukan
       cuma lolos TypeScript/deploy. M4 (Admin) boleh lanjut.
    **Pelajaran buat tes manual Edge Function selanjutnya**: (a) jangan
    suruh user paste token panjang lewat aplikasi catatan pihak ketiga,
    tes tanpa auth header dulu kalau actionnya baca data publik; (b)
    pastikan tab browser yang dipakai beneran domain Deera (`catalog.
    deera.id`/`admin.deera.id`), bukan tab lain yang CSP-nya ketat.
11. 🟡 **2 Edge Function mati di repo, kemungkinan masih ACTIVE di Supabase
    live** — sync pass 2026-11-19 menghapus `notify-sampel-comment` dan
    `notify-sampel-mention` dari repo (ikut penghapusan fitur komentar/
    mention sampel di master), tapi penghapusan FILE di repo TIDAK otomatis
    undeploy fungsi yang sudah live. Belum dicek ulang `list_edge_functions`
    setelah sync pass ini — kalau masih ACTIVE, matikan manual lewat
    Supabase dashboard/MCP (bukan masalah besar, tapi sia-sia kalau
    dibiarkan nyantol selamanya).
12. 🔴 **INSIDEN DATA PRODUCTION (2026-11-20 01:13 UTC)** — saat porting
    `pindah-stok-lokasi` (M4), RPC `move_stok_lokasi('gudang','cideng')`
    dites LANGSUNG di database production dengan asumsi salah bahwa
    fungsinya per-produk (seperti test produk ZZTEST-* sebelumnya di
    produk/stok-opname). Ternyata `move_stok_lokasi` beroperasi ke
    SELURUH tabel `stok_warna` (bukan di-filter kode) — akibatnya
    **224 baris lintas SEMUA produk kena pindahkan gudang→cideng
    (total 1208 pcs), stok gudang semua produk jadi 0** di database
    nyata, bukan data tes. Proyek masih plan Supabase Free (lihat risiko
    #1) — **tidak ada backup otomatis / PITR**, jadi kemungkinan BESAR
    tidak bisa dipulihkan lewat database sendiri. User sedang dimintai
    cek: (a) dashboard Supabase Backups (kadang ada snapshot walau bukan
    PITR berbayar), (b) hubungi Supabase Support soal retensi WAL
    jangka pendek, (c) sumber data lain (hasil stok opname terakhir,
    export manual, cache lokal POS) buat rekonstruksi manual.
    **Pelajaran wajib buat RPC M4/M5/M6 selanjutnya**: SEBELUM
    menjalankan RPC apapun langsung di database production untuk
    verifikasi, WAJIB baca definisi fungsinya SAMPAI HABIS dan pastikan
    scope-nya (per-kode? per-row? atau global ke seluruh tabel?) —
    jangan asumsi dari nama fungsi atau dari pola RPC sebelumnya yang
    kebetulan per-produk. Kalau fungsinya beroperasi global/tanpa filter
    kode, JANGAN pernah dites langsung di production — minta dibuatkan
    Supabase branch/preview DB dulu (`create_branch`), atau transaksikan
    manual (`BEGIN; ...; ROLLBACK;`) kalau cuma mau lihat hasil tanpa
    commit.

    **✅ PEMULIHAN BERHASIL (2026-11-20, hari yang sama)**: dari 224
    baris yang kena, **222 berhasil direkonstruksi & dikembalikan**,
    tervalidasi 2 metode independen (angka stok-opname terakhir +
    transfer yang approved di antara waktu opname & insiden, VS hasil
    sisa matematis dari `cideng_now` — insiden ini cuma mindahin
    gudang→cideng, jadi total per baris harus konservasi; kedua metode
    cocok persis di 222/222 baris, 0 yang beda — keyakinan tinggi bukan
    tebakan). 1 baris data tes (`ZZTEST-MOVE`) dihapus. **1 baris produk
    asli** (`D-085-PRS`, Midi, HIJAU) TIDAK punya histori stok-opname
    sama sekali — dibiarkan apa adanya (`gudang:0, cideng:8`), nunggu
    user cek fisik manual. User (toko) yang menyelamatkan situasi ini
    dengan detail operasional yang saya gak tahu (jadwal pasar, transfer
    mana yang relevan) — data pasti rusak permanen kalau user gak
    kasih konteks itu.
13. 🟡 **INSIDEN KECIL (2026-11-20, M4 cluster produksi-bahan/produksi-hpp/
    produksi-record)** — nambah parameter baru (`p_sumber`, ada default)
    ke `delete_product_cascade` lewat `CREATE OR REPLACE FUNCTION` TIDAK
    me-replace fungsi lama, malah bikin OVERLOAD baru (2 fungsi
    `delete_product_cascade` sekaligus: 1-arg lama + 2-arg baru) — beda
    dari asumsi awal. Akibatnya tombol "Hapus Produk" di halaman Admin
    **sempat rusak** (PostgREST manggil RPC pakai named parameter, jadi
    ambigu fungsi mana yang dipanggil kalau 2 overload sama-sama cocok) —
    bukan masalah data (gak ada yang hilang/salah), cuma aksi delete-nya
    gagal total (fail-safe). Ketahuan & dibereskan dalam hitungan menit
    lewat `DROP FUNCTION IF EXISTS` (signature lama) sebelum
    `CREATE OR REPLACE` (signature baru), diverifikasi `pg_proc` cuma
    sisa 1 fungsi + tes BEGIN/ROLLBACK kedua cara panggil (dengan/tanpa
    parameter baru). **Pelajaran tambahan di luar risiko #12**: menambah
    PARAMETER ke fungsi existing (bukan cuma mengubah definisi) juga
    perlu `DROP FUNCTION IF EXISTS <signature lama>` dulu — `CREATE OR
    REPLACE` cuma aman kalau signature (nama+tipe+urutan parameter)
    PERSIS sama dengan yang sudah ada, titik.

    Sisa cluster (`merge_bahan_dupe_group`, `save_hpp_template`/
    `save_hpp_config_value`, `create_produksi_batch`/
    `update_produksi_batch`) semuanya fungsi BARU (gak ada isu overload)
    — diverifikasi BEGIN/ROLLBACK seperti biasa, semua ✅. Detail lengkap
    di commit message masing-masing, bukan diulang di sini.

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
