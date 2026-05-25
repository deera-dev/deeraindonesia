/**
 * AppHeader.jsx
 * Header utama POS — logo, status online + sync, keluar, tab navigasi.
 */
import { signOut, displayName } from "@deera/shared/lib/auth";
import ThemeToggle from "@deera/shared/components/ThemeToggle";

export default function AppHeader({
  user,
  isOnline,
  syncing, syncError, failedCount, lastSyncAt,
  onSync,
  onShowSyncError,
  isDark,
  onToggleTheme,
}) {
  function formatLastSync(d) {
    if (!d) return null;
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  const syncLabel = syncError    ? "Gagal"
    : failedCount > 0            ? `${failedCount} pending`
    : lastSyncAt                 ? formatLastSync(lastSyncAt)
    : "";

  return (
    <header className="bg-skin-card border-b border-skin-bdr shadow-sm z-30 flex-shrink-0">

      {/* ── Baris utama ── */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6">

        {/* Kiri: logo + status */}
        <div className="flex items-center gap-3 min-w-0">
          <h1
            className="text-3xl text-[#CAB170] leading-none flex-shrink-0 font-headline"
          >
            DEERA
          </h1>

          {/* Online badge + sync — satu elemen */}
          <button
            onClick={isOnline ? onSync : undefined}
            disabled={syncing}
            title={lastSyncAt ? `Terakhir sync: ${formatLastSync(lastSyncAt)}` : "Sync data"}
            className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1 text-sm border rounded-full transition flex-shrink-0 disabled:opacity-60 ${
              syncError
                ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                : failedCount > 0
                ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                : isOnline
                ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                : "border-amber-200 text-amber-700 bg-amber-50"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              isOnline ? "bg-green-500" : "bg-amber-500"
            }`} />
            <span className="font-medium">
              {isOnline ? "Online" : "Offline"}
            </span>
            {isOnline && (
              <span className={`text-base leading-none ml-0.5 ${syncing ? "animate-spin inline-block" : ""}`}>
                ↻
              </span>
            )}
            {syncLabel && (
              <span className="hidden sm:inline text-xs opacity-70 ml-0.5">
                · {syncLabel}
              </span>
            )}
          </button>

          {syncError && (
            <button
              onClick={onShowSyncError}
              className="hidden sm:block text-xs text-red-500 underline flex-shrink-0"
            >
              Detail
            </button>
          )}
        </div>

        {/* Kanan: theme toggle + keluar */}
        <div className="flex items-center gap-2">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          <button
            onClick={() => signOut()}
            className="text-sm tracking-[0.06em] uppercase text-skin-text3 hover:text-red-500 transition font-medium px-3 py-1.5 border border-skin-bdr hover:border-red-200 rounded-sm flex-shrink-0"
          >
            <span className="hidden md:inline text-skin-text2 mr-1">{displayName(user)} ·</span>Keluar
          </button>
        </div>
      </div>

      {/* ── Banner pending ── */}
      {failedCount > 0 && !syncError && (
        <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            ⏳ {failedCount} transaksi belum tersync
          </p>
          <button onClick={onSync} className="text-sm text-amber-700 hover:underline font-semibold">
            Coba ulang
          </button>
        </div>
      )}

    </header>
  );
}
