import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));

// Default: non-market day (gudang)
vi.mock("@deera/shared/lib/marketDay", () => ({
  getTodayInfo: vi.fn(() => ({ loc: "gudang", label: "Gudang", day: "Rabu" })),
}));

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,abc"),
}));

vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => item.qty ?? 1,
  itemProfit: (item) => (item.harga - (item.hpp ?? 0)) * (item.qty ?? 1),
}));

import LaporanPasar from "./LaporanPasar";
import { getTodayInfo } from "@deera/shared/lib/marketDay";
import { supabase } from "@deera/shared/lib/supabase";

const today = new Date().toISOString().split("T")[0];

const todayCidengSales = [
  {
    id: "s1", type: "sale", location: "cideng", total: 150000, date: today,
    items: [{ kode: "D-01", harga: 100000, hpp: 70000, qty: 2, warna: null }],
  },
  {
    id: "s2", type: "retur", location: "cideng", total: 50000, date: today,
    items: [{ kode: "D-01", harga: 50000, hpp: 0, qty: 1, warna: null }],
  },
];

const defaultBuilder = {
  select: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
};

beforeEach(() => {
  vi.clearAllMocks();
  getTodayInfo.mockReturnValue({ loc: "gudang", label: "Gudang", day: "Rabu" });
  vi.mocked(supabase.from).mockReturnValue({ ...defaultBuilder,
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  });
});

describe("LaporanPasar", () => {
  // ── Non-market day ──────────────────────────────────────────────────────────

  it("shows Bukan Hari Pasar on non-market day", () => {
    render(<LaporanPasar sales={[]} />);
    expect(screen.getByText("Bukan Hari Pasar")).toBeInTheDocument();
  });

  it("shows toggle tabs on non-market day", () => {
    render(<LaporanPasar sales={[]} />);
    expect(screen.getByText("Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("shows history view when History tab clicked on non-market day", async () => {
    render(<LaporanPasar sales={[]} />);
    fireEvent.click(screen.getByText("History"));
    await waitFor(() =>
      expect(screen.getByText("Belum ada history pasar.")).toBeInTheDocument()
    );
  });

  // ── Market day ─────────────────────────────────────────────────────────────

  it("renders market day header when loc is cideng", () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    render(<LaporanPasar sales={[]} />);
    expect(screen.getByText("Pasar Cideng")).toBeInTheDocument();
  });

  it("shows 'Belum ada transaksi' when no today sales at location", () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    render(<LaporanPasar sales={[]} />);
    expect(screen.getByText(/Belum ada transaksi di/)).toBeInTheDocument();
  });

  it("shows stat cards when today sales exist", () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    render(<LaporanPasar sales={todayCidengSales} />);
    expect(screen.getByText("Omset")).toBeInTheDocument();
    expect(screen.getByText("Keuntungan")).toBeInTheDocument();
    expect(screen.getByText("Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Retur")).toBeInTheDocument();
  });

  it("shows top produk section when sales have items", () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    render(<LaporanPasar sales={todayCidengSales} />);
    expect(screen.getByText("Top Produk Terjual")).toBeInTheDocument();
    expect(screen.getByText("D-01")).toBeInTheDocument();
  });

  it("shows Simpan PNG and Bagikan buttons", () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    render(<LaporanPasar sales={todayCidengSales} />);
    expect(screen.getByText("Simpan PNG")).toBeInTheDocument();
    expect(screen.getByText("Bagikan")).toBeInTheDocument();
  });

  it("renders toggle tabs on market day", () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    render(<LaporanPasar sales={[]} />);
    expect(screen.getByText("Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  // ── Download ────────────────────────────────────────────────────────────────

  it("calls toPng when Simpan PNG clicked", async () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    const { toPng } = await import("html-to-image");
    render(<LaporanPasar sales={todayCidengSales} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Simpan PNG"));
    });
    await waitFor(() => expect(toPng).toHaveBeenCalled());
  });

  // ── Share ───────────────────────────────────────────────────────────────────

  it("falls back to WA when navigator.share is unavailable", async () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    Object.assign(navigator, { share: undefined, canShare: undefined });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => {});
    render(<LaporanPasar sales={todayCidengSales} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Bagikan"));
    });
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining("wa.me"),
        "_blank"
      )
    );
    openSpy.mockRestore();
  });

  it("calls navigator.share with text when available but canShare is unavailable", async () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share: shareSpy, canShare: undefined });
    render(<LaporanPasar sales={todayCidengSales} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Bagikan"));
    });
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    Object.assign(navigator, { share: undefined });
  });

  // ── History view (market day) ───────────────────────────────────────────────

  it("switches to history view when History tab clicked on market day", async () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    render(<LaporanPasar sales={[]} />);
    fireEvent.click(screen.getByText("History"));
    await waitFor(() =>
      expect(screen.getByText("Belum ada history pasar.")).toBeInTheDocument()
    );
  });

  it("shows loading state while history is being fetched", async () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    // Use a never-resolving promise so loading stays true
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    render(<LaporanPasar sales={[]} />);
    fireEvent.click(screen.getByText("History"));
    expect(screen.getByText("Memuat history...")).toBeInTheDocument();
  });

  it("shows history entries when data is loaded", async () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "h1", date: yesterday, location: "cideng", type: "sale",
            total: 100000, created_at: yesterday + "T10:00:00Z",
            items: [{ kode: "D-01", harga: 100000, hpp: 70000, qty: 1, warna: null }],
            discount: 0 },
        ],
      }),
    });
    render(<LaporanPasar sales={[]} />);
    fireEvent.click(screen.getByText("History"));
    await waitFor(() =>
      expect(screen.getByText("Cideng")).toBeInTheDocument()
    );
  });

  it("expands history entry when card header clicked", async () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "h1", date: yesterday, location: "cideng", type: "sale",
            total: 100000, created_at: yesterday + "T10:00:00Z",
            items: [{ kode: "D-01", harga: 100000, hpp: 70000, qty: 2, warna: null }],
            discount: 0 },
        ],
      }),
    });
    render(<LaporanPasar sales={[]} />);
    fireEvent.click(screen.getByText("History"));
    await waitFor(() => expect(screen.getByText("Cideng")).toBeInTheDocument());
    // Click to expand
    fireEvent.click(screen.getByRole("button", { name: /Cideng/ }));
    expect(screen.getByText("Omset")).toBeInTheDocument();
  });

  it("collapses history entry when clicked again", async () => {
    getTodayInfo.mockReturnValue({ loc: "cideng", label: "Cideng", day: "Senin" });
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "h1", date: yesterday, location: "cideng", type: "sale",
            total: 100000, created_at: yesterday + "T10:00:00Z",
            items: [{ kode: "D-01", harga: 100000, hpp: 70000, qty: 1, warna: null }],
            discount: 0 },
        ],
      }),
    });
    render(<LaporanPasar sales={[]} />);
    fireEvent.click(screen.getByText("History"));
    await waitFor(() => expect(screen.getByText("Cideng")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Cideng/ }));
    // Now Omset section is visible
    expect(screen.getByText("Omset")).toBeInTheDocument();
    // Click again to collapse
    fireEvent.click(screen.getByRole("button", { name: /Cideng/ }));
    expect(screen.queryByText("Omset")).not.toBeInTheDocument();
  });

  it("renders with empty sales (smoke test)", () => {
    const { container } = render(<LaporanPasar sales={[]} />);
    expect(container).not.toBeEmptyDOMElement();
  });
});
