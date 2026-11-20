import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("open=false -> tidak render apa-apa", () => {
    const { container } = render(
      <Modal open={false} title="X" onClose={() => {}}>
        Isi
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("open=true -> render title, children, footer", () => {
    render(
      <Modal open title="Hapus produk?" onClose={() => {}} footer={<button>Ya</button>}>
        Yakin mau hapus?
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Hapus produk?" })).toBeInTheDocument();
    expect(screen.getByText("Yakin mau hapus?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ya" })).toBeInTheDocument();
  });

  it("klik tombol tutup & scrim memanggil onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="X" onClose={onClose}>
        Isi
      </Modal>,
    );
    screen.getByRole("button", { name: "Tutup" }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
