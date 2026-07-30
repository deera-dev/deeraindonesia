import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
let baruSetValue = new Set();
let terlarisMapValue = new Map();
vi.mock("../../product-catalog/hooks", () => ({
  useSoldOutSet: () => soldOutSetValue,
  useLimitedStokSet: () => limitedStokSetValue,
  useBaruSet: () => baruSetValue,
  useTerlarisMap: () => terlarisMapValue,
}));

const favToggle = vi.fn();
let favoriteKodesValue = new Set();
vi.mock("../../favorites/hooks", () => ({
  useFavorites: () => ({ favoriteKodes: favoriteKodesValue, toggle: favToggle }),
}));

const { default: ProductDetailPage } = await import("./ProductDetailPage");

// FakeImage — simulasi blur-up: constructor menangkap instance (mirip pola
// FakeIntersectionObserver di CatalogSlide.test.jsx), tapi "load" dipicu
// otomatis lewat microtask (bukan sinkron) supaya mendekati perilaku
// browser asli (onload selalu async) — test yang peduli state blur
// transisi bisa assert SEBELUM await, test lain cukup `await waitFor(...)`.
let imageInstances;
class FakeImage {
  constructor() {
    imageInstances.push(this);
  }
  set src(value) {
    this._src = value;
    Promise.resolve().then(() => {
      if (this.onload) this.onload();
    });
  }
  get src() {
    return this._src;
  }
}

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
  baruSetValue = new Set();
  terlarisMapValue = new Map();
  favoriteKodesValue = new Set();
  favToggle.mockReset();
  imageInstances = [];
  window.Image = FakeImage;
});

afterEach(() => {
  vi.restoreAllMocks();
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

  it("render detail produk: bahan, variants, link WhatsApp", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      bahan: "Ceruti Babydoll",
      image: "gamis-dewi-main.jpg",
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

    // Redesign "no-scroll" mobile (2026-07): ukuran sekarang dirender DUA
    // KALI — chip ringkas (mobile, tanpa LD/PB) + daftar lengkap (desktop,
    // "hidden lg:block") — keduanya sekaligus ada di DOM (jsdom tidak
    // mengevaluasi CSS/breakpoint sungguhan), jadi label ukuran muncul 2x
    // sementara LD/PB tetap 1x per varian (hanya ada di blok desktop).
    expect(screen.getAllByText("Midi").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Gamis Jumbo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("LD")).toHaveLength(2);
    expect(screen.getAllByText("PB")).toHaveLength(2);

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

  it("menampilkan FOTO BELUM TERSEDIA & tidak render background blur saat tidak ada foto/video sama sekali", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi" };
    const { container } = renderAt();
    expect(screen.getByText("FOTO BELUM TERSEDIA")).toBeInTheDocument();
    expect(container.querySelector(".blur-md")).toBeNull();
  });

  it("tidak menampilkan video/foto saat product.video null & tidak ada image", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", video: null };
    const { container } = renderAt();
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByText("FOTO BELUM TERSEDIA")).toBeInTheDocument();
  });
});


describe("ProductDetailPage — hero image blur-up", () => {
  it("hero tampil pakai versi blur (width kecil) sebelum full-res selesai dimuat, lalu ganti ke full-res", async () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "https://res.cloudinary.com/demo/image/upload/v1/gamis-dewi.jpg",
    };
    renderAt();

    const hero = screen.getByAltText("Gamis Dewi");
    // sebelum microtask FakeImage.onload flush, hero masih pakai blurSrc
    // (w_48) & kelas blur.
    expect(hero.getAttribute("src")).toContain("w_48");
    expect(hero.className).toContain("blur-md");

    await waitFor(() => expect(hero.className).not.toContain("blur-md"));
    expect(hero.getAttribute("src")).toContain("w_1400");
  });

  it("foto pertama (index 0) dapat fetchpriority high, sisanya auto", async () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-dewi.jpg",
      detail: ["detail-1.jpg"],
    };
    renderAt();
    const hero = screen.getByAltText("Gamis Dewi");
    expect(hero).toHaveAttribute("fetchpriority", "high");

    fireEvent.click(screen.getByRole("button", { name: "Lihat foto 2" }));
    const hero2 = screen.getByAltText("Gamis Dewi 2");
    expect(hero2).toHaveAttribute("fetchpriority", "auto");
  });
});


describe("ProductDetailPage — badge Video & jumlah Foto di atas galeri", () => {
  it("tidak menampilkan badge apa pun saat cuma 1 foto & tanpa video", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    expect(screen.queryByText(/Video/)).toBeNull();
    expect(screen.queryByText(/Foto/)).toBeNull();
  });

  it("menampilkan badge jumlah foto saat foto > 1", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-dewi.jpg",
      detail: ["d1.jpg", "d2.jpg"],
    };
    renderAt();
    expect(screen.getByText("3 Foto")).toBeInTheDocument();
  });

  it("menampilkan badge Video saat product.video ada", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-dewi.jpg",
      video: "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    };
    renderAt();
    expect(screen.getByText(/Video/)).toBeInTheDocument();
  });
});


describe("ProductDetailPage — galeri foto + video tergabung (thumbnail strip & hero)", () => {
  it("hero menampilkan foto utama dulu (bukan video) walau video ada, video dijangkau via thumbnail", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      video: "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    };
    const { container } = renderAt();
    expect(screen.getByAltText("Gamis Dewi")).toBeInTheDocument();
    expect(container.querySelector("video")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Lihat video produk" }));
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    );
    expect(video).toHaveAttribute("poster");
    expect(video.getAttribute("poster")).toContain(".jpg");
  });

  it("hero langsung menampilkan video kalau produk cuma punya video (tanpa foto)", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      video: "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    };
    const { container } = renderAt();
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    );
  });

  it("tidak render thumbnail strip saat cuma 1 media (satu foto, tanpa video/detail)", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    expect(screen.queryByRole("button", { name: /Lihat foto/ })).toBeNull();
  });

  it("render thumbnail strip sejumlah foto + video, klik thumbnail mengganti hero", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      detail: ["d1.jpg"],
      video: "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    };
    renderAt();

    expect(screen.getByRole("button", { name: "Lihat foto 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lihat foto 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lihat video produk" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lihat foto 2" }));
    expect(screen.getByAltText("Gamis Dewi 2")).toBeInTheDocument();
  });

  it("thumbnail aktif punya aria-current true, yang lain false", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      detail: ["d1.jpg"],
    };
    renderAt();
    const thumb1 = screen.getByRole("button", { name: "Lihat foto 1" });
    const thumb2 = screen.getByRole("button", { name: "Lihat foto 2" });
    expect(thumb1).toHaveAttribute("aria-current", "true");
    expect(thumb2).toHaveAttribute("aria-current", "false");

    fireEvent.click(thumb2);
    expect(thumb1).toHaveAttribute("aria-current", "false");
    expect(thumb2).toHaveAttribute("aria-current", "true");
  });
});


describe("ProductDetailPage — counter posisi mengambang", () => {
  it("tidak menampilkan counter saat cuma 1 media", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    expect(screen.queryByText("1 / 1")).toBeNull();
  });

  it("menampilkan counter X / Y & update saat pindah thumbnail", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      detail: ["d1.jpg"],
    };
    renderAt();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lihat foto 2" }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
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

describe("ProductDetailPage — lightbox galeri foto & video", () => {
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

  it("dari lightbox foto bisa navigasi Berikutnya sampai mencapai slide video", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      video: "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    };
    const { container } = renderAt();

    fireEvent.click(screen.getByAltText("Gamis Dewi"));
    expect(screen.getByRole("button", { name: "Tutup galeri" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));

    const lightboxVideo = container.querySelector("video");
    expect(lightboxVideo).toBeInTheDocument();
    expect(lightboxVideo).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/video/upload/v1/gamis-dewi.mp4",
    );
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

  it("menampilkan badge Baru saat kode ada di baruSet", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    baruSetValue = new Set(["D-07-OSK"]);
    renderAt();
    expect(screen.getByText("Baru")).toBeInTheDocument();
  });

  it("menampilkan badge Terlaris sesuai periode terbaik di terlarisMap", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    terlarisMapValue = new Map([["D-07-OSK", "30d"]]);
    renderAt();
    expect(screen.getByText(/Terlaris Bulan Ini/)).toBeInTheDocument();
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

describe("ProductDetailPage — chip Ukuran mobile menampilkan LD/PB ringkas (redesign putaran 2)", () => {
  it("chip mobile menggabungkan size + LD/PB dalam satu elemen ringkas", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-dewi.jpg",
      variants: [{ size: "Midi", ld: 110, pb: 130 }],
    };
    renderAt();
    // Chip mobile (redesign putaran 2, LD/PB dikembalikan setelah sempat
    // dihilangkan) menggabungkan size + LD/PB dalam SATU elemen ("· LD110
    // PB130") — beda dari blok desktop yang punya <span>LD</span> terpisah
    // (lihat test "render detail produk" di atas). Cari lewat function
    // matcher supaya tidak terganggu pemecahan text node oleh JSX.
    const chip = screen.getByText((_content, node) => {
      return (
        node?.tagName === "SPAN" &&
        node.textContent.replace(/\s+/g, "") === "·LD110PB130"
      );
    });
    expect(chip).toBeInTheDocument();
  });
});

describe("ProductDetailPage — Foto Seri Warna ikut galeri & section sidebar desktop (redesign putaran 2)", () => {
  it("seri_warna ikut masuk media: menambah jumlah badge foto & muncul di thumbnail strip", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      seri_warna: "gamis-seriwarna.jpg",
      detail: ["d1.jpg"],
    };
    renderAt();
    // foto utama + seri_warna + 1 detail = 3 foto
    expect(screen.getByText("3 Foto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lihat foto 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lihat foto 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lihat foto 3" })).toBeInTheDocument();
  });

  it("menampilkan section 'Seri Warna' di sidebar saat product.seri_warna ada", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      seri_warna: "gamis-seriwarna.jpg",
    };
    renderAt();
    expect(screen.getByText("Seri Warna")).toBeInTheDocument();
  });

  it("tidak menampilkan section 'Seri Warna' saat product.seri_warna kosong", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-main.jpg" };
    renderAt();
    expect(screen.queryByText("Seri Warna")).toBeNull();
  });

  it("klik section 'Seri Warna' di sidebar membuka lightbox pada slide seri warna yang benar", () => {
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      seri_warna: "gamis-seriwarna.jpg",
      detail: ["d1.jpg"],
    };
    renderAt();

    const seriWarnaButton = screen.getByText("Seri Warna").closest("div").querySelector("button");
    fireEvent.click(seriWarnaButton);

    expect(screen.getByRole("button", { name: "Tutup galeri" })).toBeInTheDocument();
    // seri_warna ada di index 1 (setelah foto utama, sebelum detail) —
    // baik counter mengambang di hero maupun counter di dalam lightbox
    // sama-sama harus menunjukkan posisi ke-2 dari 3.
    expect(screen.getAllByText("2 / 3").length).toBeGreaterThanOrEqual(1);
  });

  it("foto seri_warna ditampilkan object-contain (tidak kepotong) saat jadi hero aktif via thumbnail strip; foto lain tetap object-cover", () => {
    // Bug dilaporkan Denny: foto seri warna (beberapa model berdampingan,
    // rasio jauh lebih landscape dari foto produk biasa) kepotong karena
    // HeroImage selalu pakai object-cover. Klik thumbnail strip ke-2
    // (bukan tombol sidebar "Seri Warna", supaya test lewat jalur hero
    // biasa persis seperti skenario yang dilaporkan) mengaktifkan slide
    // seri_warna via activeIndex TANPA membuka lightbox.
    productState.product = {
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      image: "gamis-main.jpg",
      seri_warna: "gamis-seriwarna.jpg",
    };
    renderAt();

    const heroMain = screen.getByAltText("Gamis Dewi");
    expect(heroMain.className).toContain("object-cover");
    expect(heroMain.className).not.toContain("object-contain");

    fireEvent.click(screen.getByRole("button", { name: "Lihat foto 2" }));

    const heroSeriWarna = screen.getByAltText("Gamis Dewi 2");
    expect(heroSeriWarna.className).toContain("object-contain");
    expect(heroSeriWarna.className).not.toContain("object-cover");
    // Lightbox TIDAK ikut terbuka dari klik thumbnail strip (beda dari
    // klik tombol sidebar "Seri Warna" di atas).
    expect(screen.queryByRole("button", { name: "Tutup galeri" })).toBeNull();
  });
});

describe("ProductDetailPage — tombol WA & Share tetap aksesibel meski ikon-saja di mobile (redesign putaran 2)", () => {
  it("tombol Tanya via WhatsApp & Share Produk punya aria-label eksplisit", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();
    // Redesign putaran 3: tombol WA/Share versi mobile (ikon-saja, di
    // header dekat favorit) & versi desktop (teks lengkap, bawah sidebar)
    // SAMA-SAMA punya aria-label yang sama & sama-sama ada di DOM
    // sekaligus (jsdom tidak evaluasi CSS/breakpoint sungguhan) — jadi
    // getAllByLabelText, bukan getByLabelText.
    expect(screen.getAllByLabelText("Tanya via WhatsApp").length).toBe(2);
    expect(screen.getAllByLabelText("Share Produk").length).toBe(2);
  });
});

describe("ProductDetailPage — tombol WA/Share mobile digeser ke sebelah favorit (redesign putaran 3)", () => {
  it("tombol WA & Share ikon-saja (mobile) muncul di header, sejajar tombol favorit", () => {
    productState.product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    renderAt();

    const favoriteBtn = screen.getByRole("button", { name: "Tambah ke favorit" });
    // Tombol WA (versi mobile, ikon-saja) & tombol favorit sama-sama child
    // langsung dari wrapper header yang sama.
    const headerGroup = favoriteBtn.parentElement;
    const waLinks = screen.getAllByLabelText("Tanya via WhatsApp");
    const waInHeader = waLinks.find((el) => el.parentElement === headerGroup);
    expect(waInHeader).toBeInTheDocument();
  });

  it("klik tombol Share versi mobile (di header) tetap memanggil shareProductViaWA", async () => {
    const product = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" };
    productState.product = product;
    renderAt();

    const favoriteBtn = screen.getByRole("button", { name: "Tambah ke favorit" });
    const headerGroup = favoriteBtn.parentElement;
    const shareButtons = screen.getAllByLabelText("Share Produk");
    const shareInHeader = shareButtons.find((el) => el.parentElement === headerGroup);

    fireEvent.click(shareInHeader);
    expect(shareProductViaWA).toHaveBeenCalledWith(product);

    await waitFor(() => expect(shareInHeader).not.toBeDisabled());
  });
});
