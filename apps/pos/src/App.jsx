/**
 * App.jsx — Entry point aplikasi POS
 *
 * Tanggung jawab:
 * - Cek status auth (login/logout)
 * - Kelola state sync (online/offline, error, last sync)
 * - Kelola state lokasi pasar + tab aktif
 * - Render AppHeader + konten tab yang aktif
 *
 * Semua UI detail → components/
 * Semua logika sync → lib/sync.js
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { useTheme } from "@deera/shared/hooks/useTheme";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import {
  flushPendingSales,
  syncProducts,
  syncStok,
  syncPelanggan,
} from "./lib/sync";
import AppHeader from "./components/AppHeader";
import LoginScreen from "./components/LoginScreen";
import SyncErrorModal from "./components/SyncErrorModal";
import Kasir from "./pages/Kasir";
import Laporan from "./pages/Laporan";
import Pelanggan from "./pages/Pelanggan";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  // ── State navigasi & lokasi ─────────────────────────────────────────────────
  const [tab, setTab] = useState("kasir");
  const [location, setLocation] = useState(() => getMarketLocation());
  const [laporanKey, setLaporanKey] = useState(0); // force reload Laporan setelah transaksi

  // ── State koneksi & sync ────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [showSyncErr, setShowSyncErr] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  /**
   * Jalankan sync lengkap:
   * - silent=true  → tidak pop-up modal error (hanya indikator di header)
   * - silent=false → tampilkan modal jika error
   */
  const doSync = useCallback(async (silent = false) => {
    if (!navigator.onLine) return;
    setSyncing(true);
    if (!silent) setSyncError(null);
    try {
      await Promise.all([syncProducts(), syncStok(), syncPelanggan()]);
      const { errors } = await flushPendingSales();
      setLastSyncAt(new Date());
      setFailedCount(errors ?? 0);
      setSyncError(null);
    } catch (err) {
      const msg = err?.message ?? "Terjadi kesalahan saat sync";
      setSyncError(msg);
      if (!silent) setShowSyncErr(true);
    }
    setSyncing(false);
  }, []);

  // ── Sync otomatis saat login & kembali online ───────────────────────────────
  useEffect(() => {
    if (user) doSync(true);

    const onOnline = () => {
      setIsOnline(true);
      doSync(true);
    };
    const onOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [user, doSync]);

  // ── Loading auth ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-skin-page flex items-center justify-center">
        <p className="text-skin-text3 text-xl tracking-[0.2em]">Memuat...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  // ── App utama ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-skin-page text-skin-text flex flex-col">
      <AppHeader
        user={user}
        tab={tab}
        onTabChange={setTab}
        isOnline={isOnline}
        syncing={syncing}
        syncError={syncError}
        failedCount={failedCount}
        lastSyncAt={lastSyncAt}
        location={location}
        onLocationChange={setLocation}
        onSync={() => doSync(false)}
        onShowSyncError={() => setShowSyncErr(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Konten tab */}
      {tab === "kasir" && (
        <Kasir
          location={location}
          onLocationChange={setLocation}
          onSaleCreated={() => setLaporanKey((k) => k + 1)}
        />
      )}
      {tab === "laporan" && <Laporan key={laporanKey} location={location} />}
      {tab === "pelanggan" && <Pelanggan />}

      {/* Modal error sync */}
      {showSyncErr && (
        <SyncErrorModal
          error={syncError}
          onClose={() => setShowSyncErr(false)}
          onRetry={() => doSync(false)}
          retrying={syncing}
        />
      )}
    </main>
  );
}
