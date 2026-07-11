import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock sub-komponen agar ProductForm tidak deep-render sub-tree
vi.mock("./SizeSection", () => ({
  default: ({ activeSet, onToggle, onHarga, saving }) => (
    <div data-testid="size-section">
      <button onClick={() => onToggle("Midi")} disabled={saving}>toggle-Midi</button>
      <button onClick={() => onToggle("Gamis")} disabled={saving}>toggle-Gamis</button>
      <input
        data-testid="harga-Midi"
        onChange={(e) => onHarga("Midi", e.target.value)}
        disabled={saving || !activeSet.has("Midi")}
      />
      <span data-testid="active-sizes">{[...activeSet].join(",")}</span>
    </div>
  ),
}));

vi.mock("./ImageSection", () => ({
  default: ({ mainImage, setMainImage, detailImages, setDetailImages, saving }) => (
    <div data-testid="image-section">
      <button onClick={() => setMainImage({ type: "url", url: "new.jpg" })} disabled={saving}>
        set-main
      </button>
      <button onClick={() => setDetailImages([{ type: "url", url: "d1.jpg" }])} disabled={saving}>
        set-detail
      </button>
    </div>
  ),
}));

vi.mock("./WarnaSection", () => ({
  default: ({ warna, onAdd, onRemove, warnaHasStok, saving }) => (
    <div data-testid="warna-section">
      <button onClick={() => onAdd("BIRU")} disabled={saving}>add-warna</button>
      <button onClick={() => onRemove("HITAM")} disabled={saving}>remove-warna</button>
      <span data-testid="warna-list">{warna.join(",")}</span>
      <span data-testid="has-stok-result">{String(warnaHasStok("HITAM"))}</span>
    </div>
  ),
}));

vi.mock("./HppSection", () => ({
  default: ({ hpp, onHpp, saving }) => (
    <div data-testid="hpp-section">
      <input data-testid="hpp-input" value={hpp} onChange={(e) => onHpp(e.target.value)} disabled={saving} />
    </div>
  ),
}));

const useStokWarnaByKodeMock = vi.fn();
const useSaveProductMock = vi.fn();
vi.mock("../hooks", () => ({
  useStokWarnaByKode: (...args) => useStokWarnaByKodeMock(...args),
  useSaveProduct: () => useSaveProductMock,
}));

const { default: ProductForm } = await import("./ProductForm");

const NEW_PRODUCT = null;
const EDIT_PRODUCT = {
  kode: "D-07-OSK",
  nama: "Gamis Lama",
  bahan: "Ceruti",
  hpp: 100000,
  variants: [{ size: "Midi", harga: 200000 }, { size: "Gamis", harga: 250000 }],
  warna: ["HITAM", "MERAH"],
  image: "old.jpg",
  detail: ["d1.jpg"],
};

function renderForm(props = {}) {
  return render(
    <ProductForm
      product={NEW_PRODUCT}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      onDelete={undefined}
      {...props}
    />
  );
}

beforeEach(() => {
  useStokWarnaByKodeMock.mockReset();
  useSaveProductMock.mockReset();
  // Default: stok kosong, tidak loading
  useStokWarnaByKodeMock.mockReturnValue({ stokWarnaMap: {}, loading: false });
});

describe("ProductForm", () => {
  describe("mode tambah (product=null)", () => {
    it("menampilkan heading 'Tambah Produk'", () => {
      renderForm();
      const headings = screen.getAllByText("Tambah Produk"); expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    it("tombol submit menampilkan 'Tambah Produk'", () => {
      renderForm();
      expect(screen.getByRole("button", { name: "Tambah Produk" })).toBeInTheDocument();
    });

    it("field kode kosong, nama kosong, bahan kosong", () => {
      const { container } = renderForm();
      const inputs = container.querySelectorAll('input[type="text"]');
      // kodeAngka, kodeBahan, nama, bahan — semua kosong
      Array.from(inputs).slice(0, 4).forEach((inp) => {
        if (inp.placeholder !== "150000") expect(inp.value).toBe("");
      });
    });

    it("tidak memanggil useStokWarnaByKode saat isEdit=false (enabled=false)", () => {
      renderForm();
      expect(useStokWarnaByKodeMock).toHaveBeenCalledWith("", { enabled: false });
    });

    it("tombol hapus produk TIDAK muncul saat onDelete undefined", () => {
      renderForm();
      expect(screen.queryByText(/Hapus Produk/)).toBeNull();
    });
  });

  describe("mode edit (product tersedia)", () => {
    it("menampilkan heading 'Edit Produk'", () => {
      renderForm({ product: EDIT_PRODUCT });
      const editHeadings = screen.getAllByText("Edit Produk"); expect(editHeadings.length).toBeGreaterThanOrEqual(1);
    });

    it("tombol submit menampilkan 'Simpan'", () => {
      renderForm({ product: EDIT_PRODUCT });
      expect(screen.getByRole("button", { name: "Simpan" })).toBeInTheDocument();
    });

    it("memanggil useStokWarnaByKode dengan originalKode saat isEdit=true", () => {
      renderForm({ product: EDIT_PRODUCT });
      expect(useStokWarnaByKodeMock).toHaveBeenCalledWith("D-07-OSK", { enabled: true });
    });

    it("mengisi field nama & bahan dari product", () => {
      const { container } = renderForm({ product: EDIT_PRODUCT });
      expect(container.querySelector('input[placeholder="Bahan x Style"]').value).toBe("Gamis Lama");
      expect(container.querySelector('input[placeholder="Aurora burkat mix jasmin"]').value).toBe("Ceruti");
    });

    it("tombol hapus produk MUNCUL saat onDelete tersedia", () => {
      renderForm({ product: EDIT_PRODUCT, onDelete: vi.fn() });
      expect(screen.getByText(/Hapus Produk Ini/)).toBeInTheDocument();
    });

    it("klik onDelete memanggil prop onDelete", () => {
      const onDelete = vi.fn();
      renderForm({ product: EDIT_PRODUCT, onDelete });
      fireEvent.click(screen.getByText(/Hapus Produk Ini/));
      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe("kode produk", () => {
    it("input kodeAngka strips non-digit", () => {
      const { container } = renderForm();
      const kodeAngkaInput = container.querySelector('input[placeholder="72"]');
      fireEvent.change(kodeAngkaInput, { target: { value: "abc72" } });
      expect(kodeAngkaInput.value).toBe("72");
    });

    it("input kodeBahan strips non-letter & uppercase", () => {
      const { container } = renderForm();
      const kodeBahanInput = container.querySelector('input[placeholder="JTB"]');
      fireEvent.change(kodeBahanInput, { target: { value: "abc123" } });
      expect(kodeBahanInput.value).toBe("ABC");
    });

    it("menampilkan generatedKode saat kodeAngka & kodeBahan diisi", () => {
      const { container } = renderForm();
      fireEvent.change(container.querySelector('input[placeholder="72"]'), { target: { value: "07" } });
      fireEvent.change(container.querySelector('input[placeholder="JTB"]'), { target: { value: "OSK" } });
      expect(screen.getByText(/D-07-OSK/)).toBeInTheDocument();
    });

    it("menampilkan peringatan perubahan kode saat isEdit & kode berbeda dari original", () => {
      const { container } = renderForm({ product: EDIT_PRODUCT });
      // Ubah kodeAngka dari "07" ke "09"
      fireEvent.change(container.querySelector('input[placeholder="72"]'), { target: { value: "09" } });
      expect(screen.getByText(/Berubah dari D-07-OSK/)).toBeInTheDocument();
    });
  });

  describe("warna section integration", () => {
    it("onAdd warna memperbarui list warna", () => {
      renderForm();
      fireEvent.click(screen.getByText("add-warna"));
      expect(screen.getByTestId("warna-list").textContent).toContain("BIRU");
    });

    it("onRemove warna memperbarui list warna", () => {
      renderForm({ product: EDIT_PRODUCT });
      fireEvent.click(screen.getByText("remove-warna"));
      // "HITAM" dihapus dari ["HITAM","MERAH"]
      expect(screen.getByTestId("warna-list").textContent).not.toContain("HITAM");
      expect(screen.getByTestId("warna-list").textContent).toContain("MERAH");
    });
  });

  describe("warnaHasStok", () => {
    it("warnaHasStok(w) = false saat stokWarnaMap kosong", () => {
      useStokWarnaByKodeMock.mockReturnValue({ stokWarnaMap: {}, loading: false });
      renderForm({ product: EDIT_PRODUCT });
      expect(screen.getByTestId("has-stok-result").textContent).toBe("false");
    });

    it("warnaHasStok(w) = true saat ada stok untuk warna itu", () => {
      useStokWarnaByKodeMock.mockReturnValue({
        stokWarnaMap: { Midi: { HITAM: { gudang: 1, cideng: 0, tegalgubug: 0 } } },
        loading: false,
      });
      renderForm({ product: EDIT_PRODUCT });
      expect(screen.getByTestId("has-stok-result").textContent).toBe("true");
    });

    it("warnaHasStok(w) = false saat stok semua lokasi = 0", () => {
      useStokWarnaByKodeMock.mockReturnValue({
        stokWarnaMap: { Midi: { HITAM: { gudang: 0, cideng: 0, tegalgubug: 0 } } },
        loading: false,
      });
      renderForm({ product: EDIT_PRODUCT });
      expect(screen.getByTestId("has-stok-result").textContent).toBe("false");
    });
  });

  describe("orphan warna warning", () => {
    it("menampilkan peringatan orphan warna saat isEdit & ada warna di stok yang tidak ada lagi di warna array", () => {
      useStokWarnaByKodeMock.mockReturnValue({
        stokWarnaMap: { Midi: { BIRU: { gudang: 1, cideng: 0, tegalgubug: 0 } } },
        loading: false,
      });
      // EDIT_PRODUCT punya warna ["HITAM","MERAH"], tidak punya "BIRU"
      // stokWarnaMap punya "BIRU" → orphan
      renderForm({ product: EDIT_PRODUCT });
      expect(screen.getByText(/data stok untuk/i)).toBeInTheDocument();
      expect(screen.getByText(/BIRU/)).toBeInTheDocument();
    });

    it("tidak menampilkan peringatan saat tidak ada orphan", () => {
      useStokWarnaByKodeMock.mockReturnValue({
        stokWarnaMap: { Midi: { HITAM: { gudang: 1, cideng: 0, tegalgubug: 0 } } },
        loading: false,
      });
      renderForm({ product: EDIT_PRODUCT });
      expect(screen.queryByText(/data stok untuk/i)).toBeNull();
    });

    it("tidak menampilkan peringatan saat stokLoading=true", () => {
      useStokWarnaByKodeMock.mockReturnValue({ stokWarnaMap: {}, loading: true });
      renderForm({ product: EDIT_PRODUCT });
      expect(screen.queryByText(/data stok untuk/i)).toBeNull();
    });
  });

  describe("validasi submit", () => {
    it("menampilkan error saat kode kosong (kodeAngka & kodeBahan tidak diisi)", async () => {
      renderForm();
      fireEvent.submit(screen.getByRole("button", { name: "Tambah Produk" }).closest("form"));
      await waitFor(() => {
        expect(screen.getByText(/Kode wajib diisi/)).toBeInTheDocument();
      });
      expect(useSaveProductMock).not.toHaveBeenCalled();
    });

    it("menampilkan error saat nama kosong", async () => {
      const { container } = renderForm();
      fireEvent.change(container.querySelector('input[placeholder="72"]'), { target: { value: "07" } });
      fireEvent.change(container.querySelector('input[placeholder="JTB"]'), { target: { value: "OSK" } });
      fireEvent.submit(container.querySelector("form"));
      await waitFor(() => {
        expect(screen.getByText(/Nama wajib diisi/)).toBeInTheDocument();
      });
    });

    it("menampilkan error saat tidak ada ukuran aktif", async () => {
      const { container } = renderForm();
      fireEvent.change(container.querySelector('input[placeholder="72"]'), { target: { value: "07" } });
      fireEvent.change(container.querySelector('input[placeholder="JTB"]'), { target: { value: "OSK" } });
      fireEvent.change(container.querySelector('input[placeholder="Bahan x Style"]'), { target: { value: "Produk A" } });
      fireEvent.submit(container.querySelector("form"));
      await waitFor(() => {
        expect(screen.getByText(/Pilih minimal 1 ukuran/)).toBeInTheDocument();
      });
    });
  });

  describe("submit sukses", () => {
    it("memanggil saveProduct dengan payload lengkap & memanggil onSaved", async () => {
      useSaveProductMock.mockResolvedValue({ kode: "D-07-OSK" });
      const onSaved = vi.fn();
      const { container } = renderForm({ onSaved });

      // Isi field minimal yang valid
      fireEvent.change(container.querySelector('input[placeholder="72"]'), { target: { value: "07" } });
      fireEvent.change(container.querySelector('input[placeholder="JTB"]'), { target: { value: "OSK" } });
      fireEvent.change(container.querySelector('input[placeholder="Bahan x Style"]'), { target: { value: "Gamis X" } });
      // Toggle Midi aktif (activeSet kosong by default)
      fireEvent.click(screen.getByText("toggle-Midi"));

      await act(async () => {
        fireEvent.submit(container.querySelector("form"));
      });

      await waitFor(() => {
        expect(useSaveProductMock).toHaveBeenCalledWith(
          expect.objectContaining({
            isEdit: false,
            finalKode: "D-07-OSK",
            fields: expect.objectContaining({ nama: "Gamis X" }),
          })
        );
      });
      expect(onSaved).toHaveBeenCalledWith("D-07-OSK berhasil ditambahkan.");
    });

    it("pesan onSaved edit mode: 'berhasil diperbarui'", async () => {
      useSaveProductMock.mockResolvedValue({});
      const onSaved = vi.fn();
      renderForm({ product: EDIT_PRODUCT, onSaved });

      await act(async () => {
        fireEvent.submit(screen.getByRole("button", { name: "Simpan" }).closest("form"));
      });

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith("D-07-OSK berhasil diperbarui.");
      });
    });
  });

  describe("submit gagal", () => {
    it("menampilkan pesan error & tidak memanggil onSaved", async () => {
      useSaveProductMock.mockRejectedValue(new Error("koneksi gagal"));
      const onSaved = vi.fn();
      const { container } = renderForm({ onSaved });

      fireEvent.change(container.querySelector('input[placeholder="72"]'), { target: { value: "07" } });
      fireEvent.change(container.querySelector('input[placeholder="JTB"]'), { target: { value: "OSK" } });
      fireEvent.change(container.querySelector('input[placeholder="Bahan x Style"]'), { target: { value: "Gamis X" } });
      fireEvent.click(screen.getByText("toggle-Midi"));

      await act(async () => {
        fireEvent.submit(container.querySelector("form"));
      });

      await waitFor(() => {
        expect(screen.getByText(/Gagal simpan: koneksi gagal/)).toBeInTheDocument();
      });
      expect(onSaved).not.toHaveBeenCalled();
      // Tombol submit kembali enabled setelah error
      expect(screen.getByRole("button", { name: "Tambah Produk" })).not.toBeDisabled();
    });
  });

  describe("UI state", () => {
    it("klik Batal (footer) memanggil onClose", () => {
      const onClose = vi.fn();
      renderForm({ onClose });
      fireEvent.click(screen.getByRole("button", { name: "Batal" }));
      expect(onClose).toHaveBeenCalled();
    });

    it("klik × (header close) memanggil onClose", () => {
      const onClose = vi.fn();
      renderForm({ onClose });
      fireEvent.click(screen.getByRole("button", { name: "×" }));
      expect(onClose).toHaveBeenCalled();
    });

    it("backdrop click memanggil onClose saat tidak saving", () => {
      const onClose = vi.fn();
      const { container } = renderForm({ onClose });
      const backdrop = container.querySelector(".absolute.inset-0");
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    });

    it("saat saving=true: tombol submit menampilkan 'Menyimpan...' & disabled", async () => {
      let resolvePromise;
      useSaveProductMock.mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );
      const { container } = renderForm();

      fireEvent.change(container.querySelector('input[placeholder="72"]'), { target: { value: "07" } });
      fireEvent.change(container.querySelector('input[placeholder="JTB"]'), { target: { value: "OSK" } });
      fireEvent.change(container.querySelector('input[placeholder="Bahan x Style"]'), { target: { value: "X" } });
      fireEvent.click(screen.getByText("toggle-Midi"));

      fireEvent.submit(container.querySelector("form"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Menyimpan..." })).toBeDisabled();
      });

      // Verifikasi mock benar-benar dipanggil (promise di-resolve)
      expect(typeof resolvePromise).toBe("function");
      await act(async () => { resolvePromise({}); });
    });
  });

  describe("upload video: validasi ukuran (MAX_VIDEO_MB)", () => {
    it("menolak video > 100MB, menampilkan pesan error, tidak menyimpan videoFile", () => {
      const { container } = renderForm();
      const videoInput = container.querySelector('input[type="file"][accept="video/*"]');
      const bigFile = new File(["x"], "besar.mp4", { type: "video/mp4" });
      Object.defineProperty(bigFile, "size", { value: 150 * 1024 * 1024 }); // 150MB
      fireEvent.change(videoInput, { target: { files: [bigFile] } });

      expect(
        screen.getByText(/Ukuran video melebihi batas maksimum 100 MB/),
      ).toBeInTheDocument();
      // Video tidak tersimpan -> input upload masih tampil (bukan preview)
      expect(screen.getByText("Upload Video")).toBeInTheDocument();
    });

    it("menerima video <= 100MB, menyimpan videoFile & menampilkan ukurannya", () => {
      const { container } = renderForm();
      const videoInput = container.querySelector('input[type="file"][accept="video/*"]');
      const okFile = new File(["x"], "ok.mp4", { type: "video/mp4" });
      Object.defineProperty(okFile, "size", { value: 5 * 1024 * 1024 }); // 5MB
      fireEvent.change(videoInput, { target: { files: [okFile] } });

      expect(screen.queryByText(/Ukuran video melebihi batas/)).toBeNull();
      expect(screen.getByText("ok.mp4")).toBeInTheDocument();
      expect(screen.getByText("(5.0 MB)")).toBeInTheDocument();
    });
  });
});
