/**
 * NotifikasiPage.jsx — daftar notifikasi (30 hari terakhir) termasuk yang terlewat.
 * Klik item → langsung ke tujuan notifikasi (field `url`). Semua logika
 * penerima/status baca ada di backend (RPC); halaman hanya menampilkan.
 */
import { useNavigate } from "react-router-dom";
import { useNotifications, useMarkNotificationsSeen, useMarkNotificationRead } from "../hooks";
import { fmtRelative } from "../utils";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";

export default function NotifikasiPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error } = useNotifications();
  const { markSeen, marking } = useMarkNotificationsSeen();
  const markRead = useMarkNotificationRead();

  // Klik = langsung terbaca (kecuali "diskusi": baru terbaca setelah dibuka di Planning) lalu pindah ke tujuan.
  function open(n) {
    if (n.is_unread && n.type !== "diskusi") markRead(n.id);
    navigate(n.url || "/");
  }

  return (
    <div className="min-h-screen bg-skin-page md:pl-64 pb-24 md:pb-8">
      <AdminSidebar />
      <header className="sticky top-0 z-20 bg-skin-card border-b-2 border-skin-bdr px-4 py-3 md:px-8 flex items-center gap-3">
        <h1 className="font-headline text-skin-accent-text text-xl">Notifikasi</h1>
        {unreadCount > 0 && (
          <span className="text-xs font-editorial px-2 py-0.5 rounded-full bg-skin-accent text-skin-on-accent">
            {unreadCount} baru
          </span>
        )}
        <button
          type="button"
          onClick={markSeen}
          disabled={marking || unreadCount === 0}
          className="ml-auto text-xs font-editorial px-3 py-1.5 border border-skin-bdr text-skin-text2 hover:border-skin-accent disabled:opacity-40"
        >
          Tandai semua dibaca
        </button>
      </header>

      <div className="px-4 py-4 md:px-8 max-w-3xl mx-auto space-y-2">
        {loading && <p className="text-center text-sm text-skin-text3 py-16">Memuat notifikasi...</p>}
        {error && <p className="text-center text-sm text-red-500 py-8">{error.message}</p>}
        {!loading && !error && notifications.length === 0 && (
          <p className="text-center text-sm text-skin-text3 py-16">Belum ada notifikasi</p>
        )}
        {notifications.map((n) => (
          <button
            key={n.id}
            type="button"
            data-testid="notif-item"
            onClick={() => open(n)}
            className={`w-full text-left bg-skin-card border-2 px-4 py-3 transition hover:border-skin-accent ${
              n.is_unread ? "border-skin-accent" : "border-skin-bdr"
            }`}
          >
            {n.section && (
              <p className="text-[10px] font-editorial tracking-[0.12em] uppercase text-skin-accent-text mb-1" data-testid="notif-section">
                {n.section}
              </p>
            )}
            <div className="flex items-start gap-2">
              <p className="font-editorial text-sm text-skin-text font-semibold flex-1">{n.title}</p>
              {n.is_unread && <span className="mt-1 w-2 h-2 rounded-full bg-skin-accent flex-shrink-0" aria-label="Belum dibaca" />}
              <span className="text-[11px] text-skin-text3 flex-shrink-0">{fmtRelative(n.created_at)}</span>
            </div>
            {n.body && <p className="text-xs text-skin-text2 mt-1 whitespace-pre-line">{n.body}</p>}
            <p className="text-[11px] text-skin-text3 mt-2">Buka {n.section ? n.section.split("›").pop().trim() : "halaman"} ›</p>
          </button>
        ))}
      </div>
      <AdminBottomNav />
    </div>
  );
}
