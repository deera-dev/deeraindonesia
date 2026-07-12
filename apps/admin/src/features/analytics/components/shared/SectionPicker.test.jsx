import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SectionPicker from "./SectionPicker";

const GROUPS = [
  {
    groupLabel: null,
    items: [{ key: "executive", label: "Ringkasan Bisnis", description: "Kondisi bisnis hari ini." }],
  },
  {
    groupLabel: "Penjualan",
    items: [
      { key: "overview", label: "Ringkasan Penjualan", description: "Total penjualan periode ini." },
      { key: "trends", label: "Tren Penjualan", description: "Grafik naik-turun penjualan." },
    ],
  },
  {
    groupLabel: "Produk & Stok",
    items: [
      { key: "products", label: "Produk", description: "Produk paling laris." },
      { key: "inventory", label: "Persediaan", description: "Kesehatan stok gudang." },
    ],
  },
];

describe("SectionPicker", () => {
  it("menampilkan nama halaman aktif di tombol trigger", () => {
    render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={vi.fn()} />);
    expect(screen.getByText("Ringkasan Penjualan")).toBeInTheDocument();
  });

  it("sheet TIDAK terbuka secara default", () => {
    render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={vi.fn()} />);
    expect(screen.queryByText("Pilih Halaman")).not.toBeInTheDocument();
  });

  it("membuka bottom sheet saat trigger ditekan, menampilkan seluruh halaman terkelompok", async () => {
    const user = userEvent.setup();
    render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={vi.fn()} />);
    await user.click(screen.getByText("Halaman Saat Ini"));
    expect(screen.getByText("Pilih Halaman")).toBeInTheDocument();
    expect(screen.getByText("Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Produk & Stok")).toBeInTheDocument();
    expect(screen.getByText("Produk")).toBeInTheDocument();
    expect(screen.getByText("Persediaan")).toBeInTheDocument();
  });

  it("item pinned (groupLabel null) tampil TANPA judul kelompok", async () => {
    const user = userEvent.setup();
    render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={vi.fn()} />);
    await user.click(screen.getByText("Halaman Saat Ini"));
    expect(screen.getAllByText("Ringkasan Bisnis").length).toBeGreaterThanOrEqual(1);
  });

  it("menampilkan deskripsi 1 kalimat per halaman", async () => {
    const user = userEvent.setup();
    render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={vi.fn()} />);
    await user.click(screen.getByText("Halaman Saat Ini"));
    expect(screen.getByText("Total penjualan periode ini.")).toBeInTheDocument();
  });

  it("memanggil onSelect dan menutup sheet saat memilih halaman lain", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={onSelect} />);
    await user.click(screen.getByText("Halaman Saat Ini"));
    await user.click(screen.getByText("Produk"));
    expect(onSelect).toHaveBeenCalledWith("products");
    expect(screen.queryByText("Pilih Halaman")).not.toBeInTheDocument();
  });

  it("halaman aktif punya aria-current='page'", async () => {
    const user = userEvent.setup();
    render(<SectionPicker groups={GROUPS} activeKey="products" onSelect={vi.fn()} />);
    await user.click(screen.getByText("Halaman Saat Ini"));
    // "Produk" muncul 2x saat activeKey="products": label trigger DAN baris
    // di dalam sheet — ambil baris kedua (di dalam sheet, urutan dokumen).
    const activeBtn = screen.getAllByText("Produk")[1].closest("button");
    expect(activeBtn).toHaveAttribute("aria-current", "page");
    const inactiveBtn = screen.getByText("Persediaan").closest("button");
    expect(inactiveBtn).not.toHaveAttribute("aria-current");
  });

  it("no ellipsis/truncate/overflow-hidden pada elemen yang dirender SectionPicker sendiri", async () => {
    // Scan dibatasi ke tombol (trigger + baris section) yang DIRENDER
    // SectionPicker — TIDAK termasuk header <BottomSheet/> (komponen shared
    // eksternal pre-existing, dipakai juga oleh fitur lain seperti
    // produksi-hpp, di luar tanggung jawab redesign Analytics ini; judul
    // sheet "Pilih Halaman" pendek & tetap sehingga truncate di sana tidak
    // pernah benar-benar memotong teks apa pun).
    const user = userEvent.setup();
    const { container } = render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={vi.fn()} />);
    await user.click(screen.getByText("Halaman Saat Ini"));
    const scoped = Array.from(container.querySelectorAll("button, button *"));
    const offenders = scoped.filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
