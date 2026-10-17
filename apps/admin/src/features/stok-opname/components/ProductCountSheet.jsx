import { useState, useRef, useEffect } from "react";
import SizeCountSection from "./SizeCountSection";
import DiffSummary from "./DiffSummary";
import { LOCS, SIZE_ORDER, computeSizeCount, buildChanged, dikerjakanKey, bukuCompare } from "../utils";

export default function ProductCountSheet({
  product,
  rows,
  loc,
  dikerjakanMap = {},
  buku = {},
  onClose,
  onSubmit,
  onPreviewOverflow,
  hasNext,
}) {
  const [entries, setEntries] = useState({});
  const [totals, setTotals] = useState({});
  const [step, setStep] = useState("isi");
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const bodyRef = useRef(null);
  const [overflowPlan, setOverflowPlan] = useState(null);

  const locLabel = LOCS.find((l) => l.key === loc)?.label ?? loc;
  const sizes = [...new Set(rows.map((r) => r.size))].sort(
    (a, b) => (SIZE_ORDER[a] ?? 99) - (SIZE_ORDER[b] ?? 99),
  );
  const bySize = (size) => rows.filter((r) => r.size === size);
  const results = sizes.map((size) =>
    computeSizeCount({
      kode: product.kode,
      size,
      sizeRows: bySize(size),
      loc,
      entries,
      totalRaw: totals[size] ?? "",
    }),
  );
  const changes = results.flatMap((r) => r.changes);
  const selisih = changes.reduce((s, c) => s + (c.next - c.old), 0);
  const dirty = Object.values(entries).some((v) => v !== "") || Object.values(totals).some((v) => v !== "");
  const anyOver = results.some((r) => r.over);
  const cmp = bukuCompare(buku, product.kode, rows, selisih);

  const changesKey = JSON.stringify(changes.map((c) => [c.row.id, c.next]));
  useEffect(() => {
    let cancelled = false;
    if (step !== "periksa" || !onPreviewOverflow || changes.length === 0) {
      setOverflowPlan(null);
      return undefined;
    }
    onPreviewOverflow(buildChanged(changes, loc))
      .then((plan) => !cancelled && setOverflowPlan(plan?.overflow ? plan : null))
      .catch(() => !cancelled && setOverflowPlan(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, changesKey, loc]);
  const gudangTake = (overflowPlan?.sizes ?? []).reduce((s, z) => s + Number(z.take_total || 0), 0);

  function handleKeyDown(e) {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const inputs = [...bodyRef.current.querySelectorAll("[data-count-input]")];
    inputs[inputs.indexOf(e.target) + 1]?.focus();
  }

  function tryClose() {
    if (dirty && !confirmClose) setConfirmClose(true);
    else onClose();
  }

  async function submit(next) {
    setSaving(true);
    try {
      await onSubmit({ changed: buildChanged(changes, loc), selisih, next });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={tryClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-mono text-base font-bold text-skin-text">{product.kode}</h2>
            <p className="text-xs text-skin-text3 truncate">
              {product.nama} · <b>{locLabel}</b> · {step === "isi" ? "Langkah 1/2: isi hitungan" : "Langkah 2/2: periksa"}
            </p>
          </div>
          <button onClick={tryClose} aria-label="Tutup" className="text-2xl px-2 text-skin-text3">
            ×
          </button>
        </div>

        <div ref={bodyRef} onKeyDown={handleKeyDown} className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
          {confirmClose && (
            <div className="px-4 py-3 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400" role="alert">
              Hitungan di layar ini belum disimpan.{" "}
              <button className="underline font-bold" onClick={onClose}>
                Tutup tanpa simpan
              </button>{" "}
              ·{" "}
              <button className="underline font-bold" onClick={() => setConfirmClose(false)}>
                Lanjut hitung
              </button>
            </div>
          )}
          {step === "isi" ? (
            sizes.length === 0 ? (
              <p className="px-4 py-6 text-sm text-skin-text4 italic">Belum ada data stok untuk produk ini.</p>
            ) : (
              sizes.map((size) => (
                <SizeCountSection
                  key={size}
                  kode={product.kode}
                  size={size}
                  sizeRows={bySize(size)}
                  loc={loc}
                  entries={entries}
                  totalRaw={totals[size] ?? ""}
                  dikerjakan={dikerjakanMap[dikerjakanKey(product.kode, size)] ?? 0}
                  buku={buku}
                  onEntry={(id, v) => setEntries((p) => ({ ...p, [id]: v }))}
                  onTotal={(sz, v) => setTotals((p) => ({ ...p, [sz]: v }))}
                />
              ))
            )
          ) : (
            <DiffSummary changes={changes} />
          )}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">
          {step === "periksa" && changes.length > 0 && (
            <p className="text-sm text-skin-text2 text-center">
              Stok {locLabel} berubah:{" "}
              <b>
                {selisih > 0 ? "+" : ""}
                {selisih} pcs
              </b>
            </p>
          )}
          {step === "periksa" && overflowPlan && (
            <div data-testid="overflow-info" className="text-xs px-2 py-1.5 border border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 space-y-0.5">
              <p className="font-semibold">
                Stok Gudang otomatis berkurang {gudangTake} pcs (stok + terjual tidak boleh melebihi produksi)
              </p>
              {overflowPlan.sizes.flatMap((z) =>
                z.adjustments.map((a) => (
                  <p key={z.size + a.warna}>
                    {z.size} · {a.warna === "_" ? "Tanpa warna" : a.warna}: gudang {a.gudang_from} → {a.gudang_to}
                  </p>
                )),
              )}
              {overflowPlan.sizes.some((z) => Number(z.unresolved) > 0) && (
                <p className="text-amber-600">Stok gudang tidak cukup untuk menutup semuanya, periksa lagi hitungan.</p>
              )}
            </div>
          )}
          {step === "periksa" && cmp && (
            <p
              data-testid="buku-compare"
              className={`text-xs text-center px-2 py-1.5 border ${
                cmp.selisih === 0
                  ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10"
                  : "text-amber-600 border-amber-500/40 bg-amber-500/10"
              }`}
            >
              {cmp.selisih === 0
                ? `✓ Cocok dengan buku potongan: total semua lokasi ${cmp.stok} pcs`
                : `Total semua lokasi setelah simpan ${cmp.stok} pcs, buku potongan ${cmp.seharusnya} pcs → ${cmp.selisih > 0 ? "lebih" : "kurang"} ${Math.abs(cmp.selisih)} (cek lokasi lain yang belum dihitung)`}
            </p>
          )}
          <div className="flex gap-2">
            {step === "isi" ? (
              <button
                onClick={() => setStep("periksa")}
                disabled={anyOver}
                className="flex-1 py-3 bg-skin-accent text-skin-on-accent text-sm tracking-[0.15em] uppercase font-semibold hover:bg-skin-accent-hover disabled:opacity-40"
              >
                Periksa
              </button>
            ) : (
              <>
                <button
                  onClick={() => setStep("isi")}
                  disabled={saving}
                  className="px-4 py-3 border-2 border-skin-bdr text-sm uppercase tracking-[0.1em] text-skin-text2"
                >
                  Kembali
                </button>
                <button
                  onClick={() => submit(false)}
                  disabled={saving}
                  className="flex-1 py-3 bg-skin-accent text-skin-on-accent text-sm tracking-[0.1em] uppercase font-semibold hover:bg-skin-accent-hover disabled:opacity-40"
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
                {hasNext && (
                  <button
                    onClick={() => submit(true)}
                    disabled={saving}
                    className="flex-1 py-3 border-2 border-skin-accent text-skin-accent-text text-sm tracking-[0.1em] uppercase font-semibold disabled:opacity-40"
                  >
                    Simpan & berikutnya
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
