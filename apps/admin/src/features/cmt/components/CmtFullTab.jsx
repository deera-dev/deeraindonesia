import { useState } from "react";
import { useCmtSetoranFull } from "../hooks";
import SetoranFullForm from "./SetoranFullForm";

export default function CmtFullTab() {
  const { rows, loading } = useCmtSetoranFull();
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full mb-4 py-3 text-sm font-editorial tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
      >
        + Terima Setoran CMT Full
      </button>

      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Belum ada setoran CMT Full.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-skin-card border border-skin-bdr p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-skin-text truncate">{r.nama_vendor}</p>
                  <p className="text-[11px] text-skin-text4">
                    {r.kode_produk} · {r.tanggal_setor}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-numeric text-skin-accent-text">
                  {Number(r.total_upah || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="text-[11px] text-skin-text3 space-y-0.5">
                {(r.items ?? []).map((it, i) => (
                  <p key={i}>
                    {it.size} · {it.warna === "_" ? "(tanpa warna)" : it.warna} — {it.qty} pcs
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <SetoranFullForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
