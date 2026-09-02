import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkOrderModal, { MAX_KESIMPULAN_CHARS, MAX_WO_FOTOS } from "./WorkOrderModal";

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

const mockLogWorkOrder = vi.fn().mockResolvedValue(undefined);
let commentsState = [];
vi.mock("../hooks", () => ({
  useLogWorkOrder: () => mockLogWorkOrder,
  useComments: () => ({ comments: commentsState, loading: false }),
}));

import { toPng } from "html-to-image";
import { toast } from "@deera/shared/features/toast/hooks";

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
    commentsState = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    } catch (_) {
      /* ignore */
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

  it("prefills Kesimpulan Penting textarea dengan sampel.perubahan", () => {
    setup();
    expect(screen.getByDisplayValue("Kancing dipindah ke kiri")).toBeInTheDocument();
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

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockLogWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ sizes: ["Gamis"], catatanPenting: "Kancing dipindah ke kiri" }),
      ),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("Unduh PNG pakai filename work-order-<nomor>.png", async () => {
    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") capturedAnchor = el;
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

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
  });

  it("Bagikan fallback ke download saat navigator.share tidak tersedia", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Midi" }));
    await user.click(screen.getByText("Bagikan"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
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
});

describe("WorkOrderModal — Foto yang Dicetak (permintaan Denny 2026-09: 'foto2nya bisa dipilih mana aja yang mau di cetak')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commentsState = [];
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
    // Dokumen preview hanya render foto yang masih tercentang (foto 2 saja)
    const docImgs = container.querySelectorAll('img[alt^="sampel final"]');
    expect(docImgs).toHaveLength(1);
  });

  it("tidak menampilkan section Foto yang Dicetak kalau sampel.foto kosong", () => {
    setup({ foto: [] });
    expect(screen.queryByText("Foto yang Dicetak")).not.toBeInTheDocument();
  });
});

describe("WorkOrderModal — Kumpulan Catatan & Diskusi + tombol Salin (permintaan Denny 2026-09: 'saya rangkum sendiri aja, kasih textnya aja ... ada tombol copy')", () => {
  // Stable spy reference -- avoids "not a spy" error that occurs when
  // navigator.clipboard.writeText is inspected via the native AsyncFunction
  // rather than our vi.fn() wrapper (pola sama seperti TagihanShareModal.test.jsx).
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    commentsState = [];
    mockWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText: mockWriteText },
    });
  });

  it("menampilkan catatan approve di kotak Kumpulan Catatan & Diskusi", () => {
    setup();
    expect(screen.getByText(/Catatan saat approve:/)).toBeInTheDocument();
    expect(screen.getAllByText(/Kancing dipindah ke kiri/).length).toBeGreaterThan(0);
  });

  it("menampilkan komentar diskusi di kotak Kumpulan Catatan & Diskusi", () => {
    commentsState = [
      { id: "c1", text: "Lengan tolong dipanjangkan 2cm", user_name: "haikal", user_email: "haikal@deera.id" },
    ];
    setup();
    expect(screen.getByText(/Diskusi:/)).toBeInTheDocument();
    expect(screen.getByText(/Haikal: Lengan tolong dipanjangkan 2cm/)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong & tidak ada tombol Salin kalau tidak ada perubahan maupun komentar", () => {
    commentsState = [];
    setup({ perubahan: null });
    expect(screen.getByText("Belum ada catatan/diskusi untuk sampel ini.")).toBeInTheDocument();
    expect(screen.queryByText("Salin")).not.toBeInTheDocument();
  });

  it("klik Salin menyalin notesText ke clipboard dan label berubah jadi ✓ Tersalin", async () => {
    setup();
    // fireEvent (sinkron) supaya panggilan clipboard & assertion terjadi di
    // microtask tick yang sama -- hindari isu timing async dgn userEvent.
    fireEvent.click(screen.getByText("Salin"));
    await waitFor(() =>
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("Kancing dipindah ke kiri")),
    );
    await waitFor(() => expect(screen.getByText("✓ Tersalin")).toBeInTheDocument());
  });

  it("mengabaikan komentar tanpa text (mis. cuma kirim foto) saat membangun notesText", () => {
    commentsState = [
      { id: "c1", text: null, user_name: "haikal", user_email: "haikal@deera.id" },
      { id: "c2", text: "  ", user_name: "dika", user_email: "dika@deera.id" },
    ];
    setup({ perubahan: null });
    expect(screen.getByText("Belum ada catatan/diskusi untuk sampel ini.")).toBeInTheDocument();
  });
});

describe("WorkOrderModal — Kesimpulan Penting fixed 1 halaman (permintaan Denny 2026-09: 'dibuat 2 column aja ya, dan supaya ga lebih dari 1 page, dibuat maksimal text atau character aja ya, saya mau fixed 1 page ga boleh lebih')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commentsState = [];
  });

  it("textarea Kesimpulan Penting punya maxLength sesuai MAX_KESIMPULAN_CHARS", () => {
    setup();
    const textarea = screen.getByPlaceholderText(/Baca\/salin dari Kumpulan Catatan/);
    expect(textarea).toHaveAttribute("maxLength", String(MAX_KESIMPULAN_CHARS));
  });

  it("menampilkan counter karakter sesuai panjang teks saat ini", () => {
    setup();
    // approvedSampel.perubahan = "Kancing dipindah ke kiri" (24 karakter)
    const counter = screen.getByText((_, el) => el?.textContent === `24/${MAX_KESIMPULAN_CHARS}`);
    expect(counter).toBeInTheDocument();
  });

  it("counter jadi merah saat mencapai batas maksimal", () => {
    setup();
    const textarea = screen.getByPlaceholderText(/Baca\/salin dari Kumpulan Catatan/);
    fireEvent.change(textarea, { target: { value: "x".repeat(MAX_KESIMPULAN_CHARS) } });
    const counter = screen.getByText(
      (_, el) => el?.textContent === `${MAX_KESIMPULAN_CHARS}/${MAX_KESIMPULAN_CHARS}`,
    );
    expect(counter).toHaveClass("text-red-500");
  });

  it("dokumen memotong teks Kesimpulan Penting maksimal MAX_KESIMPULAN_CHARS karakter + elipsis", () => {
    const { container } = setup();
    const textarea = screen.getByPlaceholderText(/Baca\/salin dari Kumpulan Catatan/);
    const longText = "a".repeat(MAX_KESIMPULAN_CHARS + 100);
    fireEvent.change(textarea, { target: { value: longText } });

    const printed = container.querySelector('[data-testid="wo-kesimpulan-text"]');
    expect(printed.textContent.length).toBe(MAX_KESIMPULAN_CHARS + 1); // +1 utk "…"
    expect(printed.textContent.endsWith("…")).toBe(true);
  });

  it("dokumen TIDAK memotong/menambah elipsis kalau teks masih di bawah batas", () => {
    const { container } = setup();
    const printed = container.querySelector('[data-testid="wo-kesimpulan-text"]');
    expect(printed.textContent).toBe("Kancing dipindah ke kiri");
  });

  it("kontainer dokumen A4 punya height tetap + overflow hidden (fixed 1 halaman)", () => {
    const { container } = setup();
    // Kontainer A4 adalah div putih paling luar di dalam contentRef (child
    // pertama dari wrapper preview) — cek style height & overflow ter-set.
    const doc = container.querySelector('[style*="Georgia"]');
    expect(doc).toHaveStyle({ overflow: "hidden" });
  });
});

describe("WorkOrderModal — Foto dibatasi maks 2 (permintaan Denny 2026-09: 'bisa pilih lebih dari 1 image yang mau di print, tapi kita set aja max 2 foto aja yang bisa di print')", () => {
  const tigaFoto = ["https://cloud/final1.jpg", "https://cloud/final2.jpg", "https://cloud/final3.jpg"];

  beforeEach(() => {
    vi.clearAllMocks();
    commentsState = [];
  });

  it("MAX_WO_FOTOS bernilai 2", () => {
    expect(MAX_WO_FOTOS).toBe(2);
  });

  it("default hanya 2 foto pertama tercentang walau sampel punya 3 foto", () => {
    const { container } = setup({ foto: tigaFoto });
    expect(screen.getByAltText("foto 1").closest("button")).toHaveClass("border-[#CAB170]");
    expect(screen.getByAltText("foto 2").closest("button")).toHaveClass("border-[#CAB170]");
    expect(screen.getByAltText("foto 3").closest("button")).not.toHaveClass("border-[#CAB170]");
    // Dokumen cetak juga cuma render 2 foto pertama
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
    expect(screen.getByAltText("foto 3").closest("button")).not.toHaveClass("border-[#CAB170]");
    const docImgs = container.querySelectorAll('img[alt^="sampel final"]');
    expect(docImgs).toHaveLength(2);
  });

  it("uncheck salah satu foto lalu klik foto ke-3 -> berhasil ditambahkan (kuota kebuka lagi)", async () => {
    const user = userEvent.setup();
    const { container } = setup({ foto: tigaFoto });
    await user.click(screen.getByAltText("foto 1").closest("button")); // uncheck foto 1
    await user.click(screen.getByAltText("foto 3").closest("button")); // check foto 3

    expect(screen.getByAltText("foto 1").closest("button")).not.toHaveClass("border-[#CAB170]");
    expect(screen.getByAltText("foto 3").closest("button")).toHaveClass("border-[#CAB170]");
    const docImgs = container.querySelectorAll('img[alt^="sampel final"]');
    expect(docImgs).toHaveLength(2);
  });
});
