/**
 * ProductChangeHistory.jsx — riwayat perubahan produk di detail card
 * (harga per ukuran dari-ke, HPP, nama, bahan, warna; tanggal & siapa).
 * Diff dihitung di backend (RPC get_product_change_history); komponen ini hanya menampilkan.
 */
import { useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { useProductChangeHistory } from "../hooks";
import { fmtWaktu } from "../utils";

const rp = (v) => (v == null ? "—" : `Rp ${formatHarga(v)}`);

function ChangeLine({ c }) {
  const isMoney = c.kind === "harga" || c.kind === "hpp";
  const fmt = (v) => (isMoney ? rp(v) : v === "" || v == null ? "—" : String(v));
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="text-[11px] uppercase tracking-wide text-skin-text3">{c.kind === "harga" ? `Harga ${c.label}` : c.label}</span>
      <span className="text-red-400 line-through">{fmt(c.from)}</span>
      <span className="text-skin-text3">→</span>
      <span className="text-emerald-500 font-semibold">{fmt(c.to)}</span>
    </div>
  );
}

export default function ProductChangeHistory({ kode, limit = 6 }) {
  const { history, loading } = useProductChangeHistory(kode);
  const [all, setAll] = useState(false);
  if (loading || history.length === 0) return null;
  const rows = all ? history : history.slice(0, limit);
  return (
    <div className="space-y-3" data-testid="change-history">
      {rows.map((h) => (
        <div key={h.changed_at + h.action} className="border-l-2 border-skin-bdr-lt pl-3 space-y-1">
          <p className="text-xs text-skin-text3">
            {fmtWaktu(h.changed_at)} · <span className="text-skin-text2 uppercase">{h.user_name || "—"}</span>
          </p>
          {h.action === "tambah" ? (
            <p className="text-sm text-skin-text2">Produk ditambahkan</p>
          ) : (
            [...h.changes]
              .sort((a, b) => (a.kind === "harga" ? 0 : 1) - (b.kind === "harga" ? 0 : 1))
              .map((c, i) => <ChangeLine key={i} c={c} />)
          )}
        </div>
      ))}
      {history.length > limit && (
        <button type="button" onClick={() => setAll((v) => !v)} className="text-xs text-skin-accent-text">
          {all ? "Tampilkan lebih sedikit" : `Tampilkan semua (${history.length})`}
        </button>
      )}
    </div>
  );
}
