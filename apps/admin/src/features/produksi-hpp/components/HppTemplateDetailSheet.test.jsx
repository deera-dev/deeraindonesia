import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HppTemplateDetailSheet from "./HppTemplateDetailSheet";

const baseTpl = {
  id: "t1",
  kode_produk: "D-07-OSK",
  total_hpp: 85000,
  upah_jahit: 35000,
  bahan_items: [
    { nama_bahan: "Wolfis", jenis: "motif", qty_per_baju: 2, harga_satuan: 15000, satuan: "yard", subtotal: 30000, untuk_n_baju: 1, warna_qtys: [] },
  ],
  catatan: "motif custom",
};

function setup(overrides = {}) {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onShare = vi.fn();
  render(
    <HppTemplateDetailSheet
      tpl={baseTpl}
      produk={{ nama: "Gamis Oskelin" }}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      onShare={onShare}
      {...overrides}
    />,
  );
  return { onClose, onEdit, onDelete, onShare };
}

describe("HppTemplateDetailSheet", () => {
  it("renders kode + nama produk in title", () => {
    setup();
    expect(screen.getByText(/D-07-OSK — Gamis Oskelin/)).toBeInTheDocument();
  });

  it("renders total HPP", () => {
    setup();
    expect(screen.getByText(/85\.000/)).toBeInTheDocument();
  });

  it("renders bahan breakdown", () => {
    setup();
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("renders biaya lain (upah jahit)", () => {
    setup();
    expect(screen.getByText("Upah Jahit")).toBeInTheDocument();
  });

  it("renders catatan", () => {
    setup();
    expect(screen.getByText("motif custom")).toBeInTheDocument();
  });

  it("renders primary CTA Bagikan ke WhatsApp full-width", () => {
    setup();
    expect(screen.getByText("Bagikan ke WhatsApp")).toBeInTheDocument();
  });

  it("does not render CTA when onShare not provided", () => {
    setup({ onShare: undefined });
    expect(screen.queryByText("Bagikan ke WhatsApp")).not.toBeInTheDocument();
  });

  it("calls onShare with tpl when CTA clicked", async () => {
    const user = userEvent.setup();
    const { onShare } = setup();
    await user.click(screen.getByText("Bagikan ke WhatsApp"));
    expect(onShare).toHaveBeenCalledWith(baseTpl);
  });

  it("calls onClose when tutup clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByLabelText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onEdit from overflow menu", async () => {
    const user = userEvent.setup();
    const { onEdit } = setup();
    await user.click(screen.getByLabelText(`Menu ${baseTpl.kode_produk}`));
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(baseTpl);
  });

  it("calls onDelete from overflow menu", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup();
    await user.click(screen.getByLabelText(`Menu ${baseTpl.kode_produk}`));
    await user.click(screen.getByText("Hapus"));
    expect(onDelete).toHaveBeenCalledWith(baseTpl);
  });

  it("shows gelaran note when untuk_n_baju > 1", () => {
    const tplGelaran = { ...baseTpl, bahan_items: [{ ...baseTpl.bahan_items[0], untuk_n_baju: 3 }] };
    setup({ tpl: tplGelaran });
    expect(screen.getByText(/Gelaran: 3 produk per potong/)).toBeInTheDocument();
  });

  // ── Regresi bug "Poin tidak masuk Total HPP" ──────────────────────────────
  // Sebelum perbaikan, section "Biaya Lain" di sheet ini direkonstruksi
  // manual dari upah_jahit/bordir/biaya_studio/kancing SAJA — Poin Denny dan
  // Poin Haikal (serta Plastik/Hangtag/dll) tidak pernah muncul di layar ini
  // walau sudah ikut dijumlahkan ke tpl.total_hpp. Lihat
  // LAPORAN_INVESTIGASI_HPP_POIN.md.
  describe("breakdown Biaya Lain menyertakan Poin (regresi bug)", () => {
    it("menampilkan baris Poin Denny dan Poin Haikal meski tpl tidak punya config_snapshot (fallback default)", () => {
      setup();
      expect(screen.getByText("Poin Denny")).toBeInTheDocument();
      expect(screen.getByText("Poin Haikal")).toBeInTheDocument();
    });

    it("menampilkan nilai Poin dari config_snapshot yang dibekukan saat template disimpan, bukan config terkini", () => {
      const tplWithSnapshot = {
        ...baseTpl,
        config_snapshot: { poin_denny: 12000, poin_haikal: 8000, plastik: 1800 },
      };
      setup({ tpl: tplWithSnapshot });
      expect(screen.getByText("Poin Denny")).toBeInTheDocument();
      expect(screen.getByText("Rp 12.000")).toBeInTheDocument();
      expect(screen.getByText("Poin Haikal")).toBeInTheDocument();
      expect(screen.getByText("Rp 8.000")).toBeInTheDocument();
    });

    it("menampilkan header seksi 'Biaya Lain' saat ada komponen biaya non-bahan", () => {
      setup();
      expect(screen.getByText("Biaya Lain")).toBeInTheDocument();
    });

    it("tidak menampilkan baris Poin dengan nilai 0 eksplisit (bukan fallback default)", () => {
      const tplZeroPoin = {
        ...baseTpl,
        config_snapshot: { poin_denny: 0, poin_haikal: 0, plastik: 0, hangtag: 0, tali_hangtag: 0, merk: 0, pin: 0, kain_keras: 0 },
      };
      setup({ tpl: tplZeroPoin });
      expect(screen.queryByText("Poin Denny")).not.toBeInTheDocument();
      expect(screen.queryByText("Poin Haikal")).not.toBeInTheDocument();
    });
  });
});
