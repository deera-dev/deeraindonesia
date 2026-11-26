import { useMemo } from "react";
import { useHistoryByKode } from "../../history/hooks";
import { getMeta, summarizeHistory } from "../../history/utils";
import { useSalesDetailByKode } from "../../produk/hooks";

function fmtDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Dipicu otomatis setelah simpan hitungan yang selisih dari sistem (lihat
// StokOpnamePage handleSubmit) -- bantu admin cari tahu "salah dimana"
// dengan menggabungkan 2 sumber yang SUDAH ADA (tidak query baru): riwayat
// aksi admin (transfer/stok-opname/produksi, dari features/history) dan
// riwayat penjualan fisik (dari features/produk), diurutkan jadi satu
// linimasa supaya kelihatan urutan kejadian di sekitar waktu selisih itu
// muncul.
export default function RiwayatSelisihModal({ kode, nama, selisih, onClose }) {
  const { history, loading: loadingHistory } = useHistoryByKode(kode);
  const { data: sales, isLoading: loadingSales } = useSalesDetailByKode(kode);
  const loading = loadingHistory || loadingSales;

  const timeline = useMemo(() => {
    const fromHistory = history.map((h) => ({
      at: h.changed_at,
      kind: "history",
      action: h.action,
      label: getMeta(h.action).label,
      badgeCls: getMeta(h.action).badgeCls,
      detail: summarizeHistory(h),
      by: h.user_name,
    }));
    const fromSales = sales.map((s) => ({
      at: s.created_at,
      kind: "sale",
      label: "Penjualan",
      badgeCls: "text-skin-text3 bg-skin-raised border-skin-bdr",
      detail: `${s.qty} pcs · ${s.location ?? "-"}${s.buyer_name ? ` · ${s.buyer_name}` : ""}`,
    }));
    return [...fromHistory, ...fromSales].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30);
  }, [history, sales]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-headline text-skin-accent-text text-lg leading-none">Riwayat {kode}</h2>
            <p className="text-xs text-skin-text3 mt-1 truncate">
              {nama} · selisih {selisih > 0 ? "+" : ""}
              {selisih} pcs
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-skin-text3 px-2">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs text-skin-text3">
            Kejadian terbaru dulu — cek transfer/stok-opname sebelumnya atau penjualan yang mungkin menjelaskan
            selisih ini.
          </p>
          {loading && <p className="text-center text-sm text-skin-text3 py-8">Memuat riwayat...</p>}
          {!loading && timeline.length === 0 && (
            <p className="text-center text-sm text-skin-text4 py-8">Belum ada riwayat untuk kode ini.</p>
          )}
          {!loading &&
            timeline.map((t, i) => (
              <div key={i} className="border border-skin-bdr-lt px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold border ${t.badgeCls}`}>
                    {t.label}
                  </span>
                  <span className="text-[11px] text-skin-text4 tabular-nums flex-shrink-0">{fmtDateTime(t.at)}</span>
                </div>
                {t.detail && <p className="text-xs text-skin-text2 mt-1">{t.detail}</p>}
                {t.by && <p className="text-[11px] text-skin-text4 mt-0.5">oleh {t.by}</p>}
              </div>
            ))}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-bold uppercase tracking-[0.06em] bg-skin-accent text-skin-on-accent"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
