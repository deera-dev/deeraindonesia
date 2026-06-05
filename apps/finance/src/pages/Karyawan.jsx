/**
 * Karyawan.jsx — CRUD master data karyawan.
 * Kolom: nama, tim, no_rekening, nama_bank, aktif
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { toast } from "@deera/shared/lib/toast";
import FinanceLayout from "../components/FinanceLayout";
import { TIM_OPTIONS, timLabel, inputCls, labelCls } from "../lib/financeUtils";

// ── Form modal ────────────────────────────────────────────────────────────────
function KaryawanForm({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    nama:        initial?.nama        ?? "",
    tim:         initial?.tim         ?? "jahit",
    no_rekening: initial?.no_rekening ?? "",
    nama_bank:   initial?.nama_bank   ?? "",
    aktif:       initial?.aktif       ?? true,
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error("Nama wajib diisi."); return; }
    setSaving(true);
    try {
      const payload = {
        nama:        form.nama.trim(),
        tim:         form.tim,
        no_rekening: form.no_rekening.trim() || null,
        nama_bank:   form.nama_bank.trim()   || null,
        aktif:       form.aktif,
      };
      if (isEdit) {
        const { error } = await supabase.from("karyawan").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success(`${form.nama.trim()} berhasil diperbarui.`);
      } else {
        const { error } = await supabase.from("karyawan").insert(payload);
        if (error) throw error;
        toast.success(`${form.nama.trim()} berhasil ditambahkan.`);
      }
      onSave();
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col max-h-[90dvh]">
        {/* header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            {isEdit ? "Edit Karyawan" : "Tambah Karyawan"}
          </h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 transition text-2xl leading-none">×</button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {/* Nama */}
            <div className="space-y-1.5">
              <label className={labelCls}>Nama Karyawan *</label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                placeholder="NAMA LENGKAP"
                className={inputCls}
                required
              />
            </div>

            {/* Tim */}
            <div className="space-y-1.5">
              <label className={labelCls}>Tim</label>
              <select
                value={form.tim}
                onChange={(e) => set("tim", e.target.value)}
                className={inputCls}
              >
                {TIM_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* No Rekening */}
            <div className="space-y-1.5">
              <label className={labelCls}>No. Rekening</label>
              <input
                type="text"
                value={form.no_rekening}
                onChange={(e) => set("no_rekening", e.target.value)}
                placeholder="Nomor rekening bank"
                className={inputCls}
              />
            </div>

            {/* Nama Bank */}
            <div className="space-y-1.5">
              <label className={labelCls}>Nama Bank</label>
              <input
                type="text"
                value={form.nama_bank}
                onChange={(e) => set("nama_bank", e.target.value)}
                placeholder="BCA / BNI / Mandiri / ..."
                className={inputCls}
              />
            </div>

            {/* Aktif toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set("aktif", !form.aktif)}
                className={`w-10 h-6 rounded-full flex items-center transition-colors ${form.aktif ? "bg-[#CAB170]" : "bg-skin-bdr"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.aktif ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </div>
              <span className="font-editorial text-sm text-skin-text2">
                {form.aktif ? "Aktif" : "Tidak Aktif"}
              </span>
            </label>
          </div>

          {/* footer */}
          <div className="shrink-0 border-t border-skin-bdr px-5 pt-3 pb-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-skin-text transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Karyawan card ─────────────────────────────────────────────────────────────
function KaryawanCard({ k, onEdit, onToggleAktif }) {
  return (
    <div className={`bg-skin-card border border-skin-bdr p-4 ${!k.aktif ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-editorial text-sm font-semibold text-skin-text truncate">{k.nama}</p>
          <p className="font-editorial text-xs text-skin-text3 mt-0.5">{timLabel(k.tim)}</p>
          {(k.no_rekening || k.nama_bank) && (
            <p className="font-editorial text-xs text-skin-text3 mt-1">
              {[k.nama_bank, k.no_rekening].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!k.aktif && (
            <span className="font-editorial text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 border border-skin-bdr text-skin-text4">
              non-aktif
            </span>
          )}
          <button
            onClick={() => onEdit(k)}
            className="text-skin-text3 hover:text-[#CAB170] transition font-editorial text-xs tracking-[0.12em] uppercase px-2 py-1 border border-skin-bdr hover:border-[#CAB170]"
          >
            Edit
          </button>
          <button
            onClick={() => onToggleAktif(k)}
            className="text-skin-text3 hover:text-skin-text transition font-editorial text-xs tracking-[0.12em] uppercase px-2 py-1 border border-skin-bdr"
          >
            {k.aktif ? "Non-aktifkan" : "Aktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const TIM_ALL = [{ value: "semua", label: "Semua Tim" }, ...TIM_OPTIONS];

export default function Karyawan() {
  const [karyawan, setKaryawan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [filterTim, setFilterTim] = useState("semua");
  const [showNonAktif, setShowNonAktif] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("karyawan")
      .select("*")
      .order("tim")
      .order("nama");
    setKaryawan(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleAktif(k) {
    const { error } = await supabase
      .from("karyawan")
      .update({ aktif: !k.aktif })
      .eq("id", k.id);
    if (error) { toast.error("Gagal update: " + error.message); return; }
    toast.success(k.aktif ? "Karyawan dinonaktifkan." : "Karyawan diaktifkan.");
    load();
  }

  const filtered = karyawan.filter((k) => {
    if (!showNonAktif && !k.aktif) return false;
    if (filterTim !== "semua" && k.tim !== filterTim) return false;
    return true;
  });

  // Group by tim
  const byTim = filtered.reduce((acc, k) => {
    const t = k.tim ?? "lainnya";
    if (!acc[t]) acc[t] = [];
    acc[t].push(k);
    return acc;
  }, {});

  const headerAction = (
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Tambah
    </button>
  );

  return (
    <FinanceLayout title="Karyawan" headerAction={headerAction}>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {TIM_ALL.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterTim(t.value)}
              className={`px-3 py-1.5 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
                filterTim === t.value
                  ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                  : "border-skin-bdr text-skin-text3 hover:border-skin-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNonAktif((v) => !v)}
          className={`px-3 py-1.5 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
            showNonAktif
              ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
              : "border-skin-bdr text-skin-text3"
          }`}
        >
          + Non-aktif
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Tidak ada karyawan.</p>
      ) : (
        <div className="space-y-5">
          {Object.entries(byTim).map(([tim, list]) => (
            <div key={tim}>
              <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3 mb-2">
                {timLabel(tim)} · {list.length} orang
              </p>
              <div className="space-y-2">
                {list.map((k) => (
                  <KaryawanCard
                    key={k.id}
                    k={k}
                    onEdit={setEditTarget}
                    onToggleAktif={handleToggleAktif}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah */}
      {showForm && (
        <KaryawanForm
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); load(); }}
        />
      )}

      {/* Modal Edit */}
      {editTarget && (
        <KaryawanForm
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); load(); }}
        />
      )}
    </FinanceLayout>
  );
}
