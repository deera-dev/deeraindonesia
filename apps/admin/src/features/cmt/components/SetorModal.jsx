import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useSetorKirimCmtJahit } from "../hooks";

export default function SetorModal({ group, onClose }) {
  const { setorKirim, submitting } = useSetorKirimCmtJahit();
  const pendingRows = group.rows.filter((r) => r.status === "dikirim");
  const [qtyByRow, setQtyByRow] = useState(() =>
    Object.fromEntries(pendingRows.map((r) => [r.id, String(r.qty)])),
  );
  const [tanggalSetor, setTanggalSetor] = useState(() => new Date().toISOString().slice(0, 10));
  const [catatan, setCatatan] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const itemsSetor = pendingRows.map((r) => ({
      id: r.id,
      qtySetor: Number(qtyByRow[r.id]) || 0,
    }));
    try {
      await setorKirim({ kirimNo: group.kirimNo, tanggalSetor, itemsSetor, catatan });
      toast.success("Setoran CMT dicatat — akan otomatis jadi acuan Finishing.");
      onClose();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
            <h2 className="font-headline text-skin-accent-text text-lg">
              Setor dari {group.namaVendor}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-skin-text3 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-skin-text3">Tanggal Setor *</label>
              <input
                type="date"
                required
                value={tanggalSetor}
                onChange={(e) => setTanggalSetor(e.target.value)}
                className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-skin-text3">Koreksi qty kalau beda dari yang dikirim</p>
              {pendingRows.map((r) => (
                <div key={r.id} className="flex items-center gap-2 bg-skin-raised p-2.5">
                  <span className="flex-1 text-sm text-skin-text truncate">
                    {r.kode_produk} · {r.size} · {r.warna === "_" ? "(tanpa warna)" : r.warna}
                  </span>
                  <span className="text-xs text-skin-text4">kirim {r.qty}</span>
                  <input
                    type="number"
                    min="0"
                    data-testid={`setor-qty-${r.id}`}
                    value={qtyByRow[r.id] ?? ""}
                    onChange={(e) => setQtyByRow((p) => ({ ...p, [r.id]: e.target.value }))}
                    className="w-20 border border-skin-bdr bg-skin-card px-2 py-1.5 text-sm text-skin-text"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-skin-text3">Catatan</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
              />
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-editorial tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-sm font-editorial tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Konfirmasi Setor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
