import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductPhotoBanner from "./ProductPhotoBanner";

describe("ProductPhotoBanner", () => {
  it("menampilkan placeholder dan tombol nonaktif kalau belum ada foto", () => {
    render(<ProductPhotoBanner image={null} kode="D-1" />);
    expect(screen.getByText("Belum ada foto")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("klik foto membuka full image, klik lagi menutup", () => {
    render(<ProductPhotoBanner image="https://res.cloudinary.com/demo/image/upload/foo.jpg" kode="D-1" />);
    expect(screen.getAllByRole("img", { name: "D-1" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button"));
    const images = screen.getAllByRole("img", { name: "D-1" });
    expect(images).toHaveLength(2);
    expect(images[1]).toHaveAttribute("src", expect.stringContaining("res.cloudinary.com"));
    fireEvent.click(screen.getByLabelText("Tutup foto"));
    expect(screen.getAllByRole("img", { name: "D-1" })).toHaveLength(1);
  });
});
