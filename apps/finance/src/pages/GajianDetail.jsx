/**
 * GajianDetail.jsx — Detail gajian satu periode.
 * Tabs: Potong | Jahit | Finishing | QA | Kreatif | CMT | Ringkasan
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@deera/shared/lib/supabase";
import { toast } from "@deera/shared/lib/toast";
import FinanceLayout from "../components/FinanceLayout";
import {
  fmtRp,
  fmtTanggalPendek,
  inputCls,
  labelCls,
  calcUpahPotong,
  calcUpahFinishing,
  calcUpahKreatif,
  TARIF_FINISHING_PER_PCS,
  TARIF_KANCING,
  TARIF_QA,
  TARIF_KREATIF,
  loadKaryawanAktif,
  timLabel,
} from "../lib/financeUtils";

// ── Shared primitives ─────────────────────────────────────────────────────────

const TABS = ["Potong", "Jahit", "Finishing", "QA", "Kreatif", "CMT", "Ringkasan"];

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-4 py-3 font-editorial text-[11px] tracking-[0.15em] uppercase border-b-2 transition whitespace-nowrap ${
        active ? "border-[#CAB170] text-[#CAB170]" : "border-transparent text-skin-text3 hover:text-skin-text"
      }`}
    >
      {label}
    </button>
  );
}

/** Jumlah + tarif bar di bawah form */
function TotalBar({ label, value }) {
  return (
    <div className="bg-skin-gold border border-skin-bdr-gold px-4 py-3 flex items-center justify-between gap-2">
      <span className="font-editorial text-xs tracking-[0.12em] uppercase text-skin-text3 truncate">{label}</span>
      <span className="font-headline text-[#CAB170] text-lg leading-none shrink-0">{fmtRp(value)}</span>
    </div>
  );
}

/** Modal container dengan header + flex body */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col h-[95dvh]">
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 truncate pr-2">{title}</h2>
          <button onClick={onClose} className="shrink-0 text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Baris actions di footer modal */
function ModalFooter({ onCancel, onSave, saving, saveLabel = "Simpan" }) {
  return (
    <div className="shrink-0 border-t border-skin-bdr px-4 pt-3 pb-4 flex gap-2">
      <button type="button" onClick={onCancel} disabled={saving}
        className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50 transition">
        Batal
      </button>
      <button type="submit" disabled={saving}
        className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50">
        {saving ? "Menyimpan..." : saveLabel}
      </button>
    </div>
  );
}

/** Tombol + Tambah di atas list tab */
function TabHeader({ title, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3">{title}</p>
      {onAdd && (
        <button onClick={onAdd} className="font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition">
          + Tambah
        </button>
      )}
    </div>
  );
}

/** Kartu entry tim dengan nama + jumlah + edit/hapus — mobile-safe */
function EntryCard({ nama, sub, amount, onEdit, onDelete }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-editorial text-sm font-semibold text-skin-text truncate">{nama}</p>
          {sub && <p className="font-editorial text-xs text-skin-text3 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-headline text-[#CAB170] text-base leading-none">{fmtRp(amount)}</p>
          <div className="flex gap-3 mt-1 justify-end">
            {onEdit && <button onClick={onEdit} className="font-editorial text-[10px] uppercase text-skin-text3 hover:text-[#CAB170] transition">Edit</button>}
            {onDelete && <button onClick={onDelete} className="font-editorial text-[10px] uppercase text-red-400 hover:text-red-600 transition">Hapus</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Selector karyawan */
function KaryawanSelect({ value, onChange, list, timFilter }) {
  const filtered = timFilter ? list.filter((k) => k.tim === timFilter) : list;
  const fallback = filtered.length === 0 ? list : filtered;
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>Karyawan *</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} required>
        <option value="">— Pilih karyawan —</option>
        {fallback.map((k) => (
          <option key={k.id} value={k.id}>{k.nama}{timFilter && k.tim !== timFilter ? ` (${timLabel(k.tim)})` : ""}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * Range slider dengan shortcut marks.
 * marks = array of numbers di dalam range.
 * Tiap mark tampil sebagai chip yang bisa diklik.
 */
function RangeSlider({ label, value, min, max, step = 1000, marks = [], onChange }) {
  const fmtK = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={labelCls}>{label}</label>
        <span className="font-headline text-[#CAB170] text-sm">{fmtRp(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full cursor-pointer"
        style={{ accentColor: "#CAB170" }}
      />
      {marks.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {marks.map((m) => (
            <button key={m} type="button" onClick={() => onChange(m)}
              className={`flex-1 min-w-[40px] py-1 font-editorial text-[11px] tracking-wide border transition ${
                value === m
                  ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                  : "border-skin-bdr text-skin-text4 hover:border-skin-text"
              }`}
            >
              {fmtK(m)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB POTONG
// ─────────────────────────────────────────────────────────────────────────────

function PotongForm({ gajianId, initial, karyawanList, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [pola, setPola]     = useState(initial?.jumlah_pola    ?? 0);
  const [sampel, setSampel] = useState(initial?.jumlah_sampel  ?? 0);
  const [qty, setQty]       = useState(initial?.qty_potongan   ?? 0);
  const [tarif, setTarif]   = useState(initial?.tarif_potongan ?? 4000);
  const [saving, setSaving] = useState(false);

  const total = calcUpahPotong({ jumlah_pola: Number(pola), jumlah_sampel: Number(sampel), qty_potongan: Number(qty), tarif_potongan: tarif });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = { gajian_id: gajianId, karyawan_id: karyawanId, jumlah_pola: Number(pola), jumlah_sampel: Number(sampel), qty_potongan: Number(qty), tarif_potongan: tarif, total_upah: total };
      const { error } = isEdit
        ? await supabase.from("gaji_potong").update(payload).eq("id", initial.id)
        : await supabase.from("gaji_potong").insert(payload);
      if (error) throw error;
      onSave();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <KaryawanSelect value={karyawanId} onChange={setKaryawanId} list={karyawanList} timFilter="potong" />

        <div className="grid grid-cols-3 gap-3">
          {[["Jml Pola", pola, setPola, "×Rp50k"], ["Jml Sampel", sampel, setSampel, "×Rp100k"], ["Qty Potongan", qty, setQty, "pcs"]].map(([lbl, val, set, hint]) => (
            <div key={lbl} className="space-y-1.5">
              <label className={labelCls}>{lbl}</label>
              <input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder="0" className={inputCls} />
              <p className="font-editorial text-[10px] text-skin-text4">{hint}</p>
            </div>
          ))}
        </div>

        <RangeSlider
          label="Tarif Potongan / pcs"
          value={tarif} min={4000} max={6000} step={100}
          marks={[4000, 4500, 5000, 5500, 6000]}
          onChange={setTarif}
        />

        <TotalBar label="Total Upah" value={total} />
      </div>
      <ModalFooter onCancel={onClose} saving={saving} />
    </form>
  );
}

function TabPotong({ gajianId, karyawanList }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(null); // null | "new" | row object

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("gaji_potong").select("*, karyawan(nama)").eq("gajian_id", gajianId).order("created_at");
    setRows(data ?? []);
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    if (!confirm("Hapus?")) return;
    await supabase.from("gaji_potong").delete().eq("id", id);
    load();
  }

  const total = rows.reduce((s, r) => s + (r.total_upah || 0), 0);

  return (
    <>
      <TabHeader title="Tim Potong" onAdd={() => setForm("new")} />
      {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Memuat...</p> :
        rows.length === 0 ? (
          <p className="text-sm text-skin-text3 py-6 text-center">Belum ada data. <button onClick={() => setForm("new")} className="text-[#CAB170] underline">+ Tambah</button></p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <EntryCard key={r.id}
                nama={r.karyawan?.nama ?? "—"}
                sub={`${r.qty_potongan ?? 0} pcs × ${fmtRp(r.tarif_potongan)} · ${r.jumlah_pola ?? 0} pola · ${r.jumlah_sampel ?? 0} sampel`}
                amount={r.total_upah}
                onEdit={() => setForm(r)}
                onDelete={() => del(r.id)}
              />
            ))}
            <TotalBar label="Total Tim Potong" value={total} />
          </div>
        )
      }
      {form && (
        <Modal title={form === "new" ? "Tambah Tim Potong" : `Edit — ${form.karyawan?.nama ?? ""}`} onClose={() => setForm(null)}>
          <PotongForm gajianId={gajianId} initial={form === "new" ? null : form} karyawanList={karyawanList}
            onSave={() => { setForm(null); load(); }} onClose={() => setForm(null)} />
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB JAHIT
// ─────────────────────────────────────────────────────────────────────────────

const JAHIT_MARKS = [20000, 23000, 25000, 30000, 35000];
const newKartu = () => ({ kode: "", warna: "", ukuran: "", jumlah: "", upah: 20000 });
const newPermak = () => ({ keterangan: "", jumlah: "", upah: "" });

function JahitForm({ gajianId, initial, karyawanList, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [kartus, setKartus]   = useState(initial?.kartu_items?.length  ? initial.kartu_items  : [newKartu()]);
  const [permaks, setPermaks] = useState(initial?.permak_items?.length ? initial.permak_items : []);
  const [saving, setSaving]   = useState(false);

  const setKartu = (i, k, v) => setKartus((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const setPermak = (i, k, v) => setPermaks((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const totalKartu  = kartus.reduce((s, it) => s + (Number(it.jumlah) || 0) * (Number(it.upah) || 0), 0);
  const totalPermak = permaks.reduce((s, it) => s + (Number(it.jumlah) || 0) * (Number(it.upah) || 0), 0);
  const total = totalKartu + totalPermak;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId, karyawan_id: karyawanId,
        kartu_items: kartus.filter((it) => it.jumlah),
        permak_items: permaks.filter((it) => it.jumlah),
        total_upah: total,
      };
      const { error } = isEdit
        ? await supabase.from("gaji_jahit").update(payload).eq("id", initial.id)
        : await supabase.from("gaji_jahit").insert(payload);
      if (error) throw error;
      onSave();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <KaryawanSelect value={karyawanId} onChange={setKaryawanId} list={karyawanList} timFilter="jahit" />

        {/* Kartu items */}
        <div>
          <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3 mb-3">Kartu Jahit</p>
          <div className="space-y-4">
            {kartus.map((it, i) => (
              <div key={i} className="bg-skin-raised p-3 space-y-3">
                {/* Baris 1: kode + ukuran */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className={labelCls}>Kode</label>
                    <input type="text" value={it.kode} onChange={(e) => setKartu(i, "kode", e.target.value)} placeholder="D-07-OSK" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Ukuran</label>
                    <input type="text" value={it.ukuran} onChange={(e) => setKartu(i, "ukuran", e.target.value)} placeholder="Midi" className={inputCls} />
                  </div>
                </div>
                {/* Baris 2: warna + jumlah */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className={labelCls}>Warna</label>
                    <input type="text" value={it.warna} onChange={(e) => setKartu(i, "warna", e.target.value)} placeholder="HITAM" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Jumlah (pcs)</label>
                    <input type="number" min="0" value={it.jumlah} onChange={(e) => setKartu(i, "jumlah", e.target.value)} placeholder="0" className={inputCls} />
                  </div>
                </div>
                {/* Upah range */}
                <RangeSlider
                  label="Upah / pcs"
                  value={Number(it.upah) || 20000} min={20000} max={35000} step={1000}
                  marks={JAHIT_MARKS}
                  onChange={(v) => setKartu(i, "upah", v)}
                />
                {Number(it.jumlah) > 0 && (
                  <p className="font-editorial text-xs text-skin-text3 text-right">
                    Subtotal: {fmtRp((Number(it.jumlah) || 0) * (Number(it.upah) || 0))}
                  </p>
                )}
                {kartus.length > 1 && (
                  <button type="button" onClick={() => setKartus((p) => p.filter((_, idx) => idx !== i))} className="text-xs font-editorial text-red-400">− Hapus kartu</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setKartus((p) => [...p, newKartu()])}
            className="mt-2 font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition">
            + Tambah kartu
          </button>
        </div>

        {/* Permak */}
        <div>
          <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3 mb-3">Permak</p>
          <div className="space-y-3">
            {permaks.map((it, i) => (
              <div key={i} className="bg-skin-raised p-3 space-y-2">
                <div className="space-y-1">
                  <label className={labelCls}>Keterangan</label>
                  <input type="text" value={it.keterangan} onChange={(e) => setPermak(i, "keterangan", e.target.value)} placeholder="Deskripsi permak" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className={labelCls}>Jumlah</label>
                    <input type="number" min="0" value={it.jumlah} onChange={(e) => setPermak(i, "jumlah", e.target.value)} placeholder="0" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Upah / item</label>
                    <input type="number" min="0" value={it.upah} onChange={(e) => setPermak(i, "upah", e.target.value)} placeholder="0" className={inputCls} />
                  </div>
                </div>
                <button type="button" onClick={() => setPermaks((p) => p.filter((_, idx) => idx !== i))} className="text-xs font-editorial text-red-400">− Hapus</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setPermaks((p) => [...p, newPermak()])}
            className="mt-2 font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition">
            + Tambah permak
          </button>
        </div>

        <TotalBar label="Total Upah" value={total} />
      </div>
      <ModalFooter onCancel={onClose} saving={saving} />
    </form>
  );
}

function TabJahit({ gajianId, karyawanList }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("gaji_jahit").select("*, karyawan(nama)").eq("gajian_id", gajianId).order("created_at");
    setRows(data ?? []);
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  async function del(id) { if (!confirm("Hapus?")) return; await supabase.from("gaji_jahit").delete().eq("id", id); load(); }

  const total = rows.reduce((s, r) => s + (r.total_upah || 0), 0);
  const kartuDesc = (r) => {
    const kartuTotal = (r.kartu_items ?? []).reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
    const permakTotal = (r.permak_items ?? []).length;
    const parts = [];
    if (kartuTotal > 0) parts.push(`${kartuTotal} pcs`);
    if (permakTotal > 0) parts.push(`${permakTotal} permak`);
    return parts.join(" · ") || "—";
  };

  return (
    <>
      <TabHeader title="Tim Jahit" onAdd={() => setForm("new")} />
      {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Memuat...</p> :
        rows.length === 0 ? (
          <p className="text-sm text-skin-text3 py-6 text-center">Belum ada data. <button onClick={() => setForm("new")} className="text-[#CAB170] underline">+ Tambah</button></p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <EntryCard key={r.id} nama={r.karyawan?.nama ?? "—"} sub={kartuDesc(r)} amount={r.total_upah}
                onEdit={() => setForm(r)} onDelete={() => del(r.id)} />
            ))}
            <TotalBar label="Total Tim Jahit" value={total} />
          </div>
        )
      }
      {form && (
        <Modal title={form === "new" ? "Tambah Tim Jahit" : `Edit — ${form.karyawan?.nama ?? ""}`} onClose={() => setForm(null)}>
          <JahitForm gajianId={gajianId} initial={form === "new" ? null : form} karyawanList={karyawanList}
            onSave={() => { setForm(null); load(); }} onClose={() => setForm(null)} />
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB FINISHING (satu per gajian, no karyawan)
// ─────────────────────────────────────────────────────────────────────────────

const newProduk = () => ({ nama_produk: "", jumlah: "", kancing_qty: "" });

function FinishingForm({ gajianId, initial, onSave, onClose }) {
  const [items, setItems] = useState(initial?.items?.length ? initial.items : [newProduk()]);
  const [saving, setSaving] = useState(false);

  const setItem = (i, k, v) => setItems((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const total = calcUpahFinishing(items.map((it) => ({ jumlah: Number(it.jumlah) || 0, kancing_qty: Number(it.kancing_qty) || 0 })));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { gajian_id: gajianId, items: items.filter((it) => it.jumlah), total_upah: total };
      const { error } = initial
        ? await supabase.from("gaji_finishing").update(payload).eq("id", initial.id)
        : await supabase.from("gaji_finishing").insert(payload);
      if (error) throw error;
      onSave();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {/* Tarif info */}
        <div className="bg-skin-raised px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
          <p className="font-editorial text-[11px] text-skin-text3">Finishing/pcs: <span className="text-skin-text">{fmtRp(TARIF_FINISHING_PER_PCS)}</span></p>
          <p className="font-editorial text-[11px] text-skin-text3">Kancing/buah: <span className="text-skin-text">{fmtRp(TARIF_KANCING)}</span></p>
        </div>

        {/* Product items */}
        {items.map((it, i) => (
          <div key={i} className="bg-skin-raised p-3 space-y-2">
            <div className="space-y-1">
              <label className={labelCls}>Nama Produk (opsional)</label>
              <input type="text" value={it.nama_produk} onChange={(e) => setItem(i, "nama_produk", e.target.value)} placeholder="Contoh: D-07-OSK" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>Jumlah Produk</label>
                <input type="number" min="0" value={it.jumlah} onChange={(e) => setItem(i, "jumlah", e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Jumlah Kancing</label>
                <input type="number" min="0" value={it.kancing_qty} onChange={(e) => setItem(i, "kancing_qty", e.target.value)} placeholder="0" className={inputCls} />
              </div>
            </div>
            {(Number(it.jumlah) > 0 || Number(it.kancing_qty) > 0) && (
              <p className="font-editorial text-xs text-skin-text3 text-right">
                Subtotal: {fmtRp((Number(it.jumlah)||0) * TARIF_FINISHING_PER_PCS + (Number(it.kancing_qty)||0) * TARIF_KANCING)}
              </p>
            )}
            {items.length > 1 && (
              <button type="button" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="text-xs font-editorial text-red-400">− Hapus produk</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setItems((p) => [...p, newProduk()])}
          className="font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition">
          + Tambah Produk
        </button>

        <TotalBar label="Total Finishing" value={total} />
      </div>
      <ModalFooter onCancel={onClose} saving={saving} />
    </form>
  );
}

function TabFinishing({ gajianId }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("gaji_finishing").select("*").eq("gajian_id", gajianId).maybeSingle();
    setRecord(data ?? null);
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  async function del() {
    if (!confirm("Hapus data finishing?")) return;
    await supabase.from("gaji_finishing").delete().eq("id", record.id);
    setRecord(null);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3">Tim Finishing</p>
        <p className="font-editorial text-[10px] text-skin-text4">1 entri per periode</p>
      </div>
      {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Memuat...</p> :
        !record ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-skin-text3">Belum ada data finishing.</p>
            <button onClick={() => setShowForm(true)} className="px-5 py-2 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-[#CAB170] text-[#CAB170] hover:bg-skin-gold transition">
              + Input Finishing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-skin-card border border-skin-bdr p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-editorial text-sm font-semibold text-skin-text">{record.items?.length ?? 0} produk</p>
                <p className="font-headline text-[#CAB170] text-lg leading-none shrink-0">{fmtRp(record.total_upah)}</p>
              </div>
              <div className="space-y-1">
                {(record.items ?? []).map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <p className="font-editorial text-xs text-skin-text2 truncate min-w-0">{it.nama_produk || `Produk ${i + 1}`}</p>
                    <p className="font-editorial text-xs text-skin-text3 shrink-0">{it.jumlah ?? 0} pcs · {it.kancing_qty ?? 0} kancing</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-1 border-t border-skin-bdr-lt">
                <button onClick={() => setShowForm(true)} className="font-editorial text-xs tracking-wide text-[#CAB170] hover:text-[#A8925A] transition">Edit</button>
                <button onClick={del} className="font-editorial text-xs tracking-wide text-red-400 hover:text-red-600 transition">Hapus</button>
              </div>
            </div>
            <TotalBar label="Total Finishing" value={record.total_upah} />
          </div>
        )
      }
      {showForm && (
        <Modal title="Input Finishing" onClose={() => setShowForm(false)}>
          <FinishingForm gajianId={gajianId} initial={record}
            onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB QA (500/pcs)
// ─────────────────────────────────────────────────────────────────────────────

function TabQA({ gajianId }) {
  const [record, setRecord] = useState(null);
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("gaji_qa").select("*").eq("gajian_id", gajianId).maybeSingle();
    if (data) { setRecord(data); setJumlah(String(data.jumlah_pcs ?? "")); setCatatan(data.catatan ?? ""); }
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  const total = (Number(jumlah) || 0) * TARIF_QA;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { gajian_id: gajianId, jumlah_pcs: Number(jumlah) || 0, total_upah: total, catatan: catatan.trim() || null };
      const { error } = record
        ? await supabase.from("gaji_qa").update(payload).eq("id", record.id)
        : await supabase.from("gaji_qa").insert(payload);
      if (error) throw error;
      toast.success("QA disimpan.");
      load();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3">Tim QA</p>
        <p className="font-editorial text-[10px] text-skin-text4">QC = {fmtRp(TARIF_QA)}/pcs</p>
      </div>
      {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Memuat...</p> : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Jumlah Pcs QC</label>
            <input
              type="number" min="0" value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Catatan (opsional)</label>
            <input type="text" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Opsional" className={inputCls} />
          </div>
          <TotalBar label={`${jumlah || 0} pcs × ${fmtRp(TARIF_QA)}`} value={total} />
          <button type="submit" disabled={saving}
            className="w-full py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan QA"}
          </button>
        </form>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB KREATIF
// ─────────────────────────────────────────────────────────────────────────────

function KreatifForm({ gajianId, initial, karyawanList, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [video, setVideo] = useState(String(initial?.jumlah_video ?? ""));
  const [foto,  setFoto]  = useState(String(initial?.jumlah_foto  ?? ""));
  const [logo,  setLogo]  = useState(String(initial?.jumlah_logo  ?? ""));
  const [saving, setSaving] = useState(false);

  const total = calcUpahKreatif({ jumlah_video: Number(video)||0, jumlah_foto: Number(foto)||0, jumlah_logo: Number(logo)||0 });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = { gajian_id: gajianId, karyawan_id: karyawanId, jumlah_video: Number(video)||0, jumlah_foto: Number(foto)||0, jumlah_logo: Number(logo)||0, total_upah: total };
      const { error } = isEdit
        ? await supabase.from("gaji_kreatif").update(payload).eq("id", initial.id)
        : await supabase.from("gaji_kreatif").insert(payload);
      if (error) throw error;
      onSave();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <KaryawanSelect value={karyawanId} onChange={setKaryawanId} list={karyawanList} timFilter="kreatif" />
        <div className="grid grid-cols-3 gap-3">
          {[["Video", video, setVideo, "×Rp50k"], ["Foto Seri", foto, setFoto, "×Rp30k"], ["Logo", logo, setLogo, "×Rp20k"]].map(([lbl, val, set, hint]) => (
            <div key={lbl} className="space-y-1.5">
              <label className={labelCls}>{lbl}</label>
              <input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder="0" className={inputCls} />
              <p className="font-editorial text-[10px] text-skin-text4">{hint}</p>
            </div>
          ))}
        </div>
        <TotalBar label="Total Upah" value={total} />
      </div>
      <ModalFooter onCancel={onClose} saving={saving} />
    </form>
  );
}

function TabKreatif({ gajianId, karyawanList }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("gaji_kreatif").select("*, karyawan(nama)").eq("gajian_id", gajianId).order("created_at");
    setRows(data ?? []);
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  async function del(id) { if (!confirm("Hapus?")) return; await supabase.from("gaji_kreatif").delete().eq("id", id); load(); }

  const total = rows.reduce((s, r) => s + (r.total_upah || 0), 0);
  const desc = (r) => [r.jumlah_video && `${r.jumlah_video}v`, r.jumlah_foto && `${r.jumlah_foto}f`, r.jumlah_logo && `${r.jumlah_logo}l`].filter(Boolean).join(" · ");

  return (
    <>
      <TabHeader title="Tim Kreatif" onAdd={() => setForm("new")} />
      {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Memuat...</p> :
        rows.length === 0 ? <p className="text-sm text-skin-text3 py-6 text-center">Belum ada data. <button onClick={() => setForm("new")} className="text-[#CAB170] underline">+ Tambah</button></p> : (
          <div className="space-y-2">
            {rows.map((r) => <EntryCard key={r.id} nama={r.karyawan?.nama ?? "—"} sub={desc(r)} amount={r.total_upah} onEdit={() => setForm(r)} onDelete={() => del(r.id)} />)}
            <TotalBar label="Total Tim Kreatif" value={total} />
          </div>
        )
      }
      {form && (
        <Modal title={form === "new" ? "Tambah Tim Kreatif" : `Edit — ${form.karyawan?.nama ?? ""}`} onClose={() => setForm(null)}>
          <KreatifForm gajianId={gajianId} initial={form === "new" ? null : form} karyawanList={karyawanList}
            onSave={() => { setForm(null); load(); }} onClose={() => setForm(null)} />
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB CMT
// ─────────────────────────────────────────────────────────────────────────────

function CmtForm({ gajianId, initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [f, setF] = useState({
    nama_vendor: initial?.nama_vendor ?? "", tanggal_kirim: initial?.tanggal_kirim ?? "", tanggal_terima: initial?.tanggal_terima ?? "",
    jumlah_kirim: String(initial?.jumlah_kirim ?? ""), jumlah_terima: String(initial?.jumlah_terima ?? ""),
    harga_upah: String(initial?.harga_upah ?? ""), catatan: initial?.catatan ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const total = (Number(f.jumlah_terima)||0) * (Number(f.harga_upah)||0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { gajian_id: gajianId, nama_vendor: f.nama_vendor.trim()||null, tanggal_kirim: f.tanggal_kirim||null, tanggal_terima: f.tanggal_terima||null, jumlah_kirim: Number(f.jumlah_kirim)||0, jumlah_terima: Number(f.jumlah_terima)||0, harga_upah: Number(f.harga_upah)||0, total_upah: total, catatan: f.catatan.trim()||null };
      const { error } = isEdit ? await supabase.from("gaji_cmt").update(payload).eq("id", initial.id) : await supabase.from("gaji_cmt").insert(payload);
      if (error) throw error;
      onSave();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Nama Vendor / CMT</label>
          <input type="text" value={f.nama_vendor} onChange={(e) => set("nama_vendor", e.target.value)} placeholder="Nama vendor" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelCls}>Tgl Kirim</label><input type="date" value={f.tanggal_kirim} onChange={(e) => set("tanggal_kirim", e.target.value)} className={inputCls} /></div>
          <div className="space-y-1.5"><label className={labelCls}>Tgl Terima</label><input type="date" value={f.tanggal_terima} onChange={(e) => set("tanggal_terima", e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelCls}>Jml Kirim</label><input type="number" min="0" value={f.jumlah_kirim} onChange={(e) => set("jumlah_kirim", e.target.value)} placeholder="0" className={inputCls} /></div>
          <div className="space-y-1.5"><label className={labelCls}>Jml Terima</label><input type="number" min="0" value={f.jumlah_terima} onChange={(e) => set("jumlah_terima", e.target.value)} placeholder="0" className={inputCls} /></div>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Upah / pcs (Rp)</label>
          <input type="number" min="0" value={f.harga_upah} onChange={(e) => set("harga_upah", e.target.value)} placeholder="0" className={inputCls} />
        </div>
        <div className="space-y-1.5"><label className={labelCls}>Catatan</label><input type="text" value={f.catatan} onChange={(e) => set("catatan", e.target.value)} placeholder="Opsional" className={inputCls} /></div>
        <TotalBar label={`${f.jumlah_terima||0} pcs × ${fmtRp(Number(f.harga_upah)||0)}`} value={total} />
      </div>
      <ModalFooter onCancel={onClose} saving={saving} />
    </form>
  );
}

function TabCmt({ gajianId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("gaji_cmt").select("*").eq("gajian_id", gajianId).order("created_at");
    setRows(data ?? []);
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  async function del(id) { if (!confirm("Hapus?")) return; await supabase.from("gaji_cmt").delete().eq("id", id); load(); }

  const total = rows.reduce((s, r) => s + (r.total_upah || 0), 0);

  return (
    <>
      <TabHeader title="CMT Luar" onAdd={() => setForm("new")} />
      {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Memuat...</p> :
        rows.length === 0 ? <p className="text-sm text-skin-text3 py-6 text-center">Belum ada data. <button onClick={() => setForm("new")} className="text-[#CAB170] underline">+ Tambah</button></p> : (
          <div className="space-y-2">
            {rows.map((r) => (
              <EntryCard key={r.id} nama={r.nama_vendor || "Vendor"}
                sub={`Kirim ${r.jumlah_kirim} / Terima ${r.jumlah_terima} · ${fmtRp(r.harga_upah)}/pcs`}
                amount={r.total_upah} onEdit={() => setForm(r)} onDelete={() => del(r.id)} />
            ))}
            <TotalBar label="Total CMT" value={total} />
          </div>
        )
      }
      {form && (
        <Modal title={form === "new" ? "Tambah CMT" : `Edit CMT`} onClose={() => setForm(null)}>
          <CmtForm gajianId={gajianId} initial={form === "new" ? null : form}
            onSave={() => { setForm(null); load(); }} onClose={() => setForm(null)} />
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB RINGKASAN
// ─────────────────────────────────────────────────────────────────────────────

function TabRingkasan({ gajianId, gajian, onRefresh }) {
  const [totals, setTotals] = useState(null);
  const [pettycash, setPettycash] = useState(String(gajian.pettycash ?? ""));
  const [tambahan, setTambahan]   = useState(gajian.tambahan ?? []);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const setTamb = (i, k, v) => setTambahan((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const load = useCallback(async () => {
    setLoading(true);
    const [p, j, f, q, k, c] = await Promise.all([
      supabase.from("gaji_potong").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_jahit").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_finishing").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_qa").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_kreatif").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_cmt").select("total_upah").eq("gajian_id", gajianId),
    ]);
    const sum = (res) => (res.data ?? []).reduce((s, r) => s + (r.total_upah || 0), 0);
    const t = { potong: sum(p), jahit: sum(j), finishing: sum(f), qa: sum(q), kreatif: sum(k), cmt: sum(c) };
    t.gaji = Object.values(t).reduce((s, v) => s + v, 0);
    setTotals(t);
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  const sumTambahan = tambahan.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
  const totalRequest = (totals?.gaji ?? 0) + (Number(pettycash) || 0) + sumTambahan;

  async function handleSaveRequest() {
    setSaving(true);
    try {
      const { error } = await supabase.from("gajian_minggu").update({
        pettycash: Number(pettycash) || 0,
        tambahan: tambahan.filter((it) => it.label || it.jumlah),
        total_request: totalRequest,
      }).eq("id", gajianId);
      if (error) throw error;
      toast.success("Ringkasan disimpan.");
      onRefresh();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setSaving(false); }
  }

  async function handleFinalize() {
    if (!confirm("Finalisasi gajian ini? Status menjadi Final.")) return;
    setFinalizing(true);
    try {
      const { error } = await supabase.from("gajian_minggu").update({
        status: "final",
        total_potong:   totals.potong,
        total_jahit:    totals.jahit,
        total_finishing: totals.finishing,
        total_qa:       totals.qa,
        total_kreatif:  totals.kreatif,
        total_cmt:      totals.cmt,
        total_gaji:     totals.gaji,
        pettycash: Number(pettycash) || 0,
        tambahan: tambahan.filter((it) => it.label || it.jumlah),
        total_request: totalRequest,
      }).eq("id", gajianId);
      if (error) throw error;
      toast.success("Gajian berhasil difinalisasi.");
      onRefresh();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setFinalizing(false); }
  }

  const isFinal = gajian.status === "final";
  const timRows = [
    ["Tim Potong",    totals?.potong],
    ["Tim Jahit",     totals?.jahit],
    ["Tim Finishing", totals?.finishing],
    ["Tim QA",        totals?.qa],
    ["Tim Kreatif",   totals?.kreatif],
    ["CMT Luar",      totals?.cmt],
  ];

  return (
    <div className="space-y-4">
      {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Menghitung...</p> : (
        <>
          {/* Total per tim */}
          <div className="bg-skin-card border border-skin-bdr divide-y divide-skin-bdr-lt">
            {timRows.map(([label, val]) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="font-editorial text-sm text-skin-text2">{label}</span>
                <span className="font-editorial text-sm font-semibold text-skin-text shrink-0">{fmtRp(val ?? 0)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-skin-raised">
              <span className="font-editorial text-sm font-semibold text-skin-text">Total Gaji</span>
              <span className="font-headline text-[#CAB170] text-lg leading-none shrink-0">{fmtRp(totals?.gaji ?? 0)}</span>
            </div>
          </div>

          {/* Pettycash + tambahan — hanya editable jika draft */}
          {!isFinal && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Pettycash</label>
                <input type="number" min="0" value={pettycash} onChange={(e) => setPettycash(e.target.value)} placeholder="0" className={inputCls} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Tambahan Lain</label>
                  <button type="button" onClick={() => setTambahan((p) => [...p, { label: "", jumlah: "" }])}
                    className="font-editorial text-xs text-[#CAB170] hover:text-[#A8925A] transition">+ Tambah</button>
                </div>
                <div className="space-y-2">
                  {tambahan.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={it.label} onChange={(e) => setTamb(i, "label", e.target.value)} placeholder="Keterangan" className={`${inputCls} flex-1 min-w-0`} />
                      <input type="number" min="0" value={it.jumlah} onChange={(e) => setTamb(i, "jumlah", e.target.value)} placeholder="0" className={`${inputCls} w-28 shrink-0`} />
                      <button type="button" onClick={() => setTambahan((p) => p.filter((_, idx) => idx !== i))} className="shrink-0 text-red-400 text-lg leading-none">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <button type="button" onClick={handleSaveRequest} disabled={saving}
                className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition disabled:opacity-50">
                {saving ? "Menyimpan..." : "Simpan Pettycash & Tambahan"}
              </button>
            </div>
          )}

          {/* Total request */}
          <div className="bg-skin-raised border border-skin-bdr p-4 space-y-2">
            {(gajian.pettycash > 0 || isFinal) && (
              <div className="flex items-center justify-between">
                <span className="font-editorial text-sm text-skin-text2">Pettycash</span>
                <span className="font-editorial text-sm text-skin-text shrink-0">{fmtRp(isFinal ? gajian.pettycash : (Number(pettycash)||0))}</span>
              </div>
            )}
            {(isFinal ? gajian.tambahan : tambahan).filter((it) => it.jumlah > 0).map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="font-editorial text-sm text-skin-text2 truncate min-w-0">{it.label || "Tambahan"}</span>
                <span className="font-editorial text-sm text-skin-text shrink-0">{fmtRp(it.jumlah)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-skin-bdr-lt">
              <span className="font-editorial text-sm font-semibold text-skin-text">Total Request Investor</span>
              <span className="font-headline text-[#CAB170] text-xl leading-none shrink-0">
                {fmtRp(isFinal ? gajian.total_request : totalRequest)}
              </span>
            </div>
          </div>

          {/* Per karyawan */}
          {!loading && <PerKaryawan gajianId={gajianId} />}

          {/* Finalisasi */}
          {!isFinal ? (
            <button onClick={handleFinalize} disabled={finalizing}
              className="w-full py-4 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50">
              {finalizing ? "Memfinalisasi..." : "Finalisasi Gajian"}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 border border-emerald-500/30 bg-emerald-500/5">
              <span className="font-editorial text-xs tracking-[0.15em] uppercase text-emerald-500">✓ Final</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Detail transfer per karyawan — ditampilkan di Ringkasan */
function PerKaryawan({ gajianId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, j, f, k] = await Promise.all([
        supabase.from("gaji_potong").select("karyawan(nama, no_rekening, nama_bank), total_upah").eq("gajian_id", gajianId),
        supabase.from("gaji_jahit").select("karyawan(nama, no_rekening, nama_bank), total_upah").eq("gajian_id", gajianId),
        supabase.from("gaji_finishing").select("total_upah").eq("gajian_id", gajianId),
        supabase.from("gaji_kreatif").select("karyawan(nama, no_rekening, nama_bank), total_upah").eq("gajian_id", gajianId),
      ]);
      const map = {};
      for (const r of [...(p.data??[]), ...(j.data??[]), ...(k.data??[])]) {
        const nama = r.karyawan?.nama ?? "—";
        if (!map[nama]) map[nama] = { ...r.karyawan, total: 0 };
        map[nama].total += r.total_upah || 0;
      }
      setRows(Object.entries(map).sort((a, b) => b[1].total - a[1].total));
      setLoading(false);
    })();
  }, [gajianId]);

  if (loading || rows.length === 0) return null;

  return (
    <div>
      <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3 mb-2">Transfer per Karyawan</p>
      <div className="space-y-2">
        {rows.map(([nama, data]) => (
          <div key={nama} className="bg-skin-card border border-skin-bdr px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-editorial text-sm font-semibold text-skin-text truncate">{nama}</p>
                {(data.nama_bank || data.no_rekening) && (
                  <p className="font-editorial text-xs text-skin-text3 truncate">
                    {[data.nama_bank, data.no_rekening].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <p className="font-headline text-[#CAB170] text-base leading-none shrink-0">{fmtRp(data.total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function GajianDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gajian, setGajian] = useState(null);
  const [karyawanList, setKaryawanList] = useState([]);
  const [activeTab, setActiveTab] = useState("Potong");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: g }, karyawan] = await Promise.all([
      supabase.from("gajian_minggu").select("*").eq("id", id).single(),
      loadKaryawanAktif(),
    ]);
    setGajian(g);
    setKaryawanList(karyawan);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !gajian) {
    return (
      <FinanceLayout title="Detail Gajian">
        <p className="text-sm text-skin-text3 text-center py-8">{loading ? "Memuat..." : "Periode tidak ditemukan."}</p>
      </FinanceLayout>
    );
  }

  const isFinal = gajian.status === "final";

  const headerAction = (
    <div className="flex items-center gap-2 shrink-0">
      <span className={`font-editorial text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 border shrink-0 ${
        isFinal ? "border-emerald-500/40 text-emerald-500" : "border-amber-400/40 text-amber-400"
      }`}>
        {gajian.status}
      </span>
      <button onClick={() => navigate("/gajian")} className="font-editorial text-xs text-skin-text3 hover:text-skin-text transition shrink-0">
        ← Kembali
      </button>
    </div>
  );

  return (
    <FinanceLayout title={`Sabtu ${fmtTanggalPendek(gajian.tanggal_sabtu)}`} headerAction={headerAction}>
      {/* Tab nav — scrollable */}
      <div className="flex overflow-x-auto border-b border-skin-bdr-lt -mx-3 px-3 mb-4">
        {TABS.map((tab) => <TabBtn key={tab} label={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />)}
      </div>

      {activeTab === "Potong"    && <TabPotong    gajianId={id} karyawanList={karyawanList} />}
      {activeTab === "Jahit"     && <TabJahit     gajianId={id} karyawanList={karyawanList} />}
      {activeTab === "Finishing" && <TabFinishing  gajianId={id} />}
      {activeTab === "QA"        && <TabQA        gajianId={id} />}
      {activeTab === "Kreatif"   && <TabKreatif   gajianId={id} karyawanList={karyawanList} />}
      {activeTab === "CMT"       && <TabCmt       gajianId={id} />}
      {activeTab === "Ringkasan" && <TabRingkasan gajianId={id} gajian={gajian} onRefresh={load} />}
    </FinanceLayout>
  );
}
