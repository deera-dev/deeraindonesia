import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import HargaDasarPanel from "./HargaDasarPanel";
import { toast } from "@deera/shared/features/toast/hooks";

const rows = [
  { key: "bordir", label: "Bordir", nilai: 10000, keterangan: "Biaya bordir per pakaian" },
  { key: "jahit_midi", label: "Jahit (Midi)", nilai: 35000 },
  { key: "plastik", label: "Plastik", nilai: 1800 },
];

beforeEach(() => vi.clearAllMocks());

describe("HargaDasarPanel", () => {
  it("shows loading state", () => {
    render(<HargaDasarPanel rows={[]} loading={true} error={false} onSave={vi.fn()} />);
    expect(screen.getByText(/Memuat/)).toBeInTheDocument();
  });

  it("shows error state with Coba Lagi button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<HargaDasarPanel rows={[]} loading={false} error={true} onSave={vi.fn()} onRetry={onRetry} />);
    expect(screen.getByText(/Gagal memuat Harga Dasar/)).toBeInTheDocument();
    await user.click(screen.getByText("Coba Lagi"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows empty-config fallback state when no rows and not loading/error", () => {
    render(<HargaDasarPanel rows={[]} loading={false} error={false} onSave={vi.fn()} />);
    expect(screen.getByText(/Konfigurasi belum tersedia/)).toBeInTheDocument();
  });

  it("renders intro copy explaining what Harga Dasar is", () => {
    render(<HargaDasarPanel rows={rows} loading={false} error={false} onSave={vi.fn()} />);
    expect(screen.getByText(/otomatis mengisi Template HPP baru/)).toBeInTheDocument();
  });

  it("renders grouped rows under category headers", () => {
    render(<HargaDasarPanel rows={rows} loading={false} error={false} onSave={vi.fn()} />);
    expect(screen.getByText("Bordir & Finishing")).toBeInTheDocument();
    expect(screen.getByText("Ongkos Jahit")).toBeInTheDocument();
    expect(screen.getByText("Kemasan & Aksesoris")).toBeInTheDocument();
    expect(screen.getByText("Bordir")).toBeInTheDocument();
  });

  it("does not render a '+ Tambah' button (fixed-field settings, not free CRUD)", () => {
    render(<HargaDasarPanel rows={rows} loading={false} error={false} onSave={vi.fn()} />);
    expect(screen.queryByText(/Tambah/)).not.toBeInTheDocument();
  });

  it("opens edit sheet when a row is tapped", async () => {
    const user = userEvent.setup();
    render(<HargaDasarPanel rows={rows} loading={false} error={false} onSave={vi.fn()} />);
    await user.click(screen.getByText("Bordir"));
    expect(screen.getByDisplayValue("10000")).toBeInTheDocument();
  });

  it("calls onSave, shows success toast, and closes sheet on save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HargaDasarPanel rows={rows} loading={false} error={false} onSave={onSave} userEmail="a@b.com" />);
    await user.click(screen.getByText("Bordir"));
    const input = screen.getByDisplayValue("10000");
    await user.clear(input);
    await user.type(input, "12000");
    await user.click(screen.getByText("Simpan"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("bordir", 12000, "a@b.com"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(screen.queryByDisplayValue("12000")).not.toBeInTheDocument();
  });

  it("shows error toast and keeps sheet open when onSave rejects", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<HargaDasarPanel rows={rows} loading={false} error={false} onSave={onSave} userEmail="a@b.com" />);
    await user.click(screen.getByText("Bordir"));
    const input = screen.getByDisplayValue("10000");
    await user.clear(input);
    await user.type(input, "12000");
    await user.click(screen.getByText("Simpan"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Network error"));
    expect(screen.getByDisplayValue("12000")).toBeInTheDocument();
  });
});
