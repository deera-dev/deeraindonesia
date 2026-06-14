/**
 * NotificationGate.jsx
 *
 * Wajibkan izin notifikasi sebelum user bisa pakai aplikasi.
 * Tampil sebagai layar penuh di atas konten utama sampai permission === "granted".
 *
 * - default  → tampilkan tombol "Aktifkan Notifikasi"
 * - denied   → tampilkan instruksi manual (tidak bisa re-prompt secara programatik)
 * - granted  → render children langsung, gate tidak tampil
 * - browser tidak support Notification → langsung render children (skip gate)
 */
import { useState } from "react";

const SUPPORTED = "Notification" in window;

export default function NotificationGate({ children }) {
  const [permission, setPermission] = useState(
    SUPPORTED ? Notification.permission : "granted",
  );
  const [requesting, setRequesting] = useState(false);

  // Sudah granted atau browser tidak support → render normal
  if (permission === "granted") return children;

  async function handleAllow() {
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      setPermission(Notification.permission);
    }
    setRequesting(false);
  }

  function handleRecheck() {
    setPermission(Notification.permission);
  }

  return (
    <div className="fixed inset-0 z-[300] bg-skin-page flex flex-col items-center justify-center px-6 text-center">
      {permission === "default" ? (
        /* ── Belum pernah diminta ── */
        <>
          <div className="text-6xl mb-5 select-none">🔔</div>
          <h2 className="font-headline text-2xl text-skin-text mb-3 tracking-wide">
            Aktifkan Notifikasi
          </h2>
          <p className="text-skin-text3 text-sm leading-relaxed max-w-xs mb-8">
            Aplikasi membutuhkan izin notifikasi agar setiap transaksi baru langsung
            tercatat dan terdeteksi.
          </p>
          <button
            onClick={handleAllow}
            disabled={requesting}
            className="w-full max-w-xs py-4 bg-[#CAB170] hover:bg-[#A8925A] text-white font-semibold tracking-[0.12em] uppercase text-sm transition disabled:opacity-60"
          >
            {requesting ? "Meminta izin…" : "Aktifkan Notifikasi"}
          </button>
        </>
      ) : (
        /* ── Sudah di-block / denied ── */
        <>
          <div className="text-6xl mb-5 select-none">🔕</div>
          <h2 className="font-headline text-2xl text-skin-text mb-3 tracking-wide">
            Notifikasi Diblokir
          </h2>
          <p className="text-skin-text3 text-sm leading-relaxed max-w-xs mb-5">
            Izin notifikasi sudah diblokir. Aktifkan secara manual lewat pengaturan
            perangkat, lalu kembali ke sini dan tap tombol di bawah.
          </p>

          {/* Instruksi per platform */}
          <div className="w-full max-w-xs text-left space-y-3 mb-8">
            <div className="bg-skin-raised border border-skin-bdr px-4 py-3 text-xs text-skin-text2 space-y-1">
              <p className="font-bold text-skin-text uppercase tracking-[0.08em]">
                Android Chrome
              </p>
              <p>
                Pengaturan HP → Aplikasi → Chrome → Izin → Notifikasi → Izinkan
              </p>
            </div>
            <div className="bg-skin-raised border border-skin-bdr px-4 py-3 text-xs text-skin-text2 space-y-1">
              <p className="font-bold text-skin-text uppercase tracking-[0.08em]">
                Atau lewat Chrome
              </p>
              <p>
                Buka Chrome → ketuk ⋮ → Setelan → Setelan situs → Notifikasi → cari{" "}
                <span className="font-mono text-[#CAB170]">pos.deera.id</span> → Izinkan
              </p>
            </div>
          </div>

          <button
            onClick={handleRecheck}
            className="w-full max-w-xs py-4 bg-[#CAB170] hover:bg-[#A8925A] text-white font-semibold tracking-[0.12em] uppercase text-sm transition"
          >
            Saya sudah mengizinkan
          </button>
        </>
      )}
    </div>
  );
}
