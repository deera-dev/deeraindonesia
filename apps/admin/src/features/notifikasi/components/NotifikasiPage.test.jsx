import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const navigate = vi.fn();
const markSeen = vi.fn();
const markRead = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("../hooks", () => ({
  useNotifications: () => ({
    loading: false,
    error: null,
    unreadCount: 1,
    notifications: [
      { id: "1", section: "Transfer Stok", title: "📦 Transfer", body: "isi", url: "/transfer", created_at: new Date().toISOString(), is_unread: true },
      { id: "2", title: "Lama", body: null, url: "/history", created_at: new Date().toISOString(), is_unread: false },
    ],
  }),
  useMarkNotificationsSeen: () => ({ markSeen, marking: false }),
  useMarkNotificationRead: () => markRead,
}));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => null }));
import NotifikasiPage from "./NotifikasiPage";

describe("NotifikasiPage", () => {
  it("menampilkan daftar & jumlah baru", () => {
    render(<NotifikasiPage />);
    expect(screen.getAllByTestId("notif-item")).toHaveLength(2);
    expect(screen.getByText("1 baru")).toBeInTheDocument();
  });
  it("menampilkan halaman asal notifikasi", () => {
    render(<NotifikasiPage />);
    expect(screen.getByTestId("notif-section")).toHaveTextContent("Transfer Stok");
    expect(screen.getByText("Buka Transfer Stok ›")).toBeInTheDocument();
  });
  it("klik item navigasi ke tujuan", () => {
    render(<NotifikasiPage />);
    fireEvent.click(screen.getByText("📦 Transfer"));
    expect(navigate).toHaveBeenCalledWith("/transfer");
    expect(markRead).toHaveBeenCalledWith("1");
  });
  it("tandai semua dibaca", () => {
    render(<NotifikasiPage />);
    fireEvent.click(screen.getByText("Tandai semua dibaca"));
    expect(markSeen).toHaveBeenCalled();
  });
});
