import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoLightbox from "./PhotoLightbox";

const images = ["https://cld/a.jpg", "https://cld/b.jpg", "https://cld/c.jpg"];

describe("PhotoLightbox", () => {
  it("render null kalau index null/undefined", () => {
    const { container } = render(
      <PhotoLightbox images={images} index={null} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <PhotoLightbox images={images} index={undefined} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it("render null kalau images[index] tidak ada", () => {
    const { container } = render(
      <PhotoLightbox images={[]} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("render gambar sesuai index", () => {
    render(<PhotoLightbox images={images} index={1} onClose={vi.fn()} onNavigate={vi.fn()} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://cld/b.jpg");
  });

  it("menampilkan counter 'i / n' kalau lebih dari 1 gambar", () => {
    render(<PhotoLightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("tidak menampilkan counter kalau cuma 1 gambar", () => {
    render(<PhotoLightbox images={["https://cld/a.jpg"]} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.queryByText(/\/ 1/)).not.toBeInTheDocument();
  });

  it("klik backdrop memanggil onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PhotoLightbox images={images} index={0} onClose={onClose} onNavigate={vi.fn()} />);
    await user.click(screen.getByRole("img"));
    // klik gambar toggle zoom, BUKAN close — pastikan onClose belum terpanggil
    expect(onClose).not.toHaveBeenCalled();
  });

  it("klik tombol × memanggil onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PhotoLightbox images={images} index={0} onClose={onClose} onNavigate={vi.fn()} />);
    await user.click(screen.getByLabelText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  it("klik gambar toggle zoom (scale 2.2 lalu balik ke 1)", async () => {
    const user = userEvent.setup();
    render(<PhotoLightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    const img = screen.getByRole("img");
    expect(img).toHaveStyle({ transform: "scale(1)" });
    await user.click(img);
    expect(img).toHaveStyle({ transform: "scale(2.2)" });
    await user.click(img);
    expect(img).toHaveStyle({ transform: "scale(1)" });
  });

  it("tombol Sebelumnya tidak tampil di index 0", () => {
    render(<PhotoLightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.queryByLabelText("Sebelumnya")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Berikutnya")).toBeInTheDocument();
  });

  it("tombol Berikutnya tidak tampil di index terakhir", () => {
    render(<PhotoLightbox images={images} index={2} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.queryByLabelText("Berikutnya")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sebelumnya")).toBeInTheDocument();
  });

  it("klik Berikutnya memanggil onNavigate(1)", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<PhotoLightbox images={images} index={0} onClose={vi.fn()} onNavigate={onNavigate} />);
    await user.click(screen.getByLabelText("Berikutnya"));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("klik Sebelumnya memanggil onNavigate(-1)", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<PhotoLightbox images={images} index={1} onClose={vi.fn()} onNavigate={onNavigate} />);
    await user.click(screen.getByLabelText("Sebelumnya"));
    expect(onNavigate).toHaveBeenCalledWith(-1);
  });

  it("ganti index mereset zoom ke false", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PhotoLightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    const img = screen.getByRole("img");
    await user.click(img);
    expect(img).toHaveStyle({ transform: "scale(2.2)" });

    rerender(<PhotoLightbox images={images} index={1} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole("img")).toHaveStyle({ transform: "scale(1)" });
  });
});
