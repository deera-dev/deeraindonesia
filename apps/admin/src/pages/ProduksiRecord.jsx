/**
 * ProduksiRecord.jsx
 * Catatan batch produksi sekaligus pembuatan produk baru.
 *
 * Flow:
 * 1. Buat produk baru (pilih ukuran, tanpa harga jual dulu)
 * 2. Input qty produksi per size×warna → disimpan ke expected_stok (buku potongan)
 * 3. HPP otomatis dari hpp_template jika sudah dibuat
 * 4. Harga jual & foto diisi nanti di halaman Admin → Edit Produk
 * 5. Stok aktual diisi nanti di Stok Opname
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { invalidateProducts } from "@deera/shared/hooks/useProducts";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";

const ALL_SIZES  = SIZE_PRESETS.map((s) => s.size);

function fmtRp(n)  { return "Rp " + (Number(n) || 0).toLocaleString("id-ID"); }
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function genBatchNo() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PROD-${d}-${Math.floor(Math.random() * 900 + 100)}`;
}
function buildKode(angka, bahan) {
  const a = String(angka ?? "").trim();
  const b = String(bahan ?? "").trim().toUpperCase();
  if (!a && !b) return "";
  return `D-${a}-${b}`;
}

// ── Load hpp_template untuk produk ──────────────────────────────────────────
async function fetchTemplate(kode_produk) {
  if (!kode_produk) return null;
  const { data } = await supabase
    .from("hpp_template").select("*").eq("kode_produk", kode_produk).single();
  return data ?? null;
}

const inputCls = "w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

// ── Form: Tambah Batch (= Produk Baru) ────────────────────────────────────────
function BatchForm({ onSave, onCancel }) {
  const today = new Date().toISOString().split("T")[0];

  // Identitas produk
  const [kodeAngka, setKodeAngka] = useState("");
  const [kodeBahan, setKodeBahan] = useState("");
  const [nama,      setNama]      = useState("");
  const [bahan,     setBahan]     = useState("");

  // Ukuran (tanpa harga — diisi nanti di edit produk)
  const [variants, setVariants] = useState(
    SIZE_PRESETS.map((s) => ({ ...s, aktif: false }))
  );

  // Warna
  const [warnaInput, setWarnaInput] = useState("");
  const [warnaList,  setWarnaList]  = useState([]);

  // Qty per size×warna (expected / buku potongan)
  const [qtyMap, setQtyMap] = useState({});

  // Info batch
  const [batchNo,  setBatchNo]  = useState(genBatchNo());
  const [tanggal,  setTanggal]  = useState(today);
  const [catatan,  setCatatan]  = useState("");

  // HPP dari template
  const [template,   setTemplate]   = useState(null);
  const [loadingTpl, setLoadingTpl] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const kode = buildKode(kodeAngka, kodeBahan);

  // Auto-load template saat kode lengkap
  useEffect(() => {
    if (!kode || !kode.match(/^D-\d+-[A-Z]+$/)) { setTemplate(null); return; }
    setLoadingTpl(true);
    fetchTemplate(kode).then((t) => {
      setTemplate(t);
      setLoadingTpl(false);
    });
  }, [kode]);

  const activeVariants = variants.filter((v) => v.aktif);
  const effectiveWarna = warnaList.length > 0 ? warnaList : ["_"];

  // Total qty produksi
  const totalKain = Object.values(qtyMap).reduce((s, wMap) =>
    s + Object.values(wMap).reduce((ss, q) => ss + (Number(q) || 0), 0), 0);

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
        if (next[size]) { const s = { ...next[size] }; delete s[w]; next[size] = s; }
      }
      return next;
    });
  }

  function setQty(size, warna, val) {
    setQtyMap((prev) => ({
      ...prev,
      [size]: { ...(prev[size] ?? {}), [warna]: val },
    }));
  }

  function toggleVariant(idx) {
    setVariants((prev) => prev.map((v, i) => i === idx ? { ...v, aktif: !v.aktif } : v));
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
        const warnaItems = effectiveWarna.map((w) => ({
          warna: w,
          qty: Number(qtyMap[v.size]?.[w]) || 0,
        })).filter((x) => x.qty > 0);
        if (warnaItems.length > 0) sizes.push({ size: v.size, warna: warnaItems });
      }

      // Bahan dipakai dari template (kalkulasi total)
      const bahanDipakai = template?.bahan_items?.map((b) => ({
        nama_bahan: b.nama_bahan,
        kode_bahan: b.kode_bahan ?? "",
        satuan:     b.satuan,
        jumlah:     Math.round((Number(b.qty_per_baju) || 0) * totalKain * 100) / 100,
      })) ?? [];

      // Upsert produk (harga = 0, diisi nanti via edit di halaman Admin)
      const productPayload = {
        kode,
        nama:  nama.trim(),
        bahan: bahan.trim() || null,
        hpp:   template?.total_hpp ?? 0,
        variants: activeVariants.map((v) => ({
          size:  v.size,
          harga: 0,
          ld:    v.ld,
          pb:    v.pb,
        })),
        warna: warnaList.length > 0 ? warnaList : [],
      };
      const { error: prodErr } = await supabase
        .from("products").upsert(productPayload, { onConflict: "kode" });
      if (prodErr) throw new Error(prodErr.message);

      // Insert batch
      const batchPayload = {
        batch_no:         batchNo,
        kode_produk:      kode,
        nama_produk:      nama.trim(),
        tanggal_produksi: tanggal,
        total_kain:       totalKain,
        sizes,
        bahan_dipakai:    bahanDipakai,
        hpp_snapshot:     template,
        hpp_per_item:     template?.total_hpp ?? 0,
        catatan,
      };
      const { error: batchErr } = await supabase.from("produksi_batch").insert(batchPayload);
      if (batchErr) throw new Error(batchErr.message);

      // Upsert expected_stok (buku potongan) — qty ini adalah expected, bukan actual stok
      const expectedRows = [];
      for (const sz of sizes) {
        for (const w of (sz.warna ?? [])) {
          expectedRows.push({
            kode,
            size:         sz.size,
            warna:        w.warna,
            expected_qty: w.qty,
          });
        }
      }
      if (expectedRows.length > 0) {
        const { error: expErr } = await supabase
          .from("expected_stok")
          .upsert(expectedRows, { onConflict: "kode,size,warna" });
        if (expErr) throw new Error(expErr.message);
      }

      invalidateProducts();
      await onSave();
    } catch (e) {
      setErr(e.message);
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
          <div className="flex gap-2 items-center">
            <span className="text-sm text-skin-text3 shrink-0">D -</span>
            <input type="text" placeholder="07" className={inputCls + " flex-1"}
              value={kodeAngka} onChange={(e) => setKodeAngka(e.target.value)} />
            <span className="text-sm text-skin-text3 shrink-0">-</span>
            <input type="text" placeholder="OSK" className={inputCls + " flex-1 uppercase"}
              value={kodeBahan} onChange={(e) => setKodeBahan(e.target.value.toUpperCase())} />
          </div>
          {kode && (
            <p className="text-xs text-skin-text3 mt-1">
              Kode: <span className="font-semibold text-[#CAB170]">{kode}</span>
              {loadingTpl && <span className="ml-2">Mengecek HPP...</span>}
              {!loadingTpl && template && (
                <span className="ml-2 text-emerald-600">✓ HPP ditemukan ({fmtRp(template.total_hpp)}/baju)</span>
              )}
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>Nama Produk</label>
          <input type="text" className={inputCls} placeholder="Cth: Gamis Wolfis Polos"
            value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>Bahan / Fabric</label>
          <input type="text" className={inputCls} placeholder="Cth: Wolfis Premium"
            value={bahan} onChange={(e) => setBahan(e.target.value)} />
        </div>
      </section>

      {/* ── Ukuran (tanpa harga — diisi nanti di edit produk) ── */}
      <section className="space-y-3">
        <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
          Ukuran <span className="normal-case text-skin-text3">(harga jual diisi nanti di Edit Produk)</span>
        </p>
        {variants.map((v, idx) => (
          <label key={v.size} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[#CAB170]"
              checked={v.aktif} onChange={() => toggleVariant(idx)} />
            <span className="text-sm text-skin-text2">{v.size}</span>
            <span className="text-xs text-skin-text3">LD {v.ld} · PB {v.pb}</span>
          </label>
        ))}
      </section>

      {/* ── Warna ── */}
      <section className="space-y-3">
        <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
          Warna <span className="normal-case text-skin-text3">(kosong = produk tanpa warna)</span>
        </p>
        <div className="flex gap-2">
          <input type="text" className={inputCls} placeholder="Cth: HITAM"
            value={warnaInput}
            onChange={(e) => setWarnaInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWarna(); } }} />
          <button type="button" onClick={addWarna}
            className="px-4 py-2.5 text-sm font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition shrink-0">
            Tambah
          </button>
        </div>
        {warnaList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {warnaList.map((w) => (
              <span key={w} className="inline-flex items-center gap-1 px-2 py-1 bg-skin-raised border border-skin-bdr text-sm">
                {w}
                <button type="button" onClick={() => removeWarna(w)} className="text-red-400 hover:text-red-600 leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Qty Produksi (= buku potongan / expected) ── */}
      {activeVariants.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
            Qty Produksi <span className="normal-case text-skin-text3">— expected / buku potongan ({totalKain} total)</span>
          </p>
          <p className="text-xs text-skin-text3 italic">
            Ini adalah qty yang direncanakan. Stok aktual diinput melalui Stok Opname setelah barang jadi.
          </p>
          {activeVariants.map((v) => (
            <div key={v.size}>
              <p className="text-xs font-semibold text-skin-text2 mb-2">{v.size}</p>
              <div className="space-y-2">
                {effectiveWarna.map((w) => (
                  <div key={w} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-skin-text3">{w === "_" ? "— (tanpa warna)" : w}</span>
                    <input type="number" min="0" className={inputCls} placeholder="0"
                      value={qtyMap[v.size]?.[w] ?? ""}
                      onChange={(e) => setQty(v.size, w, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── HPP & Bahan (dari template, read-only) ── */}
      {template && (
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
                      ? `${((Number(b.qty_per_baju)||0) * totalKain).toFixed(2)} ${b.satuan} total`
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
          <input type="text" className={inputCls} value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Tanggal Produksi</label>
          <input type="date" className={inputCls} value={tanggal}
            onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Catatan</label>
          <textarea rows={2} className={inputCls} placeholder="Opsional..."
            value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>
      </section>

      {err && <p className="text-sm text-red-500 py-1">{err}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-skin-text2 transition">
          Batal
        </button>
        <button type="submit" disabled={saving || totalKain === 0}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60">
          {saving ? "Menyimpan..." : "Buat Produk & Batch"}
        </button>
      </div>
    </form>
  );
}

// ── Kartu batch ────────────────────────────────────────────────────────────────
function BatchCard({ batch, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-skin-card border border-skin-bdr">
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-skin-text">{batch.kode_produk}</p>
            <p className="text-xs text-skin-text3 truncate">{batch.nama_produk}</p>
          </div>
          <div className="shrink-0 text-right">
            {batch.hpp_per_item > 0 && (
              <p className="text-xs font-semibold text-[#CAB170]">{fmtRp(batch.hpp_per_item)}/baju</p>
            )}
          </div>
        </div>

        <p className="text-xs text-skin-text3">
          {batch.batch_no} · {fmtDate(batch.tanggal_produksi)} · {batch.total_kain} pcs expected
        </p>

        <div className="flex gap-2 pt-1">
          <button onClick={() => setExpanded((v) => !v)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition">
            {expanded ? "Tutup" : "Detail"}
          </button>
          <button onClick={() => onDelete(batch)}
            className="px-3 py-2 text-xs border border-skin-bdr text-red-400 hover:text-red-600 transition">×</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-skin-bdr-lt px-4 pb-4 space-y-3">
          {batch.sizes?.map((s, si) => (
            <div key={si}>
              <p className="text-xs font-semibold text-skin-text2 mt-2">{s.size}</p>
              {s.warna?.map((w, wi) => (
                <p key={wi} className="text-xs text-skin-text3 pl-2">
                  {w.warna === "_" ? "(tanpa warna)" : w.warna}: {w.qty} pcs
                </p>
              ))}
            </div>
          ))}
          {batch.bahan_dipakai?.length > 0 && (
            <div>
              <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mt-3 mb-1">Bahan Dipakai</p>
              {batch.bahan_dipakai.map((b, bi) => (
                <p key={bi} className="text-xs text-skin-text2">
                  {b.nama_bahan}: {b.jumlah} {b.satuan}
                </p>
              ))}
            </div>
          )}
          {batch.catatan && <p className="text-xs text-skin-text3 italic">{batch.catatan}</p>}
        </div>
      )}
    </div>
  );
}

// ── Halaman utama ──────────────────────────────────────────────────────────────
export default function ProduksiRecord() {
  const [batches,      setBatches]     = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [showForm,     setShowForm]    = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]    = useState(false);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("produksi_batch").select("*").order("tanggal_produksi", { ascending: false });
    setBatches(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const kode = deleteTarget.kode_produk;
    setDeleting(true);
    try {
      // Hapus semua data terkait produk ini (semua batch, HPP, stok, produk)
      await supabase.from("produksi_batch").delete().eq("kode_produk", kode);
      await supabase.from("expected_stok").delete().eq("kode", kode);
      await supabase.from("hpp_template").delete().eq("kode_produk", kode);
      await supabase.from("stok_warna").delete().eq("kode", kode);
      await supabase.from("products").delete().eq("kode", kode);
      invalidateProducts();
      setDeleteTarget(null);
      loadBatches();
    } catch (e) {
      console.error("Gagal hapus batch:", e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProduksiLayout title="Catatan Produksi">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-2.5 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition">
          + Produk Baru
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Belum ada catatan produksi.</p>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => (
            <BatchCard key={b.id} batch={b} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <BackToTop />

      {/* ── Modal Form Batch ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowForm(false)} />
          <div className="relative bg-skin-card w-full max-w-lg max-h-[95dvh] overflow-y-auto border-2 border-skin-bdr shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt sticky top-0 bg-skin-card z-10">
              <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">Produk Baru & Batch</h2>
              <button onClick={() => setShowForm(false)} className="text-skin-text3 hover:text-skin-text transition text-xl leading-none">×</button>
            </div>
            <div className="p-4">
              <BatchForm
                onSave={async () => { setShowForm(false); await loadBatches(); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-skin-card border-2 border-red-500/40 p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm tracking-[0.15em] uppercase text-red-400">Hapus Batch & Produk</p>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-skin-text">{deleteTarget.kode_produk} — {deleteTarget.nama_produk}</p>
              <p className="text-xs text-skin-text3">Tindakan ini akan menghapus permanen:</p>
              <ul className="text-xs text-skin-text3 space-y-0.5 pl-3 list-disc">
                <li>Semua catatan batch produksi untuk produk ini</li>
                <li>Data produk</li>
                <li>Template HPP</li>
                <li>Expected stok / buku potongan</li>
                <li>Stok aktual (semua lokasi)</li>
              </ul>
              <p className="text-xs text-red-400 pt-1 font-semibold">Tidak bisa dibatalkan.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-60">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-60">
                {deleting ? "Menghapus..." : "Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProduksiLayout>
  );
}
