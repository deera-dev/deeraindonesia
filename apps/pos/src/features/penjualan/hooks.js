/**
 * features/penjualan/hooks.js — Public surface fitur penjualan (kasir + laporan).
 *
 * SENGAJA TIDAK dibungkus TanStack Query (useQuery/useMutation), berbeda dari
 * fitur lain di refactor ini. Alasan:
 *
 * 1. Konsisten dengan `hooks/useProducts.js` (tetap dipertahankan apa adanya
 *    sesuai keputusan Denny) — hook ini punya bentuk & filosofi yang sama:
 *    cache-first dari Dexie/IndexedDB, baru sync ke Supabase di background.
 * 2. `useUpdateSale` dan `useDeleteSale` punya garansi urutan eksekusi yang
 *    didesain ketat (server WAJIB sukses dulu sebelum tulis lokal, lihat
 *    komentar di tiap fungsi) plus anti-resurrection logic
 *    (`waitForPendingInsert`, `markSaleDeleted`). `useSalesReport` juga punya
 *    pembedaan sengaja antara `reload()` (baca Dexie saja, dipakai setelah
 *    mutasi lokal) vs `syncAndLoad()` (sync ulang dari Supabase, dipakai saat
 *    filter berubah) — kalau dipaksa masuk model invalidate-and-refetch
 *    react-query yang generik, garansi-garansi ini berisiko diam-diam rusak.
 *
 * Komponen tetap HANYA boleh import dari file ini (Dependency Inversion ala
 * React) — bukan dari ../../lib/sync atau ../../lib/db secara langsung.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth, displayName } from "@deera/shared/features/auth/hooks";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { db } from "../../lib/db";
import {
  applyStokLocal,
  applyStokToSupabase,
  deleteSaleFromSupabase,
  syncSalesForRange,
  markSaleDeleted,
  waitForPendingInsert,
} from "../../lib/sync";

// Format tanggal lokal (bukan UTC) supaya midnight–7am WIB tidak masuk tanggal kemarin.
function localDateStr(d = new Date()) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}


// Helper: bangun stok adjustments dari items
function buildAdjustments(items, location, sign) {
  const adjs = [];
  for (const item of items) {
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      for (const w of item.warna) {
        if ((w.qty ?? 0) > 0)
          adjs.push({
            kode: item.kode,
            size: item.size,
            warna: w.nama,
            location,
            delta: sign * w.qty,
          });
      }
    }
  }
  return adjs;
}

// useSalesReport
// dateFilter bisa berupa:
//   "today"                   - hari ini
//   "week"                    - 7 hari terakhir
//   "month"                   - bulan ini (tanggal 1 s/d sekarang)
//   "year"                    - tahun ini (1 Jan s/d sekarang)
//   "YYYY-MM-DD"              - tanggal spesifik
//   "YYYY-MM-DD:YYYY-MM-DD"   - rentang dari-sampai
export function useSalesReport(dateFilter) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  function resolveDates() {
    const now = new Date();
    const todayStr = localDateStr(now);
    let from, to;
    if (dateFilter === "today") {
      from = to = todayStr;
    } else if (dateFilter === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = localDateStr(d);
      to = todayStr;
    } else if (dateFilter === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      from = localDateStr(d);
      to = todayStr;
    } else if (dateFilter === "year") {
      from = `${now.getFullYear()}-01-01`;
      to = todayStr;
    } else if (dateFilter.includes(":")) {
      [from, to] = dateFilter.split(":");
    } else {
      from = to = dateFilter;
    }
    return { from, to };
  }

  // Baca dari IndexedDB lokal saja (tanpa sync ke Supabase).
  // Dipakai setelah aksi lokal (hapus / retur / edit) agar record yang baru
  // dihapus tidak di-fetch ulang dari Supabase.
  const reload = useCallback(async () => {
    const { from, to } = resolveDates();
    let all;
    if (from === to) {
      all = await db.sales.where("date").equals(from).reverse().sortBy("created_at");
    } else {
      all = await db.sales
        .where("date")
        .between(from, to, true, true)
        .reverse()
        .sortBy("created_at");
    }
    setSales(all);
  }, [dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync dari Supabase lalu baca lokal.
  // Hanya dipanggil saat filter berubah atau halaman pertama kali dibuka.
  // Tidak dipanggil setelah aksi delete/retur/edit (gunakan reload()).
  const syncAndLoad = useCallback(async () => {
    setLoading(true);
    const { from, to } = resolveDates();
    if (navigator.onLine) {
      await syncSalesForRange(from, to, user?.email ?? null);
    }
    let all;
    if (from === to) {
      all = await db.sales.where("date").equals(from).reverse().sortBy("created_at");
    } else {
      all = await db.sales
        .where("date")
        .between(from, to, true, true)
        .reverse()
        .sortBy("created_at");
    }
    setSales(all);
    setLoading(false);
  }, [dateFilter, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    syncAndLoad();
  }, [syncAndLoad]);

  return { sales, loading, reload };
}

// useCreateSale
export function useCreateSale() {
  const { user } = useAuth();

  return async function createSale({
    items,
    total,
    discount = 0,
    buyerName,
    buyerHp,
    pelangganId,
    location,
  }) {
    const now = new Date();
    const loc = location ?? getMarketLocation(now);
    const adjs = buildAdjustments(items, loc, -1);

    const sale = {
      date: localDateStr(now),
      created_at: now.toISOString(),
      type: "sale",
      location: loc,
      buyer_name: buyerName || null,
      buyer_hp: buyerHp || null,
      pelanggan_id: pelangganId || null,
      items,
      discount,
      total,
      status: "pending",
      stok_adjustments: adjs,
      created_by_email: user?.email ?? null,
      created_by_name: displayName(user),
    };

    const localId = await db.sales.add(sale);
    await applyStokLocal(adjs);

    if (navigator.onLine) {
      try {
        const { id: _lid, status, supabase_id: _sid, ...payload } = { ...sale, id: localId };
        const { data, error } = await supabase.from("sales").insert(payload).select("id").single();
        if (!error) {
          await applyStokToSupabase(adjs);
          await db.sales.update(localId, { status: "synced", supabase_id: data?.id ?? null });

          // Kirim push notification ke semua device terdaftar (best-effort)
          supabase.functions
            .invoke("notify-sale", {
              body: { sale: { ...sale, id: data?.id }, createdBy: displayName(user) },
            })
            .catch(() => { /* silent — jangan blokir transaksi */ });
        }
      } catch {
        /* sync nanti */
      }
    }

    return localId;
  };
}

// useCreateRetur - partial retur (items bisa sebagian)
export function useCreateRetur() {
  const { user } = useAuth();

  return async function createRetur({ originalSale, items, total }) {
    const now = new Date();
    const location = originalSale.location ?? getMarketLocation(now);
    const adjs = buildAdjustments(items, location, +1);

    const retur = {
      date: localDateStr(now),
      created_at: now.toISOString(),
      type: "retur",
      location,
      buyer_name: originalSale.buyer_name ?? null,
      buyer_hp: originalSale.buyer_hp ?? null,
      items,
      discount: 0,
      total,
      status: "pending",
      stok_adjustments: adjs,
      created_by_email: user?.email ?? null,
      created_by_name: displayName(user),
    };

    const localId = await db.sales.add(retur);
    await applyStokLocal(adjs);

    if (navigator.onLine) {
      try {
        const { id: _lid, status, supabase_id: _sid, ...payload } = { ...retur, id: localId };
        const { data, error } = await supabase.from("sales").insert(payload).select("id").single();
        if (!error) {
          await applyStokToSupabase(adjs);
          await db.sales.update(localId, { status: "synced", supabase_id: data?.id ?? null });
        }
      } catch {
        /* sync nanti */
      }
    }

    return localId;
  };
}

// useUpdateSale
//
// Kontrak sama seperti useDeleteSale: kalau transaksi ini sudah pernah
// ke-insert ke Supabase (punya supabase_id), update di SERVER WAJIB berhasil
// dulu sebelum salinan lokal (IndexedDB) ikut diubah. Kalau gagal — termasuk
// offline, atau RLS diam-diam menolak (0 baris terpengaruh tanpa error) —
// function ini throw dan salinan lokal TIDAK disentuh, supaya app & server
// tidak pernah diam-diam beda data. Versi lama menyimpan ke IndexedDB DULU
// baru coba ke server, dan kalau gagal cuma di-catch-diamkan ("retry nanti"
// yang nyatanya tidak pernah benar-benar di-retry) — itu sama persis dengan
// pola bug yang sudah ditemukan di delete.
export function useUpdateSale() {
  const { user } = useAuth();

  return async function updateSale(updatedSale) {
    // Tunggu kalau transaksi ini PAS sedang di-insert background oleh
    // flushPendingSales() — lihat penjelasan di useDeleteSale.
    await waitForPendingInsert(updatedSale.id);

    const items = updatedSale.items ?? [];
    const subtotal = items.reduce((s, item) => {
      const qty = Array.isArray(item.warna) ? item.warna.reduce((ss, w) => ss + (w.qty ?? 0), 0) : (item.qty ?? 0);
      return s + qty * item.harga;
    }, 0);
    const discount = updatedSale.discount ?? 0;
    const total = Math.max(0, subtotal - discount);

    const editEntry = {
      at: new Date().toISOString(),
      by: user?.email ?? "unknown",
      note: updatedSale._editNote ?? "Edit transaksi",
    };
    const editHistory = [...(updatedSale.edit_history ?? []), editEntry];

    const patch = {
      items,
      discount,
      total,
      buyer_name: updatedSale.buyer_name ?? null,
      buyer_hp: updatedSale.buyer_hp ?? null,
      edit_history: editHistory,
    };

    const freshSale = (await db.sales.get(updatedSale.id)) ?? updatedSale;

    if (freshSale.supabase_id) {
      if (!navigator.onLine) {
        throw new Error("Tidak ada koneksi internet. Sambungkan internet lalu coba edit lagi.");
      }
      const { _editNote: _, id: _id, ...supabasePayload } = { ...freshSale, ...patch };
      const { data, error } = await supabase
        .from("sales")
        .update(supabasePayload)
        .eq("id", freshSale.supabase_id)
        .select("id");
      if (error) throw new Error(error.message ?? "Gagal update di server");
      if (!data || data.length === 0) {
        throw new Error(
          "Server tidak mengubah baris ini (0 baris terpengaruh) — kemungkinan policy akses (RLS) di Supabase menolak. Cek policy UPDATE pada tabel sales.",
        );
      }
    }

    // Baru ubah salinan lokal setelah server (kalau relevan) berhasil diubah
    await db.sales.update(freshSale.id, patch);
  };
}

// useDeleteSale
//
// Kontrak: penghapusan di Supabase (kalau transaksi ini sudah pernah ke-insert
// ke sana) WAJIB berhasil dulu sebelum salinan lokal (IndexedDB) ikut terhapus.
// Kalau gagal — termasuk kalau sedang offline — function ini throw, BUKAN
// diam-diam lanjut. Pemanggil (Laporan.jsx) menangkap error itu, menampilkan
// pesan gagal, dan membiarkan transaksi + modal konfirmasi tetap ada supaya
// user bisa coba hapus lagi. Ini supaya laporan BEP (yang fetch langsung dari
// Supabase, bukan dari IndexedDB) tidak pernah ketinggalan menghitung baris
// yang sebenarnya masih nyangkut di server.
export function useDeleteSale() {
  return async function deleteSale(sale) {
    // Kalau transaksi ini PAS sedang di-insert ke Supabase di background oleh
    // flushPendingSales() (jalan saat login/reconnect), tunggu insert itu
    // selesai dulu. Tanpa ini, ada jendela singkat di mana supabase_id belum
    // tercatat lokal saat delete dibaca — sehingga delete bisa lolos sebagai
    // "belum pernah ke server" padahal insertnya barusan berhasil, dan baris
    // itu jadi nyangkut permanen di server tanpa pernah ketahuan.
    await waitForPendingInsert(sale.id);

    // Baca ulang dari IndexedDB agar status & supabase_id selalu fresh.
    // Objek `sale` dari React state bisa stale: sale.status === "pending"
    // padahal IndexedDB sudah "synced" setelah background flushPendingSales().
    const freshSale = (await db.sales.get(sale.id)) ?? sale;

    const reversed = (freshSale.stok_adjustments ?? []).map((a) => ({ ...a, delta: -a.delta }));

    // `supabase_id` ada artinya transaksi ini sudah pernah ke-insert ke server —
    // entah statusnya "synced", atau "pending" tapi sebenarnya sudah ke-insert
    // (bisa terjadi kalau flushPendingSales berhasil insert tapi gagal update
    // status lokal — paling sering kena kalau transaksi BARU dibuat lalu langsung
    // dihapus dalam waktu singkat, mis. waktu testing). Di kedua kasus itu,
    // hapus di server dulu — kalau gagal, throw supaya lokal TIDAK ikut terhapus.
    if (freshSale.supabase_id) {
      if (!navigator.onLine) {
        throw new Error("Tidak ada koneksi internet. Sambungkan internet lalu coba hapus lagi.");
      }
      await deleteSaleFromSupabase(freshSale);
    }

    // Baru hapus dari IndexedDB setelah server (kalau relevan) berhasil dihapus
    await db.sales.delete(freshSale.id);

    // Tandai supabase_id sebagai deleted agar syncSalesForRange tidak insert ulang
    markSaleDeleted(freshSale.supabase_id);

    // Reverse stok lokal (best-effort)
    await applyStokLocal(reversed);
  };
}
