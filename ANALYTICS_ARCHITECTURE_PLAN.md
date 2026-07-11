# Analytics (BI) — Desain Arsitektur `apps/admin`

**Tanggal:** 12 Juli 2026
**Status:** Tahap desain — BELUM ada implementasi kode/migration. Dokumen ini adalah deliverable dari 7 poin yang diminta: audit skema, tabel diperlukan, metric, RPC diperlukan, rekomendasi arsitektur, roadmap bertahap, dan dependency antar RPC.
**Prinsip yang diikuti:** sama seperti seluruh migrasi RPC Phase 1 di sesi ini — PostgreSQL = source of truth business logic, frontend = presentation layer murni.

---

## 1. Audit Struktur Database yang Sudah Ada

Berikut tabel-tabel yang RELEVAN untuk Analytics, hasil audit langsung ke `supabase/migrations/*.sql` (bukan asumsi dari dokumentasi) — kolom yang tercantum adalah kolom AKTUAL setelah seluruh migration incremental digabung.

### 1.1 `sales` — tabel inti (satu-satunya sumber data transaksi)

```
id                uuid PK
date              date NOT NULL              -- tanggal transaksi (lokal, bukan UTC)
created_at        timestamptz NOT NULL
type              text NOT NULL DEFAULT 'sale'   -- 'sale' | 'retur'
location          text                        -- 'gudang' | 'cideng' | 'tegalgubug'
buyer_name        text
buyer_hp          text
pelanggan_id      uuid REFERENCES pelanggan(id) ON DELETE SET NULL   -- NULLABLE, lihat §8.3
items             jsonb NOT NULL DEFAULT '[]'  -- lihat bentuk detail di bawah
discount          integer NOT NULL DEFAULT 0
total             integer NOT NULL DEFAULT 0   -- NET setelah discount, sudah final (subtotal - discount)
status            text                         -- status sync lokal POS ("pending"/"synced"), TIDAK relevan utk Analytics
stok_adjustments  jsonb NOT NULL DEFAULT '[]'  -- TIDAK relevan utk Analytics (dipakai sync stok POS)
created_by_email  text
created_by_name   text
supabase_id       uuid                         -- TIDAK relevan utk Analytics (dipakai reconcile offline POS)
edit_history      jsonb                        -- riwayat edit transaksi, TIDAK relevan utk Analytics
```

**Bentuk `items` yang SEBENARNYA dipakai di runtime** (diverifikasi langsung dari `apps/pos/src/features/kasir/hooks.js`, BUKAN dari komentar lama di migration file yang sudah tidak akurat):

```json
[
  {
    "kode": "D-07-OSK",
    "size": "Midi",
    "harga": 230000,
    "hpp": 85000,
    "qty": 2,             // ATAU:
    "warna": [{"nama": "HITAM", "qty": 2}, {"nama": "MERAH", "qty": 1}]  // salah satu dari qty/warna, tidak dua-duanya
  }
]
```

Temuan penting (lihat §8 untuk detail & dampaknya ke desain RPC):
- **`item` TIDAK punya field `nama`** (nama produk) — walau komentar lama di `supabase-migration-sales-table.sql` menyebut `[{kode, nama, size, harga, qty}]`, kode aktual yang membangun cart (`_addSimple`/`confirmWarna` di `kasir/hooks.js`) TIDAK PERNAH menyertakan `nama`. Setiap RPC Analytics WAJIB JOIN ke `products` by `kode` untuk mendapat nama produk — tidak bisa mengandalkan `item->>'nama'`.
- **`item.hpp` adalah SNAPSHOT `products.hpp` pada saat transaksi terjadi** (dikonfirmasi dari `kasir/hooks.js` baris `hpp: product.hpp ?? 0`), bukan referensi live ke `hpp_template`. Ini justru MENGUNTUNGKAN desain Analytics: profit historis tidak akan berubah retroaktif kalau HPP produk diedit di kemudian hari — SATU-SATUNYA sumber kebenaran profit adalah `sales.items[].hpp`, TIDAK BOLEH join ulang ke `products.hpp`/`hpp_template` saat menghitung profit historis (itu akan jadi bug baru, bukan perbaikan).
- **`total` sudah net** (subtotal dikurangi discount) — dikonfirmasi dari `useCart`/`useUpdateSale` (`total = subtotal - discount`). Revenue TIDAK PERLU dikurangi discount lagi secara terpisah.
- **`type = 'retur'`** membalik tanda (qty, revenue, profit dikurangi, bukan ditambah) — pola ini sudah established di `packages/shared/lib/bepUtils.js` (`sign = type === "retur" ? -1 : 1`) dan HARUS direplikasi identik di semua RPC Analytics.
- Index yang SUDAH ADA (dari Migration Phase 0): `sales_date_idx (date DESC)`, `sales_location_idx (location)`. **Belum ada index pada `type` atau `pelanggan_id`** — lihat rekomendasi index di §5.5.

### 1.2 `products` — master produk

```
id          uuid PK
kode        text UNIQUE      -- format "D-{angka}-{bahan}"
nama        text
bahan       text             -- jenis kain, mis. "OSK", "SFN" — lihat §8.1 soal "Category"
hpp         integer          -- HPP TERKINI (current), BUKAN histori — lihat §1.1 soal item.hpp
image       text
video       text
detail      jsonb
variants    jsonb            -- [{size, harga, ld, pb}]  -- harga per size (katalog/master, lihat §8.2)
warna       jsonb            -- array string warna yang TERSEDIA (bukan yang terjual)
position    integer
created_at  timestamptz
```

**Tidak ada kolom kategori** (`kategori`/`category`) di tabel ini — sudah di-grep di seluruh `supabase/migrations/*.sql`, satu-satunya kolom `kategori` yang eksis ada di `apps/finance` (petty cash) dan tidak berkaitan. Lihat §8.1 untuk rekomendasi.

### 1.3 `stok_warna` — stok per kode × size × warna × lokasi

```
kode, size, warna (PK gabungan via UNIQUE(kode,size,warna))
gudang, cideng, tegalgubug   integer
updated_at
```
Sudah ada RPC agregasi siap pakai: `get_stock_summary()` (Migration Phase 1) — mengembalikan `{[kode]: {gudang,cideng,tegalgubug, sizes:{...}}}`. Analytics tab Products (Inventory) akan REUSE pola ini, bukan menulis ulang agregasi stok dari nol.

### 1.4 `pelanggan`

```
id, nama, no_hp, alamat, created_at, updated_at
```
Tidak ada kolom turunan (total belanja, jumlah transaksi, dsb) — semua harus dihitung dari `sales.pelanggan_id`. Lihat §8.3 soal keterisian `pelanggan_id` yang tidak 100%.

### 1.5 Tabel LAIN yang di-audit tapi TIDAK relevan langsung untuk Analytics v1

- `hpp_template`, `produksi_batch` — biaya produksi (sudah dipakai `get_laporan_produksi`), TIDAK dipakai untuk profit penjualan (lihat catatan `item.hpp` di §1.1 — sudah snapshot, tidak perlu join lagi).
- `transfers` — mutasi stok antar lokasi, bukan penjualan. Di luar scope Analytics v1 (bisa jadi metric "Stok Masuk vs Keluar" di Phase lanjutan kalau dibutuhkan).
- `lokasi_pasar_biaya` + `packages/shared/lib/bepUtils.js` — modul BEP (Break-Even Point) pasar yang SUDAH ADA dan sudah menghitung margin/BEP dari `sales.items[].harga/hpp` secara live di frontend (bukan RPC). Analytics BI ini **saling melengkapi, bukan menduplikasi** BEP — BEP fokus ke "berapa target pcs supaya balik modal ongkos pasar", Analytics fokus ke "insight komposisi & tren penjualan utk keputusan bisnis". Direkomendasikan TIDAK menggabungkan keduanya dalam RPC yang sama (beda tujuan, beda konsumen).

---

## 2. Tabel yang Diperlukan untuk Analytics

**Kesimpulan audit: TIDAK PERLU tabel baru untuk Phase 1.** Semua data yang diminta (revenue, profit, qty, market, customer, product, trend) sudah tersedia dari kombinasi `sales` (+ `items` jsonb) × `products` × `stok_warna` × `pelanggan`. Ini konsisten dengan filosofi yang sudah dipakai di `bepUtils.js`/`lokasi_pasar_biaya`: "data sudah ada, jangan diduplikasi ke tabel baru."

Satu-satunya PERUBAHAN SKEMA yang mungkin dibutuhkan (bukan tabel baru, kolom tambahan opsional) dibahas di §8.1 (kategori produk) — statusnya "usulan, butuh keputusan Denny", bukan requirement wajib Phase 1.

---

## 3. Metric yang Bisa Dihitung (per Tab)

Tabel berikut memetakan setiap metric yang diminta ke SUMBER DATA dan RUMUS pastinya — supaya tidak ada ambiguitas saat implementasi SQL nanti.

### 3.1 Overview

| Metric | Rumus | Sumber |
|---|---|---|
| Total Revenue | `SUM(CASE WHEN type='sale' THEN total WHEN type='retur' THEN -total END)` | `sales.total` |
| Total Profit | `SUM(sign × (harga-hpp) × qty)` per line item, `sign=-1` utk retur | `sales.items[]` |
| Total Produk Terjual | `SUM(sign × qty)` per line item | `sales.items[]` |
| Total Transaksi | `COUNT(*) WHERE type='sale'` (retur tidak dihitung sebagai transaksi baru, tapi MENGURANGI qty/revenue/profit di atas) | `sales.id` |
| Total Customer | `COUNT(DISTINCT pelanggan_id) WHERE pelanggan_id IS NOT NULL` | `sales.pelanggan_id` |
| Average Order Value (AOV) | `Total Revenue / Total Transaksi` | turunan |
| Produk Terlaris (Quick Insight) | `MAX` qty per kode | `sales.items[]` × `products` |
| Produk Profit Tertinggi | `MAX` profit per kode | `sales.items[]` × `products` |
| Pasar Terbaik | `MAX` revenue (atau profit — lihat §9 pertanyaan) per location | `sales` |
| Customer Terbaik | `MAX` revenue per pelanggan_id | `sales` × `pelanggan` |
| Revenue/Profit/Sales Trend (chart kecil) | Time-series ter-bucket (harian/otomatis) | RPC `analytics_trend` (reused, lihat §6.2) |
| Ringkasan Market (Market\|Revenue\|Profit\|Qty) | `GROUP BY location` | `sales` |

### 3.2 Products

| Metric | Rumus | Catatan |
|---|---|---|
| Produk Terlaris | `ORDER BY SUM(qty) DESC` | — |
| Omset Tertinggi | `ORDER BY SUM(revenue) DESC` | — |
| Profit Tertinggi | `ORDER BY SUM(profit) DESC` | — |
| Margin Tertinggi/Terendah | `SUM(profit)/NULLIF(SUM(revenue),0)` diurut asc/desc | Margin % — hanya masuk akal untuk produk dengan revenue > 0 |
| HPP Tertinggi/Terendah | `MAX/MIN(products.hpp)` **current**, ATAU `MAX/MIN(item.hpp)` **transaksi periode** | Butuh keputusan — lihat §8.2 |
| Harga Jual Tertinggi/Terendah | `MAX/MIN(variants[].harga)` **katalog**, ATAU `MAX/MIN(item.harga)` **transaksi periode** | Sama, §8.2 — kasir bisa override harga manual saat checkout, jadi dua sumber ini BISA beda |
| Fast Moving / Slow Moving | Ranking kecepatan jual = `qty terjual / hari dalam periode`, dibandingkan median/percentile seluruh produk | Definisi diusulkan, lihat §4 |
| Stok Terbanyak | `ORDER BY total stok (gudang+cideng+tegalgubug) DESC` | via `get_stock_summary` pattern |
| Stok Hampir Habis | `total stok < threshold` ATAU `hari cover (stok/kecepatan jual) < N hari` | Definisi diusulkan, lihat §4 |
| Produk Tidak Pernah Terjual | `products` `LEFT JOIN` agregat sales → `NULL`/`0` | Perlu keputusan scope: periode filter vs all-time, lihat §9 |
| Chart Top Revenue/Profit/Qty Sold | Subset N-teratas dari leaderboard di atas | Tidak perlu RPC terpisah — data sama dipakai ulang utk tabel & chart |

### 3.3 Markets

| Metric | Rumus |
|---|---|
| Market\|Revenue\|Profit\|Qty\|Customer | `GROUP BY location` |
| (Drill-down) Produk Terlaris per market | `GROUP BY location, kode` diurut qty desc, filter 1 location |
| (Drill-down) Trend Penjualan per market | `analytics_trend` di-scope ke 1 location |

### 3.4 Customers

| Metric | Rumus | Catatan |
|---|---|---|
| Customer Revenue/Profit/Qty Tertinggi | `GROUP BY pelanggan_id ORDER BY ...` | Hanya baris dengan `pelanggan_id IS NOT NULL` |
| Customer Baru | `pelanggan` dengan tanggal transaksi PERTAMA (all-time) jatuh di dalam `[p_from, p_to]` | Butuh subquery `MIN(date)` ALL-TIME per pelanggan, lihat §4 |
| Repeat Customer | Pelanggan dengan `COUNT(DISTINCT sale.id) > 1` — scope ALL-TIME (bukan cuma dalam periode filter) | Lihat §4 untuk alasan kenapa harus all-time |
| Average Order (per customer) | `SUM(total)/COUNT(sale) per pelanggan_id` dalam periode filter | — |
| Lifetime Value (LTV) | `SUM(total) ALL-TIME per pelanggan_id` (TIDAK dibatasi filter tanggal) | Secara konsep LTV memang harus all-time, lihat §4 |
| Tabel ranking customer | Kombinasi metric di atas, diurut sesuai pilihan user (default: revenue) | — |

### 3.5 Trends

| Metric | Rumus |
|---|---|
| Revenue/Profit/Qty Trend | `SUM(...) GROUP BY date_bucket(date, p_granularity)` |
| Top Product Trend | Top-5 kode (by total qty dalam periode) × `SUM(qty) GROUP BY kode, date_bucket` |
| Market Trend | `SUM(revenue) GROUP BY location, date_bucket` |
| Granularity | `date_trunc('day'/'week'/'month'/'year', date)` |

---

## 4. Usulan Metric Tambahan (di Luar Daftar Permintaan)

Berikut metric yang menurut audit saya BERGUNA untuk owner/sales/marketing tapi belum ada di daftar — masing-masing dengan alasan bisnis, supaya bisa dinilai relevansinya sebelum masuk roadmap:

1. **Diskon Rate & Total Diskon Diberikan** (`SUM(discount)`, `SUM(discount)/SUM(subtotal sebelum diskon)`) — owner sering perlu tahu berapa banyak margin "bocor" lewat diskon kasir, terutama kalau sales/kasir punya wewenang memberi diskon bebas. Tanpa ini, penurunan margin bisa disalahartikan sebagai masalah harga produk padahal sumbernya diskon di lapangan.
2. **Retur Rate** (`COUNT(retur)/COUNT(sale)`, per produk & per market) — retur tinggi pada produk/pasar tertentu adalah sinyal kualitas produk atau masalah proses penjualan (ukuran salah, dsb) — actionable untuk tim produksi & QC, bukan cuma sales.
3. **Hari Cover Stok (Days of Inventory)** = `stok saat ini / rata-rata qty terjual per hari` — dipakai sekaligus sebagai basis definisi "Fast/Slow Moving" DAN "Stok Hampir Habis" (§3.2), sehingga dua metric yang diminta punya definisi matematis yang konsisten satu sama lain, bukan dua heuristik terpisah yang bisa saling kontradiksi.
4. **Kontribusi Revenue per Produk (% dari total)** — Pareto-style ("berapa % produk yang menyumbang 80% omset") — sangat berguna untuk keputusan fokus produksi/promosi, lebih actionable daripada sekadar ranking mentah.
5. **New vs Returning Revenue Split** — dari total revenue periode ini, berapa % berasal dari Customer Baru vs Repeat Customer. Melengkapi metric "Customer Baru"/"Repeat Customer" yang di request (yang masih berupa COUNT) dengan dimensi REVENUE — biasanya lebih relevan untuk keputusan marketing (retensi vs akuisisi).
6. **Rata-rata Item per Transaksi (Basket Size)** — `SUM(qty)/COUNT(transaksi)` — indikator cross-sell/upsell yang berguna untuk tim sales lapangan (apakah kasir berhasil menjual lebih dari 1 pcs per transaksi).
7. **Weekday/Market-Day Performance** — karena bisnis ini sudah punya konsep hari pasar tetap (`marketDay.js`: Senin/Kamis=Cideng, Jumat=Tegalgubug, hari lain=Gudang), breakdown performa per HARI DALAM SEMINGGU (bukan cuma per lokasi) bisa menjawab "hari mana yang paling ramai" — berguna untuk keputusan jadwal produksi/restock.
8. **Produk dengan Margin Negatif** (harga jual < HPP saat transaksi) — sinyal kesalahan input harga atau diskon berlebihan, sebaiknya jadi alert tersendiri di Overview, bukan tersembunyi di leaderboard margin terendah.

Saya rekomendasikan #1, #3, #4 masuk Phase 1 (murah untuk dihitung sekalian karena satu SELECT yang sama, dampak keputusan tinggi), dan #2, #5, #6, #7, #8 jadi kandidat Phase 2 (lihat roadmap §7).

---

## 5. RPC yang Perlu Dibuat

### 5.1 Lapisan dasar (BUKAN dipanggil langsung dari frontend): `sales_flat()`

Untuk mencegah SETIAP RPC menulis ulang logika "unnest `items` jsonb, tangani bentuk `qty` flat vs `warna[]` array, tangani tanda retur" (persis logika yang sudah ada tapi TERKUNCI di dalam `get_sales_summary_by_product`), saya usulkan SATU fungsi SQL dasar yang di-reuse oleh SEMUA RPC Analytics lain lewat pemanggilan fungsi langsung di klausa `FROM`:

```sql
CREATE OR REPLACE FUNCTION public.sales_flat(p_from date, p_to date)
RETURNS TABLE (
  sale_id       uuid,
  tanggal       date,
  location      text,
  type          text,
  pelanggan_id  uuid,
  kode          text,
  warna         text,
  qty           numeric,   -- SUDAH bertanda (+/-) sesuai type
  harga         numeric,
  hpp           numeric,
  revenue       numeric,   -- SUDAH bertanda: qty_bertanda * harga
  profit        numeric    -- SUDAH bertanda: qty_bertanda * (harga - hpp)
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT
    s.id, s.date, s.location, s.type, s.pelanggan_id,
    item ->> 'kode',
    w.warna,
    (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) * w.qty,
    COALESCE((item ->> 'harga')::numeric, 0),
    COALESCE((item ->> 'hpp')::numeric, 0),
    (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) * w.qty * COALESCE((item ->> 'harga')::numeric, 0),
    (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) * w.qty
      * (COALESCE((item ->> 'harga')::numeric, 0) - COALESCE((item ->> 'hpp')::numeric, 0))
  FROM sales s
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
  CROSS JOIN LATERAL (
    SELECT
      welem ->> 'nama' AS warna,
      COALESCE((welem ->> 'qty')::numeric, 0) AS qty
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(item -> 'warna') = 'array'
           THEN item -> 'warna'
           ELSE jsonb_build_array(jsonb_build_object('nama', NULL, 'qty', item -> 'qty'))
      END
    ) AS welem
  ) w
  WHERE s.date BETWEEN p_from AND p_to;
$$;

GRANT EXECUTE ON FUNCTION public.sales_flat(date, date) TO authenticated;
```

Karena `LANGUAGE sql` (bukan `plpgsql`) dan berbentuk `SELECT` tunggal, Postgres BISA meng-inline fungsi ini ke query planner pemanggilnya — jauh lebih cepat untuk full-range scan (dipakai Analytics) dibanding pola loop `plpgsql` yang dipakai `get_sales_summary_by_product` (yang cocok untuk kasus tunggal terfilter 1 kode, TIDAK cocok kalau dipakai berulang kali untuk seluruh tabel `sales` di 6 RPC Analytics).

**Setiap RPC di bawah tinggal `SELECT ... FROM sales_flat(p_from, p_to) sf JOIN products p ON p.kode = sf.kode WHERE ... GROUP BY ...`** — tidak ada satu pun yang menulis ulang logika unnest jsonb.

### 5.2 `analytics_overview(p_from date, p_to date, p_location text, p_kode text)`

Return `jsonb`:
```
{
  kpi: { totalRevenue, totalProfit, totalQty, totalTransaksi, totalCustomer, aov },
  quickInsight: { produkTerlaris, produkProfitTertinggi, pasarTerbaik, customerTerbaik },
  marketSummary: [{ location, revenue, profit, qty }],
  trend: { ... }   -- lihat §5.3, dipanggil INTERNAL dari analytics_trend()
}
```
`p_location`/`p_kode` = `NULL` berarti "semua" (dari Global Filter). Field `trend` diisi dengan MEMANGGIL `analytics_trend()` dari dalam SQL (bukan menulis ulang logikanya) dengan granularity otomatis (harian kalau rentang ≤ 31 hari, mingguan kalau ≤ 180 hari, bulanan kalau lebih).

### 5.3 `analytics_trend(p_from date, p_to date, p_location text, p_kode text, p_granularity text)`

Return `jsonb`:
```
{
  buckets: [{ periode, revenue, profit, qty }],
  topProductTrend: [{ kode, nama, points: [{periode, qty}] }],   -- top 5 produk periode ini
  marketTrend: [{ location, points: [{periode, revenue}] }]
}
```
`p_granularity` ∈ `'day'|'week'|'month'|'year'` → `date_trunc(p_granularity, tanggal)`. Dipakai LANGSUNG oleh tab Trends (user pilih granularity), dan dipanggil INTERNAL oleh `analytics_overview` (granularity otomatis, hanya field `buckets` yang dipakai di sana untuk 3 chart kecil).

### 5.4 `analytics_products(p_from date, p_to date, p_location text, p_kode text)`

Return `jsonb`:
```
{
  leaderboard: {
    terlaris: [...], omsetTertinggi: [...], profitTertinggi: [...],
    marginTertinggi: [...], marginTerendah: [...]
  },
  harga: { hppTertinggi, hppTerendah, hargaJualTertinggi, hargaJualTerendah },   -- lihat §8.2 soal sumber
  movement: { fastMoving: [...], slowMoving: [...] },
  inventory: { stokTerbanyak: [...], stokHampirHabis: [...], tidakPernahTerjual: [...] }
}
```
Setiap array item minimal `{kode, nama, value}` supaya frontend hanya perlu `.map()` untuk render (tanpa hitung apa pun). `movement`/`inventory` butuh JOIN tambahan ke `stok_warna` (pola `get_stock_summary`) di luar `sales_flat`.

### 5.5 `analytics_markets(p_from date, p_to date, p_kode text)`

Return `jsonb`: `{ markets: [{ location, revenue, profit, qty, customer }] }` — SELALU seluruh lokasi (lihat catatan UX di §9 soal filter Market pada tab ini).

### 5.6 `analytics_market_detail(p_market text, p_from date, p_to date, p_kode text)`

Dipanggil hanya saat user klik 1 baris market (lazy, bukan bagian initial load). Return `jsonb`:
```
{ produkTerlaris: [...], revenue, profit, customer, trend: {...} }
```
`trend` = hasil panggilan internal `analytics_trend(..., p_location := p_market, ...)`.

### 5.7 `analytics_customers(p_from date, p_to date, p_location text, p_kode text)`

Return `jsonb`:
```
{
  leaderboard: { revenueTertinggi: [...], profitTertinggi: [...], qtyTerbanyak: [...] },
  insight: {
    customerBaru: N, repeatCustomer: N,
    avgOrder: number, ltv: number,     -- ltv ALL-TIME, lihat §3.4
    anonymousTransactionCount: N, anonymousRevenue: number   -- transparansi walk-in tanpa nama, lihat §8.3
  },
  ranking: [{ pelangganId, nama, revenue, profit, qty, jumlahTransaksi }]
}
```

### 5.8 Ringkasan Dependency Antar RPC (poin 7 yang diminta)

```
sales_flat(from,to)                       ← lapisan dasar, SQL murni (inlinable)
   ├── analytics_trend(...)               ← dipakai LANGSUNG oleh tab Trends
   │      ├── dipanggil INTERNAL oleh analytics_overview (embed 3 chart)
   │      └── dipanggil INTERNAL oleh analytics_market_detail (trend per market)
   ├── analytics_overview(...)            ← tab Overview
   ├── analytics_products(...)            ← tab Products (+ join stok_warna)
   ├── analytics_markets(...)             ← tab Markets (tabel utama)
   │      └── analytics_market_detail(...) ← drill-down (lazy, on-click)
   └── analytics_customers(...)           ← tab Customers (+ join pelanggan)
```

Tidak ada RPC yang menulis ulang logika unnest `items`/tanda retur/effective qty — semuanya turun dari `sales_flat`. Filter dropdown "Product" di Global Filter TIDAK perlu RPC baru — reuse `useProducts()` dari `@deera/shared/features/products/hooks` yang sudah ada (murni presentation, mengisi `<select>`). Filter "Market" adalah enum statis dari `LOCATIONS`/`LOCATION_LABELS` di `packages/shared/lib/marketDay.js` — juga tidak perlu RPC.

### 5.9 Index Tambahan yang Direkomendasikan (sebelum RPC di atas dijalankan di data besar)

Index Phase 0 saat ini (`sales_date_idx`, `sales_location_idx`) SUDAH mendukung filter dasar `date`/`location`. Karena Analytics selalu memfilter berdasarkan RENTANG tanggal dan SERING dikombinasikan dengan `type='sale'`, saya usulkan (Phase 1, migration idempotent terpisah — TIDAK mengubah Phase 0 yang sudah ada):

```sql
CREATE INDEX IF NOT EXISTS sales_date_type_idx ON sales(date, type);
CREATE INDEX IF NOT EXISTS sales_pelanggan_id_idx ON sales(pelanggan_id) WHERE pelanggan_id IS NOT NULL;
```
Index kedua bersifat partial (hanya baris yang punya `pelanggan_id`) — cocok untuk query Customers tab yang selalu mensyaratkan `IS NOT NULL`, dan tidak memboroskan ruang index untuk baris walk-in yang NULL.

---

## 6. Rekomendasi Arsitektur Frontend

Mengikuti struktur Vertical Slice yang sudah baku di `CLAUDE.md` §4/§7/§14 — TIDAK ada pola baru yang diperkenalkan:

```
apps/admin/src/features/analytics/
  api.js            -- 7 fungsi pemanggil RPC murni (satu per RPC di §5), TANPA reduce/map bisnis
  queries.js        -- useQuery per RPC, queryKey menyertakan SELURUH filter (from,to,location,kode)
  store.js          -- Zustand: globalFilter { fromDate, toDate, location, kode }, persist? (lihat catatan)
  hooks.js          -- public surface: useAnalyticsFilter(), useOverview(), useTrend(), useProducts...,
                        useMarkets(), useMarketDetail(market), useCustomers()
  utils.js          -- HANYA formatting murni (fmtRp, fmtPercent, fmtDate) — TIDAK ada agregasi
  constants.js       -- TREND_GRANULARITIES, LEADERBOARD_LIMIT (mis. top 10), dsb
  components/
    AnalyticsPage.jsx        -- orchestrator: tab switcher + GlobalFilterBar
    GlobalFilterBar.jsx       -- date range + market + product + (category placeholder)
    tabs/
      OverviewTab.jsx
      ProductsTab.jsx
      MarketsTab.jsx
      CustomersTab.jsx
      TrendsTab.jsx
    shared/
      KpiCard.jsx             -- reuse pola StatCard yang sudah ada di produksi-laporan (lihat catatan)
      LeaderboardTable.jsx    -- reusable, dipakai Products & Customers & Markets
      TrendChart.jsx          -- reusable, dipakai Overview & Trends & MarketDetail
      MarketTable.jsx
  index.js
```

Catatan desain:
- **`store.js` untuk Global Filter** — sesuai §7 CLAUDE.md ("state yang dibagi antar komponen dalam satu fitur → Zustand"). Filter ini dibagi ke SEMUA 5 tab jadi Zustand adalah pilihan yang benar, BUKAN prop-drilling atau context baru. Pertanyaan terbuka: apakah filter perlu `persist` (bertahan setelah reload)? Diusulkan TIDAK persist by default (supaya tiap buka halaman Analytics mulai dari default "30 hari terakhir, semua pasar/produk") — bisa didiskusikan.
- **`StatCard` yang sudah ada** di `apps/admin/src/features/produksi-laporan/components/StatCard.jsx` sudah punya pola adaptif (font kecil kalau value > 8 karakter) — REUSE langsung atau extract ke `shared/components/` kalau butuh dipakai di 2 fitur, bukan duplikasi component baru dari nol.
- **Chart library** — belum ada chart library di `apps/admin` (grep tidak menemukan `recharts`/`chart.js` di `package.json` app ini). Perlu keputusan/instalasi di awal Phase 1 implementasi (bukan bagian dari desain arsitektur RPC, tapi dependency baru yang perlu disetujui).
- **`queries.js` queryKey** — WAJIB menyertakan seluruh filter (`['analytics','overview', fromDate, toDate, location, kode]`) supaya TanStack Query cache benar per kombinasi filter, konsisten dengan pola `fooKeys.list(filter)` di §14 CLAUDE.md.

---

## 7. Roadmap Implementasi Bertahap

### Phase 1 — Fondasi + Overview + Trends (paling tinggi ROI, paling rendah risiko)
1. Migration: `sales_flat()` + index tambahan (§5.9).
2. RPC: `analytics_trend()`, `analytics_overview()` (memanggil trend secara internal).
3. Frontend: struktur folder lengkap (§6), Global Filter Bar (date range + market + product — TANPA category dulu, lihat §8.1), tab Overview + tab Trends.
4. Metric tambahan yang di-include sekalian (§4 #1 Diskon Rate, #3 Hari Cover — karena murah, satu SELECT yang sama dengan Overview).

*Alasan Trends digabung ke Phase 1 (bukan Phase 3 seperti urutan tab di request):* `analytics_trend` adalah dependency LANGSUNG dari `analytics_overview` (Overview butuh 3 chart trend) — jadi begitu Overview selesai, Trends tab sudah otomatis 90% jadi (tinggal expose granularity switcher & topProductTrend/marketTrend di UI). Mengerjakan keduanya sekaligus di Phase 1 menghindari membangun ulang RPC yang sama dua kali di dua Phase berbeda.

### Phase 2 — Products
1. RPC: `analytics_products()` (leaderboard + harga + movement + inventory).
2. Frontend: tab Products, reuse `LeaderboardTable`/`TrendChart` dari Phase 1.
3. **Prasyarat sebelum mulai:** jawaban dari pertanyaan §9 (sumber harga/HPP, scope "tidak pernah terjual", definisi Fast/Slow Moving & threshold Stok Hampir Habis).

### Phase 3 — Markets
1. RPC: `analytics_markets()` + `analytics_market_detail()`.
2. Frontend: tab Markets (tabel + drill-down on-click).

### Phase 4 — Customers
1. RPC: `analytics_customers()`.
2. Frontend: tab Customers.
3. **Prasyarat:** keputusan definisi "Repeat Customer" (all-time vs dalam-periode, lihat §9) karena ini mengubah query dasarnya, bukan cuma tampilan.

### Phase 5 (opsional, setelah Phase 1-4 dipakai & dapat feedback nyata dari Denny/tim)
- Metric tambahan sisanya dari §4 (#2 Retur Rate, #5 New vs Returning Revenue Split, #6 Basket Size, #7 Weekday Performance, #8 Margin Negatif alert).
- Kalau dibutuhkan: kolom `products.kategori` sungguhan (lihat §8.1) + retrofit filter Category dari proxy `bahan` ke kategori asli.
- Kalau data historis sudah besar (index Phase 1 mulai terasa tidak cukup): pertimbangkan materialized view harian (`sales_daily_rollup`) di-refresh via cron, HANYA kalau ada bukti nyata query Analytics mulai lambat — jangan dioptimalkan prematur sebelum ada masalah nyata.

---

## 8. Isu Data & Keterbatasan (WAJIB dibaca sebelum Phase 2 dimulai)

### 8.1 Tidak ada kolom "Category"
Request eksplisit minta filter Category "jika tersedia" — **hasil audit: TIDAK tersedia.** Kandidat proxy yang ada: `products.bahan` (jenis kain, mis. "OSK"/"SFN") — ini BUKAN kategori produk dalam arti bisnis (Gamis vs Mukena vs Set, dsb), melainkan jenis material. Tiga opsi untuk Denny (lihat pertanyaan di §9):
- (a) Pakai `bahan` sebagai proxy Category di Phase 1 (tidak butuh migration, tapi labelnya mungkin membingungkan user non-teknis).
- (b) Tunda filter Category sampai kolom asli ditambahkan (Phase 5).
- (c) Tambahkan kolom `products.kategori` sekarang (migration kecil + perlu Denny mengisi manual/bulk-edit utk semua produk existing — effort non-trivial di luar scope RPC).

### 8.2 Harga & HPP: "master produk" vs "harga transaksi aktual"
Kasir POS **mengizinkan override harga manual** per item saat checkout (`setItemHarga` di `kasir/hooks.js`). Artinya `item.harga` yang tersimpan di `sales` BISA BERBEDA dari `products.variants[].harga` (harga katalog). Untuk metric "Harga Jual Tertinggi/Terendah" dan "HPP Tertinggi/Terendah" di tab Products, ada 2 kemungkinan makna:
- **Dari transaksi aktual periode filter** (via `sales_flat`) — konsisten dengan filter tanggal/market yang dipilih, tapi bisa menampilkan harga hasil diskon/override sesaat, bukan harga resmi katalog.
- **Dari master produk saat ini** (`products.hpp`, `variants[].harga`) — selalu konsisten/"official", tapi TIDAK terpengaruh Global Filter (aneh kalau widget lain semua berubah ikut filter tapi ini tidak).
Rekomendasi saya: pakai **transaksi aktual** (konsisten dengan prinsip "semua widget mengikuti filter" yang diminta), tapi ini perlu dikonfirmasi karena implikasinya adalah angka "Harga Jual Tertinggi" bisa menampilkan harga hasil kasir yang keliru input, bukan harga jual resmi.

### 8.3 `pelanggan_id` TIDAK selalu terisi
Dari audit `useCheckout` (`kasir/hooks.js`): pelanggan hanya di-resolve/dibuat kalau kasir mengisi nama pembeli. Transaksi tanpa nama pembeli (walk-in cepat) punya `pelanggan_id = NULL`. Ini berarti:
- Tab Customers HANYA mencerminkan transaksi yang tercatat namanya — BUKAN 100% transaksi.
- Saya sudah desain field `anonymousTransactionCount`/`anonymousRevenue` di `analytics_customers` (§5.7) supaya Denny tahu berapa % data yang "hilang" dari analisis customer, bukan diam-diam diabaikan.
- Total Revenue/Profit di Overview TETAP menghitung SEMUA transaksi (termasuk anonim) — hanya breakdown per-customer yang otomatis mengecualikan anonim.

---

## 9. Pertanyaan yang Perlu Keputusan Sebelum Phase 2 (Phase 1 bisa mulai tanpa menunggu ini)

1. **Category filter** — pakai `bahan` sebagai proxy sementara, tunda dulu, atau tambah kolom `kategori` asli sekarang? (§8.1)
2. **Harga Jual/HPP Tertinggi-Terendah** — dari transaksi aktual (ikut filter) atau dari master produk (`products`)? (§8.2)
3. **"Produk Tidak Pernah Terjual"** — cakupan SEMUA WAKTU (all-time, untuk deteksi dead-stock) atau HANYA dalam periode filter yang dipilih (konsisten dengan widget lain tapi kurang berguna untuk deteksi dead-stock jangka panjang)?
4. **"Repeat Customer"** — dihitung ALL-TIME (pelanggan yang PERNAH beli >1× kapan saja) atau HANYA dalam periode filter?
5. **Threshold "Stok Hampir Habis"** — angka tetap (mis. < 5 pcs total) atau berbasis "hari cover" (stok ÷ kecepatan jual, lihat usulan §4 #3)? Kalau berbasis hari cover, berapa hari yang dianggap "hampir habis" (3 hari? 7 hari?).
6. **Pasar Terbaik (Quick Insight Overview)** — diurut berdasarkan Revenue atau Profit?

Saya akan lanjutkan menunggu jawaban poin-poin di atas sebelum mulai coding Phase 1 (walau Phase 1 sendiri — Overview & Trends — sebenarnya TIDAK terikat pertanyaan-pertanyaan ini, jadi bisa mulai duluan kalau Denny mau, sambil pertanyaan Phase 2 dipikirkan).

---

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| `sales_flat()` di-scan penuh berkali-kali kalau setiap tab query terpisah tanpa cache | TanStack Query cache per queryKey filter (§6) — filter yang sama tidak query ulang; tiap RPC tetap 1x scan `sales` per pemanggilan (bukan N+1) |
| Data `items` yang malformed/lama (kalau ada transaksi sangat lama sebelum kolom `hpp`/`type` ditambahkan) | `sales_flat` pakai `COALESCE(...,0)` di setiap cast — baris lama tanpa `hpp` akan tampil profit 0 (bukan error), sama seperti pola RPC-RPC sebelumnya di sesi ini |
| Payload RPC besar kalau leaderboard tidak dibatasi | Setiap leaderboard di §5 dibatasi `LIMIT` (mis. top 10) di level SQL — konstanta ini didefinisikan di `constants.js` FE hanya untuk label UI, angka `LIMIT` aktual ada di SQL |
| Ambiguitas bisnis (§9) diimplementasikan diam-diam dengan asumsi yang salah | SEMUA pertanyaan didaftar eksplisit di §9 sebelum Phase 2+ dimulai, mengikuti pola transparansi yang sama seperti laporan-laporan migration sebelumnya di sesi ini |
| Filter Category tidak tersedia tapi diminta di spec | Diungkap eksplisit di §8.1 sebagai keterbatasan data, bukan diam-diam di-skip |

---

## 11. Ringkasan Keputusan yang Sudah Diambil (tanpa perlu konfirmasi Denny)

- Profit historis PAKAI `sales.items[].hpp` (snapshot), TIDAK JOIN ulang ke `products.hpp`/`hpp_template`.
- `sales_flat()` sebagai lapisan dasar `LANGUAGE sql` (inlinable) — bukan `plpgsql` loop, demi performa full-range scan.
- Analytics BI ini terpisah dari modul BEP (`bepUtils.js`) yang sudah ada — saling melengkapi, tidak digabung.
- Tidak ada tabel baru untuk Phase 1-4.
- Struktur folder & pola state management 100% mengikuti konvensi Vertical Slice yang sudah baku di `CLAUDE.md`.

---

## 12. Update — Keputusan Final Denny (menjawab §9)

Seluruh pertanyaan terbuka di §9 sudah dijawab. Roadmap §7 dan desain RPC §5 di atas sudah konsisten dengan jawaban ini — bagian ini merangkum keputusan finalnya supaya tidak perlu menelusuri ulang alasan di §8/§9 saat implementasi dimulai.

| # | Pertanyaan | Keputusan Final |
|---|---|---|
| 1 | Category filter | Pakai `products.bahan` sebagai proxy Category di Phase 1 — TIDAK ada migration kolom baru. Label UI sebaiknya tetap ditulis sesuai istilah asli data (mis. dropdown berisi nilai `bahan` seperti "OSK"/"SFN") supaya tidak menyesatkan user seolah ini kategori bisnis (Gamis/Mukena/dst). |
| 2 | Sumber Harga Jual/HPP Tertinggi-Terendah | Dari **transaksi aktual** (`sales_flat`, ikut Global Filter) — BUKAN dari `products`/`variants` master. |
| 3 | Cakupan "Produk Tidak Pernah Terjual" | **All-time** — query pendukungnya TIDAK dibatasi `p_from`/`p_to` seperti bagian lain di `analytics_products`, mengecek riwayat SEJAK PRODUK DIBUAT (`products.created_at`), bukan cuma dalam rentang filter yang sedang aktif. Ini SATU LAGI kasus di mana 1 field dalam sebuah RPC sengaja punya scope waktu berbeda dari field lain di RPC yang sama — sama seperti pola LTV di `analytics_customers` (§3.4) — WAJIB didokumentasikan jelas di komentar migration nanti supaya tidak disalahpahami sebagai bug. |
| 4 | Cakupan "Repeat Customer" | **All-time** — konsisten dengan keputusan LTV yang juga all-time (§3.4 sudah mendesain ini sejak awal, jawaban Denny mengonfirmasi). |
| 5 | Threshold Stok Hampir Habis | **Hari cover penjualan** = `total_stok ÷ (qty terjual dalam periode filter ÷ jumlah hari periode)`. Default ambang: **< 7 hari cover** dianggap "hampir habis". Nilai `7` ditaruh di `apps/admin/src/features/analytics/constants.js` (`LOW_STOCK_COVER_DAYS = 7`) sebagai KONSTANTA FRONTEND yang dikirim sebagai parameter ke RPC (bukan hardcode di SQL) — supaya bisa disesuaikan tanpa migration baru kalau ternyata 7 hari kurang/kelebihan pas dipakai nyata. Produk dengan qty terjual = 0 dalam periode (kecepatan jual 0) dikecualikan dari perhitungan hari-cover (pembagian oleh nol) dan otomatis masuk kategori terpisah "Tidak Ada Penjualan dalam Periode" (BUKAN otomatis dianggap "hampir habis" ataupun "aman") — supaya tidak tercampur dengan produk yang benar-benar mendekati kosong. |
| 6 | Basis ranking "Pasar Terbaik" | **Profit**, bukan Revenue. |

**Dampak ke desain RPC di §5 (sudah disesuaikan):**
- `analytics_overview` → `quickInsight.pasarTerbaik` diurutkan `ORDER BY profit DESC`.
- `analytics_products` → field `harga` (§5.4) dihitung dari `sales_flat` (`MAX/MIN(harga)`, `MAX/MIN(hpp)` per kode dalam periode filter), bukan dari `products`. Field `inventory.tidakPernahTerjual` memakai subquery terpisah TANPA filter `p_from/p_to` (all-time check terhadap SELURUH riwayat `sales`, bukan hanya `sales_flat(p_from,p_to)`). Field `inventory.stokHampirHabis` memakai rumus hari-cover dengan parameter ambang dikirim dari frontend (`p_low_stock_cover_days`, default 7 kalau tidak dikirim).
- `analytics_customers` → `insight.repeatCustomer`/`insight.ltv` (§5.7) memakai subquery all-time (`COUNT(DISTINCT sale.id) OVER (PARTITION BY pelanggan_id)` dihitung dari SELURUH tabel `sales`, bukan dibatasi `sales_flat(p_from,p_to)`), sementara `leaderboard`/`ranking` (revenue/profit/qty per customer) TETAP dibatasi periode filter seperti desain awal.

Dengan ini, **Phase 1 (Overview + Trends) sudah bisa mulai diimplementasikan tanpa blocker** — seluruh keputusan yang jadi prasyarat Phase 2 (Products) dan Phase 4 (Customers) sudah tuntas dijawab.
