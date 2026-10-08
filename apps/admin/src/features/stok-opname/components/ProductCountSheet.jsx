/**
 * ProductCountSheet.jsx — layar hitung satu produk (modal penuh di mobile).
 * Langkah 1 "Isi" (per ukuran) → langkah 2 "Periksa" (daftar selisih) →
 * Simpan. Angka hanya disimpan lokal di layar ini sampai Simpan ditekan.
 */
import { useState, useRef } from "react";
import SizeCountSection from "./SizeCountSection";
import DiffSummary from "./DiffSummary";
import { LOCS, SIZE_ORDER, computeSizeCount, buildChanged, dikerjakanKey } from "../utils";

export default function ProductCountSheet({ product, rows, loc, dikerjakanMap = {}, onClose, onSubmit, hasNext }) {
  const [entries, setEntries] = useState({});
  const [totals, setTotals] = useState({});
  const [step, setStep] = useState("isi"); // "isi" | "periksa"
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const bodyRef = useRef(null);

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
              Selisih total:{" "}
              <b className={selisih < 0 ? "text-red-500" : "text-emerald-600"}>
                {selisih > 0 ? "+" : ""}
                {selisih} pcs
              </b>
            </p>
          )}
          <div className="flex gap-2">
            {step === "isi" ? (
              <button
                onClick={() => setStep("periksa")}
                disabled={anyOver}
                className="flex-1 py-3 bg-[#CAB170] text-white text-sm tracking-[0.15em] uppercase font-semibold hover:bg-[#A8925A] disabled:opacity-40"
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
                  className="flex-1 py-3 bg-[#CAB170] text-white text-sm tracking-[0.1em] uppercase font-semibold hover:bg-[#A8925A] disabled:opacity-40"
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
                {hasNext && (
                  <button
                    onClick={() => submit(true)}
                    disabled={saving}
                    className="flex-1 py-3 border-2 border-[#CAB170] text-[#A8925A] text-sm tracking-[0.1em] uppercase font-semibold disabled:opacity-40"
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
