import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductDetailModal from "./ProductDetailModal";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => `cld:${url}`,
}));

vi.mock("../hooks", () => ({
  useSalesByKode: vi.fn(() => ({
    data: { gudang: 10, cideng: 5, tegalgubug: 3, total: 18 },
    isLoading: false,
  })),
}));

vi.mock("./ProductShareModal", () => ({
  default: ({ onClose }) => <div data-testid="share-modal"><button onClick={onClose}>close-share</button></div>,
}));

const BASE_PRODUCT = {
  kode: "D-07-OSK",
  nama: "Gamis Taqwa",
  bahan: "Ceruti",
  hpp: 150000,
  variants: [{ size: "Midi", harga: 280000 }, { size: "Gamis", harga: 320000 }],
  warna: ["HITAM", "MERAH"],
  image: "gamis.jpg",
};

function renderModal(productOverrides = {}, otherProps = {}) {
  return render(
    <ProductDetailModal
      product={{ ...BASE_PRODUCT, ...productOverrides }}
      stok={{ gudang: 5, cideng: 3, tegalgubug: 2 }}
      onClose={vi.fn()}
      onEdit={vi.fn()}
      {...otherProps}
    />
  );
}

describe("ProductDetailModal", () => {
  it("menampilkan kode produk di header", () => {
    renderModal();
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("menampilkan nama & bahan produk", () => {
    renderModal();
    expect(screen.getByText("Gamis Taqwa")).toBeInTheDocument();
    expect(screen.getByText("Ceruti")).toBeInTheDocument();
  });

  it("tidak menampilkan bahan saat product.bahan falsy", () => {
    renderModal({ bahan: "" });
    expect(screen.queryByText("Ceruti")).toBeNull();
  });

  it("menampilkan HPP saat hpp > 0", () => {
    renderModal({ hpp: 150000 });
    expect(screen.getByText(/HPP: Rp 150\.000/)).toBeInTheDocument();
  });

  it("tidak menampilkan HPP saat hpp = 0", () => {
    renderModal({ hpp: 0 });
    expect(screen.queryByText(/HPP/)).toBeNull();
  });

  it("menampilkan gambar produk via cldUrl saat image ada", () => {
    renderModal();
    const img = screen.getByAltText("D-07-OSK");
    expect(img).toHaveAttribute("src", "cld:gamis.jpg");
  });

  it("tidak menampilkan gambar saat image null/falsy", () => {
    renderModal({ image: null });
    expect(screen.queryByAltText("D-07-OSK")).toBeNull();
  });

  it("menampilkan seksi Ukuran & Harga saat variants ada dan harga > 0", () => {
    renderModal();
    // Ukuran & Harga heading
    expect(screen.getByText("Ukuran & Harga")).toBeInTheDocument();
    // size text di DOM (uppercase hanya CSS, bukan DOM text)
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText(/280\.000/)).toBeInTheDocument();
    expect(screen.getByText("Gamis")).toBeInTheDocument();
    expect(screen.getByText(/320\.000/)).toBeInTheDocument();
  });

  it("tidak menampilkan Ukuran & Harga saat semua variant harga = 0", () => {
    renderModal({ variants: [{ size: "Midi", harga: 0 }] });
    expect(screen.queryByText("Ukuran & Harga")).toBeNull();
  });

  it("tidak menampilkan Ukuran & Harga saat variants kosong", () => {
    renderModal({ variants: [] });
    expect(screen.queryByText("Ukuran & Harga")).toBeNull();
  });

  it("menampilkan chip warna saat p.warna.length > 0", () => {
    renderModal();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  it("tidak menampilkan seksi warna saat warna kosong/null", () => {
    renderModal({ warna: [] });
    expect(screen.queryByText("HITAM")).toBeNull();
  });

  it("menampilkan header warna dengan jumlah warna", () => {
    renderModal();
    expect(screen.getByText(/2 Warna/)).toBeInTheDocument();
  });

  describe("stok rendering", () => {
    it("simple view saat stok.sizes tidak ada: tampilkan per lokasi & total", () => {
      renderModal({}, { stok: { gudang: 3, cideng: 2, tegalgubug: 1 }, onClose: vi.fn(), onEdit: vi.fn() });
      expect(screen.getByText("Gudang")).toBeInTheDocument();
      expect(screen.getByText("Cideng")).toBeInTheDocument();
      expect(screen.getByText("Tegalgubug")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument(); // total
    });

    it("simple view: total=0 menampilkan 'HABIS'", () => {
      renderModal({}, { stok: { gudang: 0, cideng: 0, tegalgubug: 0 }, onClose: vi.fn(), onEdit: vi.fn() });
      expect(screen.getByText("HABIS")).toBeInTheDocument();
    });

    it("table view saat stok.sizes memiliki lebih dari 1 key", () => {
      const stok = {
        gudang: 4, cideng: 2, tegalgubug: 1,
        sizes: {
          Midi: { gudang: 2, cideng: 1, tegalgubug: 0 },
          Gamis: { gudang: 2, cideng: 1, tegalgubug: 1 },
        },
      };
      renderModal({}, { stok, onClose: vi.fn(), onEdit: vi.fn() });
      expect(document.querySelector("table")).toBeInTheDocument();
      // size names in table body (DOM text, not visual uppercase)
      const tableCells = document.querySelectorAll("tbody td:first-child");
      const sizeNames = Array.from(tableCells).map((td) => td.textContent);
      expect(sizeNames).toContain("Midi");
      expect(sizeNames).toContain("Gamis");
      // tfoot total (4+2+1 = 7)
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("table view: total=0 di tfoot menampilkan 'HABIS'", () => {
      const stok = {
        gudang: 0, cideng: 0, tegalgubug: 0,
        sizes: {
          Midi: { gudang: 0, cideng: 0, tegalgubug: 0 },
          Gamis: { gudang: 0, cideng: 0, tegalgubug: 0 },
        },
      };
      renderModal({}, { stok, onClose: vi.fn(), onEdit: vi.fn() });
      expect(screen.getByText("HABIS")).toBeInTheDocument();
    });

    it("stok fallback: nilai undefined per lokasi fallback ke 0 -> total=0 -> HABIS", () => {
      renderModal({}, { stok: {}, onClose: vi.fn(), onEdit: vi.fn() });
      expect(screen.getByText("HABIS")).toBeInTheDocument();
    });

    it("table view: hanya 1 size di sizes menampilkan simple view", () => {
      const stok = {
        gudang: 3, cideng: 0, tegalgubug: 0,
        sizes: { Midi: { gudang: 3, cideng: 0, tegalgubug: 0 } },
      };
      renderModal({}, { stok, onClose: vi.fn(), onEdit: vi.fn() });
      // Object.keys(stok.sizes).length = 1 -> NOT > 1 -> simple view
      expect(document.querySelector("table")).toBeNull();
      expect(screen.getByText("Gudang")).toBeInTheDocument();
    });
  });

  it("klik backdrop memanggil onClose", () => {
    const onClose = vi.fn();
    const { container } = renderModal({}, { onClose });
    const backdrop = container.querySelector(".absolute.inset-0");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("klik tombol X (header close) memanggil onClose", () => {
    const onClose = vi.fn();
    renderModal({}, { onClose });
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalled();
  });

  it("klik Edit Produk memanggil onClose() lalu onEdit()", () => {
    const calls = [];
    const onClose = vi.fn(() => calls.push("close"));
    const onEdit = vi.fn(() => calls.push("edit"));
    renderModal({}, { onClose, onEdit });
    fireEvent.click(screen.getByText("✎ Edit Produk"));
    expect(onClose).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalled();
    expect(calls).toEqual(["close", "edit"]);
  });
});
