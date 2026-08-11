import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BatchFilterModal from "./BatchFilterModal";
import { DEFAULT_BATCH_FILTER } from "../store";

function renderModal(props = {}) {
  return render(
    <BatchFilterModal
      draft={{ ...DEFAULT_BATCH_FILTER }}
      onChange={vi.fn()}
      previewCount={5}
      onApply={vi.fn()}
      onReset={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

describe("BatchFilterModal", () => {
  it("menampilkan judul dan semua bagian filter", () => {
    renderModal();
    expect(screen.getByText("Filter Catatan Produksi")).toBeInTheDocument();
    expect(screen.getByText("Rentang Tanggal Produksi")).toBeInTheDocument();
    expect(screen.getByText("Rentang Jumlah Potong")).toBeInTheDocument();
    expect(screen.getByText("Rentang HPP / pcs")).toBeInTheDocument();
    expect(screen.getByText("Rentang Upah Jahit / pcs")).toBeInTheDocument();
    expect(screen.getByText("Status Bahan")).toBeInTheDocument();
    expect(screen.getByText("Urutkan")).toBeInTheDocument();
  });

  it("tombol Terapkan menampilkan previewCount", () => {
    renderModal({ previewCount: 7 });
    expect(screen.getByRole("button", { name: "Terapkan (7)" })).toBeInTheDocument();
  });

  it("ubah input potongMin memanggil onChange dengan patch yang benar", () => {
    const onChange = vi.fn();
    renderModal({ onChange });
    const [potongMin] = screen.getAllByPlaceholderText("Min");
    fireEvent.change(potongMin, { target: { value: "10" } });
    expect(onChange).toHaveBeenCalledWith({ potongMin: "10" });
  });

  it("ubah select Status Bahan memanggil onChange", () => {
    const onChange = vi.fn();
    renderModal({ onChange });
    fireEvent.change(screen.getByDisplayValue("Semua"), { target: { value: "belum" } });
    expect(onChange).toHaveBeenCalledWith({ bahanStatus: "belum" });
  });

  it("ubah select Urutkan memanggil onChange", () => {
    const onChange = vi.fn();
    renderModal({ onChange });
    fireEvent.change(screen.getByDisplayValue("Tanggal: Terbaru"), {
      target: { value: "hpp-tertinggi" },
    });
    expect(onChange).toHaveBeenCalledWith({ sort: "hpp-tertinggi" });
  });

  it("klik Terapkan memanggil onApply", () => {
    const onApply = vi.fn();
    renderModal({ onApply });
    fireEvent.click(screen.getByRole("button", { name: /Terapkan/ }));
    expect(onApply).toHaveBeenCalled();
  });

  it("klik Reset memanggil onReset", () => {
    const onReset = vi.fn();
    renderModal({ onReset });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalled();
  });

  it("klik tombol close (×) memanggil onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("klik overlay memanggil onClose", () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    fireEvent.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });
});
