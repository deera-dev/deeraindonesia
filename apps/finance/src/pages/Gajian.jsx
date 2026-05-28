/**
 * Gajian.jsx — List periode gajian mingguan.
 * Klik untuk masuk ke detail, atau buat periode baru.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@deera/shared/lib/supabase";
import { toast } from "@deera/shared/lib/toast";
import FinanceLayout from "../components/FinanceLayout";
import { fmtRp, fmtTanggalPendek, getSabtu } from "../lib/financeUtils";

// ── Modal buat periode baru ───────────────────────────────────────────────────
function BuatPeriodeModal({ onClose, onSave }) {
  const [tanggal, setTanggal] = useState(getSabtu());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Cek duplikat
      const { data: exist } = await supabase
        .from("gajian_minggu")
        .select("id")
        .eq("tanggal_sabtu", tanggal)
        .maybeSingle();
      if (exist) {
        toast.error("Periode ini sudah ada.");
        return;
      }
      const { data, error } = await supabase
        .from("gajian_minggu")
        .insert({ tanggal_sabtu: tanggal, status: "draft" })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Periode gajian dibuat.");
      onSave(data.id);
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-sm border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">Periode Gajian Baru</h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="font-editorial text-xs tracking-[0.15em] uppercase text-skin-text3">
              Tanggal Sabtu (akhir minggu)
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full bg-skin-input border border-skin-bdr text-skin-text px-3 py-2.5 font-editorial text-sm outline-none focus:border-[#CAB170] transition"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
            >
              {saving ? "Membuat..." : "Buat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Gajian() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuat, setShowBuat] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gajian_minggu")
      .select("*")
      .order("tanggal_sabtu", { ascending: false });
    setList(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const headerAction = (
    <button
      onClick={() => setShowBuat(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Periode Baru
    </button>
  );

  return (
    <FinanceLayout title="Gajian" headerAction={headerAction}>
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : list.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-skin-text3">Belum ada periode gajian.</p>
          <button
            onClick={() => setShowBuat(true)}
            className="px-6 py-2.5 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-[#CAB170] text-[#CAB170] hover:bg-skin-gold transition"
          >
            Buat Periode Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((g) => (
            <div
              key={g.id}
              className="bg-skin-card border border-skin-bdr p-4 cursor-pointer hover:border-[#CAB170] transition"
              onClick={() => navigate(`/gajian/${g.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-editorial text-sm font-semibold text-skin-text">
                    Sabtu, {fmtTanggalPendek(g.tanggal_sabtu)}
                  </p>
                  <p className="font-headline text-[#CAB170] text-lg leading-none mt-1">
                    {g.total_gaji != null ? fmtRp(g.total_gaji) : "—"}
                  </p>
                </div>
                <span
                  className={`mt-0.5 font-editorial text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 border ${
                    g.status === "final"
                      ? "border-emerald-500/40 text-emerald-500"
                      : "border-amber-400/40 text-amber-400"
                  }`}
                >
                  {g.status}
                </span>
              </div>
              {g.total_gaji > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-0 mt-2">
                  {[
                    ["Potong", g.total_potong],
                    ["Jahit",  g.total_jahit],
                    ["Finishing", g.total_finishing],
                    ["Kreatif",   g.total_kreatif],
                    ["CMT",       g.total_cmt],
                  ].filter(([, v]) => v > 0).map(([label, val]) => (
                    <p key={label} className="font-editorial text-xs text-skin-text3">
                      {label}: {fmtRp(val)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showBuat && (
        <BuatPeriodeModal
          onClose={() => setShowBuat(false)}
          onSave={(id) => { setShowBuat(false); navigate(`/gajian/${id}`); }}
        />
      )}
    </FinanceLayout>
  );
}
