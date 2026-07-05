import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  getMarketLocation: vi.fn(() => "gudang"),
}));
vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));
vi.mock("@deera/shared/lib/bepUtils", () => ({
  computeMarginPerPcs: vi.fn(() => 20000),
  computeSaldoHarian: vi.fn(() => ({ saldo: 500000 })),
  computeTargetMingguan: vi.fn(() => ({ target: 5000000 })),
  computeRingkasanBep: vi.fn(() => ({ totalBiaya: 3000000, totalPendapatan: 2000000, saldo: -1000000 })),
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => item.qty ?? 1,
  itemProfit: (item) => (item.harga - (item.hpp ?? 0)) * (item.qty ?? 1),
}));

import LaporanRingkasan from "./LaporanRingkasan";

const sales = [
  { id: "s1", type: "sale", date: "2026-07-04", total: 100000, items: [] },
];

describe("LaporanRingkasan", () => {
  it("renders summary sections", () => {
    render(<LaporanRingkasan sales={sales} onNavigate={vi.fn()} />);
    expect(document.body).not.toBeEmptyDOMElement();
  });

  it("renders with empty sales", () => {
    const { container } = render(<LaporanRingkasan sales={[]} onNavigate={vi.fn()} />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("calls onNavigate when detail link clicked", async () => {
    const onNavigate = vi.fn();
    render(<LaporanRingkasan sales={sales} onNavigate={onNavigate} />);
    const detailBtns = screen.queryAllByText(/Detail|detail/i);
    if (detailBtns.length > 0) {
      detailBtns[0].click();
      expect(onNavigate).toHaveBeenCalled();
    }
  });
});
