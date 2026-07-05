import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Section,
  Pill,
  ChangeRow,
  ProdukDiff,
  TransferDiff,
  StokDiff,
} from "./HistoryDiffs";

describe("Section", () => {
  it("menampilkan judul dan children", () => {
    render(<Section title="Perubahan"><span>isi</span></Section>);
    expect(screen.getByText("Perubahan")).toBeInTheDocument();
    expect(screen.getByText("isi")).toBeInTheDocument();
  });
});

describe("Pill", () => {
  it("menampilkan children", () => {
    render(<Pill>Midi</Pill>);
    expect(screen.getByText("Midi")).toBeInTheDocument();
  });

  it("menerima className tambahan", () => {
    const { container } = render(<Pill className="capitalize">Status</Pill>);
    expect(container.firstChild.className).toContain("capitalize");
  });
});

describe("ChangeRow", () => {
  it("menampilkan label, before, dan after", () => {
    render(<ChangeRow label="Nama" before="Lama" after="Baru" />);
    expect(screen.getByText("Nama")).toBeInTheDocument();
    expect(screen.getByText("Lama")).toBeInTheDocument();
    expect(screen.getByText("Baru")).toBeInTheDocument();
  });

  it("afterRed=false: after pakai kelas green (default)", () => {
    render(<ChangeRow label="L" before="X" after="Y" />);
    expect(screen.getByText("Y").className).toContain("text-green");
  });

  it("afterRed=true: after pakai kelas red", () => {
    render(<ChangeRow label="L" before="X" after="dihapus" afterRed />);
    expect(screen.getByText("dihapus").className).toContain("text-red");
  });
});

describe("ProdukDiff", () => {
  it("null saat before dan after keduanya falsy", () => {
    const { container } = render(<ProdukDiff before={null} after={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("summary view saat before null (produk baru)", () => {
    const after = {
      bahan: "Ceruti",
      hpp: 100000,
      variants: [{ size: "Midi", harga: 150000 }],
      warna: ["HITAM"],
    };
    render(<ProdukDiff before={null} after={after} />);
    expect(screen.getByText("Ceruti")).toBeInTheDocument();
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
  });

  it("tampil 'tidak ada perubahan' saat semua field identik", () => {
    const prod = { nama: "X", bahan: "Y", hpp: 0, variants: [], warna: [] };
    render(<ProdukDiff before={prod} after={prod} />);
    expect(screen.getByText(/tidak ada perubahan/i)).toBeInTheDocument();
  });

  it("menampilkan perubahan field nama, bahan, hpp", () => {
    const before = { nama: "Lama", bahan: "Katun", hpp: 50000, variants: [], warna: [] };
    const after  = { nama: "Baru", bahan: "Ceruti", hpp: 75000, variants: [], warna: [] };
    render(<ProdukDiff before={before} after={after} />);
    expect(screen.getByText("Nama")).toBeInTheDocument();
    expect(screen.getByText("Lama")).toBeInTheDocument();
    expect(screen.getByText("Baru")).toBeInTheDocument();
    expect(screen.getByText("Bahan")).toBeInTheDocument();
  });

  it("perubahan variant: removed=dihapus, added=before dash", () => {
    const before = {
      nama: "X", bahan: "Y", hpp: 0,
      variants: [{ size: "Midi", harga: 100000 }, { size: "Gamis", harga: 130000 }],
      warna: [],
    };
    const after = {
      nama: "X", bahan: "Y", hpp: 0,
      variants: [{ size: "Midi", harga: 120000 }, { size: "Midi Jumbo", harga: 140000 }],
      warna: [],
    };
    render(<ProdukDiff before={before} after={after} />);
    expect(screen.getByText("dihapus")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("menampilkan perubahan warna", () => {
    const before = { nama: "X", bahan: "Y", hpp: 0, variants: [], warna: ["HITAM"] };
    const after  = { nama: "X", bahan: "Y", hpp: 0, variants: [], warna: ["MERAH"] };
    render(<ProdukDiff before={before} after={after} />);
    expect(screen.getByText("Warna")).toBeInTheDocument();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  it("bahan null dan hpp null di after: tidak render Info Produk", () => {
    const after = { bahan: null, hpp: null, variants: [], warna: [] };
    const { queryByText } = render(<ProdukDiff before={null} after={after} />);
    expect(queryByText("Info Produk")).not.toBeInTheDocument();
  });
});

describe("TransferDiff", () => {
  it("menampilkan lokasi from dan to serta total qty", () => {
    const snap = {
      from_location: "gudang",
      to_location: "cideng",
      items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 5 }],
      status: "approved",
    };
    render(<TransferDiff before={null} after={snap} />);
    expect(screen.getByText(/Gudang/)).toBeInTheDocument();
    expect(screen.getByText(/Cideng/)).toBeInTheDocument();
    expect(screen.getAllByText(/5 pcs/).length).toBeGreaterThan(0);
  });

  it("menampilkan catatan jika ada", () => {
    const snap = { from_location: "gudang", to_location: "tegalgubug", items: [], notes: "Kiriman hari ini" };
    render(<TransferDiff before={null} after={snap} />);
    expect(screen.getByText("Kiriman hari ini")).toBeInTheDocument();
  });

  it("approved_by tampil saat action=transfer-approve", () => {
    const snap = { from_location: "gudang", to_location: "cideng", items: [], approved_by: "admin@deera.id" };
    render(<TransferDiff before={null} after={snap} action="transfer-approve" />);
    expect(screen.getByText(/admin@deera\.id/)).toBeInTheDocument();
  });

  it("rejected_by tampil saat action=transfer-reject", () => {
    const snap = { from_location: "gudang", to_location: "cideng", items: [], rejected_by: "kasir@deera.id" };
    render(<TransferDiff before={null} after={snap} action="transfer-reject" />);
    expect(screen.getByText(/kasir@deera\.id/)).toBeInTheDocument();
  });

  it("menampilkan item dengan warna bukan underscore", () => {
    const snap = {
      from_location: "gudang", to_location: "cideng",
      items: [{ kode: "D-02-SFN", size: "Gamis", warna: "BIRU", qty: 3 }],
    };
    render(<TransferDiff before={null} after={snap} />);
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
    expect(screen.getByText("BIRU")).toBeInTheDocument();
    expect(screen.getAllByText("3 pcs").length).toBeGreaterThan(0);
  });

  it("tidak menampilkan warna underscore", () => {
    const snap = {
      from_location: "gudang", to_location: "cideng",
      items: [{ kode: "D-03-OSK", size: "Midi", warna: "_", qty: 2 }],
    };
    render(<TransferDiff before={null} after={snap} />);
    expect(screen.queryByText("_")).not.toBeInTheDocument();
  });

  it("fallback ke before saat after null", () => {
    const before = {
      from_location: "cideng", to_location: "tegalgubug",
      items: [{ kode: "D-04-OSK", size: "Gamis Jumbo", warna: "_", qty: 1 }],
    };
    render(<TransferDiff before={before} after={null} />);
    expect(screen.getByText(/Cideng/)).toBeInTheDocument();
    expect(screen.getByText(/Tegalgubug/)).toBeInTheDocument();
  });
});

describe("StokDiff", () => {
  it("null saat aRows kosong", () => {
    const { container } = render(<StokDiff before={null} after={{ rows: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan perubahan stok dan diff positif", () => {
    const before = { rows: [{ size: "Midi", warna: "_", gudang: 5, cideng: 3, tegalgubug: 2 }] };
    const after  = { rows: [{ size: "Midi", warna: "_", gudang: 8, cideng: 3, tegalgubug: 2 }] };
    render(<StokDiff before={before} after={after} />);
    expect(screen.getByText(/13 pcs/)).toBeInTheDocument();
    expect(screen.getByText("(+3)")).toBeInTheDocument();
  });

  it("menampilkan warna saat warna bukan underscore", () => {
    const after = { rows: [{ size: "Midi", warna: "HITAM", gudang: 2, cideng: 0, tegalgubug: 0 }] };
    render(<StokDiff before={{ rows: [] }} after={after} />);
    expect(screen.getByText("HITAM")).toBeInTheDocument();
  });

  it("tidak menampilkan warna underscore", () => {
    const after = { rows: [{ size: "Midi", warna: "_", gudang: 1, cideng: 0, tegalgubug: 0 }] };
    render(<StokDiff before={{ rows: [] }} after={after} />);
    expect(screen.queryByText("_")).not.toBeInTheDocument();
  });

  it("diff negatif tampil dengan minus", () => {
    const before = { rows: [{ size: "Gamis", warna: "_", gudang: 10, cideng: 0, tegalgubug: 0 }] };
    const after  = { rows: [{ size: "Gamis", warna: "_", gudang: 7,  cideng: 0, tegalgubug: 0 }] };
    render(<StokDiff before={before} after={after} />);
    expect(screen.getByText("(-3)")).toBeInTheDocument();
  });

  it("tidak menampilkan diff saat nilai sama", () => {
    const rows = [{ size: "Midi", warna: "_", gudang: 5, cideng: 0, tegalgubug: 0 }];
    render(<StokDiff before={{ rows }} after={{ rows }} />);
    expect(screen.queryByText(/\(\+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(-/)).not.toBeInTheDocument();
  });
});
