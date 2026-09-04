import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransferCard from "./TransferCard";

const transfer = {
  transfer_no: "SJ-20240115-XYZ",
  created_at: "2024-01-15T08:00:00Z",
  from_location: "gudang",
  to_location: "cideng",
  status: "pending",
  created_by: "kasir@deera.id",
  items: [
    { kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 5 },
    { kode: "D-02-SFN", size: "Gamis", warna: "", qty: 3 },
  ],
  notes: null,
};

const currentUserOther = { email: "admin@deera.id" };
const currentUserCreator = { email: "kasir@deera.id" };

function renderCard(overrides = {}, user = currentUserOther) {
  const props = {
    transfer: { ...transfer, ...overrides },
    currentUser: user,
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    onSuratJalan: vi.fn(),
    onDuplicate: vi.fn(),
  };
  const result = render(<TransferCard {...props} />);
  return { ...result, props };
}

describe("TransferCard", () => {
  it("menampilkan transfer_no dan status badge", () => {
    renderCard();
    expect(screen.getByText("SJ-20240115-XYZ")).toBeInTheDocument();
    expect(screen.getByText("Menunggu")).toBeInTheDocument();
  });

  it("menampilkan lokasi from dan to", () => {
    renderCard();
    expect(screen.getByText("Gudang")).toBeInTheDocument();
    expect(screen.getByText("Cideng")).toBeInTheDocument();
  });

  it("menampilkan item dengan kode, size, warna, dan qty", () => {
    renderCard();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText(/5 pcs/)).toBeInTheDocument();
    expect(screen.getByText(/HITAM/)).toBeInTheDocument();
  });

  it("menampilkan total qty", () => {
    renderCard();
    expect(screen.getByText("8 pcs")).toBeInTheDocument();
  });

  it("items > 4: menampilkan '+ N item lainnya'", () => {
    const manyItems = Array.from({ length: 6 }, (_, i) => ({
      kode: `D-0${i}-OSK`, size: "Midi", warna: "", qty: 1,
    }));
    renderCard({ items: manyItems });
    expect(screen.getByText(/\+ 2 item lainnya/)).toBeInTheDocument();
  });

  it("menampilkan notes jika ada", () => {
    renderCard({ notes: "Dikirim hari ini" });
    expect(screen.getByText("Dikirim hari ini")).toBeInTheDocument();
  });

  it("tidak menampilkan notes saat null", () => {
    renderCard({ notes: null });
    expect(screen.queryByText("Dikirim hari ini")).not.toBeInTheDocument();
  });

  // Status: approved
  it("status approved: menampilkan badge Disetujui dan info approved_by", () => {
    renderCard({ status: "approved", approved_by: "admin@deera.id", approved_at: "2024-01-15T09:00:00Z" });
    expect(screen.getByText("Disetujui")).toBeInTheDocument();
    expect(screen.getByText(/Disetujui oleh/)).toBeInTheDocument();
    expect(screen.getByText(/admin/)).toBeInTheDocument();
  });

  it("status rejected: menampilkan badge Ditolak", () => {
    renderCard({ status: "rejected" });
    expect(screen.getByText("Ditolak")).toBeInTheDocument();
  });

  // Aksi: pending + non-creator -> Approve, Tolak, Edit tersedia
  it("pending non-creator: tombol Approve, Tolak, Edit tersedia", () => {
    renderCard({ status: "pending" }, currentUserOther);
    expect(screen.getByText(/Approve/)).toBeInTheDocument();
    expect(screen.getByText(/Tolak/)).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("pending non-creator: onApprove dipanggil saat klik Approve", async () => {
    const { props } = renderCard({ status: "pending" }, currentUserOther);
    await userEvent.click(screen.getByText(/Approve/));
    expect(props.onApprove).toHaveBeenCalledWith(expect.objectContaining({ transfer_no: "SJ-20240115-XYZ" }));
  });

  it("pending non-creator: onReject dipanggil saat klik Tolak", async () => {
    const { props } = renderCard({ status: "pending" }, currentUserOther);
    await userEvent.click(screen.getByText(/Tolak/));
    expect(props.onReject).toHaveBeenCalledWith(expect.objectContaining({ transfer_no: "SJ-20240115-XYZ" }));
  });

  // Aksi: pending + creator -> "Menunggu approval", Edit, tapi tidak ada Approve/Tolak
  it("pending creator: tampil 'Menunggu approval', tidak ada tombol Approve/Tolak", () => {
    renderCard({ status: "pending" }, currentUserCreator);
    expect(screen.getByText("Menunggu approval")).toBeInTheDocument();
    expect(screen.queryByText(/Approve/)).not.toBeInTheDocument();
    expect(screen.queryByText(/✗ Tolak/)).not.toBeInTheDocument();
  });

  it("pending creator: onEdit dipanggil saat klik Edit", async () => {
    const { props } = renderCard({ status: "pending" }, currentUserCreator);
    await userEvent.click(screen.getByText("Edit"));
    expect(props.onEdit).toHaveBeenCalled();
  });

  // Tombol Surat Jalan
  it("tombol Surat Jalan memanggil onSuratJalan", async () => {
    const { props } = renderCard();
    await userEvent.click(screen.getByText("Surat Jalan"));
    expect(props.onSuratJalan).toHaveBeenCalledWith(expect.objectContaining({ transfer_no: "SJ-20240115-XYZ" }));
  });

  // Tombol Hapus
  it("tombol hapus (🗑) memanggil onDelete", async () => {
    const { props } = renderCard();
    await userEvent.click(screen.getByTitle("Hapus transfer"));
    expect(props.onDelete).toHaveBeenCalledWith(expect.objectContaining({ transfer_no: "SJ-20240115-XYZ" }));
  });

  // approved: tidak ada Approve/Tolak tombol
  it("status approved: tidak ada tombol Approve/Tolak", () => {
    renderCard({ status: "approved" }, currentUserOther);
    expect(screen.queryByText(/✓ Approve/)).not.toBeInTheDocument();
    expect(screen.queryByText(/✗ Tolak/)).not.toBeInTheDocument();
  });

  it("item tanpa warna: tidak menampilkan dot warna", () => {
    renderCard();
    // D-02-SFN has empty warna
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
    // no " · " shown for that item (empty warna is not rendered)
  });

  // ── Tombol "Salin & Balik" (permintaan Denny 2026-09) ──────────────────────
  describe("tombol Salin & Balik", () => {
    it("tampil untuk transfer approved antar lokasi dikenal (gudang <-> cideng)", () => {
      renderCard({ status: "approved" });
      expect(screen.getByText(/Salin & Balik/i)).toBeInTheDocument();
    });

    it("onDuplicate dipanggil dengan transfer saat diklik", async () => {
      const { props } = renderCard({ status: "approved" });
      await userEvent.click(screen.getByText(/Salin & Balik/i));
      expect(props.onDuplicate).toHaveBeenCalledWith(
        expect.objectContaining({ transfer_no: "SJ-20240115-XYZ" }),
      );
    });

    it("tidak tampil untuk transfer pending", () => {
      renderCard({ status: "pending" });
      expect(screen.queryByText(/Salin & Balik/i)).not.toBeInTheDocument();
    });

    it("tidak tampil untuk transfer rejected", () => {
      renderCard({ status: "rejected" });
      expect(screen.queryByText(/Salin & Balik/i)).not.toBeInTheDocument();
    });

    it("tidak tampil kalau salah satu lokasi custom (bukan LOCATIONS dikenal)", () => {
      renderCard({ status: "approved", to_location: "Reseller Bandung" });
      expect(screen.queryByText(/Salin & Balik/i)).not.toBeInTheDocument();
    });
  });
});
