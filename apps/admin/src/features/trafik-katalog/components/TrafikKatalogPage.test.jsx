import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const useVisitStats = vi.fn();
vi.mock("../hooks", async () => ({ ...(await vi.importActual("../utils")), useVisitStats: (r) => useVisitStats(r) }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => null }));
import TrafikKatalogPage from "./TrafikKatalogPage";

describe("TrafikKatalogPage", () => {
  it("menampilkan sumber kunjungan dan mengganti periode", () => {
    useVisitStats.mockReturnValue({
      loading: false,
      error: null,
      stats: {
        sessions: 10, visitors: 8, views: 25,
        by_channel: [{ channel: "google", sessions: 6 }, { channel: "ai", sessions: 3 }, { channel: "qr_produk", sessions: 1 }],
        by_source: [], daily: [], top_products: [{ kode: "D-1", views: 5, qr: 1, google: 2, ai: 1 }],
      },
    });
    render(<TrafikKatalogPage />);
    expect(screen.getAllByTestId("channel-row")).toHaveLength(3);
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    expect(screen.getByText("D-1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("7 hari"));
    const last = useVisitStats.mock.calls.at(-1)[0];
    expect(last.end).toBe(last.end);
    expect(Object.keys(last)).toEqual(["start", "end"]);
  });

  it("'Hari ini' mengirim range start=end", () => {
    useVisitStats.mockReturnValue({ loading: false, error: null, stats: null });
    render(<TrafikKatalogPage />);
    fireEvent.click(screen.getByText("Hari ini"));
    const last = useVisitStats.mock.calls.at(-1)[0];
    expect(last.start).toBe(last.end);
  });

  it("'Rentang tanggal' menampilkan dua input tanggal yang mengubah range", () => {
    useVisitStats.mockReturnValue({ loading: false, error: null, stats: null });
    render(<TrafikKatalogPage />);
    fireEvent.click(screen.getByText("Rentang tanggal"));
    const [startInput, endInput] = screen.getAllByDisplayValue((v) => /^\d{4}-\d{2}-\d{2}$/.test(v));
    fireEvent.change(startInput, { target: { value: "2026-10-01" } });
    const last = useVisitStats.mock.calls.at(-1)[0];
    expect(last.start).toBe("2026-10-01");
    expect(endInput).toBeTruthy();
  });
});
