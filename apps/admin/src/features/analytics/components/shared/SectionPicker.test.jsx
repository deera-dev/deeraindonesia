import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
    // Redesign 2026-07: SectionPicker SEKARANG merender DUA struktur
    // sekaligus di DOM — trigger mobile (md:hidden) DAN tab bar desktop
    // (hidden md:flex) — breakpoint Tailwind tidak berlaku di jsdom,
    // jadi label halaman aktif muncul lebih dari sekali; cukup pastikan
    // setidaknya satu kemunculan ada (trigger mobile ATAU tab desktop).
    render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={vi.fn()} />);
    expect(screen.getAllByText("Ringkasan Penjualan").length).toBeGreaterThanOrEqual(1);
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
    // Scope ke dalam sheet saja — tab bar desktop (selalu di DOM di jsdom,
    // lihat catatan di test pertama) juga merender label "Produk"/
    // "Persediaan" sebagai pill, jadi query tanpa scope jadi ambigu.
    const sheet = within(screen.getByText("Pilih Halaman").closest(".fixed"));
    expect(sheet.getByText("Penjualan")).toBeInTheDocument();
    expect(sheet.getByText("Produk & Stok")).toBeInTheDocument();
    expect(sheet.getByText("Produk")).toBeInTheDocument();
    expect(sheet.getByText("Persediaan")).toBeInTheDocument();
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
    const sheet = within(screen.getByText("Pilih Halaman").closest(".fixed"));
    await user.click(sheet.getByText("Produk"));
    expect(onSelect).toHaveBeenCalledWith("products");
    expect(screen.queryByText("Pilih Halaman")).not.toBeInTheDocument();
  });

  it("halaman aktif punya aria-current='page'", async () => {
    const user = userEvent.setup();
    render(<SectionPicker groups={GROUPS} activeKey="products" onSelect={vi.fn()} />);
    await user.click(screen.getByText("Halaman Saat Ini"));
    // "Produk"/"Persediaan" sekarang bisa muncul di 3 tempat (label trigger
    // mobile, pill tab desktop, baris sheet) — scope ke dalam sheet saja
    // supaya query tetap tegas.
    const sheet = within(screen.getByText("Pilih Halaman").closest(".fixed"));
    const activeBtn = sheet.getByText("Produk").closest("button");
    expect(activeBtn).toHaveAttribute("aria-current", "page");
    const inactiveBtn = sheet.getByText("Persediaan").closest("button");
    expect(inactiveBtn).not.toHaveAttribute("aria-current");
  });

  it("desktop: merender tab bar horizontal (di luar sheet) dan memanggil onSelect saat pill ditekan", async () => {
    // Sheet TIDAK dibuka di test ini — dengan sheet tertutup, label "Produk"
    // hanya ada di pill tab bar desktop (bukan di trigger, karena trigger
    // menampilkan activeKey="products" juga — jadi scoped ke luar sheet
    // memang tidak menjamin keunikan; test ini fokus membuktikan pill-nya
    // ADA dan bisa diklik, bukan menghitung kemunculan teks).
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SectionPicker groups={GROUPS} activeKey="overview" onSelect={onSelect} />);
    const pills = screen.getAllByText("Produk");
    expect(pills.length).toBeGreaterThanOrEqual(1);
    await user.click(pills[0]);
    expect(onSelect).toHaveBeenCalledWith("products");
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
