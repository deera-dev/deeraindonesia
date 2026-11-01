import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseHistoryByKode = vi.fn();
vi.mock("../../history", () => ({
  useHistoryByKode: (...args) => mockUseHistoryByKode(...args),
}));

import Timeline from "./Timeline";

const sampel = { id: "s1", nomor: "SPL-001", nama: "Gamis Arkana" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Timeline", () => {
  it("menampilkan loading saat history masih loading", () => {
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: true });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/Memuat riwayat/)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong kalau history kosong", () => {
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: false });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/Belum ada riwayat/)).toBeInTheDocument();
  });

  it("menampilkan item history terurut kronologis", () => {
    mockUseHistoryByKode.mockReturnValue({
      history: [
        { id: "h1", action: "sampel-planning-buat", user_name: "Admin", changed_at: "2026-08-01T08:00:00Z" },
      ],
      loading: false,
    });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/Planning Dibuat/)).toBeInTheDocument();
  });

  it("history dgn user_email tapi tanpa user_name menampilkan email", () => {
    mockUseHistoryByKode.mockReturnValue({
      history: [
        { id: "h1", action: "sampel-edit", user_email: "a@b.com", changed_at: "2026-08-01T08:00:00Z" },
      ],
      loading: false,
    });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/a@b\.com/)).toBeInTheDocument();
  });

  it("history tanpa user_name/user_email menampilkan 'Sistem'", () => {
    mockUseHistoryByKode.mockReturnValue({
      history: [{ id: "h1", action: "sampel-edit", changed_at: "2026-08-01T08:00:00Z" }],
      loading: false,
    });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/Sistem/)).toBeInTheDocument();
  });

  it("memanggil useHistoryByKode dengan sampel.nomor", () => {
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: false });
    render(<Timeline sampel={sampel} />);
    expect(mockUseHistoryByKode).toHaveBeenCalledWith("SPL-001");
  });
});
