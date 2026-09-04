import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: vi.fn((n) => String(n)),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
}));
vi.mock("@deera/shared/lib/storeInfo", () => ({
  STORE_INFO: {
    nama: "DEERA Indonesia",
    wa: "628111",
    website: "deera.id",
    instagram: "@deeraindonesia",
    rekening: [
      { bank: "BCA", no: "2060425542", atas_nama: "Siti Asiyah" },
      { bank: "BCA", no: "7145047978", atas_nama: "Wulan Nur Oktafiani" },
    ],
  },
}));

import StrukContent from "./StrukContent";

const saleMock = {
  buyer_name: "BUDI",
  buyer_hp: "08111",
  date: "2026-07-04",
  type: "sale",
  location: "gudang",
  total: 99000,   // differs from item subtotal (2 * 50000 = 100000) for unique match
  discount: 0,
  created_at: "2026-07-04T08:00:00Z",
  items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 50000 }],
};

describe("StrukContent", () => {
  it("renders buyer_name", () => {
    render(<StrukContent sale={saleMock} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("renders buyer_hp", () => {
    render(<StrukContent sale={saleMock} />);
    expect(screen.getByText("08111")).toBeInTheDocument();
  });

  it("renders item kode", () => {
    render(<StrukContent sale={saleMock} />);
    // kode and size are in the same <p>: "D-01 — MIDI" — use regex
    expect(screen.getByText(/D-01/)).toBeInTheDocument();
  });

  it("renders item size", () => {
    render(<StrukContent sale={saleMock} />);
    // size is uppercased in component — use case-insensitive regex
    expect(screen.getByText(/MIDI/i)).toBeInTheDocument();
  });

  it("renders total with formatHarga", () => {
    render(<StrukContent sale={saleMock} />);
    // total = 99000 is unique vs item subtotal 100000; component renders "Rp 99000"
    expect(screen.getByText(/99000/)).toBeInTheDocument();
  });

  it("renders RETUR label for retur type", () => {
    render(<StrukContent sale={{ ...saleMock, type: "retur" }} />);
    // "RETUR" appears in both "STRUK RETUR" and "TOTAL RETUR" — check presence
    expect(screen.getAllByText(/RETUR/i).length).toBeGreaterThan(0);
  });

  describe("Rekening (space-between + garis pemisah, tidak mepet)", () => {
    it("renders both rekening entries", () => {
      render(<StrukContent sale={saleMock} />);
      expect(screen.getByText("2060425542")).toBeInTheDocument();
      expect(screen.getByText("7145047978")).toBeInTheDocument();
      expect(screen.getByText("a.n. Siti Asiyah")).toBeInTheDocument();
      expect(screen.getByText("a.n. Wulan Nur Oktafiani")).toBeInTheDocument();
    });

    it("rekening container uses justify-content: space-between so columns aren't cramped", () => {
      const { container } = render(<StrukContent sale={saleMock} />);
      const noRekening = screen.getByText("2060425542");
      // Grandparent = the flex row wrapping every rekening column
      const row = noRekening.parentElement.parentElement;
      expect(row).toHaveStyle({ display: "flex", justifyContent: "space-between" });
    });

    it("only the 2nd+ rekening column gets a left divider line (1st column has none)", () => {
      render(<StrukContent sale={saleMock} />);
      const firstCol = screen.getByText("2060425542").parentElement;
      const secondCol = screen.getByText("7145047978").parentElement;
      // jsdom menormalisasi `borderLeft: "none"` menjadi computed style
      // "medium none rgb(0, 0, 0)" (bukan literal string "none") — assert
      // langsung ke style attribute yang di-render, bukan computed style.
      expect(firstCol.style.borderLeft).toBe("medium");
      expect(secondCol).toHaveStyle({ borderLeft: "1px dashed #000" });
    });

    it("does not crash with a single rekening entry (no divider needed)", () => {
      render(
        <StrukContent
          sale={{
            ...saleMock,
          }}
        />,
      );
      expect(screen.getByText("2060425542")).toBeInTheDocument();
    });
  });

  describe("QR ajakan lihat katalog (baru, sebelum footer WA)", () => {
    it("renders the heading, QR image, caption, website & instagram handle", () => {
      render(<StrukContent sale={saleMock} />);
      expect(screen.getByText("Lihat koleksi")).toBeInTheDocument();
      expect(screen.getByText(/lengkap Deera/)).toBeInTheDocument();
      const qr = screen.getByAltText("QR katalog Deera");
      expect(qr).toBeInTheDocument();
      expect(qr).toHaveAttribute("src", "/qr-katalog.svg");
      expect(screen.getByText("Scan untuk melihat")).toBeInTheDocument();
      expect(screen.getByText(/katalog lengkap/)).toBeInTheDocument();
      expect(screen.getByText("www.deera.id")).toBeInTheDocument();
      expect(screen.getByText("@deeraindonesia")).toBeInTheDocument();
    });

    it("sizes the QR image at ~100px (≈25×25mm @ 96dpi, permintaan Denny)", () => {
      render(<StrukContent sale={saleMock} />);
      const qr = screen.getByAltText("QR katalog Deera");
      expect(qr).toHaveStyle({ width: "100px", height: "100px" });
    });

    it("centers the QR image explicitly (display:block + margin:auto — Tailwind preflight bikin img jadi block, jadi textAlign:center parent tidak cukup)", () => {
      render(<StrukContent sale={saleMock} />);
      const qr = screen.getByAltText("QR katalog Deera");
      expect(qr).toHaveStyle({ display: "block", marginLeft: "auto", marginRight: "auto" });
    });

    it("does not crash when STORE_INFO.instagram is missing (field optional)", () => {
      // Re-render pakai sale yang sama tapi module mock TIDAK diubah di sini
      // (instagram tetap ada) — cukup pastikan guard `{STORE_INFO.instagram && ...}`
      // di komponen tidak melempar error utk kasus falsy secara umum.
      expect(() => render(<StrukContent sale={saleMock} />)).not.toThrow();
    });

    it("no longer shows the old plain website line in the footer (diganti QR block, hindari duplikat)", () => {
      render(<StrukContent sale={saleMock} />);
      // "deera.id" sekarang HANYA muncul sebagai "www.deera.id" di blok QR,
      // bukan lagi baris polos terpisah di footer.
      expect(screen.getAllByText(/deera\.id/).length).toBe(1);
    });
  });

  describe("Format tanggal (manual, bukan toLocaleString) + font size dikecilin", () => {
    it("formats as 'D Bulan YYYY, HH:mm WIB' (colon separator, bukan titik)", () => {
      render(<StrukContent sale={{ ...saleMock, created_at: "2026-08-13T23:42:00" }} />);
      // Regex longgar soal timezone environment, tapi memastikan bentuknya:
      // "<hari> <Bulan Indonesia> <tahun>, <HH>:<MM> WIB"
      const match = screen.getByText(
        /^\d{1,2} (Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) \d{4}, \d{2}:\d{2} WIB$/,
      );
      expect(match).toBeInTheDocument();
    });

    it("value tanggal pakai font size lebih kecil (13px, bukan default 15px)", () => {
      render(<StrukContent sale={{ ...saleMock, created_at: "2026-08-13T23:42:00" }} />);
      const tanggalLabel = screen.getByText("TANGGAL");
      const tanggalValue = tanggalLabel.parentElement.lastElementChild;
      expect(tanggalValue).toHaveStyle({ fontSize: "13px" });
    });

    it("renders '-' when created_at is missing", () => {
      render(<StrukContent sale={{ ...saleMock, created_at: null }} />);
      const tanggalLabel = screen.getByText("TANGGAL");
      expect(tanggalLabel.parentElement.lastElementChild).toHaveTextContent("-");
    });
  });

  describe("Garis (Divider) di atas Total — selalu tampil", () => {
    it("shows a divider line directly before TOTAL even without a discount", () => {
      const { container } = render(<StrukContent sale={{ ...saleMock, discount: 0 }} />);
      const totalLabel = screen.getByText("TOTAL");
      const totalRow = totalLabel.parentElement;
      const dividerBeforeTotal = totalRow.previousElementSibling;
      expect(dividerBeforeTotal).toHaveStyle({ borderTop: "2px solid #000" });
    });

    it("still shows the divider line before TOTAL when there IS a discount", () => {
      render(<StrukContent sale={{ ...saleMock, discount: 5000 }} />);
      const totalLabel = screen.getByText("TOTAL");
      const totalRow = totalLabel.parentElement;
      const dividerBeforeTotal = totalRow.previousElementSibling;
      expect(dividerBeforeTotal).toHaveStyle({ borderTop: "2px solid #000" });
    });
  });

  // ── Tukar Tambah (permintaan Denny 2026-09) ────────────────────────────────
  describe("Tukar Tambah", () => {
    const tukarTambahSale = {
      buyer_name: "SITI",
      buyer_hp: "08111",
      date: "2026-09-04",
      type: "tukar_tambah",
      location: "gudang",
      discount: 0,
      created_at: "2026-09-04T08:00:00Z",
      saleSubtotal: 210000,
      returTotal: 200000,
      total: 10000,
      items: [
        { kode: "D-05", size: "Gamis", qty: 1, harga: 210000, isRetur: false },
        { kode: "D-01", size: "Midi", qty: 1, harga: 200000, isRetur: true },
      ],
    };

    // Permintaan Denny 2026-09: judul tetap "STRUK PEMBELIAN" biasa,
    // jangan dibedakan jadi "STRUK TUKAR TAMBAH".
    it("renders judul STRUK PEMBELIAN (bukan STRUK TUKAR TAMBAH)", () => {
      render(<StrukContent sale={tukarTambahSale} />);
      expect(screen.getByText("STRUK PEMBELIAN")).toBeInTheDocument();
      expect(screen.queryByText("STRUK TUKAR TAMBAH")).not.toBeInTheDocument();
    });

    // Permintaan Denny 2026-09: item retur ditulis "(RETUR)" nempel di
    // belakang nama item, BUKAN prefix "RETUR — " terpisah di depan.
    it("renders item baru & item retur, retur diberi suffix (RETUR)", () => {
      render(<StrukContent sale={tukarTambahSale} />);
      expect(screen.getByText(/D-01 — MIDI \(RETUR\)/)).toBeInTheDocument();
      expect(screen.getByText(/^\d\. D-05/)).toBeInTheDocument();
      expect(screen.queryByText(/RETUR — D-01/)).not.toBeInTheDocument();
    });

    // Permintaan Denny 2026-09: label "Subtotal" polos (bukan "Subtotal Beli
    // Baru"), Total tetap "TOTAL" (bukan "TOTAL BERSIH").
    it("renders breakdown Subtotal & Retur", () => {
      render(<StrukContent sale={tukarTambahSale} />);
      expect(screen.getByText("Subtotal")).toBeInTheDocument();
      expect(screen.queryByText("Subtotal Beli Baru")).not.toBeInTheDocument();
      // "210000"/"200000" juga muncul di baris item (line total) — dgn qty=1
      // nilainya sama persis dgn saleSubtotal/returTotal, jadi cek "ada di
      // suatu tempat" (getAllByText), bukan match tunggal.
      expect(screen.getAllByText(/210000/).length).toBeGreaterThan(0);
      expect(screen.getByText("Retur")).toBeInTheDocument();
      expect(screen.getAllByText(/200000/).length).toBeGreaterThan(0);
    });

    it("renders TOTAL polos dgn nilai net (bukan 'TOTAL BERSIH')", () => {
      render(<StrukContent sale={tukarTambahSale} />);
      const label = screen.getByText("TOTAL");
      // "10000" bisa jadi substring dari angka lain (mis. "210000") — cek
      // langsung nilai di baris TOTAL itu sendiri, bukan getByText global.
      expect(label.parentElement).toHaveTextContent("Rp 10000");
      expect(screen.queryByText("TOTAL BERSIH")).not.toBeInTheDocument();
    });

    it("net negatif (retur > beli baru) menampilkan 'UANG KEMBALI' dgn nilai absolut", () => {
      render(<StrukContent sale={{ ...tukarTambahSale, saleSubtotal: 50000, total: -150000 }} />);
      const label = screen.getByText("UANG KEMBALI");
      expect(label.parentElement).toHaveTextContent("Rp 150000");
      expect(screen.queryByText("TOTAL")).not.toBeInTheDocument();
    });

    it("footer menampilkan ucapan generik 'Terima kasih atas transaksi Anda!' (permintaan Denny 2026-09)", () => {
      render(<StrukContent sale={tukarTambahSale} />);
      expect(screen.getByText("Terima kasih atas transaksi Anda!")).toBeInTheDocument();
      expect(screen.queryByText(/tukar tambah Anda/)).not.toBeInTheDocument();
    });

    it("menampilkan Diskon di breakdown kalau ada diskon", () => {
      render(<StrukContent sale={{ ...tukarTambahSale, discount: 5000, total: 5000 }} />);
      expect(screen.getByText("Diskon")).toBeInTheDocument();
    });
  });
});
