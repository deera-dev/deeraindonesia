import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductCodeImageModal from "./ProductCodeImageModal";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => `cld:${url}`,
}));

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

import { toPng } from "html-to-image";

const productSatuUkuran = {
  kode: "D-091-SWI",
  image: "foto.jpg",
  variants: [{ size: "Midi", harga: 280000 }],
};

const productMultiUkuran = {
  kode: "D-090-GEN",
  image: "foto2.jpg",
  variants: [
    { size: "Midi", harga: 280000 },
    { size: "Midi Jumbo", harga: 300000 },
    { size: "Gamis", harga: 0 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  toPng.mockResolvedValue("data:image/png;base64,TESTDATA");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProductCodeImageModal", () => {
  it("TIDAK menampilkan picker ukuran kalau cuma 1 varian berharga", () => {
    render(<ProductCodeImageModal product={productSatuUkuran} onClose={() => {}} />);
    expect(screen.getAllByText("Midi")).toHaveLength(1);
  });

  it("menampilkan picker ukuran (hanya varian harga>0) kalau produk punya >1 ukuran, default pilih yang pertama", () => {
    render(<ProductCodeImageModal product={productMultiUkuran} onClose={() => {}} />);
    const midiButtons = screen.getAllByText("Midi", { selector: "button" });
    expect(midiButtons).toHaveLength(1);
    expect(screen.getByText("Midi Jumbo")).toBeInTheDocument();
    expect(screen.queryByText("Gamis")).not.toBeInTheDocument();
  });

  it("klik ukuran lain di picker mengganti ukuran yang tampil di preview", async () => {
    const user = userEvent.setup();
    render(<ProductCodeImageModal product={productMultiUkuran} onClose={() => {}} />);

    expect(screen.getAllByText("Midi")).toHaveLength(2);

    await user.click(screen.getByText("Midi Jumbo"));

    expect(screen.getAllByText("Midi Jumbo")).toHaveLength(2);
  });

  it("Unduh Gambar memanggil toPng dan trigger anchor .click() dgn filename kode+ukuran", async () => {
    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") capturedAnchor = el;
      return el;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    render(<ProductCodeImageModal product={productSatuUkuran} onClose={() => {}} />);
    await user.click(screen.getByText("Unduh Gambar"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(capturedAnchor?.download).toBe("D-091-SWI-Midi.png"));
  });

  it("filename tanpa suffix ukuran kalau produk tidak punya varian berharga sama sekali", async () => {
    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") capturedAnchor = el;
      return el;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    render(<ProductCodeImageModal product={{ kode: "D-091-SWI", image: "foto.jpg", variants: [] }} onClose={() => {}} />);
    await user.click(screen.getByText("Unduh Gambar"));

    await waitFor(() => expect(capturedAnchor?.download).toBe("D-091-SWI.png"));
  });

  it("memanggil onClose saat tombol × atau backdrop diklik", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<ProductCodeImageModal product={productSatuUkuran} onClose={onClose} />);

    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
