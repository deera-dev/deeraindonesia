/**
 * ChipInput.jsx — input multi-nilai (daerah, peserta): ketik lalu Enter/koma
 * jadi chip. `options` (opsional) jadi saran <datalist>.
 */
import { useState } from "react";

export default function ChipInput({ value, onChange, placeholder, options = [], listId }) {
  const [text, setText] = useState("");

  function commit(raw = text) {
    const v = raw.trim().replace(/,$/, "").trim();
    setText("");
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...value, v]);
  }

  return (
    <div className="bg-skin-page border border-skin-bdr px-2 py-1.5 flex flex-wrap items-center gap-1.5 focus-within:border-[#CAB170] transition">
      {value.map((v) => (
        <span key={v} className="flex items-center gap-1 text-xs px-2 py-1 bg-[#CAB170]/15 text-skin-text">
          {v}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Hapus ${v}`} className="text-skin-text3 hover:text-red-500">
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        list={listId}
        value={text}
        onChange={(e) => (e.target.value.endsWith(",") ? commit(e.target.value) : setText(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={() => commit()}
        placeholder={value.length ? "" : placeholder}
        className="flex-1 min-w-[90px] bg-transparent px-1 py-1 text-sm text-skin-text focus:outline-none"
      />
      {listId && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </div>
  );
}
