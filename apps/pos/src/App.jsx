/**
 * App.jsx -- Entry point aplikasi POS
 *
 * Tanggung jawab:
 * - Cek status auth (login/logout)
 * - Kelola state sync (online/offline, error, last sync)
 * - Kelola state lokasi pasar
 * - Render layout utama + routes
 *
 * Navigasi antar halaman: React Router (/, /laporan, /pelanggan, /riwayat)
 *
 * Shell (header, login, nav, dll)  → ./shared/components
 * Notifikasi pasar/push            → ./shared/hooks
 * Halaman per fitur                → ./features/<fitur> (barrel, Dependency
 *                                      Inversion ala React — lihat CLAUDE.md)
 * Sync offline-first (TIDAK disentuh sesuai keputusan refactor) → ./lib
 */
import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { useTheme } from "@deera/shared/features/theme/hooks";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { flushPendingSales, syncProducts, syncStok, syncPelanggan } from "./lib/sync";
import { usePasarNotification } from "./shared/hooks/usePasarNotification";
import { usePushSubscription } from "./shared/hooks/usePushSubscription";
import AppHeader from "./shared/components/AppHeader";
import LoginScreen from "./shared/components/LoginScreen";
import SyncErrorModal from "./shared/components/SyncErrorModal";
import { KasirPage } from "./features/kasir";
import { LaporanPage } from "./features/laporan";
import { PelangganPage } from "./features/pelanggan";
import { RiwayatPage } from "./features/riwayat";
import PosBottomNav from "./shared/components/PosBottomNav";
import NotificationGate from "./shared/components/NotificationGate";
import ToastContainer from "@deera/shared/components/ToastContainer";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  usePasarNotification();
  usePushSubscription();

  const [location, setLocation] = useState(() => getMarketLocation());
  const [laporanKey, setLaporanKey] = useState(0);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [showSyncErr, setShowSyncErr] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-skin-page flex items-center justify-center">
        <p className="text-skin-text3 text-xl tracking-[0.2em]">Memuat...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <NotificationGate>
    <main className="h-[100dvh] bg-skin-page text-skin-text flex flex-col overflow-hidden pb-16">
      <AppHeader
        user={user}
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

      <Routes>
        <Route
          index
          element={
            <KasirPage
              location={location}
              onLocationChange={setLocation}
              onSaleCreated={() => setLaporanKey((k) => k + 1)}
            />
          }
        />
        <Route path="/laporan" element={<LaporanPage key={laporanKey} location={location} />} />
        <Route path="/pelanggan" element={<PelangganPage />} />
        <Route path="/riwayat" element={<RiwayatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showSyncErr && (
        <SyncErrorModal
          error={syncError}
          onClose={() => setShowSyncErr(false)}
          onRetry={() => doSync(false)}
          retrying={syncing}
        />
      )}

      <PosBottomNav />
      <ToastContainer />
    </main>
    </NotificationGate>
  );
}
