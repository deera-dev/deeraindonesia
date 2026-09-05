import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useFinanceConfig } from "../../pengaturan/hooks";
import { useProdukList, useSaveFinishing } from "../hooks";
import { calcFinishingPerPcs, calcUpahFinishing, newProduk } from "../utils";
import { Modal, ModalFooter } from "./Modal";
import TotalBar from "./TotalBar";

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
          kancing_qty: "",
        }))
      : [newProduk()],
  );
  const [manualJumlah, setManualJumlah] = useState("");
  const [manualCatatan, setManualCatatan] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const setItem = (i, k, v) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const rItemNum = (it, k) => (it[k] !== "" ? Number(it[k]) : Number(it._o?.[k]) || 0);

  const perPcs = calcFinishingPerPcs(cfg);
  const sistemFinishing = calcUpahFinishing(
    items.map((it) => ({ jumlah: rItemNum(it, "jumlah"), kancing_qty: rItemNum(it, "kancing_qty") })),
    cfg,
  );
  const total = sistemFinishing + (Number(manualJumlah) || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        items: items
          .filter((it) => it.jumlah !== "" || it._o?.jumlah)
          .map((it) => ({
            kode_produk: it.kode_produk || it._o?.kode_produk || "",
            nama_produk: it.nama_produk || it._o?.nama_produk || "",
            jumlah: rItemNum(it, "jumlah"),
            kancing_qty: rItemNum(it, "kancing_qty"),
          })),
        total_upah: total,
      };
      await saveFinishing({ payload, editingId: initial?.id });
      toast.success("Data Finishing disimpan.");
      onSave();
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
            <span>Kancing / pcs</span><span className="font-numeric text-right">{fmtRp(cfg.tarif_kancing)}</span>
          </div>

          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 md:items-start">
            {items.map((it, i) => {
              const jml = rItemNum(it, "jumlah");
              const kancing = rItemNum(it, "kancing_qty");
              const subtotal = jml * perPcs + kancing * cfg.tarif_kancing;
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
                      {jml > 0 && <p className="font-numeric text-[11px] text-skin-text4">= {fmtRp(jml * perPcs)}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Kancing (qty)</label>
                      <input type="number" min="0" value={it.kancing_qty} onChange={(e) => setItem(i, "kancing_qty", e.target.value)} placeholder={it._o?.kancing_qty != null ? String(it._o.kancing_qty) : "0"} className={inputCls} />
                      {kancing > 0 && <p className="font-numeric text-[11px] text-skin-text4">= {fmtRp(kancing * cfg.tarif_kancing)}</p>}
                    </div>
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
          <TotalBar label="Total Upah" value={total} />
        </div>
        <ModalFooter onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}
