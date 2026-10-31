import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AllLocCountSheet from "./AllLocCountSheet";

const rows = [
  { id: "r1", kode: "D-1", size: "Midi", warna: "KREM", gudang: 20, cideng: 2, tegalgubug: 2 },
];
const product = { kode: "D-1", nama: "Gamis" };

describe("AllLocCountSheet", () => {
  it("simpan mengirim hanya lokasi yang berubah", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const onCheck = vi.fn().mockResolvedValue({ over: [] });
    render(
      <AllLocCountSheet
        product={product}
        rows={rows}
        onClose={() => {}}
        onSubmit={onSubmit}
        onCheck={onCheck}
      />,
    );
    expect(screen.getByText("Simpan")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("KREM, Midi, Cideng"), { target: { value: "5" } });
    expect(screen.getByTestId("all-summary").textContent).toContain("Cideng +3");
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ changed: { r1: { cideng: 5 } } }));
  });
});

describe("AllLocCountSheet blokir", () => {
  it("menonaktifkan Simpan bila stok naik dan melebihi produksi", async () => {
    const onCheck = vi.fn().mockResolvedValue({
      over: [{ size: "Midi", produced: 5, sold: 2, total_after: 9, excess: 6 }],
    });
    render(
      <AllLocCountSheet
        product={product}
        rows={rows}
        onClose={() => {}}
        onSubmit={vi.fn()}
        onCheck={onCheck}
      />,
    );
    fireEvent.change(screen.getByLabelText("KREM, Midi, Cideng"), { target: { value: "5" } });
    await waitFor(() => expect(screen.getByTestId("all-blocked")).toBeInTheDocument());
    expect(screen.getByText("Simpan")).toBeDisabled();
  });
});
