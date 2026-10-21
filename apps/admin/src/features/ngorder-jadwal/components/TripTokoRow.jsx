import { useState } from "react";
import { buildTokoWaHref, parseSosmed } from "../hooks";
import SosmedLinks from "../../../shared/components/SosmedLinks";

const PRIO_CLS = {
  A: "bg-emerald-500/20 text-emerald-500 border-emerald-500/40",
  B: "bg-amber-500/20 text-amber-500 border-amber-500/40",
  C: "bg-skin-raised text-skin-text3 border-skin-bdr",
};

function NoHpEditor({ toko, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(toko.no_hp ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(toko.toko_id, value);
      setEditing(false);
    } catch {
      setEditing(true);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(toko.no_hp ?? "");
          setEditing(true);
        }}
        className="text-[11px] text-skin-text3 underline"
      >
        {toko.no_hp ? `☎ ${toko.no_hp} · ubah` : "+ Nomor toko"}
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1.5 flex-wrap">
      <input
        type="tel"
        inputMode="tel"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="08xxxxxxxxxx"
        aria-label={`Nomor ${toko.nama}`}
        className="w-36 bg-skin-page border border-skin-bdr px-2 py-1 text-xs text-skin-text focus:outline-none focus:border-skin-accent"
      />
      <button type="submit" disabled={saving} className="text-[11px] px-2 py-1 bg-skin-accent text-skin-on-accent disabled:opacity-50">
        Simpan
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-[11px] text-skin-text3 underline">
        Batal
      </button>
    </form>
  );
}

export default function TripTokoRow({ trip, toko: t, info, onToggle, onRemove, onSaveNoHp }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Tandai dikunjungi"
        className={`flex-shrink-0 w-7 h-7 border-2 flex items-center justify-center text-sm font-bold ${
          t.dikunjungi ? "bg-skin-accent border-skin-accent text-skin-on-accent" : "border-skin-bdr text-transparent"
        }`}
      >
        ✓
      </button>
      <span className="flex-shrink-0 w-6 text-center text-xs font-bold text-skin-text3 tabular-nums">#{t.rank}</span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-sm font-medium ${t.dikunjungi ? "text-skin-text3 line-through" : "text-skin-text"}`}>{t.nama}</p>
          {info ? (
            <span
              className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
              title={info.produk?.length ? `Produk dilihat: ${info.produk.join(", ")}` : ""}
            >
              ✓ Dibuka{info.produk?.length ? ` · ${info.produk.length} produk` : ""}
            </span>
          ) : (
            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-skin-raised text-skin-text4 border border-skin-bdr">Belum dibuka</span>
          )}
        </div>
        <SosmedLinks items={parseSosmed(t.media_sosial, t.nama)} />
        {t.skor != null && <p className="text-[11px] text-skin-text4">Skor {t.skor}</p>}
        {onSaveNoHp && <NoHpEditor toko={t} onSave={onSaveNoHp} />}
        <a
          href={buildTokoWaHref(trip, t)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Bagikan katalog ke ${t.nama}`}
          className="block text-[11px] text-green-600 underline"
        >
          {t.no_hp ? "Kirim katalog ke WA toko" : "Bagikan katalog"}
        </a>
      </div>
      {t.prioritas && (
        <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 border ${PRIO_CLS[t.prioritas] ?? PRIO_CLS.C}`} aria-label={`Prioritas ${t.prioritas}`}>
          {t.prioritas}
        </span>
      )}
      <button type="button" onClick={onRemove} aria-label="Hapus" className="flex-shrink-0 text-skin-text3 hover:text-red-500 text-xl leading-none px-1">
        ×
      </button>
    </div>
  );
}
