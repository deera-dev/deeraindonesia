import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PengirimanForm from "./PengirimanForm";

const createPengirimanMock = vi.fn();
const updatePengirimanMock = vi.fn();
vi.mock("../hooks", () => ({
  useCreatePengiriman: () => createPengirimanMock,
  useUpdatePengiriman: () => updatePengirimanMock,
}));

// Daftar penerima (autocomplete, permintaan Denny 2026-08) — reuse
// "../../pelanggan" punya admin, di-mock supaya test tidak menyentuh
// Supabase sungguhan.
const searchPelangganMock = vi.fn();
vi.mock("../../pelanggan", () => ({
  searchPelanggan: (...args) => searchPelangganMock(...args),
}));

// Helper kecil: isi field by label text (getByLabelText tidak dipakai krn
// label di sini bukan <label htmlFor>, tapi <label> pembungkus visual biasa)
function getInputByPlaceholder(placeholder) {
  return screen.getByPlaceholderText(placeholder);
}

describe("PengirimanForm", () => {
  beforeEach(() => {
    createPengirimanMock.mockReset();
    updatePengirimanMock.mockReset();
    searchPelangganMock.mockReset().mockResolvedValue([]);
  });

  it("mode buat baru: judul 'Pengiriman Baru'", () => {
    render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);
    expect(screen.getByText("Pengiriman Baru")).toBeInTheDocument();
  });

  it("mode edit: judul 'Edit Pengiriman' & field ter-prefill dari initialData", () => {
    render(
      <PengirimanForm
        initialData={{
          id: "pg1",
          tanggal: "2026-08-20",
          nama_penerima: "Budi",
          no_telp_penerima: "0812",
          jumlah_karung: 3,
          isi_karung: "Gamis",
          nama_ekspedisi: "JNE",
          nama_pengirim: "Siti",
        }}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByText("Edit Pengiriman")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Budi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("JNE")).toBeInTheDocument();
  });

  it("submit mode buat baru memanggil useCreatePengiriman dengan payload benar", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    createPengirimanMock.mockResolvedValue({ id: "pg-new", pengiriman_no: "KRM-1" });

    render(<PengirimanForm onClose={() => {}} onSaved={onSaved} />);

    await user.type(getInputByPlaceholder("Nama penerima barang"), "Budi Santoso");
    await user.type(getInputByPlaceholder("08xx-xxxx-xxxx"), "081234567");
    await user.type(getInputByPlaceholder("mis. 5"), "4");
    await user.type(getInputByPlaceholder("mis. JNE, J&T"), "JNE");
    await user.type(
      getInputByPlaceholder("mis. Gamis dan mukena campur"),
      "Gamis dan mukena",
    );
    await user.click(screen.getByText("Manual"));
    await user.type(getInputByPlaceholder("Nama yang mengirim barang"), "Siti");

    await user.click(screen.getByText("Simpan"));

    await waitFor(() => expect(createPengirimanMock).toHaveBeenCalledTimes(1));
    // Semua field teks di-uppercase otomatis saat diketik (permintaan Denny
    // 2026-08 "semua bagian uppercase, dari input sampai jadi image").
    expect(createPengirimanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        namaPenerima: "BUDI SANTOSO",
        noTelpPenerima: "081234567",
        jumlahKarung: 4,
        namaEkspedisi: "JNE",
        isiKarung: "GAMIS DAN MUKENA",
        namaPengirim: "SITI",
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: "pg-new", pengiriman_no: "KRM-1" }));
  });

  it("submit mode edit memanggil useUpdatePengiriman, bukan create", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    updatePengirimanMock.mockResolvedValue(undefined);

    const initialData = {
      id: "pg1",
      tanggal: "2026-08-20",
      nama_penerima: "Budi",
      no_telp_penerima: "0812",
      jumlah_karung: 3,
      isi_karung: "Gamis",
      nama_ekspedisi: "JNE",
      nama_pengirim: "Siti",
    };
    render(<PengirimanForm initialData={initialData} onClose={() => {}} onSaved={onSaved} />);

    await user.click(screen.getByText("Simpan"));

    await waitFor(() => expect(updatePengirimanMock).toHaveBeenCalledTimes(1));
    expect(createPengirimanMock).not.toHaveBeenCalled();
    expect(updatePengirimanMock).toHaveBeenCalledWith(
      initialData,
      expect.objectContaining({ namaPenerima: "Budi" }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("menampilkan pesan error saat create gagal (tidak memanggil onSaved)", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    createPengirimanMock.mockRejectedValue(new Error("Nama ekspedisi wajib diisi."));

    render(<PengirimanForm onClose={() => {}} onSaved={onSaved} />);
    await user.type(getInputByPlaceholder("Nama penerima barang"), "Budi");
    await user.type(getInputByPlaceholder("mis. 5"), "2");
    await user.type(getInputByPlaceholder("mis. JNE, J&T"), "JNE");
    // Pengirim default DEERA — tidak perlu isi apapun lagi (bukan Manual).

    await user.click(screen.getByText("Simpan"));

    await waitFor(() => expect(screen.getByText("Nama ekspedisi wajib diisi.")).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("memanggil onClose saat tombol Batal atau ✕ diklik", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PengirimanForm onClose={onClose} onSaved={() => {}} />);

    await user.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("memanggil onClose saat backdrop diklik", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<PengirimanForm onClose={onClose} onSaved={() => {}} />);
    const backdrop = container.querySelector(".absolute.inset-0");
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("merender field Alamat", () => {
    render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);
    expect(getInputByPlaceholder("Alamat lengkap penerima (opsional)")).toBeInTheDocument();
  });

  describe("uppercase otomatis saat mengetik (permintaan Denny 2026-08 'semua bagian uppercase')", () => {
    it("Nama Penerima, No Telp, Alamat, Ekspedisi, Isi Karung, Nama Pengirim manual semua jadi UPPERCASE", async () => {
      const user = userEvent.setup();
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);

      await user.type(getInputByPlaceholder("Nama penerima barang"), "budi santoso");
      await user.type(getInputByPlaceholder("08xx-xxxx-xxxx"), "08xx-abc");
      await user.type(getInputByPlaceholder("Alamat lengkap penerima (opsional)"), "jl. mawar no. 1");
      await user.type(getInputByPlaceholder("mis. JNE, J&T"), "jne");
      await user.type(getInputByPlaceholder("mis. Gamis dan mukena campur"), "gamis campur");
      await user.click(screen.getByText("Manual"));
      await user.type(getInputByPlaceholder("Nama yang mengirim barang"), "siti");

      expect(getInputByPlaceholder("Nama penerima barang")).toHaveValue("BUDI SANTOSO");
      expect(getInputByPlaceholder("08xx-xxxx-xxxx")).toHaveValue("08XX-ABC");
      expect(getInputByPlaceholder("Alamat lengkap penerima (opsional)")).toHaveValue("JL. MAWAR NO. 1");
      expect(getInputByPlaceholder("mis. JNE, J&T")).toHaveValue("JNE");
      expect(getInputByPlaceholder("mis. Gamis dan mukena campur")).toHaveValue("GAMIS CAMPUR");
      expect(getInputByPlaceholder("Nama yang mengirim barang")).toHaveValue("SITI");
    });
  });

  describe("autocomplete daftar penerima (reuse pelanggan, permintaan Denny 2026-08)", () => {
    const pelangganMatch = {
      id: "pel-1",
      nama: "Budi Santoso",
      no_hp: "081234567",
      alamat: "Jl. Mawar No. 1",
      ekspedisi_biasa: "JNE",
    };

    it("mengetik Nama Penerima memanggil searchPelanggan & menampilkan saran", async () => {
      searchPelangganMock.mockResolvedValue([pelangganMatch]);
      const user = userEvent.setup();
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);

      await user.type(getInputByPlaceholder("Nama penerima barang"), "Budi");

      // Nama Penerima di-uppercase saat diketik ("BUDI"), jadi searchPelanggan
      // dipanggil dgn nilai uppercase itu.
      await waitFor(() => expect(searchPelangganMock).toHaveBeenCalledWith("BUDI"), { timeout: 2000 });
      await waitFor(() => expect(screen.getByText("Jl. Mawar No. 1")).toBeInTheDocument(), {
        timeout: 2000,
      });
    });

    it("klik saran mengisi No Telp/Alamat & set link (badge 'Terhubung ke daftar penerima')", async () => {
      searchPelangganMock.mockResolvedValue([pelangganMatch]);
      const user = userEvent.setup();
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);

      await user.type(getInputByPlaceholder("Nama penerima barang"), "Budi");
      await waitFor(() => expect(screen.getByText("Jl. Mawar No. 1")).toBeInTheDocument(), {
        timeout: 2000,
      });

      await user.click(screen.getByText("Jl. Mawar No. 1"));

      // Field yang di-prefill dari saran juga ikut di-uppercase saat di-set.
      expect(getInputByPlaceholder("Nama penerima barang")).toHaveValue("BUDI SANTOSO");
      expect(getInputByPlaceholder("08xx-xxxx-xxxx")).toHaveValue("081234567");
      expect(getInputByPlaceholder("Alamat lengkap penerima (opsional)")).toHaveValue("JL. MAWAR NO. 1");
      expect(getInputByPlaceholder("mis. JNE, J&T")).toHaveValue("JNE");
      expect(screen.getByText("✓ Terhubung ke daftar penerima")).toBeInTheDocument();
    });

    it("submit setelah pilih saran mengirim pelangganId & alamat ke createPengiriman", async () => {
      searchPelangganMock.mockResolvedValue([pelangganMatch]);
      createPengirimanMock.mockResolvedValue({ id: "pg-new", pengiriman_no: "KRM-1" });
      const user = userEvent.setup();
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);

      await user.type(getInputByPlaceholder("Nama penerima barang"), "Budi");
      await waitFor(() => expect(screen.getByText("Jl. Mawar No. 1")).toBeInTheDocument(), {
        timeout: 2000,
      });
      await user.click(screen.getByText("Jl. Mawar No. 1"));

      await user.type(getInputByPlaceholder("mis. 5"), "3");
      // Pengirim default DEERA — tidak perlu isi apapun lagi.
      await user.click(screen.getByText("Simpan"));

      await waitFor(() => expect(createPengirimanMock).toHaveBeenCalledTimes(1));
      expect(createPengirimanMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pelangganId: "pel-1",
          alamat: "JL. MAWAR NO. 1",
          namaEkspedisi: "JNE",
          namaPengirim: "DEERA",
        }),
      );
    });

    it("mengedit nama penerima setelah pilih saran melepas link (pelangganId direset ke null)", async () => {
      searchPelangganMock.mockResolvedValue([pelangganMatch]);
      createPengirimanMock.mockResolvedValue({ id: "pg-new" });
      const user = userEvent.setup();
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);

      await user.type(getInputByPlaceholder("Nama penerima barang"), "Budi");
      await waitFor(() => expect(screen.getByText("Jl. Mawar No. 1")).toBeInTheDocument(), {
        timeout: 2000,
      });
      await user.click(screen.getByText("Jl. Mawar No. 1"));
      expect(screen.getByText("✓ Terhubung ke daftar penerima")).toBeInTheDocument();

      searchPelangganMock.mockResolvedValue([]);
      await user.type(getInputByPlaceholder("Nama penerima barang"), " Lain");

      expect(screen.queryByText("✓ Terhubung ke daftar penerima")).not.toBeInTheDocument();
    });

    it("mode edit: prefill alamat & badge link dari initialData.pelanggan_id", () => {
      render(
        <PengirimanForm
          initialData={{
            id: "pg1",
            tanggal: "2026-08-20",
            nama_penerima: "Budi",
            no_telp_penerima: "0812",
            alamat: "Jl. Lama No. 9",
            pelanggan_id: "pel-lama",
            jumlah_karung: 3,
            isi_karung: "Gamis",
            nama_ekspedisi: "JNE",
            nama_pengirim: "Siti",
          }}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      );
      expect(getInputByPlaceholder("Alamat lengkap penerima (opsional)")).toHaveValue("Jl. Lama No. 9");
      expect(screen.getByText("✓ Terhubung ke daftar penerima")).toBeInTheDocument();
    });
  });

  describe("selector Pengirim (DEERA/MARYAM/Manual, permintaan Denny 2026-08)", () => {
    function isActive(el) {
      return el.className.includes("bg-[#CAB170]");
    }

    it("mode buat baru: default DEERA aktif, tanpa input teks tambahan", () => {
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);
      expect(isActive(screen.getByText("DEERA"))).toBe(true);
      expect(isActive(screen.getByText("MARYAM"))).toBe(false);
      expect(screen.queryByPlaceholderText("Nama yang mengirim barang")).not.toBeInTheDocument();
      expect(screen.getByText(/Logo DEERA akan dipakai/)).toBeInTheDocument();
    });

    it("klik MARYAM: aktif, tanpa input teks tambahan, hint logo MARYAM", async () => {
      const user = userEvent.setup();
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);

      await user.click(screen.getByText("MARYAM"));

      expect(isActive(screen.getByText("MARYAM"))).toBe(true);
      expect(isActive(screen.getByText("DEERA"))).toBe(false);
      expect(screen.queryByPlaceholderText("Nama yang mengirim barang")).not.toBeInTheDocument();
      expect(screen.getByText(/Logo MARYAM akan dipakai/)).toBeInTheDocument();
    });

    it("klik Manual: muncul input teks wajib, tanpa hint logo", async () => {
      const user = userEvent.setup();
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);

      await user.click(screen.getByText("Manual"));

      expect(isActive(screen.getByText("Manual"))).toBe(true);
      expect(screen.getByPlaceholderText("Nama yang mengirim barang")).toBeRequired();
      expect(screen.queryByText(/Logo DEERA akan dipakai/)).not.toBeInTheDocument();
    });

    it("submit dgn MARYAM dipilih mengirim namaPengirim 'MARYAM CIDENG'", async () => {
      const user = userEvent.setup();
      createPengirimanMock.mockResolvedValue({ id: "pg-new" });
      render(<PengirimanForm onClose={() => {}} onSaved={() => {}} />);

      await user.type(getInputByPlaceholder("Nama penerima barang"), "Budi");
      await user.type(getInputByPlaceholder("mis. 5"), "2");
      await user.type(getInputByPlaceholder("mis. JNE, J&T"), "JNE");
      await user.click(screen.getByText("MARYAM"));
      await user.click(screen.getByText("Simpan"));

      await waitFor(() => expect(createPengirimanMock).toHaveBeenCalledTimes(1));
      expect(createPengirimanMock).toHaveBeenCalledWith(
        expect.objectContaining({ namaPengirim: "MARYAM CIDENG" }),
      );
    });

    it("mode edit dgn nama_pengirim 'MARYAM CIDENG' → tombol MARYAM otomatis aktif, tanpa input manual", () => {
      render(
        <PengirimanForm
          initialData={{
            id: "pg1",
            tanggal: "2026-08-20",
            nama_penerima: "Budi",
            jumlah_karung: 3,
            nama_ekspedisi: "JNE",
            nama_pengirim: "MARYAM CIDENG",
          }}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      );
      expect(isActive(screen.getByText("MARYAM"))).toBe(true);
      expect(screen.queryByPlaceholderText("Nama yang mengirim barang")).not.toBeInTheDocument();
    });

    it("mode edit dgn nama_pengirim 'DEERA' → tombol DEERA otomatis aktif, tanpa input manual", () => {
      render(
        <PengirimanForm
          initialData={{
            id: "pg1",
            tanggal: "2026-08-20",
            nama_penerima: "Budi",
            jumlah_karung: 3,
            nama_ekspedisi: "JNE",
            nama_pengirim: "DEERA",
          }}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      );
      expect(isActive(screen.getByText("DEERA"))).toBe(true);
      expect(screen.queryByPlaceholderText("Nama yang mengirim barang")).not.toBeInTheDocument();
    });

    it("mode edit dgn nama_pengirim custom (bukan DEERA/MARYAM) → otomatis Manual & ter-prefill", () => {
      render(
        <PengirimanForm
          initialData={{
            id: "pg1",
            tanggal: "2026-08-20",
            nama_penerima: "Budi",
            jumlah_karung: 3,
            nama_ekspedisi: "JNE",
            nama_pengirim: "Siti",
          }}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      );
      expect(isActive(screen.getByText("Manual"))).toBe(true);
      expect(screen.getByPlaceholderText("Nama yang mengirim barang")).toHaveValue("Siti");
    });
  });

  describe("prefillPelanggan (dari 'Daftar Penerima', permintaan Denny 2026-08)", () => {
    const prefillPelanggan = {
      id: "pel-9",
      nama: "budi lengkap",
      no_hp: "081999999",
      alamat: "jl. lengkap no. 9",
      ekspedisi_biasa: "jne",
    };

    it("mode buat baru dgn prefillPelanggan: field ter-isi uppercase & ter-link (pelangganId)", async () => {
      const user = userEvent.setup();
      createPengirimanMock.mockResolvedValue({ id: "pg-new" });
      render(<PengirimanForm prefillPelanggan={prefillPelanggan} onClose={() => {}} onSaved={() => {}} />);

      expect(getInputByPlaceholder("Nama penerima barang")).toHaveValue("BUDI LENGKAP");
      expect(getInputByPlaceholder("08xx-xxxx-xxxx")).toHaveValue("081999999");
      expect(getInputByPlaceholder("Alamat lengkap penerima (opsional)")).toHaveValue("JL. LENGKAP NO. 9");
      expect(getInputByPlaceholder("mis. JNE, J&T")).toHaveValue("JNE");
      expect(screen.getByText("✓ Terhubung ke daftar penerima")).toBeInTheDocument();

      await user.type(getInputByPlaceholder("mis. 5"), "2");
      await user.click(screen.getByText("Simpan"));

      await waitFor(() => expect(createPengirimanMock).toHaveBeenCalledTimes(1));
      expect(createPengirimanMock).toHaveBeenCalledWith(
        expect.objectContaining({ pelangganId: "pel-9", namaPenerima: "BUDI LENGKAP" }),
      );
    });

    it("initialData (mode edit) diprioritaskan, prefillPelanggan diabaikan", () => {
      render(
        <PengirimanForm
          initialData={{
            id: "pg1",
            tanggal: "2026-08-20",
            nama_penerima: "Nama Asli",
            jumlah_karung: 3,
            nama_ekspedisi: "JNE",
            nama_pengirim: "DEERA",
          }}
          prefillPelanggan={prefillPelanggan}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      );
      expect(getInputByPlaceholder("Nama penerima barang")).toHaveValue("Nama Asli");
    });
  });
});
