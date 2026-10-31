import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FavoriteButton from "./FavoriteButton";

describe("FavoriteButton", () => {
  it("render bintang kosong & aria-pressed=false saat active=false", () => {
    render(<FavoriteButton active={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Tambah ke favorit" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn.textContent).toBe("☆");
  });

  it("render bintang penuh & aria-pressed=true saat active=true", () => {
    render(<FavoriteButton active={true} onToggle={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Hapus dari favorit" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn.textContent).toBe("★");
  });

  it("klik memanggil onToggle & mencegah propagasi/default", () => {
    const onToggle = vi.fn();
    render(<FavoriteButton active={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("size='lg' memakai kelas ukuran lebih besar", () => {
    render(<FavoriteButton active={false} onToggle={vi.fn()} size="lg" />);
    expect(screen.getByRole("button").className).toContain("w-11");
  });
});
