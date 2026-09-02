import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseHistoryByKode = vi.fn();
vi.mock("../../history", () => ({
  useHistoryByKode: (...args) => mockUseHistoryByKode(...args),
}));

const mockUseComments = vi.fn();
vi.mock("../hooks", () => ({
  useComments: (...args) => mockUseComments(...args),
}));

import Timeline from "./Timeline";

const sampel = { id: "s1", nomor: "SPL-001", nama: "Gamis Arkana" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Timeline", () => {
  it("menampilkan loading saat salah satu source masih loading", () => {
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: true });
    mockUseComments.mockReturnValue({ comments: [], loading: false });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/Memuat riwayat/)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong kalau history & comments sama-sama kosong", () => {
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: false });
    mockUseComments.mockReturnValue({ comments: [], loading: false });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/Belum ada riwayat/)).toBeInTheDocument();
  });

  it("menggabungkan history & comments dalam urutan kronologis", () => {
    mockUseHistoryByKode.mockReturnValue({
      history: [
        { id: "h1", action: "sampel-planning-buat", user_name: "Admin", changed_at: "2026-08-01T08:00:00Z" },
      ],
      loading: false,
    });
    mockUseComments.mockReturnValue({
      comments: [
        { id: "c1", user_name: "Budi", text: "cek dulu ya", created_at: "2026-08-01T09:00:00Z" },
      ],
      loading: false,
    });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/Planning Dibuat/)).toBeInTheDocument();
    expect(screen.getByText(/berkomentar/)).toBeInTheDocument();
    expect(screen.getByText(/cek dulu ya/)).toBeInTheDocument();
  });

  it("history dgn user_email tapi tanpa user_name menampilkan email", () => {
    mockUseHistoryByKode.mockReturnValue({
      history: [
        { id: "h1", action: "sampel-edit", user_email: "a@b.com", changed_at: "2026-08-01T08:00:00Z" },
      ],
      loading: false,
    });
    mockUseComments.mockReturnValue({ comments: [], loading: false });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/a@b\.com/)).toBeInTheDocument();
  });

  it("history tanpa user_name/user_email menampilkan 'Sistem'", () => {
    mockUseHistoryByKode.mockReturnValue({
      history: [{ id: "h1", action: "sampel-edit", changed_at: "2026-08-01T08:00:00Z" }],
      loading: false,
    });
    mockUseComments.mockReturnValue({ comments: [], loading: false });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/Sistem/)).toBeInTheDocument();
  });

  it("komentar panjang dipotong jadi preview 60 karakter dgn elipsis", () => {
    const longText = "a".repeat(80);
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: false });
    mockUseComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "Budi", text: longText, created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(new RegExp(`${"a".repeat(60)}…`))).toBeInTheDocument();
  });

  it("komentar berupa foto tanpa teks menampilkan '(mengirim foto)'", () => {
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: false });
    mockUseComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "Budi", image_url: "https://cld/a.jpg", created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    render(<Timeline sampel={sampel} />);
    expect(screen.getByText(/mengirim foto/)).toBeInTheDocument();
  });

  it("memanggil useHistoryByKode dengan sampel.nomor", () => {
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: false });
    mockUseComments.mockReturnValue({ comments: [], loading: false });
    render(<Timeline sampel={sampel} />);
    expect(mockUseHistoryByKode).toHaveBeenCalledWith("SPL-001");
  });

  it("memanggil useComments dengan sampel.id", () => {
    mockUseHistoryByKode.mockReturnValue({ history: [], loading: false });
    mockUseComments.mockReturnValue({ comments: [], loading: false });
    render(<Timeline sampel={sampel} />);
    expect(mockUseComments).toHaveBeenCalledWith("s1");
  });
});
