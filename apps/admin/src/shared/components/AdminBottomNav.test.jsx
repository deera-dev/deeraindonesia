import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

import AdminBottomNav from "./AdminBottomNav";
import { usePendingTransferCount } from "@deera/shared/features/transfers/hooks";
import { useTotalUnreadCount } from "../../features/produksi-sampel/hooks";

function renderNav(pathname = "/") {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AdminBottomNav />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  usePendingTransferCount.mockReturnValue(0);
  useTotalUnreadCount.mockReturnValue({ total: 0, loading: false });
});

describe("AdminBottomNav — redesign 2026-08 (5 item utama + Lainnya)", () => {
  it("renders 5 item utama + tab Lainnya di bar, TANPA 4 item sekunder langsung terlihat", () => {
    renderNav();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Produksi")).toBeInTheDocument();
    expect(screen.getByText("Stok")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.getByText("Restock")).toBeInTheDocument();
    expect(screen.getByText("Lainnya")).toBeInTheDocument();

    expect(screen.queryByText("Buku")).not.toBeInTheDocument();
    expect(screen.queryByText("Pelanggan")).not.toBeInTheDocument();
    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
    expect(screen.queryByText("Riwayat")).not.toBeInTheDocument();
  });

  it("does not show badge when pending = 0", () => {
    usePendingTransferCount.mockReturnValue(0);
    renderNav();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows badge with count when pending > 0", () => {
    usePendingTransferCount.mockReturnValue(3);
    renderNav();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  // Badge unread Diskusi di item Produksi (permintaan Denny 2026-09: "saya
  // juga mau ada batch di produksi, bukan cuma di catatan, biar terlihat").
  describe("badge unread Diskusi di Produksi", () => {
    it("tidak menampilkan badge saat unread diskusi = 0", () => {
      useTotalUnreadCount.mockReturnValue({ total: 0, loading: false });
      renderNav();
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("menampilkan badge dgn jumlah saat ada unread diskusi", () => {
      useTotalUnreadCount.mockReturnValue({ total: 5, loading: false });
      renderNav();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("membatasi tampilan badge jadi '9+' kalau lebih dari 9", () => {
      useTotalUnreadCount.mockReturnValue({ total: 12, loading: false });
      renderNav();
      expect(screen.getByText("9+")).toBeInTheDocument();
    });

    it("badge Transfer & badge Produksi bisa tampil BERSAMAAN dgn angka masing-masing", () => {
      usePendingTransferCount.mockReturnValue(2);
      useTotalUnreadCount.mockReturnValue({ total: 4, loading: false });
      renderNav();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  it("Home link is active at /", () => {
    renderNav("/");
    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).toHaveClass("text-[#CAB170]");
  });

  it("Home link is not active at /transfer", () => {
    renderNav("/transfer");
    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).not.toHaveClass("text-[#CAB170]");
  });

  it("Produksi link is active at /produksi/record", () => {
    renderNav("/produksi/record");
    const produksiLink = screen.getByRole("link", { name: /produksi/i });
    expect(produksiLink).toHaveClass("text-[#CAB170]");
  });

  it("Transfer link is active at /transfer", () => {
    renderNav("/transfer");
    const transferLink = screen.getByRole("link", { name: /transfer/i });
    expect(transferLink).toHaveClass("text-[#CAB170]");
  });

  it("Stok link is active at /stok-opname", () => {
    renderNav("/stok-opname");
    const stokLink = screen.getByRole("link", { name: /stok/i });
    expect(stokLink).toHaveClass("text-[#CAB170]");
  });

  it("Restock link is active at /pasar-restock", () => {
    renderNav("/pasar-restock");
    const restockLink = screen.getByRole("link", { name: /restock/i });
    expect(restockLink).toHaveClass("text-[#CAB170]");
  });

  it("all primary links have correct href", () => {
    renderNav();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/produksi");
    expect(hrefs).toContain("/stok-opname");
    expect(hrefs).toContain("/transfer");
    expect(hrefs).toContain("/pasar-restock");
  });

  it("memakai padding safe-area yang benar (bukan class \"safe-area-inset-bottom\" mati, redesign 2026-07)", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav");
    expect(nav.className).toContain("pb-[env(safe-area-inset-bottom)]");
    expect(nav.className).not.toContain("safe-area-inset-bottom\"");
  });

  describe("tab Lainnya", () => {
    it("tidak aktif di route primary (/)", () => {
      renderNav("/");
      const btn = screen.getByText("Lainnya").closest("button");
      expect(btn).not.toHaveClass("text-[#CAB170]");
    });

    it("aktif (highlighted) kalau berada di salah satu route sekunder, tanpa perlu buka sheet", () => {
      renderNav("/buku-potongan");
      const btn = screen.getByText("Lainnya").closest("button");
      expect(btn).toHaveClass("text-[#CAB170]");
    });

    it("klik Lainnya membuka sheet berisi Buku, Pelanggan, Analytics, Riwayat", async () => {
      const user = userEvent.setup();
      renderNav();
      expect(screen.queryByText("Buku")).not.toBeInTheDocument();
      await user.click(screen.getByText("Lainnya"));
      expect(screen.getByText("Buku")).toBeInTheDocument();
      expect(screen.getByText("Pelanggan")).toBeInTheDocument();
      expect(screen.getByText("Analytics")).toBeInTheDocument();
      expect(screen.getByText("Riwayat")).toBeInTheDocument();
    });

    it("link di dalam sheet punya href yang benar", async () => {
      const user = userEvent.setup();
      renderNav();
      await user.click(screen.getByText("Lainnya"));
      const bukuLink = screen.getByRole("link", { name: /buku/i });
      const pelangganLink = screen.getByRole("link", { name: /pelanggan/i });
      const analyticsLink = screen.getByRole("link", { name: /analytics/i });
      const riwayatLink = screen.getByRole("link", { name: /riwayat/i });
      expect(bukuLink).toHaveAttribute("href", "/buku-potongan");
      expect(pelangganLink).toHaveAttribute("href", "/pelanggan");
      expect(analyticsLink).toHaveAttribute("href", "/analytics");
      expect(riwayatLink).toHaveAttribute("href", "/history");
    });

    it("item aktif di dalam sheet ter-highlight", async () => {
      const user = userEvent.setup();
      renderNav("/analytics");
      await user.click(screen.getByText("Lainnya"));
      const analyticsLink = screen.getByRole("link", { name: /analytics/i });
      expect(analyticsLink).toHaveClass("text-[#CAB170]");
    });

    it("klik backdrop menutup sheet", async () => {
      const user = userEvent.setup();
      const { container } = renderNav();
      await user.click(screen.getByText("Lainnya"));
      expect(screen.getByText("Buku")).toBeInTheDocument();
      const backdrop = container.querySelector(".fixed.inset-0 .absolute.inset-0");
      await user.click(backdrop);
      expect(screen.queryByText("Buku")).not.toBeInTheDocument();
    });

    it("tombol × menutup sheet", async () => {
      const user = userEvent.setup();
      renderNav();
      await user.click(screen.getByText("Lainnya"));
      await user.click(screen.getByLabelText("Tutup"));
      expect(screen.queryByText("Buku")).not.toBeInTheDocument();
    });

    it("klik salah satu item di sheet juga menutup sheet", async () => {
      const user = userEvent.setup();
      renderNav();
      await user.click(screen.getByText("Lainnya"));
      await user.click(screen.getByRole("link", { name: /buku/i }));
      expect(screen.queryByText("Pelanggan")).not.toBeInTheDocument();
    });
  });
});
