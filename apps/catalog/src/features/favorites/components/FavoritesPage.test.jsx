import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../../../../../test/helpers/renderWithRouter.jsx";

const productsState = { products: [], loading: false };
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: () => productsState,
}));

const favState = { favoriteKodes: new Set(), toggle: vi.fn(), clear: vi.fn(), count: 0 };
vi.mock("../hooks", () => ({
  useFavorites: () => favState,
}));

const shareFavoritesViaWA = vi.fn().mockResolvedValue({ method: "share-file" });
vi.mock("../utils", () => ({
  shareFavoritesViaWA: (...args) => shareFavoritesViaWA(...args),
}));

const { default: FavoritesPage } = await import("./FavoritesPage");

async function renderPage() {
  return renderWithRouter({
    initialPath: "/favorit",
    routes: { "/favorit": FavoritesPage },
  });
}

beforeEach(() => {
  productsState.products = [];
  productsState.loading = false;
  favState.favoriteKodes = new Set();
  favState.count = 0;
  favState.toggle.mockReset();
  favState.clear.mockReset();
  shareFavoritesViaWA.mockReset().mockResolvedValue({ method: "share-file" });
});

describe("FavoritesPage", () => {
  it("menampilkan MEMUAT saat loading", async () => {
    productsState.loading = true;
    await renderPage();
    expect(screen.getByText("MEMUAT...")).toBeInTheDocument();
  });

  it("menampilkan pesan kosong & link Jelajahi Katalog saat belum ada favorit", async () => {
    await renderPage();
    expect(screen.getByText("BELUM ADA PRODUK FAVORIT")).toBeInTheDocument();
    expect(screen.getByText("Jelajahi Katalog")).toHaveAttribute("href", "/catalog");
  });

  it("hanya menampilkan produk yang ada di favoriteKodes", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg" },
      { kode: "B", nama: "Produk B", image: "b.jpg" },
    ];
    favState.favoriteKodes = new Set(["A"]);
    favState.count = 1;
    await renderPage();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("B")).toBeNull();
    expect(screen.getByText("1 favorit")).toBeInTheDocument();
  });

  it("klik bintang pada kartu memanggil toggle(kode)", async () => {
    productsState.products = [{ kode: "A", nama: "Produk A", image: "a.jpg" }];
    favState.favoriteKodes = new Set(["A"]);
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hapus dari favorit" }));
    expect(favState.toggle).toHaveBeenCalledWith("A");
  });

  it("klik Share memanggil shareFavoritesViaWA dengan daftar produk favorit", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg" },
      { kode: "B", nama: "Produk B", image: "b.jpg" },
    ];
    favState.favoriteKodes = new Set(["A", "B"]);
    await renderPage();

    fireEvent.click(screen.getByText("Share 2 Produk"));
    expect(shareFavoritesViaWA).toHaveBeenCalledWith([
      { kode: "A", nama: "Produk A", image: "a.jpg" },
      { kode: "B", nama: "Produk B", image: "b.jpg" },
    ]);

    await waitFor(() => expect(screen.getByText("Share 2 Produk")).toBeInTheDocument());
  });

  it("klik Hapus Semua memanggil clear()", async () => {
    productsState.products = [{ kode: "A", nama: "Produk A", image: "a.jpg" }];
    favState.favoriteKodes = new Set(["A"]);
    await renderPage();
    fireEvent.click(screen.getByText("Hapus Semua"));
    expect(favState.clear).toHaveBeenCalledTimes(1);
  });
});
