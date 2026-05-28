/**
 * Pengaturan.jsx — Edit tarif upah dasar (base upah).
 * Nilai disimpan ke tabel finance_config di Supabase.
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "@deera/shared/lib/toast";
import FinanceLayout from "../components/FinanceLayout";
import {
  fmtRp,
  DEFAULT_FINANCE_CONFIG,
  FINANCE_CONFIG_META,
  loadFinanceConfig,
  saveFinanceConfigKey,
  clearConfigCache,
  inputCls,
  labelCls,
} from "../lib/financeUtils";

export default function Pengaturan() {
  const [values, setValues] = useState({ ...DEFAULT_FINANCE_CONFIG });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const cfg = await loadFinanceConfig();
    setValues(cfg);
    setDirty({});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleChange(key, raw) {
    setValues((v) => ({ ...v, [key]: raw }));
    setDirty((d) => ({ ...d, [key]: true }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const dirtyKeys = Object.keys(dirty).filter((k) => dirty[k]);
      if (dirtyKeys.length === 0) { toast.error("Tidak ada perubahan."); return; }
      await Promise.all(
        dirtyKeys.map((key) => saveFinanceConfigKey(key, Number(values[key]) || 0))
      );
      clearConfigCache();
      toast.success("Tarif upah disimpan.");
      setDirty({});
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("Reset semua tarif ke nilai default?")) return;
    setSaving(true);
    try {
      await Promise.all(
        FINANCE_CONFIG_META.map(({ key }) =>
          saveFinanceConfigKey(key, DEFAULT_FINANCE_CONFIG[key])
        )
      );
      clearConfigCache();
      toast.success("Tarif di-reset ke default.");
      await load();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const groups = [...new Set(FINANCE_CONFIG_META.map((m) => m.group))];
  const hasDirty = Object.values(dirty).some(Boolean);

  return (
    <FinanceLayout title="Pengaturan" subtitle="Tarif Upah">
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : (
        <div className="space-y-6 max-w-lg">
          {groups.map((group) => (
            <div key={group}>
              <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3 mb-3">
                {group}
              </p>
              <div className="space-y-3">
                {FINANCE_CONFIG_META.filter((m) => m.group === group).map(({ key, label }) => {
                  const val = values[key] ?? DEFAULT_FINANCE_CONFIG[key];
                  const isDirty = !!dirty[key];
                  return (
                    <div key={key} className="bg-skin-card border border-skin-bdr p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1.5">
                          <label className={`${labelCls} flex items-center gap-2`}>
                            {label}
                            {isDirty && (
                              <span className="text-[9px] px-1.5 py-0.5 border border-amber-400/50 text-amber-400 tracking-wide">
                                UBAH
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={val}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div className="shrink-0 text-right pt-6">
                          <p className="font-headline text-[#CAB170] text-base leading-none">
                            {fmtRp(Number(val) || 0)}
                          </p>
                          <p className="font-editorial text-[10px] text-skin-text4 mt-0.5">
                            default: {fmtRp(DEFAULT_FINANCE_CONFIG[key])}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-3 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text3 hover:border-red-400 hover:text-red-400 transition disabled:opacity-50"
            >
              Reset Default
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasDirty}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </FinanceLayout>
  );
}
