/**
 * features/pelanggan/hooks.js — Public surface fitur pelanggan (Dependency
 * Inversion ala React). Komponen import HANYA dari sini / index.js, tidak
 * pernah dari api.js atau ../../lib/db secara langsung.
 *
 * `addPelanggan` / `updatePelanggan` / `deletePelanggan` di re-export
 * langsung dari api.js sebagai pass-through async — BUKAN dibungkus
 * `useMutation` — karena `usePelanggan()` di bawah sumbernya cache Dexie,
 * bukan cache TanStack Query, sehingga tidak ada query-cache yang berguna
 * untuk di-invalidate. Pemanggil tinggal `await` lalu panggil `reload()`
 * sendiri, sama seperti pola di features/penjualan.
 */
import { useEffect, useState, useCallback } from "react";
import { db } from "../../lib/db";
import { syncPelanggan } from "../../lib/sync";
import { useSalesByPelangganQuery, useSalesByBuyerNameQuery } from "./queries";

export { addPelanggan, updatePelanggan, deletePelanggan } from "./api";

// Riwayat pembelian 1 pelanggan — online (lihat catatan di api.js soal
// kenapa ini TIDAK lewat cache Dexie). `reload` dipakai buat refresh
// daftar transaksi setelah Retur berhasil diajukan dari modal riwayat.
export function useSalesByPelanggan(pelangganId) {
  const { data, isLoading, error, refetch } = useSalesByPelangganQuery(pelangganId);
  return { sales: data ?? [], loading: isLoading, error, reload: refetch };
}

// Riwayat pembelian utk pembeli yang belum terdaftar sebagai pelanggan —
// dicocokkan by nama pembeli (lihat catatan di api.js/queries.js).
export function useSalesByBuyerName(buyerName) {
  const { data, isLoading, error, refetch } = useSalesByBuyerNameQuery(buyerName);
  return { sales: data ?? [], loading: isLoading, error, reload: refetch };
}

// Ambil semua pelanggan dari cache lokal
export function usePelanggan() {
  const [pelanggan, setPelanggan] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const local = await db.pelanggan.orderBy("nama").toArray();
    setPelanggan(local);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (navigator.onLine) {
      syncPelanggan()
        .then(() => load())
        .catch(() => {});
    }
  }, [load]);

  return { pelanggan, loading, reload: load };
}

// Cari pelanggan by nama (untuk autocomplete)
export async function searchPelanggan(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return db.pelanggan
    .filter((p) => p.nama.toLowerCase().includes(q) || (p.no_hp ?? "").includes(q))
    .limit(8)
    .toArray();
}
