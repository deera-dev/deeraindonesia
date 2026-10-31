import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_HPP_FILTER } from "../store";
import HPPFilterModal from "./HPPFilterModal";

function renderModal(props = {}) {
  return render(
    <HPPFilterModal
      draft={{ ...DEFAULT_HPP_FILTER }}
      onChange={vi.fn()}
      previewCount={3}
      onApply={vi.fn()}
      onReset={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

describe("HPPFilterModal", () => {
  it("menampilkan judul dan bagian filter", () => {
    renderModal();
    expect(screen.getByText("Filter Template HPP")).toBeInTheDocument();
    expect(screen.getByText("Rentang Total HPP")).toBeInTheDocument();
    expect(screen.getByText("Urutkan")).toBeInTheDocument();
  });

  it("tombol Terapkan menampilkan previewCount", () => {
    renderModal({ previewCount: 4 });
    expect(screen.getByRole("button", { name: "Terapkan (4)" })).toBeInTheDocument();
  });

  it("ubah input hppMin memanggil onChange dengan patch yang benar", () => {
    const onChange = vi.fn();
    renderModal({ onChange });
    fireEvent.change(screen.getByPlaceholderText("Min"), { target: { value: "50000" } });
    expect(onChange).toHaveBeenCalledWith({ hppMin: "50000" });
  });

  it("ubah input hppMax memanggil onChange dengan patch yang benar", () => {
    const onChange = vi.fn();
    renderModal({ onChange });
    fireEvent.change(screen.getByPlaceholderText("Max"), { target: { value: "150000" } });
    expect(onChange).toHaveBeenCalledWith({ hppMax: "150000" });
  });

  it("ubah select Urutkan memanggil onChange", () => {
    const onChange = vi.fn();
    renderModal({ onChange });
    fireEvent.change(screen.getByDisplayValue("Produk: Terbaru"), {
      target: { value: "hpp-terendah" },
    });
    expect(onChange).toHaveBeenCalledWith({ sort: "hpp-terendah" });
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
