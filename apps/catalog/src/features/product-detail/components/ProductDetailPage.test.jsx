import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const productState = { product: undefined, loading: false, error: null };
const productsListState = { products: [] };
const receivedKode = [];
let lastKode;

vi.mock("@deera/shared/features/products/hooks", () => ({
  useProduct: (kode) => {
    lastKode = kode;
    receivedKode.push(kode);
    return productState;
  },
  useProducts: () => productsListState,
}));

const shareProductViaWA = vi.fn().mockResolvedValue({ method: "share-file" });
vi.mock("../utils", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    shareProductViaWA: (...args) => shareProductViaWA(...args),
  };
});

let soldOutSetValue = new Set();
let limitedStokSetValue = new Set();
vi.mock("../../product-catalog/hooks", () => ({
  useSoldOutSet: () => soldOutSetValue,
  useLimitedStokSet: () => limitedStokSetValue,
}));

const favToggle = vi.fn();
let favoriteKodesValue = new Set();
vi.mock("../../favorites/hooks", () => ({
  useFavorites: () => ({ favoriteKodes: favoriteKodesValue, toggle: favToggle }),
}));

const { default: ProductDetailPage } = await import("./ProductDetailPage");

function renderAt(kode = "D-07-OSK") {
  return render(
    <MemoryRouter initialEntries={[`/code/${kode}`]}>
      <Routes>
        <Route path="/code/:kode" element={<ProductDetailPage />} />
        <Route path="/catalog" element={<div>CATALOG-PLACEHOLDER</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  productState.product = undefined;
  productState.loading = false;
  productState.error = null;
  productsListState.products = [];
  receivedKode.length = 0;
  lastKode = undefined;
  shareProductViaWA.mockReset().mockResolvedValue({ method: "share-file" });
  soldOutSetValue = new Set();
  limitedStokSetValue = new Set();
  favoriteKodesValue = new Set();
  favToggle.mockReset();
});

describe("ProductDetailPage", () => {
  it("memanggil useProduct dengan kode dari URL param", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi" };
    renderAt("D-07-OSK");
    expect(lastKode).toBe("D-07-OSK");
  });

  it("menampilkan LOADING saat loading=true", () => {
    productState.loading = true;
    renderAt();
    expect(screen.getByText("LOADING...")).toBeInTheDocument();
  });

  it("menampilkan pesan error saat error tersedia", () => {
    productState.error = { message: "Network down" };
    renderAt();
    expect(screen.getByText("GAGAL MEMUAT PRODUK")).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("redirect ke /catalog saat product null", () => {
    productState.product = null;
    renderAt();
    expect(screen.getByText("CATALOG-PLACEHOLDER")).toBeInTheDocument();
  });

  it("redirect ke /catalog saat product undefined", () => {
    productState.product = undefined;
    renderAt();
    expect(screen.getByText("CATALOG-PLACEHOLDER")).toBeInTheDocument();
  });

  it("render detail produk lengkap: bahan, variants, banyak foto, link WhatsApp", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      bahan: "Ceruti Babydoll",
      image: "gamis-dewi-main.jpg",
      detail: ["gamis-dewi-detail-1.jpg", "gamis-dewi-detail-2.jpg"],
      variants: [
        { size: "Midi", ld: 110, pb: 130 },
        { size: "Gamis Jumbo", ld: 120, pb: 140 },
      ],
    };
    renderAt();

    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
    expect(screen.getByText("Gamis Dewi")).toBeInTheDocument();
    expect(screen.getByText("Ceruti Babydoll")).toBeInTheDocument();
    expect(screen.getByText("← Katalog")).toHaveAttribute("href", "/catalog");

    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("Gamis Jumbo")).toBeInTheDocument();
    expect(screen.getAllByText("LD")).toHaveLength(2);
    expect(screen.getAllByText("PB")).toHaveLength(2);

    const images = screen.getAllByRole("img").filter((img) => img.getAttribute("alt") !== "");
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute("alt", "Gamis Dewi");
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[0]).toHaveAttribute("fetchpriority", "high");
    expect(images[1]).toHaveAttribute("alt", "Gamis Dewi 2");
    expect(images[1]).toHaveAttribute("loading", "lazy");
    expect(images[1]).toHaveAttribute("fetchpriority", "auto");
    expect(images[2]).toHaveAttribute("alt", "Gamis Dewi 3");

    const waLink = screen.getByText("Tanya via WhatsApp").closest("a");
    expect(waLink).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/62811947254?text=")
    );
    expect(decodeURIComponent(waLink.getAttribute("href"))).toContain(
      "saya tertarik dengan produk D-07-OSK - Gamis Dewi"
    );
  });

  it("tidak menampilkan bahan saat product.bahan kosong/tidak ada", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    expect(screen.queryByText("Ceruti Babydoll")).toBeNull();
  });

  it("tidak menampilkan section Ukuran saat variants tidak ada", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    expect(screen.queryByText("Ukuran")).toBeNull();
  });

  it("menampilkan FOTO BELUM TERSEDIA & tidak render background blur saat tidak ada foto sama sekali", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi" };
    const { container } = renderAt();
    expect(screen.getByText("FOTO BELUM TERSEDIA")).toBeInTheDocument();
    expect(container.querySelector(".blur-md")).toBeNull();
  });

  it("menampilkan video player saat product.video ada", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      video: "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    };
    const { container } = renderAt();
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video.getAttribute("src")).toBe(
      "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    );
  });

  it("tidak menampilkan video saat product.video null", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", video: null };
    const { container } = renderAt();
    expect(container.querySelector("video")).toBeNull();
  });

  it("menampilkan galeri foto DAN video saat keduanya ada", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      video: "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    };
    const { container } = renderAt();
    expect(container.querySelector("video")).toBeInTheDocument();
    expect(screen.getByAltText("Gamis Dewi")).toBeInTheDocument();
  });
});


describe("ProductDetailPage — tombol Share Produk", () => {
  it("render tombol SHARE PRODUK", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    expect(screen.getByText("SHARE PRODUK")).toBeInTheDocument();
  });

  it("klik SHARE PRODUK memanggil shareProductViaWA(product)", async () => {
    const product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    productState.product = product;
    renderAt();

    fireEvent.click(screen.getByText("SHARE PRODUK"));
    expect(shareProductViaWA).toHaveBeenCalledWith(product);

    await waitFor(() => expect(screen.getByText("SHARE PRODUK")).toBeInTheDocument());
  });

  it("menampilkan MEMBAGIKAN... & menonaktifkan tombol selama proses share", async () => {
    let resolveShare;
    shareProductViaWA.mockReset().mockImplementation(
      () => new Promise((resolve) => { resolveShare = resolve; })
    );
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();

    fireEvent.click(screen.getByText("SHARE PRODUK"));

    expect(await screen.findByText("MEMBAGIKAN...")).toBeInTheDocument();
    expect(screen.getByText("MEMBAGIKAN...").closest("button")).toBeDisabled();

    resolveShare({ method: "share-file" });
    await waitFor(() => expect(screen.getByText("SHARE PRODUK")).toBeInTheDocument());
  });
});


describe("ProductDetailPage — navigasi sebelumnya/selanjutnya", () => {
  const products = [
    { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
    { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg", created_at: "2026-02-01" },
    { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-03-01" },
  ];
  // urutan created_at desc: C, D-07-OSK, A -> D-07-OSK di tengah

  it("render tombol Sebelumnya & Selanjutnya saat ada tetangga", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    productsListState.products = products;
    renderAt("D-07-OSK");

    const prevLink = screen.getByText("← Sebelumnya").closest("a");
    const nextLink = screen.getByText("Selanjutnya →").closest("a");
    expect(prevLink).toHaveAttribute("href", "/code/C");
    expect(nextLink).toHaveAttribute("href", "/code/A");
  });

  it("tidak render tombol Sebelumnya saat produk berada di posisi pertama", () => {
    productState.product = { kode: "C", nama: "Produk C", image: "c.jpg" };
    productsListState.products = products;
    renderAt("C");
    expect(screen.queryByText("← Sebelumnya")).toBeNull();
    expect(screen.getByText("Selanjutnya →")).toBeInTheDocument();
  });

  it("tidak render blok navigasi sama sekali saat hanya ada satu produk", () => {
    productState.product = { kode: "A", nama: "Produk A", image: "a.jpg" };
    productsListState.products = [{ kode: "A", nama: "Produk A", image: "a.jpg" }];
    renderAt("A");
    expect(screen.queryByText("← Sebelumnya")).toBeNull();
    expect(screen.queryByText("Selanjutnya →")).toBeNull();
  });
});

describe("ProductDetailPage — lightbox galeri foto", () => {
  it("klik foto membuka lightbox, tombol tutup menutupnya", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-dewi-main.jpg",
      detail: ["gamis-dewi-detail-1.jpg"],
    };
    renderAt();

    expect(screen.queryByRole("button", { name: "Tutup galeri" })).toBeNull();

    const mainImg = screen.getByAltText("Gamis Dewi");
    fireEvent.click(mainImg);

    expect(screen.getByRole("button", { name: "Tutup galeri" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tutup galeri" }));
    expect(screen.queryByRole("button", { name: "Tutup galeri" })).toBeNull();
  });
});


describe("ProductDetailPage — status ketersediaan", () => {
  it("tidak menampilkan badge apa pun saat produk tersedia normal", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    expect(screen.queryByText("Sold Out")).toBeNull();
    expect(screen.queryByText("Stok Terbatas")).toBeNull();
  });

  it("menampilkan badge Sold Out saat kode ada di soldOutSet", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    soldOutSetValue = new Set(["D-07-OSK"]);
    renderAt();
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
  });

  it("menampilkan badge Stok Terbatas saat kode ada di limitedStokSet", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    limitedStokSetValue = new Set(["D-07-OSK"]);
    renderAt();
    expect(screen.getByText("Stok Terbatas")).toBeInTheDocument();
  });

  it("badge Sold Out diprioritaskan, Stok Terbatas disembunyikan kalau keduanya true", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    soldOutSetValue = new Set(["D-07-OSK"]);
    limitedStokSetValue = new Set(["D-07-OSK"]);
    renderAt();
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
    expect(screen.queryByText("Stok Terbatas")).toBeNull();
  });
});


describe("ProductDetailPage — tombol favorit", () => {
  it("render bintang kosong saat produk belum difavoritkan", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    expect(screen.getByRole("button", { name: "Tambah ke favorit" })).toBeInTheDocument();
  });

  it("render bintang penuh saat produk sudah difavoritkan", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    favoriteKodesValue = new Set(["D-07-OSK"]);
    renderAt();
    expect(screen.getByRole("button", { name: "Hapus dari favorit" })).toBeInTheDocument();
  });

  it("klik tombol favorit memanggil toggle(kode)", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "Tambah ke favorit" }));
    expect(favToggle).toHaveBeenCalledWith("D-07-OSK");
  });
});
