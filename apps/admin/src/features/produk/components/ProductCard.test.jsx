import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductCard from "./ProductCard";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => `cld:${url}`,
}));

const PRODUCT = {
  kode: "D-01-OSK",
  nama: "Gamis Aisyah",
  image: "gamis.jpg",
};

function renderCard(overrides = {}) {
  return render(
    <ProductCard
      product={PRODUCT}
      stok={{ gudang: 5, cideng: 3, tegalgubug: 2 }}
      onTap={vi.fn()}
      onCopyWA={vi.fn()}
      isCopied={false}
      {...overrides}
    />
  );
}

describe("ProductCard", () => {
  it("merender kode produk", () => {
    renderCard();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
  });

  it("menampilkan gambar via cldUrl saat product.image ada", () => {
    renderCard();
    const img = screen.getByAltText("D-01-OSK");
    expect(img).toHaveAttribute("src", "cld:gamis.jpg");
  });

  it("menampilkan placeholder '—' saat product.image null/falsy", () => {
    renderCard({ product: { ...PRODUCT, image: null } });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("menghitung total stok (gudang + cideng + tegalgubug)", () => {
    renderCard({ stok: { gudang: 5, cideng: 3, tegalgubug: 2 } });
    // total = 10 → tampil sebagai badge
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("badge merah 'HABIS' saat total stok = 0", () => {
    renderCard({ stok: { gudang: 0, cideng: 0, tegalgubug: 0 } });
    expect(screen.getByText("HABIS")).toBeInTheDocument();
  });

  it("badge amber saat total stok 1-4", () => {
    renderCard({ stok: { gudang: 2, cideng: 0, tegalgubug: 1 } });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("stok fallback ke 0 saat key tidak ada di stok object", () => {
    renderCard({ stok: {} });
    // gudang??0=0, cideng??0=0, tegalgubug??0=0 → total=0 → HABIS
    expect(screen.getByText("HABIS")).toBeInTheDocument();
  });

  it("merender nilai stok per lokasi (GD, CD, TG)", () => {
    renderCard({ stok: { gudang: 4, cideng: 2, tegalgubug: 0 } });
    expect(screen.getByText("GD")).toBeInTheDocument();
    expect(screen.getByText("CD")).toBeInTheDocument();
    expect(screen.getByText("TG")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("klik article memanggil onTap", () => {
    const onTap = vi.fn();
    renderCard({ onTap });
    fireEvent.click(screen.getByRole("article"));
    expect(onTap).toHaveBeenCalled();
  });

  it("klik WA button memanggil onCopyWA tanpa memicu onTap (stopPropagation)", () => {
    const onTap = vi.fn();
    const onCopyWA = vi.fn();
    renderCard({ onTap, onCopyWA });
    // WA button berada di dalam footer div dengan stopPropagation
    const waButton = screen.getByTitle("Kirim via WhatsApp");
    fireEvent.click(waButton);
    expect(onCopyWA).toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });

  it("menampilkan SVG ikon WA saat isCopied=false", () => {
    const { container } = renderCard({ isCopied: false });
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByText(/Terkirim/)).toBeNull();
  });

  it("menampilkan '✓ Terkirim' saat isCopied=true", () => {
    renderCard({ isCopied: true });
    expect(screen.getByText("✓ Terkirim")).toBeInTheDocument();
    expect(document.querySelector("svg")).toBeNull();
  });

  it("stok per lokasi nil val=0 dibaca dari stok[key]??0", () => {
    // Semua nil → tampil 0,0,0 per lokasi (3 angka)
    renderCard({ stok: { gudang: 0, cideng: 0, tegalgubug: 0 } });
    // 0 muncul 3x di stok per lokasi grid
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it("stok val < 3 & val === 0 menggunakan warna berbeda (class check)", () => {
    const { container } = renderCard({ stok: { gudang: 0, cideng: 2, tegalgubug: 5 } });
    const spans = container.querySelectorAll(".grid.grid-cols-3 span.text-2xl");
    expect(spans[0]).toHaveClass("text-red-500");
  });
});
(spans[1]).toHaveClass("text-amber-400");
    expect(spans[2]).toHaveClass("text-emerald-500");
  });
});
