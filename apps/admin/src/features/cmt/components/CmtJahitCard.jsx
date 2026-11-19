import { useEffect, useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useUpdateHargaUpahKirim } from "../hooks";
import { calcTotalUpahKirim, statusLabel } from "../utils";

export default function CmtJahitCard({ group, onSetor, onBatal, onSuratJalan }) {
  const { updateHargaUpah, saving } = useUpdateHargaUpahKirim();
  const [hargaDraft, setHargaDraft] = useState(String(group.hargaUpah ?? ""));

  // Resync draft kalau harga berubah dari luar (refetch setelah simpan,
  // atau diedit dari tab/sesi lain) -- tidak mengganggu ketikan admin yg
  // sedang berjalan karena effect ini cuma fire saat group.hargaUpah
  // benar-benar berubah, bukan tiap render.
  useEffect(() => {
    setHargaDraft(String(group.hargaUpah ?? ""));
  }, [group.hargaUpah]);

  const dirty = hargaDraft !== String(group.hargaUpah ?? "");
  const totalUpah = calcTotalUpahKirim({ ...group, hargaUpah: Number(hargaDraft) || 0 });

  async function handleSaveHarga() {
    try {
      await updateHargaUpah({ kirimNo: group.kirimNo, hargaUpah: hargaDraft });
      toast.success("Upah/pcs disimpan.");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    }
  }

  return (
    <div className="bg-skin-card border border-skin-bdr p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-skin-text truncate">{group.namaVendor}</p>
          <p className="text-[11px] text-skin-text4">
            {group.kirimNo} · kirim {group.tanggalKirim}
            {group.estimasiSelesai ? ` · estimasi ${group.estimasiSelesai}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-[9px] font-editorial tracking-[0.08em] uppercase px-1.5 py-0.5 border bg-skin-raised text-skin-text3 border-skin-bdr">
          {statusLabel(group.status)}
        </span>
      </div>

      <div className="text-[11px] text-skin-text3 space-y-0.5">
        {group.rows.map((r) => (
          <p key={r.id}>
            {r.kode_produk} · {r.size} · {r.warna === "_" ? "(tanpa warna)" : r.warna} — {r.qty} pcs
            {r.qty_setor != null && ` (setor ${r.qty_setor})`}
          </p>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={`upah-${group.kirimNo}`} className="text-[11px] text-skin-text3 shrink-0">
          Upah/pcs
        </label>
        <input
          id={`upah-${group.kirimNo}`}
          type="number"
          min="0"
          value={hargaDraft}
          onChange={(e) => setHargaDraft(e.target.value)}
          placeholder="Belum sepakat harga? Kosongkan dulu"
          className="w-28 border border-skin-bdr bg-skin-card px-2 py-1 text-xs text-skin-text"
        />
        {dirty && (
          <button
            type="button"
            onClick={handleSaveHarga}
            disabled={saving}
            className="shrink-0 px-2.5 py-1 text-[11px] font-editorial tracking-[0.08em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-50"
          >
            {saving ? "..." : "Simpan"}
          </button>
        )}
      </div>
      {totalUpah > 0 && (
        <p className="text-[11px] text-skin-text3">
          Perkiraan total modal:{" "}
          <span className="font-semibold text-skin-accent-text">
            {totalUpah.toLocaleString("id-ID")}
          </span>
        </p>
      )}

      <button
        type="button"
        onClick={() => onSuratJalan(group)}
        className="w-full py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text2"
      >
        Surat Jalan
      </button>
      {group.status === "dikirim" && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSetor(group)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
          >
            Setor
          </button>
          <button
            type="button"
            onClick={() => onBatal(group)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text2"
          >
            Batalkan
          </button>
        </div>
      )}
    </div>
  );
}
