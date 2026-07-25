import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useFinalizeGajian, useGajianTotals, useKasbonForGajian, useSaveGajianRequest } from "../hooks";
import { buildKasbonDeductionsPayload, calcTotalRequest, cleanTambahan, sumKasbonDeduction, sumTambahan } from "../utils";
import PerKaryawan from "./PerKaryawan";
import ShareModal from "./ShareModal";

const TIM_LABELS = [
  ["potong", "Tim Potong"],
  ["jahit", "Tim Jahit"],
  ["finishing", "Tim Finishing"],
  ["qa", "Tim QC"],
  ["kreatif", "Tim Kreatif"],
  ["cmt", "CMT Luar"],
];

/** TabRingkasan.jsx — Tab Ringkasan: total per tim, pettycash/tambahan/kasbon, finalisasi, bagikan. */
export default function TabRingkasan({ gajianId, gajian }) {
  const isFinal = gajian.status === "final";
  const { totals, loading: loadingTotals } = useGajianTotals(gajianId);
  const { kasbon } = useKasbonForGajian(gajianId);
  const saveGajianRequest = useSaveGajianRequest();
  const finalizeGajian = useFinalizeGajian();

  const [pettycash, setPettycash] = useState(String(gajian.pettycash ?? ""));
  const [tambahan, setTambahan] = useState(gajian.tambahan ?? []);
  const [kasbonDeds, setKasbonDeds] = useState(
    Object.fromEntries((gajian.kasbon_deductions ?? []).map((d) => [d.kasbon_id, String(d.jumlah)])),
  );
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const setTamb = (i, k, v) => setTambahan((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const totalGaji = isFinal ? (gajian.total_gaji ?? 0) : (totals?.gaji ?? 0);
  const sTambahan = sumTambahan(tambahan);
  const sKasbonDed = sumKasbonDeduction(kasbon, kasbonDeds);
  const totalRequest = isFinal
    ? (gajian.total_request ?? 0)
    : calcTotalRequest({ totalGaji, pettycash, tambahan, kasbon, kasbonDeds });

  async function handleSaveRequest() {
    setSaving(true);
    try {
      await saveGajianRequest(gajianId, {
        pettycash: Number(pettycash) || 0,
        tambahan: cleanTambahan(tambahan),
        kasbonDeductions: buildKasbonDeductionsPayload(kasbon, kasbonDeds),
        totalRequest,
      });
      toast.success("Pettycash, tambahan & kasbon disimpan.");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    if (!confirm("Finalisasi gajian periode ini? Setelah final, data tidak bisa diubah lagi.")) return;
    setFinalizing(true);
    try {
      await finalizeGajian(gajian, {
        totals,
        pettycash: Number(pettycash) || 0,
        tambahan: cleanTambahan(tambahan),
        kasbon,
        kasbonDeductions: buildKasbonDeductionsPayload(kasbon, kasbonDeds),
        totalRequest,
      });
      toast.success("Gajian difinalisasi.");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setFinalizing(false);
    }
  }

  const shareKasbonDeds = isFinal ? (gajian.kasbon_deductions ?? []) : buildKasbonDeductionsPayload(kasbon, kasbonDeds);

  return (
    <div className="space-y-5">
      <div className="bg-skin-raised p-3">
        <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3 mb-2">Total Per Tim</p>
        {loadingTotals ? (
          <p className="text-sm text-skin-text3 py-2">Memuat...</p>
        ) : (
          <>
            {TIM_LABELS.map(([key, label]) => {
              const val = isFinal ? gajian[`total_${key}`] : totals?.[key];
              if (!val) return null;
              return (
                <div key={key} className="flex justify-between text-sm py-0.5">
                  <span className="text-skin-text3">{label}</span>
                  <span className="font-numeric text-skin-text">{fmtRp(val)}</span>
                </div>
              );
            })}
            <div className="flex justify-between text-sm font-semibold pt-2 mt-1 border-t border-skin-bdr-lt">
              <span className="text-skin-text">Total Gaji</span>
              <span className="font-numeric text-[#CAB170]">{fmtRp(totalGaji)}</span>
            </div>
          </>
        )}
      </div>

      {!isFinal && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Pettycash</label>
            <input type="number" min="0" value={pettycash} onChange={(e) => setPettycash(e.target.value)} placeholder="0" className={inputCls} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Tambahan Lain</label>
              <button
                type="button"
                onClick={() => setTambahan((p) => [...p, { label: "", jumlah: "" }])}
                className="font-editorial text-xs text-[#CAB170] hover:text-[#A8925A] transition"
              >
                + Tambah
              </button>
            </div>
            <div className="space-y-2">
              {tambahan.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={it.label} onChange={(e) => setTamb(i, "label", e.target.value)} placeholder="Keterangan" className={inputCls} />
                  <input type="number" value={it.jumlah} onChange={(e) => setTamb(i, "jumlah", e.target.value)} placeholder="Rp" className={inputCls + " w-32"} />
                  <button type="button" onClick={() => setTambahan((p) => p.filter((_, idx) => idx !== i))} className="text-red-400 text-sm px-1">×</button>
                </div>
              ))}
            </div>
          </div>

          {kasbon.length > 0 && (
            <div>
              <label className={labelCls}>Potongan Kasbon</label>
              <div className="space-y-2 mt-2">
                {kasbon.map((kb) => (
                  <div key={kb.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="font-editorial text-sm text-skin-text">{kb.karyawan?.nama ?? "—"}</p>
                      <p className="font-editorial text-[11px] text-skin-text4">Sisa: <span className="font-numeric">{fmtRp(kb.sisa)}</span></p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={kb.sisa}
                      value={kasbonDeds[kb.id] ?? ""}
                      onChange={(e) => setKasbonDeds((p) => ({ ...p, [kb.id]: e.target.value }))}
                      placeholder="0"
                      className={inputCls + " w-32"}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveRequest}
            disabled={saving}
            className="w-full py-2.5 text-xs font-editorial tracking-[0.12em] uppercase border border-[#CAB170] text-[#CAB170] hover:bg-skin-gold transition disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Pettycash, Tambahan & Kasbon"}
          </button>
        </div>
      )}

      <div className="bg-skin-gold border border-[#CAB170] p-3 space-y-1">
        {(isFinal ? (gajian.pettycash ?? 0) > 0 : (Number(pettycash) || 0) > 0) && (
          <div className="flex justify-between text-sm">
            <span className="text-skin-text3">+ Pettycash</span>
            <span className="font-numeric text-skin-text">{fmtRp(isFinal ? gajian.pettycash : Number(pettycash) || 0)}</span>
          </div>
        )}
        {(isFinal ? gajian.tambahan ?? [] : tambahan).filter((t) => Number(t.jumlah) > 0).map((t, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-skin-text3">+ {t.label || "Tambahan"}</span>
            <span className="font-numeric text-skin-text">{fmtRp(t.jumlah)}</span>
          </div>
        ))}
        {!isFinal && sKasbonDed > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-red-400">− Potongan Kasbon</span>
            <span className="font-numeric text-red-400">−{fmtRp(sKasbonDed)}</span>
          </div>
        )}
        {isFinal && (gajian.kasbon_deductions ?? []).filter((k) => Number(k.jumlah) > 0).map((k, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-red-400">− Kasbon {k.nama}</span>
            <span className="font-numeric text-red-400">−{fmtRp(k.jumlah)}</span>
          </div>
        ))}
        <div className="flex justify-between text-base font-bold pt-1.5 mt-1 border-t border-[#CAB170]/40">
          <span className="text-[#CAB170]">Total Mingguan</span>
          <span className="font-numeric text-[#CAB170]">{fmtRp(totalRequest)}</span>
        </div>
      </div>

      <PerKaryawan gajianId={gajianId} kasbonDeds={shareKasbonDeds} />

      <div className="flex gap-2">
        {isFinal ? (
          <span className="flex-1 text-center py-2.5 text-xs font-editorial tracking-[0.12em] uppercase border border-emerald-500 text-emerald-500">
            ✓ Final
          </span>
        ) : (
          <button
            type="button"
            onClick={handleFinalize}
            disabled={finalizing}
            className="flex-1 py-2.5 text-xs font-editorial tracking-[0.12em] uppercase bg-[#CAB170] text-black hover:bg-[#A8925A] transition disabled:opacity-50"
          >
            {finalizing ? "Memproses..." : "Finalisasi Gajian"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowShare(true)}
          className="flex-1 py-2.5 text-xs font-editorial tracking-[0.12em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] transition"
        >
          📤 Bagikan Ringkasan
        </button>
      </div>

      {showShare && (
        <ShareModal
          gajian={gajian}
          totals={totals}
          gajianId={gajianId}
          tambahan={tambahan}
          pettycash={pettycash}
          kasbonDeds={shareKasbonDeds}
          totalRequest={totalRequest}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
