import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useProdukList, useSaveJahit, useUpahJahitMap } from "../hooks";
import { JAHIT_MARKS, newKartu, newPermak } from "../utils";
import { Modal, ModalFooter } from "./Modal";
import KaryawanSelect from "./KaryawanSelect";
import RangeSlider from "./RangeSlider";
import TotalBar from "./TotalBar";

/** JahitForm.jsx — Form tambah/edit entri Tim Jahit (gaji_jahit): kartu + permak. */
export default function JahitForm({ gajianId, initial, karyawanList, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const { produkList } = useProdukList();
  // Upah tukang jahit per kode, dari batch produksi terbaru (apps/admin) —
  // auto-isi "Upah / pcs" saat kode dipilih, supaya finance tidak perlu
  // input ulang. Nilai tetap bisa diubah manual sesudahnya (konfirmasi
  // Denny) via RangeSlider di bawah.
  const { upahJahitByKode } = useUpahJahitMap();
  const saveJahit = useSaveJahit();

  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [kartus, setKartus] = useState(
    initial?.kartu_items?.length
      ? initial.kartu_items.map((it) => ({ _o: it, kode: "", warna: "", ukuran: "", jumlah: "", upah: it.upah ?? 20000 }))
      : [newKartu()],
  );
  const [permaks, setPermaks] = useState(
    initial?.permak_items?.length
      ? initial.permak_items.map((it) => ({ _o: it, keterangan: "", jumlah: "", upah: "" }))
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [manualJumlah, setManualJumlah] = useState("");
  const [manualCatatan, setManualCatatan] = useState("");
  const [showManual, setShowManual] = useState(false);

  const setKartu = (i, k, v) =>
    setKartus((p) =>
      p.map((it, idx) => {
        if (idx !== i) return it;
        const next = { ...it, [k]: v };
        // Reset ukuran & warna saat kode berganti — pilihan sebelumnya mungkin tidak valid lagi
        if (k === "kode") {
          next.ukuran = "";
          next.warna = "";
          // Auto-isi upah dari batch produksi terbaru utk kode ini (kalau
          // ada) — tetap bisa diedit manual lewat RangeSlider di bawah.
          const looked = upahJahitByKode[v];
          if (looked > 0) next.upah = looked;
        }
        return next;
      }),
    );
  const setPermak = (i, k, v) => setPermaks((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const rKartuNum = (it, k) => (it[k] !== "" ? Number(it[k]) : Number(it._o?.[k]) || 0);
  const rPermakNum = (it, k) => (it[k] !== "" ? Number(it[k]) : Number(it._o?.[k]) || 0);

  const totalKartu = kartus.reduce((s, it) => s + rKartuNum(it, "jumlah") * (Number(it.upah) || 0), 0);
  const totalPermak = permaks.reduce((s, it) => s + rPermakNum(it, "jumlah") * rPermakNum(it, "upah"), 0);
  const total = totalKartu + totalPermak + (Number(manualJumlah) || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        karyawan_id: karyawanId,
        kartu_items: kartus
          .filter((it) => it.jumlah !== "" || it._o?.jumlah)
          .map((it) => ({
            kode: it.kode !== "" ? it.kode : (it._o?.kode ?? ""),
            warna: it.warna !== "" ? it.warna : (it._o?.warna ?? ""),
            ukuran: it.ukuran !== "" ? it.ukuran : (it._o?.ukuran ?? ""),
            jumlah: rKartuNum(it, "jumlah"),
            upah: it.upah,
          })),
        permak_items: permaks
          .filter((it) => it.jumlah !== "" || it._o?.jumlah)
          .map((it) => ({
            keterangan: it.keterangan !== "" ? it.keterangan : (it._o?.keterangan ?? ""),
            jumlah: rPermakNum(it, "jumlah"),
            upah: rPermakNum(it, "upah"),
          })),
        total_upah: totalKartu + totalPermak + (Number(manualJumlah) || 0),
      };
      await saveJahit({ payload, editingId: initial?.id });
      onSave();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Tim Jahit" : "Tambah Tim Jahit"} onClose={onClose} maxWidth="md:max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <KaryawanSelect value={karyawanId} onChange={setKaryawanId} list={karyawanList} timFilter="jahit" />

          {/* Kartu items */}
          <div>
            <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3 mb-3">Kartu Jahit</p>
            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 md:items-start">
              {kartus.map((it, i) => {
                const produk = produkList.find((p) => p.kode === (it.kode || it._o?.kode));
                const ukuranOpts = (produk?.variants ?? []).map((v) => v.size).filter(Boolean);
                const warnaOpts = (produk?.warna ?? []).filter(Boolean);
                return (
                  <div key={i} className="bg-skin-raised p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls}>Kode</label>
                        <select value={it.kode} onChange={(e) => setKartu(i, "kode", e.target.value)} className={inputCls}>
                          <option value="">{it._o?.kode ? `↩ ${it._o.kode}` : "— Pilih kode —"}</option>
                          {produkList.map((p) => (
                            <option key={p.kode} value={p.kode}>
                              {p.kode}
                              {p.nama ? ` — ${p.nama}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>Ukuran</label>
                        <select value={it.ukuran} onChange={(e) => setKartu(i, "ukuran", e.target.value)} className={inputCls} disabled={!produk}>
                          <option value="">{it._o?.ukuran ? `↩ ${it._o.ukuran}` : "— Pilih ukuran —"}</option>
                          {ukuranOpts.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls}>Warna</label>
                        <select value={it.warna} onChange={(e) => setKartu(i, "warna", e.target.value)} className={inputCls} disabled={!produk || warnaOpts.length === 0}>
                          <option value="">{it._o?.warna ? `↩ ${it._o.warna}` : warnaOpts.length ? "— Pilih warna —" : "— Tanpa warna —"}</option>
                          {warnaOpts.map((w) => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>Jumlah (pcs)</label>
                        <input type="number" min="0" value={it.jumlah} onChange={(e) => setKartu(i, "jumlah", e.target.value)} placeholder={it._o?.jumlah != null ? String(it._o.jumlah) : "0"} className={inputCls} />
                      </div>
                    </div>
                    <RangeSlider
                      label="Upah / pcs"
                      value={Number(it.upah) || 20000}
                      min={20000}
                      max={35000}
                      step={1000}
                      marks={JAHIT_MARKS}
                      onChange={(v) => setKartu(i, "upah", v)}
                    />
                    {rKartuNum(it, "jumlah") > 0 && (
                      <p className="font-editorial text-xs text-skin-text3 text-right">
                        Subtotal: <span className="font-numeric">{fmtRp(rKartuNum(it, "jumlah") * (Number(it.upah) || 0))}</span>
                      </p>
                    )}
                    {kartus.length > 1 && (
                      <button type="button" onClick={() => setKartus((p) => p.filter((_, idx) => idx !== i))} className="text-xs font-editorial text-red-400">
                        − Hapus kartu
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setKartus((p) => [...p, newKartu()])}
              className="mt-2 font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
            >
              + Tambah kartu
            </button>
          </div>

          {/* Permak */}
          <div>
            <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3 mb-3">Permak</p>
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 md:items-start">
              {permaks.map((it, i) => (
                <div key={i} className="bg-skin-raised p-3 space-y-2">
                  <div className="space-y-1">
                    <label className={labelCls}>Keterangan</label>
                    <input type="text" value={it.keterangan} onChange={(e) => setPermak(i, "keterangan", e.target.value)} placeholder={it._o?.keterangan || "Deskripsi permak"} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={labelCls}>Jumlah</label>
                      <input type="number" min="0" value={it.jumlah} onChange={(e) => setPermak(i, "jumlah", e.target.value)} placeholder={it._o?.jumlah != null ? String(it._o.jumlah) : "0"} className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Upah / item</label>
                      <input type="number" min="0" value={it.upah} onChange={(e) => setPermak(i, "upah", e.target.value)} placeholder={it._o?.upah != null ? String(it._o.upah) : "0"} className={inputCls} />
                    </div>
                  </div>
                  <button type="button" onClick={() => setPermaks((p) => p.filter((_, idx) => idx !== i))} className="text-xs font-editorial text-red-400">
                    − Hapus
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPermaks((p) => [...p, newPermak()])}
              className="mt-2 font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
            >
              + Tambah permak
            </button>
          </div>

          {/* Tambahan Manual */}
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
