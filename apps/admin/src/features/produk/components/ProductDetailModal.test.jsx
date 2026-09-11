import { describe, it, expect, vi, beforeEach } from "vitest";
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
  // Permintaan Denny 2026-09: klik baris lokasi -> munculkan daftar
  // pembeli. Query ini hanya dipanggil saat SalesDetailList di-mount
  // (lihat ProductDetailModal.jsx), jadi mock default TIDAK loading dan
  // punya transaksi di 2 lokasi berbeda supaya gampang diuji filternya.
  useSalesDetailByKode: vi.fn(() => ({
    data: [
      { id: "s1", created_at: "2026-08-20T10:00:00Z", buyer_name: "Alex", buyer_hp: "0812", location: "gudang", qty: 2 },
      { id: "s2", created_at: "2026-08-21T10:00:00Z", buyer_name: "Sari", buyer_hp: "0813", location: "cideng", qty: 4 },
    ],
    isLoading: false,
  })),
}));

// Beberapa test di bawah mengubah mockReturnValue mid-test — beforeEach ini
// memaksa SEMUA mock hooks balik ke nilai default sebelum tiap test
// dijalankan, supaya urutan test tidak saling memengaruhi (vi.fn() di-mock
// SEKALI untuk seluruh file, persist antar test tanpa ini).
beforeEach(async () => {
  const { useSalesByKode, useProducedByKode, useSalesDetailByKode } = await import("../hooks");
  useSalesByKode.mockReturnValue({
    data: { gudang: 10, cideng: 5, tegalgubug: 3, total: 18 },
    isLoading: false,
  });
  useProducedByKode.mockReturnValue({
    producedBySize: { "Midi Jumbo": 14, "Gamis Jumbo": 7 },
    isLoading: false,
  });
  useSalesDetailByKode.mockReturnValue({
    data: [
      { id: "s1", created_at: "2026-08-20T10:00:00Z", buyer_name: "Alex", buyer_hp: "0812", location: "gudang", qty: 2 },
      { id: "s2", created_at: "2026-08-21T10:00:00Z", buyer_name: "Sari", buyer_hp: "0813", location: "cideng", qty: 4 },
    ],
    isLoading: false,
  });
});

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

  it("menampilkan nama produk", () => {
    renderModal();
    expect(screen.getByText("Gamis Taqwa")).toBeInTheDocument();
  });

  // Redesign 2026-09: bahan & HPP digabung jadi SATU baris ringkas
  // ("Ceruti · HPP Rp 150.000"), bukan 2 baris terpisah lagi.
  describe("baris info (bahan · HPP, redesign 2026-09)", () => {
    it("menampilkan bahan & HPP digabung satu baris dengan pemisah ·", () => {
      renderModal();
      expect(screen.getByText("Ceruti · HPP Rp 150.000")).toBeInTheDocument();
    });

    it("hanya menampilkan HPP saat bahan kosong", () => {
      renderModal({ bahan: "" });
      expect(screen.getByText("HPP Rp 150.000")).toBeInTheDocument();
    });

    it("hanya menampilkan bahan saat hpp = 0", () => {
      renderModal({ hpp: 0 });
      expect(screen.getByText("Ceruti")).toBeInTheDocument();
      expect(screen.queryByText(/HPP/)).toBeNull();
    });

    it("tidak menampilkan baris info sama sekali saat bahan kosong dan hpp = 0", () => {
      renderModal({ bahan: "", hpp: 0 });
      expect(screen.queryByText(/HPP/)).toBeNull();
      expect(screen.queryByText("Ceruti")).toBeNull();
    });
  });

  // Redesign 2026-09 (permintaan Denny: "foto produknya tidak begitu
  // terlihat karena terpotong ... dibuat accordion juga aja kalau mau
  // lihat foto"): foto sekarang jadi accordion tersendiri, DEFAULT
  // TERTUTUP (beda dari seksi lain), full/tanpa crop saat dibuka.
  describe("seksi Foto (accordion, default tertutup, redesign 2026-09)", () => {
    it("menampilkan header 'Foto' tapi TIDAK menampilkan gambar sebelum diklik", () => {
      renderModal();
      expect(screen.getByText("Foto")).toBeInTheDocument();
      expect(screen.queryByAltText("D-07-OSK")).toBeNull();
    });

    it("klik header 'Foto' menampilkan gambar via cldUrl, tanpa crop (object-contain)", () => {
      renderModal();
      fireEvent.click(screen.getByText("Foto"));
      const img = screen.getByAltText("D-07-OSK");
      expect(img).toHaveAttribute("src", "cld:gamis.jpg");
      expect(img.className).toContain("object-contain");
      expect(img.className).not.toContain("object-cover");
    });

    it("klik header 'Foto' dua kali menyembunyikan lagi gambarnya", () => {
      renderModal();
      fireEvent.click(screen.getByText("Foto"));
      expect(screen.getByAltText("D-07-OSK")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Foto"));
      expect(screen.queryByAltText("D-07-OSK")).toBeNull();
    });

    it("tidak menampilkan seksi Foto sama sekali saat image null/falsy", () => {
      renderModal({ image: null });
      expect(screen.queryByText("Foto")).toBeNull();
      expect(screen.queryByAltText("D-07-OSK")).toBeNull();
    });
  });

  // Redesign 2026-09: "Ukuran & Harga" bukan accordion terpisah lagi —
  // digabung jadi baris chip ringkas di bawah info dasar.
  describe("chip Ukuran & Harga (redesign 2026-09, bukan accordion lagi)", () => {
    it("menampilkan tiap varian (ukuran + harga) saat harga > 0", () => {
      renderModal();
      expect(screen.getByText("Midi")).toBeInTheDocument();
      expect(screen.getByText(/280\.000/)).toBeInTheDocument();
      expect(screen.getByText("Gamis")).toBeInTheDocument();
      expect(screen.getByText(/320\.000/)).toBeInTheDocument();
    });

    it("tidak menampilkan chip apa pun saat semua variant harga = 0", () => {
      renderModal({ variants: [{ size: "Midi", harga: 0 }] });
      expect(screen.queryByText("Midi")).toBeNull();
    });

    it("tidak menampilkan chip apa pun saat variants kosong", () => {
      renderModal({ variants: [] });
      expect(screen.queryByText("Midi")).toBeNull();
      expect(screen.queryByText("Gamis")).toBeNull();
    });
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

  // Redesign 2026-09: baris ringkasan cepat (Stok/Terjual/Produksi) di atas
  // semua accordion — jawab pertanyaan paling umum tanpa buka apa pun.
  describe("Ringkasan cepat (StatCard Stok/Terjual/Produksi, redesign 2026-09)", () => {
    it("menampilkan total Stok, Terjual, dan Produksi", () => {
      renderModal();
      // "Stok"/"Terjual" masing2 muncul 2x (label StatCard + header kolom
      // tabel Stok & Penjualan di bawahnya), jadi pakai getAllByText.
      expect(screen.getAllByText("Stok").length).toBeGreaterThanOrEqual(1);
      // stok default {gudang:5, cideng:3, tegalgubug:2} -> total 10
      // (getAllByText krn "10" juga muncul sbg nilai Terjual Gudang di tabel lokasi)
      expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Terjual").length).toBeGreaterThanOrEqual(1);
      // mock useSalesByKode total: 18
      expect(screen.getAllByText("18").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Produksi")).toBeInTheDocument();
      // mock useProducedByKode: 14 + 7 = 21
      expect(screen.getAllByText("21").length).toBeGreaterThanOrEqual(1);
    });

    it("stat Stok menampilkan 'HABIS' saat stok habis (hasStok default true)", () => {
      renderModal({}, { stok: { gudang: 0, cideng: 0, tegalgubug: 0 } });
      expect(screen.getAllByText("HABIS").length).toBeGreaterThanOrEqual(1);
    });

    it("stat Stok menampilkan '–' netral saat hasStok=false + ada foto + total=0", () => {
      renderModal({}, { stok: { gudang: 0, cideng: 0, tegalgubug: 0 }, hasStok: false });
      expect(screen.queryByText("HABIS")).not.toBeInTheDocument();
      expect(screen.getAllByText("–").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Stok & Penjualan (seksi gabungan, redesign 2026-09)", () => {
    it("menampilkan judul seksi gabungan, bukan 'Stok'/'Riwayat Penjualan' terpisah", () => {
      renderModal();
      expect(screen.getByText("Stok & Penjualan")).toBeInTheDocument();
    });

    it("bisa di-collapse & di-expand via klik header", () => {
      renderModal();
      expect(screen.getAllByText("Gudang").length).toBeGreaterThanOrEqual(1);

      fireEvent.click(screen.getByText("Stok & Penjualan"));
      expect(screen.queryByText("Gudang")).toBeNull();

      fireEvent.click(screen.getByText("Stok & Penjualan"));
      expect(screen.getAllByText("Gudang").length).toBeGreaterThanOrEqual(1);
    });

    it("single-size: menampilkan tabel per lokasi (Gudang/Cideng/Tegalgubug + Total) dgn kolom Stok & Terjual, TANPA kartu per ukuran", () => {
      const { container } = renderModal();
      expect(screen.getAllByText("Gudang").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Cideng").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Tegalgubug").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId("row-total-lokasi")).toBeInTheDocument();

      // stok gudang=5, terjual gudang(mock)=10 -> keduanya tampil di baris yang sama
      const gudangRow = screen.getAllByText("Gudang")[0].closest("button");
      expect(gudangRow.textContent).toContain("5");
      expect(gudangRow.textContent).toContain("10");

      // tidak ada kartu per-ukuran (hanya muncul kalau stok.sizes > 1 key)
      expect(container.querySelector(".border.border-skin-bdr-lt.p-3")).toBeNull();
    });

    it("multi-size: menampilkan kartu bertumpuk per ukuran (bukan <table>) DI ATAS tabel per lokasi", () => {
      const stok = {
        gudang: 4, cideng: 2, tegalgubug: 1,
        sizes: {
          Midi: { gudang: 2, cideng: 1, tegalgubug: 0 },
          Gamis: { gudang: 2, cideng: 1, tegalgubug: 1 },
        },
      };
      const { container } = renderModal({}, { stok });
      expect(document.querySelector("table")).toBeNull();

      const sizeCards = container.querySelectorAll(".space-y-2 > .border.border-skin-bdr-lt.p-3");
      expect(sizeCards).toHaveLength(2);
      expect(sizeCards[0].textContent).toContain("Midi");
      expect(sizeCards[0].textContent).toContain("3"); // subtotal Midi (2+1+0)
      expect(sizeCards[1].textContent).toContain("Gamis");
      expect(sizeCards[1].textContent).toContain("4"); // subtotal Gamis (2+1+1)

      // tabel per lokasi tetap ada di bawahnya, pakai total AGREGAT (bukan per ukuran)
      expect(screen.getByTestId("row-total-lokasi")).toBeInTheDocument();
    });

    it("kartu per ukuran menampilkan 'HABIS' saat subtotal ukuran itu = 0", () => {
      const stok = {
        gudang: 0, cideng: 0, tegalgubug: 0,
        sizes: {
          Midi: { gudang: 0, cideng: 0, tegalgubug: 0 },
          Gamis: { gudang: 0, cideng: 0, tegalgubug: 0 },
        },
      };
      renderModal({}, { stok });
      // 2 kartu ukuran + StatCard Stok + baris Total tabel lokasi = 4x "HABIS"
      expect(screen.getAllByText("HABIS")).toHaveLength(4);
    });

    it("hanya 1 size di stok.sizes: TIDAK menampilkan kartu per ukuran (dianggap single-size)", () => {
      const stok = {
        gudang: 3, cideng: 0, tegalgubug: 0,
        sizes: { Midi: { gudang: 3, cideng: 0, tegalgubug: 0 } },
      };
      const { container } = renderModal({}, { stok });
      expect(container.querySelector(".border.border-skin-bdr-lt.p-3")).toBeNull();
      expect(screen.getAllByText("Gudang").length).toBeGreaterThanOrEqual(1);
    });

    it("baris Total mengikuti isBelumDiisi: hasStok=false + ada foto + total=0 -> '–' netral", () => {
      renderModal({}, { stok: { gudang: 0, cideng: 0, tegalgubug: 0 }, hasStok: false });
      expect(screen.queryByText("HABIS")).not.toBeInTheDocument();
      // StatCard Stok + baris Total tabel lokasi = 2x "–"
      expect(screen.getAllByText("–")).toHaveLength(2);
    });

    it("menampilkan 'Memuat...' saat isLoading=true", async () => {
      const { useSalesByKode } = await import("../hooks");
      useSalesByKode.mockReturnValue({ data: null, isLoading: true });
      renderModal();
      expect(screen.getByText("Memuat...")).toBeInTheDocument();
    });

    describe("accordion per lokasi (klik baris -> daftar pembeli, permintaan Denny 2026-09)", () => {
      it("daftar pembeli TIDAK tampil sebelum baris mana pun diklik", () => {
        renderModal();
        expect(screen.queryByText("Alex")).toBeNull();
        expect(screen.queryByText("Sari")).toBeNull();
      });

      it("klik baris 'Gudang' HANYA menampilkan pembeli di lokasi gudang (Alex), bukan Cideng (Sari)", () => {
        renderModal();
        fireEvent.click(screen.getByText("Gudang"));
        expect(screen.getByText("Alex")).toBeInTheDocument();
        expect(screen.queryByText("Sari")).toBeNull();
      });

      it("klik baris 'Cideng' HANYA menampilkan pembeli di lokasi cideng (Sari), bukan Gudang (Alex)", () => {
        renderModal();
        fireEvent.click(screen.getByText("Cideng"));
        expect(screen.getByText("Sari")).toBeInTheDocument();
        expect(screen.queryByText("Alex")).toBeNull();
      });

      it("klik baris 'Total' menampilkan SEMUA pembeli lintas lokasi (Alex & Sari) sekaligus label lokasinya", () => {
        renderModal();
        fireEvent.click(screen.getByTestId("row-total-lokasi"));
        expect(screen.getByText("Alex")).toBeInTheDocument();
        expect(screen.getByText("Sari")).toBeInTheDocument();
        const tanggalEl = screen.getByText(/20 Agustus 2026/);
        expect(tanggalEl.textContent).toContain("Gudang");
      });

      it("hanya SATU baris terbuka sekaligus — klik baris lain otomatis menutup baris sebelumnya (single-open accordion)", () => {
        renderModal();
        fireEvent.click(screen.getByText("Gudang"));
        expect(screen.getByText("Alex")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Cideng"));
        expect(screen.queryByText("Alex")).toBeNull();
        expect(screen.getByText("Sari")).toBeInTheDocument();
      });

      it("klik baris yang sama dua kali menutup lagi daftar pembeli", () => {
        renderModal();
        fireEvent.click(screen.getByText("Gudang"));
        expect(screen.getByText("Alex")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Gudang"));
        expect(screen.queryByText("Alex")).toBeNull();
      });

      it("menampilkan 'Memuat transaksi...' saat useSalesDetailByKode isLoading=true", async () => {
        const { useSalesDetailByKode } = await import("../hooks");
        useSalesDetailByKode.mockReturnValue({ data: [], isLoading: true });
        renderModal();
        fireEvent.click(screen.getByText("Gudang"));
        expect(screen.getByText("Memuat transaksi...")).toBeInTheDocument();
      });

      it("menampilkan pesan kosong saat lokasi tsb belum ada transaksi", async () => {
        const { useSalesDetailByKode } = await import("../hooks");
        useSalesDetailByKode.mockReturnValue({
          data: [{ id: "s1", created_at: "2026-08-20T10:00:00Z", buyer_name: "Alex", buyer_hp: "0812", location: "cideng", qty: 2 }],
          isLoading: false,
        });
        renderModal();
        fireEvent.click(screen.getByText("Tegalgubug"));
        expect(screen.getByText("Belum ada transaksi.")).toBeInTheDocument();
      });

      it("menampilkan 'Tanpa nama' saat buyer_name kosong/null", async () => {
        const { useSalesDetailByKode } = await import("../hooks");
        useSalesDetailByKode.mockReturnValue({
          data: [{ id: "s2", created_at: "2026-08-21T10:00:00Z", buyer_name: null, buyer_hp: "", location: "gudang", qty: 1 }],
          isLoading: false,
        });
        renderModal();
        fireEvent.click(screen.getByText("Gudang"));
        expect(screen.getByText("Tanpa nama")).toBeInTheDocument();
      });
    });
  });

  describe("Stok Sesuai Produksi", () => {
    it("bisa di-collapse via klik header", () => {
      renderModal();
      expect(screen.getByText("Midi Jumbo")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Stok Sesuai Produksi"));
      expect(screen.queryByText("Midi Jumbo")).toBeNull();
    });

    it("menampilkan seksi dengan data per ukuran dari useProducedByKode & Total", () => {
      renderModal();
      expect(screen.getByText("Stok Sesuai Produksi")).toBeInTheDocument();
      expect(screen.getByText("Midi Jumbo")).toBeInTheDocument();
      expect(screen.getAllByText("14").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Gamis Jumbo")).toBeInTheDocument();
      expect(screen.getAllByText("7").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("21").length).toBeGreaterThanOrEqual(1); // total 14+7 (juga muncul di StatCard Produksi)
    });

    it("menampilkan 'Memuat...' saat isLoading=true", async () => {
      const { useProducedByKode } = await import("../hooks");
      useProducedByKode.mockReturnValue({ producedBySize: {}, isLoading: true });
      renderModal();
      const loadingTexts = screen.getAllByText("Memuat...");
      expect(loadingTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("menampilkan pesan kosong saat belum ada data produksi", async () => {
      const { useProducedByKode } = await import("../hooks");
      useProducedByKode.mockReturnValue({ producedBySize: {}, isLoading: false });
      renderModal();
      expect(screen.getByText("Belum ada data produksi.")).toBeInTheDocument();
    });
  });

  describe("seksi Warna (accordion)", () => {
    it("bisa di-collapse via klik header", () => {
      renderModal();
      expect(screen.getByText("HITAM")).toBeInTheDocument();
      fireEvent.click(screen.getByText(/2 Warna/));
      expect(screen.queryByText("HITAM")).toBeNull();
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
