import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SuratJalan from "./SuratJalan";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));
vi.mock("@deera/shared/lib/storeInfo", () => ({
  STORE_INFO: { wa: "0812-TEST-WA" },
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: {
    gudang: "Gudang",
    cideng: "Cideng",
    tegalgubug: "Tegalgubug",
  },
}));

// stok_warna/transfer.items tidak punya created_at — urutan kode di surat
// jalan mengikuti urutan produk resmi dari useProducts() (permintaan Denny
// 2026-08). Default kosong -> kode fallback ke tiebreak alfabet (perilaku
// lama tetap valid utk kode yang tidak ada di daftar produk mock).
let productsState = [];
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: () => ({ products: productsState, loading: false }),
}));

import { toPng } from "html-to-image";

const baseTransfer = {
  transfer_no: "SJ-20240115-XYZ",
  from_location: "gudang",
  to_location: "cideng",
  status: "pending",
  created_at: "2024-01-15T10:00:00.000Z",
  created_by: "admin@deera.id",
  created_by_name: "Admin Toko",
  items: [
    { kode: "D-01-OSK", size: "Midi",       warna: "HITAM", qty: 3 },
    { kode: "D-01-OSK", size: "Gamis",      warna: "_",     qty: 2 },
    { kode: "D-02-SFN", size: "Midi Jumbo", warna: "",      qty: 1 },
  ],
  notes: null,
  approved_by: null,
  approved_at: null,
};

function setup(overrides = {}) {
  const onClose = vi.fn();
  const transfer = { ...baseTransfer, ...overrides };
  const utils = render(<SuratJalan transfer={transfer} onClose={onClose} />);
  return { onClose, transfer, ...utils };
}

describe("SuratJalan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsState = [];
    toPng.mockResolvedValue("data:image/png;base64,TESTDATA");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore navigator.share to undefined after each test
    try {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
    } catch (_) {
      // ignore if not configurable
    }
  });

  // ── Null guard ────────────────────────────────────────────────────────────
  it("returns null when transfer is null", () => {
    const { container } = render(<SuratJalan transfer={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  // ── Modal header ──────────────────────────────────────────────────────────
  it("shows transfer_no in modal header", () => {
    setup();
    expect(screen.getAllByText("SJ-20240115-XYZ").length).toBeGreaterThan(0);
  });

  // ── Kop Surat ─────────────────────────────────────────────────────────────
  it("renders DEERA brand in kop surat", () => {
    setup();
    expect(screen.getByText("DEERA")).toBeInTheDocument();
  });

  it("renders WA from STORE_INFO", () => {
    setup();
    expect(screen.getByText(/0812-TEST-WA/)).toBeInTheDocument();
  });

  it("renders created_by_name in document", () => {
    // created_by_name appears in the info-transfer table AND tanda tangan
    setup();
    expect(screen.getAllByText("Admin Toko").length).toBeGreaterThan(0);
  });

  // ── Lokasi ────────────────────────────────────────────────────────────────
  it("renders from location label (Gudang)", () => {
    setup();
    expect(screen.getAllByText("Gudang").length).toBeGreaterThan(0);
  });

  it("renders to location label (Cideng)", () => {
    setup();
    expect(screen.getAllByText("Cideng").length).toBeGreaterThan(0);
  });

  // ── Status banner ─────────────────────────────────────────────────────────
  it("shows MENUNGGU APPROVAL for pending status", () => {
    setup({ status: "pending" });
    expect(screen.getByText("MENUNGGU APPROVAL")).toBeInTheDocument();
  });

  it("shows DISETUJUI for approved status", () => {
    setup({ status: "approved" });
    expect(screen.getByText("DISETUJUI")).toBeInTheDocument();
  });

  it("shows DITOLAK for rejected status", () => {
    setup({ status: "rejected" });
    expect(screen.getByText("DITOLAK")).toBeInTheDocument();
  });

  // ── Item table ────────────────────────────────────────────────────────────
  it("shows kode header rows for each group", () => {
    setup();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
  });

  it("shows size text for each item row", () => {
    setup();
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("Gamis")).toBeInTheDocument();
    expect(screen.getByText("Midi Jumbo")).toBeInTheDocument();
  });

  it("shows warna text for non-underscore, non-empty warna", () => {
    setup();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
  });

  it("shows '—' for warna='_' and for empty warna", () => {
    // D-01-OSK Gamis has warna="_", D-02-SFN has warna=""
    setup();
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows kode subtotal per group", () => {
    // D-01-OSK: 3+2=5 pcs, D-02-SFN: 1 pcs
    setup();
    expect(screen.getByText("5 pcs")).toBeInTheDocument();
    expect(screen.getByText("1 pcs")).toBeInTheDocument();
  });

  it("mengurutkan grup kode sesuai urutan produk resmi (dari useProducts), bukan alfabet (permintaan Denny 2026-08)", () => {
    // D-02-SFN dibuat lebih baru dari D-01-OSK -> harus tampil duluan di
    // tabel, walau "D-01-OSK" < "D-02-SFN" secara alfabet string.
    productsState = [
      { kode: "D-02-SFN", nama: "Sifon X", created_at: "2026-03-01" },
      { kode: "D-01-OSK", nama: "Osaka Y", created_at: "2026-01-01" },
    ];
    setup();
    const kodeHeaders = screen.getAllByText(/^D-(01-OSK|02-SFN)$/);
    expect(kodeHeaders.map((el) => el.textContent)).toEqual(["D-02-SFN", "D-01-OSK"]);
  });

  it("shows grand total qty in TOTAL footer row", () => {
    // 3+2+1 = 6
    setup();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  // ── Notes ─────────────────────────────────────────────────────────────────
  it("shows notes content and Keterangan label when notes present", () => {
    setup({ notes: "Kiriman pagi hari ini" });
    expect(screen.getByText("Kiriman pagi hari ini")).toBeInTheDocument();
    expect(screen.getByText("Keterangan")).toBeInTheDocument();
  });

  it("does not render Keterangan section when notes is null", () => {
    setup({ notes: null });
    expect(screen.queryByText("Keterangan")).not.toBeInTheDocument();
  });

  // ── Approved_by section ───────────────────────────────────────────────────
  it("shows '✓ Disetujui' section when status=approved and approved_by is set", () => {
    setup({
      status: "approved",
      approved_by: "kasir@deera.id",
      approved_at: "2024-01-16T08:30:00.000Z",
    });
    // approved_by is shown as replace("@deera.id","") = "kasir"
    // "✓ Disetujui" is in the approval section (not the status banner which says "DISETUJUI")
    expect(screen.getByText("✓ Disetujui")).toBeInTheDocument();
  });

  it("does not show '✓ Disetujui' section for pending status", () => {
    setup({ status: "pending", approved_by: null });
    expect(screen.queryByText("✓ Disetujui")).not.toBeInTheDocument();
  });

  // ── Close actions ─────────────────────────────────────────────────────────
  it("calls onClose when ✕ button is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Tutup button is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop overlay is clicked", async () => {
    const user = userEvent.setup();
    const { onClose, container } = setup();
    const backdrop = container.querySelector(".absolute.inset-0");
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Download ──────────────────────────────────────────────────────────────
  it("Unduh calls toPng and triggers anchor .click()", async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Unduh"));
    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
  });

  it("Unduh sets correct download filename on anchor", async () => {
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
    await user.click(screen.getByText("Unduh"));
    await waitFor(() => expect(capturedAnchor).not.toBeNull());
    await waitFor(() =>
      expect(capturedAnchor.download).toBe("surat-jalan-SJ-20240115-XYZ.png")
    );
  });

  // ── Share ─────────────────────────────────────────────────────────────────
  it("Bagikan calls navigator.share when available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: shareMock });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Bagikan"));
    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
  });

  it("Bagikan falls back to anchor download when navigator.share is undefined", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Bagikan"));
    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
  });

  // ── Busy state ────────────────────────────────────────────────────────────
  it("shows '...' on action buttons while operation in progress", async () => {

    toPng.mockImplementation(() => new Promise(() => {})); // never resolves

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Unduh"));

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.some((b) => b.textContent.includes("..."))).toBe(true);
    });
  });
});
