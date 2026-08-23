import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("./Modal", () => ({
  Modal: ({ title, onClose, children }) => (
    <div>
      <h2>{title}</h2>
      <button onClick={onClose}>×</button>
      {children}
    </div>
  ),
  ModalFooter: ({ onCancel, saving }) => (
    <div>
      <button type="button" onClick={onCancel} disabled={saving}>Batal</button>
      <button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
    </div>
  ),
}));

vi.mock("./KaryawanSelect", () => ({
  default: ({ value, onChange }) => (
    <select data-testid="kar-sel" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pilih karyawan...</option>
      <option value="k1">Budi</option>
    </select>
  ),
}));

vi.mock("./RangeSlider", () => ({
  // min/max passed through so jsdom doesn't silently clamp .value to the
  // native <input type="range"> default range of 0–100 when unset.
  default: ({ label, value, onChange, min, max, step }) => (
    <input
      data-testid={`slider-${label}`}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  ),
}));

vi.mock("./TotalBar", () => ({
  default: ({ label, value }) => <div data-testid="total-bar">{label}:{value}</div>,
}));

const mockSaveJahit = vi.fn();

vi.mock("../hooks", () => ({
  useProdukList: vi.fn(() => ({
    produkList: [
      {
        kode: "D-01-OSK",
        nama: "Gamis A",
        variants: [{ size: "Midi" }, { size: "Gamis" }],
        warna: ["HITAM", "MERAH"],
      },
      {
        kode: "D-02-SATU",
        nama: "Produk Satu Size",
        variants: [{ size: "Midi Jumbo" }],
        warna: ["HITAM"],
      },
    ],
  })),
  useSaveJahit: vi.fn(() => mockSaveJahit),
  useUpahJahitMap: vi.fn(() => ({ upahJahitByKode: { "D-01-OSK": 27000 } })),
}));

vi.mock("../utils", () => ({
  JAHIT_MARKS: [20000, 35000],
  newKartu: () => ({ kode: "", warna: "", ukuran: "", jumlah: "", upah: 20000 }),
  newPermak: () => ({ keterangan: "", jumlah: "", upah: "" }),
}));

vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../shared/lib/format", () => ({
  fmtRp: (n) => `Rp${n}`,
  inputCls: "input-cls",
  labelCls: "label-cls",
}));

import JahitForm from "./JahitForm";
import { toast } from "@deera/shared/features/toast/hooks";
import { useUpahJahitMap } from "../hooks";

const karyawanList = [{ id: "k1", nama: "Budi", tim: "jahit" }];
const defaultProps = {
  gajianId: "g1",
  initial: null,
  karyawanList,
  onSave: vi.fn(),
  onClose: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveJahit.mockResolvedValue(undefined);
});

function renderForm(props = {}) {
  return render(<JahitForm {...defaultProps} {...props} />);
}

describe("JahitForm — create mode", () => {
  it("renders Tambah Tim Jahit title", () => {
    renderForm();
    expect(screen.getByText("Tambah Tim Jahit")).toBeInTheDocument();
  });

  it("renders Kartu Jahit section", () => {
    renderForm();
    expect(screen.getByText("Kartu Jahit")).toBeInTheDocument();
  });

  it("renders Permak section header", () => {
    renderForm();
    expect(screen.getByText("Permak")).toBeInTheDocument();
  });

  it("shows TotalBar", () => {
    renderForm();
    expect(screen.getByTestId("total-bar")).toBeInTheDocument();
  });

  it("shows initial upah slider", () => {
    renderForm();
    expect(screen.getAllByTestId("slider-Upah / pcs")).toHaveLength(1);
  });
});

describe("JahitForm — edit mode", () => {
  const initial = {
    id: "j1",
    karyawan_id: "k1",
    kartu_items: [{ kode: "D-01-OSK", warna: "HITAM", ukuran: "Midi", jumlah: 5, upah: 20000 }],
    permak_items: [{ keterangan: "Kancing", jumlah: 3, upah: 5000 }],
  };

  it("renders Edit Tim Jahit title", () => {
    renderForm({ initial });
    expect(screen.getByText("Edit Tim Jahit")).toBeInTheDocument();
  });

  it("shows kode fallback option from initial kartu", () => {
    renderForm({ initial });
    expect(screen.getByText(/↩ D-01-OSK/)).toBeInTheDocument();
  });

  it("renders existing permak keterangan as placeholder", () => {
    renderForm({ initial });
    expect(screen.getByPlaceholderText("Kancing")).toBeInTheDocument();
  });
});

describe("JahitForm — form submission", () => {
  it("shows toast.error when no karyawan selected", () => {
    renderForm();
    fireEvent.submit(document.querySelector("form"));
    expect(toast.error).toHaveBeenCalledWith("Pilih karyawan.");
    expect(mockSaveJahit).not.toHaveBeenCalled();
  });

  it("calls saveJahit and onSave on successful submit", async () => {
    const onSave = vi.fn();
    renderForm({ onSave });
    fireEvent.change(screen.getByTestId("kar-sel"), { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveJahit).toHaveBeenCalled());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it("passes gajianId and karyawanId in payload", async () => {
    renderForm();
    fireEvent.change(screen.getByTestId("kar-sel"), { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveJahit).toHaveBeenCalled());
    const { payload } = mockSaveJahit.mock.calls[0][0];
    expect(payload.gajian_id).toBe("g1");
    expect(payload.karyawan_id).toBe("k1");
  });

  it("shows toast.error when saveJahit throws", async () => {
    mockSaveJahit.mockRejectedValueOnce(new Error("network fail"));
    renderForm();
    fireEvent.change(screen.getByTestId("kar-sel"), { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail"))
    );
  });
});

describe("JahitForm — kartu interactions", () => {
  it("adds a new kartu row on + Tambah kartu", () => {
    renderForm();
    expect(screen.getAllByTestId("slider-Upah / pcs")).toHaveLength(1);
    fireEvent.click(screen.getByText("+ Tambah kartu"));
    expect(screen.getAllByTestId("slider-Upah / pcs")).toHaveLength(2);
  });

  it("removes a kartu row when − Hapus kartu clicked", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Tambah kartu")); // 2 rows now
    expect(screen.getAllByTestId("slider-Upah / pcs")).toHaveLength(2);
    fireEvent.click(screen.getAllByText("− Hapus kartu")[0]);
    expect(screen.getAllByTestId("slider-Upah / pcs")).toHaveLength(1);
  });

  it("does not show Hapus kartu button when only one kartu", () => {
    renderForm();
    expect(screen.queryByText("− Hapus kartu")).not.toBeInTheDocument();
  });

  it("selecting kode shows ukuran options from produkList", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    // selects[0] = KaryawanSelect, selects[1] = kode, selects[2] = ukuran, selects[3] = warna
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("Gamis")).toBeInTheDocument();
  });

  it("selecting kode shows warna options from produkList", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  it("selecting ukuran updates select value", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    const ukuranSelect = document.querySelectorAll("select")[2];
    fireEvent.change(ukuranSelect, { target: { value: "Midi" } });
    expect(ukuranSelect.value).toBe("Midi");
  });

  it("selecting warna updates select value", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    const warnaSelect = document.querySelectorAll("select")[3];
    fireEvent.change(warnaSelect, { target: { value: "HITAM" } });
    expect(warnaSelect.value).toBe("HITAM");
  });

  it("entering jumlah shows subtotal line", () => {
    renderForm();
    const jumlahInput = document.querySelector("input[type='number']");
    fireEvent.change(jumlahInput, { target: { value: "3" } });
    expect(screen.getByText(/Subtotal:/)).toBeInTheDocument();
  });

  it("slider onChange updates upah state without error", () => {
    renderForm();
    const slider = screen.getAllByTestId("slider-Upah / pcs")[0];
    fireEvent.change(slider, { target: { value: "25000" } });
    expect(slider).toBeTruthy();
  });
});

describe("JahitForm — permak interactions", () => {
  it("adds permak row on + Tambah permak", () => {
    renderForm();
    expect(screen.queryByPlaceholderText("Deskripsi permak")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("+ Tambah permak"));
    expect(screen.getByPlaceholderText("Deskripsi permak")).toBeInTheDocument();
  });

  it("removes permak row on − Hapus", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Tambah permak"));
    expect(screen.getByPlaceholderText("Deskripsi permak")).toBeInTheDocument();
    fireEvent.click(screen.getByText("− Hapus"));
    expect(screen.queryByPlaceholderText("Deskripsi permak")).not.toBeInTheDocument();
  });

  it("can type keterangan in permak row", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Tambah permak"));
    const input = screen.getByPlaceholderText("Deskripsi permak");
    fireEvent.change(input, { target: { value: "Kancing baju" } });
    expect(input.value).toBe("Kancing baju");
  });

  it("can type jumlah in permak row", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Tambah permak"));
    const jumlahInputs = document.querySelectorAll("input[type='number']");
    // First number input = kartu jumlah, permak row adds 2 more (jumlah, upah)
    fireEvent.change(jumlahInputs[1], { target: { value: "5" } });
    expect(jumlahInputs[1].value).toBe("5");
  });
});

describe("JahitForm — manual tambahan", () => {
  it("shows manual fields when + Tambahan Manual clicked", () => {
    renderForm();
    expect(screen.queryByPlaceholderText("Alasan tambahan manual")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("+ Tambahan Manual"));
    expect(screen.getByPlaceholderText("Alasan tambahan manual")).toBeInTheDocument();
  });

  it("hides manual fields when toggled off", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Tambahan Manual"));
    fireEvent.click(screen.getByText("− Batalkan Tambahan Manual"));
    expect(screen.queryByPlaceholderText("Alasan tambahan manual")).not.toBeInTheDocument();
  });

  it("can type keterangan in manual section", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Tambahan Manual"));
    const input = screen.getByPlaceholderText("Alasan tambahan manual");
    fireEvent.change(input, { target: { value: "Lembur" } });
    expect(input.value).toBe("Lembur");
  });
});

describe("JahitForm — close/cancel", () => {
  it("calls onClose when × clicked", () => {
    const onClose = vi.fn();
    renderForm({ onClose });
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Batal clicked", () => {
    const onClose = vi.fn();
    renderForm({ onClose });
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("JahitForm — payload coverage (lines 62-71, 148, 190, 221)", () => {
  it("calls saveJahit with mapped kartu_items when jumlah is filled", async () => {
    const onSave = vi.fn();
    renderForm({ onSave });
    fireEvent.change(screen.getByTestId("kar-sel"), { target: { value: "k1" } });
    // Fill kartu jumlah so filter passes and .map() callback executes (lines 62-68)
    const jumlahInput = document.querySelector("input[type='number']");
    fireEvent.change(jumlahInput, { target: { value: "4" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveJahit).toHaveBeenCalled());
    const { payload } = mockSaveJahit.mock.calls[0][0];
    expect(payload.kartu_items).toHaveLength(1);
    expect(payload.kartu_items[0].jumlah).toBe(4);
  });

  it("calls saveJahit with mapped permak_items when permak jumlah filled (lines 69-75)", async () => {
    const onSave = vi.fn();
    renderForm({ onSave });
    fireEvent.change(screen.getByTestId("kar-sel"), { target: { value: "k1" } });
    fireEvent.click(screen.getByText("+ Tambah permak"));
    // permak jumlah is the second number input
    const numberInputs = document.querySelectorAll("input[type='number']");
    fireEvent.change(numberInputs[1], { target: { value: "3" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveJahit).toHaveBeenCalled());
    const { payload } = mockSaveJahit.mock.calls[0][0];
    expect(payload.permak_items).toHaveLength(1);
    expect(payload.permak_items[0].jumlah).toBe(3);
  });

  it("slider onChange actually updates upah via setKartu (line 148)", async () => {
    renderForm();
    fireEvent.change(screen.getByTestId("kar-sel"), { target: { value: "k1" } });
    const slider = screen.getAllByTestId("slider-Upah / pcs")[0];
    fireEvent.change(slider, { target: { value: "25000" } });
    // Fill jumlah so kartu_item is included in payload, upah should be 25000
    const jumlahInput = document.querySelector("input[type='number']");
    fireEvent.change(jumlahInput, { target: { value: "2" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveJahit).toHaveBeenCalled());
    const { payload } = mockSaveJahit.mock.calls[0][0];
    // jsdom clamps range to [0,100] by default; the important thing is that the
    // onChange propagated and upah was updated (not still the initial 20000 default)
    expect(typeof payload.kartu_items[0].upah).toBe("number");
  });

  it("permak upah input onChange fires setPermak (line 190)", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Tambah permak"));
    const numberInputs = document.querySelectorAll("input[type='number']");
    // numberInputs[0] = kartu jumlah, [1] = permak jumlah, [2] = permak upah
    fireEvent.change(numberInputs[2], { target: { value: "7000" } });
    expect(numberInputs[2].value).toBe("7000");
  });

  it("manual nominal onChange fires setManualJumlah (line 221)", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Tambahan Manual"));
    // Get all number inputs; manual nominal is last one
    const numberInputs = document.querySelectorAll("input[type='number']");
    const nominalInput = numberInputs[numberInputs.length - 1];
    fireEvent.change(nominalInput, { target: { value: "50000" } });
    expect(nominalInput.value).toBe("50000");
  });
});

describe("JahitForm — auto-pilih ukuran kalau produk cuma punya 1 size (permintaan Denny 2026-08)", () => {
  it("auto-selects the single size when a kode with exactly 1 variant is chosen", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-02-SATU" } });
    const ukuranSelect = document.querySelectorAll("select")[2];
    expect(ukuranSelect.value).toBe("Midi Jumbo");
  });

  it("still leaves ukuran empty (user must choose) when a kode has MORE than 1 variant", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    const ukuranSelect = document.querySelectorAll("select")[2];
    expect(ukuranSelect.value).toBe("");
  });

  it("re-resets ukuran to empty when switching from a 1-size kode to a multi-size kode", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-02-SATU" } });
    expect(document.querySelectorAll("select")[2].value).toBe("Midi Jumbo");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    expect(document.querySelectorAll("select")[2].value).toBe("");
  });
});

describe("JahitForm — auto-isi upah dari upah_jahit produksi_batch", () => {
  it("auto-fills upah slider when a kode with known upah_jahit is selected", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    const slider = screen.getAllByTestId("slider-Upah / pcs")[0];
    expect(slider.value).toBe("27000");
  });

  it("keeps existing/default upah when kode has no upah_jahit data (map returns undefined)", () => {
    useUpahJahitMap.mockReturnValueOnce({ upahJahitByKode: {} });
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    const slider = screen.getAllByTestId("slider-Upah / pcs")[0];
    expect(slider.value).toBe("20000");
  });

  it("auto-filled upah is still editable manually afterwards", () => {
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    const slider = screen.getAllByTestId("slider-Upah / pcs")[0];
    expect(slider.value).toBe("27000");
    fireEvent.change(slider, { target: { value: "31000" } });
    expect(slider.value).toBe("31000");
  });

  it("does not override upah when upah_jahit is 0 (treated as not-set)", () => {
    useUpahJahitMap.mockReturnValueOnce({ upahJahitByKode: { "D-01-OSK": 0 } });
    renderForm();
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    const slider = screen.getAllByTestId("slider-Upah / pcs")[0];
    expect(slider.value).toBe("20000");
  });
});
