import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useFinanceConfig } from "../../pengaturan/hooks";
import { useProdukList, useSaveFinishing } from "../hooks";
import {
  calcFinishingPerPcs,
  calcKancingQty,
  calcLubangQty,
  calcUpahFinishing,
  deriveKancingPerPcs,
  newProduk,
  summarizeFinishingItems,
} from "../utils";
import { Modal, ModalFooter } from "./Modal";
import TotalBar from "./TotalBar";

/**
 * deriveItem — dari satu baris state form (input mentah + `_o` snapshot
 * lama), hitung nilai final siap-pakai: jumlah, kancing_qty (total, = jumlah
 * × kancing per pcs), lubang_qty (total, cuma kalau toggle Pakai Lubang
 * nyala). Dipakai baik utk preview kalkulasi live maupun payload submit,
 * supaya dua-duanya selalu konsisten (permintaan Denny 2026-09).
 */
function deriveItem(it) {
  const jumlah = it.jumlah !== "" ? Number(it.jumlah) || 0 : Number(it._o?.jumlah) || 0;
  const kancingPerPcs =
    it.kancing_per_pcs !== "" ? Number(it.kancing_per_pcs) || 0 : deriveKancingPerPcs(it._o);
  const pakaiLubang = it.pakai_lubang ?? false;
  const lubangPerPcsRaw =
    it.lubang_per_pcs !== "" ? Number(it.lubang_per_pcs) || 0 : Number(it._o?.lubang_per_pcs) || 0;
  return {
    kode_produk: it.kode_produk || it._o?.kode_produk || "",
    nama_produk: it.nama_produk || it._o?.nama_produk || "",
    jumlah,
    kancing_per_pcs: kancingPerPcs,
    kancing_qty: calcKancingQty(jumlah, kancingPerPcs),
    pakai_lubang: pakaiLubang,
    lubang_per_pcs: pakaiLubang ? lubangPerPcsRaw : 0,
    lubang_qty: calcLubangQty(jumlah, lubangPerPcsRaw, pakaiLubang),
  };
}

/** FinishingForm.jsx — Form input/edit data Finishing (gaji_finishing), satu entri per periode. */
export default function FinishingForm({ gajianId, initial, onSave, onClose }) {
  const { config: cfg } = useFinanceConfig();
  const { produkList } = useProdukList();
  const saveFinishing = useSaveFinishing();

  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map((it) => ({
          _o: it,
          kode_produk: it.kode_produk ?? "",
          nama_produk: it.nama_produk ?? "",
          jumlah: "",
          kancing_per_pcs: "",
          pakai_lubang: it.pakai_lubang ?? false,
          lubang_per_pcs: "",
        }))
      : [newProduk()],
  );
  const [manualJumlah, setManualJumlah] = useState("");
  const [manualCatatan, setManualCatatan] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const setItem = (i, k, v) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const perPcs = calcFinishingPerPcs(cfg);
  const derivedItems = items.map(deriveItem);
  const sistemFinishing = calcUpahFinishing(derivedItems, cfg);
  const total = sistemFinishing + (Number(manualJumlah) || 0);
  const breakdown = summarizeFinishingItems(derivedItems, cfg);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        items: items
          .filter((it) => it.jumlah !== "" || it._o?.jumlah)
          .map((it) => deriveItem(it)),
        total_upah: total,
      };
      const gajianFinishingId = await saveFinishing({ payload, editingId: initial?.id });
      toast.success("Data Finishing disimpan.");
      // Kirim items yg baru disimpan + id record ke atas (TabFinishing.jsx)
      // supaya bisa langsung buka FinishingStockModal rekonsiliasi stok
      // (permintaan Denny 2026-09) tanpa admin harus buka lagi form ini.
      onSave({ items: payload.items, gajianFinishingId });
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? "Edit Finishing" : "Input Finishing"} onClose={onClose} maxWidth="md:max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          <div className="bg-skin-raised p-3 grid grid-cols-2 gap-y-1 text-xs font-editorial text-skin-text3">
            <span>Gosok</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_gosok)}</span>
            <span>Lipat</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_lipat)}</span>
            <span>Buang Benang</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_buang_benang)}</span>
            <span>Pasang Pin</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_pasang_pin)}</span>
            <span>Hangtag</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_hangtag)}</span>
            <span>Kode + Seri</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_seri)}</span>
            <span className="font-semibold text-skin-text border-t border-skin-bdr-lt mt-1 pt-1">Total / pcs</span>
            <span className="font-numeric font-semibold text-skin-text border-t border-skin-bdr-lt mt-1 pt-1 text-right">{fmtRp(perPcs)}</span>
            <span>Harga Kancing</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_kancing)}</span>
            <span>Harga Lubang</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_lubang)}</span>
          </div>

          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 md:items-start">
            {items.map((it, i) => {
              const d = derivedItems[i];
              const subtotal = d.jumlah * perPcs + d.kancing_qty * cfg.tarif_kancing + d.lubang_qty * (cfg.tarif_lubang || 0);
              return (
                <div key={i} className="bg-skin-raised p-3 space-y-2">
                  <div className="space-y-1">
                    <label className={labelCls}>Produk</label>
                    {/* Permintaan Denny 2026-09: "pilih kode bisa search
                        juga" — <input list>+<datalist> native, sama seperti
                        field Kode di JahitForm.jsx (lihat komentar di sana). */}
                    <input
                      type="text"
                      list={`produk-datalist-${i}`}
                      data-testid={`produk-input-${i}`}
                      value={it.kode_produk}
                      onChange={(e) => {
                        const kode = e.target.value;
                        const p = produkList.find((x) => x.kode === kode);
                        setItem(i, "kode_produk", kode);
                        setItem(i, "nama_produk", p?.nama ?? "");
                      }}
                      placeholder={
                        it._o?.kode_produk || it._o?.nama_produk
                          ? `↩ ${it._o?.kode_produk ?? it._o?.nama_produk}`
                          : "— Pilih/cari produk —"
                      }
                      className={inputCls}
                      autoComplete="off"
                    />
                    <datalist id={`produk-datalist-${i}`}>
                      {produkList.map((p) => (
                        <option key={p.kode} value={p.kode} label={`${p.kode} — ${p.nama}`} />
                      ))}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={labelCls}>Jumlah (pcs)</label>
                      <input type="number" min="0" value={it.jumlah} onChange={(e) => setItem(i, "jumlah", e.target.value)} placeholder={it._o?.jumlah != null ? String(it._o.jumlah) : "0"} className={inputCls} />
                      {d.jumlah > 0 && <p className="font-numeric text-[11px] text-skin-text4">= {fmtRp(d.jumlah * perPcs)}</p>}
                    </div>
                    <div className="space-y-1">
                      {/* Permintaan Denny 2026-09: diisi PER PCS (bukan total
                          manual lagi) — total kancing dihitung otomatis
                          (jumlah × kancing/pcs), tidak perlu kalkulasi manual. */}
                      <label className={labelCls}>Kancing / pcs</label>
                      <input
                        type="number"
                        min="0"
                        data-testid={`kancing-per-pcs-${i}`}
                        value={it.kancing_per_pcs}
                        onChange={(e) => setItem(i, "kancing_per_pcs", e.target.value)}
                        placeholder={String(deriveKancingPerPcs(it._o) || 0)}
                        className={inputCls}
                      />
                      {d.kancing_qty > 0 && (
                        <p className="font-numeric text-[11px] text-skin-text4">
                          = {d.jumlah} × {d.kancing_per_pcs} = {d.kancing_qty} kancing → {fmtRp(d.kancing_qty * cfg.tarif_kancing)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#CAB170]"
                        checked={it.pakai_lubang}
                        onChange={(e) => setItem(i, "pakai_lubang", e.target.checked)}
                      />
                      <span className={labelCls + " mb-0"}>Pakai Lubang?</span>
                    </label>
                    {it.pakai_lubang && (
                      <div className="space-y-1">
                        <label className={labelCls}>Lubang / pcs</label>
                        <input
                          type="number"
                          min="0"
                          data-testid={`lubang-per-pcs-${i}`}
                          value={it.lubang_per_pcs}
                          onChange={(e) => setItem(i, "lubang_per_pcs", e.target.value)}
                          placeholder={it._o?.lubang_per_pcs != null ? String(it._o.lubang_per_pcs) : "0"}
                          className={inputCls}
                        />
                        {d.lubang_qty > 0 && (
                          <p className="font-numeric text-[11px] text-skin-text4">
                            = {d.jumlah} × {d.lubang_per_pcs} = {d.lubang_qty} lubang → {fmtRp(d.lubang_qty * (cfg.tarif_lubang || 0))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {subtotal > 0 && (
                    <p className="font-editorial text-xs text-skin-text3 text-right border-t border-skin-bdr-lt pt-1.5">
                      Subtotal: <span className="font-numeric">{fmtRp(subtotal)}</span>
                    </p>
                  )}
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="text-xs font-editorial text-red-400">
                      − Hapus produk
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setItems((p) => [...p, newProduk()])}
            className="font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
          >
            + Tambah Produk
          </button>

          <div className="border-t border-skin-bdr-lt pt-3">
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="font-editorial text-[10px] tracking-[0.2em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
            >
              {showManual ? "− Batalkan Tambahan Manual" : "+ Tambahan Manual"}
            </button>
            {showManual && (
              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <label className={labelCls}>Nominal (Rp)</label>
                  <input type="number" min="0" value={manualJumlah} onChange={(e) => setManualJumlah(e.target.value)} placeholder="0" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Keterangan</label>
                  <input type="text" value={manualCatatan} onChange={(e) => setManualCatatan(e.target.value)} placeholder="Alasan tambahan manual" className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* Breakdown Total Finishing / Kancing / Lubang (permintaan Denny
              2026-09) — dipisah dari TotalBar "Total Upah" (yang sudah
              gabungan + tambahan manual) supaya kelihatan porsi tiap
              komponen. */}
          <div className="bg-skin-raised p-3 grid grid-cols-2 gap-y-1 text-xs font-editorial text-skin-text3">
            <span>Total Finishing</span>
            <span className="font-numeric text-right">{fmtRp(breakdown.totalFinishingBiaya)}</span>
            <span>Total Kancing ({breakdown.totalKancingQty} buah)</span>
            <span className="font-numeric text-right">{fmtRp(breakdown.totalKancingBiaya)}</span>
            <span>Total Lubang ({breakdown.totalLubangQty} buah)</span>
            <span className="font-numeric text-right">{fmtRp(breakdown.totalLubangBiaya)}</span>
          </div>

          <TotalBar label="Total Upah" value={total} />
        </div>
        <ModalFooter onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}
