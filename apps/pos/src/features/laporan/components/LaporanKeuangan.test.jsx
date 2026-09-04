import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,abc"),
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => item.qty ?? 1,
  itemProfit: (item) => (item.harga - (item.hpp ?? 0)) * (item.qty ?? 1),
}));

import LaporanKeuangan from "./LaporanKeuangan";

// Retur (s2) SENGAJA ditaruh di tanggal LAIN (07-05) dari transaksi sale-nya
// (07-04) — permintaan Denny 2026-09: retur harus mengurangi omset di
// tanggal retur itu DIPROSES (t.date), bukan tanggal transaksi asal.
const sales = [
  { id: "s1", type: "sale", date: "2026-07-04", total: 100000, discount: 0,
    items: [{ kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, qty: 1 }] },
  { id: "s2", type: "retur", date: "2026-07-05", total: 40000, discount: 0,
    items: [{ kode: "D-02", size: "Gamis", harga: 40000, hpp: 30000, qty: 1 }] },
];

describe("LaporanKeuangan", () => {
  it("renders Omset section", () => {
    render(<LaporanKeuangan sales={sales} />);
    expect(screen.getAllByText(/Omset|omset/i)[0]).toBeInTheDocument();
  });

  it("shows total omset from non-retur sales", () => {
    render(<LaporanKeuangan sales={sales} />);
    expect(screen.getByText("100000")).toBeInTheDocument();
  });

  it("renders with empty sales", () => {
    const { container } = render(<LaporanKeuangan sales={[]} />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("shows keuntungan section", () => {
    render(<LaporanKeuangan sales={sales} />);
    expect(screen.getAllByText(/Untung|keuntungan|Keuntungan/i)[0]).toBeInTheDocument();
  });

  // ── Retur sbg pengurang di tanggal proses (permintaan Denny 2026-09) ──────
  describe("Omset per Hari — retur sbg pengurang di tanggal proses", () => {
    it("hari retur (07-05) menampilkan omset NEGATIF, bukan dikeluarkan dari breakdown", () => {
      render(<LaporanKeuangan sales={sales} />);
      expect(screen.getByText("-40000")).toBeInTheDocument();
    });

    it("hari retur juga menampilkan keuntungan negatif (bukan disembunyikan)", () => {
      render(<LaporanKeuangan sales={sales} />);
      expect(screen.getByText("-10000")).toBeInTheDocument();
    });

    it("hari transaksi asal (07-04) TIDAK ikut terpotong — retur nempel di tanggalnya sendiri", () => {
      render(<LaporanKeuangan sales={sales} />);
      // "100000" murni (bukan "-100000" atau angka lain) berarti hari 07-04
      // tidak tersentuh retur yang tanggalnya beda.
      expect(screen.getByText("100000")).toBeInTheDocument();
      expect(screen.queryByText("60000")).not.toBeInTheDocument();
    });

    it("kartu Omset keseluruhan tetap dari realSales saja, tidak ikut dikurangi retur", () => {
      render(<LaporanKeuangan sales={sales} />);
      expect(screen.getByText("Rp 100000")).toBeInTheDocument();
    });
  });
});
