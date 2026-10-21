import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TripTokoSection from "./TripTokoSection";

const trip = {
  daerah: [],
  toko: [
    { toko_id: "a", nama: "Toko Rendah", daerah: "BOGOR", dikunjungi: false },
    { toko_id: "b", nama: "Toko Tinggi", daerah: "BOGOR", dikunjungi: true },
  ],
};
const tokoList = [{ id: "a", skor: 55, prioritas: "B" }, { id: "b", skor: 90, prioritas: "A" }];

const openGroup = () => fireEvent.click(screen.getByText("BOGOR"));

describe("TripTokoSection", () => {
  it("menampilkan grup daerah, peringkat, dan prioritas", () => {
    render(<TripTokoSection trip={trip} tokoList={tokoList} save={vi.fn()} />);
    openGroup();
    expect(screen.getByText("BOGOR")).toBeInTheDocument();
    expect(screen.getByText("1/2 ▴")).toBeInTheDocument();
    const names = screen.getAllByText(/^Toko /).map((n) => n.textContent);
    expect(names.slice(0, 2)).toEqual(["Toko Tinggi", "Toko Rendah"]);
    expect(screen.getByLabelText("Prioritas A")).toBeInTheDocument();
  });
  it("grup tertutup secara default, bisa dibuka lalu diciutkan lagi", () => {
    render(<TripTokoSection trip={trip} tokoList={tokoList} save={vi.fn()} />);
    expect(screen.getByText("1/2 ▾")).toBeInTheDocument();
    expect(screen.queryByText("Toko Tinggi")).not.toBeInTheDocument();
    openGroup();
    expect(screen.getByText("Toko Tinggi")).toBeInTheDocument();
    openGroup();
    expect(screen.queryByText("Toko Tinggi")).not.toBeInTheDocument();
  });
  it("tanpa data opens: semua toko tampil 'Belum dibuka', ada link Bagikan per toko dgn trip_id/toko_id", () => {
    render(<TripTokoSection trip={{ ...trip, id: "trip1" }} tokoList={tokoList} save={vi.fn()} />);
    openGroup();
    expect(screen.getAllByText("Belum dibuka")).toHaveLength(2);
    const link = screen.getByLabelText("Bagikan katalog ke Toko Rendah");
    const url = decodeURIComponent(link.getAttribute("href"));
    expect(url).toContain("trip_id=trip1");
    expect(url).toContain("toko_id=a");
    expect(url).toContain("src=ngorder");
  });
  it("link Bagikan memakai link pendek & langsung ke nomor toko kalau ada", () => {
    const t2 = { ...trip, id: "trip1", toko: [{ ...trip.toko[0], link: "ab12cd" }] };
    render(<TripTokoSection trip={t2} tokoList={[{ id: "a", no_hp: "081234", media_sosial: "IG/TikTok @rendah.id" }]} save={vi.fn()} />);
    openGroup();
    const link = screen.getByLabelText("Bagikan katalog ke Toko Rendah");
    expect(link.getAttribute("href").startsWith("https://wa.me/6281234?text=")).toBe(true);
    expect(decodeURIComponent(link.getAttribute("href"))).toContain("https://deera.id/t/ab12cd");
    expect(link).toHaveTextContent("Kirim katalog ke WA toko");
    expect(screen.getByRole("link", { name: "IG @rendah.id" })).toHaveAttribute("href", "https://instagram.com/rendah.id");
    expect(screen.getByRole("link", { name: "TikTok @rendah.id" })).toBeInTheDocument();
  });
  it("nomor toko bisa diisi dan disimpan", async () => {
    const onSaveNoHp = vi.fn().mockResolvedValue();
    render(<TripTokoSection trip={{ ...trip, id: "trip1" }} tokoList={tokoList} save={vi.fn()} onSaveNoHp={onSaveNoHp} />);
    openGroup();
    fireEvent.click(screen.getAllByText("+ Nomor toko")[0]);
    fireEvent.change(screen.getByLabelText("Nomor Toko Tinggi"), { target: { value: "0812999" } });
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(onSaveNoHp).toHaveBeenCalledWith("b", "0812999"));
    await waitFor(() => expect(screen.queryByLabelText("Nomor Toko Tinggi")).not.toBeInTheDocument());
  });
  it("toko yang sudah membuka link ditandai 'Dibuka' beserta jumlah produk", () => {
    const opens = [{ toko_id: "b", first_opened_at: "2026-10-20T03:00:00Z", opens: 2, produk: ["D-1", "D-2"] }];
    render(<TripTokoSection trip={{ ...trip, id: "trip1" }} tokoList={tokoList} save={vi.fn()} opens={opens} />);
    openGroup();
    expect(screen.getByText("✓ Dibuka · 2 produk")).toBeInTheDocument();
    expect(screen.getByText("Belum dibuka")).toBeInTheDocument();
  });
});
