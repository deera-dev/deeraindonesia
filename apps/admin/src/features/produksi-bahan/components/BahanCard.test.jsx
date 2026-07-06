import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: vi.fn((url) => url),
}));

import BahanCard from "./BahanCard";

const baseItem = {
  id: "1",
  nama_bahan: "Wolfis Premium",
  kode_bahan: "WLF-01",
  jumlah: 10,
  satuan: "yard",
  total_harga: 150000,
  harga_satuan: 15000,
  jatuh_tempo: null,
  status_bayar: "belum",
  catatan: null,
  foto_url: null,
  arah_pinjam: "masuk",
  nama_pemberi: "Toko ABC",
  nama_peminjam: null,
};

function setup(overrides = {}, isPinjam = false) {
  const item = { ...baseItem, ...overrides };
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onToggleLunas = vi.fn();
  const onSuratJalan = vi.fn();
  render(
    <BahanCard
      item={item}
      isPinjam={isPinjam}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleLunas={onToggleLunas}
      onSuratJalan={onSuratJalan}
    />
  );
  return { onEdit, onDelete, onToggleLunas, onSuratJalan, item };
}

describe("BahanCard", () => {
  it("shows nama_bahan", () => {
    setup();
    expect(screen.getByText("Wolfis Premium")).toBeInTheDocument();
  });

  it("shows kode_bahan", () => {
    setup();
    expect(screen.getByText(/WLF-01/)).toBeInTheDocument();
  });

  it("shows total_harga formatted as Rp", () => {
    setup();
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
  });

  it("shows arah pinjam info when isPinjam=true", () => {
    setup({ arah_pinjam: "masuk", nama_pemberi: "Toko ABC" }, true);
    expect(screen.getByText(/Toko ABC/)).toBeInTheDocument();
  });

  it("shows keluar direction for arah_pinjam=keluar", () => {
    setup({ arah_pinjam: "keluar", nama_peminjam: "Toko XYZ" }, true);
    expect(screen.getByText(/Toko XYZ/)).toBeInTheDocument();
  });

  it("shows catatan when present", () => {
    setup({ catatan: "Bahan spesial" });
    expect(screen.getByText("Bahan spesial")).toBeInTheDocument();
  });

  it("shows JT date when jatuh_tempo set", () => {
    setup({ jatuh_tempo: "2024-05-10" });
    expect(screen.getByText(/JT:/)).toBeInTheDocument();
  });

  it("opens dropdown menu when ⋮ clicked", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("⋮"));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Hapus")).toBeInTheDocument();
  });

  it("calls onEdit with item when Edit clicked", async () => {
    const user = userEvent.setup();
    const { onEdit, item } = setup();
    await user.click(screen.getByText("⋮"));
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(item);
  });

  it("calls onDelete with item when Hapus clicked", async () => {
    const user = userEvent.setup();
    const { onDelete, item } = setup();
    await user.click(screen.getByText("⋮"));
    await user.click(screen.getByText("Hapus"));
    expect(onDelete).toHaveBeenCalledWith(item);
  });

  it("shows 'Tandai Lunas' when status_bayar=belum", async () => {
    const user = userEvent.setup();
    setup({ status_bayar: "belum" });
    await user.click(screen.getByText("⋮"));
    expect(screen.getByText("Tandai Lunas")).toBeInTheDocument();
  });

  it("shows 'Tandai Belum Lunas' when status_bayar=lunas", async () => {
    const user = userEvent.setup();
    setup({ status_bayar: "lunas", jatuh_tempo: "2024-05-01" });
    await user.click(screen.getByText("⋮"));
    expect(screen.getByText("Tandai Belum Lunas")).toBeInTheDocument();
  });

  it("calls onToggleLunas when Tandai Lunas clicked", async () => {
    const user = userEvent.setup();
    const { onToggleLunas, item } = setup({ status_bayar: "belum" });
    await user.click(screen.getByText("⋮"));
    await user.click(screen.getByText("Tandai Lunas"));
    expect(onToggleLunas).toHaveBeenCalledWith(item);
  });

  it("shows Surat Jalan menu item when isPinjam=true", async () => {
    const user = userEvent.setup();
    setup({}, true);
    await user.click(screen.getByText("⋮"));
    expect(screen.getByText("Surat Jalan")).toBeInTheDocument();
  });

  it("calls onSuratJalan with item when Surat Jalan clicked", async () => {
    const user = userEvent.setup();
    const { onSuratJalan, item } = setup({}, true);
    await user.click(screen.getByText("⋮"));
    await user.click(screen.getByText("Surat Jalan"));
    expect(onSuratJalan).toHaveBeenCalledWith(item);
  });

  it("does NOT show Surat Jalan when isPinjam=false", async () => {
    const user = userEvent.setup();
    setup({}, false);
    await user.click(screen.getByText("⋮"));
    expect(screen.queryByText("Surat Jalan")).not.toBeInTheDocument();
  });

  it("closes dropdown when backdrop overlay clicked", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("⋮"));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    // Click the backdrop div (fixed inset-0 z-40)
    const backdrop = document.querySelector(".fixed.inset-0.z-40");
    await user.click(backdrop);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("shows foto img when foto_url present", () => {
    setup({ foto_url: "https://cloud.com/foto.jpg" });
    expect(screen.getByAltText("Wolfis Premium")).toBeInTheDocument();
  });

  it("opens foto in new tab when foto img clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "open").mockImplementation(() => {});
    setup({ foto_url: "https://cloud.com/foto.jpg" });
    await user.click(screen.getByAltText("Wolfis Premium"));
    expect(window.open).toHaveBeenCalledWith("https://cloud.com/foto.jpg", "_blank");
  });
});
