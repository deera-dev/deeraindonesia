import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { useEffect, useState } from "react";
import { inputCls, labelCls } from "../../../shared/lib/format";
import {
  useApplyFinishingStockIntake,
  useLoadFinishingReconciliation,
  useProdukList,
} from "../hooks";
import { autoSelectIfSingle, newManualReconciliationRow, recalcReconciliationRow } from "../utils";
import { AutoKodeSummary } from "./AutoKodeSummary";
import { Modal } from "./Modal";

function RowEditor({ row, sizeOptions, warnaOptions, editable, onChange, onRemove }) {
  const [qtyDraft, setQtyDraft] = useState(row.cardId ? String(row.qtyKartu) : "");

  function handleQtyChange(raw) {
    setQtyDraft(raw);
    onChange({ ...row, qtyKartu: raw === "" ? 0 : raw });
  }

  return (
    <div className="bg-skin-raised p-2.5 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Ukuran</label>
          {editable ? (
            <select
              value={row.size}
              onChange={(e) => onChange({ ...row, size: e.target.value })}
              className={inputCls}
            >
              <option value="">— Pilih —</option>
              {sizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-skin-text py-2">{row.size}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Warna</label>
          {editable ? (
            <select
              value={row.warna}
              onChange={(e) => onChange({ ...row, warna: e.target.value })}
              className={inputCls}
            >
              <option value="">— Pilih —</option>
              {warnaOptions.map((w) => (
                <option key={w} value={w}>
                  {w === "_" ? "(tanpa warna)" : w}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-skin-text py-2">
              {row.warna === "_" ? "(tanpa warna)" : row.warna}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelCls}>Qty Kartu (pcs)</label>
        <input
          type="number"
          min="0"
          value={qtyDraft}
          onChange={(e) => handleQtyChange(e.target.value)}
          placeholder={String(row.qtyKartuPlaceholder ?? 0)}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-3 gap-1 text-[11px] text-skin-text3 border-t border-skin-bdr-lt pt-1.5">
        <span>
          Stok saat ini: <b className="text-skin-text2">{row.stokSaatIni}</b>
        </span>
        <span>
          Sudah terjual: <b className="text-skin-text2">{row.terjualSaatIni}</b>
        </span>
        <span>
          → Tambah Gudang: <b className="text-skin-accent-text">{row.qtyDitambahkan}</b>
        </span>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] font-editorial text-red-400 hover:text-red-500 transition"
        >
          − Hapus baris
        </button>
      )}
    </div>
  );
}

export default function FinishingStockModal({ items, gajianFinishingId, onClose }) {
  const { user } = useAuth();
  const { produkList } = useProdukList();
  const loadReconciliation = useLoadFinishingReconciliation();
  const { apply, applying } = useApplyFinishingStockIntake();

  const [loading, setLoading] = useState(true);
  const [kodeStates, setKodeStates] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await loadReconciliation(items);
        if (!cancelled) setKodeStates(result);
      } catch (err) {
        if (!cancelled) toast.error("Gagal memuat data rekonsiliasi: " + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRow(kode, index, nextRow) {
    setKodeStates((prev) => {
      const state = prev[kode];
      const recalced = recalcReconciliationRow(nextRow, state.soldRows, state.stokRows);
      const rows = state.rows.map((r, i) => (i === index ? recalced : r));
      return { ...prev, [kode]: { ...state, rows } };
    });
  }

  function addManualRow(kode) {
    const produk = produkList.find((p) => p.kode === kode);
    const sizeOptions = (produk?.variants ?? []).map((v) => v.size).filter(Boolean);
    const effectiveSizeOptions = sizeOptions.length ? sizeOptions : SIZE_PRESETS.map((s) => s.size);
    const warnaOptions = produk?.warna?.length ? produk.warna : ["_"];

    setKodeStates((prev) => {
      const state = prev[kode];
      let row = newManualReconciliationRow(kode, {
        size: autoSelectIfSingle(effectiveSizeOptions),
        warna: autoSelectIfSingle(warnaOptions),
      });
      if (row.size && row.warna) {
        row = recalcReconciliationRow(row, state.soldRows, state.stokRows);
      }
      return { ...prev, [kode]: { ...state, rows: [...state.rows, row] } };
    });
  }

  function removeRow(kode, index) {
    setKodeStates((prev) => {
      const state = prev[kode];
      return { ...prev, [kode]: { ...state, rows: state.rows.filter((_, i) => i !== index) } };
    });
  }

  async function handleConfirm() {
    const rows = Object.values(kodeStates).flatMap((s) => s.rows.filter((r) => r.size && r.warna));
    try {
      await apply({
        rows,
        gajianFinishingId,
        userEmail: user?.email,
        userName: user?.user_metadata?.full_name ?? user?.email,
      });
      toast.success("Stok Gudang berhasil disinkronkan.");
      onClose();
    } catch (err) {
      toast.error("Gagal update stok: " + err.message);
    }
  }

  const totalTambah = Object.values(kodeStates).reduce(
    (s, state) => s + state.rows.reduce((a, r) => a + (Number(r.qtyDitambahkan) || 0), 0),
    0,
  );

  const sortedStates = Object.values(kodeStates).sort(
    (a, b) => Number(b.mismatch) - Number(a.mismatch),
  );
  const perluCekCount = sortedStates.filter((st) => st.mismatch).length;
  const cocokCount = sortedStates.length - perluCekCount;

  return (
    <Modal title="Rekonsiliasi Stok Finishing" onClose={onClose} maxWidth="md:max-w-2xl">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <p className="text-xs text-skin-text3">
          Breakdown size/warna diambil otomatis dari kartu Jahit. Kode yang totalnya cocok dengan
          Finance langsung siap; cukup cek kode yang ditandai ⚠.
        </p>

        {loading ? (
          <p className="text-sm text-skin-text3 text-center py-8">Memuat rekonsiliasi...</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                ✓ {cocokCount} kode cocok otomatis
              </span>
              {perluCekCount > 0 && (
                <span className="px-2 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30">
                  ⚠ {perluCekCount} kode perlu dicek
                </span>
              )}
            </div>
            {sortedStates.map((state) => {
              const produk = produkList.find((p) => p.kode === state.kode);
              const sizeOptions = (produk?.variants ?? []).map((v) => v.size).filter(Boolean);
              const warnaOptions = produk?.warna?.length ? produk.warna : ["_"];
              if (!state.mismatch && !expanded[state.kode]) {
                return (
                  <AutoKodeSummary
                    key={state.kode}
                    state={state}
                    onEdit={() => setExpanded((prev) => ({ ...prev, [state.kode]: true }))}
                  />
                );
              }
              return (
                <div key={state.kode} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-skin-text">
                      {state.kode} — {state.nama}
                    </p>
                    <p className="text-xs text-skin-text3">Finance: {state.jumlahFinance} pcs</p>
                  </div>
                  {state.mismatch && (
                    <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-2">
                      <p className="text-[11px] text-amber-600 leading-snug">
                        {state.cardsSum > 0
                          ? `⚠ Kartu Jahit utk kode ini totalnya ${state.cardsSum} pcs, beda dengan catatan Finance (${state.jumlahFinance} pcs). Cek/koreksi baris di bawah.`
                          : `⚠ Tidak ada kartu Jahit utk kode ini. Isi baris di bawah secara manual (${state.jumlahFinance} pcs menurut Finance).`}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {state.rows.map((row, i) => (
                      <RowEditor
                        key={i}
                        row={row}
                        sizeOptions={
                          sizeOptions.length ? sizeOptions : SIZE_PRESETS.map((s) => s.size)
                        }
                        warnaOptions={warnaOptions}
                        editable={!row.cardId}
                        onChange={(next) => updateRow(state.kode, i, next)}
                        onRemove={!row.cardId ? () => removeRow(state.kode, i) : null}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addManualRow(state.kode)}
                    className="font-editorial text-xs tracking-[0.12em] uppercase text-skin-accent-text hover:text-skin-accent-text transition"
                  >
                    + Tambah baris manual
                  </button>
                </div>
              );
            })}
          </>
        )}

        {!loading && (
          <p className="text-sm font-semibold text-skin-text text-right border-t border-skin-bdr-lt pt-3">
            Total tambah ke Gudang: <span className="text-skin-accent-text">{totalTambah} pcs</span>
          </p>
        )}
      </div>
      <div className="shrink-0 border-t border-skin-bdr px-4 pt-3 pb-4 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={applying}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50 transition"
        >
          Lewati
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={applying || loading}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-50"
        >
          {applying ? "Menyimpan..." : "Konfirmasi & Update Stok"}
        </button>
      </div>
    </Modal>
  );
}
