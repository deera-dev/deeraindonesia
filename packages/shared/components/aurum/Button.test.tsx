import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("default: variant primary, type button, tidak disabled", () => {
    render(<Button>Simpan</Button>);
    const btn = screen.getByRole("button", { name: "Simpan" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).toHaveClass("aurum-btn--primary", "aurum-btn--md");
    expect(btn).not.toBeDisabled();
  });

  it("loading: disabled & menampilkan spinner", () => {
    render(<Button loading>Simpan</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector(".aurum-spinner")).not.toBeNull();
  });

  it("glow cuma nempel kalau variant primary", () => {
    const { rerender } = render(
      <Button variant="primary" glow>
        X
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveClass("aurum-btn--glow");

    rerender(
      <Button variant="outline" glow>
        X
      </Button>,
    );
    expect(screen.getByRole("button")).not.toHaveClass("aurum-btn--glow");
  });

  it("klik memanggil onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Klik</Button>);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
