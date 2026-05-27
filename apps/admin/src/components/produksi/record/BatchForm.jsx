/**
 * BatchForm.jsx — Form input/edit batch produksi.
 *
 * Props:
 *   initial  — batch object untuk mode edit (undefined = mode tambah baru)
 *   onSave   — async callback dipanggil setelah berhasil simpan
 *   onCancel — callback menutup form
 */
import { useState, useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { invalidateProducts } from "@deera/shared/hooks/useProducts";
import { logHistory } from "../../../hooks/useHistory";
import { toast } from "@deera/shared/lib/toast";
import { fmtRp, genBatchNo, buildKode, inputCls, labelCls } from "./recordUtils";

async function fetchTemplate(kode_produk) {
  if (!kode_produk) return null;
  const { data } = await supabase
    .from("hpp_template")
    .select("*")
    .eq("kode_produk", kode_produk)
    .single();
  return data ?? null;
}

function parseKode(kode) {
  const m = (kode ?? "").match(/^D-(\w+)-([A-Z]+)$/i);
  return m ? { angka: m[1], bahan: m[2].toUpperCase() } : { angka: "", bahan: "" };
}

function initVariants(sizes) {
  const aktifSet = new Set((sizes ?? []).map((s) => s.size));
  return SIZE_PRESETS.map((p) => ({ ...p, aktif: aktifSet.has(p.size) }));
}

function initWarnaList(sizes) {
  const warnas = new Set();
  for (const sz of sizes ?? []) {
    for (const w of sz.warna ?? []) {
      if (w.warna !== "_") warnas.add(w.warna);
    }
  }
  return [...warnas];
}

function initQtyMap(sizes) {
  const map = {};
  for (const sz of sizes ?? []) {
    map[sz.size] = {};
    for (const w of sz.warna ?? []) {
      map[sz.size][w.warna] = w.qty;
    }
  }
  return map;
}

export default function BatchForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial;
  const today = new Date().toISOString().split("T")[0];
  const { angka: initAngka, bahan: initBahanKode } = isEdit
    ? parseKode(initial.kode_produk)
    : { angka: "", bahan: "" };

  const [kodeAngka, setKodeAngka] = useState(isEdit ? initAngka : "");
  const [kodeBahan, setKodeBahan] = useState(isEdit ? initBahanKode : "");
  const [nama, setNama] = useState(initial?.nama_produk ?? "");
  const [bahan, setBahan] = useState("");
  const [variants, setVariants] = useState(
    isEdit ? initVariants(initial.sizes) : SIZE_PRESETS.map((s) => ({ ...s, aktif: false })),
  );
  const [warnaInput, setWarnaInput] = useState("");
  const [warnaList, setWarnaList] = useState(isEdit ? initWarnaList(initial.sizes) : []);
  const [qtyMap, setQtyMap] = useState(isEdit ? initQtyMap(initial.sizes) : {});
  const [batchNo, setBatchNo] = useState(initial?.batch_no ?? genBatchNo());
  const [tanggal, setTanggal] = useState(initial?.tanggal_produksi ?? today);
  const [catatan, setCatatan] = useState(initial?.catatan ?? "");
  const [template, setTemplate] = useState(null);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const kode = buildKode(kodeAngka, kodeBahan);
  const activeVariants = variants.filter((v) => v.aktif);
  const effectiveWarna = warnaList.length > 0 ? warnaList : ["_"];
  const totalKain = Object.values(qtyMap).reduce(
    (s, wMap) => s + Object.values(wMap).reduce((ss, q) => ss + (Number(q) || 0), 0),
    0,
  );

  // Auto-load HPP template saat kode lengkap (mode tambah)
  useEffect(() => {
    if (isEdit) return;
    if (!kode || !kode.match(/^D-\w+-[A-Z]+$/i)) {
      setTemplate(null);
      return;
    }
    setLoadingTpl(true);
    fetchTemplate(kode).then((t) => {
      setTemplate(t);
      setLoadingTpl(false);
    });
  }, [kode, isEdit]);

  function addWarna() {
    const w = warnaInput.trim().toUpperCase();
    if (w && !warnaList.includes(w)) setWarnaList((prev) => [...prev, w]);
    setWarnaInput("");
  }

  function removeWarna(w) {
    setWarnaList((prev) => prev.filter((x) => x !== w));
    setQtyMap((prev) => {
      const next = { ...prev };
      for (const size of Object.keys(next)) {
        if (next[size]) {
          const s = { ...next[size] };
          delete s[w];
          next[size] = s;
        }
      }
      return next;
    });
  }

  function setQty(size, warna, val) {
    setQtyMap((prev) => ({ ...prev, [size]: { ...(prev[size] ?? {}), [warna]: val } }));
  }

  function toggleVariant(idx) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, aktif: !v.aktif } : v)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!kode) return setErr("Kode produk belum lengkap.");
    if (!nama.trim()) return setErr("Nama produk wajib diisi.");
    if (activeVariants.length === 0) return setErr("Pilih minimal 1 ukuran.");
    if (totalKain === 0) return setErr("Isi qty produksi minimal 1.");
    setErr("");
    setSaving(true);
    try {
      // Build sizes dari qtyMap
      const sizes = [];
      for (const v of activeVariants) {
        const warnaItems = effectiveWarna
          .map((w) => ({ warna: w, qty: Number(qtyMap[v.size]?.[w]) || 0 }))
          .filter((x) => x.qty > 0);
        if (warnaItems.length > 0) sizes.push({ size: v.size, warna: warnaItems });
      }

      if (isEdit) {
        // ── Mode Edit: UPDATE batch ──────────────────────────
        const bahanDipakai =
          (initial.hpp_snapshot ?? template)?.bahan_items?.map((b) => ({
            nama_bahan: b.nama_bahan,
            kode_bahan: b.kode_bahan ?? "",
            satuan: b.satuan,
            jumlah: Math.round((Number(b.qty_per_baju) || 0) * totalKain * 100) / 100,
          })) ?? initial.bahan_dipakai ?? [];

        const { error: batchErr } = await supabase
          .from("produksi_batch")
          .update({
            batch_no: batchNo,
            nama_produk: nama.trim(),
            tanggal_produksi: tanggal,
            total_kain: totalKain,
            sizes,
            bahan_dipakai: bahanDipakai,
            catatan,
          })
          .eq("id", initial.id);
        if (batchErr) throw new Error(batchErr.message);

        // Upsert expected_stok
        const expectedRows = [];
        for (const sz of sizes) {
          for (const w of sz.warna ?? []) {
            expectedRows.push({ kode, size: sz.size, warna: w.warna, expected_qty: w.qty });
          }
        }
        if (expectedRows.length > 0) {
          await supabase
            .from("expected_stok")
            .upsert(expectedRows, { onConflict: "kode,size,warna" });
        }

        logHistory({
          action: "batch-produksi",
          category: "produksi",
          kode,
          nama: nama.trim(),
          snapshot: { batch_no: batchNo, tanggal, total_kain: totalKain, sizes, catatan, edit: true },
          before: {
            batch_no: initial.batch_no,
            tanggal: initial.tanggal_produksi,
            total_kain: initial.total_kain,
          },
        }).catch(() => {});
      } else {
        // ── Mode Tambah: INSERT batch + upsert produk ────────
        const bahanDipakai =
          template?.bahan_items?.map((b) => ({
            nama_bahan: b.nama_bahan,
            kode_bahan: b.kode_bahan ?? "",
            satuan: b.satuan,
            jumlah: Math.round((Number(b.qty_per_baju) || 0) * totalKain * 100) / 100,
          })) ?? [];

        // Upsert produk (harga = 0, diisi nanti via edit di Admin)
        const { error: prodErr } = await supabase.from("products").upsert(
          {
            kode,
            nama: nama.trim(),
            bahan: bahan.trim() || null,
            hpp: template?.total_hpp ?? 0,
            variants: activeVariants.map((v) => ({ size: v.size, harga: 0, ld: v.ld, pb: v.pb })),
            warna: warnaList.length > 0 ? warnaList : [],
          },
          { onConflict: "kode" },
        );
        if (prodErr) throw new Error(prodErr.message);

        // Insert batch
        const { error: batchErr } = await supabase.from("produksi_batch").insert({
          batch_no: batchNo,
          kode_produk: kode,
          nama_produk: nama.trim(),
          tanggal_produksi: tanggal,
          total_kain: totalKain,
          sizes,
          bahan_dipakai: bahanDipakai,
          hpp_snapshot: template,
          hpp_per_item: template?.total_hpp ?? 0,
          catatan,
        });
        if (batchErr) throw new Error(batchErr.message);

        // Upsert expected_stok
        const expectedRows = [];
        for (const sz of sizes) {
          for (const w of sz.warna ?? []) {
            expectedRows.push({ kode, size: sz.size, warna: w.warna, expected_qty: w.qty });
          }
        }
        if (expectedRows.length > 0) {
          const { error: expErr } = await supabase
            .from("expected_stok")
            .upsert(expectedRows, { onConflict: "kode,size,warna" });
          if (expErr) throw new Error(expErr.message);
        }

        invalidateProducts();
        logHistory({
          action: "batch-produksi",
          category: "produksi",
          kode,
          nama: nama.trim(),
          snapshot: { batch_no: batchNo, tanggal, total_kain: totalKain, sizes, catatan },
        }).catch(() => {});
      }

      await onSave();
    } catch (e) {
      setErr(e.message);
      toast.error("Gagal simpan batch: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">
      {/* ── Identitas Produk ── */}
      <section className="space-y-3">
        <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
          Identitas Produk
        </p>
        <div>
          <label className={labelCls}>Kode Produk</label>
          {isEdit ? (
            <div className="px-3 py-2.5 bg-skin-raised border border-skin-bdr-lt text-sm font-semibold text-[#CAB170]">
              {initial.kode_produk}
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-skin-text3 shrink-0">D -</span>
              <input
                type="text"
                placeholder="07"
                className={inputCls + " flex-1"}
                value={kodeAngka}
                onChange={(e) => setKodeAngka(e.target.value)}
              />
              <span className="text-sm text-skin-text3 shrink-0">-</span>
              <input
                type="text"
                placeholder="OSK"
                className={inputCls + " flex-1 uppercase"}
                value={kodeBahan}
                onChange={(e) => setKodeBahan(e.target.value.toUpperCase())}
              />
            </div>
          )}
          {!isEdit && kode && (
            <p className="text-xs text-skin-text3 mt-1">
              Kode: <span className="font-semibold text-[#CAB170]">{kode}</span>
              {loadingTpl && <span className="ml-2">Mengecek HPP...</span>}
              {!loadingTpl && template && (
                <span className="ml-2 text-emerald-600">
                  ✓ HPP ditemukan ({fmtRp(template.total_hpp)}/baju)
                </span>
              )}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Nama Produk</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Cth: Gamis Wolfis Polos"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>
        {!isEdit && (
          <div>
            <label className={labelCls}>Bahan / Fabric</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Cth: Wolfis Premium"
              value={bahan}
              onChange={(e) => setBahan(e.target.value)}
            />
          </div>
        )}
      </section>

      {/* ── Ukuran ── */}
      <section className="space-y-3">
        <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
          Ukuran{" "}
          <span className="normal-case text-skin-text3">
            {isEdit ? "(pilih ukuran yang diproduksi)" : "(harga jual diisi nanti di Edit Produk)"}
          </span>
        </p>
        {variants.map((v, idx) => (
          <label key={v.size} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[#CAB170]"
              checked={v.aktif}
              onChange={() => toggleVariant(idx)}
            />
            <span className="text-sm text-skin-text2">{v.size}</span>
            <span className="text-xs text-skin-text3">
              LD {v.ld} · PB {v.pb}
            </span>
          </label>
        ))}
      </section>

      {/* ── Warna ── */}
      <section className="space-y-3">
        <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
          Warna <span className="normal-case text-skin-text3">(kosong = produk tanpa warna)</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className={inputCls}
            placeholder="Cth: HITAM"
            value={warnaInput}
            onChange={(e) => setWarnaInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addWarna();
              }
            }}
          />
          <button
            type="button"
            onClick={addWarna}
            className="px-4 py-2.5 text-sm font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition shrink-0"
          >
            Tambah
          </button>
        </div>
        {warnaList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {warnaList.map((w) => (
              <span
                key={w}
                className="inline-flex items-center gap-1 px-2 py-1 bg-skin-raised border border-skin-bdr text-sm"
              >
                {w}
                <button
                  type="button"
                  onClick={() => removeWarna(w)}
                  className="text-red-400 hover:text-red-600 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Qty Produksi ── */}
      {activeVariants.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
            Qty Produksi{" "}
            <span className="normal-case text-skin-text3">
              — expected / buku potongan ({totalKain} total)
            </span>
          </p>
          {!isEdit && (
            <p className="text-xs text-skin-text3 italic">
              Ini adalah qty yang direncanakan. Stok aktual diinput melalui Stok Opname setelah barang
              jadi.
            </p>
          )}
          {activeVariants.map((v) => (
            <div key={v.size}>
              <p className="text-xs font-semibold text-skin-text2 mb-2">{v.size}</p>
              <div className="space-y-2">
                {effectiveWarna.map((w) => (
                  <div key={w} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-skin-text3">
                      {w === "_" ? "— (tanpa warna)" : w}
                    </span>
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      placeholder="0"
                      value={qtyMap[v.size]?.[w] ?? ""}
                      onChange={(e) => setQty(v.size, w, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── HPP dari template (read-only, hanya mode tambah) ── */}
      {!isEdit && template && (
        <div className="bg-skin-raised border border-skin-bdr p-3 space-y-2">
          <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
            HPP & Bahan (otomatis dari template)
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-skin-text3">HPP per baju</span>
            <span className="font-bold text-[#CAB170]">{fmtRp(template.total_hpp)}</span>
          </div>
          {template.bahan_items?.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-skin-bdr-lt">
              {template.bahan_items.map((b, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-skin-text3">{b.nama_bahan}</span>
                  <span className="text-skin-text2">
                    {totalKain > 0
                      ? `${((Number(b.qty_per_baju) || 0) * totalKain).toFixed(2)} ${b.satuan} total`
                      : `${b.qty_per_baju} ${b.satuan}/baju`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Info Batch ── */}
      <section className="space-y-3">
        <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
          Info Batch
        </p>
        <div>
          <label className={labelCls}>No. Batch</label>
          <input
            type="text"
            className={inputCls}
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Tanggal Produksi</label>
          <input
            type="date"
            className={inputCls}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Catatan</label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder="Opsional..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </section>

      {err && <p className="text-sm text-red-500 py-1">{err}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-skin-text2 transition"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving || totalKain === 0}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60"
        >
          {saving
            ? "Menyimpan..."
            : isEdit
              ? "Simpan Perubahan"
              : "Buat Produk & Batch"}
        </button>
      </div>
    </form>
  );
}
