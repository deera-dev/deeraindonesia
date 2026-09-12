/**
 * FinishingStockModal.jsx — Rekonsiliasi stok Gudang otomatis setelah entri
 * Finishing disimpan (permintaan Denny 2026-09).
 *
 * Breakdown size/warna diambil dari kartu Kanban Jahit (status
 * "ready_finishing") milik kode yang sama — form Finishing sendiri cuma
 * catat kode+jumlah total pcs, tidak ada size/warna. Kalau total qty kartu
 * TIDAK sama dengan jumlah yang dicatat Finance (atau belum ada kartu sama
 * sekali), kode itu ditandai "mismatch" dan admin bisa koreksi/tambah baris
 * manual sebelum konfirmasi.
 *
 * Utk tiap baris, sistem hitung "qty ditambahkan ke Gudang" = qty kartu
 * dikurangi (stok yang sudah ada di semua lokasi + yang sudah terjual) —
 * supaya barang yang sudah keburu dibawa ke pasar/terjual sebelum Finishing
 * resmi selesai tidak dihitung dobel (lihat buildReconciliationRow di
 * ../utils.js).
 */
import { useEffect, useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { toast } from "@deera/shared/features/toast/hooks";
import { inputCls, labelCls } from "../../../shared/lib/format";
import { useApplyFinishingStockIntake, useLoadFinishingReconciliation, useProdukList } from "../hooks";
import { newManualReconciliationRow, recalcReconciliationRow } from "../utils";
import { Modal } from "./Modal";

function RowEditor({ row, sizeOptions, warnaOptions, editable, onChange, onRemove }) {
  return (
    <div className="bg-skin-raised p-2.5 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Ukuran</label>
          {editable ? (
            <select value={row.size} onChange={(e) => onChange({ ...row, size: e.target.value })} className={inputCls}>
              <option value="">— Pilih —</option>
              {sizeOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-skin-text py-2">{row.size}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Warna</label>
          {editable ? (
            <select value={row.warna} onChange={(e) => onChange({ ...row, warna: e.target.value })} className={inputCls}>
              <option value="">— Pilih —</option>
              {warnaOptions.map((w) => (
                <option key={w} value={w}>{w === "_" ? "(tanpa warna)" : w}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-skin-text py-2">{row.warna === "_" ? "(tanpa warna)" : row.warna}</p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelCls}>Qty Kartu (pcs)</label>
        <input
          type="number"
          min="0"
          value={row.qtyKartu}
          onChange={(e) => onChange({ ...row, qtyKartu: e.target.value })}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-3 gap-1 text-[11px] text-skin-text3 border-t border-skin-bdr-lt pt-1.5">
        <span>Stok saat ini: <b className="text-skin-text2">{row.stokSaatIni}</b></span>
        <span>Sudah terjual: <b className="text-skin-text2">{row.terjualSaatIni}</b></span>
        <span>→ Tambah Gudang: <b className="text-[#CAB170]">{row.qtyDitambahkan}</b></span>
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-[11px] font-editorial text-red-400 hover:text-red-500 transition">
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
    // items dari satu penyimpanan Finishing — sengaja hanya jalan sekali saat modal dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRow(kode, index, nextRow) {
    setKodeStates((prev) => {
      const state = prev[kode];
      // soldRows/stokRows = data mentah lintas SEMUA size+warna kode ini dari
      // hasil load awal (lihat buildKodeReconciliation di ../utils.js) — jadi
      // kalau admin ganti size/warna baris manual, stok/terjual-nya tetap
      // ke-lookup benar tanpa perlu fetch ulang.
      const recalced = recalcReconciliationRow(nextRow, state.soldRows, state.stokRows);
      const rows = state.rows.map((r, i) => (i === index ? recalced : r));
      return { ...prev, [kode]: { ...state, rows } };
    });
  }

  function addManualRow(kode) {
    setKodeStates((prev) => {
      const state = prev[kode];
      return { ...prev, [kode]: { ...state, rows: [...state.rows, newManualReconciliationRow(kode)] } };
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

  return (
    <Modal title="Rekonsiliasi Stok Finishing" onClose={onClose} maxWidth="md:max-w-2xl">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <p className="text-xs text-skin-text3">
          Breakdown size/warna diambil dari kartu Jahit yang siap finishing. Cek dulu angkanya sebelum stok Gudang
          berubah.
        </p>

        {loading ? (
          <p className="text-sm text-skin-text3 text-center py-8">Memuat rekonsiliasi...</p>
        ) : (
          Object.values(kodeStates).map((state) => {
            const produk = produkList.find((p) => p.kode === state.kode);
            const sizeOptions = (produk?.variants ?? []).map((v) => v.size).filter(Boolean);
            const warnaOptions = produk?.warna?.length ? produk.warna : ["_"];
            return (
              <div key={state.kode} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-skin-text">{state.kode} — {state.nama}</p>
                  <p className="text-xs text-skin-text3">Finance: {state.jumlahFinance} pcs</p>
                </div>
                {state.mismatch && (
                  <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-2">
                    <p className="text-[11px] text-amber-600 leading-snug">
                      ⚠ Kartu Jahit Ready Finishing utk kode ini totalnya {state.cardsSum} pcs, beda dengan
                      catatan Finance ({state.jumlahFinance} pcs). Cek/koreksi baris di bawah secara manual.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {state.rows.map((row, i) => (
                    <RowEditor
                      key={i}
                      row={row}
                      sizeOptions={sizeOptions.length ? sizeOptions : SIZE_PRESETS.map((s) => s.size)}
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
                  className="font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
                >
                  + Tambah baris manual
                </button>
              </div>
            );
          })
        )}

        {!loading && (
          <p className="text-sm font-semibold text-skin-text text-right border-t border-skin-bdr-lt pt-3">
            Total tambah ke Gudang: <span className="text-[#CAB170]">{totalTambah} pcs</span>
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
          className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
        >
          {applying ? "Menyimpan..." : "Konfirmasi & Update Stok"}
        </button>
      </div>
    </Modal>
  );
}
