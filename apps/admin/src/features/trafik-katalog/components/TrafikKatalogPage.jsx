import { useState } from "react";
import { useVisitStats, PERIODS, channelLabel, channelColor, sourceLabel, pct, dailyBars, fmtDay, localDateStr, rangeForPreset, clampRange, INTERNAL_MARK_URL } from "../hooks";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";

const TODAY = localDateStr();

function Stat({ label, value }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3">
      <p className="text-[10px] uppercase tracking-wide text-skin-text3">{label}</p>
      <p className="text-2xl font-bold text-skin-text tabular-nums">{value}</p>
    </div>
  );
}

export default function TrafikKatalogPage() {
  const [preset, setPreset] = useState(30);
  const [custom, setCustom] = useState({ start: TODAY, end: TODAY });
  const range = preset === "custom" ? clampRange(custom, TODAY) : rangeForPreset(preset, TODAY);
  const { stats, loading, error } = useVisitStats(range);
  const channels = stats?.by_channel ?? [];
  const bars = dailyBars(stats?.daily);

  return (
    <div className="min-h-screen bg-skin-page md:pl-64 pb-24 md:pb-8">
      <AdminSidebar />
      <header className="sticky top-0 z-20 bg-skin-card border-b-2 border-skin-bdr px-4 py-3 md:px-8 space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="font-headline text-skin-accent-text text-xl">Trafik Katalog</h1>
          <div className="ml-auto flex flex-wrap justify-end gap-1" role="group" aria-label="Periode">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                aria-pressed={preset === p.key}
                className={`px-3 py-1.5 text-xs border ${preset === p.key ? "bg-skin-accent text-skin-on-accent border-skin-accent" : "border-skin-bdr text-skin-text2"}`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPreset("custom")}
              aria-pressed={preset === "custom"}
              className={`px-3 py-1.5 text-xs border ${preset === "custom" ? "bg-skin-accent text-skin-on-accent border-skin-accent" : "border-skin-bdr text-skin-text2"}`}
            >
              Rentang tanggal
            </button>
          </div>
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={custom.start}
              max={custom.end || TODAY}
              onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))}
              className="bg-skin-page border border-skin-bdr px-2 py-1 text-xs text-skin-text focus:outline-none focus:border-skin-accent"
            />
            <span className="text-skin-text3 text-xs">–</span>
            <input
              type="date"
              value={custom.end}
              min={custom.start}
              max={TODAY}
              onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))}
              className="bg-skin-page border border-skin-bdr px-2 py-1 text-xs text-skin-text focus:outline-none focus:border-skin-accent"
            />
          </div>
        )}
      </header>

      <main className="px-4 py-4 md:px-8 space-y-6 max-w-3xl">
        {loading && <p className="text-sm text-skin-text3 py-10 text-center">Memuat…</p>}
        {error && <p className="text-sm text-red-500">Gagal memuat: {error.message}</p>}
        {stats && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Kunjungan" value={stats.sessions} />
              <Stat label="Pengunjung" value={stats.visitors} />
              <Stat label="Halaman dibuka" value={stats.views} />
            </div>

            <div className="border border-skin-bdr-lt px-3 py-2 text-xs text-skin-text3 space-y-1" data-testid="internal-note">
              <p>
                <span className="text-skin-text2 font-medium">Tim internal tidak dihitung:</span>{" "}
                {stats.internal?.sessions ?? 0} kunjungan · {stats.internal?.visitors ?? 0} perangkat
              </p>
              <p className="text-skin-text4">
                HP yang pernah login admin/POS/finance otomatis dikenali sebagai tim. Kalau katalog dibuka dari aplikasi Instagram/TikTok,
                buka <a href={INTERNAL_MARK_URL} target="_blank" rel="noreferrer" className="underline">{INTERNAL_MARK_URL.replace("https://", "")}</a> sekali dari aplikasi itu.
              </p>
            </div>

            <section>
              <h2 className="text-xs uppercase tracking-wide text-skin-text3 mb-2">Sumber kunjungan</h2>
              {channels.length === 0 && <p className="text-sm text-skin-text4">Belum ada data. Data mulai terkumpul sejak pelacakan dipasang.</p>}
              <div className="space-y-2">
                {channels.map((c) => (
                  <div key={c.channel} data-testid="channel-row">
                    <div className="flex justify-between text-sm text-skin-text">
                      <span>{channelLabel(c.channel)}</span>
                      <span className="tabular-nums">{c.sessions} · {pct(c.sessions, stats.sessions)}%</span>
                    </div>
                    <div className="h-2 bg-skin-raised">
                      <div className="h-2" style={{ width: `${pct(c.sessions, stats.sessions)}%`, background: channelColor(c.channel) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {bars.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-wide text-skin-text3 mb-2">Kunjungan per hari</h2>
                <div className="flex items-end gap-1 h-24" data-testid="daily-bars">
                  {bars.map((d) => (
                    <div key={d.date} title={`${fmtDay(d.date)}: ${d.sessions} kunjungan`} className="flex-1 max-w-[28px] bg-skin-accent" style={{ height: `${d.h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-skin-text4 mt-1">
                  <span>{fmtDay(bars[0].date)}</span>
                  {bars.length > 1 && <span>{fmtDay(bars[bars.length - 1].date)}</span>}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs uppercase tracking-wide text-skin-text3 mb-2">Situs / sumber teratas</h2>
              <div className="divide-y divide-skin-bdr-lt border border-skin-bdr-lt">
                {(stats.by_source ?? []).map((s, i) => (
                  <div key={`${s.source}-${i}`} className="flex justify-between gap-2 px-3 py-2 text-sm">
                    <span className="truncate text-skin-text">{sourceLabel(s)}</span>
                    <span className="text-skin-text3 text-xs flex-shrink-0">{channelLabel(s.channel)} · {s.sessions}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xs uppercase tracking-wide text-skin-text3 mb-2">Produk paling sering dibuka</h2>
              <div className="divide-y divide-skin-bdr-lt border border-skin-bdr-lt">
                {(stats.top_products ?? []).map((p) => (
                  <div key={p.kode} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-mono text-skin-text">{p.kode}</span>
                    <span className="text-xs text-skin-text3 tabular-nums">
                      {p.views} dilihat{p.qr ? ` · QR ${p.qr}` : ""}{p.google ? ` · Google ${p.google}` : ""}{p.ai ? ` · AI ${p.ai}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>

          </>
        )}
      </main>
      <AdminBottomNav />
    </div>
  );
}
