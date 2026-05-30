/**
 * GajianDetail.jsx — Detail gajian satu periode.
 * Tabs: Potong | Jahit | Finishing | QC | Kreatif | CMT | Ringkasan
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
  TARIF_KREATIF,
  calcFinishingPerPcs,
  loadKaryawanAktif,
  timLabel,
  DEFAULT_FINANCE_CONFIG,
  getFinanceConfig,
} from "../lib/financeUtils";

// ── Shared primitives ─────────────────────────────────────────────────────────

const TABS = ["Potong", "Jahit", "Finishing", "QC", "Kreatif", "CMT", "Ringkasan"];

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

/**
 * ManualOverrideBar — toggle Sistem/Manual + form manual per tim.
 * Props:
 *   timKey      : string — "potong"|"jahit"|"finishing"|"qa"|"kreatif"|"cmt"
 *   gajian      : object — data gajian_minggu (termasuk manual_overrides)
 *   sistemTotal : number — total kalkulasi sistem (untuk referensi)
 *   onSaved     : fn()  — dipanggil setelah override tersimpan
 */
function ManualOverrideBar({ timKey, gajian, sistemTotal, onSaved }) {
  const overrides = gajian.manual_overrides ?? {};
  const ov = overrides[timKey] ?? {};
  const isManual = !!ov.aktif;

  const [jumlah, setJumlah] = useState(String(ov.jumlah ?? ""));
  const [catatan, setCatatan] = useState(ov.catatan ?? "");
  const [saving, setSaving] = useState(false);

  // Sync jika gajian berubah dari luar
  const [prevKey, setPrevKey] = useState(timKey + gajian.id);
  if (prevKey !== timKey + gajian.id) {
    setPrevKey(timKey + gajian.id);
    setJumlah(String(ov.jumlah ?? ""));
    setCatatan(ov.catatan ?? "");
  }

  async function saveOverride(aktif) {
    setSaving(true);
    try {
      const newOverrides = { ...overrides };
      if (!aktif) {
        delete newOverrides[timKey];
      } else {
        newOverrides[timKey] = {
          aktif: true,
          jumlah: Number(jumlah) || 0,
          catatan: catatan.trim(),
        };
      }
      const { error } = await supabase
        .from("gajian_minggu")
        .update({ manual_overrides: newOverrides })
        .eq("id", gajian.id);
      if (error) throw error;
      toast.success(aktif ? "Override manual disimpan." : "Mode sistem diaktifkan.");
      onSaved();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`mb-4 border ${isManual ? "border-amber-400/50 bg-amber-500/5" : "border-skin-bdr-lt bg-skin-raised"}`}>
      {/* Toggle header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="font-editorial text-[10px] tracking-[0.18em] uppercase text-skin-text3 mr-1">Mode:</span>
        <button
          onClick={() => !isManual || saveOverride(false)}
          disabled={saving}
          className={`px-3 py-1 font-editorial text-[10px] tracking-[0.12em] uppercase transition border ${
            !isManual
              ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
              : "border-skin-bdr text-skin-text3 hover:border-skin-text"
          }`}
        >
          Sistem
        </button>
        <button
          onClick={() => isManual || saveOverride(true)}
          disabled={saving}
          className={`px-3 py-1 font-editorial text-[10px] tracking-[0.12em] uppercase transition border ${
            isManual
              ? "border-amber-400 text-amber-500 bg-amber-500/10"
              : "border-skin-bdr text-skin-text3 hover:border-amber-400"
          }`}
        >
          Manual
        </button>
        {!isManual && sistemTotal > 0 && (
          <span className="ml-auto font-editorial text-[10px] text-skin-text3">
            Sistem: <span className="text-skin-text font-semibold">{fmtRp(sistemTotal)}</span>
          </span>
        )}
        {isManual && (
          <span className="ml-auto font-editorial text-[10px] text-amber-500 uppercase tracking-wide">Manual aktif</span>
        )}
      </div>

      {/* Form manual */}
      {isManual && (
        <div className="px-3 pb-3 space-y-2 border-t border-amber-400/20">
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="space-y-1">
              <label className={labelCls}>Jumlah Gaji Manual</label>
              <input
                type="number"
                min="0"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Catatan / Alasan</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Kenapa manual?"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-editorial text-[10px] text-skin-text3">
              Sistem: {fmtRp(sistemTotal)}
            </span>
            <button
              onClick={() => saveOverride(true)}
              disabled={saving}
              className="ml-auto px-4 py-1.5 font-editorial text-[10px] tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Override"}
            </button>
          </div>
        </div>
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
  const [pola, setPola]     = useState("");
  const [sampel, setSampel] = useState("");
  const [qty, setQty]       = useState("");
  const [tarif, setTarif]   = useState(initial?.tarif_potongan ?? 4000);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState(DEFAULT_FINANCE_CONFIG);
  useEffect(() => { getFinanceConfig().then(setCfg); }, []);

  const rPola   = pola   !== "" ? Number(pola)   : (initial?.jumlah_pola   ?? 0);
  const rSampel = sampel !== "" ? Number(sampel) : (initial?.jumlah_sampel ?? 0);
  const rQty    = qty    !== "" ? Number(qty)    : (initial?.qty_potongan  ?? 0);
  const total   = calcUpahPotong({ jumlah_pola: rPola, jumlah_sampel: rSampel, qty_potongan: rQty, tarif_potongan: tarif }, cfg);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = { gajian_id: gajianId, karyawan_id: karyawanId, jumlah_pola: rPola, jumlah_sampel: rSampel, qty_potongan: rQty, tarif_potongan: tarif, total_upah: total };
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
          {[
            ["Jml Pola",    pola,   setPola,   `×${fmtRp(cfg.tarif_pola)}`,   String(initial?.jumlah_pola   ?? "0")],
            ["Jml Sampel",  sampel, setSampel, `×${fmtRp(cfg.tarif_sampel)}`, String(initial?.jumlah_sampel ?? "0")],
            ["Qty Potongan",qty,    setQty,    "pcs",      String(initial?.qty_potongan  ?? "0")],
          ].map(([lbl, val, set, hint, ph]) => (
            <div key={lbl} className="space-y-1.5">
              <label className={labelCls}>{lbl}</label>
              <input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder={ph} className={inputCls} />
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

function TabPotong({ gajianId, karyawanList, gajian, onRefresh }) {
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

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);
  const isManual = !!(gajian.manual_overrides ?? {})["potong"]?.aktif;

  return (
    <>
      <ManualOverrideBar timKey="potong" gajian={gajian} sistemTotal={sistemTotal} onSaved={onRefresh} />
      {!isManual && (
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
                <TotalBar label="Total Tim Potong" value={sistemTotal} />
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
  const [kartus, setKartus]   = useState(
    initial?.kartu_items?.length
      ? initial.kartu_items.map((it) => ({ _o: it, kode: "", warna: "", ukuran: "", jumlah: "", upah: it.upah ?? 20000 }))
      : [newKartu()]
  );
  const [permaks, setPermaks] = useState(
    initial?.permak_items?.length
      ? initial.permak_items.map((it) => ({ _o: it, keterangan: "", jumlah: "", upah: "" }))
      : []
  );
  const [saving, setSaving]   = useState(false);

  const setKartu  = (i, k, v) => setKartus((p)  => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const setPermak = (i, k, v) => setPermaks((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const rKartuNum  = (it, k) => it[k] !== "" ? Number(it[k]) : (Number(it._o?.[k]) || 0);
  const rPermakNum = (it, k) => it[k] !== "" ? Number(it[k]) : (Number(it._o?.[k]) || 0);

  const totalKartu  = kartus.reduce((s, it)  => s + rKartuNum(it, "jumlah")  * (Number(it.upah) || 0), 0);
  const totalPermak = permaks.reduce((s, it) => s + rPermakNum(it, "jumlah") * rPermakNum(it, "upah"), 0);
  const total = totalKartu + totalPermak;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId, karyawan_id: karyawanId,
        kartu_items: kartus
          .filter((it) => it.jumlah !== "" || it._o?.jumlah)
          .map((it) => ({
            kode:   it.kode   !== "" ? it.kode   : (it._o?.kode   ?? ""),
            warna:  it.warna  !== "" ? it.warna  : (it._o?.warna  ?? ""),
            ukuran: it.ukuran !== "" ? it.ukuran : (it._o?.ukuran ?? ""),
            jumlah: rKartuNum(it, "jumlah"),
            upah:   it.upah,
          })),
        permak_items: permaks
          .filter((it) => it.jumlah !== "" || it._o?.jumlah)
          .map((it) => ({
            keterangan: it.keterangan !== "" ? it.keterangan : (it._o?.keterangan ?? ""),
            jumlah: rPermakNum(it, "jumlah"),
            upah:   rPermakNum(it, "upah"),
          })),
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
                    <input type="text" value={it.kode} onChange={(e) => setKartu(i, "kode", e.target.value)} placeholder={it._o?.kode || "D-07-OSK"} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Ukuran</label>
                    <input type="text" value={it.ukuran} onChange={(e) => setKartu(i, "ukuran", e.target.value)} placeholder={it._o?.ukuran || "Midi"} className={inputCls} />
                  </div>
                </div>
                {/* Baris 2: warna + jumlah */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className={labelCls}>Warna</label>
                    <input type="text" value={it.warna} onChange={(e) => setKartu(i, "warna", e.target.value)} placeholder={it._o?.warna || "HITAM"} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Jumlah (pcs)</label>
                    <input type="number" min="0" value={it.jumlah} onChange={(e) => setKartu(i, "jumlah", e.target.value)} placeholder={it._o?.jumlah != null ? String(it._o.jumlah) : "0"} className={inputCls} />
                  </div>
                </div>
                {/* Upah range */}
                <RangeSlider
                  label="Upah / pcs"
                  value={Number(it.upah) || 20000} min={20000} max={35000} step={1000}
                  marks={JAHIT_MARKS}
                  onChange={(v) => setKartu(i, "upah", v)}
                />
                {rKartuNum(it, "jumlah") > 0 && (
                  <p className="font-editorial text-xs text-skin-text3 text-right">
                    Subtotal: {fmtRp(rKartuNum(it, "jumlah") * (Number(it.upah) || 0))}
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

function TabJahit({ gajianId, karyawanList, gajian, onRefresh }) {
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

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);
  const isManual = !!(gajian.manual_overrides ?? {})["jahit"]?.aktif;
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
      <ManualOverrideBar timKey="jahit" gajian={gajian} sistemTotal={sistemTotal} onSaved={onRefresh} />
      {!isManual && (
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
                <TotalBar label="Total Tim Jahit" value={sistemTotal} />
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
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB FINISHING (satu per gajian, no karyawan)
// ─────────────────────────────────────────────────────────────────────────────

const newProduk = () => ({ nama_produk: "", jumlah: "", kancing_qty: "" });

function FinishingForm({ gajianId, initial, onSave, onClose }) {
  const [cfg, setCfg] = useState(DEFAULT_FINANCE_CONFIG);
  useEffect(() => { getFinanceConfig().then(setCfg); }, []);
  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map((it) => ({ _o: it, nama_produk: "", jumlah: "", kancing_qty: "" }))
      : [newProduk()]
  );
  const [saving, setSaving] = useState(false);
  const [produkList, setProdukList] = useState([]);
  useEffect(() => {
    supabase.from("products").select("kode, nama").order("kode")
      .then(({ data }) => setProdukList(data ?? []));
  }, []);

  const setItem = (i, k, v) => setItems((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const rItemNum = (it, k) => it[k] !== "" ? Number(it[k]) : (Number(it._o?.[k]) || 0);
  const total = calcUpahFinishing(items.map((it) => ({
    jumlah:      rItemNum(it, "jumlah"),
    kancing_qty: rItemNum(it, "kancing_qty"),
  })), cfg);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        items: items
          .filter((it) => it.jumlah !== "" || it._o?.jumlah)
          .map((it) => ({
            nama_produk: it.nama_produk !== "" ? it.nama_produk : (it._o?.nama_produk ?? ""),
            jumlah:      rItemNum(it, "jumlah"),
            kancing_qty: rItemNum(it, "kancing_qty"),
          })),
        total_upah: total,
      };
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
        <div className="bg-skin-raised px-3 py-2.5 space-y-1">
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {[
              ["Gosok",        cfg.tarif_gosok],
              ["Lipat",        cfg.tarif_lipat],
              ["Buang Benang", cfg.tarif_buang_benang],
              ["Pasang Pin",   cfg.tarif_pasang_pin],
              ["Hangtag/Kode", cfg.tarif_hangtag],
              ["Seri",         cfg.tarif_seri],
            ].map(([lbl, val]) => (
              <p key={lbl} className="font-editorial text-[11px] text-skin-text3">{lbl}: <span className="text-skin-text">{fmtRp(val)}</span></p>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5 border-t border-skin-bdr-lt">
            <p className="font-editorial text-[11px] text-skin-text3">Total/pcs: <span className="text-[#CAB170] font-semibold">{fmtRp(calcFinishingPerPcs(cfg))}</span></p>
            <p className="font-editorial text-[11px] text-skin-text3">Kancing/buah: <span className="text-skin-text">{fmtRp(cfg.tarif_kancing)}</span></p>
          </div>
        </div>

        {/* Product items */}
        {items.map((it, i) => (
          <div key={i} className="bg-skin-raised p-3 space-y-2">
            <div className="space-y-1">
              <label className={labelCls}>Nama Produk (opsional)</label>
              <select value={it.nama_produk} onChange={(e) => setItem(i, "nama_produk", e.target.value)} className={inputCls}>
                <option value="">{it._o?.nama_produk ? `↩ ${it._o.nama_produk}` : "— Pilih produk —"}</option>
                {produkList.map((p) => (
                  <option key={p.kode} value={p.kode}>{p.kode}{p.nama ? ` — ${p.nama}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Jumlah Produk (pcs)</label>
              <input type="number" min="0" value={it.jumlah} onChange={(e) => setItem(i, "jumlah", e.target.value)} placeholder={it._o?.jumlah != null ? String(it._o.jumlah) : "0"} className={inputCls} />
              {rItemNum(it, "jumlah") > 0 && (
                <p className="font-editorial text-[11px] text-skin-text3">
                  {rItemNum(it, "jumlah")} pcs × {fmtRp(calcFinishingPerPcs(cfg))} = <span className="text-skin-text font-semibold">{fmtRp(rItemNum(it, "jumlah") * calcFinishingPerPcs(cfg))}</span>
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Jumlah Kancing (buah)</label>
              <input type="number" min="0" value={it.kancing_qty} onChange={(e) => setItem(i, "kancing_qty", e.target.value)} placeholder={it._o?.kancing_qty != null ? String(it._o.kancing_qty) : "0"} className={inputCls} />
              {rItemNum(it, "kancing_qty") > 0 && (
                <p className="font-editorial text-[11px] text-skin-text3">
                  {rItemNum(it, "kancing_qty")} buah × {fmtRp(cfg.tarif_kancing)} = <span className="text-skin-text font-semibold">{fmtRp(rItemNum(it, "kancing_qty") * cfg.tarif_kancing)}</span>
                </p>
              )}
            </div>
            {(rItemNum(it, "jumlah") > 0 || rItemNum(it, "kancing_qty") > 0) && (
              <div className="flex items-center justify-between border-t border-skin-bdr-lt pt-1.5">
                <span className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Subtotal</span>
                <span className="font-headline text-[#CAB170] text-sm leading-none">{fmtRp(rItemNum(it, "jumlah") * calcFinishingPerPcs(cfg) + rItemNum(it, "kancing_qty") * cfg.tarif_kancing)}</span>
              </div>
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

function TabFinishing({ gajianId, gajian, onRefresh }) {
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

  const sistemTotal = record?.total_upah ?? 0;
  const isManual = !!(gajian.manual_overrides ?? {})["finishing"]?.aktif;

  return (
    <>
      <ManualOverrideBar timKey="finishing" gajian={gajian} sistemTotal={sistemTotal} onSaved={onRefresh} />
      {!isManual && <div className="flex items-center justify-between mb-3">
        <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3">Tim Finishing</p>
        <p className="font-editorial text-[10px] text-skin-text4">1 entri per periode</p>
      </div>}
      {!isManual && <>
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
                    <p className="font-editorial text-xs text-skin-text3">
                      {it.jumlah ?? 0} pcs finishing{(it.kancing_qty ?? 0) > 0 ? ` + ${it.kancing_qty} kancing` : ""}
                    </p>
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
      </>}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB QC — per karyawan, menggunakan gaji_qc
// ─────────────────────────────────────────────────────────────────────────────

function QCForm({ gajianId, initial, karyawanList, onSave, onClose }) {
  const [cfg, setCfg] = useState(DEFAULT_FINANCE_CONFIG);
  useEffect(() => { getFinanceConfig().then(setCfg); }, []);
  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [namaProduk, setNamaProduk] = useState(initial?.nama_produk ?? "");
  const [jumlahPcs, setJumlahPcs]   = useState(initial?.jumlah_pcs != null ? "" : "");
  const [catatan, setCatatan]       = useState("");
  const [saving, setSaving] = useState(false);
  const [produkList, setProdukList] = useState([]);
  useEffect(() => {
    supabase.from("products").select("kode, nama").order("kode")
      .then(({ data }) => setProdukList(data ?? []));
  }, []);

  const rPcs = jumlahPcs !== "" ? Number(jumlahPcs) : (initial?.jumlah_pcs ?? 0);
  const total = rPcs * cfg.tarif_qc;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = {
        gajian_id:   gajianId,
        karyawan_id: karyawanId,
        nama_produk: namaProduk || null,
        jumlah_pcs:  rPcs,
        total_upah:  total,
        catatan:     catatan.trim() || initial?.catatan || null,
      };
      const { error } = initial?.id
        ? await supabase.from("gaji_qc").update(payload).eq("id", initial.id)
        : await supabase.from("gaji_qc").insert(payload);
      if (error) throw error;
      toast.success("QC disimpan.");
      onSave();
    } catch (err) { toast.error("Gagal: " + err.message); }
    finally { setSaving(false); }
  }

  const qcKaryawan = karyawanList.filter((k) => k.tim === "qc");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Produk</label>
          <select value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)} className={inputCls}>
            <option value="">{initial?.nama_produk ? `↩ ${initial.nama_produk}` : "— Pilih produk —"}</option>
            {produkList.map((p) => (
              <option key={p.kode} value={p.kode}>{p.kode}{p.nama ? ` — ${p.nama}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Karyawan</label>
          <select value={karyawanId} onChange={(e) => setKaryawanId(e.target.value)} required className={inputCls}>
            <option value="">— Pilih Karyawan —</option>
            {qcKaryawan.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
            {qcKaryawan.length === 0 && (
              <option disabled>Belum ada karyawan Tim QC</option>
            )}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Jumlah QC (pcs)</label>
          <input type="number" min="0" value={jumlahPcs} onChange={(e) => setJumlahPcs(e.target.value)}
            placeholder={initial?.jumlah_pcs != null ? String(initial.jumlah_pcs) : "0"} className={inputCls} />
          {rPcs > 0 && (
            <p className="font-editorial text-[11px] text-skin-text3">
              {rPcs} pcs × {fmtRp(cfg.tarif_qc)} = <span className="text-skin-text font-semibold">{fmtRp(total)}</span>
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Catatan (opsional)</label>
          <input type="text" value={catatan} onChange={(e) => setCatatan(e.target.value)}
            placeholder={initial?.catatan || "—"} className={inputCls} />
        </div>
        <TotalBar label={`${rPcs} pcs × ${fmtRp(cfg.tarif_qc)}`} value={total} />
      </div>
      <ModalFooter onCancel={onClose} saving={saving} />
    </form>
  );
}

function TabQC({ gajianId, karyawanList, gajian, onRefresh }) {
  const [rows, setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("gaji_qc").select("*, karyawan(nama)").eq("gajian_id", gajianId).order("created_at");
    setRows(data ?? []);
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  async function del(id) { if (!confirm("Hapus?")) return; await supabase.from("gaji_qc").delete().eq("id", id); load(); }

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);
  const isManual = !!(gajian.manual_overrides ?? {})["qa"]?.aktif;

  return (
    <>
      <ManualOverrideBar timKey="qa" gajian={gajian} sistemTotal={sistemTotal} onSaved={onRefresh} />
      {!isManual && (
        <>
          <TabHeader title="Tim QC" onAdd={() => setForm("new")} />
          {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Memuat...</p> :
            rows.length === 0 ? (
              <p className="text-sm text-skin-text3 py-6 text-center">Belum ada data. <button onClick={() => setForm("new")} className="text-[#CAB170] underline">+ Tambah</button></p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <EntryCard key={r.id} nama={r.karyawan?.nama ?? "—"} sub={`${r.nama_produk ? r.nama_produk + " · " : ""}${r.jumlah_pcs ?? 0} pcs`} amount={r.total_upah}
                    onEdit={() => setForm(r)} onDelete={() => del(r.id)} />
                ))}
                <TotalBar label="Total Tim QC" value={sistemTotal} />
              </div>
            )
          }
          {form && (
            <Modal title={form === "new" ? "Tambah Tim QC" : `Edit — ${form.karyawan?.nama ?? ""}`} onClose={() => setForm(null)}>
              <QCForm gajianId={gajianId} initial={form === "new" ? null : form} karyawanList={karyawanList}
                onSave={() => { setForm(null); load(); }} onClose={() => setForm(null)} />
            </Modal>
          )}
        </>
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
  const [video, setVideo] = useState("");
  const [foto,  setFoto]  = useState("");
  const [logo,  setLogo]  = useState("");
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState(DEFAULT_FINANCE_CONFIG);
  useEffect(() => { getFinanceConfig().then(setCfg); }, []);

  const rVideo = video !== "" ? Number(video) : (initial?.jumlah_video ?? 0);
  const rFoto  = foto  !== "" ? Number(foto)  : (initial?.jumlah_foto  ?? 0);
  const rLogo  = logo  !== "" ? Number(logo)  : (initial?.jumlah_logo  ?? 0);
  const total  = calcUpahKreatif({ jumlah_video: rVideo, jumlah_foto: rFoto, jumlah_logo: rLogo }, cfg);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = { gajian_id: gajianId, karyawan_id: karyawanId, jumlah_video: rVideo, jumlah_foto: rFoto, jumlah_logo: rLogo, total_upah: total };
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
          {[
            ["Video",    video, setVideo, `×${fmtRp(cfg.tarif_video)}`, String(initial?.jumlah_video ?? "0")],
            ["Foto Seri",foto,  setFoto,  `×${fmtRp(cfg.tarif_foto)}`,  String(initial?.jumlah_foto  ?? "0")],
            ["Logo",     logo,  setLogo,  `×${fmtRp(cfg.tarif_logo)}`,  String(initial?.jumlah_logo  ?? "0")],
          ].map(([lbl, val, set, hint, ph]) => (
            <div key={lbl} className="space-y-1.5">
              <label className={labelCls}>{lbl}</label>
              <input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder={ph} className={inputCls} />
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

function TabKreatif({ gajianId, karyawanList, gajian, onRefresh }) {
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

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);
  const isManual = !!(gajian.manual_overrides ?? {})["kreatif"]?.aktif;
  const desc = (r) => [r.jumlah_video && `${r.jumlah_video}v`, r.jumlah_foto && `${r.jumlah_foto}f`, r.jumlah_logo && `${r.jumlah_logo}l`].filter(Boolean).join(" · ");

  return (
    <>
      <ManualOverrideBar timKey="kreatif" gajian={gajian} sistemTotal={sistemTotal} onSaved={onRefresh} />
      {!isManual && (
        <>
          <TabHeader title="Tim Kreatif" onAdd={() => setForm("new")} />
          {loading ? <p className="text-sm text-skin-text3 py-6 text-center">Memuat...</p> :
            rows.length === 0 ? <p className="text-sm text-skin-text3 py-6 text-center">Belum ada data. <button onClick={() => setForm("new")} className="text-[#CAB170] underline">+ Tambah</button></p> : (
              <div className="space-y-2">
                {rows.map((r) => <EntryCard key={r.id} nama={r.karyawan?.nama ?? "—"} sub={desc(r)} amount={r.total_upah} onEdit={() => setForm(r)} onDelete={() => del(r.id)} />)}
                <TotalBar label="Total Tim Kreatif" value={sistemTotal} />
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
    nama_vendor:    "",
    tanggal_kirim:  initial?.tanggal_kirim  ?? "",
    tanggal_terima: initial?.tanggal_terima ?? "",
    jumlah_kirim:   "",
    jumlah_terima:  "",
    harga_upah:     "",
    catatan:        "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const rNum = (k) => f[k] !== "" ? Number(f[k]) : (initial?.[k] ?? 0);
  const rStr = (k) => f[k] !== "" ? f[k] : (initial?.[k] ?? "");
  const total = rNum("jumlah_terima") * rNum("harga_upah");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        nama_vendor:    rStr("nama_vendor").trim() || null,
        tanggal_kirim:  f.tanggal_kirim  || null,
        tanggal_terima: f.tanggal_terima || null,
        jumlah_kirim:   rNum("jumlah_kirim"),
        jumlah_terima:  rNum("jumlah_terima"),
        harga_upah:     rNum("harga_upah"),
        total_upah:     total,
        catatan:        rStr("catatan").trim() || null,
      };
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
          <input type="text" value={f.nama_vendor} onChange={(e) => set("nama_vendor", e.target.value)} placeholder={initial?.nama_vendor || "Nama vendor"} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelCls}>Tgl Kirim</label><input type="date" value={f.tanggal_kirim} onChange={(e) => set("tanggal_kirim", e.target.value)} className={inputCls} /></div>
          <div className="space-y-1.5"><label className={labelCls}>Tgl Terima</label><input type="date" value={f.tanggal_terima} onChange={(e) => set("tanggal_terima", e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelCls}>Jml Kirim</label><input type="number" min="0" value={f.jumlah_kirim} onChange={(e) => set("jumlah_kirim", e.target.value)} placeholder={initial?.jumlah_kirim != null ? String(initial.jumlah_kirim) : "0"} className={inputCls} /></div>
          <div className="space-y-1.5"><label className={labelCls}>Jml Terima</label><input type="number" min="0" value={f.jumlah_terima} onChange={(e) => set("jumlah_terima", e.target.value)} placeholder={initial?.jumlah_terima != null ? String(initial.jumlah_terima) : "0"} className={inputCls} /></div>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Upah / pcs (Rp)</label>
          <input type="number" min="0" value={f.harga_upah} onChange={(e) => set("harga_upah", e.target.value)} placeholder={initial?.harga_upah != null ? String(initial.harga_upah) : "0"} className={inputCls} />
        </div>
        <div className="space-y-1.5"><label className={labelCls}>Catatan</label><input type="text" value={f.catatan} onChange={(e) => set("catatan", e.target.value)} placeholder={initial?.catatan || "Opsional"} className={inputCls} /></div>
        <TotalBar label={`${rNum("jumlah_terima")} pcs × ${fmtRp(rNum("harga_upah"))}`} value={total} />
      </div>
      <ModalFooter onCancel={onClose} saving={saving} />
    </form>
  );
}

function TabCmt({ gajianId, gajian, onRefresh }) {
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

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);
  const isManual = !!(gajian.manual_overrides ?? {})["cmt"]?.aktif;

  return (
    <>
      <ManualOverrideBar timKey="cmt" gajian={gajian} sistemTotal={sistemTotal} onSaved={onRefresh} />
      {!isManual && (
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
                <TotalBar label="Total CMT" value={sistemTotal} />
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
  const [kasbon, setKasbon]     = useState([]);
  const [kasbonDeds, setKasbonDeds] = useState(
    () => Object.fromEntries((gajian.kasbon_deductions ?? []).map((d) => [d.kasbon_id, String(d.jumlah)]))
  );

  // Load kasbon belum lunas untuk karyawan yang ada di gajian ini
  useEffect(() => {
    (async () => {
      const [p, j, q, k] = await Promise.all([
        supabase.from("gaji_potong").select("karyawan_id").eq("gajian_id", gajianId),
        supabase.from("gaji_jahit").select("karyawan_id").eq("gajian_id", gajianId),
        supabase.from("gaji_qc").select("karyawan_id").eq("gajian_id", gajianId),
        supabase.from("gaji_kreatif").select("karyawan_id").eq("gajian_id", gajianId),
      ]);
      const ids = [...new Set([
        ...(p.data ?? []).map((r) => r.karyawan_id),
        ...(j.data ?? []).map((r) => r.karyawan_id),
        ...(q.data ?? []).map((r) => r.karyawan_id),
        ...(k.data ?? []).map((r) => r.karyawan_id),
      ].filter(Boolean))];
      if (!ids.length) return;
      const { data } = await supabase
        .from("kasbon")
        .select("id, karyawan_id, jumlah, sisa, cicilan, keterangan, karyawan(nama)")
        .in("karyawan_id", ids)
        .eq("status", "belum")
        .gt("sisa", 0)
        .order("tanggal");
      setKasbon(data ?? []);
    })();
  }, [gajianId]);

  const setTamb = (i, k, v) => setTambahan((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const load = useCallback(async () => {
    setLoading(true);
    const [p, j, f, q, k, c] = await Promise.all([
      supabase.from("gaji_potong").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_jahit").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_finishing").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_qc").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_kreatif").select("total_upah").eq("gajian_id", gajianId),
      supabase.from("gaji_cmt").select("total_upah").eq("gajian_id", gajianId),
    ]);
    const sum = (res) => (res.data ?? []).reduce((s, r) => s + (r.total_upah || 0), 0);
    const ov = gajian.manual_overrides ?? {};
    const pick = (key, res) => ov[key]?.aktif ? (ov[key]?.jumlah ?? 0) : sum(res);
    const t = {
      potong:    pick("potong",    p),
      jahit:     pick("jahit",     j),
      finishing: pick("finishing", f),
      qa:        pick("qa",        q),
      kreatif:   pick("kreatif",   k),
      cmt:       pick("cmt",       c),
    };
    t.gaji = Object.values(t).reduce((s, v) => s + v, 0);
    setTotals(t);
    setLoading(false);
  }, [gajianId]);

  useEffect(() => { load(); }, [load]);

  const sumTambahan = tambahan.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
  const sumKasbonDed = kasbon.reduce((s, kb) => s + Math.min(Number(kasbonDeds[kb.id]) || 0, kb.sisa), 0);
  const totalRequest = (totals?.gaji ?? 0) + (Number(pettycash) || 0) + sumTambahan - sumKasbonDed;

  async function handleSaveRequest() {
    setSaving(true);
    try {
      const { error } = await supabase.from("gajian_minggu").update({
        pettycash: Number(pettycash) || 0,
        tambahan: tambahan.filter((it) => it.label || it.jumlah),
        kasbon_deductions: kasbon
          .filter((kb) => Number(kasbonDeds[kb.id]) > 0)
          .map((kb) => ({
            kasbon_id: kb.id,
            karyawan_id: kb.karyawan_id,
            nama: kb.karyawan?.nama ?? "",
            jumlah: Math.min(Number(kasbonDeds[kb.id]) || 0, kb.sisa),
          })),
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
      const deds = kasbon
        .filter((kb) => Number(kasbonDeds[kb.id]) > 0)
        .map((kb) => ({
          kasbon_id: kb.id,
          karyawan_id: kb.karyawan_id,
          nama: kb.karyawan?.nama ?? "",
          jumlah: Math.min(Number(kasbonDeds[kb.id]) || 0, kb.sisa),
        }));
      const { error } = await supabase.from("gajian_minggu").update({
        status: "final",
        total_potong:    totals.potong,
        total_jahit:     totals.jahit,
        total_finishing: totals.finishing,
        total_qa:        totals.qa,
        total_kreatif:   totals.kreatif,
        total_cmt:       totals.cmt,
        total_gaji:      totals.gaji,
        pettycash: Number(pettycash) || 0,
        tambahan: tambahan.filter((it) => it.label || it.jumlah),
        kasbon_deductions: deds,
        total_request: totalRequest,
      }).eq("id", gajianId);
      if (error) throw error;
      // Terapkan potongan kasbon sebagai cicilan
      for (const ded of deds) {
        const kb = kasbon.find((k) => k.id === ded.kasbon_id);
        if (!kb) continue;
        const newSisa = Math.max(0, kb.sisa - ded.jumlah);
        const newCicilan = [...(kb.cicilan ?? []), {
          tanggal: new Date().toISOString().slice(0, 10),
          jumlah: ded.jumlah,
          keterangan: `Potongan gajian ${gajian.tanggal_sabtu}`,
        }];
        await supabase.from("kasbon").update({
          sisa: newSisa,
          status: newSisa === 0 ? "lunas" : "belum",
          cicilan: newCicilan,
        }).eq("id", ded.kasbon_id);
      }
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
    ["Tim QC",        totals?.qa],
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

              {/* Potongan Kasbon */}
              {kasbon.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Potongan Kasbon</label>
                  </div>
                  <div className="space-y-2">
                    {kasbon.map((kb) => (
                      <div key={kb.id} className="bg-skin-raised border border-skin-bdr p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-editorial text-xs font-semibold text-skin-text">{kb.karyawan?.nama ?? "—"}</p>
                          <p className="font-editorial text-xs text-amber-500">Sisa: {fmtRp(kb.sisa)}</p>
                        </div>
                        {kb.keterangan && <p className="font-editorial text-[10px] text-skin-text3 mb-1.5">{kb.keterangan}</p>}
                        <input
                          type="number" min="0" max={kb.sisa}
                          value={kasbonDeds[kb.id] ?? ""}
                          onChange={(e) => setKasbonDeds((p) => ({ ...p, [kb.id]: e.target.value }))}
                          placeholder="0"
                          className={inputCls}
                        />
                        {Number(kasbonDeds[kb.id]) > 0 && (
                          <p className="font-editorial text-[10px] text-red-400 mt-1">
                            − {fmtRp(Math.min(Number(kasbonDeds[kb.id]), kb.sisa))} dipotong dari gaji
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" onClick={handleSaveRequest} disabled={saving}
                className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition disabled:opacity-50">
                {saving ? "Menyimpan..." : "Simpan Pettycash, Tambahan & Kasbon"}
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
            {isFinal
              ? (gajian.kasbon_deductions ?? []).filter((d) => d.jumlah > 0).map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="font-editorial text-sm text-red-400 truncate min-w-0">− Kasbon {d.nama || ""}</span>
                    <span className="font-editorial text-sm text-red-400 shrink-0">−{fmtRp(d.jumlah)}</span>
                  </div>
                ))
              : kasbon.filter((kb) => Number(kasbonDeds[kb.id]) > 0).map((kb) => (
                  <div key={kb.id} className="flex items-center justify-between gap-2">
                    <span className="font-editorial text-sm text-red-400 truncate min-w-0">− Kasbon {kb.karyawan?.nama ?? ""}</span>
                    <span className="font-editorial text-sm text-red-400 shrink-0">−{fmtRp(Math.min(Number(kasbonDeds[kb.id]) || 0, kb.sisa))}</span>
                  </div>
                ))
            }
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
      {/* Tab nav — pills, wrappable */}
      <div className="flex flex-wrap gap-1 mb-4">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 font-editorial text-[10px] tracking-[0.12em] uppercase border transition ${
              activeTab === tab
                ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                : "border-skin-bdr text-skin-text3"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Potong"    && <TabPotong    gajianId={id} karyawanList={karyawanList} gajian={gajian} onRefresh={load} />}
      {activeTab === "Jahit"     && <TabJahit     gajianId={id} karyawanList={karyawanList} gajian={gajian} onRefresh={load} />}
      {activeTab === "Finishing" && <TabFinishing  gajianId={id} gajian={gajian} onRefresh={load} />}
      {activeTab === "QC"        && <TabQC        gajianId={id} karyawanList={karyawanList} gajian={gajian} onRefresh={load} />}
      {activeTab === "Kreatif"   && <TabKreatif   gajianId={id} karyawanList={karyawanList} gajian={gajian} onRefresh={load} />}
      {activeTab === "CMT"       && <TabCmt       gajianId={id} gajian={gajian} onRefresh={load} />}
      {activeTab === "Ringkasan" && <TabRingkasan gajianId={id} gajian={gajian} onRefresh={load} />}
    </FinanceLayout>
  );
}
