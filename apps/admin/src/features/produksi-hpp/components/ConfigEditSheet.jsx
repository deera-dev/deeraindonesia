/**
 * ConfigEditSheet.jsx — Bottom Sheet edit satu nilai Harga Dasar.
 * Satu field angka besar + disclaimer (copy dipertahankan dari desain lama,
 * sudah jelas) + meta terakhir diubah + Batal/Simpan.
 */
import { useState } from "react";
import { fieldFullCls } from "../utils";
import BottomSheet from "../../../shared/components/BottomSheet";

function fmtTanggal(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

export default function ConfigEditSheet({ row, onClose, onSave, saving }) {
  const [val, setVal] = useState(String(row.nilai ?? 0));
  const tanggal = fmtTanggal(row.updated_at);
  const isDirty = Number(val) !== row.nilai;

  return (
    <BottomSheet
      title={row.label}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 font-editorial text-xs tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!isDirty || saving}
            onClick={() => onSave(row, Number(val))}
            className="flex-1 py-3 font-editorial text-xs tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] disabled:opacity-50 transition"
          >
            {saving ? "..." : "Simpan"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {row.keterangan && <p className="text-xs text-skin-text3">{row.keterangan}</p>}

        <div>
          <label className="block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1">
            Nilai (Rp)
          </label>
          <input
            type="number"
            min="0"
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className={fieldFullCls + " text-lg"}
          />
        </div>

        <p className="text-xs text-skin-text3 flex gap-1.5">
          <span aria-hidden="true">ⓘ</span>
          <span>
            Nilai ini cuma default untuk Template HPP baru. Tidak mengubah Template yang
            sudah tersimpan.
          </span>
        </p>

        {tanggal && (
          <p className="text-xs text-skin-text4">
            Diubah terakhir {tanggal}
            {row.updated_by ? ` oleh ${row.updated_by}` : ""}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
