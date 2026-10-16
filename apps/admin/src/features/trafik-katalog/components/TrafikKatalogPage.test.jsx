import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const useVisitStats = vi.fn();
vi.mock("../hooks", async () => ({ ...(await vi.importActual("../utils")), PERIODS: [7, 30, 90], useVisitStats: (d) => useVisitStats(d) }));
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
    expect(useVisitStats).toHaveBeenLastCalledWith(7);
  });
});
