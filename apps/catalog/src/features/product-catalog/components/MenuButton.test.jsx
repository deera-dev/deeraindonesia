import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../../../../../test/helpers/renderWithRouter.jsx";
import MenuButton from "./MenuButton";

async function renderMenu(props = {}) {
  return renderWithRouter({
    initialPath: "/",
    routes: {
      "/": () => (
        <MenuButton
          hasActiveFilter={false}
          favoriteCount={0}
          onFilter={vi.fn()}
          onSearch={vi.fn()}
          onVisitUs={vi.fn()}
          onGrosirInfo={vi.fn()}
          {...props}
        />
      ),
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MenuButton", () => {
  it("dropdown tertutup secara default (Filter/Cari/Favorit/Visit Us tidak terlihat)", async () => {
    await renderMenu();
    expect(screen.queryByText("Filter")).toBeNull();
    expect(screen.queryByText("Cari")).toBeNull();
    expect(screen.queryByText("Favorit")).toBeNull();
    expect(screen.queryByText("Visit Us")).toBeNull();
  });

  it("klik tombol hamburger membuka dropdown", async () => {
    await renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Filter")).toBeInTheDocument();
    expect(screen.getByText("Cari")).toBeInTheDocument();
    expect(screen.getByText("Favorit")).toBeInTheDocument();
    expect(screen.getByText("Visit Us")).toBeInTheDocument();
  });

  it("tidak menampilkan titik indikator saat tidak ada filter aktif & favorit kosong", async () => {
    const { container } = await renderMenu({ hasActiveFilter: false, favoriteCount: 0 });
    expect(container.querySelector(".bg-skin-accent.rounded-full")).toBeNull();
  });

  it("menampilkan titik indikator saat filter aktif", async () => {
    await renderMenu({ hasActiveFilter: true });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(
      screen.getByRole("button", { name: "Menu" }).querySelector("span.bg-skin-accent"),
    ).toBeTruthy();
  });

  it("menampilkan titik indikator saat ada favorit", async () => {
    await renderMenu({ favoriteCount: 2 });
    expect(
      screen.getByRole("button", { name: "Menu" }).querySelector("span.bg-skin-accent"),
    ).toBeTruthy();
  });

  it("klik Filter memanggil onFilter & menutup dropdown", async () => {
    const onFilter = vi.fn();
    await renderMenu({ onFilter });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByText("Filter"));
    expect(onFilter).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Cari")).toBeNull();
  });

  it("klik Cari memanggil onSearch & menutup dropdown", async () => {
    const onSearch = vi.fn();
    await renderMenu({ onSearch });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByText("Cari"));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("klik Visit Us memanggil onVisitUs & menutup dropdown", async () => {
    const onVisitUs = vi.fn();
    await renderMenu({ onVisitUs });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByText("Visit Us"));
    expect(onVisitUs).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("link Favorit mengarah ke /favorit & menampilkan jumlah saat count > 0", async () => {
    await renderMenu({ favoriteCount: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const link = screen.getByRole("link", { name: /Favorit/ });
    expect(link).toHaveAttribute("href", "/favorit");
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("klik link Favorit menutup dropdown", async () => {
    await renderMenu({ favoriteCount: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("link", { name: /Favorit/ }));
    expect(screen.queryByText("Cari")).toBeNull();
  });

  it("klik backdrop menutup dropdown", async () => {
    const { container } = await renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Filter")).toBeInTheDocument();
    const backdrop = container.querySelector(".fixed.inset-0.z-40");
    fireEvent.click(backdrop);
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("klik tombol Tutup (X) di header panel menutup dropdown", async () => {
    await renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Filter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tutup menu" }));
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("aria-expanded mencerminkan status buka/tutup", async () => {
    await renderMenu();
    const btn = screen.getByRole("button", { name: "Menu" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("tombol Escape menutup dropdown/panel", async () => {
    await renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Filter")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("tidak bereaksi ke tombol selain Escape", async () => {
    await renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("render tepi bawah bergelombang (SVG wave) untuk panel mobile saat terbuka", async () => {
    const { container } = await renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(container.querySelector("svg path")).toBeTruthy();
  });

  it("melepas event listener keydown saat unmount", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = await renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});

describe("MenuButton — Cara Order", () => {
  it("klik Cara Order memanggil onGrosirInfo & menutup dropdown", async () => {
    const onGrosirInfo = vi.fn();
    await renderMenu({ onGrosirInfo });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByText("Cara Order"));
    expect(onGrosirInfo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Filter")).toBeNull();
  });
});
