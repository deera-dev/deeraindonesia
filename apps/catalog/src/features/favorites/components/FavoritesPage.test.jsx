import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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

function renderPage() {
  return render(
    <MemoryRouter>
      <FavoritesPage />
    </MemoryRouter>
  );
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
  it("menampilkan MEMUAT saat loading", () => {
    productsState.loading = true;
    renderPage();
    expect(screen.getByText("MEMUAT...")).toBeInTheDocument();
  });

  it("menampilkan pesan kosong & link Jelajahi Katalog saat belum ada favorit", () => {
    renderPage();
    expect(screen.getByText("BELUM ADA PRODUK FAVORIT")).toBeInTheDocument();
    expect(screen.getByText("Jelajahi Katalog")).toHaveAttribute("href", "/catalog");
  });

  it("hanya menampilkan produk yang ada di favoriteKodes", () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg" },
      { kode: "B", nama: "Produk B", image: "b.jpg" },
    ];
    favState.favoriteKodes = new Set(["A"]);
    favState.count = 1;
    renderPage();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("B")).toBeNull();
    expect(screen.getByText("1 favorit")).toBeInTheDocument();
  });

  it("klik bintang pada kartu memanggil toggle(kode)", () => {
    productsState.products = [{ kode: "A", nama: "Produk A", image: "a.jpg" }];
    favState.favoriteKodes = new Set(["A"]);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hapus dari favorit" }));
    expect(favState.toggle).toHaveBeenCalledWith("A");
  });

  it("klik Share memanggil shareFavoritesViaWA dengan daftar produk favorit", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg" },
      { kode: "B", nama: "Produk B", image: "b.jpg" },
    ];
    favState.favoriteKodes = new Set(["A", "B"]);
    renderPage();

    fireEvent.click(screen.getByText("Share 2 Produk"));
    expect(shareFavoritesViaWA).toHaveBeenCalledWith([
      { kode: "A", nama: "Produk A", image: "a.jpg" },
      { kode: "B", nama: "Produk B", image: "b.jpg" },
    ]);

    await waitFor(() => expect(screen.getByText("Share 2 Produk")).toBeInTheDocument());
  });

  it("klik Hapus Semua memanggil clear()", () => {
    productsState.products = [{ kode: "A", nama: "Produk A", image: "a.jpg" }];
    favState.favoriteKodes = new Set(["A"]);
    renderPage();
    fireEvent.click(screen.getByText("Hapus Semua"));
    expect(favState.clear).toHaveBeenCalledTimes(1);
  });
});
