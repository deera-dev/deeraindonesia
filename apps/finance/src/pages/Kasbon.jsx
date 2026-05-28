/**
 * Kasbon.jsx — Pinjaman karyawan, cicilan, status lunas/belum.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { toast } from "@deera/shared/lib/toast";
import FinanceLayout from "../components/FinanceLayout";
import { fmtRp, fmtTanggalPendek, inputCls, labelCls, loadKaryawanAktif } from "../lib/financeUtils";

// ── Kasbon Form (tambah/edit) ──────────────────────────────────────────────────
function KasbonForm({ initial, karyawanList, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [tanggal, setTanggal] = useState(initial?.tanggal ?? new Date().toISOString().slice(0, 10));
  const [jumlah, setJumlah] = useState(String(initial?.jumlah ?? ""));
  const [keterangan, setKeterangan] = useState(initial?.keterangan ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    if (!jumlah || Number(jumlah) <= 0) { toast.error("Jumlah harus lebih dari 0."); return; }
    setSaving(true);
    try {
      const payload = {
        karyawan_id: karyawanId,
        tanggal,
        jumlah: Number(jumlah),
        sisa: isEdit ? initial.sisa : Number(jumlah), // sisa stays if editing (managed via cicilan)
        keterangan: keterangan.trim() || null,
        status: "belum",
      };
      if (isEdit) {
        const { error } = await supabase.from("kasbon").update({ keterangan: payload.keterangan, tanggal: payload.tanggal }).eq("id", initial.id);
        if (error) throw error;
        toast.success("Kasbon diperbarui.");
      } else {
        const { error } = await supabase.from("kasbon").insert({ ...payload, cicilan: [] });
        if (error) throw error;
        toast.success("Kasbon dicatat.");
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
            {isEdit ? "Edit Kasbon" : "Kasbon Baru"}
          </h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Karyawan *</label>
              <select value={karyawanId} onChange={(e) => setKaryawanId(e.target.value)} className={inputCls} required disabled={isEdit}>
                <option value="">— Pilih karyawan —</option>
                {karyawanList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Tanggal Pinjam</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Jumlah Pinjam (Rp)</label>
              <input type="number" min="1" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="0" required disabled={isEdit} className={inputCls} />
              {jumlah && <p className="font-editorial text-xs text-skin-text3">{fmtRp(Number(jumlah) || 0)}</p>}
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Keterangan</label>
              <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Opsional" className={inputCls} />
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

// ── Cicilan Modal ─────────────────────────────────────────────────────────────
function CicilanModal({ kasbon, onClose, onSave }) {
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const bayar = Number(jumlah);
    if (!bayar || bayar <= 0) { toast.error("Jumlah cicilan harus > 0."); return; }
    if (bayar > kasbon.sisa) { toast.error(`Cicilan melebihi sisa (${fmtRp(kasbon.sisa)}).`); return; }
    setSaving(true);
    try {
      const newCicilan = [
        ...(kasbon.cicilan ?? []),
        { tanggal, jumlah: bayar, keterangan: keterangan.trim() || null },
      ];
      const newSisa = kasbon.sisa - bayar;
      const newStatus = newSisa <= 0 ? "lunas" : "belum";
      const { error } = await supabase.from("kasbon").update({
        cicilan: newCicilan,
        sisa: Math.max(0, newSisa),
        status: newStatus,
      }).eq("id", kasbon.id);
      if (error) throw error;
      toast.success(newStatus === "lunas" ? "Kasbon lunas!" : `Cicilan dicatat. Sisa: ${fmtRp(Math.max(0, newSisa))}`);
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
      <div className="relative bg-skin-card w-full max-w-md border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">Bayar Cicilan</h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="bg-skin-gold border border-skin-bdr-gold p-3 flex items-center justify-between">
            <span className="font-editorial text-xs text-skin-text3 uppercase tracking-wide">Sisa Kasbon</span>
            <span className="font-headline text-[#CAB170] text-lg leading-none">{fmtRp(kasbon.sisa)}</span>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Tanggal Bayar</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Jumlah Cicilan (Rp)</label>
            <input type="number" min="1" max={kasbon.sisa} value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="0" required className={inputCls} />
            {jumlah && <p className="font-editorial text-xs text-skin-text3">{fmtRp(Number(jumlah) || 0)}</p>}
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Keterangan</label>
            <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Potong gaji, dll" className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50">
              {saving ? "Menyimpan..." : "Bayar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Kasbon Card ───────────────────────────────────────────────────────────────
function KasbonCard({ k, onEdit, onCicilan, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const persen = k.jumlah > 0 ? Math.round(((k.jumlah - k.sisa) / k.jumlah) * 100) : 0;

  return (
    <div className={`bg-skin-card border ${k.status === "lunas" ? "border-emerald-500/30" : "border-skin-bdr"} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-editorial text-sm font-semibold text-skin-text">{k.karyawan?.nama ?? "—"}</p>
            <span className={`font-editorial text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 border ${
              k.status === "lunas" ? "border-emerald-500/40 text-emerald-500" : "border-amber-400/40 text-amber-400"
            }`}>
              {k.status}
            </span>
          </div>
          <p className="font-editorial text-xs text-skin-text3 mt-0.5">{fmtTanggalPendek(k.tanggal)}</p>
          {k.keterangan && <p className="font-editorial text-xs text-skin-text3">{k.keterangan}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="font-editorial text-xs text-skin-text3">Sisa</p>
          <p className={`font-headline text-base leading-none ${k.status === "lunas" ? "text-emerald-500" : "text-amber-500"}`}>{fmtRp(k.sisa)}</p>
          <p className="font-editorial text-xs text-skin-text4 mt-0.5">dari {fmtRp(k.jumlah)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-skin-raised rounded-full overflow-hidden">
        <div className="h-full bg-[#CAB170] rounded-full transition-all" style={{ width: `${persen}%` }} />
      </div>
      <p className="font-editorial text-[10px] text-skin-text4 mt-1">{persen}% terbayar</p>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {k.status !== "lunas" && (
          <button onClick={() => onCicilan(k)} className="font-editorial text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 border border-[#CAB170] text-[#CAB170] hover:bg-skin-gold transition">
            + Bayar Cicilan
          </button>
        )}
        <button onClick={() => setExpanded((v) => !v)} className="font-editorial text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 border border-skin-bdr text-skin-text3 hover:border-skin-text transition">
          {expanded ? "Tutup" : `Riwayat (${(k.cicilan ?? []).length})`}
        </button>
        <button onClick={() => onEdit(k)} className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3 hover:text-[#CAB170] transition">Edit</button>
        <button onClick={() => onDelete(k.id)} className="font-editorial text-[10px] uppercase tracking-wide text-red-400 hover:text-red-600 transition">Hapus</button>
      </div>

      {/* Riwayat cicilan */}
      {expanded && (k.cicilan ?? []).length > 0 && (
        <div className="mt-3 border-t border-skin-bdr-lt pt-3 space-y-1.5">
          {k.cicilan.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div>
                <p className="font-editorial text-xs text-skin-text2">{fmtTanggalPendek(c.tanggal)}</p>
                {c.keterangan && <p className="font-editorial text-[10px] text-skin-text3">{c.keterangan}</p>}
              </div>
              <p className="font-editorial text-sm text-emerald-500 shrink-0">{fmtRp(c.jumlah)}</p>
            </div>
          ))}
        </div>
      )}
      {expanded && (k.cicilan ?? []).length === 0 && (
        <p className="mt-3 font-editorial text-xs text-skin-text3 pt-3 border-t border-skin-bdr-lt">Belum ada cicilan.</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Kasbon() {
  const [rows, setRows] = useState([]);
  const [karyawanList, setKaryawanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [cicilanTarget, setCicilanTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState("belum");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, karyawan] = await Promise.all([
      supabase.from("kasbon").select("*, karyawan(nama, no_rekening, nama_bank)").order("tanggal", { ascending: false }),
      loadKaryawanAktif(),
    ]);
    setRows(data ?? []);
    setKaryawanList(karyawan);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm("Hapus kasbon ini?")) return;
    await supabase.from("kasbon").delete().eq("id", id);
    toast.success("Kasbon dihapus.");
    load();
  }

  const filtered = filterStatus === "semua" ? rows : rows.filter((r) => r.status === filterStatus);
  const totalSisa = rows.filter((r) => r.status === "belum").reduce((s, r) => s + (r.sisa || 0), 0);

  const headerAction = (
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Kasbon Baru
    </button>
  );

  return (
    <FinanceLayout title="Kasbon" headerAction={headerAction}>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Total Sisa</p>
          <p className="font-headline text-amber-500 text-base leading-none mt-1">{fmtRp(totalSisa)}</p>
        </div>
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Belum Lunas</p>
          <p className="font-headline text-skin-text text-base leading-none mt-1">
            {rows.filter((r) => r.status === "belum").length} orang
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["belum", "lunas", "semua"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex-1 py-2 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
              filterStatus === s ? "border-[#CAB170] text-[#CAB170] bg-skin-gold" : "border-skin-bdr text-skin-text3"
            }`}
          >
            {s === "belum" ? "Belum Lunas" : s === "lunas" ? "Lunas" : "Semua"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Tidak ada kasbon.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((k) => (
            <KasbonCard
              key={k.id}
              k={k}
              onEdit={setEditTarget}
              onCicilan={setCicilanTarget}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <KasbonForm karyawanList={karyawanList} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(); }} />
      )}
      {editTarget && (
        <KasbonForm initial={editTarget} karyawanList={karyawanList} onClose={() => setEditTarget(null)} onSave={() => { setEditTarget(null); load(); }} />
      )}
      {cicilanTarget && (
        <CicilanModal kasbon={cicilanTarget} onClose={() => setCicilanTarget(null)} onSave={() => { setCicilanTarget(null); load(); }} />
      )}
    </FinanceLayout>
  );
}
