import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ProductOpnameCard from "./ProductOpnameCard";

const product = { kode: "D-01-OSK", nama: "Gamis Aisyah" };
const rows = [
  { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "HITAM", gudang: 5, cideng: 2, tegalgubug: 1 },
  { id: "r2", kode: "D-01-OSK", size: "Gamis", warna: "MERAH", gudang: 3, cideng: 0, tegalgubug: 0 },
];
const getValue = (row, loc) => row[loc] ?? 0;

function renderCard(overrides = {}) {
  return render(
    <ProductOpnameCard
      product={product}
      rows={rows}
      isOpen={false}
      onToggle={vi.fn()}
      changed={{}}
      getValue={getValue}
      onChangeRow={vi.fn()}
      {...overrides}
    />
  );
}

// Baris "Seri Lengkap" (revisi putaran 2): baris tabel dgn grid sama persis
// dengan baris warna, TANPA prefix huruf G/C/T — angka duduk langsung di
// bawah header kolom GD/CD/TG. Helper ini mengambil nilai numerik dari
// baris ke-`nth` (kalau ada beberapa ukuran, tiap ukuran punya baris
// sendiri) dengan scoping ke container baris tsb, supaya tidak collide
// dengan angka lain di halaman (input value, badge header, dst).
function seriLengkapValues(nth = 0) {
  const labels = screen.getAllByText(/Seri Lengkap/);
  const label = labels[nth];
  const row = label.closest("div").parentElement;
  return within(row)
    .getAllByText(/^\d+$/)
    .map((el) => el.textContent);
}

describe("ProductOpnameCard", () => {
  it("menampilkan kode dan nama produk di header", () => {
    renderCard();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("Gamis Aisyah")).toBeInTheDocument();
  });

  it("menampilkan total stok dan breakdown G/C/T di header", () => {
    renderCard();
    // Total: (5+2+1) + (3+0+0) = 11
    expect(screen.getByText("11 pcs")).toBeInTheDocument();
    // Breakdown gudang: 5+3=8, cideng: 2+0=2, tegalgubug: 1+0=1
    expect(screen.getByText("G8")).toBeInTheDocument();
    expect(screen.getByText("C2")).toBeInTheDocument();
    expect(screen.getByText("T1")).toBeInTheDocument();
  });

  it("menampilkan ▼ saat closed dan ▲ saat open", () => {
    const { rerender } = renderCard({ isOpen: false });
    expect(screen.getByText("▼")).toBeInTheDocument();

    rerender(
      <ProductOpnameCard
        product={product} rows={rows} isOpen={true} onToggle={vi.fn()}
        changed={{}} getValue={getValue} onChangeRow={vi.fn()}
      />
    );
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("klik header memanggil onToggle dengan kode produk", () => {
    const onToggle = vi.fn();
    renderCard({ onToggle });
    fireEvent.click(screen.getByText("D-01-OSK").closest("button"));
    expect(onToggle).toHaveBeenCalledWith("D-01-OSK");
  });

  it("menampilkan badge 'diubah' saat ada changed untuk row produk", () => {
    renderCard({ changed: { r1: { gudang: 10 } } });
    expect(screen.getByText("diubah")).toBeInTheDocument();
  });

  it("tidak menampilkan badge 'diubah' saat tidak ada changed", () => {
    renderCard({ changed: {} });
    expect(screen.queryByText("diubah")).toBeNull();
  });

  it("body tersembunyi saat isOpen=false", () => {
    renderCard({ isOpen: false });
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("body terlihat saat isOpen=true: menampilkan input stok per row (2 warna x 1 lokasi masing-masing)", () => {
    renderCard({ isOpen: true });
    // r1 (Midi) 1 warna, r2 (Gamis) 1 warna -> 2 baris total, 3 kolom lokasi tiap baris = 6 input
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBe(6);
  });

  it("saat isOpen=true, menampilkan judul ukuran (sekali per grup) dan warna tiap row", () => {
    renderCard({ isOpen: true });
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("Gamis")).toBeInTheDocument();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  it("header kolom lokasi (GD/CD/TG) tampil SEKALI per ukuran, bukan diulang per warna", () => {
    // 2 ukuran (Midi, Gamis) x 1 warna masing-masing -> tetap 2 header (1 per ukuran),
    // BUKAN 2 header x sesuatu yang lebih banyak kalau warna > 1 per ukuran.
    renderCard({ isOpen: true });
    expect(screen.getAllByText("GD")).toHaveLength(2); // 1 per grup ukuran (Midi, Gamis)
    expect(screen.getAllByText("CD")).toHaveLength(2);
    expect(screen.getAllByText("TG")).toHaveLength(2);
  });

  it("perubahan input memanggil onChangeRow dengan row, loc, val", () => {
    const onChangeRow = vi.fn();
    renderCard({ isOpen: true, onChangeRow });
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "10" } });
    expect(onChangeRow).toHaveBeenCalled();
  });

  it("setiap input punya aria-label lengkap (lokasi + warna + ukuran) walau header visual cuma sekali", () => {
    renderCard({ isOpen: true });
    expect(screen.getByLabelText("Gudang, warna HITAM, ukuran Midi")).toBeInTheDocument();
    expect(screen.getByLabelText("Cideng, warna HITAM, ukuran Midi")).toBeInTheDocument();
    expect(screen.getByLabelText("TegalGubug, warna MERAH, ukuran Gamis")).toBeInTheDocument();
  });

  it("rows kosong + isOpen=true: menampilkan pesan 'Belum ada data stok'", () => {
    renderCard({ rows: [], isOpen: true });
    expect(screen.getByText(/Belum ada data stok/)).toBeInTheDocument();
  });

  it("total stok 0 → '0 pcs' ditampilkan", () => {
    const emptyRows = [{ id: "e1", kode: "D-01-OSK", size: "Midi", warna: "_", gudang: 0, cideng: 0, tegalgubug: 0 }];
    renderCard({ rows: emptyRows });
    expect(screen.getByText("0 pcs")).toBeInTheDocument();
  });

  describe("Seri Lengkap (baris tabel tersendiri, revisi putaran 2)", () => {
    // Kasus dari instruksi Denny: 5 warna, gudang merah=3 kuning=2 hijau=6
    // biru=4 coklat=10 → seri lengkap gudang = MIN(3,2,6,4,10) = 2.
    const multiWarnaRows = [
      { id: "w1", kode: "D-100-TES", size: "Midi", warna: "MERAH", gudang: 3, cideng: 1, tegalgubug: 2 },
      { id: "w2", kode: "D-100-TES", size: "Midi", warna: "KUNING", gudang: 2, cideng: 5, tegalgubug: 1 },
      { id: "w3", kode: "D-100-TES", size: "Midi", warna: "HIJAU", gudang: 6, cideng: 3, tegalgubug: 5 },
      { id: "w4", kode: "D-100-TES", size: "Midi", warna: "BIRU", gudang: 4, cideng: 4, tegalgubug: 3 },
      { id: "w5", kode: "D-100-TES", size: "Midi", warna: "COKLAT", gudang: 10, cideng: 0, tegalgubug: 9 },
    ];

    it("TIDAK menampilkan baris Seri Lengkap saat isOpen=false (collapsed)", () => {
      renderCard({ rows: multiWarnaRows, isOpen: false });
      expect(screen.queryByText(/Seri Lengkap/)).toBeNull();
    });

    it("menghitung seri lengkap = MIN qty antar warna per lokasi, tampil sbg baris tabel (bukan cipher huruf)", () => {
      renderCard({ rows: multiWarnaRows, isOpen: true });
      expect(screen.getByText(/Seri Lengkap/)).toBeInTheDocument();
      // TIDAK ada lagi label huruf G/C/T di baris ini
      expect(screen.queryByText("G2")).toBeNull();
      expect(screen.queryByText("C0")).toBeNull();
      expect(screen.queryByText("T1")).toBeNull();
      // Nilai murni, sejajar posisi kolom GD/CD/TG: gudang=2, cideng=0, tegalgubug=1
      expect(seriLengkapValues()).toEqual(["2", "0", "1"]);
    });

    it("seri lengkap ikut nilai draft (getValue) yang belum disimpan, bukan nilai DB mentah", () => {
      const changed = { w2: { gudang: 7 } };
      const draftGetValue = (row, loc) => changed[row.id]?.[loc] ?? row[loc] ?? 0;
      renderCard({ rows: multiWarnaRows, isOpen: true, changed, getValue: draftGetValue });
      // MIN gudang sekarang: MERAH 3, KUNING 7(draft), HIJAU 6, BIRU 4, COKLAT 10 → MIN = 3
      expect(seriLengkapValues()[0]).toBe("3");
    });

    it("ukuran dengan HANYA 1 warna (mis. produk tanpa variasi warna) TIDAK menampilkan baris Seri Lengkap", () => {
      const singleWarnaRows = [
        { id: "s1", kode: "D-02-XYZ", size: "Gamis", warna: "_", gudang: 5, cideng: 2, tegalgubug: 1 },
      ];
      renderCard({ rows: singleWarnaRows, isOpen: true });
      expect(screen.queryByText(/Seri Lengkap/)).toBeNull();
    });

    it("multi-size: seri lengkap dihitung TERPISAH per ukuran (baris sendiri tiap ukuran), tidak digabung lintas size", () => {
      const multiSizeRows = [
        { id: "m1", kode: "D-03-ABC", size: "Midi", warna: "MERAH", gudang: 3, cideng: 0, tegalgubug: 0 },
        { id: "m2", kode: "D-03-ABC", size: "Midi", warna: "BIRU", gudang: 5, cideng: 0, tegalgubug: 0 },
        { id: "g1", kode: "D-03-ABC", size: "Gamis", warna: "MERAH", gudang: 1, cideng: 0, tegalgubug: 0 },
        { id: "g2", kode: "D-03-ABC", size: "Gamis", warna: "BIRU", gudang: 9, cideng: 0, tegalgubug: 0 },
      ];
      renderCard({ rows: multiSizeRows, isOpen: true });
      const labels = screen.getAllByText(/Seri Lengkap/);
      expect(labels).toHaveLength(2); // 1 baris per ukuran (Midi, Gamis)
      expect(seriLengkapValues(0)[0]).toBe("3"); // Midi: MIN(3,5)=3
      expect(seriLengkapValues(1)[0]).toBe("1"); // Gamis: MIN(1,9)=1
    });
  });

  describe("Mode fokus lokasi (prop locFilter)", () => {
    const multiWarnaRows = [
      { id: "w1", kode: "D-100-TES", size: "Midi", warna: "MERAH", gudang: 3, cideng: 1, tegalgubug: 2 },
      { id: "w2", kode: "D-100-TES", size: "Midi", warna: "BIRU", gudang: 5, cideng: 4, tegalgubug: 6 },
    ];

    it("locFilter=null (default): menampilkan 3 kolom lokasi (3 input per baris)", () => {
      renderCard({ rows: multiWarnaRows, isOpen: true, locFilter: null });
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs.length).toBe(6); // 2 warna x 3 lokasi
      expect(screen.getAllByText("GD")).toHaveLength(1);
      expect(screen.getAllByText("CD")).toHaveLength(1);
      expect(screen.getAllByText("TG")).toHaveLength(1);
    });

    it("locFilter='gudang': HANYA menampilkan 1 kolom (Gudang), kolom lain tidak dirender", () => {
      renderCard({ rows: multiWarnaRows, isOpen: true, locFilter: "gudang" });
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs.length).toBe(2); // 2 warna x 1 lokasi (gudang saja)
      expect(screen.getByText("GD")).toBeInTheDocument();
      expect(screen.queryByText("CD")).toBeNull();
      expect(screen.queryByText("TG")).toBeNull();
      expect(screen.getByLabelText("Gudang, warna MERAH, ukuran Midi")).toBeInTheDocument();
      expect(screen.queryByLabelText("Cideng, warna MERAH, ukuran Midi")).toBeNull();
    });

    it("locFilter='cideng': input yang dirender hanya untuk lokasi cideng, dengan value sesuai", () => {
      renderCard({ rows: multiWarnaRows, isOpen: true, locFilter: "cideng" });
      const input = screen.getByLabelText("Cideng, warna BIRU, ukuran Midi");
      expect(input).toHaveAttribute("placeholder", "4");
    });

    it("baris seri lengkap saat locFilter aktif hanya menampilkan 1 nilai (lokasi yang difilter)", () => {
      renderCard({ rows: multiWarnaRows, isOpen: true, locFilter: "gudang" });
      // MIN(3,5)=3, dan HANYA 1 kolom nilai yang dirender (gudang saja)
      expect(seriLengkapValues()).toEqual(["3"]);
    });
  });

  describe("Info 'sudah dikerjakan' Tim Jahit (dikerjakanMap, info-only, di header ukuran, semua warna digabung)", () => {
    it("menampilkan badge 'X dikerjakan' di judul grup ukuran saat dikerjakanMap punya entri > 0 utk kode+size", () => {
      renderCard({
        isOpen: true,
        dikerjakanMap: { "D-01-OSK|Midi": 8 },
      });
      expect(screen.getByText("✂ 8 dikerjakan")).toBeInTheDocument();
    });

    it("tidak menampilkan badge saat dikerjakanMap tidak punya entri utk size itu", () => {
      renderCard({ isOpen: true, dikerjakanMap: {} });
      expect(screen.queryByText(/dikerjakan$/)).toBeNull();
    });

    it("tidak menampilkan badge saat dikerjakanMap prop tidak diberikan sama sekali (default {})", () => {
      renderCard({ isOpen: true });
      expect(screen.queryByText(/dikerjakan$/)).toBeNull();
    });

    it("tidak menampilkan badge saat nilai dikerjakan 0", () => {
      renderCard({
        isOpen: true,
        dikerjakanMap: { "D-01-OSK|Midi": 0 },
      });
      expect(screen.queryByText(/dikerjakan$/)).toBeNull();
    });

    it("badge per-ukuran: hanya grup ukuran yang cocok kode+size yang menampilkan badge", () => {
      renderCard({
        isOpen: true,
        dikerjakanMap: { "D-01-OSK|Gamis": 4 }, // hanya cocok grup Gamis, bukan Midi
      });
      expect(screen.getByText("✂ 4 dikerjakan")).toBeInTheDocument();
      // hanya 1 badge, bukan 2 (grup Midi tidak match)
      expect(screen.getAllByText(/dikerjakan$/)).toHaveLength(1);
    });

    it("satu badge mewakili SEMUA warna di ukuran itu (digabung), bukan per baris warna", () => {
      // rows fixture: r1 Midi/HITAM, r2 Gamis/MERAH — dikerjakanMap Midi
      // harus tampil SEKALI di header Midi, TIDAK diulang per warna.
      renderCard({
        isOpen: true,
        dikerjakanMap: { "D-01-OSK|Midi": 8, "D-01-OSK|Gamis": 4 },
      });
      expect(screen.getAllByText("✂ 8 dikerjakan")).toHaveLength(1);
      expect(screen.getAllByText("✂ 4 dikerjakan")).toHaveLength(1);
    });

    it("produk tanpa warna (warna '_') tetap cocok karena key hanya kode+size", () => {
      const singleWarnaRows = [
        { id: "s1", kode: "D-02-XYZ", size: "Gamis", warna: "_", gudang: 5, cideng: 2, tegalgubug: 1 },
      ];
      renderCard({
        product: { kode: "D-02-XYZ", nama: "Produk Polos" },
        rows: singleWarnaRows,
        isOpen: true,
        dikerjakanMap: { "D-02-XYZ|Gamis": 6 },
      });
      expect(screen.getByText("✂ 6 dikerjakan")).toBeInTheDocument();
    });
  });
});
