import { useGajianList } from "../gajian";
import { useKasbonList } from "../kasbon";
import { usePettycashAll } from "../pettycash";

export function useDashboardStats() {
  const { gajianList, loading: loadingGajian } = useGajianList();
  const { rows: kasbonRows, loading: loadingKasbon } = useKasbonList();
  const {
    saldo: pettycashSaldo,
    rows: pettycashRows,
    loading: loadingPettycash,
  } = usePettycashAll();

  const kasbonBelum = kasbonRows.filter((k) => k.status === "belum");
  const kasbonCount = kasbonBelum.length;
  const totalSisaKasbon = kasbonBelum.reduce((s, k) => s + (k.sisa || 0), 0);

  const bulanIni = new Date().toISOString().slice(0, 7);
  const bulanRows = pettycashRows.filter((r) => r.tanggal && r.tanggal.startsWith(bulanIni));
  const pettycashMasuk = bulanRows
    .filter((r) => r.jenis === "isi")
    .reduce((s, r) => s + (r.jumlah || 0), 0);
  const pettycashKeluar = bulanRows
    .filter((r) => r.jenis === "keluar")
    .reduce((s, r) => s + (r.jumlah || 0), 0);

  return {
    gajianRecent: gajianList.slice(0, 5),
    pettycashSaldo,
    pettycashMasuk,
    pettycashKeluar,
    kasbonCount,
    totalSisaKasbon,
    loading: loadingGajian || loadingKasbon || loadingPettycash,
  };
}
