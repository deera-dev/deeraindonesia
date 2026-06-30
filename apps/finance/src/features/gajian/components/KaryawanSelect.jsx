import { timLabel } from "../../karyawan";
import { inputCls } from "../../../shared/lib/format";

/**
 * KaryawanSelect.jsx — Dropdown karyawan terfilter per tim (timFilter), dengan
 * fallback ke daftar penuh bila tidak ada karyawan di tim tersebut.
 */
export default function KaryawanSelect({ value, onChange, list, timFilter }) {
  const filtered = list.filter((k) => k.tim === timFilter);
  const opts = filtered.length > 0 ? filtered : list;

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">Pilih karyawan...</option>
      {opts.map((k) => (
        <option key={k.id} value={k.id}>
          {k.nama}
          {k.tim !== timFilter ? ` (${timLabel(k.tim)})` : ""}
        </option>
      ))}
    </select>
  );
}
