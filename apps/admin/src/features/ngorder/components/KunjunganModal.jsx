import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { KUNJUNGAN_STATUS_LABEL, parseSosmed, buildGmapsPlaceUrl } from "../hooks";
import SosmedLinks from "../../../shared/components/SosmedLinks";

const STATUS_OPTIONS = ["rencana", "berlangsung", "selesai", "batal"];

const STATUS_ACTIVE = {
  rencana: "bg-skin-raised text-skin-text border border-skin-bdr",
  berlangsung: "bg-amber-500 text-white",
  selesai: "bg-green-600 text-white",
  batal: "bg-red-500 text-white",
};

const inputCls =
  "w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition";
const labelCls = "block text-[11px] font-editorial tracking-[0.1em] uppercase text-skin-text3 mb-1.5";

export default function KunjunganModal({ row, toko, onSave, saving, onClose }) {
  const [status, setStatus] = useState(row.status === "rencana" ? "berlangsung" : row.status);
  const [hasil, setHasil] = useState(row.hasil ?? "");
  const [request, setRequest] = useState(row.request ?? "");
  const [kesan, setKesan] = useState(row.kesan ?? "");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await onSave(row, { status, hasil, request, kesan });
      toast.success(`Catatan kunjungan ${toko.nama} tersimpan.`);
      onClose();
    } catch (err) {
      toast.error(err?.message ?? "Gagal menyimpan catatan kunjungan.");
    }
  }

  const gmaps = buildGmapsPlaceUrl(toko);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-headline text-lg text-skin-text truncate">{toko.nama}</h2>
            <p className="text-xs text-skin-text3 truncate">{toko.daerah || toko.alamat || "-"}</p>
            <SosmedLinks items={parseSosmed(toko.media_sosial, toko.nama)} className="mt-0.5">
              {gmaps && (
                <a href={gmaps} target="_blank" rel="noreferrer" className="text-skin-accent-text hover:underline">
                  Google Maps
                </a>
              )}
            </SosmedLinks>
          </div>
          <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex-shrink-0">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <span className={labelCls}>Status kunjungan</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-2 text-xs font-semibold rounded-full transition ${
                    status === s ? STATUS_ACTIVE[s] : "bg-skin-page text-skin-text2 border border-skin-bdr-lt"
                  }`}
                >
                  {KUNJUNGAN_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls}>Kesan toko</span>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "", label: "Belum tahu", active: "bg-skin-text3 text-white" },
                { key: "tertarik", label: "Tertarik", active: "bg-green-600 text-white" },
                { key: "belum_tertarik", label: "Belum tertarik", active: "bg-red-500 text-white" },
              ].map((k) => (
                <button
                  key={k.key || "none"}
                  type="button"
                  aria-pressed={kesan === k.key}
                  onClick={() => setKesan(k.key)}
                  className={`px-3 py-2 text-xs font-semibold rounded-full transition ${
                    kesan === k.key ? k.active : "bg-skin-page text-skin-text2 border border-skin-bdr-lt"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {status === "selesai" && (
              <p className="text-[11px] text-skin-text3 mt-1.5">Toko otomatis ditandai "Sudah Di-Approach" beserta kesannya.</p>
            )}
          </div>

          <label className="block">
            <span className={labelCls}>Apa yang terjadi</span>
            <textarea
              rows={4}
              value={hasil}
              onChange={(e) => setHasil(e.target.value)}
              placeholder="Mis. ketemu owner, lihat 5 sampel, minta dikirim katalog via WA..."
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Request toko</span>
            <textarea
              rows={3}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Mis. minta warna maroon, size jumbo, harga grosir min. 1 seri..."
              className={inputCls}
            />
          </label>

          {(row.dipilih_oleh_nama || row.diubah_oleh_nama) && (
            <p className="text-[11px] text-skin-text4">
              {row.dipilih_oleh_nama ? `Dipilih oleh ${row.dipilih_oleh_nama}` : ""}
              {row.diubah_oleh_nama ? ` · terakhir diubah ${row.diubah_oleh_nama}` : ""}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 font-editorial text-xs tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 font-editorial text-xs tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
