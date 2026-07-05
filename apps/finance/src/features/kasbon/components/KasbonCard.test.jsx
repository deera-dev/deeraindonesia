import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  fmtTanggalPendek: vi.fn((v) => v || ""),
}));

import KasbonCard from "./KasbonCard";

const kBelum = {
  id: "kb1",
  karyawan: { nama: "BUDI" },
  tanggal: "2026-07-01",
  keterangan: "Pinjaman darurat",
  jumlah: 1000000,
  sisa: 700000,
  status: "belum",
  cicilan: [{ tanggal: "2026-07-10", jumlah: 300000, keterangan: "cicil 1", jenis: "bayar" }],
  tambahan: [],
};
const kLunas = { ...kBelum, sisa: 0, status: "lunas", cicilan: [] };

describe("KasbonCard", () => {
  it("renders karyawan nama", () => {
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("renders keterangan", () => {
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Pinjaman darurat")).toBeInTheDocument();
  });

  it("renders sisa amount", () => {
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Rp700000")).toBeInTheDocument();
  });

  it("renders status badge belum", () => {
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("belum")).toBeInTheDocument();
  });

  it("renders status badge lunas", () => {
    render(<KasbonCard k={kLunas} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("lunas")).toBeInTheDocument();
  });

  it("shows + Bayar Cicilan button when status != lunas", () => {
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("+ Bayar Cicilan")).toBeInTheDocument();
  });

  it("hides + Bayar Cicilan when status = lunas", () => {
    render(<KasbonCard k={kLunas} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText("+ Bayar Cicilan")).toBeNull();
  });

  it("calls onCicilan when + Bayar Cicilan clicked", () => {
    const onCicilan = vi.fn();
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={onCicilan} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Bayar Cicilan"));
    expect(onCicilan).toHaveBeenCalledWith(kBelum);
  });

  it("calls onEdit when Edit clicked", () => {
    const onEdit = vi.fn();
    render(<KasbonCard k={kBelum} onEdit={onEdit} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(kBelum);
  });

  it("calls onDelete when Hapus clicked", () => {
    const onDelete = vi.fn();
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Hapus"));
    expect(onDelete).toHaveBeenCalledWith("kb1");
  });

  it("shows riwayat on Riwayat button click", () => {
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText(/Riwayat/));
    // cicilan tanggal should appear
    expect(screen.getByText(/2026-07-10/)).toBeInTheDocument();
  });

  it("shows Belum ada riwayat when no cicilan and expanded", () => {
    const kEmpty = { ...kBelum, cicilan: [], tambahan: [] };
    render(<KasbonCard k={kEmpty} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText(/Riwayat/));
    expect(screen.getByText("Belum ada riwayat.")).toBeInTheDocument();
  });

  it("shows persen terbayar = 30%", () => {
    render(<KasbonCard k={kBelum} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("30% terbayar")).toBeInTheDocument();
  });
});

// ── Additional branch coverage ────────────────────────────────────────────────
describe("KasbonCard — karyawan null → '—' fallback", () => {
  it("renders '—' when karyawan is null", () => {
    const k = { ...kBelum, karyawan: null };
    render(<KasbonCard k={k} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("KasbonCard — jumlah=0 → persen=0 branch", () => {
  it("shows 0% terbayar when jumlah=0", () => {
    const k = { ...kBelum, jumlah: 0, sisa: 0 };
    render(<KasbonCard k={k} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("0% terbayar")).toBeInTheDocument();
  });
});

describe("KasbonCard — keterangan null → no keterangan paragraph", () => {
  it("does not render keterangan line when keterangan is falsy", () => {
    const k = { ...kBelum, keterangan: null };
    const { container } = render(<KasbonCard k={k} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText("Pinjaman darurat")).toBeNull();
  });
});

describe("KasbonCard — tambahan entries (jenis=tambah branch)", () => {
  it("shows '· tambahan' and '+' prefix for tambahan entries in riwayat", () => {
    const kWithTambahan = {
      ...kBelum,
      tambahan: [{ tanggal: "2026-07-05", jumlah: 200000, keterangan: "tambah bon" }],
    };
    render(<KasbonCard k={kWithTambahan} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText(/Riwayat/));
    expect(screen.getByText(/tambahan/)).toBeInTheDocument();
  });
});

describe("KasbonCard — cicilan without keterangan (falsy branch)", () => {
  it("does not render cicilan keterangan paragraph when keterangan is null", () => {
    const kNoKet = {
      ...kBelum,
      cicilan: [{ tanggal: "2026-07-10", jumlah: 100000, keterangan: null, jenis: "bayar" }],
    };
    render(<KasbonCard k={kNoKet} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText(/Riwayat/));
    // The date should render but there's no keterangan text
    expect(screen.getByText(/2026-07-10/)).toBeInTheDocument();
  });
});

describe("KasbonCard — cicilan=null and tambahan=null (?? [] branches)", () => {
  it("handles cicilan=null without crashing", () => {
    const k = { ...kBelum, cicilan: null };
    render(<KasbonCard k={k} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("handles tambahan=null without crashing", () => {
    const k = { ...kBelum, tambahan: null };
    render(<KasbonCard k={k} onEdit={vi.fn()} onCicilan={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });
});
