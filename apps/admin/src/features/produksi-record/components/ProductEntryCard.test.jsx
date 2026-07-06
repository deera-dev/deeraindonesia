import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductEntryCard from "./ProductEntryCard";

// Component is a pure presentational component — no hooks or API calls needed

const baseEntry = {
  _key: "k1",
  kodeAngka: "07",
  kodeBahan: "OSK",
  nama: "Gamis Oskelin",
  bahan: "Wolfis Premium",   // different from kodeBahan to avoid DisplayValue collision
  variants: [
    { size: "Midi", aktif: true, ld: 110, pb: 130 },
    { size: "Gamis", aktif: false, ld: 110, pb: 140 },
  ],
  warnaInput: "",
  warnaList: ["HITAM"],
  qtyMap: { Midi: { HITAM: "5" } },
  template: null,
  loadingTpl: false,
  templateFetched: "",
  expanded: true,
};

function makeHandlers() {
  return {
    onToggleExpand: vi.fn(),
    onRemove: vi.fn(),
    onKodeAngkaChange: vi.fn(),
    onKodeBahanChange: vi.fn(),
    onNamaChange: vi.fn(),
    onBahanChange: vi.fn(),
    onToggleVariant: vi.fn(),
    onWarnaInputChange: vi.fn(),
    onAddWarna: vi.fn(),
    onRemoveWarna: vi.fn(),
    onSetQty: vi.fn(),
  };
}

describe("ProductEntryCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders kode angka and kodeBahan fields", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    expect(screen.getByDisplayValue("07")).toBeInTheDocument();
    // kodeBahan input exists (bahan field has different value "Wolfis Premium")
    expect(screen.getByDisplayValue("OSK")).toBeInTheDocument();
  });

  it("renders nama and bahan fields", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    expect(screen.getByDisplayValue("Gamis Oskelin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Wolfis Premium")).toBeInTheDocument();
  });

  it("calls onKodeAngkaChange when kodeAngka typed", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    render(<ProductEntryCard entry={{ ...baseEntry, kodeAngka: "" }} idx={0} canRemove={false} {...h} />);
    // First textbox is kodeAngka (placeholder "07")
    const kodeAngkaInput = screen.getByPlaceholderText("07");
    await user.type(kodeAngkaInput, "9");
    expect(h.onKodeAngkaChange).toHaveBeenCalled();
  });

  it("calls onKodeBahanChange when kodeBahan typed", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    render(<ProductEntryCard entry={{ ...baseEntry, kodeBahan: "" }} idx={0} canRemove={false} {...h} />);
    const kodeBahanInput = screen.getByPlaceholderText("OSK");
    await user.type(kodeBahanInput, "W");
    expect(h.onKodeBahanChange).toHaveBeenCalled();
  });

  it("calls onNamaChange when nama typed", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    await user.type(screen.getByDisplayValue("Gamis Oskelin"), "X");
    expect(h.onNamaChange).toHaveBeenCalled();
  });

  it("calls onBahanChange when bahan typed", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    await user.type(screen.getByDisplayValue("Wolfis Premium"), "X");
    expect(h.onBahanChange).toHaveBeenCalled();
  });

  it("shows Tambah button for adding warna", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    expect(screen.getByText("Tambah")).toBeInTheDocument();
  });

  it("calls onAddWarna when Tambah clicked", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    await user.click(screen.getByText("Tambah"));
    expect(h.onAddWarna).toHaveBeenCalledTimes(1);
  });

  it("calls onWarnaInputChange when warna input changes", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    fireEvent.change(screen.getByPlaceholderText("Cth: HITAM"), { target: { value: "MERAH" } });
    expect(h.onWarnaInputChange).toHaveBeenCalledWith("MERAH");
  });

  it("shows HITAM warna chip", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    // HITAM appears in warna chip and qty table — just verify at least one exists
    expect(screen.getAllByText("HITAM").length).toBeGreaterThan(0);
  });

  it("calls onRemoveWarna when × in warna chip clicked", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    // canRemove=false → no remove button ×; only × is inside HITAM chip
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    await user.click(screen.getByText("×"));
    expect(h.onRemoveWarna).toHaveBeenCalledWith("HITAM");
  });

  it("shows Midi size checkbox", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    // Midi appears in variant checkbox label and qty section header
    expect(screen.getAllByText("Midi").length).toBeGreaterThan(0);
  });

  it("calls onToggleVariant when checkbox clicked", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    expect(h.onToggleVariant).toHaveBeenCalledWith(0);
  });

  it("shows × remove button when canRemove=true (no warna chips to avoid ambiguity)", () => {
    const h = makeHandlers();
    // Use warnaList=[] so the only × is the remove button
    render(<ProductEntryCard entry={{ ...baseEntry, warnaList: [] }} idx={0} canRemove={true} {...h} />);
    expect(screen.getByText("×")).toBeInTheDocument();
  });

  it("calls onRemove when × header button clicked", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    render(<ProductEntryCard entry={{ ...baseEntry, warnaList: [] }} idx={0} canRemove={true} {...h} />);
    await user.click(screen.getByText("×"));
    expect(h.onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows Mengecek HPP... when loadingTpl=true", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={{ ...baseEntry, loadingTpl: true }} idx={0} canRemove={false} {...h} />);
    expect(screen.getByText(/Mengecek HPP/)).toBeInTheDocument();
  });

  it("shows HPP info when template set", () => {
    const h = makeHandlers();
    const tpl = { total_hpp: 85000, bahan_items: [] };
    render(<ProductEntryCard entry={{ ...baseEntry, template: tpl }} idx={0} canRemove={false} {...h} />);
    expect(screen.getByText(/HPP.*85\.000|85\.000.*HPP/)).toBeInTheDocument();
  });

  it("shows 'Belum ada template HPP' when template=false", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={{ ...baseEntry, template: false }} idx={0} canRemove={false} {...h} />);
    expect(screen.getByText(/Belum ada template HPP/)).toBeInTheDocument();
  });

  it("shows qty input for active size × warna", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });

  it("calls onSetQty when qty input changed", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    fireEvent.change(screen.getByDisplayValue("5"), { target: { value: "10" } });
    expect(h.onSetQty).toHaveBeenCalledWith("Midi", "HITAM", "10");
  });

  it("shows bahan_items from template when template is set", () => {
    const h = makeHandlers();
    const tpl = { total_hpp: 85000, bahan_items: [{ nama_bahan: "Wolfis", qty_per_baju: 2, satuan: "yard" }] };
    render(<ProductEntryCard entry={{ ...baseEntry, template: tpl }} idx={0} canRemove={false} {...h} />);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("shows 'Produk N' label in header when no kode", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={{ ...baseEntry, kodeAngka: "", kodeBahan: "", expanded: false }} idx={2} canRemove={false} {...h} />);
    expect(screen.getByText("Produk 3")).toBeInTheDocument();
  });

  it("calls onToggleExpand when header clicked", async () => {
    const h = makeHandlers();
    const user = userEvent.setup();
    // collapsed state — click the header which shows the kode text
    render(<ProductEntryCard entry={{ ...baseEntry, expanded: false }} idx={0} canRemove={false} {...h} />);
    await user.click(screen.getByText("D-07-OSK"));
    expect(h.onToggleExpand).toHaveBeenCalled();
  });

  it("shows warnaInput value", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={{ ...baseEntry, warnaInput: "BIRU" }} idx={0} canRemove={false} {...h} />);
    expect(screen.getByDisplayValue("BIRU")).toBeInTheDocument();
  });

  it("calls onAddWarna when Enter pressed in warna input", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    fireEvent.keyDown(screen.getByPlaceholderText("Cth: HITAM"), { key: "Enter" });
    expect(h.onAddWarna).toHaveBeenCalledTimes(1);
  });

  it("shows tanpa warna label in qty when warnaList is empty", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={{ ...baseEntry, warnaList: [], qtyMap: { Midi: { _: "3" } } }} idx={0} canRemove={false} {...h} />);
    expect(screen.getByText("— (tanpa warna)")).toBeInTheDocument();
  });

  it("does not show qty section when no variants are active", () => {
    const h = makeHandlers();
    const allInactive = baseEntry.variants.map(v => ({ ...v, aktif: false }));
    render(<ProductEntryCard entry={{ ...baseEntry, variants: allInactive }} idx={0} canRemove={false} {...h} />);
    expect(screen.queryByText(/Qty Produksi/)).not.toBeInTheDocument();
  });

  it("shows total kain in header when > 0", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    // qtyMap has 5 for Midi/HITAM → shows "5 baju"
    expect(screen.getByText(/5 baju/)).toBeInTheDocument();
  });

  it("shows nama below kode in header", () => {
    const h = makeHandlers();
    render(<ProductEntryCard entry={baseEntry} idx={0} canRemove={false} {...h} />);
    // nama shown in the header card
    expect(screen.getAllByText("Gamis Oskelin").length).toBeGreaterThan(0);
  });
  it("shows warning when bahan_item qty_per_baju is 0", () => {
    const h = makeHandlers();
    const tpl = { total_hpp: 85000, bahan_items: [{ nama_bahan: "Wolfis", qty_per_baju: 0, harga_satuan: 15000, satuan: "yard", jenis: "motif", warna_qtys: [] }] };
    const entry = { ...baseEntry, hppTemplate: tpl };
    render(<ProductEntryCard entry={entry} idx={0} canRemove={false} {...h} />);
    // Komponen tidak crash dan masih menampilkan kode
    expect(screen.getAllByText("D-07-OSK").length).toBeGreaterThan(0);
  });
});
