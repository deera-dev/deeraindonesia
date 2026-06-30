/**
 * hooks.js — PUBLIC SURFACE fitur Dashboard.
 * Tidak punya api.js/queries.js sendiri — Dashboard murni mengomposisikan
 * hook publik dari fitur lain (gajian, kas, kasbon) menjadi satu bentuk data
 * yang siap pakai oleh DashboardPage. Komponen HANYA boleh import dari sini
 * (atau index.js).
 */
import { useGajianList } from "../gajian";
import { useKasBulanIni } from "../kas";
import { useKasbonList } from "../kasbon";

/** Awal bulan berjalan, format YYYY-MM-DD (lokal). */
function bulanAwalIni() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Ringkasan untuk DashboardPage: 5 gajian terbaru, kas bulan ini, kasbon aktif.
 */
export function useDashboardStats() {
  const { gajianList, loading: loadingGajian } = useGajianList();
  const { kasMasuk, kasKeluar, loading: loadingKas } = useKasBulanIni(bulanAwalIni());
  const { rows: kasbonRows, loading: loadingKasbon } = useKasbonList();

  const kasbonBelum = kasbonRows.filter((k) => k.status === "belum");
  const kasbonCount = kasbonBelum.length;
  const totalSisaKasbon = kasbonBelum.reduce((s, k) => s + (k.sisa || 0), 0);

  return {
    gajianRecent: gajianList.slice(0, 5),
    kasMasuk,
    kasKeluar,
    kasbonCount,
    totalSisaKasbon,
    loading: loadingGajian || loadingKas || loadingKasbon,
  };
}
