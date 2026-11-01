import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkOrderModal, { MAX_WO_FOTOS } from "./WorkOrderModal";

const mockPrintImageA4 = vi.fn();
vi.mock("../utils", async (importOriginal) => ({
  ...(await importOriginal()),
  printImageA4: (...args) => mockPrintImageA4(...args),
}));

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));
vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => url ?? "",
}));
vi.mock("@deera/shared/lib/storeInfo", () => ({
  STORE_INFO: { wa: "0812-TEST-WA" },
}));
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "admin@deera.id", user_metadata: { full_name: "Admin Toko" } } }),
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// useWoDraft TIDAK di-mock (tetap pakai store Zustand asli) supaya draft
// autosave/clear sungguhan bisa diuji — lihat describe "draft tersimpan
// otomatis" di bawah. Store direset di beforeEach global.
const mockLogWorkOrder = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useLogWorkOrder: () => mockLogWorkOrder };
});

import { toPng } from "html-to-image";
import { toast } from "@deera/shared/features/toast/hooks";
import { useWoDraftStore } from "../store";

beforeEach(() => {
  useWoDraftStore.setState({ drafts: {} });
});

const approvedSampel = {
  id: "s1",
  nomor: "SPL-20260902-ABC",
  nama: "Gamis Arkana",
  kode_produk: "D-07-OSK",
  tanggal: "2026-08-01",
  status: "approved",
  foto: ["https://cloud/final1.jpg", "https://cloud/final2.jpg"],
  bahan_items: [{ nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard" }],
  perubahan: "Kancing dipindah ke kiri",
  approved_by: "reviewer@deera.id",
  approved_at: "2026-08-05T10:00:00.000Z",
};

function setup(overrides = {}) {
  const onClose = vi.fn();
  const sampel = { ...approvedSampel, ...overrides };
  const utils = render(<WorkOrderModal sampel={sampel} onClose={onClose} />);
  return { onClose, sampel, ...utils };
}

describe("WorkOrderModal (permintaan Denny 2026-09: Work Order untuk tukang potong)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toPng.mockResolvedValue("data:image/png;base64,TESTDATA");
    mockLogWorkOrder.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    } catch (_) {
    }
  });

  it("returns null when sampel is null", () => {
    const { container } = render(<WorkOrderModal sampel={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows nomor sampel in header", () => {
    setup();
    expect(screen.getAllByText("SPL-20260902-ABC").length).toBeGreaterThan(0);
  });

  it("prefills size dari wo_sizes sampel (WO sebelumnya), bukan reset ke kosong (Denny 2026-10-20: size WO hilang kalau dibuka lagi)", () => {
    setup({ wo_sizes: ["Midi", "Gamis Jumbo"] });
    expect(screen.getByRole("button", { name: "Midi" })).toHaveClass("border-skin-accent");
    expect(screen.getByRole("button", { name: "Gamis Jumbo" })).toHaveClass("border-skin-accent");
    expect(screen.getByRole("button", { name: "Gamis" })).not.toHaveClass("border-skin-accent");
    expect(screen.getByText("Cetak A4")).not.toBeDisabled();
  });

  it("renders size checklist dari SIZE_PRESETS", () => {
    setup();
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("Midi Jumbo")).toBeInTheDocument();
    expect(screen.getByText("Gamis")).toBeInTheDocument();
    expect(screen.getByText("Gamis Jumbo")).toBeInTheDocument();
  });

  it("disables Unduh/Bagikan saat belum ada size dipilih, dan menampilkan hint", () => {
    setup();
    expect(screen.getByText(/Pilih minimal 1 size/)).toBeInTheDocument();
    expect(screen.getByText("Unduh PNG")).toBeDisabled();
    expect(screen.getByText("Bagikan")).toBeDisabled();
  });

  it("memilih size mengaktifkan tombol Unduh/Bagikan", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    expect(screen.getByText("Unduh PNG")).not.toBeDisabled();
    expect(screen.queryByText(/Pilih minimal 1 size/)).not.toBeInTheDocument();
  });

  it("klik size lagi membatalkan pilihan (toggle)", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    expect(screen.getByText("Unduh PNG")).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    expect(screen.getByText("Unduh PNG")).toBeDisabled();
  });

  it("Unduh PNG memanggil toPng, trigger anchor click, dan mencatat logWorkOrder", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Gamis" }));
    await user.click(screen.getByText("Unduh PNG"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(mockLogWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ sizes: ["Gamis"] }),
      ),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("Unduh PNG pakai filename work-order-<nomor>.png", async () => {
    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a" && !capturedAnchor) capturedAnchor = el;
      return el;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    await user.click(screen.getByText("Unduh PNG"));

    await waitFor(() => expect(capturedAnchor).not.toBeNull());
    await waitFor(() => expect(capturedAnchor.download).toBe("work-order-SPL-20260902-ABC.png"));
  });

  it("Bagikan pakai navigator.share saat tersedia", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: shareMock });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    await user.click(screen.getByText("Bagikan"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(shareMock.mock.calls[0][0].files).toHaveLength(2);
  });

  it("Bagikan fallback ke download saat navigator.share tidak tersedia", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    await user.click(screen.getByText("Bagikan"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(2));
  });

  it("calls onClose when ✕ or Tutup diklik", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("tidak menampilkan section Bahan yang Dipakai kalau bahan_items kosong", () => {
    setup({ bahan_items: [] });
    expect(screen.queryByText("Bahan yang Dipakai")).not.toBeInTheDocument();
  });

  it("menampilkan nama bahan dari bahan_items", () => {
    setup();
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  describe("thumbnail foto per bahan (permintaan Denny 2026-09: 'disempilin juga image kecil bahan bahan yang dipakai')", () => {
    it("bahan tanpa foto sama sekali -> tidak render <img> di baris itu", () => {
      setup({ bahan_items: [{ nama_bahan: "Wolfis", kode_bahan: "B-01" }] });
      expect(screen.getByText("Wolfis")).toBeInTheDocument();
      expect(screen.queryByAltText("Wolfis")).not.toBeInTheDocument();
    });

    it("bahan dgn foto (field baru per-item) -> render <img> kecil dgn alt=nama_bahan", () => {
      setup({
        bahan_items: [{ nama_bahan: "Wolfis", kode_bahan: "B-01", foto: "https://cloud/wolfis.jpg" }],
      });
      expect(screen.getByAltText("Wolfis")).toHaveAttribute("src", "https://cloud/wolfis.jpg");
    });

    it("bahan_items[0] tanpa foto tapi sampel.bahan_foto (legacy) ada -> tetap fallback tampil foto", () => {
      setup({
        bahan_foto: "https://cloud/legacy-bahan.jpg",
        bahan_items: [{ nama_bahan: "Wolfis", kode_bahan: "B-01" }],
      });
      expect(screen.getByAltText("Wolfis")).toHaveAttribute("src", "https://cloud/legacy-bahan.jpg");
    });

    it("2 bahan, hanya salah satu punya foto -> cuma 1 <img> yang muncul", () => {
      setup({
        bahan_items: [
          { nama_bahan: "Wolfis", foto: "https://cloud/wolfis.jpg" },
          { nama_bahan: "Katun Rayon" },
        ],
      });
      expect(screen.getByAltText("Wolfis")).toBeInTheDocument();
      expect(screen.queryByAltText("Katun Rayon")).not.toBeInTheDocument();
      expect(screen.getByText("Katun Rayon")).toBeInTheDocument();
    });
  });
});

describe("WorkOrderModal — Foto yang Dicetak (permintaan Denny 2026-09: 'foto2nya bisa dipilih mana aja yang mau di cetak')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menampilkan section Foto yang Dicetak dengan semua foto ter-checklist (✓) secara default", () => {
    setup();
    expect(screen.getByText("Foto yang Dicetak")).toBeInTheDocument();
    const thumbs = screen.getAllByAltText(/^foto \d+$/);
    expect(thumbs).toHaveLength(2);
  });

  it("klik thumbnail meng-uncheck foto itu (hilang dari dokumen)", async () => {
    const user = userEvent.setup();
    const { container } = setup();
    const thumb1 = screen.getByAltText("foto 1").closest("button");
    await user.click(thumb1);
    const docImgs = container.querySelectorAll('img[alt^="sampel final"]');
    expect(docImgs).toHaveLength(1);
  });

  it("tidak menampilkan section Foto yang Dicetak kalau sampel.foto kosong", () => {
    setup({ foto: [] });
    expect(screen.queryByText("Foto yang Dicetak")).not.toBeInTheDocument();
  });
});

describe("WorkOrderModal — Catatan Approve + tombol Salin (diskusi sudah dilakukan offline, tidak lagi dari komentar)", () => {
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText: mockWriteText },
    });
  });

  it("menampilkan catatan approve (sampel.perubahan) sebagai poin tanpa judul, dengan tombol Salin", () => {
    setup();
    expect(screen.getByText("Catatan Approve")).toBeInTheDocument();
    expect(screen.getAllByText(/Kancing dipindah ke kiri/).length).toBeGreaterThan(0);
    expect(screen.getByText("Salin")).toBeInTheDocument();
  });

  it("tanpa perubahan -> section Catatan Approve tidak dicetak", () => {
    setup({ perubahan: null });
    expect(screen.queryByText("Catatan Approve")).not.toBeInTheDocument();
    expect(screen.queryByText("Salin")).not.toBeInTheDocument();
  });

  it("foto model/bahan jadi kandidat referensi, otomatis terpilih & diberi label saat dicetak", () => {
    setup({ model_foto: ["https://cloud/m1.jpg"] });
    const picker = screen.getByTestId("ref-picker");
    expect(picker.querySelectorAll("button")).toHaveLength(1);
    const refs = screen.getByTestId("wo-photo-page");
    expect(refs.querySelector('img[alt="Foto A"]')).toHaveAttribute("src", "https://cloud/m1.jpg");
  });

  it("klik foto referensi untuk un-centang menghapusnya dari cetakan", () => {
    setup({ model_foto: ["https://cloud/m1.jpg", "https://cloud/m2.jpg"] });
    const picker = screen.getByTestId("ref-picker");
    fireEvent.click(picker.querySelectorAll("button")[0]);
    const refs = screen.getByTestId("wo-photo-page");
    expect(refs.querySelectorAll('img[alt^="Foto "]')).toHaveLength(1);
    expect(refs.querySelector('img[alt^="Foto "]')).toHaveAttribute("src", "https://cloud/m2.jpg");
  });

  it.each([
    [1, "repeat(2, 1fr)", "repeat(2, 1fr)"],
    [4, "repeat(2, 1fr)", "repeat(3, 1fr)"],
  ])("2 foto sampel + %i foto referensi di halaman 2 -> grid kolom %s, baris %s", (n, cols, rows) => {
    const model_foto = Array.from({ length: n }, (_, i) => `https://cloud/g${i}.jpg`);
    setup({ model_foto });
    const grid = screen.getByTestId("wo-photo-page");
    expect(grid.style.gridTemplateColumns).toBe(cols);
    expect(grid.style.gridTemplateRows).toBe(rows);
  });

  it("tanpa foto tambahan selain foto final -> bagian Foto Referensi tidak dicetak", () => {
    setup();
    expect(screen.queryByTestId("ref-picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("wo-photo-page").querySelector('img[alt^="Foto "]')).toBeNull();
  });

  it("klik Salin menyalin notesText ke clipboard dan label berubah jadi ✓ Tersalin", async () => {
    setup();
    fireEvent.click(screen.getByText("Salin"));
    await waitFor(() =>
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("Kancing dipindah ke kiri")),
    );
    await waitFor(() => expect(screen.getByText("✓ Tersalin")).toBeInTheDocument());
  });
});

describe("WorkOrderModal — dokumen fixed 1 halaman (permintaan Denny 2026-09: 'saya mau fixed 1 page ga boleh lebih')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("kontainer dokumen A4 punya height tetap + overflow hidden (fixed 1 halaman)", () => {
    const { container } = setup();
    const doc = container.querySelector('[style*="Georgia"]');
    expect(doc).toHaveStyle({ overflow: "hidden" });
  });
});

describe("WorkOrderModal — Foto dibatasi maks 2 (permintaan Denny 2026-09: 'bisa pilih lebih dari 1 image yang mau di print, tapi kita set aja max 2 foto aja yang bisa di print')", () => {
  const tigaFoto = ["https://cloud/final1.jpg", "https://cloud/final2.jpg", "https://cloud/final3.jpg"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MAX_WO_FOTOS bernilai 2", () => {
    expect(MAX_WO_FOTOS).toBe(2);
  });

  it("default hanya 2 foto pertama tercentang walau sampel punya 3 foto", () => {
    const { container } = setup({ foto: tigaFoto });
    expect(screen.getByAltText("foto 1").closest("button")).toHaveClass("border-skin-accent");
    expect(screen.getByAltText("foto 2").closest("button")).toHaveClass("border-skin-accent");
    expect(screen.getByAltText("foto 3").closest("button")).not.toHaveClass("border-skin-accent");
    const docImgs = container.querySelectorAll('img[alt^="sampel final"]');
    expect(docImgs).toHaveLength(2);
  });

  it("menampilkan counter '2/2 dipilih' saat sudah mencapai batas", () => {
    setup({ foto: tigaFoto });
    const counter = screen.getByText((_, el) => el?.textContent === `${MAX_WO_FOTOS}/${MAX_WO_FOTOS} dipilih`);
    expect(counter).toBeInTheDocument();
  });

  it("klik foto ke-3 saat sudah 2 tercentang -> ditolak + toast error, tidak nambah ke dokumen", async () => {
    const user = userEvent.setup();
    const { container } = setup({ foto: tigaFoto });
    await user.click(screen.getByAltText("foto 3").closest("button"));

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(`Maksimal ${MAX_WO_FOTOS} foto`));
    expect(screen.getByAltText("foto 3").closest("button")).not.toHaveClass("border-skin-accent");
    const docImgs = container.querySelectorAll('img[alt^="sampel final"]');
    expect(docImgs).toHaveLength(2);
  });

  it("uncheck salah satu foto lalu klik foto ke-3 -> berhasil ditambahkan (kuota kebuka lagi)", async () => {
    const user = userEvent.setup();
    const { container } = setup({ foto: tigaFoto });
    await user.click(screen.getByAltText("foto 1").closest("button"));
    await user.click(screen.getByAltText("foto 3").closest("button"));

    expect(screen.getByAltText("foto 1").closest("button")).not.toHaveClass("border-skin-accent");
    expect(screen.getByAltText("foto 3").closest("button")).toHaveClass("border-skin-accent");
    const docImgs = container.querySelectorAll('img[alt^="sampel final"]');
    expect(docImgs).toHaveLength(2);
  });
});

describe("WorkOrderModal — Cetak A4 langsung (permintaan Denny 2026-10-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toPng.mockResolvedValue("data:image/png;base64,AAA");
    mockPrintImageA4.mockResolvedValue(undefined);
  });

  it("tombol Cetak A4 nonaktif sebelum size dipilih", () => {
    render(<WorkOrderModal sampel={approvedSampel} onClose={vi.fn()} />);
    expect(screen.getByText("Cetak A4")).toBeDisabled();
  });

  it("klik Cetak A4: capture PNG lalu cetak A4 dan catat audit log", async () => {
    const user = userEvent.setup();
    render(<WorkOrderModal sampel={approvedSampel} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Midi" }));
    await user.click(screen.getByText("Cetak A4"));
    await waitFor(() => expect(mockPrintImageA4).toHaveBeenCalledWith(["data:image/png;base64,AAA", "data:image/png;base64,AAA"]));
    expect(mockLogWorkOrder).toHaveBeenCalled();
  });

  it("gagal cetak -> toast error, tombol aktif lagi", async () => {
    mockPrintImageA4.mockRejectedValue(new Error("printer off"));
    const user = userEvent.setup();
    render(<WorkOrderModal sampel={approvedSampel} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Midi" }));
    await user.click(screen.getByText("Cetak A4"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("printer off")));
    expect(screen.getByText("Cetak A4")).not.toBeDisabled();
  });

  describe("WO Sampel (planning, Denny 2026-10-15)", () => {
    const planning = {
      id: "p1",
      nomor: "SPL-20261015-PLN",
      nama: "Zurich",
      tanggal: "2026-10-13",
      status: "planning",
      foto: [],
      model_foto: ["https://cloud/model1.jpg"],
      bahan_items: [{ nama_bahan: "Zurich Print", foto: "https://cloud/bahan1.jpg" }],
    };

    it("judul Work Order Sampel, tanpa 'Disetujui', ada Status & referensi model/bahan", () => {
      setup(planning);
      expect(screen.getAllByText(/Work Order Sampel/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Work Order — Sampel")).toBeInTheDocument();
      expect(screen.queryByText("Work Order — Potong")).toBeNull();
      expect(screen.queryByText("Disetujui")).toBeNull();
      expect(screen.getByText("Sampel Baru")).toBeInTheDocument();
      expect(screen.getByTestId("ref-picker")).toBeInTheDocument();
    });

    it("sampel approved tetap Work Order — Potong", () => {
      setup();
      expect(screen.getByText("Work Order — Potong")).toBeInTheDocument();
    });
  });
});

describe("WorkOrderModal — Catatan Potong per Bagian (Denny 2026-11-01: tukang potong masih sering salah)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menampilkan ZonaChecklist dengan 7 baris zona", () => {
    setup();
    expect(screen.getByText("Catatan Potong per Bagian")).toBeInTheDocument();
    for (const label of ["Dada", "Bawah", "Lengan", "Tangan Depan", "Samping", "Belakang", "Pundak"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("ZonaPrintBlock TIDAK dicetak kalau semua zona kosong (default, WO lama tidak terpengaruh)", () => {
    setup();
    for (const key of ["dada", "bawah", "lengan", "tangan_depan", "samping", "belakang", "pundak"]) {
      expect(screen.queryByTestId(`wo-zona-print-${key}`)).not.toBeInTheDocument();
    }
  });

  it("isi catatan salah satu zona -> muncul di halaman cetak, zona lain tetap 'Sama seperti foto patokan'", async () => {
    const user = userEvent.setup();
    setup();
    const row = screen.getByTestId("zona-row-lengan");
    await user.type(row.querySelector("textarea"), "manset kancing 2, polos");

    expect(screen.getByTestId("wo-zona-print-lengan")).toHaveTextContent("manset kancing 2, polos");
    expect(screen.getByTestId("wo-zona-print-dada")).toHaveTextContent("Sama seperti foto patokan");
  });

  it("prefill dari sampel.wo_catatan_zona (WO yang sudah pernah dibuat)", () => {
    setup({
      wo_catatan_zona: {
        dada: { catatan: "motif, bukan polos", crop: null },
      },
    });
    const row = screen.getByTestId("zona-row-dada");
    expect(row.querySelector("textarea")).toHaveValue("motif, bukan polos");
    expect(screen.getByTestId("wo-zona-print-dada")).toHaveTextContent("motif, bukan polos");
  });

  it("pilih capsule Motif/Polos pada suatu zona -> capsule berwarna muncul di halaman cetak", async () => {
    const user = userEvent.setup();
    setup();
    const capsule = screen.getByTestId("zona-motif-dada");
    await user.click(capsule.querySelectorAll("button")[0]);

    const printed = screen.getByTestId("wo-zona-motif-dada");
    expect(printed).toHaveTextContent("MOTIF");
    expect(printed).toHaveStyle({ background: "#d97706", color: "#fff" });
    expect(screen.queryByTestId("wo-zona-motif-bawah")).not.toBeInTheDocument();
  });

  it("pilih Polos -> capsule POLOS warna berbeda dari MOTIF", async () => {
    const user = userEvent.setup();
    setup();
    const capsule = screen.getByTestId("zona-motif-pundak");
    await user.click(capsule.querySelectorAll("button")[1]);

    const printed = screen.getByTestId("wo-zona-motif-pundak");
    expect(printed).toHaveTextContent("POLOS");
    expect(printed).toHaveStyle({ background: "#475569", color: "#fff" });
  });

  it("Unduh PNG meneruskan zonaCatatan terisi ke logWorkOrder", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    setup();
    const row = screen.getByTestId("zona-row-bawah");
    await user.type(row.querySelector("textarea"), "polos");
    await user.click(screen.getByRole("button", { name: "Gamis" }));
    await user.click(screen.getByText("Unduh PNG"));

    await waitFor(() =>
      expect(mockLogWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          zonaCatatan: expect.objectContaining({ bawah: { catatan: "polos", crop: null, motif: null } }),
        }),
      ),
    );
    clickSpy.mockRestore();
  });
});

describe("WorkOrderModal — draft tersimpan otomatis (Denny 2026-11-01: 'kalau di close dan buka ulang saat ini harus buat dari awal lagi')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ubah size & catatan zona tersimpan sbg draft; tutup (unmount) lalu buka lagi -> state tetap, tidak reset", async () => {
    const user = userEvent.setup();
    const { unmount } = setup();
    await user.click(screen.getByRole("button", { name: "Gamis" }));
    const row = screen.getByTestId("zona-row-dada");
    await user.type(row.querySelector("textarea"), "motif besar");
    unmount();

    setup();
    expect(screen.getByRole("button", { name: "Gamis" })).toHaveClass("border-skin-accent");
    expect(screen.getByTestId("zona-row-dada").querySelector("textarea")).toHaveValue("motif besar");
  });

  it("setelah Unduh PNG berhasil, draft dihapus -> buka lagi balik ke default (size kosong lagi)", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    const { unmount } = setup();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    await user.click(screen.getByText("Unduh PNG"));
    await waitFor(() => expect(mockLogWorkOrder).toHaveBeenCalled());
    unmount();

    setup();
    expect(screen.getByRole("button", { name: "Midi" })).not.toHaveClass("border-skin-accent");
    clickSpy.mockRestore();
  });

  it("draft antar sampel berbeda tidak saling tercampur", async () => {
    const user = userEvent.setup();
    const { unmount } = setup();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    unmount();

    setup({ id: "s9" });
    expect(screen.getByRole("button", { name: "Midi" })).not.toHaveClass("border-skin-accent");
  });
});

describe("WorkOrderModal — foto di halaman 2 (Denny 2026-10-16)", () => {
  it("halaman 1 tanpa foto + ada halaman 2 berisi foto", () => {
    setup();
    expect(screen.getByTestId("wo-foto-p2")).toBeInTheDocument();
    expect(screen.getByTestId("wo-photo-page").querySelectorAll("img").length).toBe(2);
    expect(screen.queryByText("Cetak Foto Saja (A4)")).not.toBeInTheDocument();
  });
  it("tanpa foto: satu halaman seperti biasa", () => {
    setup({ foto: [] });
    expect(screen.queryByTestId("wo-foto-p2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wo-photo-page")).not.toBeInTheDocument();
  });
});
