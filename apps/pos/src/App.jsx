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
 */
import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { useTheme } from "@deera/shared/hooks/useTheme";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { flushPendingSales, syncProducts, syncStok, syncPelanggan } from "./lib/sync";
import { usePasarNotification } from "./hooks/usePasarNotification";
import AppHeader from "./components/AppHeader";
import LoginScreen from "./components/LoginScreen";
import SyncErrorModal from "./components/SyncErrorModal";
import Kasir from "./pages/Kasir";
import Laporan from "./pages/Laporan";
import Pelanggan from "./pages/Pelanggan";
import Riwayat from "./pages/Riwayat";
import PosBottomNav from "./components/PosBottomNav";
import NotificationGate from "./components/NotificationGate";
import ToastContainer from "@deera/shared/components/ToastContainer";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  usePasarNotification();

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
            <Kasir
              location={location}
              onLocationChange={setLocation}
              onSaleCreated={() => setLaporanKey((k) => k + 1)}
            />
          }
        />
        <Route path="/laporan" element={<Laporan key={laporanKey} location={location} />} />
        <Route path="/pelanggan" element={<Pelanggan />} />
        <Route path="/riwayat" element={<Riwayat />} />
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
