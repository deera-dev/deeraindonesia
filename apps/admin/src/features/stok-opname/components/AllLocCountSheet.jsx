import { useEffect, useRef, useState } from "react";
import { blockingOver, buildAllLocChanged, changedToFullRows, LOCS, SIZE_ORDER } from "../utils";

export default function AllLocCountSheet({ product, rows, onClose, onSubmit, onCheck }) {
  const [entries, setEntries] = useState({});
  const [saving, setSaving] = useState(false);
  const [over, setOver] = useState([]);
  const bodyRef = useRef(null);

  const sizes = [...new Set(rows.map((r) => r.size))].sort(
    (a, b) => (SIZE_ORDER[a] ?? 99) - (SIZE_ORDER[b] ?? 99),
  );
  const changed = buildAllLocChanged(entries, rows);
  const changedCount = Object.keys(changed).length;
  const delta = Object.entries(changed).reduce((acc, [id, vals]) => {
    const row = rows.find((r) => String(r.id) === id);
    for (const [loc, n] of Object.entries(vals))
      acc[loc] = (acc[loc] ?? 0) + (n - (row?.[loc] ?? 0));
    return acc;
  }, {});
  const key = JSON.stringify(changed);
  const blocked = blockingOver(over, changed, rows);

  useEffect(() => {
    let cancelled = false;
    if (changedCount === 0 || !onCheck) {
      setOver([]);
      return undefined;
    }
    onCheck(changedToFullRows(changed, rows))
      .then((r) => !cancelled && setOver(r?.over ?? []))
      .catch(() => !cancelled && setOver([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function save() {
    setSaving(true);
    try {
      await onSubmit({ changed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-mono text-base font-bold text-skin-text">{product.kode}</h2>
            <p className="text-xs text-skin-text3 truncate">
              {product.nama} · <b>Semua lokasi</b>
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-2xl px-2 text-skin-text3">
            ×
          </button>
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
          <p className="px-4 py-2 text-xs text-skin-text3">
            Isi angka baru di lokasi yang berubah. Kolom kosong = tidak diubah.
          </p>
          {sizes.map((size) => (
            <section key={size} className="px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-skin-text2 mb-2">
                {size}
              </p>
              <div className="grid grid-cols-[1fr_repeat(3,64px)] gap-1.5 items-center text-[10px] uppercase text-skin-text3 mb-1">
                <span />
                {LOCS.map((l) => (
                  <span key={l.key} className="text-center">
                    {l.key === "tegalgubug" ? "TG" : l.key === "cideng" ? "CD" : "GD"}
                  </span>
                ))}
              </div>
              {rows
                .filter((r) => r.size === size)
                .map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[1fr_repeat(3,64px)] gap-1.5 items-center py-1"
                  >
                    <span className="text-sm text-skin-text2 truncate">
                      {r.warna === "_" ? "Belum dibagi warna" : r.warna}
                    </span>
                    {LOCS.map((l) => (
                      <input
                        key={l.key}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        aria-label={`${r.warna}, ${size}, ${l.label}`}
                        placeholder={String(r[l.key] ?? 0)}
                        value={entries[`${r.id}:${l.key}`] ?? ""}
                        onChange={(e) =>
                          setEntries((p) => ({ ...p, [`${r.id}:${l.key}`]: e.target.value }))
                        }
                        className="w-full text-center bg-skin-page border border-skin-bdr py-1.5 text-sm text-skin-text focus:outline-none focus:border-skin-accent placeholder:text-skin-text4"
                      />
                    ))}
                  </div>
                ))}
            </section>
          ))}
          {sizes.length === 0 && (
            <p className="px-4 py-6 text-sm text-skin-text4 italic">
              Belum ada data stok untuk produk ini.
            </p>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">
          {changedCount > 0 && (
            <p className="text-sm text-skin-text2 text-center" data-testid="all-summary">
              {LOCS.map(
                (l) => `${l.label} ${(delta[l.key] ?? 0) > 0 ? "+" : ""}${delta[l.key] ?? 0}`,
              ).join(" · ")}
            </p>
          )}
          {over.length > 0 && (
            <div
              data-testid="all-over"
              className="text-xs px-2 py-1.5 border border-red-500/40 bg-red-500/10 text-red-500"
            >
              {over.map((o) => (
                <p key={o.size}>
                  {o.size}: stok jadi {o.total_after} + terjual {o.sold} melebihi produksi{" "}
                  {o.produced} (lebih {o.excess}).
                </p>
              ))}
            </div>
          )}
          {blocked.length > 0 && (
            <p className="text-xs text-red-500" data-testid="all-blocked">
              Tidak bisa disimpan: kurangi angka sampai stok + terjual ≤ produksi.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-3 border-2 border-skin-bdr text-sm uppercase tracking-[0.1em] text-skin-text2"
            >
              Batal
            </button>
            <button
              onClick={save}
              disabled={saving || changedCount === 0 || blocked.length > 0}
              className="flex-1 py-3 bg-skin-accent text-skin-on-accent text-sm tracking-[0.1em] uppercase font-semibold hover:bg-skin-accent-hover disabled:opacity-40"
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
