/**
 * KeepListModal.jsx — daftar keep yang BELUM dibayar. Per keep: cetak struk
 * (badge "Belum Lunas" hanya di aplikasi), Bayar (jadi transaksi biasa + struk LUNAS), atau Batalkan.
 * Konfirmasi memakai dialog sendiri (bukan window.confirm — konteks PWA).
 */
import { useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { toast } from "@deera/shared/features/toast/hooks";
import Struk from "../../../shared/components/Struk";
import { useKeepOrdersQuery, useCancelKeepMutation, usePayKeep, buildKeepStruk, keepPcs, fmtKeepTanggal } from "../hooks";

export default function KeepListModal({ onClose, onPaid }) {
  const { data: list = [], isLoading, isError } = useKeepOrdersQuery();
  const cancelMutation = useCancelKeepMutation();
  const { payKeep, payingId } = usePayKeep();
  const [confirm, setConfirm] = useState(null); // { type: "bayar" | "batal", keep }
  const [struk, setStruk] = useState(null);

  async function handleConfirm() {
    const { type, keep } = confirm;
    setConfirm(null);
    if (type === "bayar") {
      const result = await payKeep(keep);
      if (result) {
        setStruk(result);
        onPaid?.();
      }
    } else {
      try {
        await cancelMutation.mutateAsync(keep.id);
        toast.success("Keep dibatalkan.");
      } catch (err) {
        toast.error("Gagal membatalkan keep: " + err.message);
      }
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
          <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
            <h2 className="text-sm font-semibold tracking-[0.15em] text-skin-text2 uppercase">
              Keep — Belum Dibayar{list.length ? ` (${list.length})` : ""}
            </h2>
            <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8">
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
            {isLoading && <p className="text-sm text-skin-text4 py-10 text-center">Memuat...</p>}
            {isError && <p className="text-sm text-red-500 py-10 text-center px-4">Gagal memuat keep (butuh internet; pastikan migrasi keep_orders sudah dijalankan).</p>}
            {!isLoading && !isError && list.length === 0 && (
              <p className="text-sm text-skin-text4 py-10 text-center">Tidak ada keep yang belum dibayar.</p>
            )}
            {list.map((k) => (
              <div key={k.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-skin-text truncate">
                      {k.buyer_name || "Tanpa nama"}
                      <span className="ml-2 align-middle text-[10px] font-semibold tracking-[0.05em] uppercase px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        Belum Lunas
                      </span>
                    </p>
                    <p className="text-xs text-skin-text3">
                      {fmtKeepTanggal(k.date)} · {keepPcs(k.items)} pcs
                      {k.location ? ` · ${LOCATION_LABELS[k.location] ?? k.location}` : ""}
                    </p>
                  </div>
                  <p className="text-base text-skin-text font-headline flex-shrink-0">Rp {formatHarga(k.total)}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold tracking-[0.08em] uppercase">
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: "bayar", keep: k })}
                    disabled={payingId === k.id}
                    className="px-3 py-1.5 bg-[#CAB170] text-white hover:bg-[#A8925A] transition disabled:opacity-40"
                  >
                    {payingId === k.id ? "..." : "Bayar"}
                  </button>
                  <button type="button" onClick={() => setStruk(buildKeepStruk(k))} className="text-[#A8925A] underline">
                    Struk
                  </button>
                  <button type="button" onClick={() => setConfirm({ type: "batal", keep: k })} className="text-skin-text3 hover:text-red-500 underline ml-auto">
                    Batalkan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-skin-card border-2 border-skin-bdr max-w-sm w-full p-5">
            <p className="text-sm text-skin-text">
              {confirm.type === "bayar" ? (
                <>
                  Catat pembayaran <strong>Rp {formatHarga(confirm.keep.total)}</strong>
                  {confirm.keep.buyer_name ? <> dari <strong>{confirm.keep.buyer_name}</strong></> : null}? Stok akan dikurangi dan transaksi masuk laporan.
                </>
              ) : (
                <>Batalkan keep {confirm.keep.buyer_name ? <strong>{confirm.keep.buyer_name}</strong> : "ini"}? Tidak ada stok yang berubah.</>
              )}
            </p>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setConfirm(null)} className="flex-1 py-2.5 text-xs tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2">
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 py-2.5 text-xs tracking-[0.15em] uppercase text-white ${confirm.type === "bayar" ? "bg-[#CAB170] hover:bg-[#A8925A]" : "bg-red-500 hover:bg-red-600"}`}
              >
                {confirm.type === "bayar" ? "Ya, Bayar" : "Ya, Batalkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {struk && <Struk sale={struk} onClose={() => setStruk(null)} />}
    </>
  );
}
