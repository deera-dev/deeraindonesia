import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./RangeWithMarks", () => ({
  default: ({ value, onChange, min, max }) => (
    <input data-testid="range" type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max} />
  ),
}));
vi.mock("./BahanPickerModal", () => ({
  default: ({ options, onSelect, onClose }) => (
    <div data-testid="bahan-picker">
      {options.map(o => (
        <button key={o.id} onClick={() => onSelect(o)} data-testid={`opt-${o.id}`}>{o._label}</button>
      ))}
      <button onClick={onClose} data-testid="close-picker">ClosePicker</button>
    </div>
  ),
}));

import HPPForm from "./HPPForm";

const products = [
  { kode: "D-07-OSK", nama: "Gamis Oskelin" },
  { kode: "D-08-SFN", nama: "Gamis Sifon" },
];
const config = {
  kancing_satuan: 500, plastik: 1800, hangtag: 200, tali_hangtag: 100,
  merk: 200, pin: 2800, kain_keras: 200, poin_denny: 10000, poin_haikal: 10000,
};
const bahanOptions = [
  { id: "b1", _type: "beli", _label: "[Beli] Wolfis", nama_bahan: "Wolfis", kode_bahan: "WLF", satuan: "yard", harga_satuan: 15000, jumlah: 10 },
];

const baseTpl = {
  id: "t1", kode_produk: "D-07-OSK", total_hpp: 85000,
  bahan_items: [
    {
      nama_bahan: "Wolfis", jenis: "motif", qty_dipakai: "4", untuk_n_baju: 2,
      satuan_ukur: "yard", satuan: "yard", harga_satuan: 15000,
      warna_qtys: [{ warna: "HITAM", qty: 4 }],
    },
  ],
  upah_jahit: 30000, bordir: 0, kancing_qty: 2, biaya_studio: 0,
};

describe("HPPForm", () => {
  let onSave, onCancel;
  beforeEach(() => {
    vi.clearAllMocks();
    onSave = vi.fn().mockResolvedValue(undefined);
    onCancel = vi.fn();
  });

  it("shows Tambah Produk button in new mode", () => {
    render(<HPPForm initial={null} products={products} config={config} bahanOptions={bahanOptions} onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByText("+ Tambah Produk")).toBeInTheDocument();
  });

  it("adds product from picker", async () => {
    const user = userEvent.setup();
    render(<HPPForm initial={null} products={products} config={config} bahanOptions={bahanOptions} onSave={onSave} onCancel={onCancel} />);
    await user.click(screen.getByText("+ Tambah Produk"));
    await user.click(screen.getByText("D-07-OSK"));
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("closes ProdukPicker when Batal clicked inside picker", async () => {
    const user = userEvent.setup();
    render(<HPPForm initial={null} products={products} config={config} bahanOptions={bahanOptions} onSave={onSave} onCancel={onCancel} />);
    await user.click(screen.getByText("+ Tambah Produk"));
    const batalBtns = screen.getAllByText("Batal");
    await user.click(batalBtns[0]);
    expect(screen.queryByPlaceholderText("Cari kode / nama produk...")).not.toBeInTheDocument();
  });

  it("shows edit mode fields when initial provided", () => {
    render(<HPPForm initial={baseTpl} products={products} config={config} bahanOptions={bahanOptions} onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
    expect(screen.getAllByText("Wolfis").length).toBeGreaterThan(0);
  });

  it("calls onCancel when form-level Batal clicked", async () => {
    const user = userEvent.setup();
    render(<HPPForm initial={null} products={products} config={config} bahanOptions={bahanOptions} onSave={onSave} onCancel={onCancel} />);
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onSave when Simpan clicked with valid data", async () => {
    const user = userEvent.setup();
    render(<HPPForm initial={baseTpl} products={products} config={config} bahanOptions={bahanOptions} onSave={onSave} onCancel={onCancel} />);
    await user.click(screen.getByText(/Simpan \d+ Produk/));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it("opens BahanPickerModal when + Tambah Bahan clicked", async () => {
    const user = userEvent.setup();
    render(<HPPForm initial={baseTpl} products={products} config={config} bahanOptions={bahanOptions} onSave={onSave} onCancel={onCancel} />);
    await user.click(screen.getByText("+ Tambah Bahan"));
    expect(screen.getByTestId("bahan-picker")).toBeInTheDocument();
  });

  it("adds bahan from BahanPickerModal", async () => {
    const user = userEvent.setup();
    render(<HPPForm initial={baseTpl} products={products} config={config} bahanOptions={bahanOptions} onSave={onSave} onCancel={onCancel} />);
    await user.click(screen.getByText("+ Tambah Bahan"));
    await user.click(screen.getByTestId("opt-b1"));
    expect(screen.queryByTestId("bahan-picker")).not.toBeInTheDocument();
  });

  it("shows Rincian HPP section", () => {
    render(<HPPForm initial={baseTpl} products={products} config={config} bahanOptions={bahanOptions} onSave={() => {}} onCancel={vi.fn()} />);
    expect(screen.getByText(/Rincian HPP/)).toBeInTheDocument();
  });
});

// ── Auto-include sibling produk 1 gelaran saat Edit HPP (2026-07) ──────────
// Keputusan Denny: TANPA tombol "+ Tambah Produk" manual di mode edit — produk
// yang diproduksi bareng (batch_no sama) otomatis ikut ke sesi edit lewat prop
// siblingKodes (dihitung ProduksiHPPPage via getBatchSiblingKodes, lihat utils.js
// & utils.test.js). HPPForm sendiri hanya menerima siblingKodes+templates sebagai
// prop — tidak tahu soal batch_no, jadi test-nya cukup di level prop ini.
describe("HPPForm — sibling auto-include in edit mode", () => {
  let onSave, onCancel;
  beforeEach(() => {
    vi.clearAllMocks();
    onSave = vi.fn().mockResolvedValue(undefined);
    onCancel = vi.fn();
  });

  const siblingTplSaved = {
    id: "t2", kode_produk: "D-08-SFN", total_hpp: 70000,
    bahan_items: [], upah_jahit: 25000, bordir: 5000, kancing_qty: 3, biaya_studio: 0,
  };

  it("includes the main product AND siblingKodes in produkList when isEdit and siblingKodes provided", () => {
    render(
      <HPPForm
        initial={baseTpl}
        products={products}
        config={config}
        bahanOptions={bahanOptions}
        siblingKodes={["D-08-SFN"]}
        templates={[baseTpl, siblingTplSaved]}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-08-SFN")).toBeInTheDocument();
  });

  it("a sibling with a saved template shows its own saved upah_jahit instead of zeros", async () => {
    const user = userEvent.setup();
    render(
      <HPPForm
        initial={baseTpl}
        products={products}
        config={config}
        bahanOptions={bahanOptions}
        siblingKodes={["D-08-SFN"]}
        templates={[baseTpl, siblingTplSaved]}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    // Expand sibling card to reveal its Upah Jahit RangeWithMarks stub (value=25000)
    await user.click(screen.getByText("D-08-SFN"));
    const ranges = screen.getAllByTestId("range");
    const values = ranges.map((r) => r.value);
    expect(values).toContain("25000");
  });

  it("a sibling with no saved template shows zeros (same as a brand-new product)", async () => {
    const user = userEvent.setup();
    render(
      <HPPForm
        initial={baseTpl}
        products={products}
        config={config}
        bahanOptions={bahanOptions}
        siblingKodes={["D-08-SFN"]}
        templates={[baseTpl]} // sibling D-08-SFN has NO saved template here
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByText("D-08-SFN"));
    const ranges = screen.getAllByTestId("range");
    const values = ranges.map((r) => r.value);
    expect(values).toContain("0");
  });

  it("does not show + Tambah Produk button in edit mode even with siblings", () => {
    render(
      <HPPForm
        initial={baseTpl}
        products={products}
        config={config}
        bahanOptions={bahanOptions}
        siblingKodes={["D-08-SFN"]}
        templates={[baseTpl, siblingTplSaved]}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    expect(screen.queryByText("+ Tambah Produk")).not.toBeInTheDocument();
  });

  it("shows × remove button for sibling entries (idx > 0) but not for the primary entry (idx 0) in edit mode", () => {
    render(
      <HPPForm
        initial={baseTpl}
        products={products}
        config={config}
        bahanOptions={bahanOptions}
        siblingKodes={["D-08-SFN"]}
        templates={[baseTpl, siblingTplSaved]}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    // Scope the × query to each product card specifically — the Bahan section
    // below also renders its own × (removeBahan) with identical text/markup,
    // so a page-wide getAllByText("×") would double-count unrelated buttons.
    const primaryCard = screen.getByText("D-07-OSK").closest(".border.border-skin-bdr.bg-skin-raised");
    const siblingCard = screen.getByText("D-08-SFN").closest(".border.border-skin-bdr.bg-skin-raised");
    expect(within(primaryCard).queryByText("×")).not.toBeInTheDocument();
    expect(within(siblingCard).getByText("×")).toBeInTheDocument();
  });

  it("removing a sibling via × drops it from produkList", async () => {
    const user = userEvent.setup();
    render(
      <HPPForm
        initial={baseTpl}
        products={products}
        config={config}
        bahanOptions={bahanOptions}
        siblingKodes={["D-08-SFN"]}
        templates={[baseTpl, siblingTplSaved]}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    const siblingCard = screen.getByText("D-08-SFN").closest(".border.border-skin-bdr.bg-skin-raised");
    await user.click(within(siblingCard).getByText("×"));
    expect(screen.queryByText("D-08-SFN")).not.toBeInTheDocument();
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("shows the Bahan-section transparency note when produkList.length > 1", () => {
    render(
      <HPPForm
        initial={baseTpl}
        products={products}
        config={config}
        bahanOptions={bahanOptions}
        siblingKodes={["D-08-SFN"]}
        templates={[baseTpl, siblingTplSaved]}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText(/akan disimpan SAMA untuk semua produk di atas/)).toBeInTheDocument();
    expect(screen.getByText(/D-07-OSK, D-08-SFN/)).toBeInTheDocument();
  });

  it("does not show the Bahan-section transparency note when there is only 1 product", () => {
    render(
      <HPPForm
        initial={baseTpl}
        products={products}
        config={config}
        bahanOptions={bahanOptions}
        siblingKodes={[]}
        templates={[baseTpl]}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    expect(screen.queryByText(/akan disimpan SAMA untuk semua produk di atas/)).not.toBeInTheDocument();
  });
});
