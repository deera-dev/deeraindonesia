import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const productState = { product: undefined, loading: false, error: null };
const receivedKode = [];
let lastKode;

vi.mock("@deera/shared/features/products/hooks", () => ({
  useProduct: (kode) => {
    lastKode = kode;
    receivedKode.push(kode);
    return productState;
  },
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
  receivedKode.length = 0;
  lastKode = undefined;
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
