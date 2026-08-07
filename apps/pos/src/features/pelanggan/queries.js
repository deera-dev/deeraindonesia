/**
 * features/pelanggan/queries.js
 * TanStack Query hooks yang membungkus api.js — HANYA utk riwayat pembelian
 * (read-only, online). CRUD pelanggan (add/update/delete) & daftar pelanggan
 * (usePelanggan) SENGAJA TETAP lewat Dexie/useState di hooks.js — itu data
 * yang perlu tersedia offline saat kasir checkout, beda kebutuhan dengan
 * riwayat transaksi lama yang wajar butuh koneksi internet.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchSalesByPelanggan, fetchSalesByBuyerName } from "./api";

export const pelangganKeys = {
  salesByPelanggan: (id) => ["pelanggan-pos", "sales", id],
  salesByBuyerName: (nama) => ["pelanggan-pos", "sales-by-name", nama],
};

export function useSalesByPelangganQuery(pelangganId) {
  return useQuery({
    queryKey: pelangganKeys.salesByPelanggan(pelangganId),
    queryFn: () => fetchSalesByPelanggan(pelangganId),
    enabled: !!pelangganId,
  });
}

// Utk pembeli yang belum terdaftar sebagai pelanggan (lihat catatan di
// api.js fetchSalesByBuyerName soal pencocokan by nama).
export function useSalesByBuyerNameQuery(buyerName) {
  return useQuery({
    queryKey: pelangganKeys.salesByBuyerName(buyerName),
    queryFn: () => fetchSalesByBuyerName(buyerName),
    enabled: !!buyerName,
  });
}
