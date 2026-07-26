import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MenuButton from "./MenuButton";

function renderMenu(props = {}) {
  return render(
    <MemoryRouter>
      <MenuButton
        hasActiveFilter={false}
        favoriteCount={0}
        onFilter={vi.fn()}
        onSearch={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MenuButton", () => {
  it("dropdown tertutup secara default (Filter/Cari/Favorit tidak terlihat)", () => {
    renderMenu();
    expect(screen.queryByText("Filter")).toBeNull();
    expect(screen.queryByText("Cari")).toBeNull();
    expect(screen.queryByText("Favorit")).toBeNull();
  });

  it("klik tombol hamburger membuka dropdown", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Filter")).toBeInTheDocument();
    expect(screen.getByText("Cari")).toBeInTheDocument();
    expect(screen.getByText("Favorit")).toBeInTheDocument();
  });

  it("tidak menampilkan titik indikator saat tidak ada filter aktif & favorit kosong", () => {
    const { container } = renderMenu({ hasActiveFilter: false, favoriteCount: 0 });
    expect(container.querySelector(".bg-\\[\\#cab170\\].rounded-full")).toBeNull();
  });

  it("menampilkan titik indikator saat filter aktif", () => {
    renderMenu({ hasActiveFilter: true });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    // titik indikator ada di tombol hamburger + titik indikator filter di item Filter
    expect(screen.getByRole("button", { name: "Menu" }).querySelector("span.bg-\\[\\#cab170\\]")).toBeTruthy();
  });

  it("menampilkan titik indikator saat ada favorit", () => {
    renderMenu({ favoriteCount: 2 });
    expect(screen.getByRole("button", { name: "Menu" }).querySelector("span.bg-\\[\\#cab170\\]")).toBeTruthy();
  });

  it("klik Filter memanggil onFilter & menutup dropdown", () => {
    const onFilter = vi.fn();
    renderMenu({ onFilter });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByText("Filter"));
    expect(onFilter).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Cari")).toBeNull();
  });

  it("klik Cari memanggil onSearch & menutup dropdown", () => {
    const onSearch = vi.fn();
    renderMenu({ onSearch });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByText("Cari"));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("link Favorit mengarah ke /favorit & menampilkan jumlah saat count > 0", () => {
    renderMenu({ favoriteCount: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const link = screen.getByRole("link", { name: /Favorit/ });
    expect(link).toHaveAttribute("href", "/favorit");
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("klik link Favorit menutup dropdown", () => {
    renderMenu({ favoriteCount: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("link", { name: /Favorit/ }));
    expect(screen.queryByText("Cari")).toBeNull();
  });

  it("klik backdrop menutup dropdown", () => {
    const { container } = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Filter")).toBeInTheDocument();
    const backdrop = container.querySelector(".fixed.inset-0.z-40");
    fireEvent.click(backdrop);
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("aria-expanded mencerminkan status buka/tutup", () => {
    renderMenu();
    const btn = screen.getByRole("button", { name: "Menu" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("tombol Escape menutup dropdown/panel", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Filter")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("tidak bereaksi ke tombol selain Escape", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("render tepi bawah bergelombang (SVG wave) untuk panel mobile saat terbuka", () => {
    const { container } = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(container.querySelector("svg path")).toBeTruthy();
  });

  it("melepas event listener keydown saat unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});
