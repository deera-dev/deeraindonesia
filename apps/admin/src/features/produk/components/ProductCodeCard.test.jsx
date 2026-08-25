import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductCodeCard from "./ProductCodeCard";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url, opts) => `cld:${url}:w${opts?.width ?? ""}`,
}));

const product = { kode: "D-091-SWI", image: "foto.jpg" };

describe("ProductCodeCard", () => {
  it("menampilkan kode dengan dash diganti spasi", () => {
    render(<ProductCodeCard product={product} size={null} />);
    expect(screen.getByText("D 091 SWI")).toBeInTheDocument();
  });

  it("gambar pakai cldUrl width tinggi (1080) utk hasil unduhan resolusi bagus", () => {
    render(<ProductCodeCard product={product} size={null} />);
    const img = screen.getByAltText("D-091-SWI");
    expect(img).toHaveAttribute("src", "cld:foto.jpg:w1080");
    expect(img).toHaveAttribute("crossOrigin", "anonymous");
  });

  it("menampilkan baris ukuran saat size diisi", () => {
    render(<ProductCodeCard product={product} size="Midi" />);
    expect(screen.getByText("Midi")).toBeInTheDocument();
  });

  it("TIDAK menampilkan baris ukuran saat size null", () => {
    render(<ProductCodeCard product={product} size={null} />);
    expect(screen.queryByText("Midi")).not.toBeInTheDocument();
  });

  it("tidak merender <img> saat product.image kosong", () => {
    render(<ProductCodeCard product={{ kode: "D-091-SWI", image: null }} size={null} />);
    expect(screen.queryByAltText("D-091-SWI")).not.toBeInTheDocument();
  });

  it("forwardRef mengarah ke elemen kartu terluar", () => {
    const ref = React.createRef();
    render(<ProductCodeCard ref={ref} product={product} size={null} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current.style.position).toBe("relative");
  });
});
