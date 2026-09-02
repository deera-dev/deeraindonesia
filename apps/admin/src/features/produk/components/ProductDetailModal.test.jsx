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
  useProducedByKode: vi.fn(() => ({
    producedBySize: { "Midi Jumbo": 14, "Gamis Jumbo": 7 },
    isLoading: false,
  })),
}));

let lastCodeImageModalProps = null;
vi.mock("./ProductCodeImageModal", () => ({
  default: (props) => {
    lastCodeImageModalProps = props;
    return (
      <div data-testid="product-code-image-modal">
        <button onClick={() => props.onClose()}>CodeImageModalClose</button>
      </div>
    );
  },
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
    expect(screen.getByText("Ukuran & Harga")).toBeInTheDocument();
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
      expect(screen.getAllByText("Gudang").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Cideng").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Tegalgubug").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("6")).toBeInTheDocument();
    });

    it("simple view: total=0 menampilkan 'HABIS'", () => {
      renderModal({}, { stok: { gudang: 0, cideng: 0, tegalgubug: 0 }, onClose: vi.fn(), onEdit: vi.fn() });
      expect(screen.getByText("HABIS")).toBeInTheDocument();
    });

    it("menampilkan kartu bertumpuk per size (bukan <table>) saat stok.sizes memiliki lebih dari 1 key", () => {
      // Komponen sengaja TIDAK memakai <table> untuk stok multi-size — lihat
      // komentar di ProductDetailModal.jsx: kolom seperti "Tegalgubug" bisa
      // memaksa scroll horizontal di HP, jadi dipakai kartu bertumpuk (lihat
      // juga CLAUDE.md §13: jangan pakai <table>/grid untuk konten responsif).
      const stok = {
        gudang: 4, cideng: 2, tegalgubug: 1,
        sizes: {
          Midi: { gudang: 2, cideng: 1, tegalgubug: 0 },
          Gamis: { gudang: 2, cideng: 1, tegalgubug: 1 },
        },
      };
      const { container } = renderModal({}, { stok, onClose: vi.fn(), onEdit: vi.fn() });
      expect(document.querySelector("table")).toBeNull();

      // Query di-scope ke kartu size & kartu Total secara spesifik (bukan
      // screen.getByText global) karena mock Riwayat Penjualan juga memuat
      // angka "3" (tegalgubug: 3) yang bisa bikin query ambigu.
      const sizeCards = container.querySelectorAll(".space-y-2 > .border.border-skin-bdr-lt.p-3");
      expect(sizeCards).toHaveLength(2);
      expect(sizeCards[0].textContent).toContain("Midi");
      expect(sizeCards[0].textContent).toContain("3"); // subtotal Midi (2+1+0)
      expect(sizeCards[1].textContent).toContain("Gamis");
      expect(sizeCards[1].textContent).toContain("4"); // subtotal Gamis (2+1+1)

      const totalCard = container.querySelector(".border-2.border-skin-bdr.p-3");
      expect(totalCard.textContent).toContain("Total");
      expect(totalCard.textContent).toContain("7"); // total keseluruhan
    });

    it("kartu Total menampilkan 'HABIS' saat semua size & grand total = 0", () => {
      const stok = {
        gudang: 0, cideng: 0, tegalgubug: 0,
        sizes: {
          Midi: { gudang: 0, cideng: 0, tegalgubug: 0 },
          Gamis: { gudang: 0, cideng: 0, tegalgubug: 0 },
        },
      };
      renderModal({}, { stok, onClose: vi.fn(), onEdit: vi.fn() });
      // "HABIS" muncul di tiap kartu size (2x) + kartu Total (1x) = 3x
      expect(screen.getAllByText("HABIS").length).toBe(3);
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
      expect(document.querySelector("table")).toBeNull();
      expect(screen.getAllByText("Gudang").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("hasStok (permintaan Denny 2026-09: jangan HABIS kalau stok belum pernah diisi)", () => {
    it("simple view: hasStok=false + ada foto + total=0 -> '–' netral, bukan HABIS", () => {
      renderModal({}, { stok: { gudang: 0, cideng: 0, tegalgubug: 0 }, hasStok: false, onClose: vi.fn(), onEdit: vi.fn() });
      expect(screen.queryByText("HABIS")).not.toBeInTheDocument();
      expect(screen.getByText("–")).toBeInTheDocument();
    });

    it("simple view: hasStok=false + TIDAK ada foto + total=0 -> tetap HABIS", () => {
      renderModal({ image: null }, { stok: { gudang: 0, cideng: 0, tegalgubug: 0 }, hasStok: false, onClose: vi.fn(), onEdit: vi.fn() });
      expect(screen.getByText("HABIS")).toBeInTheDocument();
    });

    it("simple view: hasStok=true + total=0 -> tetap HABIS", () => {
      renderModal({}, { stok: { gudang: 0, cideng: 0, tegalgubug: 0 }, hasStok: true, onClose: vi.fn(), onEdit: vi.fn() });
      expect(screen.getByText("HABIS")).toBeInTheDocument();
    });

    it("multi-size: hasStok=false + ada foto + grand total=0 -> kartu Total '–', bukan HABIS", () => {
      const stok = {
        gudang: 0, cideng: 0, tegalgubug: 0,
        sizes: {
          Midi: { gudang: 0, cideng: 0, tegalgubug: 0 },
          Gamis: { gudang: 0, cideng: 0, tegalgubug: 0 },
        },
      };
      const { container } = renderModal({}, { stok, hasStok: false, onClose: vi.fn(), onEdit: vi.fn() });
      const totalCard = container.querySelector(".border-2.border-skin-bdr.p-3");
      expect(totalCard.textContent).toContain("–");
      expect(totalCard.textContent).not.toContain("HABIS");
    });
  });

  describe("Riwayat Penjualan", () => {
    it("menampilkan seksi Riwayat Penjualan dengan data dari useSalesByKode", () => {
      renderModal();
      expect(screen.getByText("Riwayat Penjualan")).toBeInTheDocument();
      expect(screen.getByText("Total Terjual")).toBeInTheDocument();
      // mock returns gudang:10, cideng:5, tegalgubug:3, total:18
      expect(screen.getByText("18")).toBeInTheDocument();
    });

    it("menampilkan 'Memuat...' saat isLoading=true", async () => {
      const { useSalesByKode } = await import("../hooks");
      useSalesByKode.mockReturnValue({ data: null, isLoading: true });
      renderModal();
      expect(screen.getByText("Memuat...")).toBeInTheDocument();
      useSalesByKode.mockReturnValue({
        data: { gudang: 10, cideng: 5, tegalgubug: 3, total: 18 },
        isLoading: false,
      });
    });
  });

  describe("Stok Sesuai Produksi", () => {
    it("menampilkan seksi dengan data per ukuran dari useProducedByKode & Total", () => {
      renderModal();
      expect(screen.getByText("Stok Sesuai Produksi")).toBeInTheDocument();
      expect(screen.getByText("Midi Jumbo")).toBeInTheDocument();
      expect(screen.getByText("14")).toBeInTheDocument();
      expect(screen.getByText("Gamis Jumbo")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
      expect(screen.getByText("21")).toBeInTheDocument(); // total 14+7
    });

    it("menampilkan 'Memuat...' saat isLoading=true", async () => {
      const { useProducedByKode } = await import("../hooks");
      useProducedByKode.mockReturnValue({ producedBySize: {}, isLoading: true });
      renderModal();
      const loadingTexts = screen.getAllByText("Memuat...");
      expect(loadingTexts.length).toBeGreaterThanOrEqual(1);
      useProducedByKode.mockReturnValue({
        producedBySize: { Midi: 14, "Gamis Jumbo": 7 },
        isLoading: false,
      });
    });

    it("menampilkan pesan kosong saat belum ada data produksi", async () => {
      const { useProducedByKode } = await import("../hooks");
      useProducedByKode.mockReturnValue({ producedBySize: {}, isLoading: false });
      renderModal();
      expect(screen.getByText("Belum ada data produksi.")).toBeInTheDocument();
      useProducedByKode.mockReturnValue({
        producedBySize: { Midi: 14, "Gamis Jumbo": 7 },
        isLoading: false,
      });
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

  describe("tombol 'Simpan Gambar' (permintaan Denny 2026-08)", () => {
    it("menampilkan tombol Simpan Gambar saat produk punya image", () => {
      renderModal();
      expect(screen.getByText("🖼 Simpan Gambar")).toBeInTheDocument();
    });

    it("TIDAK menampilkan tombol Simpan Gambar saat produk tanpa image", () => {
      renderModal({ image: null });
      expect(screen.queryByText("🖼 Simpan Gambar")).not.toBeInTheDocument();
    });

    it("klik Simpan Gambar membuka ProductCodeImageModal dengan produk yang benar (TIDAK memanggil onClose/onEdit)", () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();
      renderModal({}, { onClose, onEdit });

      fireEvent.click(screen.getByText("🖼 Simpan Gambar"));

      expect(screen.getByTestId("product-code-image-modal")).toBeInTheDocument();
      expect(lastCodeImageModalProps.product.kode).toBe("D-07-OSK");
      expect(onClose).not.toHaveBeenCalled();
      expect(onEdit).not.toHaveBeenCalled();
    });

    it("CodeImageModalClose menutup ProductCodeImageModal", () => {
      renderModal();
      fireEvent.click(screen.getByText("🖼 Simpan Gambar"));
      fireEvent.click(screen.getByText("CodeImageModalClose"));
      expect(screen.queryByTestId("product-code-image-modal")).not.toBeInTheDocument();
    });
  });
});
