import { useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import Struk from "../../../shared/components/Struk";
import { useKeepOrdersQuery, useKeepFulfillment, usePayKeep, buildKeepStruk, keepPcs, fmtKeepTanggal } from "../hooks";

export default function KeepListModal({ onClose, onPaid, onEdit, cartHasItems = false, editingKeepId = null }) {
  const { data: allList = [], isLoading, isError } = useKeepOrdersQuery();
  const { kirimKeep, batalkanKeep, processingId } = useKeepFulfillment();
  const { payKeep, payingId } = usePayKeep();
  const [confirm, setConfirm] = useState(null);
  const [struk, setStruk] = useState(null);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const list = q
    ? allList.filter(
        (k) =>
          (k.buyer_name ?? "").toLowerCase().includes(q) ||
          (k.items ?? []).some((it) => (it.kode ?? "").toLowerCase().includes(q)),
      )
    : allList;

  function handleEdit(keep) {
    if (cartHasItems && keep.id !== editingKeepId) setConfirm({ type: "edit", keep });
    else onEdit(keep);
  }

  async function handleConfirm() {
    const { type, keep } = confirm;
    setConfirm(null);
    if (type === "edit") {
      onEdit(keep);
    } else if (type === "kirim") {
      await kirimKeep(keep);
    } else if (type === "bayar") {
      const result = await payKeep(keep);
      if (result) {
        setStruk(result);
        onPaid?.();
      }
    } else {
      await batalkanKeep(keep);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
          <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
            <h2 className="text-sm font-semibold tracking-[0.15em] text-skin-text2 uppercase">
              Keep — Belum Dibayar{allList.length ? ` (${allList.length})` : ""}
            </h2>
            <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8">
              ×
            </button>
          </div>

          {allList.length > 0 && (
            <div className="px-4 py-2.5 border-b border-skin-bdr-lt flex-shrink-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama pembeli atau kode produk..."
                className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition placeholder:text-skin-text4"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
            {isLoading && <p className="text-sm text-skin-text4 py-10 text-center">Memuat...</p>}
            {isError && <p className="text-sm text-red-500 py-10 text-center px-4">Gagal memuat keep (butuh internet; pastikan migrasi keep_orders sudah dijalankan).</p>}
            {!isLoading && !isError && allList.length === 0 && (
              <p className="text-sm text-skin-text4 py-10 text-center">Tidak ada keep yang belum dibayar.</p>
            )}
            {!isLoading && !isError && allList.length > 0 && list.length === 0 && (
              <p className="text-sm text-skin-text4 py-10 text-center">Tidak ada keep yang cocok dengan "{search}".</p>
            )}
            {list.map((k) => (
              <div key={k.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-skin-text truncate">
                      {k.buyer_name || "Tanpa nama"}
                      {k.status === "terkirim" ? (
                        <span className="ml-2 align-middle text-[10px] font-semibold tracking-[0.05em] uppercase px-1.5 py-0.5 bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                          Terkirim
                        </span>
                      ) : (
                        <span className="ml-2 align-middle text-[10px] font-semibold tracking-[0.05em] uppercase px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          Belum Dikirim
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-skin-text3">
                      {fmtKeepTanggal(k.date)} · {keepPcs(k.items)} pcs
                      {k.location ? ` · ${LOCATION_LABELS[k.location] ?? k.location}` : ""}
                    </p>
                  </div>
                  <p className="text-base text-skin-text font-numeric flex-shrink-0">Rp {formatHarga(k.total)}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold tracking-[0.08em] uppercase">
                  {k.status === "terkirim" ? (
                    <button
                      type="button"
                      onClick={() => setConfirm({ type: "bayar", keep: k })}
                      disabled={payingId === k.id}
                      className="px-3 py-1.5 bg-skin-accent text-skin-on-accent hover:bg-skin-accent-hover transition disabled:opacity-40"
                    >
                      {payingId === k.id ? "..." : "Bayar"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirm({ type: "kirim", keep: k })}
                      disabled={processingId === k.id}
                      className="px-3 py-1.5 border-2 border-skin-accent text-skin-accent-text hover:bg-skin-accent hover:text-skin-on-accent transition disabled:opacity-40"
                    >
                      {processingId === k.id ? "..." : "Kirim"}
                    </button>
                  )}
                  {onEdit && k.status === "aktif" && (
                    <button type="button" onClick={() => handleEdit(k)} className="text-skin-accent-text underline">
                      Edit
                    </button>
                  )}
                  <button type="button" onClick={() => setStruk(buildKeepStruk(k))} className="text-skin-accent-text underline">
                    Struk
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: "batal", keep: k })}
                    disabled={processingId === k.id}
                    className="text-skin-text3 hover:text-red-500 underline ml-auto disabled:opacity-40"
                  >
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
              {confirm.type === "edit" ? (
                <>
                  Pesanan yang sedang di kasir akan diganti isi keep {confirm.keep.buyer_name ? <strong>{confirm.keep.buyer_name}</strong> : "ini"}. Lanjut?
                </>
              ) : confirm.type === "kirim" ? (
                <>
                  Tandai keep {confirm.keep.buyer_name ? <strong>{confirm.keep.buyer_name}</strong> : "ini"} sudah dikirim/diambil pembeli? Stok akan dikurangi sekarang juga, walau belum dibayar.
                </>
              ) : confirm.type === "bayar" ? (
                <>
                  Catat pembayaran <strong>Rp {formatHarga(confirm.keep.total)}</strong>
                  {confirm.keep.buyer_name ? <> dari <strong>{confirm.keep.buyer_name}</strong></> : null}? Transaksi masuk laporan (stok sudah dikurangi sejak ditandai terkirim).
                </>
              ) : confirm.keep.status === "terkirim" ? (
                <>Batalkan keep {confirm.keep.buyer_name ? <strong>{confirm.keep.buyer_name}</strong> : "ini"}? Stok yang sudah dikurangi saat terkirim akan dikembalikan.</>
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
                className={`flex-1 py-2.5 text-xs tracking-[0.15em] uppercase text-skin-on-accent ${confirm.type === "batal" ? "bg-red-500 hover:bg-red-600" : "bg-skin-accent hover:bg-skin-accent-hover"}`}
              >
                {{ edit: "Ya, Edit", kirim: "Ya, Kirim", bayar: "Ya, Bayar", batal: "Ya, Batalkan" }[confirm.type]}
              </button>
            </div>
          </div>
        </div>
      )}

      {struk && <Struk sale={struk} onClose={() => setStruk(null)} />}
    </>
  );
}
