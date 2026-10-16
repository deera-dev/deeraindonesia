import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OverflowDialog from "./OverflowDialog";

const plan = {
  overflow: true,
  sizes: [
    { size: "Midi", produced: 65, total_after: 93, excess: 28, take_total: 18, unresolved: 3,
      adjustments: [{ warna: "KREM", gudang_from: 8, gudang_to: 0, take: 8 }] },
  ],
};

describe("OverflowDialog", () => {
  it("menampilkan rincian pengambilan dari gudang & peringatan sisa", () => {
    render(<OverflowDialog kode="D-048-ORB" locLabel="Cideng" plan={plan} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Stok melebihi produksi")).toBeInTheDocument();
    expect(screen.getByTestId("overflow-size")).toHaveTextContent("produksi 65 pcs");
    expect(screen.getByTestId("overflow-size")).toHaveTextContent("KREM");
    expect(screen.getByText(/sisa 3 pcs tetap melebihi produksi/)).toBeInTheDocument();
  });
  it("tombol konfirmasi & batal", () => {
    const ok = vi.fn();
    const no = vi.fn();
    render(<OverflowDialog kode="K" locLabel="Cideng" plan={plan} onConfirm={ok} onCancel={no} />);
    fireEvent.click(screen.getByText("Ya, ambil dari gudang"));
    fireEvent.click(screen.getByText("Batal"));
    expect(ok).toHaveBeenCalled();
    expect(no).toHaveBeenCalled();
  });
});
