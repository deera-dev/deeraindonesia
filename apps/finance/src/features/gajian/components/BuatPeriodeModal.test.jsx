import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  getSabtu: vi.fn(() => "2026-07-04"),
  inputCls: "",
  labelCls: "",
}));
const mockCreate = vi.fn().mockResolvedValue("new-id-123");
vi.mock("../hooks", () => ({
  useCreateGajianPeriode: vi.fn(() => mockCreate),
}));

import BuatPeriodeModal from "./BuatPeriodeModal";

beforeEach(() => { vi.clearAllMocks(); mockCreate.mockResolvedValue("new-id-123"); });

describe("BuatPeriodeModal", () => {
  it("renders Periode Baru title", () => {
    render(<BuatPeriodeModal onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("Periode Baru")).toBeInTheDocument();
  });

  it("pre-fills today Saturday as tanggal", () => {
    render(<BuatPeriodeModal onClose={vi.fn()} onSave={vi.fn()} />);
    expect(document.querySelector('input[type="date"]').value).toBe("2026-07-04");
  });

  it("calls createGajianPeriode and onSave(id) on submit", async () => {
    const onSave = vi.fn();
    render(<BuatPeriodeModal onClose={vi.fn()} onSave={onSave} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith("2026-07-04"));
    expect(onSave).toHaveBeenCalledWith("new-id-123");
  });

  it("shows toast error when create throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Duplicate periode"));
    render(<BuatPeriodeModal onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Duplicate periode"));
  });

  it("calls onClose when Batal clicked", () => {
    const onClose = vi.fn();
    render(<BuatPeriodeModal onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<BuatPeriodeModal onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(document.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when × clicked", () => {
    const onClose = vi.fn();
    render(<BuatPeriodeModal onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });
});
