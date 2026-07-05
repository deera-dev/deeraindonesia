/**
 * PelangganPage.jsx — Halaman manajemen pelanggan POS.
 *
 * Tanggung jawab: state UI (search, mode, selected, saving, deleteConf) +
 * orkestrasi hook. Form diekstrak ke components/PelangganForm.jsx.
 */
import { useState } from "react";
import { usePelanggan, addPelanggan, updatePelanggan, deletePelanggan } from "../hooks";
import PelangganForm from "../components/PelangganForm";

export default function Pelanggan() {
  const { pelanggan, loading, reload } = usePelanggan();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("list"); // 'list' | 'add' | 'edit'
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConf, setDeleteConf] = useState(null);

  const filtered = pelanggan.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.nama.toLowerCase().includes(q) || (p.no_hp ?? "").includes(q);
  });

  async function handleAdd(data) {
    setSaving(true);
    await addPelanggan(data);
    setSaving(false);
    setMode("list");
    reload();
  }

  async function handleEdit(data) {
    setSaving(true);
    await updatePelanggan(selected.id, data);
    setSaving(false);
    setMode("list");
    setSelected(null);
    reload();
  }

  async function handleDelete(id) {
    setSaving(true);
    await deletePelanggan(id);
    setSaving(false);
    setDeleteConf(null);
    reload();
  }

  if (mode === "add" || mode === "edit") {
    return (
      <div className="flex flex-col h-[calc(100dvh-108px)] overflow-y-auto bg-skin-page">
        <div className="bg-skin-card border-b-2 border-skin-bdr px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => {
              setMode("list");
              setSelected(null);
            }}
            className="text-skin-text3 hover:text-skin-text text-lg leading-none"
          >
            ←
          </button>
          <h2 className="text-xl text-skin-text">
            {mode === "add" ? "Tambah Pelanggan" : "Edit Pelanggan"}
          </h2>
        </div>
        <div className="p-4 max-w-lg">
          <PelangganForm
            initial={selected}
            onSave={mode === "add" ? handleAdd : handleEdit}
            onCancel={() => {
              setMode("list");
              setSelected(null);
            }}
            saving={saving}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-108px)] overflow-y-auto bg-skin-page">
      {/* Toolbar */}
      <div className="bg-skin-card border-b-2 border-skin-bdr px-4 py-3 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau no HP..."
          className="flex-1 bg-skin-page border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
        />
        <button
          onClick={() => setMode("add")}
          className="px-5 py-3 bg-[#CAB170] text-white text-sm tracking-[0.15em] uppercase hover:bg-[#A8925A] transition flex-shrink-0"
        >
          Tambah
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3">
        <p className="text-sm text-skin-text3">{pelanggan.length} pelanggan terdaftar</p>
      </div>

      {/* List */}
      <div className="px-4 pb-8 flex flex-col gap-2">
        {loading && <p className="text-center text-base text-skin-text3 py-10">Memuat...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-base text-skin-text4 py-10">
            {search ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}
          </p>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className="bg-skin-card border-2 border-skin-bdr px-4 py-4 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-base font-medium text-skin-text">{p.nama}</p>
              {p.no_hp && (
                <a
                  href={`tel:${p.no_hp}`}
                  className="text-sm text-[#CAB170] hover:underline mt-0.5 block"
                >
                  📱 {p.no_hp}
                </a>
              )}
              {p.alamat && <p className="text-sm text-skin-text3 mt-0.5 truncate">{p.alamat}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setSelected(p);
                  setMode("edit");
                }}
                className="px-3 py-2 border-2 border-skin-bdr text-sm text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteConf(p)}
                className="px-3 py-2 border-2 border-skin-bdr text-sm text-skin-text3 hover:border-red-300 hover:text-red-500 transition"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Konfirmasi hapus */}
      {deleteConf && (
        <div className="fixed inset-0 z-50 flex md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0 hidden md:block" onClick={() => setDeleteConf(null)} />
          <div className="relative bg-skin-card w-full h-full md:h-auto md:max-w-sm md:border-2 border-skin-bdr shadow-xl px-6 py-6">
            <h3 className="text-xl text-skin-text mb-2">Hapus Pelanggan?</h3>
            <p className="text-sm text-skin-text2 mb-5">
              <span className="font-medium text-skin-text">{deleteConf.nama}</span> akan dihapus
              dari database.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConf.id)}
                disabled={saving}
                className="flex-1 py-4 bg-red-500 text-white text-sm tracking-[0.15em] uppercase hover:bg-red-600 transition disabled:opacity-40"
              >
                {saving ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button
                onClick={() => setDeleteConf(null)}
                disabled={saving}
                className="px-6 py-4 border-2 border-skin-bdr text-sm text-skin-text3 tracking-[0.15em] uppercase hover:border-[#1A1918] transition disabled:opacity-40"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
