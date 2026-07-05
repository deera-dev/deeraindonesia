/**
 * HistoryDiffs.jsx — Komponen diff untuk setiap kategori riwayat:
 *   Section, Pill, ChangeRow (shared)
 *   ProdukDiff, TransferDiff, StokDiff
 */

// ── Shared ─────────────────────────────────────────────────────────────────────
export function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-skin-text3 mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export function Pill({ children, className = "" }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 text-xs bg-skin-page border border-skin-bdr text-skin-text2 rounded-sm ${className}`}
    >
      {children}
    </span>
  );
}

export function ChangeRow({ label, before, after, afterRed = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold tracking-wide uppercase text-skin-text4">
        {label}
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-red-500 dark:text-red-400 line-through opacity-70">
          {before}
        </span>
        <span className="text-skin-text4 text-xs">→</span>
        <span
          className={`text-xs font-semibold ${afterRed ? "text-red-500 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
        >
          {after}
        </span>
      </div>
    </div>
  );
}

// ── Diff: produk ──────────────────────────────────────────────────────────────
export function ProdukDiff({ before, after }) {
  if (!before && !after) return null;

  const fields = [
    { key: "nama", label: "Nama" },
    { key: "bahan", label: "Bahan" },
    {
      key: "hpp",
      label: "HPP",
      fmt: (v) => (v !== null ? `Rp ${Number(v).toLocaleString("id-ID")}` : null),
    },
  ];
  const changedFields = fields
    .map(({ key, label, fmt }) => {
      const bRaw = before?.[key],
        aRaw = after?.[key];
      const bStr = fmt ? (fmt(bRaw) ?? "-") : (bRaw ?? "-");
      const aStr = fmt ? (fmt(aRaw) ?? "-") : (aRaw ?? "-");
      if (String(bStr) === String(aStr)) return null;
      return { label, bStr, aStr };
    })
    .filter(Boolean);

  const bV = before?.variants ?? [],
    aV = after?.variants ?? [];
  const sizes = [...new Set([...bV.map((v) => v.size), ...aV.map((v) => v.size)])];
  const changedVariants = sizes
    .map((size) => {
      const b = bV.find((v) => v.size === size),
        a = aV.find((v) => v.size === size);
      const bH = b ? `Rp ${Number(b.harga).toLocaleString("id-ID")}` : null;
      const aH = a ? `Rp ${Number(a.harga).toLocaleString("id-ID")}` : null;
      if (bH === aH && !!b === !!a) return null;
      return { size, bH, aH, added: !b, removed: !a };
    })
    .filter(Boolean);

  const bW = (before?.warna ?? []).join(", ") || null;
  const aW = (after?.warna ?? []).join(", ") || null;
  const warnaChanged = bW !== aW;

  // Tambah baru (no before) — summary view
  if (!before) {
    const s = after ?? {};
    return (
      <div className="space-y-3">
        {(s.bahan || s.hpp !== null) && (
          <Section title="Info Produk">
            <div className="flex flex-wrap gap-2">
              {s.bahan && <Pill>{s.bahan}</Pill>}
              {s.hpp !== null && <Pill>HPP Rp {Number(s.hpp).toLocaleString("id-ID")}</Pill>}
            </div>
          </Section>
        )}
        {(s.variants ?? []).length > 0 && (
          <Section title="Ukuran">
            <div className="flex flex-wrap gap-2">
              {s.variants.map((v) => (
                <Pill key={v.size}>
                  {v.size} · Rp {Number(v.harga).toLocaleString("id-ID")}
                </Pill>
              ))}
            </div>
          </Section>
        )}
        {(s.warna ?? []).length > 0 && (
          <Section title="Warna">
            <div className="flex flex-wrap gap-2">
              {s.warna.map((w) => (
                <Pill key={w}>{w}</Pill>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }

  if (changedFields.length === 0 && changedVariants.length === 0 && !warnaChanged) {
    return (
      <p className="text-xs text-skin-text4 italic">Tidak ada perubahan field yang terdeteksi.</p>
    );
  }

  return (
    <div className="space-y-3">
      {changedFields.length > 0 && (
        <Section title="Perubahan">
          <div className="space-y-2">
            {changedFields.map(({ label, bStr, aStr }) => (
              <ChangeRow key={label} label={label} before={bStr} after={aStr} />
            ))}
          </div>
        </Section>
      )}
      {changedVariants.length > 0 && (
        <Section title="Perubahan Ukuran / Harga">
          <div className="space-y-2">
            {changedVariants.map(({ size, bH, aH, added, removed }) =>
              added ? (
                <ChangeRow key={size} label={size} before="—" after={aH} />
              ) : removed ? (
                <ChangeRow key={size} label={size} before={bH} after="dihapus" afterRed />
              ) : (
                <ChangeRow key={size} label={size} before={bH} after={aH} />
              ),
            )}
          </div>
        </Section>
      )}
      {warnaChanged && (
        <Section title="Perubahan Warna">
          <ChangeRow label="Warna" before={bW || "—"} after={aW || "—"} />
        </Section>
      )}
    </div>
  );
}

// ── Diff: transfer ────────────────────────────────────────────────────────────
export function TransferDiff({ before, after, action }) {
  const snap = after ?? before ?? {};
  const LOC = { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" };
  const total = (snap.items ?? []).reduce((s, i) => s + (i.qty ?? 0), 0);

  return (
    <div className="space-y-3">
      <Section title="Rincian Transfer">
        <div className="flex flex-wrap gap-2">
          <Pill>
            {LOC[snap.from_location] ?? snap.from_location} →{" "}
            {LOC[snap.to_location] ?? snap.to_location}
          </Pill>
          <Pill>{total} pcs</Pill>
          {snap.status && <Pill className="capitalize">{snap.status}</Pill>}
        </div>
        {snap.notes && <p className="mt-2 text-xs text-skin-text3 italic">{snap.notes}</p>}
        {action === "transfer-approve" && snap.approved_by && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
            ✓ Disetujui oleh {snap.approved_by}
          </p>
        )}
        {action === "transfer-reject" && snap.rejected_by && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium">
            ✗ Ditolak oleh {snap.rejected_by}
          </p>
        )}
      </Section>

      {(snap.items ?? []).length > 0 && (
        <Section title={`Item (${snap.items.length})`}>
          <div className="space-y-1.5">
            {snap.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-skin-page px-3 py-2 rounded-sm"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-skin-text">
                    {item.kode}
                  </span>
                  <span className="ml-2 text-xs text-skin-text3">{item.size}</span>
                  {item.warna && item.warna !== "_" && (
                    <span className="ml-1.5 text-xs text-skin-text4">{item.warna}</span>
                  )}
                </div>
                <span className="text-xs font-bold text-skin-text">{item.qty} pcs</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Diff: stok opname ─────────────────────────────────────────────────────────
export function StokDiff({ before, after }) {
  const bRows = before?.rows ?? [];
  const aRows = after?.rows ?? [];
  if (aRows.length === 0) return null;
  const LOC = { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" };

  return (
    <Section title={`Perubahan Stok (${aRows.length} varian)`}>
      <div className="space-y-2">
        {aRows.map((aRow, i) => {
          const bRow = bRows.find((r) => r.size === aRow.size && r.warna === aRow.warna);
          const bTot = bRow ? (bRow.gudang ?? 0) + (bRow.cideng ?? 0) + (bRow.tegalgubug ?? 0) : 0;
          const aTot = (aRow.gudang ?? 0) + (aRow.cideng ?? 0) + (aRow.tegalgubug ?? 0);
          const diff = aTot - bTot;

          return (
            <div key={i} className="bg-skin-page px-3 py-2.5 rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-skin-text uppercase">{aRow.size}</span>
                  {aRow.warna && aRow.warna !== "_" && (
                    <span className="text-xs text-skin-text3">{aRow.warna}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-skin-text3">{bTot}</span>
                  <span className="text-skin-text4">→</span>
                  <span className="font-semibold text-skin-text">{aTot} pcs</span>
                  {diff !== 0 && (
                    <span
                      className={`font-bold text-[11px] ${diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                    >
                      ({diff > 0 ? "+" : ""}
                      {diff})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["gudang", "cideng", "tegalgubug"].map((loc) => {
                  const bV = bRow?.[loc] ?? 0;
                  const aV = aRow[loc] ?? 0;
                  const d = aV - bV;
                  return (
                    <div key={loc} className="flex items-center gap-1 text-[11px]">
                      <span className="text-skin-text4">{LOC[loc]}:</span>
                      {d !== 0 ? (
                        <>
                          <span className="text-skin-text3 line-through">{bV}</span>
                          <span className="text-skin-text4">→</span>
                          <span
                            className={`font-semibold ${d > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                          >
                            {aV}
                          </span>
                        </>
                      ) : (
                        <span className="text-skin-text3">{aV}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
