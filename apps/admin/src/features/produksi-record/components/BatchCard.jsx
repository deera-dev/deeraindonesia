/**
 * BatchCard.jsx — Kartu tampilan satu catatan batch produksi.
 */
import { useState } from "react";
import { fmtRp, fmtDate } from "../utils";

export default function BatchCard({ batch, onEdit, onDelete, onSync }) {
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState("");

  // bahan_dipakai kosong = pemakaian bahan batch ini TIDAK ikut terhitung di
  // kolom "Keluar" pada Daftar Stok Bahan (lihat catatan resyncBahanDipakai
  // di features/produksi-record/api.js untuk kenapa ini bisa terjadi).
  const belumTersinkron = !batch.bahan_dipakai || batch.bahan_dipakai.length === 0;

  async function handleSync(e) {
    e.stopPropagation();
    setSyncing(true);
    setSyncErr("");
    try {
      await onSync(batch);
    } catch (err) {
      setSyncErr(err.message ?? "Gagal sinkronkan bahan.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="bg-skin-card border border-skin-bdr">
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-skin-text">{batch.kode_produk}</p>
            <p className="text-xs text-skin-text3 truncate">{batch.nama_produk}</p>
          </div>
          {batch.hpp_per_item > 0 && (
            <p className="shrink-0 text-xs font-semibold text-[#CAB170]">
              {fmtRp(batch.hpp_per_item)}/baju
            </p>
          )}
        </div>

        <p className="text-xs text-skin-text3">
          {batch.batch_no} · {fmtDate(batch.tanggal_produksi)} · {batch.total_kain} potong
        </p>

        {belumTersinkron && (
          <div className="flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-2">
            <p className="text-[11px] text-amber-600 leading-snug">
              ⚠ Pemakaian bahan belum tersinkron — tidak ikut terhitung di kolom
              &ldquo;Keluar&rdquo; Stok Bahan.
            </p>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="shrink-0 px-2.5 py-1.5 text-[10px] font-editorial tracking-[0.1em] uppercase bg-amber-500 text-white hover:bg-amber-600 transition disabled:opacity-50"
            >
              {syncing ? "..." : "Sinkronkan"}
            </button>
          </div>
        )}
        {syncErr && <p className="text-[11px] text-red-500 leading-snug">{syncErr}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
          >
            {expanded ? "Tutup" : "Detail"}
          </button>
          <button
            onClick={() => onEdit(batch)}
            className="px-3 py-2 text-xs font-editorial tracking-[0.12em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(batch)}
            className="px-3 py-2 text-xs border border-skin-bdr text-red-400 hover:text-red-600 transition"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-skin-bdr-lt px-4 pb-4 space-y-3">
          {batch.sizes?.map((s, si) => (
            <div key={si}>
              <p className="text-xs font-semibold text-skin-text2 mt-2">{s.size}</p>
              {s.warna?.map((w, wi) => (
                <p key={wi} className="text-xs text-skin-text3 pl-2">
                  {w.warna === "_" ? "(tanpa warna)" : w.warna}: {w.qty} potong
                </p>
              ))}
            </div>
          ))}
          {batch.bahan_dipakai?.length > 0 && (
            <div>
              <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mt-3 mb-1">
                Bahan Dipakai
              </p>
              {batch.bahan_dipakai.map((b, bi) => (
                <p key={bi} className="text-xs text-skin-text2">
                  {b.nama_bahan}: {b.jumlah} {b.satuan}
                </p>
              ))}
            </div>
          )}
          {batch.catatan && <p className="text-xs text-skin-text3 italic mt-2">{batch.catatan}</p>}
        </div>
      )}
    </div>
  );
}
