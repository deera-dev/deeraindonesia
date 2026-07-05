import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("mode terang: aria-label & title mengarah ke aksi 'aktifkan gelap'", () => {
    render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    const btn = screen.getByRole("button", { name: "Aktifkan mode gelap" });
    expect(btn).toHaveAttribute("title", "Mode gelap");
  });

  it("mode gelap: aria-label & title mengarah ke aksi 'aktifkan terang'", () => {
    render(<ThemeToggle isDark={true} onToggle={() => {}} />);
    const btn = screen.getByRole("button", { name: "Aktifkan mode terang" });
    expect(btn).toHaveAttribute("title", "Mode terang");
  });

  it("klik tombol memanggil onToggle", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle isDark={false} onToggle={onToggle} />);
    screen.getByRole("button").click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("posisi thumb di kanan saat mode terang (siang)", () => {
    const { container } = render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    const circles = container.querySelectorAll("circle");
    const thumb = circles[circles.length - 1];
    expect(thumb.getAttribute("cx")).toBe("45");
  });

  it("posisi thumb di kiri saat mode gelap (malam)", () => {
    const { container } = render(<ThemeToggle isDark={true} onToggle={() => {}} />);
    const circles = container.querySelectorAll("circle");
    const thumb = circles[circles.length - 1];
    expect(thumb.getAttribute("cx")).toBe("15");
  });

  it("render seluruh elemen circle (matahari+halo, 6 bintang, mask bulan, bulan, thumb)", () => {
    const { container } = render(<ThemeToggle isDark={true} onToggle={() => {}} />);
    expect(container.querySelectorAll("circle").length).toBe(12);
  });
});
