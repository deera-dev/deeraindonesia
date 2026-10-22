import { useMemo, useState } from "react";
import { summarizeByDaerah, summarizeRencana, buildRencanaShareText, usePetaFilter } from "../hooks";
import { buildWaLink } from "../../blast/utils";
import RencanaList from "./RencanaList";
import PetaTokoChecklist from "./PetaTokoChecklist";

const fieldCls =
  "h-10 min-w-0 bg-skin-page border border-skin-bdr px-3 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition";

export default function NgorderSheet({
  tokoList,
  filteredToko,
  daerahOptions,
  rencana,
  jarakByToko,
  onClose,
  onFeedback,
  onOpenToko,
  onEdit,
  onAdd,
  onPlacePin,
  onFocus,
}) {
  const { daerah, approach, search, sheetTab, setFilter } = usePetaFilter();
  const [confirmClear, setConfirmClear] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const tokoById = useMemo(() => new Map(tokoList.map((t) => [t.id, t])), [tokoList]);
  const rows = useMemo(() => rencana.rows.filter((r) => tokoById.has(r.toko_id)), [rencana.rows, tokoById]);
  const counts = summarizeRencana(rows);
  const daerahSummary = useMemo(() => summarizeByDaerah(tokoList), [tokoList]);
  const finished = rows.filter((r) => r.status === "selesai" || r.status === "batal");
  const unselectedFiltered = filteredToko.filter((t) => !rencana.byToko.has(t.id));

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setFilter({ sheetTab: key })}
      className={`px-3 py-2 text-xs font-editorial tracking-[0.1em] uppercase border-b-2 transition ${
        sheetTab === key ? "border-skin-accent text-skin-accent-text" : "border-transparent text-skin-text3 hover:text-skin-text"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-skin-card rounded-t-3xl shadow-2xl h-[85%] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 flex-shrink-0">
          <div className="flex gap-1">
            {tabBtn("rencana", `Rencana (${counts.total})`)}
            {tabBtn("semua", `Semua Toko (${tokoList.length})`)}
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-2xl leading-none text-skin-text3">
            ×
          </button>
        </div>

        {sheetTab === "rencana" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-y border-skin-bdr-lt flex-shrink-0">
              <span className="text-xs text-skin-text3">
                {counts.berlangsung > 0 && <span className="text-amber-600">{counts.berlangsung} berlangsung · </span>}
                {counts.rencana} rencana · {counts.selesai} selesai
                <span className="block text-[10px] text-skin-text4">
                  {jarakByToko ? "Diurutkan dari yang terdekat · " : ""}Tersinkron ke semua akun
                </span>
              </span>
              {rows.length > 0 && (
                <div className="flex items-center gap-3 text-[11px] font-semibold uppercase">
                  <a
                    href={buildWaLink("", buildRencanaShareText(rows, tokoById))}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-700 dark:text-green-400 underline"
                  >
                    Bagikan
                  </a>
                  {finished.length > 0 && (
                    <button type="button" onClick={() => rencana.clear(finished)} className="text-skin-text3 hover:text-skin-text underline">
                      Arsipkan selesai
                    </button>
                  )}
                  <button type="button" onClick={() => setConfirmClear(true)} className="text-skin-text3 hover:text-red-500 underline">
                    Kosongkan
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <RencanaList
                rows={rows}
                tokoById={tokoById}
                jarakByToko={jarakByToko}
                onFeedback={onFeedback}
                onRemove={rencana.remove}
                onFocus={onFocus}
                onOpenToko={onOpenToko}
              />
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-3 space-y-2 border-y border-skin-bdr-lt flex-shrink-0">
              <input
                type="search"
                value={search}
                onChange={(e) => setFilter({ search: e.target.value })}
                placeholder="Cari nama toko, alamat, daerah..."
                className={`${fieldCls} w-full`}
              />
              <div className="flex items-center gap-2">
                <select value={daerah} onChange={(e) => setFilter({ daerah: e.target.value })} aria-label="Filter daerah" className={`${fieldCls} flex-1`}>
                  <option value="">Semua daerah</option>
                  {daerahOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select value={approach} onChange={(e) => setFilter({ approach: e.target.value })} aria-label="Filter status" className={`${fieldCls} flex-1`}>
                  <option value="">Semua status</option>
                  <option value="belum">Belum di-approach</option>
                  <option value="sudah">Sudah di-approach</option>
                </select>
                <button
                  type="button"
                  onClick={onAdd}
                  className="h-10 px-3 text-xs font-editorial tracking-[0.1em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition whitespace-nowrap flex-shrink-0"
                >
                  + Tambah
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase">
                <button type="button" onClick={() => setShowSummary((v) => !v)} className="text-skin-text3 hover:text-skin-text">
                  Ringkasan per daerah {showSummary ? "▲" : "▼"}
                </button>
                {unselectedFiltered.length > 0 && (daerah || approach || search) && (
                  <button
                    type="button"
                    onClick={() => rencana.addMany(unselectedFiltered.map((t) => t.id))}
                    className="text-skin-accent-text underline"
                  >
                    + Rencanakan {unselectedFiltered.length} toko ini
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {showSummary && (
                <div className="divide-y divide-skin-bdr-lt border-b border-skin-bdr-lt">
                  {daerahSummary.map((g) => (
                    <button
                      key={g.daerah}
                      type="button"
                      onClick={() => setFilter({ daerah: daerah === g.daerah ? "" : g.daerah })}
                      className={`w-full flex items-center justify-between gap-2 px-5 py-2 text-left transition ${
                        daerah === g.daerah ? "bg-skin-accent/10" : "hover:bg-skin-page"
                      }`}
                    >
                      <span className="text-sm font-semibold text-skin-text">{g.daerah}</span>
                      <span className="text-[11px] text-skin-text3 text-right">
                        {g.total} toko · {g.sudahApproach} di-approach
                        {g.tertarik > 0 ? ` · ${g.tertarik} tertarik` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <PetaTokoChecklist
                tokoList={filteredToko}
                selected={rencana.byToko}
                onToggle={(t) => rencana.toggle(t.id)}
                onOpen={onOpenToko}
                onEdit={onEdit}
                onPlacePin={onPlacePin}
              />
            </div>
          </>
        )}
      </div>

      {confirmClear && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-skin-card border-2 border-skin-bdr max-w-sm w-full p-5">
            <p className="text-sm text-skin-text">
              Kosongkan rencana kunjungan untuk <strong>semua akun</strong>? Catatan kunjungan yang sudah diisi tetap tersimpan di
              riwayat toko.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  rencana.clear(rows);
                  setConfirmClear(false);
                }}
                className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase text-white bg-red-500 hover:bg-red-600"
              >
                Kosongkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
