import { Link } from "react-router-dom";
import { useNotifications } from "../hooks";

export default function NotifBell({ className = "" }) {
  const { unreadCount } = useNotifications();
  return (
    <Link
      to="/notifikasi"
      aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"}
      className={`relative inline-flex items-center justify-center w-11 h-11 border-2 border-skin-bdr text-skin-text3 hover:text-skin-accent-text hover:border-skin-accent transition ${className}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span
          data-testid="notif-badge"
          className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
