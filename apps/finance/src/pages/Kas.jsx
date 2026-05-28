/**
 * Kas.jsx — Pencatatan uang masuk & keluar.
 * Filter: bulan, jenis (masuk/keluar)
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { toast } from "@deera/shared/lib/toast";
import FinanceLayout from "../components/FinanceLayout";
import { fmtRp, fmtTanggalPendek, inputCls, labelCls } from "../lib/financeUtils";

// ── Form ──────────────────────────────────────────────────────────────────────
const KATEGORI_OPTIONS = [
  "Gaji", "Bahan", "Operasional", "CMT", "Sewa", "Lainnya"
];

function KasForm({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    tanggal:    initial?.tanggal    ?? new Date().toISOString().slice(0, 10),
    jenis:      initial?.jenis      ?? "keluar",
    kategori:   initial?.kategori   ?? "Operasional",
    keterangan: "",
    jumlah:     "",
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const rJumlah = form.jumlah !== "" ? Number(form.jumlah) : (initial?.jumlah ?? 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (rJumlah <= 0) { toast.error("Jumlah harus lebih dari 0."); return; }
    setSaving(true);
    try {
      const payload = {
        tanggal:    form.tanggal,
        jenis:      form.jenis,
        kategori:   form.kategori,
        keterangan: form.keterangan.trim() || initial?.keterangan || null,
        jumlah:     rJumlah,
      };
      if (isEdit) {
        const { error } = await supabase.from("kas").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Entri kas diperbarui.");
      } else {
        const { error } = await supabase.from("kas").insert(payload);
        if (error) throw error;
        toast.success("Entri kas dicatat.");
      }
      onSave();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col max-h-[90dvh]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            {isEdit ? "Edit Kas" : "Catat Kas"}
          </h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {/* Jenis toggle */}
            <div className="space-y-1.5">
              <label className={labelCls}>Jenis</label>
              <div className="flex gap-2">
                {["masuk", "keluar"].map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => set("jenis", j)}
                    className={`flex-1 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase border-2 transition ${
                      form.jenis === j
                        ? j === "masuk"
                          ? "border-emerald-500 text-emerald-500 bg-emerald-500/5"
                          : "border-red-400 text-red-400 bg-red-400/5"
                        : "border-skin-bdr text-skin-text3"
                    }`}
                  >
                    {j === "masuk" ? "↓ Masuk" : "↑ Keluar"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className={labelCls}>Tanggal</label>
              <input type="date" value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)} required className={inputCls} />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className={labelCls}>Kategori</label>
              <select value={form.kategori} onChange={(e) => set("kategori", e.target.value)} className={inputCls}>
                {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <label className={labelCls}>Keterangan</label>
              <input type="text" value={form.keterangan} onChange={(e) => set("keterangan", e.target.value)} placeholder={initial?.keterangan || "Deskripsi singkat"} className={inputCls} />
            </div>

            {/* Jumlah */}
            <div className="space-y-1.5">
              <label className={labelCls}>Jumlah (Rp)</label>
              <input type="number" min="1" value={form.jumlah} onChange={(e) => set("jumlah", e.target.value)} placeholder={initial?.jumlah != null ? String(initial.jumlah) : "0"} required className={inputCls} />
              {rJumlah > 0 && <p className="font-editorial text-xs text-skin-text3">{fmtRp(rJumlah)}</p>}
            </div>
          </div>

          <div className="shrink-0 border-t border-skin-bdr px-5 pt-3 pb-4 flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Kas() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [filterJenis, setFilterJenis] = useState("semua");
  const [filterBulan, setFilterBulan] = useState(() => new Date().toISOString().slice(0, 7));

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("kas").select("*").order("tanggal", { ascending: false }).order("created_at", { ascending: false });
    if (filterBulan) {
      const [year, month] = filterBulan.split("-");
      const start = `${year}-${month}-01`;
      const end = new Date(year, month, 0).toISOString().slice(0, 10);
      q = q.gte("tanggal", start).lte("tanggal", end);
    }
    if (filterJenis !== "semua") q = q.eq("jenis", filterJenis);
    const { data } = await q;
    setRows(data ?? []);
    setLoading(false);
  }, [filterBulan, filterJenis]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm("Hapus entri kas ini?")) return;
    await supabase.from("kas").delete().eq("id", id);
    toast.success("Entri dihapus.");
    load();
  }

  const totalMasuk  = rows.filter((r) => r.jenis === "masuk").reduce((s, r) => s + (r.jumlah || 0), 0);
  const totalKeluar = rows.filter((r) => r.jenis === "keluar").reduce((s, r) => s + (r.jumlah || 0), 0);
  const saldo = totalMasuk - totalKeluar;

  const headerAction = (
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Catat
    </button>
  );

  return (
    <FinanceLayout title="Kas" headerAction={headerAction}>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          type="month"
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="bg-skin-input border border-skin-bdr text-skin-text px-3 py-2 font-editorial text-sm outline-none focus:border-[#CAB170] transition"
        />
        {["semua", "masuk", "keluar"].map((j) => (
          <button
            key={j}
            onClick={() => setFilterJenis(j)}
            className={`px-3 py-1.5 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
              filterJenis === j ? "border-[#CAB170] text-[#CAB170] bg-skin-gold" : "border-skin-bdr text-skin-text3"
            }`}
          >
            {j === "semua" ? "Semua" : j === "masuk" ? "↓ Masuk" : "↑ Keluar"}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Masuk</p>
          <p className="font-headline text-emerald-500 text-base leading-none mt-1">{fmtRp(totalMasuk)}</p>
        </div>
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Keluar</p>
          <p className="font-headline text-red-400 text-base leading-none mt-1">{fmtRp(totalKeluar)}</p>
        </div>
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Saldo</p>
          <p className={`font-headline text-base leading-none mt-1 ${saldo >= 0 ? "text-[#CAB170]" : "text-red-400"}`}>{fmtRp(saldo)}</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Tidak ada transaksi kas.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-skin-card border border-skin-bdr p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-editorial text-[10px] tracking-[0.1em] uppercase ${r.jenis === "masuk" ? "text-emerald-500" : "text-red-400"}`}>
                      {r.jenis === "masuk" ? "↓" : "↑"} {r.jenis}
                    </span>
                    <span className="font-editorial text-[10px] text-skin-text4 uppercase tracking-wide">{r.kategori}</span>
                  </div>
                  <p className="font-editorial text-sm text-skin-text truncate">{r.keterangan ?? "—"}</p>
                  <p className="font-editorial text-xs text-skin-text3 mt-0.5">{fmtTanggalPendek(r.tanggal)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-headline text-base leading-none ${r.jenis === "masuk" ? "text-emerald-500" : "text-red-400"}`}>
                    {r.jenis === "masuk" ? "+" : "-"}{fmtRp(r.jumlah)}
                  </p>
                  <div className="flex gap-2 mt-1 justify-end">
                    <button onClick={() => setEditTarget(r)} className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3 hover:text-[#CAB170] transition">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="font-editorial text-[10px] uppercase tracking-wide text-red-400 hover:text-red-600 transition">Hapus</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <KasForm onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(); }} />}
      {editTarget && <KasForm initial={editTarget} onClose={() => setEditTarget(null)} onSave={() => { setEditTarget(null); load(); }} />}
    </FinanceLayout>
  );
}
