# Laporan — Migration Phase 1: RPC `approve_transfer`

Scope: **hanya** `approveTransfer()` di `packages/shared/features/transfers/api.js`.
Tidak ada RPC lain yang dibuat, tidak ada file di luar scope yang diubah
kecuali test yang wajib disesuaikan (CLAUDE.md §7 "Unit Test Mandate").

---

## 1. Business Flow Lama

```
approveTransfer(transfer, user)
├─ 1. Validasi client-side (pakai objek `transfer` yg dikirim caller,
│     BISA STALE — bukan hasil fetch ulang dari DB):
│     - transfer.status !== "pending" → throw
│     - transfer.created_by === user.email → throw (self-approve)
├─ 2. UPDATE transfers SET status='approved', approved_by, approved_at
├─ 3. LOOP setiap item di transfer.items:
│     a. SELECT id, gudang, cideng, tegalgubug FROM stok_warna
│        WHERE kode=... AND size=... AND (warna=... OR warna IS NULL)
│     b. Kalau 0 baris → console.warn, skip
│     c. patch[from] = GREATEST(0, current - qty)
│     d. patch[to] = current + qty (HANYA jika to ∈ {gudang,cideng,tegalgubug})
│     e. UPDATE stok_warna SET ... WHERE id = row.id
└─ 4. logTransfer() best-effort (.catch(()=>{})) → INSERT product_history
```

**Masalah:** step 2 tidak dijaga `WHERE status='pending'`, dan step 3a/3e
terpisah oleh jeda waktu (round-trip jaringan) tanpa lock apa pun — dua
admin yang approve transfer berbeda namun menyentuh baris `stok_warna`
yang sama (kode+size+warna sama) bisa saling menimpa hasil satu sama lain
(lost update). Validasi status di step 1 juga rentan: kalau dua permintaan
approve utk transfer YANG SAMA terjadi nyaris bersamaan, keduanya bisa
lolos validasi status "pending" sebelum salah satu sempat menulis
`status='approved'`, sehingga stok bisa terpindah dua kali.

---

## 2. Business Flow Baru

```
approveTransfer(transfer, user)              [client, packages/shared/.../api.js]
└─ supabase.rpc("approve_transfer", {
     p_transfer_id: transfer.id,
     p_approver_email: user?.email ?? null,
     p_approver_name: displayName(user),
   })
   → error ? throw new Error(error.message) : return

approve_transfer(p_transfer_id, p_approver_email, p_approver_name)  [Postgres, 1 transaksi]
├─ SELECT * FROM transfers WHERE id=... FOR UPDATE   ← kunci baris, tutup race condition
├─ status transfer (live, bukan dari client) harus 'pending' → else RAISE (pesan sama)
├─ created_by = p_approver_email → RAISE self-approve (pesan sama)
├─ UPDATE transfers SET status='approved', approved_by, approved_at
│  WHERE id=... AND status='pending'  (defense-in-depth kedua)
├─ LOOP setiap item (jsonb_array_elements):
│  qty<=0 → skip
│  SELECT id FROM stok_warna WHERE kode=... AND size=... AND (warna cocok) LIMIT 1
│  tidak ketemu → skip (tanpa gagalkan proses)
│  UPDATE stok_warna SET from_col = GREATEST(0, from_col-qty), [to_col = to_col+qty]
├─ INSERT product_history (dibungkus sub-block EXCEPTION → best-effort,
│  gagal tidak membatalkan approve)
└─ RETURN jsonb {success:true, transfer_id}
   (COMMIT — kalau ADA exception di manapun sebelum titik ini,
   seluruh transaksi ROLLBACK otomatis: status, stok, history semuanya
   batal bersama-sama)
```

Kunci perbedaan: validasi & seluruh mutasi sekarang dieksekusi dalam SATU
transaksi Postgres dengan row lock di awal, sehingga tidak ada lagi celah
waktu antara "cek boleh approve" dan "eksekusi approve".

---

## 3. Query yang Dihilangkan

| # | Query lama (client) | Diganti dengan |
|---|---|---|
| 1 | `UPDATE transfers` (status) | Bagian dari 1 RPC call |
| 2..2+K | `SELECT stok_warna` × K item | Bagian dari 1 RPC call (SELECT di server) |
| 2+K+1..2+2K | `UPDATE stok_warna` × K item | Bagian dari 1 RPC call (UPDATE di server) |
| 2+2K+1 | `INSERT product_history` | Bagian dari 1 RPC call |

Total **4 jenis query terpisah + 2×K query per-item** dari client digantikan
oleh **1 RPC call**.

---

## 4. Jumlah Round-Trip

| Jumlah item transfer (K) | Sebelum (round-trip dari client) | Sesudah | Reduksi |
|---|---|---|---|
| 1 | 1 (status) + 2 (select+update) + 1 (history, async) = 4 | 1 | 75% |
| 3 | 1 + 6 + 1 = 8 | 1 | 87,5% |
| 5 | 1 + 10 + 1 = 12 | 1 | ~92% |
| K | 2 + 2K | 1 | mendekati 100% seiring K membesar |

Selain jumlah round-trip, RPC juga menghilangkan celah waktu antar-query
yang sebelumnya jadi sumber race condition.

---

## 5. Risiko Migration

1. **`SECURITY INVOKER` (bukan `SECURITY DEFINER`).** RPC berjalan dengan
   privilese pemanggil, mengandalkan RLS `transfers`/`stok_warna`/
   `product_history` yang sudah mengizinkan role `authenticated` untuk
   select/update/insert (sudah diverifikasi ada di migration existing).
   Kalau suatu saat policy RLS itu diubah/dicabut, RPC ini akan ikut gagal
   — ini KONSISTEN dengan behaviour lama (yang juga bergantung pada RLS
   yang sama), bukan risiko baru.
2. **`EXECUTE format(...)` dengan nama kolom dinamis** (`gudang`/`cideng`/
   `tegalgubug`) untuk update stok. Sudah dijaga dengan validasi
   `from_location ∈ {gudang,cideng,tegalgubug}` sebelum dipakai sebagai
   identifier — mencegah SQL injection via nama kolom sekaligus mencegah
   error runtime pada data valid.
3. **Bug pre-existing yang SENGAJA TIDAK diperbaiki**: kolom
   `stok_warna.warna` bertipe `NOT NULL`, tetapi kode lama (dan RPC baru,
   demi replikasi identik) mencari `warna IS NULL` untuk item tanpa warna
   — kondisi yang **tidak pernah match baris manapun** di database nyata.
   Efeknya: transfer untuk produk tanpa warna sudah lama diam-diam TIDAK
   memindahkan stok sama sekali (skip silent, sama seperti sebelum
   migration ini). Ini murni pemindahan bug yang sudah ada, bukan bug
   baru — **di luar scope task ini untuk diperbaiki**, tapi perlu
   diketahui karena berdampak nyata pada data.
4. **Snapshot timestamp di audit log** sedikit berbeda format string:
   `to_jsonb()` Postgres menghasilkan timestamp ISO8601 dengan offset
   (`...+00:00`), sedangkan `toISOString()` JS lama menghasilkan format
   `...Z`. Keduanya merepresentasikan waktu yang identik, hanya beda
   representasi string di kolom `snapshot`/`before_snapshot` (jsonb) —
   tidak memengaruhi fungsi apa pun yang membaca history saat ini (semua
   sudah pakai `Date`/date-string parsing yang menerima kedua format).
5. **Tidak ada rollback plan otomatis untuk migration SQL ini** (sesuai
   pola migration lain di repo — semua manual lewat Supabase SQL Editor).
   Kalau perlu mundur, jalankan `DROP FUNCTION public.approve_transfer(uuid,text,text);`
   — aman karena tidak ada tabel/kolom yang diubah, dan JS lama masih ada
   di git history bila perlu revert kode.
6. **Tidak ada perubahan skema** — memenuhi syarat "jangan mengubah
   struktur tabel/constraint/trigger/view" secara ketat.

---

## 6. Cara Testing Manual

1. **Jalankan migration** `supabase/migrations/20260711_migration_phase1_rpc_approve_transfer.sql`
   di Supabase SQL Editor.
2. **Verifikasi fungsi terdaftar:**
   ```sql
   SELECT proname, pronargs FROM pg_proc WHERE proname = 'approve_transfer';
   SELECT grantee, privilege_type FROM information_schema.routine_privileges
   WHERE routine_name = 'approve_transfer';
   ```
3. **Skenario sukses** — di apps/admin, buat transfer baru (login sebagai
   admin A), lalu approve dari akun admin B berbeda. Cek:
   - Status transfer berubah "pending" → "approved".
   - Stok di `stok_warna` untuk item yang ditransfer berkurang di
     `from_location`, bertambah di `to_location`.
   - Entry baru muncul di halaman History dengan action `transfer-approve`.
4. **Skenario self-approve ditolak** — buat transfer sebagai admin A, coba
   approve dengan akun admin A yang sama. Harus muncul pesan
   "Tidak bisa menyetujui transfer yang Anda buat sendiri...".
5. **Skenario status sudah bukan pending** — approve transfer yang sama
   dua kali (klik approve, lalu klik lagi/refresh & approve lagi). Percobaan
   kedua harus gagal dengan "Transfer sudah tidak bisa di-approve.".
6. **Skenario race condition (yang jadi tujuan utama)** — buka dua tab
   browser dengan 2 akun admin berbeda, buka transfer pending yang SAMA di
   kedua tab, klik approve di kedua tab **secepat mungkin** (nyaris
   bersamaan). Hasil yang benar: HANYA SATU yang sukses, yang lain
   mendapat error "Transfer sudah tidak bisa di-approve." — stok TIDAK
   boleh terpindah dua kali. (Sebelum migration ini, ada kemungkinan nyata
   kedua tab sukses dan stok berkurang dua kali.)
7. **Skenario to_location custom** — kalau ada alur transfer ke lokasi di
   luar gudang/cideng/tegalgubug (mis. reseller), pastikan hanya
   `from_location` yang berkurang, tidak ada error "kolom tidak ada".
8. **Jalankan unit test:** `npm run test:shared` (khusus
   `packages/shared/features/transfers/api.test.js` sudah diverifikasi
   62/62 test lulus pada sesi ini, mencakup seluruh skenario approveTransfer
   di atas dalam bentuk mock).

---

## 7. Hal yang Sengaja Tidak Diubah

- **Struktur tabel, constraint, trigger, view** — nihil perubahan skema.
- **Signature `approveTransfer(transfer, user)`** — tetap sama persis,
  sehingga `packages/shared/features/transfers/queries.js`
  (`useApproveTransferMutation`) dan `hooks.js` (`useApproveTransfer`)
  **tidak disentuh sama sekali**.
- **Komponen React** (`TransferPage.jsx`, dll) — tidak ada satu baris pun
  yang diubah; satu-satunya pemanggil `useApproveTransfer()` tetap
  memanggil hook yang sama tanpa perubahan.
- **Isi/format log riwayat** (`action`, `category`, `kode`, `nama`,
  `snapshot`, `before_snapshot`, `user_email`, `user_name`) — direplikasi
  field-demi-field dari `logTransfer()` lama.
- **Pesan error** untuk kedua validasi (status bukan pending, self-approve)
  — identik karakter demi karakter dengan versi lama.
- **Bug pre-existing warna `IS NULL`** (lihat §5 poin 3) — sengaja
  direplikasi apa adanya, tidak diperbaiki, karena di luar scope task ini.
- **RPC lain** — tidak ada yang diimplementasikan; semua 5 kandidat
  Priority A lain dari audit Phase 1 (`fetchSalesByKode`, `fetchStokMap`,
  `fetchProduksiBatches`, `fetchProduksiBatchesTotal`) dibiarkan seperti
  semula.

---

## Ringkasan File yang Diubah

| File | Perubahan |
|---|---|
| `supabase/migrations/20260711_migration_phase1_rpc_approve_transfer.sql` | **BARU** — definisi `approve_transfer()` + GRANT |
| `packages/shared/features/transfers/api.js` | `approveTransfer()` diringkas jadi 1 pemanggilan `supabase.rpc(...)`; import `LOCATIONS` (sudah tidak dipakai) dihapus |
| `packages/shared/features/transfers/api.test.js` | `describe("approveTransfer")` ditulis ulang untuk memverifikasi kontrak pemanggilan RPC (parameter benar, error diteruskan) — 6 test baru menggantikan 13 test lama yang menguji implementasi client-side yang sudah tidak ada |

Test suite `packages/shared/features/transfers/{api,queries,hooks}.test.js`
(62 test) sudah dijalankan dan **lulus semua**. Percobaan menjalankan
seluruh `npm run test:shared` (semua fitur di `packages/shared`) tidak
sempat selesai dalam batas waktu sandbox ini (vitest butuh >45 detik untuk
inisialisasi environment jsdom di seluruh test file), namun log parsial
menunjukkan tidak ada kegagalan di file mana pun yang sempat berjalan, dan
tidak ada file lain di luar fitur `transfers` yang tersentuh perubahan ini.
