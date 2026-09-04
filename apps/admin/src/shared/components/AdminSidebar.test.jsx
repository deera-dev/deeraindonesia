import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/features/transfers/hooks", () => ({
  usePendingTransferCount: vi.fn(),
}));
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(() => ({ user: { email: "admin@deera.id" } })),
}));
vi.mock("../../features/produksi-sampel/hooks", () => ({
  useTotalUnreadCount: vi.fn(),
}));

import AdminSidebar from "./AdminSidebar";
import { usePendingTransferCount } from "@deera/shared/features/transfers/hooks";
import { useTotalUnreadCount } from "../../features/produksi-sampel/hooks";

function renderSidebar(pathname = "/") {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AdminSidebar />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  usePendingTransferCount.mockReturnValue(0);
  useTotalUnreadCount.mockReturnValue({ total: 0, loading: false });
});

describe("AdminSidebar", () => {
  it("renders semua 9 item nav sekaligus (tanpa dipadatkan spt bottom nav mobile)", () => {
    renderSidebar();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Produksi")).toBeInTheDocument();
    expect(screen.getByText("Stok")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.getByText("Buku")).toBeInTheDocument();
    expect(screen.getByText("Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("Restock")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Riwayat")).toBeInTheDocument();
  });

  it("Produksi link aktif di /produksi/record", () => {
    renderSidebar("/produksi/record");
    const link = screen.getByRole("link", { name: /produksi/i });
    expect(link).toHaveClass("text-[#CAB170]");
  });

  it("tidak menampilkan badge Transfer saat pending = 0", () => {
    renderSidebar();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("menampilkan badge Transfer saat pending > 0", () => {
    usePendingTransferCount.mockReturnValue(3);
    renderSidebar();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  // Badge unread Diskusi di item Produksi (permintaan Denny 2026-09: "saya
  // juga mau ada batch di produksi, bukan cuma di catatan, biar terlihat").
  describe("badge unread Diskusi di Produksi", () => {
    it("tidak menampilkan badge saat unread diskusi = 0", () => {
      renderSidebar();
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("menampilkan badge dgn jumlah saat ada unread diskusi", () => {
      useTotalUnreadCount.mockReturnValue({ total: 5, loading: false });
      renderSidebar();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("membatasi tampilan badge jadi '9+' kalau lebih dari 9", () => {
      useTotalUnreadCount.mockReturnValue({ total: 20, loading: false });
      renderSidebar();
      expect(screen.getByText("9+")).toBeInTheDocument();
    });

    it("badge Transfer & badge Produksi bisa tampil BERSAMAAN dgn angka masing-masing", () => {
      usePendingTransferCount.mockReturnValue(1);
      useTotalUnreadCount.mockReturnValue({ total: 7, loading: false });
      renderSidebar();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });
  });
});
