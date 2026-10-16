import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AllLocCountSheet from "./AllLocCountSheet";

const rows = [{ id: "r1", kode: "D-1", size: "Midi", warna: "KREM", gudang: 20, cideng: 2, tegalgubug: 2 }];
const product = { kode: "D-1", nama: "Gamis" };

describe("AllLocCountSheet", () => {
  it("simpan mengirim hanya lokasi yang berubah dan menampilkan peringatan backend", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const onCheck = vi.fn().mockResolvedValue({ over: [{ size: "Midi", produced: 65, sold: 2, total_after: 77, excess: 14 }] });
    render(<AllLocCountSheet product={product} rows={rows} onClose={() => {}} onSubmit={onSubmit} onCheck={onCheck} />);
    expect(screen.getByText("Simpan")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("KREM, Midi, Cideng"), { target: { value: "5" } });
    expect(screen.getByTestId("all-summary").textContent).toContain("Cideng +3");
    await waitFor(() => expect(screen.getByTestId("all-over")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ changed: { r1: { cideng: 5 } } }));
  });
});
