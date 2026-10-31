import { toast } from "@deera/shared/features/toast/hooks";
import { useState } from "react";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useRingkasanValues, useSaveGajianRequest } from "../hooks";
import { BELI_GAS_AMOUNT, buildKasbonDeductionsPayload, cleanTambahan } from "../utils";
import RingkasanTotals from "./RingkasanTotals";

export default function TabTambahan({ gajianId, gajian }) {
  const v = useRingkasanValues(gajianId, gajian);
  const saveGajianRequest = useSaveGajianRequest();
  const [saving, setSaving] = useState(false);
  const {
    isFinal,
    kasbon,
    pettycashEnabled,
    setPettycashEnabled,
    pettycashTerpakai,
    loadingPettycashTerpakai,
    beliGasEnabled,
    setBeliGasEnabled,
    atkInput,
    setAtkInput,
    atkPrevJumlah,
    tambahan,
    setTambahan,
    kasbonDeds,
    setKasbonDeds,
    fullTambahan,
    pettycash,
    totalRequest,
    hasDraft,
    clearDraft,
  } = v;

  const setTamb = (i, k, val) =>
    setTambahan((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: val } : it)));

  async function handleSaveRequest() {
    setSaving(true);
    try {
      await saveGajianRequest(gajianId, {
        pettycash: Number(pettycash) || 0,
        tambahan: cleanTambahan(fullTambahan),
        kasbonDeductions: buildKasbonDeductionsPayload(kasbon, kasbonDeds),
        totalRequest,
      });
      clearDraft();
      toast.success("Draft disimpan.");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isFinal) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-skin-text3">
          Gajian sudah final — tambahan tidak bisa diubah lagi.
        </p>
        <RingkasanTotals gajian={gajian} v={v} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px] lg:grid-cols-2 items-start">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={labelCls}>Pettycash</label>
            <div className="flex items-center gap-2">
              <span className="font-editorial text-xs text-skin-text3">Tambahkan?</span>
              <button
                type="button"
                role="switch"
                aria-checked={pettycashEnabled}
                onClick={() => setPettycashEnabled((p) => !p)}
                className={`w-10 h-6 rounded-full flex items-center transition-colors ${pettycashEnabled ? "bg-skin-accent" : "bg-skin-bdr"}`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${pettycashEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          </div>
          {pettycashEnabled && (
            <div className="flex items-center justify-between bg-skin-raised border border-skin-bdr px-3 py-2.5">
              <span className="font-editorial text-xs text-skin-text3">
                Uang Denny &amp; Wulan Terpakai
              </span>
              <span className="font-numeric text-sm font-semibold text-skin-accent-text">
                {loadingPettycashTerpakai ? "..." : fmtRp(pettycashTerpakai)}
              </span>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between bg-skin-raised border border-skin-bdr px-3 py-2.5 cursor-pointer">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={beliGasEnabled}
              onChange={(e) => setBeliGasEnabled(e.target.checked)}
              className="w-4 h-4 accent-skin-accent"
            />
            <span className={labelCls + " mb-0"}>Beli Gas</span>
          </span>
          <span className="font-numeric text-sm font-semibold text-skin-accent-text">
            {fmtRp(BELI_GAS_AMOUNT)}
          </span>
        </label>

        <div className="space-y-1">
          <label htmlFor="persiapan-atk-input" className={labelCls}>
            Persiapan ATK
          </label>
          <input
            id="persiapan-atk-input"
            type="number"
            min="0"
            value={atkInput}
            onChange={(e) => setAtkInput(e.target.value)}
            placeholder={String(atkPrevJumlah || "0")}
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}>Tambahan Lain</label>
            <button
              type="button"
              onClick={() => setTambahan((p) => [...p, { label: "", jumlah: "" }])}
              className="font-editorial text-xs text-skin-accent-text hover:text-skin-accent-text transition"
            >
              + Tambah
            </button>
          </div>
          <div className="space-y-2">
            {tambahan.map((it, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={it.label}
                  onChange={(e) => setTamb(i, "label", e.target.value)}
                  placeholder="Keterangan"
                  className={inputCls}
                />
                <input
                  type="number"
                  value={it.jumlah}
                  onChange={(e) => setTamb(i, "jumlah", e.target.value)}
                  placeholder="Rp"
                  className={inputCls + " w-32"}
                />
                <button
                  type="button"
                  onClick={() => setTambahan((p) => p.filter((_, idx) => idx !== i))}
                  className="text-red-400 text-sm px-1"
                >
                  ×
                </button>
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
                    <p className="font-editorial text-sm text-skin-text">
                      {kb.karyawan?.nama ?? "—"}
                    </p>
                    <p className="font-editorial text-[11px] text-skin-text4">
                      Sisa: <span className="font-numeric">{fmtRp(kb.sisa)}</span>
                    </p>
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

        {hasDraft && (
          <p data-testid="draft-belum-disimpan" className="text-[11px] text-amber-600">
            Ada perubahan yang belum disimpan — isian ditahan di perangkat ini sampai Anda menekan
            Simpan.
          </p>
        )}
        <button
          type="button"
          onClick={handleSaveRequest}
          disabled={saving}
          className="w-full py-2.5 text-xs font-editorial tracking-[0.12em] uppercase border border-skin-accent text-skin-accent-text hover:bg-skin-gold transition disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan sebagai Draft"}
        </button>
      </div>

      <div className="lg:col-span-2 xl:col-span-1 xl:sticky xl:top-20">
        <RingkasanTotals gajian={gajian} v={v} />
      </div>
    </div>
  );
}
