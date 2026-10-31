import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../hooks", async () => ({ ...(await vi.importActual("../utils")) }));

import RencanaList from "./RencanaList";

const tokoById = new Map([
  ["t1", { id: "t1", nama: "Toko A", daerah: "TEGAL", lat: 1, lng: 2 }],
  ["t2", { id: "t2", nama: "Toko B", daerah: "CIREBON" }],
]);

describe("RencanaList", () => {
  it("kosong → ajakan memilih toko", () => {
    render(
      <RencanaList
        rows={[]}
        tokoById={tokoById}
        onFeedback={vi.fn()}
        onRemove={vi.fn()}
        onFocus={vi.fn()}
        onOpenToko={vi.fn()}
      />,
    );
    expect(screen.getByText(/Belum ada toko di rencana/)).toBeInTheDocument();
  });

  it("menampilkan status, catatan, pemilih, dan aksi tiap toko", () => {
    const onFeedback = vi.fn();
    const onRemove = vi.fn();
    const onFocus = vi.fn();
    const rows = [
      { id: "k1", toko_id: "t1", status: "rencana", dipilih_oleh_nama: "Denny", created_at: "1" },
      {
        id: "k2",
        toko_id: "t2",
        status: "berlangsung",
        hasil: "Ketemu owner",
        request: "Warna maroon",
        created_at: "2",
      },
      { id: "k3", toko_id: "t-hilang", status: "rencana", created_at: "3" },
    ];
    render(
      <RencanaList
        rows={rows}
        tokoById={tokoById}
        onFeedback={onFeedback}
        onRemove={onRemove}
        onFocus={onFocus}
        onOpenToko={vi.fn()}
      />,
    );

    expect(screen.getByText("Sedang dikunjungi")).toBeInTheDocument();
    expect(screen.getByText("Ketemu owner")).toBeInTheDocument();
    expect(screen.getByText("Warna maroon")).toBeInTheDocument();
    expect(screen.getByText("Dipilih Denny")).toBeInTheDocument();
    expect(screen.getByText(/belum ada titik/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Lihat di peta" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Mulai / catat" }));
    expect(onFeedback).toHaveBeenCalledWith(rows[0]);
    fireEvent.click(screen.getByRole("button", { name: "Lihat di peta" }));
    expect(onFocus).toHaveBeenCalledWith(tokoById.get("t1"));
    fireEvent.click(screen.getAllByRole("button", { name: "Keluarkan" })[0]);
    expect(onRemove).toHaveBeenCalledWith(rows[1]);
  });

  it("dengan jarak dari Terdekat: diurutkan terdekat dan menampilkan km", () => {
    const rows = [
      { id: "k1", toko_id: "t1", status: "rencana", created_at: "1" },
      { id: "k2", toko_id: "t2", status: "rencana", created_at: "2" },
    ];
    const jarak = new Map([
      ["t1", { distanceKm: 9.2, durationMin: 25 }],
      ["t2", { distanceKm: 2.8, durationMin: 10 }],
    ]);
    render(
      <RencanaList
        rows={rows}
        tokoById={tokoById}
        jarakByToko={jarak}
        onFeedback={vi.fn()}
        onRemove={vi.fn()}
        onFocus={vi.fn()}
        onOpenToko={vi.fn()}
      />,
    );
    const names = screen.getAllByText(/^Toko [AB]$/).map((el) => el.textContent);
    expect(names).toEqual(["Toko B", "Toko A"]);
    expect(screen.getByText("2.8 km · 10 mnt dari lokasi Anda")).toBeInTheDocument();
  });
});
