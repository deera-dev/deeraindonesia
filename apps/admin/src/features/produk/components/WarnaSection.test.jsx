import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WarnaSection from "./WarnaSection";

const warnaHasStokFalse = vi.fn(() => false);
const warnaHasStokTrue = vi.fn(() => true);

function renderSection(overrides = {}) {
  return render(
    <WarnaSection
      warna={[]}
      onAdd={vi.fn()}
      onRemove={vi.fn()}
      warnaHasStok={warnaHasStokFalse}
      saving={false}
      {...overrides}
    />
  );
}

describe("WarnaSection", () => {
  it("merender input dan tombol Tambah", () => {
    renderSection();
    expect(screen.getByPlaceholderText(/Hitam, Putih/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tambah" })).toBeInTheDocument();
  });

  it("menampilkan jumlah warna dalam label", () => {
    renderSection({ warna: ["HITAM", "MERAH"] });
    expect(screen.getByText(/\(2 warna\)/)).toBeInTheDocument();
  });

  it("chip warna tampil saat warna.length > 0", () => {
    renderSection({ warna: ["HITAM", "MERAH"] });
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  it("chip warna TIDAK tampil saat warna kosong", () => {
    renderSection({ warna: [] });
    expect(screen.queryByText("HITAM")).toBeNull();
  });

  it("footer summary tampil saat warna.length > 0", () => {
    renderSection({ warna: ["HITAM"] });
    // Footer menampilkan daftar nama warna (bukan jumlahnya — jumlah sudah
    // ditampilkan di label "(N warna)" di atas), lihat WarnaSection.jsx.
    expect(screen.getByText(/Seri penuh = HITAM/)).toBeInTheDocument();
  });

  it("footer summary TIDAK tampil saat warna kosong", () => {
    renderSection({ warna: [] });
    expect(screen.queryByText(/Seri penuh/)).toBeNull();
  });

  it("doAdd: panggil onAdd dengan value trimmed+uppercase & clear input", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderSection({ onAdd });
    const input = screen.getByPlaceholderText(/Hitam, Putih/);
    await user.type(input, "  navy  ");
    await user.click(screen.getByRole("button", { name: "Tambah" }));
    expect(onAdd).toHaveBeenCalledWith("NAVY");
    expect(input).toHaveValue("");
  });

  it("doAdd: TIDAK panggil onAdd saat value sudah ada (case-insensitive via toUpperCase) tapi tetap clear input", async () => {
    // Ketik "hitam" (lowercase) → button TIDAK disabled (warna.includes("hitam")=false)
    // → doAdd dipanggil → v="HITAM" → warna.includes("HITAM")=true → onAdd tidak dipanggil
    // → setWarnaInput("") → input dibersihkan
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderSection({ warna: ["HITAM"], onAdd });
    const input = screen.getByPlaceholderText(/Hitam, Putih/);
    await user.type(input, "hitam");
    await user.click(screen.getByRole("button", { name: "Tambah" }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });

  it("tombol Tambah disabled saat input hanya whitespace", async () => {
    const user = userEvent.setup();
    renderSection();
    const input = screen.getByPlaceholderText(/Hitam, Putih/);
    // Isi input non-kosong dulu lalu ganti ke whitespace
    await user.type(input, "A");
    fireEvent.change(input, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Tambah" })).toBeDisabled();
  });

  it("tombol Tambah disabled saat warna sudah ada (exact case match)", async () => {
    const user = userEvent.setup();
    renderSection({ warna: ["HITAM"] });
    await user.type(screen.getByPlaceholderText(/Hitam, Putih/), "HITAM");
    // warna.includes("HITAM") = true → disabled
    expect(screen.getByRole("button", { name: "Tambah" })).toBeDisabled();
  });

  it("Enter pada input memanggil doAdd (preventDefault & add)", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderSection({ onAdd });
    const input = screen.getByPlaceholderText(/Hitam, Putih/);
    await user.type(input, "PUTIH{Enter}");
    expect(onAdd).toHaveBeenCalledWith("PUTIH");
  });

  it("tombol Tambah disabled saat input kosong", () => {
    renderSection();
    expect(screen.getByRole("button", { name: "Tambah" })).toBeDisabled();
  });

  it("tombol Tambah disabled saat saving=true", async () => {
    const user = userEvent.setup();
    renderSection({ saving: true });
    await user.type(screen.getByPlaceholderText(/Hitam, Putih/), "BIRU");
    expect(screen.getByRole("button", { name: "Tambah" })).toBeDisabled();
  });

  it("klik tombol hapus warna memanggil onRemove(warna)", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderSection({ warna: ["HITAM", "MERAH"], onRemove });
    const hapusButtons = screen.getAllByRole("button", { name: "×" });
    await user.click(hapusButtons[0]);
    expect(onRemove).toHaveBeenCalledWith("HITAM");
  });

  it("tombol hapus warna disabled saat warnaHasStok(w) = true", () => {
    renderSection({ warna: ["HITAM"], warnaHasStok: warnaHasStokTrue });
    const hapusButton = screen.getByRole("button", { name: "×" });
    expect(hapusButton).toBeDisabled();
  });

  it("tombol hapus warna disabled saat saving=true", () => {
    renderSection({ warna: ["HITAM"], saving: true });
    const hapusButton = screen.getByRole("button", { name: "×" });
    expect(hapusButton).toBeDisabled();
  });

  it("tombol hapus warna memiliki title berbeda saat warnaHasStok true vs false", () => {
    const { rerender } = render(
      <WarnaSection
        warna={["HITAM"]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        warnaHasStok={warnaHasStokFalse}
        saving={false}
      />
    );
    const hapusBtn = screen.getByRole("button", { name: "×" });
    expect(hapusBtn).toHaveAttribute("title", "Hapus warna");

    rerender(
      <WarnaSection
        warna={["HITAM"]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        warnaHasStok={warnaHasStokTrue}
        saving={false}
      />
    );
    expect(hapusBtn).toHaveAttribute("title", "Tidak bisa dihapus — masih ada stok");
  });

  it("input warna baru bisa diketik dan ditambahkan", async () => {
    const onAdd = vi.fn();
    const { container } = render(
      <WarnaSection warna={[]} onAdd={onAdd} onRemove={vi.fn()} warnaHasStok={{}} saving={false} />
    );
    const input = container.querySelector("input");
    await userEvent.type(input, "BIRU");
    await userEvent.keyboard("{Enter}");
    expect(onAdd).toHaveBeenCalledWith("BIRU");
  });

  describe("rename warna", () => {
    it("klik ✎ membuka mode edit dengan input terisi nama saat ini", () => {
      renderSection({ warna: ["HITAM"] });
      fireEvent.click(screen.getByTitle("Ganti nama warna"));
      expect(screen.getByDisplayValue("HITAM")).toBeInTheDocument();
    });

    it("tombol ✎ disabled saat saving=true", () => {
      renderSection({ warna: ["HITAM"], saving: true });
      expect(screen.getByTitle("Ganti nama warna")).toBeDisabled();
    });

    it("commit rename valid memanggil onRename(old, baru) & menutup mode edit", () => {
      const onRename = vi.fn();
      renderSection({ warna: ["HITAM"], onRename });
      fireEvent.click(screen.getByTitle("Ganti nama warna"));
      fireEvent.change(screen.getByDisplayValue("HITAM"), { target: { value: "navy" } });
      fireEvent.click(screen.getByTitle("Simpan nama warna"));
      expect(onRename).toHaveBeenCalledWith("HITAM", "NAVY");
      expect(screen.queryByTitle("Simpan nama warna")).toBeNull();
    });

    it("Enter pada input edit memanggil commit yang sama", () => {
      const onRename = vi.fn();
      renderSection({ warna: ["HITAM"], onRename });
      fireEvent.click(screen.getByTitle("Ganti nama warna"));
      const input = screen.getByDisplayValue("HITAM");
      fireEvent.change(input, { target: { value: "navy" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onRename).toHaveBeenCalledWith("HITAM", "NAVY");
    });

    it("Escape membatalkan tanpa memanggil onRename", () => {
      const onRename = vi.fn();
      renderSection({ warna: ["HITAM"], onRename });
      fireEvent.click(screen.getByTitle("Ganti nama warna"));
      const input = screen.getByDisplayValue("HITAM");
      fireEvent.change(input, { target: { value: "navy" } });
      fireEvent.keyDown(input, { key: "Escape" });
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue("navy")).toBeNull();
    });

    it("klik × mode edit membatalkan tanpa memanggil onRename", () => {
      const onRename = vi.fn();
      renderSection({ warna: ["HITAM"], onRename });
      fireEvent.click(screen.getByTitle("Ganti nama warna"));
      fireEvent.click(screen.getByTitle("Batal ganti nama"));
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.getByText("HITAM")).toBeInTheDocument();
    });

    it("commit dengan nama sama (setelah trim+uppercase) menutup mode edit tanpa memanggil onRename", () => {
      const onRename = vi.fn();
      renderSection({ warna: ["HITAM"], onRename });
      fireEvent.click(screen.getByTitle("Ganti nama warna"));
      fireEvent.change(screen.getByDisplayValue("HITAM"), { target: { value: "  hitam  " } });
      fireEvent.click(screen.getByTitle("Simpan nama warna"));
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.queryByTitle("Simpan nama warna")).toBeNull();
    });

    it("input kosong menampilkan error 'Nama warna tidak boleh kosong'", () => {
      renderSection({ warna: ["HITAM"] });
      fireEvent.click(screen.getByTitle("Ganti nama warna"));
      fireEvent.change(screen.getByDisplayValue("HITAM"), { target: { value: "   " } });
      fireEvent.click(screen.getByTitle("Simpan nama warna"));
      expect(screen.getByText("Nama warna tidak boleh kosong")).toBeInTheDocument();
    });

    it("nama duplikat menampilkan error 'Nama warna sudah dipakai warna lain di produk ini'", () => {
      renderSection({ warna: ["HITAM", "MERAH"] });
      fireEvent.click(screen.getAllByTitle("Ganti nama warna")[0]);
      fireEvent.change(screen.getByDisplayValue("HITAM"), { target: { value: "merah" } });
      fireEvent.click(screen.getByTitle("Simpan nama warna"));
      expect(
        screen.getByText("Nama warna sudah dipakai warna lain di produk ini"),
      ).toBeInTheDocument();
    });

    it("mengetik ulang setelah error akan menghapus pesan error", () => {
      renderSection({ warna: ["HITAM"] });
      fireEvent.click(screen.getByTitle("Ganti nama warna"));
      const input = screen.getByDisplayValue("HITAM");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByTitle("Simpan nama warna"));
      expect(screen.getByText("Nama warna tidak boleh kosong")).toBeInTheDocument();
      fireEvent.change(input, { target: { value: "N" } });
      expect(screen.queryByText("Nama warna tidak boleh kosong")).toBeNull();
    });
  });
});
